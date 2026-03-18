<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="dr-chart">
    <div class="dr-chart__header">
      <span class="dr-chart__title" v-tip="$t('drChart.tipTitle')">{{ $t('drChart.title') }}</span>
      <div class="dr-chart__legend">
        <span class="dr-chart__legend-item dr-chart__legend-item--target">{{ $t('drChart.legendTarget') }}</span>
        <span class="dr-chart__legend-item dr-chart__legend-item--healthy">{{ $t('drChart.legendHealthy') }}</span>
        <span class="dr-chart__legend-item dr-chart__legend-item--revep">{{ $t('drChart.legendRevEp') }}</span>
        <span class="dr-chart__legend-item dr-chart__legend-item--lysis">{{ $t('drChart.legendLysis') }}</span>
        <span class="dr-chart__legend-item dr-chart__legend-item--window">{{ $t('drChart.legendWindow') }}</span>
      </div>
    </div>
    <div ref="chartEl" class="dr-chart__svg-wrap" style="position:relative">
      <!-- Hover tooltip - positioned absolutely over the SVG -->
      <div
        v-if="hoverInfo"
        class="dr-chart__tooltip"
        :style="{ left: hoverInfo.x + 'px', top: hoverInfo.y + 'px' }"
      >
        <div class="dr-chart__tooltip-freq">{{ hoverInfo.freq }}</div>
        <div class="dr-chart__tooltip-row dr-chart__tooltip-row--target">
          T: {{ hoverInfo.tDR }}%
        </div>
        <div class="dr-chart__tooltip-row dr-chart__tooltip-row--healthy">
          H: {{ hoverInfo.hDR }}%
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import * as d3 from 'd3'
import { useCellStore } from '@/stores/cellStore'
import { computeSchwan, computeResonantDisruption } from '@/utils/physics'
import { CELL_CATEGORY, CHART_MODE } from '@/constants/strings'
import { C } from '@/theme/colors'
import type { CellConfig } from '@/types/cell'

const F_MIN_HZ    = 10_000          // 10 kHz
const F_MAX_HZ    = 500_000_000     // 500 MHz
const N_POINTS    = 200
// Y axis always reaches at least 110% so both threshold lines (50% Rev-EP, 85% Lysis)
// remain inside the visible chart area regardless of how low the current DR curves are.
const Y_MIN_MAX   = 110
const DR_HEADROOM = 1.25            // 25% headroom above curve peak (only kicks in above 110%)
const MARGIN      = { top: 18, right: 16, bottom: 48, left: 54 }

// One label per decade
const X_TICK_VALUES = [1e4, 1e5, 1e6, 1e7, 1e8]

// Horizontal threshold lines
const DR_REV_EP  = 50   // reversible EP boundary
const DR_LYSIS   = 85   // lysis boundary

type CurvePoint = { hz: number; hDR: number; tDR: number }

function logspace(min: number, max: number, n: number): number[] {
  const step = (Math.log10(max) - Math.log10(min)) / (n - 1)
  return Array.from({ length: n }, (_, i) => Math.pow(10, Math.log10(min) + i * step))
}

const F_POINTS_HZ = logspace(F_MIN_HZ, F_MAX_HZ, N_POINTS)

