<template>
  <div class="dr-chart">
    <div class="dr-chart__header">
      <span class="dr-chart__title" v-tip="$t('drChart.tipTitle')">{{ $t('drChart.title') }}</span>
      <div class="dr-chart__legend">
        <span class="dr-chart__legend-item dr-chart__legend-item--target">{{ $t('drChart.legendTarget') }}</span>
        <span class="dr-chart__legend-item dr-chart__legend-item--healthy">{{ $t('drChart.legendHealthy') }}</span>
        <span class="dr-chart__legend-item dr-chart__legend-item--window">{{ $t('drChart.legendWindow') }}</span>
      </div>
    </div>
    <div ref="chartEl" class="dr-chart__svg-wrap"></div>
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

const F_MIN_HZ  = 10_000          // 10 kHz
const F_MAX_HZ  = 500_000_000     // 500 MHz
const N_POINTS  = 200
const DR_MAX    = 150             // y-axis max %
const MARGIN    = { top: 18, right: 16, bottom: 48, left: 54 }

// Horizontal threshold lines
const DR_REV_EP  = 50   // reversible EP boundary
const DR_LYSIS   = 85   // lysis boundary

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
      if (hz >= 1e9) return `${(hz / 1e9).toFixed(0)}GHz`
      if (hz >= 1e6) return `${(hz / 1e6).toFixed(0)}MHz`
      return `${(hz / 1e3).toFixed(0)}kHz`
    },

    /** DR at a given frequency for one cell. Returns value in [0, ∞) */
    computeDR(cell: CellConfig, hz: number, sigma_e: number, cosTheta: number, pef: number): number {
      const isAcoustic = (cell as CellConfig & { resonantFreqGHz?: number }).resonantFreqGHz != null
        && this.store.chartMode === CHART_MODE.RESONANCE
        && (this.store.targetCellCategory === CELL_CATEGORY.BACTERIA || this.store.targetCellCategory === CELL_CATEGORY.VIRUS)

      if (isAcoustic) {
        const t = cell as CellConfig & { resonantFreqGHz: number; capsidQ?: number; resonantThresholdVcm?: number }
        const dr = computeResonantDisruption(
          t.resonantFreqGHz,
          t.capsidQ ?? 10,
          t.resonantThresholdVcm ?? cell.thresholdVoltage * 1000,
          hz,
          this.store.fieldIntensity,
        )
        return dr * pef
      }

      // Schwan path
      const vm  = computeSchwan(cell, hz / 1000, this.store.fieldIntensity, sigma_e, cosTheta)
      return (vm / cell.thresholdVoltage) * pef
    },

    computeCurves(): { hz: number; hDR: number; tDR: number }[] {
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

      d3.select(container).selectAll('*').remove()

      const svgEl = d3.select(container)
        .append('svg')
        .attr('width',  totalW)
        .attr('height', totalH)

      this._svg    = svgEl
      this._xScale = d3.scaleLog().domain([F_MIN_HZ, F_MAX_HZ]).range([0, this._chartW])
      this._yScale = d3.scaleLinear().domain([0, DR_MAX]).range([this._chartH, 0])

      const g = svgEl.append('g')
        .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)
        .attr('class', 'dr-g')

      // Horizontal grid
      g.append('g').attr('class', 'grid-h')
      // Therapeutic window fill (target ≥85%, healthy <50%)
      g.append('g').attr('class', 'window-fill')
      // Threshold lines
      g.append('line').attr('class', 'thresh-rev-ep')
      g.append('line').attr('class', 'thresh-lysis')
      // Curve paths
      g.append('path').attr('class', 'curve-healthy')
      g.append('path').attr('class', 'curve-target')
      // Cursor
      g.append('line').attr('class', 'cursor-line')
      // Axes
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
    },

    updateChart() {
      const g = this._svg?.select<SVGGElement>('.dr-g')
      if (!g || !this._xScale || !this._yScale) return

      const xS = this._xScale
      const yS = this._yScale
      const W  = this._chartW

      // ── Axes ─────────────────────────────────────────────────────────────
      const xAxis = d3.axisBottom(xS)
        .ticks(6, '~s')
        .tickFormat((d) => this.formatHz(+d))
      g.select<SVGGElement>('.x-axis')
        .call(xAxis)
        .selectAll('text')
        .style('fill', C.textMuted)
        .style('font-size', '0.58rem')

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
      g.select<SVGGElement>('.grid-h')
        .call(
          d3.axisLeft(yS)
            .ticks(5)
            .tickSize(-W)
            .tickFormat(() => '')
        )
        .selectAll('line')
        .style('stroke', 'rgba(30,58,95,0.4)')
        .style('stroke-dasharray', '3,3')
      g.select('.grid-h .domain').remove()

      // ── Data ──────────────────────────────────────────────────────────────
      const data = this.computeCurves()

      // ── Therapeutic window fill ───────────────────────────────────────────
      // Region where target DR ≥ 85% AND healthy DR < 50%
      const windowData = data.filter((d) => d.tDR >= DR_LYSIS && d.hDR < DR_REV_EP)

      // Build area from consecutive segments
      const areaFn = d3.area<{ hz: number; tDR: number }>()
        .x((d) => xS(d.hz))
        .y0(yS(DR_LYSIS))
        .y1((d) => yS(Math.min(d.tDR, DR_MAX)))
        .curve(d3.curveLinear)

      const windowGroup = g.select<SVGGElement>('.window-fill')
      windowGroup.selectAll('*').remove()

      if (windowData.length > 1) {
        // Find contiguous segments
        const segments: { hz: number; tDR: number }[][] = []
        let seg: { hz: number; tDR: number }[] = []
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
      }

      // ── Threshold lines ───────────────────────────────────────────────────
      g.select<SVGLineElement>('.thresh-rev-ep')
        .attr('x1', 0).attr('x2', W)
        .attr('y1', yS(DR_REV_EP)).attr('y2', yS(DR_REV_EP))
        .style('stroke', C.amber)
        .style('stroke-width', 1)
        .style('stroke-dasharray', '5,3')
        .style('opacity', 0.7)

      g.select<SVGLineElement>('.thresh-lysis')
        .attr('x1', 0).attr('x2', W)
        .attr('y1', yS(DR_LYSIS)).attr('y2', yS(DR_LYSIS))
        .style('stroke', C.danger)
        .style('stroke-width', 1)
        .style('stroke-dasharray', '5,3')
        .style('opacity', 0.7)

      // ── Curves ────────────────────────────────────────────────────────────
      const lineFnH = d3.line<{ hz: number; hDR: number }>()
        .x((d) => xS(d.hz))
        .y((d) => yS(Math.min(d.hDR, DR_MAX)))
        .curve(d3.curveLinear)

      const lineFnT = d3.line<{ hz: number; tDR: number }>()
        .x((d) => xS(d.hz))
        .y((d) => yS(Math.min(d.tDR, DR_MAX)))
        .curve(d3.curveLinear)

      g.select<SVGPathElement>('.curve-healthy')
        .datum(data)
        .attr('d', lineFnH)
        .attr('fill', 'none')
        .attr('stroke', C.primary)
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.85)

      g.select<SVGPathElement>('.curve-target')
        .datum(data)
        .attr('d', lineFnT)
        .attr('fill', 'none')
        .attr('stroke', C.danger)
        .attr('stroke-width', 1.5)
        .attr('opacity', 0.85)

      this.updateCursor()
    },

    updateCursor() {
      const g = this._svg?.select<SVGGElement>('.dr-g')
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
  },
})
</script>

<style lang="scss" scoped>
.dr-chart {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.75rem 0.75rem 0.5rem;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 0.4rem;
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

    :deep(svg) {
      overflow: visible;
    }

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
}
</style>
