<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="resonance-chart">
    <div class="resonance-chart__header">
      <span class="resonance-chart__title">{{ $t('resonance.chartTitle') }}</span>
      <span class="resonance-chart__note">{{ $t('resonance.chartNote') }}</span>
    </div>
    <div ref="chartEl" class="resonance-chart__svg-wrap" />
    <div class="resonance-chart__legend">
      <span class="resonance-chart__legend-item resonance-chart__legend-target">— {{ $t('resonance.legendTarget') }}</span>
      <span class="resonance-chart__legend-item resonance-chart__legend-healthy">- - {{ $t('resonance.legendHealthy') }}</span>
      <span class="resonance-chart__legend-item resonance-chart__legend-dim">— {{ $t('resonance.legendLibrary') }}</span>
      <span class="resonance-chart__legend-item resonance-chart__legend-disrupt">— {{ $t('resonance.legendThreshold') }}</span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import * as d3 from 'd3'
import { useCellStore } from '@/stores/cellStore'
import { computeResonantDisruption } from '@/utils/physics'
import { DEFAULT_CAPSID_Q } from '@/constants/physics'
import { CELL_PRESETS, GROUP_COLORS } from '@/constants/cellLibrary'
import type { CellGroup } from '@/constants/cellLibrary'
import type { CellConfig } from '@/types/cell'
import { broadcastStateSync } from '@/services/socket'
import { C } from '@/theme/colors'

// Frequency range: 10 MHz – 50 GHz
const F_MIN_HZ = 10_000_000
const F_MAX_HZ = 50_000_000_000
const N_POINTS = 300
const F_CURSOR_MAX_KHZ = 50_000_000  // 50 GHz upper bound for cursor
const Y_MAX = 1.5

const MARGIN = { top: 22, right: 72, bottom: 52, left: 54 }

type ResonantCell = CellConfig & { resonantFreqGHz?: number; capsidQ?: number; resonantThresholdVcm?: number; group?: CellGroup }

function logspace(min: number, max: number, n: number): number[] {
  const step = (Math.log10(max) - Math.log10(min)) / (n - 1)
  return Array.from({ length: n }, (_, i) => Math.pow(10, Math.log10(min) + i * step))
}

const F_POINTS_HZ = logspace(F_MIN_HZ, F_MAX_HZ, N_POINTS)

