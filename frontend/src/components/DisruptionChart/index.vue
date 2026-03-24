<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="dr-chart">
    <div class="dr-chart__header">
      <span class="dr-chart__title" v-tip="$t('drChart.tipTitle')">{{ $t('drChart.title') }}</span>
      <DrChartLegend />
    </div>
    <div ref="chartEl" class="dr-chart__svg-wrap">
      <DrChartTooltip :info="hoverInfo" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import * as d3 from 'd3'
import { useCellStore } from '@/stores/cellStore'
import { broadcastStateSync } from '@/services/socket'
import { CELL_CATEGORY } from '@/constants/strings'
import { C } from '@/theme/colors'
import DrChartLegend from './DrChartLegend.vue'
import DrChartTooltip from './DrChartTooltip.vue'
import type { HoverInfo } from './DrChartTooltip.vue'
import {
  F_MIN_HZ, F_MAX_HZ, Y_MIN_MAX, DR_HEADROOM,
  MARGIN, X_TICK_VALUES, DR_REV_EP, DR_LYSIS,
  type CurvePoint, formatHz, computeCurves,
} from './drChartCompute'

export default defineComponent({
  components: { DrChartLegend, DrChartTooltip },

  setup() {
    return { store: useCellStore() }
  },

  data() {
    return {
      _svg:            null as d3.Selection<SVGSVGElement, unknown, null, undefined> | null,
      _xScale:         null as d3.ScaleLogarithmic<number, number> | null,
      _yScale:         null as d3.ScaleLinear<number, number> | null,
      _chartW:         0,
      _chartH:         0,
      _cursorX:        0,
      _resizeObserver: null as ResizeObserver | null,
      _curveData:      [] as CurvePoint[],
      hoverInfo:       null as HoverInfo | null,
    }
  },

  watch: {
    'store.healthy':                   { handler() { this.updateChart() }, deep: true },
    'store.target':                    { handler() { this.updateChart() }, deep: true },
    'store.fieldIntensity':            { handler() { this.updateChart() } },
    'store.effectiveSigmaE':           { handler() { this.updateChart() } },
    'store.cosThetaFactor':            { handler() { this.updateChart() } },
    'store.pulseEnvelopeFactorHealthy':{ handler() { this.updateChart() } },
    'store.pulseEnvelopeFactorTarget': { handler() { this.updateChart() } },
    'store.chartMode':                 { handler() { this.updateChart() } },
    'store.currentBroadcastFrequency': { handler() { this.updateCursor() } },
  },

  mounted() {
    this._resizeObserver = new ResizeObserver(() => {
      this.initChart()
      this.updateChart()
    })
    const el = this.$refs.chartEl as HTMLElement
    if (el) this._resizeObserver.observe(el)
  },

  beforeUnmount() {
    this._resizeObserver?.disconnect()
  },

  methods: {
    initChart() {
      const container = this.$refs.chartEl as HTMLElement
      if (!container) return

      const totalW = container.clientWidth || 600
      const totalH = 220

      this._chartW = totalW - MARGIN.left - MARGIN.right
      this._chartH = totalH - MARGIN.top  - MARGIN.bottom

      d3.select(container).selectAll('svg').remove()

      const svgEl = d3.select(container)
        .append('svg')
        .attr('width',  totalW)
        .attr('height', totalH)
        .style('overflow', 'hidden')  // clip to SVG bounds, prevents threshold lines overflowing above chart

      this._svg    = svgEl
      this._xScale = d3.scaleLog().domain([F_MIN_HZ, F_MAX_HZ]).range([0, this._chartW])
      this._yScale = d3.scaleLinear().domain([0, Y_MIN_MAX]).range([this._chartH, 0])

      // ClipPath - content group clips to chart plot area so no line can overflow above or below
      svgEl.append('defs').append('clipPath')
        .attr('id', `dr-clip-${this._chartW}`)
        .append('rect')
        .attr('x', 0).attr('y', 0)
        .attr('width', this._chartW)
        .attr('height', this._chartH)

      const clipId = `dr-clip-${this._chartW}`

      const g = svgEl.append('g')
        .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)
        .attr('class', 'dr-g')

      // Clipped inner group - all data elements go here
      const gc = g.append('g')
        .attr('class', 'dr-gc')
        .attr('clip-path', `url(#${clipId})`)

      gc.append('g').attr('class', 'grid-h')
      gc.append('g').attr('class', 'window-fill')
      gc.append('line').attr('class', 'thresh-rev-ep')
      gc.append('line').attr('class', 'thresh-lysis')
      gc.append('path').attr('class', 'curve-healthy')
      gc.append('path').attr('class', 'curve-target')
      gc.append('line').attr('class', 'cursor-line')

      // Axes - outside clip group so tick labels are never cut
      g.append('g').attr('class', 'x-axis').attr('transform', `translate(0,${this._chartH})`)
      g.append('g').attr('class', 'y-axis')

      // Axis labels
      g.append('text')
        .attr('class', 'axis-label-x')
        .attr('text-anchor', 'middle')
        .attr('x', this._chartW / 2)
        .attr('y', this._chartH + 38)
        .text('Frequency')
      g.append('text')
        .attr('class', 'axis-label-y')
        .attr('text-anchor', 'middle')
        .attr('transform', `translate(-38,${this._chartH / 2}) rotate(-90)`)
        .text('DR (%)')

      // Drag hint text - appears above the cursor line
      g.append('text')
        .attr('class', 'cursor-drag-hint')
        .attr('y', -4)
        .attr('text-anchor', 'middle')
        .attr('fill', C.w28)
        .attr('font-size', '0.5rem')
        .attr('font-family', 'var(--font-mono)')
        .attr('letter-spacing', '0.08em')
        .attr('pointer-events', 'none')
        .text(this.$t('chart.dragHint'))

      // Hover + drag overlay - covers the full plot area
      const dragBehavior = d3.drag<SVGRectElement, unknown>()
        .on('drag', (event) => {
          if (!this._xScale) return
          const xClamped = Math.max(0, Math.min(this._chartW, event.x))
          const hz = this._xScale.invert(xClamped)
          const khz = Math.max(10, Math.min(F_MAX_HZ / 1000, hz / 1000))
          this.store.setBroadcastFreqKHz(Math.round(khz))
          broadcastStateSync()
        })

      g.append('rect')
        .attr('class', 'hover-overlay')
        .attr('x', 0).attr('y', 0)
        .attr('width', this._chartW)
        .attr('height', this._chartH)
        .attr('fill', 'transparent')
        .style('cursor', 'crosshair')
        .on('mousemove', (event: MouseEvent) => this.onHover(event))
        .on('mouseleave', () => { this.hoverInfo = null })
        .call(dragBehavior)
    },

    updateChart() {
      const g = this._svg?.select<SVGGElement>('.dr-g')
      if (!g || !this._xScale || !this._yScale) return

      const gc = g.select<SVGGElement>('.dr-gc')
      const xS = this._xScale
      const yS = this._yScale
      const W  = this._chartW

      // ── Dynamic Y domain - always shows at least up to Y_MIN_MAX (110%) ──────
      const data = computeCurves(
        this.store.healthy, this.store.target,
        this.store.fieldIntensity, this.store.effectiveSigmaE, this.store.cosThetaFactor,
        this.store.pulseEnvelopeFactorHealthy, this.store.pulseEnvelopeFactorTarget,
        this.store.isResonanceMode,
        this.store.targetCellCategory === CELL_CATEGORY.BACTERIA || this.store.targetCellCategory === CELL_CATEGORY.VIRUS,
      )
      this._curveData = data
      const peakDR = data.reduce((m, d) => Math.max(m, d.hDR, d.tDR), 0)
      const yMax   = Math.max(Y_MIN_MAX, peakDR * DR_HEADROOM)
      yS.domain([0, yMax])

      // ── Axes ─────────────────────────────────────────────────────────────
      const xAxis = d3.axisBottom(xS)
        .tickValues(X_TICK_VALUES)
        .tickFormat((d) => formatHz(+d))
      g.select<SVGGElement>('.x-axis')
        .call(xAxis)
        .selectAll<SVGTextElement, unknown>('text')
        .style('fill', C.textMuted)
        .style('font-size', '0.62rem')
        .attr('transform', 'rotate(-35)')
        .attr('text-anchor', 'end')
        .attr('dy', '0.5em')
        .attr('dx', '-0.3em')

      const yAxis = d3.axisLeft(yS)
        .ticks(5)
        .tickFormat((d) => `${d}%`)
      g.select<SVGGElement>('.y-axis')
        .call(yAxis)
        .selectAll('text')
        .style('fill', C.textMuted)
        .style('font-size', '0.7rem')

      g.selectAll('.domain, .tick line').style('stroke', C.border)

      // ── Horizontal grid ───────────────────────────────────────────────────
      gc.select<SVGGElement>('.grid-h')
        .call(
          d3.axisLeft(yS)
            .ticks(5)
            .tickSize(-W)
            .tickFormat(() => '')
        )
        .selectAll('line')
        .style('stroke', 'color-mix(in srgb, var(--color-border) 40%, transparent)')
        .style('stroke-dasharray', '3,3')
      gc.select('.grid-h .domain').remove()

      // ── Therapeutic window fill ───────────────────────────────────────────
      const areaFn = d3.area<CurvePoint>()
        .x((d) => xS(d.hz))
        .y0(yS(DR_LYSIS))
        .y1((d) => yS(d.tDR))
        .curve(d3.curveLinear)

      const windowGroup = gc.select<SVGGElement>('.window-fill')
      windowGroup.selectAll('*').remove()

      const segments: CurvePoint[][] = []
      let seg: CurvePoint[] = []
      for (const pt of data) {
        if (pt.tDR >= DR_LYSIS && pt.hDR < DR_REV_EP) {
          seg.push(pt)
        } else if (seg.length > 0) {
          segments.push(seg)
          seg = []
        }
      }
      if (seg.length > 0) segments.push(seg)

      for (const s of segments) {
        if (s.length < 2) continue
        windowGroup.append('path')
          .datum(s)
          .attr('d', areaFn)
          .style('fill', 'color-mix(in srgb, var(--color-lime) 12%, transparent)')
          .attr('stroke', 'none')
      }

      // ── Threshold lines ───────────────────────────────────────────────────
      gc.select<SVGLineElement>('.thresh-rev-ep')
        .attr('x1', 0).attr('x2', W)
        .attr('y1', yS(DR_REV_EP)).attr('y2', yS(DR_REV_EP))
        .style('stroke', C.amber)
        .style('stroke-width', 1)
        .style('stroke-dasharray', '5,3')
        .style('opacity', 0.7)

      gc.select<SVGLineElement>('.thresh-lysis')
        .attr('x1', 0).attr('x2', W)
        .attr('y1', yS(DR_LYSIS)).attr('y2', yS(DR_LYSIS))
        .style('stroke', C.danger)
        .style('stroke-width', 1)
        .style('stroke-dasharray', '5,3')
        .style('opacity', 0.7)

      // ── Curves ────────────────────────────────────────────────────────────
      const lineFnH = d3.line<CurvePoint>()
        .x((d) => xS(d.hz))
        .y((d) => yS(d.hDR))
        .curve(d3.curveLinear)

      const lineFnT = d3.line<CurvePoint>()
        .x((d) => xS(d.hz))
        .y((d) => yS(d.tDR))
        .curve(d3.curveLinear)

      gc.select<SVGPathElement>('.curve-healthy')
        .datum(data)
        .attr('d', lineFnH)
        .attr('fill', 'none')
        .attr('stroke', C.primary)
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.85)

      gc.select<SVGPathElement>('.curve-target')
        .datum(data)
        .attr('d', lineFnT)
        .attr('fill', 'none')
        .attr('stroke', C.danger)
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.85)

      this.updateCursor()
    },

    updateCursor() {
      const gc = this._svg?.select<SVGGElement>('.dr-gc')
      const g  = this._svg?.select<SVGGElement>('.dr-g')
      if (!gc || !g || !this._xScale) return

      const freqHz = this.store.currentBroadcastFrequency * 1000
      const cx     = this._xScale(Math.max(F_MIN_HZ, Math.min(F_MAX_HZ, freqHz)))

      this._cursorX = cx

      gc.select<SVGLineElement>('.cursor-line')
        .attr('x1', cx).attr('x2', cx)
        .attr('y1', 0).attr('y2', this._chartH)
        .style('stroke', C.w30)
        .style('stroke-width', 1)
        .style('stroke-dasharray', '3,3')

      g.select<SVGTextElement>('.cursor-drag-hint')
        .attr('x', cx)
    },

    onHover(event: MouseEvent) {
      if (!this._xScale || !this._yScale || !this._curveData.length) return

      const container = this.$refs.chartEl as HTMLElement
      const rect = container.getBoundingClientRect()
      // Mouse X relative to the chart plot area (accounting for left margin)
      const mouseX = event.clientX - rect.left - MARGIN.left

      const overlay = this._svg?.select<SVGRectElement>('.hover-overlay')

      // Near the cursor line: switch to drag cursor and suppress tooltip
      if (Math.abs(mouseX - this._cursorX) < 20) {
        overlay?.style('cursor', 'ew-resize')
        this.hoverInfo = null
        return
      }
      overlay?.style('cursor', 'crosshair')

      // Find the nearest data point by inverting the log x scale
      const mouseHz = this._xScale.invert(mouseX)
      const bisect  = d3.bisector<CurvePoint, number>((d) => d.hz).left
      const idx     = Math.max(0, Math.min(
        this._curveData.length - 1,
        bisect(this._curveData, mouseHz),
      ))
      const pt = this._curveData[idx]
      if (!pt) return

      // Tooltip position: offset so it doesn't overlap the cursor line
      // Place relative to the container div (chartEl)
      const tooltipX = event.clientX - rect.left + 10
      const tooltipY = event.clientY - rect.top  - 10

      this.hoverInfo = {
        x:    tooltipX,
        y:    tooltipY,
        freq: formatHz(pt.hz),
        tDR:  pt.tDR.toFixed(1),
        hDR:  pt.hDR.toFixed(1),
      }
    },
  },
})
</script>

<style lang="scss" scoped>


.dr-chart {
  @include surface-card(8px, 0.75rem 0.75rem 0.5rem);

  &__header {
    @include flex-between();
    margin-bottom: 0.4rem;
    flex-wrap: wrap;
    gap: 0.3rem;
  }

  &__title {
    @include mono-upper(0.68rem, 0.08em);
    color: var(--color-text-muted);
    cursor: default;
  }

  &__svg-wrap {
    position: relative;
    width: 100%;

    :deep(text) {
      fill: var(--color-text-muted);
    }

    :deep(.axis-label-x),
    :deep(.axis-label-y) {
      font-family: var(--font-mono);
      font-size: var(--fs-xs);
      fill: var(--color-text-muted);
    }
  }
}
</style>