export default defineComponent({
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
      _resizeObserver: null as ResizeObserver | null,
      _curveData:      [] as CurvePoint[],
      hoverInfo:       null as { x: number; y: number; freq: string; tDR: string; hDR: string } | null,
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
    formatHz(hz: number): string {
      if (hz >= 1e9) return `${(hz / 1e9).toFixed(0)} GHz`
      if (hz >= 1e6) return `${(hz / 1e6).toFixed(1)} MHz`
      if (hz >= 1e3) return `${(hz / 1e3).toFixed(0)} kHz`
      return `${hz.toFixed(0)} Hz`
    },

    /** DR at a given frequency for one cell. Returns value in [0, ∞) */
    computeDR(cell: CellConfig, hz: number, sigma_e: number, cosTheta: number, pef: number): number {
      const isAcoustic = (cell as CellConfig & { resonantFreqGHz?: number }).resonantFreqGHz != null
        && this.store.chartMode === CHART_MODE.RESONANCE
        && (this.store.targetCellCategory === CELL_CATEGORY.BACTERIA || this.store.targetCellCategory === CELL_CATEGORY.VIRUS)

      if (isAcoustic) {
        const t = cell as CellConfig & { resonantFreqGHz: number; capsidQ?: number; resonantThresholdVcm?: number }
        return computeResonantDisruption(
          t.resonantFreqGHz,
          t.capsidQ ?? 10,
          t.resonantThresholdVcm ?? cell.thresholdVoltage * 1000,
          hz,
          this.store.fieldIntensity,
        ) * pef
      }

      const vm = computeSchwan(cell, hz / 1000, this.store.fieldIntensity, sigma_e, cosTheta)
      return (vm / cell.thresholdVoltage) * pef
    },

    computeCurves(): CurvePoint[] {
      const sigma_e  = this.store.effectiveSigmaE
      const cosTheta = this.store.cosThetaFactor
      const pefH     = this.store.pulseEnvelopeFactorHealthy
      const pefT     = this.store.pulseEnvelopeFactorTarget

      return F_POINTS_HZ.map((hz) => ({
        hz,
        hDR: this.computeDR(this.store.healthy, hz, sigma_e, cosTheta, pefH) * 100,
        tDR: this.computeDR(this.store.target,  hz, sigma_e, cosTheta, pefT) * 100,
      }))
    },

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

      // Hover overlay - invisible rect covering the full plot area
      const self = this
      g.append('rect')
        .attr('class', 'hover-overlay')
        .attr('x', 0).attr('y', 0)
        .attr('width', this._chartW)
        .attr('height', this._chartH)
        .attr('fill', 'transparent')
        .on('mousemove', function(event: MouseEvent) { self.onHover(event) })
        .on('mouseleave', () => { this.hoverInfo = null })
    },

    updateChart() {
      const g = this._svg?.select<SVGGElement>('.dr-g')
      if (!g || !this._xScale || !this._yScale) return

      const gc = g.select<SVGGElement>('.dr-gc')
      const xS = this._xScale
      const yS = this._yScale
      const W  = this._chartW

      // ── Dynamic Y domain - always shows at least up to Y_MIN_MAX (110%) ──────
      const data   = this.computeCurves()
      this._curveData = data
      const peakDR = data.reduce((m, d) => Math.max(m, d.hDR, d.tDR), 0)
      const yMax   = Math.max(Y_MIN_MAX, peakDR * DR_HEADROOM)
      yS.domain([0, yMax])

      // ── Axes ─────────────────────────────────────────────────────────────
      const xAxis = d3.axisBottom(xS)
        .tickValues(X_TICK_VALUES)
        .tickFormat((d) => this.formatHz(+d))
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
        .style('font-size', '0.58rem')

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
        .style('stroke', 'rgba(30,58,95,0.4)')
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
          .attr('fill', 'rgba(57,255,20,0.12)')
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
      const g = this._svg?.select<SVGGElement>('.dr-gc')
      if (!g || !this._xScale) return

      const freqHz = this.store.currentBroadcastFrequency * 1000
      const cx     = this._xScale(Math.max(F_MIN_HZ, Math.min(F_MAX_HZ, freqHz)))

      g.select<SVGLineElement>('.cursor-line')
        .attr('x1', cx).attr('x2', cx)
        .attr('y1', 0).attr('y2', this._chartH)
        .style('stroke', 'rgba(255,255,255,0.3)')
        .style('stroke-width', 1)
        .style('stroke-dasharray', '3,3')
    },

    onHover(event: MouseEvent) {
      if (!this._xScale || !this._yScale || !this._curveData.length) return

      const container = this.$refs.chartEl as HTMLElement
      const rect = container.getBoundingClientRect()
      // Mouse X relative to the chart plot area (accounting for left margin)
      const mouseX = event.clientX - rect.left - MARGIN.left

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
        freq: this.formatHz(pt.hz),
        tDR:  pt.tDR.toFixed(1),
        hDR:  pt.hDR.toFixed(1),
      }
    },
  },
})
</script>

<style lang="scss" scoped>
@use '../../styles/mixins' as *;

.dr-chart {
  @include surface-card(8px, 0.75rem 0.75rem 0.5rem);

  &__header {
    @include flex-between();
    margin-bottom: 0.4rem;
    flex-wrap: wrap;
    gap: 0.3rem;
  }

  &__title {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-text-muted);
    cursor: default;
  }

  &__legend {
    display: flex;
    gap: 0.9rem;
    align-items: center;
    flex-wrap: wrap;
  }

  &__legend-item {
    font-family: var(--font-mono);
    font-size: 0.58rem;
    letter-spacing: 0.05em;
    display: flex;
    align-items: center;
    gap: 0.3rem;

    &::before {
      content: '';
      display: inline-block;
      width: 14px;
      height: 2px;
      border-radius: 1px;
    }

    &--target::before  { background: var(--color-danger); }
    &--healthy::before { background: var(--color-primary); }

    &--revep {
      color: var(--color-amber);
      &::before {
        background: transparent;
        border-top: 2px dashed var(--color-amber);
        height: 0;
      }
    }

    &--lysis {
      color: var(--color-danger);
      &::before {
        background: transparent;
        border-top: 2px dashed var(--color-danger);
        height: 0;
      }
    }

    &--window {
      color: rgba(57, 255, 20, 0.8);
      &::before {
        height: 8px;
        border-radius: 2px;
        background: rgba(57, 255, 20, 0.25);
        border: 1px solid rgba(57, 255, 20, 0.5);
      }
    }
  }

  &__svg-wrap {
    width: 100%;

    :deep(text) {
      fill: var(--color-text-muted);
    }

    :deep(.axis-label-x),
    :deep(.axis-label-y) {
      font-family: var(--font-mono);
      font-size: 0.58rem;
      fill: var(--color-text-muted);
    }
  }

  // Hover tooltip
  &__tooltip {
    position: absolute;
    pointer-events: none;
    background: rgba(10, 15, 30, 0.92);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 0.3rem 0.5rem;
    font-family: var(--font-mono);
    font-size: 0.62rem;
    line-height: 1.6;
    white-space: nowrap;
    z-index: 10;
  }

  &__tooltip-freq {
    color: var(--color-text-muted);
    font-size: 0.58rem;
    margin-bottom: 0.1rem;
  }

  &__tooltip-row {
    &--target  { color: var(--color-danger); }
    &--healthy { color: var(--color-primary); }
  }
}
</style>