export default defineComponent({
  name: 'ResonanceChart',

  setup() {
    return { store: useCellStore() }
  },

  data() {
    return {
      _svg: null as d3.Selection<SVGSVGElement, unknown, null, undefined> | null,
      _xScale: null as d3.ScaleLogarithmic<number, number> | null,
      _yScale: null as d3.ScaleLinear<number, number> | null,
      _chartW: 0,
      _chartH: 0,
      _resizeObserver: null as ResizeObserver | null,
    }
  },

  watch: {
    'store.target':         { handler() { this.updateChart() }, deep: true },
    'store.healthy':        { handler() { this.updateChart() }, deep: true },
    'store.fieldIntensity': { handler() { this.updateChart() } },
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
      if (hz >= 1e9) return `${(hz / 1e9).toFixed(hz >= 10e9 ? 0 : 1)}G`
      if (hz >= 1e6) return `${(hz / 1e6).toFixed(hz >= 100e6 ? 0 : 1)}M`
      return `${(hz / 1e3).toFixed(hz >= 100e3 ? 0 : 1)}k`
    },

    computeCurve(cell: ResonantCell): { hz: number; ratio: number }[] {
      if (!cell.resonantFreqGHz || !cell.resonantThresholdVcm) {
        return F_POINTS_HZ.map(hz => ({ hz, ratio: 0 }))
      }
      return F_POINTS_HZ.map(hz => ({
        hz,
        ratio: computeResonantDisruption(
          cell.resonantFreqGHz!,
          cell.capsidQ ?? DEFAULT_CAPSID_Q,
          cell.resonantThresholdVcm!,
          hz,
          this.store.fieldIntensity,
        ),
      }))
    },

    initChart() {
      const container = this.$refs.chartEl as HTMLElement
      if (!container) return

      const totalW = container.clientWidth || 640
      const totalH = 240

      this._chartW = totalW - MARGIN.left - MARGIN.right
      this._chartH = totalH - MARGIN.top - MARGIN.bottom

      d3.select(container).selectAll('*').remove()

      const svgEl = d3.select(container)
        .append('svg')
        .attr('width', totalW)
        .attr('height', totalH)

      this._svg = svgEl

      const g = svgEl.append('g')
        .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)
        .attr('class', 'chart-g')

      // Scales
      this._xScale = d3.scaleLog()
        .domain([F_MIN_HZ, F_MAX_HZ])
        .range([0, this._chartW])
      this._yScale = d3.scaleLinear()
        .domain([0, Y_MAX])
        .range([this._chartH, 0])

      // Disruption zone shading (above threshold = 1.0)
      const yThresh = this._yScale(1.0)
      g.append('rect')
        .attr('class', 'disrupt-bg')
        .attr('x', 0).attr('y', 0)
        .attr('width', this._chartW).attr('height', yThresh)
        .attr('fill', 'rgba(255,77,109,0.07)')

      // Threshold line at 1.0
      g.append('line')
        .attr('class', 'threshold-line')
        .attr('x1', 0).attr('x2', this._chartW)
        .attr('y1', yThresh).attr('y2', yThresh)
        .attr('stroke', 'rgba(255,77,109,0.55)')
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '5,3')

      g.append('text')
        .attr('x', this._chartW + 4)
        .attr('y', yThresh + 4)
        .attr('fill', 'rgba(255,77,109,0.7)')
        .attr('font-size', '0.52rem')
        .attr('font-family', 'var(--font-mono)')
        .text('DISRUPT')

      // Grid (horizontal)
      g.append('g').attr('class', 'grid-h')

      // Axes
      g.append('g').attr('class', 'x-axis').attr('transform', `translate(0,${this._chartH})`)
      g.append('g').attr('class', 'y-axis')

      // Axis labels
      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('x', this._chartW / 2)
        .attr('y', this._chartH + 46)
        .attr('fill', 'var(--color-text)')
        .attr('font-size', '0.62rem')
        .attr('font-family', 'var(--font-mono)')
        .attr('letter-spacing', '0.1em')
        .text('FREQUENCY')

      g.append('text')
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .attr('x', -this._chartH / 2)
        .attr('y', -40)
        .attr('fill', 'var(--color-text)')
        .attr('font-size', '0.6rem')
        .attr('font-family', 'var(--font-mono)')
        .attr('letter-spacing', '0.1em')
        .text('DISRUPTION RATIO')

      // Layer groups
      g.append('g').attr('class', 'curves-library')
      g.append('g').attr('class', 'curves-active')
      g.append('g').attr('class', 'resonance-markers')

      // Cursor line + label
      g.append('line')
        .attr('class', 'cursor-line')
        .attr('y1', 0).attr('y2', this._chartH)
        .attr('stroke', 'rgba(255,255,255,0.85)')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4,3')
        .style('cursor', 'ew-resize')

      g.append('text')
        .attr('class', 'cursor-label')
        .attr('y', -6)
        .attr('text-anchor', 'middle')
        .attr('fill', 'rgba(255,255,255,0.85)')
        .attr('font-size', '0.58rem')
        .attr('font-family', 'var(--font-mono)')

      // Drag overlay
      const self = this
      g.append('rect')
        .attr('class', 'drag-overlay')
        .attr('width', this._chartW)
        .attr('height', this._chartH)
        .attr('fill', 'transparent')
        .style('cursor', 'ew-resize')
        .call(
          d3.drag<SVGRectElement, unknown>()
            .on('drag', (event) => {
              const xScale = self._xScale
              if (!xScale) return
              const hz = Math.max(F_MIN_HZ, Math.min(F_MAX_HZ, xScale.invert(event.x)))
              const khz = Math.round(Math.min(hz / 1000, F_CURSOR_MAX_KHZ))
              self.store.setBroadcastFreqKHz(khz)
              broadcastStateSync()
            })
        )
    },

    updateChart() {
      const g = this._svg?.select('.chart-g')
      if (!g || !this._xScale || !this._yScale) return

      // X axis
      const xAxis = d3.axisBottom(this._xScale)
        .tickValues([1e7, 1e8, 5e8, 1e9, 5e9, 1e10, 5e10])
        .tickFormat((d) => this.formatHz(d as number))
      g.select<SVGGElement>('.x-axis')
        .call(xAxis as d3.Axis<d3.NumberValue>)
        .attr('color', 'rgba(255,255,255,0.35)')
        .selectAll('text')
        .attr('font-size', '0.58rem')
        .attr('font-family', 'var(--font-mono)')

      // Y axis
      const yAxis = d3.axisLeft(this._yScale)
        .tickValues([0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5])
        .tickFormat(d3.format('.2f'))
      g.select<SVGGElement>('.y-axis')
        .call(yAxis as d3.Axis<d3.NumberValue>)
        .attr('color', 'rgba(255,255,255,0.35)')
        .selectAll('text')
        .attr('font-size', '0.58rem')
        .attr('font-family', 'var(--font-mono)')

      // Grid lines
      const gridG = g.select<SVGGElement>('.grid-h')
      gridG.selectAll('line').remove()
      ;[0, 0.25, 0.5, 0.75, 1.0, 1.25, 1.5].forEach((tick) => {
        gridG.append('line')
          .attr('x1', 0).attr('x2', this._chartW)
          .attr('y1', this._yScale!(tick)).attr('y2', this._yScale!(tick))
          .attr('stroke', tick === 1.0 ? 'rgba(255,77,109,0.18)' : 'rgba(255,255,255,0.06)')
          .attr('stroke-width', 1)
      })

      // Line generator
      const line = d3.line<{ hz: number; ratio: number }>()
        .x((d) => this._xScale!(d.hz))
        .y((d) => this._yScale!(Math.min(d.ratio, Y_MAX)))
        .defined((d) => isFinite(d.ratio))
        .curve(d3.curveBasis)

      // Library curves (only virus/bacteria presets with resonantFreqGHz)
      const libG = g.select<SVGGElement>('.curves-library')
      libG.selectAll('path').remove()
      CELL_PRESETS.forEach((preset) => {
        const p = preset as ResonantCell
        if (!p.resonantFreqGHz) return
        const pts = this.computeCurve(p)
        libG.append('path')
          .datum(pts)
          .attr('d', line)
          .attr('fill', 'none')
          .attr('stroke', GROUP_COLORS[preset.group])
          .attr('stroke-width', 1)
          .attr('opacity', 0.2)
      })

      const activeG = g.select<SVGGElement>('.curves-active')
      activeG.selectAll('*').remove()

      // Active healthy: flat dashed line at 0 (no GHz resonance for mammalian cells)
      const y0 = this._yScale(0)
      activeG.append('line')
        .attr('x1', 0).attr('x2', this._chartW)
        .attr('y1', y0).attr('y2', y0)
        .attr('stroke', C.primary)
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '6,4')
        .attr('opacity', 0.55)
      activeG.append('text')
        .attr('x', this._chartW + 4)
        .attr('y', y0 + 4)
        .attr('fill', C.primary)
        .attr('opacity', 0.6)
        .attr('font-size', '0.52rem')
        .attr('font-family', 'var(--font-mono)')
        .text('H: 0')

      // Active target curve
      const t = this.store.target as ResonantCell
      if (t.resonantFreqGHz && t.resonantThresholdVcm) {
        const targetPts = this.computeCurve(t)
        const targetColor = t.group ? GROUP_COLORS[t.group] : C.purple
        activeG.append('path')
          .datum(targetPts)
          .attr('d', line)
          .attr('fill', 'none')
          .attr('stroke', targetColor)
          .attr('stroke-width', 2.5)
          .attr('opacity', 1)
      }

      this.updateResonanceMarker()
      this.updateCursor()
    },

    updateResonanceMarker() {
      const g = this._svg?.select('.chart-g')
      if (!g || !this._xScale) return

      const markG = g.select<SVGGElement>('.resonance-markers')
      markG.selectAll('*').remove()

      const t = this.store.target as ResonantCell
      if (!t.resonantFreqGHz) return

      const fHz = t.resonantFreqGHz * 1e9
      if (fHz < F_MIN_HZ || fHz > F_MAX_HZ) return

      const cx = this._xScale(fHz)
      const color = t.group ? GROUP_COLORS[t.group] : C.purple

      markG.append('line')
        .attr('x1', cx).attr('x2', cx)
        .attr('y1', 0).attr('y2', this._chartH)
        .attr('stroke', color)
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,3')
        .attr('opacity', 0.65)

      const labelX = cx > this._chartW - 72 ? cx - 3 : cx + 3
      const anchor = cx > this._chartW - 72 ? 'end' : 'start'
      markG.append('text')
        .attr('x', labelX)
        .attr('y', 12)
        .attr('text-anchor', anchor)
        .attr('fill', color)
        .attr('opacity', 0.9)
        .attr('font-size', '0.56rem')
        .attr('font-family', 'var(--font-mono)')
        .text(`f_res=${this.formatHz(fHz)}`)
    },

    updateCursor() {
      const g = this._svg?.select('.chart-g')
      if (!g || !this._xScale) return
      const freqHz = this.store.currentBroadcastFrequency * 1000
      const cx = this._xScale(Math.max(F_MIN_HZ, Math.min(F_MAX_HZ, freqHz)))
      g.select('.cursor-line').attr('x1', cx).attr('x2', cx)
      const khz = this.store.currentBroadcastFrequency
      let label: string
      if (khz >= 1_000_000) label = `${(khz / 1_000_000).toFixed(2)} GHz`
      else if (khz >= 1_000) label = `${(khz / 1_000).toFixed(2)} MHz`
      else label = `${khz} kHz`
      g.select('.cursor-label').attr('x', cx).text(label)
    },
  },
})
</script>

<style lang="scss" scoped>
@use '../../styles/mixins' as *;

.resonance-chart {
  @include surface-card(var(--radius), 0.75rem 0.5rem 0.5rem);
  @include flex-col(0.4rem);

  &__header {
    display: flex;
    align-items: baseline;
    gap: 0.75rem;
    padding: 0 0.5rem;
  }

  &__title {
    @include mono-upper(0.62rem, 0.1em);
    color: var(--color-text);
  }

  &__note {
    font-family: var(--font-mono);
    font-size: 0.55rem;
    color: rgba(255,255,255,0.4);
  }

  &__svg-wrap {
    width: 100%;
    min-height: 240px;
  }

  &__legend {
    display: flex;
    gap: 1rem;
    padding: 0 0.5rem;
    flex-wrap: wrap;

    &-item {
      font-family: var(--font-mono);
      font-size: 0.58rem;
      letter-spacing: 0.04em;
    }

    &-target  { color: var(--color-purple); }
    &-healthy { color: rgba(0,212,255,0.7); }
    &-dim     { color: rgba(255,255,255,0.35); }
    &-disrupt { color: rgba(255,77,109,0.7); }
  }
}
</style>
