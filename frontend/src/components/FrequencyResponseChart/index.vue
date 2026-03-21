<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="freq-chart">
    <!-- Header: title + legend -->
    <div class="freq-chart__header">
      <span
        class="freq-chart__title"
        v-tip="$t('chart.tipMainTitle')"
      >{{ $t('chart.title') }}</span>
      <ChartLegend />
    </div>

    <!-- D3 SVG container -->
    <div ref="chartEl" class="freq-chart__svg-wrap"></div>

    <!-- Hover tooltip -->
    <Transition name="tip">
      <div
        v-if="_tooltipData"
        class="freq-chart__tooltip"
        :class="{ 'freq-chart__tooltip--flip': _tooltipData.flipLeft }"
        :style="{ left: (_tooltipData.x + 54) + 'px' }"
      >
        <div class="freq-chart__tooltip-freq">{{ formatTooltipFreq(_tooltipData.freqHz) }}</div>
        <template v-if="_tooltipData.mode === 'schwan'">
          <div class="freq-chart__tooltip-row freq-chart__tooltip-row--h">
            {{ CELL_LABEL.HEALTHY }} {{ _tooltipData.healthyVm.toFixed(2) }} {{ UNIT.MV }}
            <span class="freq-chart__tooltip-dr">DR {{ _tooltipData.healthyDRPct.toFixed(1) }}%</span>
          </div>
          <div class="freq-chart__tooltip-row freq-chart__tooltip-row--t">
            {{ CELL_LABEL.TARGET }} {{ _tooltipData.targetVm.toFixed(2) }} {{ UNIT.MV }}
            <span class="freq-chart__tooltip-dr">DR {{ _tooltipData.targetDRPct.toFixed(1) }}%</span>
          </div>
          <div class="freq-chart__tooltip-sel">
            {{ $t('chart.tooltipSel') }} {{ _tooltipData.selRatio.toFixed(2) }}×
          </div>
          <div v-if="_tooltipData.inWindow" class="freq-chart__tooltip-window">
            {{ $t('chart.tooltipWindow') }}
          </div>
        </template>
        <template v-else>
          <div class="freq-chart__tooltip-row freq-chart__tooltip-row--t">{{ $t('chart.tooltipDR') }} {{ (_tooltipData.targetDR * 100).toFixed(1) }}%</div>
          <div class="freq-chart__tooltip-row freq-chart__tooltip-row--h">{{ $t('chart.tooltipNoRes') }}</div>
        </template>
      </div>
    </Transition>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import * as d3 from 'd3'
import { useCellStore } from '@/stores/cellStore'
import { computeSchwan, computeFc, computeNuclearVm, computeResonantLineshape, computeResonantDisruption, computeTau, computeDepCmReal } from '@/utils/physics'
import { CELL_PRESETS, GROUP_COLORS } from '@/constants/cellLibrary'
import { DEFAULT_CAPSID_Q, THRESHOLDS } from '@/constants/physics'
import { CELL_CATEGORY, CHART_MODE, CELL_LABEL } from '@/constants/strings'
import { MEDIA } from '@/constants/media'
import { ICON } from '@/constants/icons'
import { UNIT } from '@/constants/units'
import { broadcastStateSync } from '@/services/socket'
import { C } from '@/theme/colors'
import ChartLegend from './ChartLegend.vue'

// 200 logarithmically spaced Hz from 10 kHz to 500 MHz
const F_MIN_HZ = 10_000
const F_MAX_HZ = 500_000_000
const F_CURSOR_MAX_KHZ = 10000  // 10 MHz, covers bacteria fc range
const N_POINTS = 200

const MARGIN = { top: 22, right: 130, bottom: 52, left: 54 }  // right 130 for selectivity + DEP axes

function logspace(min: number, max: number, n: number): number[] {
  const step = (Math.log10(max) - Math.log10(min)) / (n - 1)
  return Array.from({ length: n }, (_, i) => Math.pow(10, Math.log10(min) + i * step))
}

const F_POINTS_HZ = logspace(F_MIN_HZ, F_MAX_HZ, N_POINTS)

export default defineComponent({
  components: { ChartLegend },

  setup() {
    return { store: useCellStore(), UNIT, CELL_LABEL }
  },

  data() {
    return {
      _svg: null as d3.Selection<SVGSVGElement, unknown, null, undefined> | null,
      _xScale: null as d3.ScaleLogarithmic<number, number> | null,
      _yScale: null as d3.ScaleLinear<number, number> | null,
      _yRightScale: null as d3.ScaleLinear<number, number> | null,
      _yDepScale: null as d3.ScaleLinear<number, number> | null,
      _chartW: 0,
      _chartH: 0,
      _cursorX: 0,
      _resizeObserver: null as ResizeObserver | null,
      _tooltipData: null as {
        x: number; freqHz: number; mode: 'schwan' | 'resonance'
        healthyVm: number; targetVm: number; targetDR: number
        healthyDRPct: number; targetDRPct: number
        selRatio: number; inWindow: boolean; flipLeft: boolean
      } | null,
    }
  },

  watch: {
    'store.healthy':                   { handler() { this.updateChart() }, deep: true },
    'store.target':                    { handler() { this.updateChart() }, deep: true },
    'store.fieldIntensity':            { handler() { this.updateChart() } },
    'store.medium':                    { handler() { this.updateChart() } },
    'store.effectiveSigmaE':           { handler() { this.updateChart() } },
    'store.cosThetaFactor':            { handler() { this.updateChart() } },
    'store.currentBroadcastFrequency': { handler() { this.updateCursor() } },
    'store.doubleShellEnabled':        { handler() { this.updateChart() } },
    'store.chartMode':                 { handler() { this.updateChart() } },
    'store.waveform':                  { handler() { this.updateChart() } },
    'store.dutyCycle':                 { handler() { this.updateChart() } },
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
      if (hz >= 1e6) return `${hz / 1e6}M`
      return `${hz / 1e3}k`
    },

    /** Verbose frequency label for hover tooltip (e.g. "12.34 MHz", "750.0 kHz"). */
    formatTooltipFreq(hz: number): string {
      if (hz >= 1e9) return `${(hz / 1e9).toFixed(3)} ${UNIT.GHZ}`
      if (hz >= 1e6) return `${(hz / 1e6).toFixed(3)} ${UNIT.MHZ}`
      return `${(hz / 1e3).toFixed(1)} ${UNIT.KHZ}`
    },

    // ── Optimal frequency scan (300 log-spaced pts, returns Hz) ─────────
    computeOptimalFreqHz(sigma_e: number): number {
      const field = this.store.fieldIntensity
      let maxSel = -Infinity, optHz = F_MIN_HZ
      const logMin = Math.log10(F_MIN_HZ)
      const logMax  = Math.log10(F_MAX_HZ)
      for (let i = 0; i < 300; i++) {
        const hz  = Math.pow(10, logMin + (logMax - logMin) * i / 299)
        const khz = hz / 1000
        const hVm = computeSchwan(this.store.healthy, khz, field, sigma_e)
        const tVm = computeSchwan(this.store.target,  khz, field, sigma_e)
        const sel = hVm > 0 ? tVm / hVm : 0
        if (sel > maxSel) { maxSel = sel; optHz = hz }
      }
      return optHz
    },

    // ── Compute nuclear Vm curve for one cell (double-shell) ─────────────
    computeNuclearCurve(cell: typeof this.store.healthy, sigma_e: number, cosTheta = 1.0): { hz: number; vm: number }[] {
      return F_POINTS_HZ.map((hz) => ({
        hz,
        vm: computeNuclearVm(cell, hz / 1000, this.store.fieldIntensity, sigma_e, cosTheta) * 1000, // mV
      }))
    },

    // ── Compute Vm curve for one cell ────────────────────────────────────
    computeCurve(cell: typeof this.store.healthy, sigma_e: number, cosTheta = 1.0): { hz: number; vm: number }[] {
      return F_POINTS_HZ.map((hz) => ({
        hz,
        vm: computeSchwan(cell, hz / 1000, this.store.fieldIntensity, sigma_e, cosTheta) * 1000, // mV
      }))
    },

    // ── DEP Clausius-Mossotti Re[K(f)] curve ─────────────────────────────
    // Valid in Schwan mode (kHz-500 MHz); not drawn in resonance mode (GHz, model invalid).
    // Bacteria (rod-shaped) use sphere approximation - qualitatively correct for crossover.
    // Waveform scale: CW = 0.5, pulsed = dutyCycle (affects magnitude, not direction/sign).
    computeDepCurve(cell: typeof this.store.healthy, sigma_e: number, eps_r: number): { hz: number; k: number }[] {
      return F_POINTS_HZ.map((hz) => ({
        hz,
        k: computeDepCmReal(cell, hz / 1000, sigma_e, eps_r),
      }))
    },

    // ── Selectivity ratio curve Vm_T/Vm_H (cos θ cancels in ratio) ──────
    computeSelCurve(sigma_e: number): { hz: number; ratio: number }[] {
      return F_POINTS_HZ.map((hz) => {
        const vmH = computeSchwan(this.store.healthy, hz / 1000, this.store.fieldIntensity, sigma_e)
        const vmT = computeSchwan(this.store.target,  hz / 1000, this.store.fieldIntensity, sigma_e)
        return { hz, ratio: vmH < 1e-12 ? 0 : vmT / vmH }
      })
    },

    // ── Full chart init (called on mount + resize) ───────────────────────
    initChart() {
      const container = this.$refs.chartEl as HTMLElement
      if (!container) return

      const totalW = container.clientWidth || 640
      const totalH = 260

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
      this._xScale      = d3.scaleLog().domain([F_MIN_HZ, F_MAX_HZ]).range([0, this._chartW])
      this._yScale      = d3.scaleLinear().domain([0, 100]).range([this._chartH, 0])
      this._yRightScale = d3.scaleLinear().domain([0, 2]).range([this._chartH, 0])
      this._yDepScale   = d3.scaleLinear().domain([-0.5, 0.5]).range([this._chartH, 0])

      // Grid lines (horizontal)
      g.append('g').attr('class', 'grid-h')

      // Axes
      g.append('g').attr('class', 'x-axis').attr('transform', `translate(0,${this._chartH})`)
      g.append('g').attr('class', 'y-axis')
      g.append('g').attr('class', 'y-right-axis').attr('transform', `translate(${this._chartW},0)`)
      // DEP Re[K] axis - further right, only shown in Schwan mode
      g.append('g').attr('class', 'y-dep-axis').attr('transform', `translate(${this._chartW + 90},0)`)

      // Axis labels
      g.append('text')
        .attr('class', 'axis-label-x')
        .attr('text-anchor', 'middle')
        .attr('x', this._chartW / 2)
        .attr('y', this._chartH + 46)
        .attr('fill', 'var(--color-text)')
        .attr('font-size', '0.62rem')
        .attr('font-family', 'var(--font-mono)')
        .attr('letter-spacing', '0.1em')
        .text(this.$t('chart.axisFrequency'))

      g.append('text')
        .attr('class', 'axis-label-y')
        .attr('text-anchor', 'middle')
        .attr('transform', `rotate(-90)`)
        .attr('x', -this._chartH / 2)
        .attr('y', -40)
        .attr('fill', 'var(--color-text)')
        .attr('font-size', '0.6rem')
        .attr('font-family', 'var(--font-mono)')
        .attr('letter-spacing', '0.1em')
        .text(`${this.$t('chart.axisVm')} (${UNIT.MV})`)

      // DEP Re[K] axis label
      g.append('text')
        .attr('class', 'axis-label-dep')
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .attr('x', -this._chartH / 2)
        .attr('y', this._chartW + 122)
        .attr('fill', 'rgba(255,255,255,0.28)')
        .attr('font-size', '0.52rem')
        .attr('font-family', 'var(--font-mono)')
        .attr('letter-spacing', '0.1em')
        .text('Re[K], DEP')

      // Curve groups (library first so they're below)
      g.append('g').attr('class', 'curves-library')
      g.append('g').attr('class', 'curves-active')

      // Threshold lines + rev-EP lines
      g.append('g').attr('class', 'thresholds')

      // Nuclear envelope Vm curves (double-shell model - below active curves)
      g.append('g').attr('class', 'curves-nuclear')

      // Selectivity ratio curve (above thresholds)
      g.append('g').attr('class', 'sel-curve')

      // DEP Clausius-Mossotti Re[K] curves - drawn above thresholds, Schwan mode only
      g.append('g').attr('class', 'dep-curves')

      // fc markers
      g.append('g').attr('class', 'fc-markers')

      // Optimal frequency marker
      g.append('g').attr('class', 'opt-marker')

      // Cursor
      g.append('line')
        .attr('class', 'cursor-line')
        .attr('y1', 0).attr('y2', this._chartH)
        .attr('stroke', 'rgba(255,255,255,0.85)')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4,3')

      g.append('rect')
        .attr('class', 'cursor-bg')
        .attr('y', -2).attr('height', 14).attr('rx', 2)
        .attr('fill', 'rgba(255,255,255,0.12)')

      g.append('text')
        .attr('class', 'cursor-label')
        .attr('y', 8)
        .attr('text-anchor', 'middle')
        .attr('fill', 'rgba(255,255,255,0.75)')
        .attr('font-size', '0.58rem')
        .attr('font-family', 'var(--font-mono)')

      // Drag-discoverability hint - appears above the cursor line
      g.append('text')
        .attr('class', 'cursor-drag-hint')
        .attr('y', -4)
        .attr('text-anchor', 'middle')
        .attr('fill', 'rgba(255,255,255,0.28)')
        .attr('font-size', '0.5rem')
        .attr('font-family', 'var(--font-mono)')
        .attr('letter-spacing', '0.08em')
        .attr('pointer-events', 'none')
        .text(this.$t('chart.dragHint'))

      // Hover + drag overlay (covers full chart area)
      const dragBehavior = d3.drag<SVGRectElement, unknown>()
        .on('drag', (event) => {
          if (!this._xScale) return
          const xClamped = Math.max(0, Math.min(this._chartW, event.x))
          const hz = this._xScale.invert(xClamped)
          const khz = Math.max(10, Math.min(F_CURSOR_MAX_KHZ, hz / 1000))
          this.store.setBroadcastFreqKHz(Math.round(khz))
          broadcastStateSync()
        })

      g.append('rect')
        .attr('class', 'hover-overlay')
        .attr('width', this._chartW).attr('height', this._chartH)
        .attr('fill', 'transparent')
        .style('cursor', 'ew-resize')
        .on('mousemove', (event: MouseEvent) => this.onHover(event))
        .on('mouseleave', () => { this._tooltipData = null })
        .call(dragBehavior)
    },

    // ── Resonance mode: Lorentzian disruption chart ──────────────────────
    updateChartResonance() {
      if (!this._svg || !this._xScale || !this._yScale) return
      const t = this.store.target
      if (!t.resonantFreqGHz || !t.resonantThresholdVcm) return

      const g = this._svg.select<SVGGElement>('.chart-g')
      const f0_hz = t.resonantFreqGHz * 1e9
      const Q    = t.capsidQ ?? DEFAULT_CAPSID_Q
      const Qmin = t.capsidQMin ?? Q
      const Qmax = t.capsidQMax ?? Q
      const E    = this.store.fieldIntensity
      const Ethr = t.resonantThresholdVcm

      // Frequency range: 2 decades below and above f_res
      const fMin = f0_hz * 0.01
      const fMax = f0_hz * 100
      const freqPoints = logspace(fMin, fMax, 200)
      this._xScale!.domain([fMin, fMax])

      // Lorentzian disruption curves
      const lorCurve = freqPoints.map((hz) => ({
        hz, dr: computeResonantLineshape(t.resonantFreqGHz!, Q, hz) * (E / Ethr),
      }))
      const lorQmin = freqPoints.map((hz) => ({
        hz, dr: computeResonantLineshape(t.resonantFreqGHz!, Qmin, hz) * (E / Ethr),
      }))
      const lorQmax = freqPoints.map((hz) => ({
        hz, dr: computeResonantLineshape(t.resonantFreqGHz!, Qmax, hz) * (E / Ethr),
      }))

      // Y scale: disruption ratio
      const maxDr = Math.max(...lorQmin.map((d) => d.dr), 1.2)
      this._yScale!.domain([0, Math.ceil(maxDr * 10) / 10])

      // Tick values: integer powers of 10 plus f_res
      const logMin = Math.floor(Math.log10(fMin))
      const logMax = Math.ceil(Math.log10(fMax))
      const tickVals: number[] = []
      for (let exp = logMin; exp <= logMax; exp++) {
        const p = Math.pow(10, exp)
        if (p >= fMin && p <= fMax) tickVals.push(p)
      }
      if (!tickVals.some((v) => Math.abs(v - f0_hz) / f0_hz < 0.05)) tickVals.push(f0_hz)
      tickVals.sort((a, b) => a - b)

      const formatResHz = (hz: number): string => {
        if (hz >= 1e9) return `${(hz / 1e9).toFixed(hz >= 10e9 ? 0 : 1)}G`
        if (hz >= 1e6) return `${(hz / 1e6).toFixed(hz >= 100e6 ? 0 : 1)}M`
        return `${(hz / 1e3).toFixed(0)}k`
      }

      g.select<SVGGElement>('.x-axis')
        .call(d3.axisBottom<number>(this._xScale!).tickValues(tickVals).tickFormat(formatResHz).tickSize(4))
        .call((a) => a.select('.domain').attr('stroke', 'rgba(255,255,255,0.15)'))
        .call((a) => a.selectAll('text').attr('fill', 'var(--color-text)').attr('font-size', '0.64rem').attr('font-family', 'var(--font-mono)'))
        .call((a) => a.selectAll('line').attr('stroke', 'rgba(255,255,255,0.2)'))

      g.select<SVGGElement>('.y-axis')
        .call(d3.axisLeft<number>(this._yScale!).ticks(5).tickSize(4))
        .call((a) => a.select('.domain').attr('stroke', 'rgba(255,255,255,0.15)'))
        .call((a) => a.selectAll('text').attr('fill', 'var(--color-text)').attr('font-size', '0.64rem').attr('font-family', 'var(--font-mono)'))
        .call((a) => a.selectAll('line').attr('stroke', 'rgba(255,255,255,0.2)'))

      g.select<SVGGElement>('.grid-h')
        .call(d3.axisLeft<number>(this._yScale!).ticks(5).tickSize(-this._chartW).tickFormat(() => ''))
        .call((a) => a.select('.domain').remove())
        .call((a) => a.selectAll('line').attr('stroke', 'rgba(255,255,255,0.06)'))

      // Hide selectivity curve and right axis (TI → ∞ in resonance, not useful to plot)
      g.select<SVGGElement>('.sel-curve').selectAll('*').remove()
      g.select<SVGGElement>('.y-right-axis').selectAll('*').remove()
      g.select<SVGGElement>('.curves-library').selectAll('*').remove()
      g.select<SVGGElement>('.curves-nuclear').selectAll('*').remove()
      // DEP single-shell model invalid at GHz resonance frequencies - clear overlay
      g.select<SVGGElement>('.dep-curves').selectAll('*').remove()
      g.select<SVGGElement>('.y-dep-axis').selectAll('*').remove()
      g.select('.axis-label-dep').attr('opacity', 0)

      // Lorentzian line generator
      const drLineGen = d3.line<{ hz: number; dr: number }>()
        .x((d) => this._xScale!(d.hz))
        .y((d) => this._yScale!(d.dr))
        .curve(d3.curveBasis)

      const activeGroup = g.select<SVGGElement>('.curves-active')
      activeGroup.selectAll('*').remove()

      // Q uncertainty band (filled area + dashed bounds)
      if (Qmin !== Qmax) {
        const areaGen = d3.area<{ hz: number; drLow: number; drHigh: number }>()
          .x((d) => this._xScale!(d.hz))
          .y0((d) => this._yScale!(d.drLow))
          .y1((d) => this._yScale!(d.drHigh))
          .curve(d3.curveBasis)

        const bandData = freqPoints.map((hz, i) => ({
          hz,
          drLow:  lorQmax[i]!.dr,  // higher Q → narrower → smaller off-resonance values
          drHigh: lorQmin[i]!.dr,  // lower Q  → broader  → larger off-resonance values
        }))

        activeGroup.append('path')
          .datum(bandData)
          .attr('fill', C.danger)
          .attr('fill-opacity', 0.08)
          .attr('d', areaGen)

        activeGroup.append('path')
          .datum(lorQmax)
          .attr('fill', 'none').attr('stroke', C.danger)
          .attr('stroke-width', 1).attr('stroke-opacity', 0.35)
          .attr('stroke-dasharray', '3,4').attr('d', drLineGen)

        activeGroup.append('path')
          .datum(lorQmin)
          .attr('fill', 'none').attr('stroke', C.danger)
          .attr('stroke-width', 1).attr('stroke-opacity', 0.35)
          .attr('stroke-dasharray', '3,4').attr('d', drLineGen)
      }

      // Main Lorentzian (nominal Q) - solid red
      activeGroup.append('path')
        .datum(lorCurve)
        .attr('fill', 'none')
        .attr('stroke', C.danger).attr('stroke-width', 2.5).attr('stroke-opacity', 1)
        .attr('filter', `drop-shadow(0 0 4px ${C.danger}88)`)
        .attr('d', drLineGen)

      // DR = 1.0 threshold line
      const thrGroup = g.select<SVGGElement>('.thresholds')
      thrGroup.selectAll('*').remove()
      const y1 = this._yScale!(1)
      if (y1 >= 0 && y1 <= this._chartH) {
        thrGroup.append('line')
          .attr('x1', 0).attr('x2', this._chartW)
          .attr('y1', y1).attr('y2', y1)
          .attr('stroke', C.danger).attr('stroke-width', 0.75)
          .attr('stroke-dasharray', '4,3').attr('stroke-opacity', 0.5)
        thrGroup.append('text')
          .attr('x', this._chartW + 4).attr('y', y1 + 4)
          .attr('fill', C.danger).attr('font-size', '0.52rem')
          .attr('font-family', 'var(--font-mono)').text(this.$t('chart.drOne'))
      }

      // f_res vertical marker + label
      const fcGroup = g.select<SVGGElement>('.fc-markers')
      fcGroup.selectAll('*').remove()
      const xRes = this._xScale!(f0_hz)
      const fResLabel = t.resonantFreqGHz >= 1
        ? `f_res ${t.resonantFreqGHz.toFixed(1)} GHz`
        : `f_res ${(t.resonantFreqGHz * 1000).toFixed(0)} MHz`
      fcGroup.append('line')
        .attr('x1', xRes).attr('x2', xRes).attr('y1', 0).attr('y2', this._chartH)
        .attr('stroke', C.danger).attr('stroke-width', 1)
        .attr('stroke-dasharray', '4,3').attr('stroke-opacity', 0.4)
      fcGroup.append('text').attr('x', xRes).attr('y', this._chartH + 20)
        .attr('text-anchor', 'middle').attr('fill', C.danger)
        .attr('font-size', '0.62rem').attr('font-family', 'var(--font-mono)').text(ICON.TRIANGLE_UP)
      fcGroup.append('text').attr('x', xRes).attr('y', this._chartH + 34)
        .attr('text-anchor', 'middle').attr('fill', C.danger)
        .attr('font-size', '0.6rem').attr('font-family', 'var(--font-mono)').text(fResLabel)

      // f_res ± uncertainty range markers (amber dashed)
      const pct = t.resonantFreqUncertaintyPct
      if (pct) {
        for (const f of [f0_hz * (1 - pct / 100), f0_hz * (1 + pct / 100)]) {
          if (f >= fMin && f <= fMax) {
            fcGroup.append('line')
              .attr('x1', this._xScale!(f)).attr('x2', this._xScale!(f))
              .attr('y1', 0).attr('y2', this._chartH)
              .attr('stroke', C.amber).attr('stroke-width', 0.75)
              .attr('stroke-dasharray', '2,4').attr('stroke-opacity', 0.35)
          }
        }
      }

      // Clear optimal marker (not applicable in resonance mode)
      g.select<SVGGElement>('.opt-marker').selectAll('*').remove()

      this.updateCursor()
    },

    // ── Full chart update (curves + axes + thresholds) ───────────────────
    updateChart() {
      if (!this._svg || !this._xScale || !this._yScale) return

      const g = this._svg.select<SVGGElement>('.chart-g')

      // Branch: resonance mode shows Lorentzian disruption chart
      const cat = this.store.targetCellCategory
      const t = this.store.target
      if (
        this.store.chartMode === CHART_MODE.RESONANCE &&
        (cat === CELL_CATEGORY.VIRUS || cat === CELL_CATEGORY.BACTERIA) &&
        t.resonantFreqGHz && t.resonantThresholdVcm
      ) {
        g.select('.axis-label-y').text(this.$t('chart.axisDisruptionRatio'))
        this.updateChartResonance()
        return
      }

      // Schwan mode: reset x domain and y-axis label
      this._xScale!.domain([F_MIN_HZ, F_MAX_HZ])
      g.select('.axis-label-y').text(`${this.$t('chart.axisVm')} (${UNIT.MV})`)

      const sigma_e  = this.store.effectiveSigmaE
      const cosTheta = this.store.cosThetaFactor

      // Compute active-cell curves (include orientation factor)
      const healthyCurve = this.computeCurve(this.store.healthy, sigma_e, cosTheta)
      const targetCurve  = this.computeCurve(this.store.target,  sigma_e, cosTheta)

      // Auto-scale y
      const allVm = [...healthyCurve.map((d) => d.vm), ...targetCurve.map((d) => d.vm)]
      const maxVm = Math.ceil(Math.max(...allVm, 50) / 50) * 50
      this._yScale!.domain([0, maxVm])

      // Update axes
      const xAxis = d3.axisBottom<number>(this._xScale!)
        .tickValues([1e4, 1e5, 1e6, 1e7, 1e8, 5e8])
        .tickFormat((d) => this.formatHz(+d))
        .tickSize(4)

      const yAxis = d3.axisLeft<number>(this._yScale!)
        .ticks(5)
        .tickSize(4)

      g.select<SVGGElement>('.x-axis')
        .call(xAxis)
        .call((a) => a.select('.domain').attr('stroke', 'rgba(255,255,255,0.15)'))
        .call((a) => a.selectAll('text').attr('fill', 'var(--color-text)').attr('font-size', '0.64rem').attr('font-family', 'var(--font-mono)'))
        .call((a) => a.selectAll('line').attr('stroke', 'rgba(255,255,255,0.2)'))

      g.select<SVGGElement>('.y-axis')
        .call(yAxis)
        .call((a) => a.select('.domain').attr('stroke', 'rgba(255,255,255,0.15)'))
        .call((a) => a.selectAll('text').attr('fill', 'var(--color-text)').attr('font-size', '0.64rem').attr('font-family', 'var(--font-mono)'))
        .call((a) => a.selectAll('line').attr('stroke', 'rgba(255,255,255,0.2)'))

      // Grid
      g.select<SVGGElement>('.grid-h')
        .call(
          d3.axisLeft<number>(this._yScale!).ticks(5).tickSize(-this._chartW).tickFormat(() => ''),
        )
        .call((a) => a.select('.domain').remove())
        .call((a) => a.selectAll('line').attr('stroke', 'rgba(255,255,255,0.06)'))

      // ── Selectivity ratio curve + right Y-axis ──────────────────────────
      const selData   = this.computeSelCurve(sigma_e)
      const maxRatio  = Math.max(...selData.map((d) => d.ratio), 2.0)
      const rightDomainMax = Math.ceil(maxRatio * 10) / 10
      this._yRightScale!.domain([0, rightDomainMax])

      const yRightAxis = d3.axisRight<number>(this._yRightScale!)
        .ticks(4)
        .tickSize(3)
        .tickFormat((d) => `×${(+d).toFixed(1)}`)

      g.select<SVGGElement>('.y-right-axis')
        .call(yRightAxis)
        .call((a) => a.select('.domain').attr('stroke', C.amber + '55'))
        .call((a) => a.selectAll('text').attr('fill', C.amber).attr('font-size', '0.58rem').attr('font-family', 'var(--font-mono)'))
        .call((a) => a.selectAll('line').attr('stroke', C.amber + '55'))

      const selLineGen = d3.line<{ hz: number; ratio: number }>()
        .x((d) => this._xScale!(d.hz))
        .y((d) => this._yRightScale!(d.ratio))
        .curve(d3.curveBasis)

      const selGroup = g.select<SVGGElement>('.sel-curve')
      selGroup.selectAll('*').remove()

      // Ratio=1 reference line (faint dotted)
      const y1 = this._yRightScale!(1)
      if (y1 >= 0 && y1 <= this._chartH) {
        selGroup.append('line')
          .attr('x1', 0).attr('x2', this._chartW)
          .attr('y1', y1).attr('y2', y1)
          .attr('stroke', 'rgba(255,255,255,0.12)')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '2,4')
      }

      // Selectivity ratio curve (amber dashed)
      selGroup.append('path')
        .datum(selData)
        .attr('fill', 'none')
        .attr('stroke', C.amber)
        .attr('stroke-width', 1.5)
        .attr('stroke-opacity', 0.75)
        .attr('stroke-dasharray', '6,3')
        .attr('d', selLineGen)

      // ── DEP Re[K(f)] overlay - Clausius-Mossotti single-shell model ─────
      // Valid for kHz-500 MHz (Schwan mode only). Not shown in resonance mode.
      // Bacteria use sphere approximation. Waveform: CW = 0.5×, pulsed = dc×.
      // Medium permittivity is per-medium (Gabriel et al. 1996).
      const depGroup = g.select<SVGGElement>('.dep-curves')
      depGroup.selectAll('*').remove()
      g.select('.axis-label-dep').attr('opacity', 1)

      const eps_r    = MEDIA[this.store.medium].permittivity
      const depHCurve = this.computeDepCurve(this.store.healthy, sigma_e, eps_r)
      const depTCurve = this.computeDepCurve(this.store.target,  sigma_e, eps_r)

      // K=0 reference line (pDEP above, nDEP below)
      const yK0 = this._yDepScale!(0)
      if (yK0 >= 0 && yK0 <= this._chartH) {
        depGroup.append('line')
          .attr('x1', 0).attr('x2', this._chartW)
          .attr('y1', yK0).attr('y2', yK0)
          .attr('stroke', 'rgba(255,255,255,0.10)')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '2,4')
      }

      // Re[K] curves - raw CM factor (material property, waveform-independent).
      // Time-averaged force = Re[K] × waveform scale (CW: ×0.5, pulsed: ×dc) - shown in SelectivityPanel.
      const depLineGen = d3.line<{ hz: number; k: number }>()
        .x((d) => this._xScale!(d.hz))
        .y((d) => this._yDepScale!(d.k))
        .curve(d3.curveBasis)

      depGroup.append('path')
        .datum(depHCurve)
        .attr('fill', 'none')
        .attr('stroke', C.primary)
        .attr('stroke-width', 1.2)
        .attr('stroke-opacity', 0.50)
        .attr('stroke-dasharray', '2,4')
        .attr('d', depLineGen)

      depGroup.append('path')
        .datum(depTCurve)
        .attr('fill', 'none')
        .attr('stroke', C.danger)
        .attr('stroke-width', 1.2)
        .attr('stroke-opacity', 0.50)
        .attr('stroke-dasharray', '2,4')
        .attr('d', depLineGen)

      // DEP axis: fixed Re[K] range [-0.5, +0.5]
      this._yDepScale!.domain([-0.5, 0.5])
      const yDepAxis = d3.axisRight<number>(this._yDepScale!)
        .tickValues([-0.5, 0, 0.5])
        .tickSize(3)
        .tickFormat((d) => {
          const v = +d
          if (Math.abs(v) < 1e-6) return 'K=0'
          return v > 0 ? `+${v.toFixed(1)}` : v.toFixed(1)
        })

      g.select<SVGGElement>('.y-dep-axis')
        .call(yDepAxis)
        .call((a) => a.select('.domain').attr('stroke', 'rgba(255,255,255,0.12)'))
        .call((a) => a.selectAll('text').attr('fill', 'rgba(255,255,255,0.38)').attr('font-size', '0.50rem').attr('font-family', 'var(--font-mono)'))
        .call((a) => a.selectAll('line').attr('stroke', 'rgba(255,255,255,0.15)'))
      // ── End DEP overlay ──────────────────────────────────────────────────

      // Line generator (for Vm curves)
      const lineGen = d3.line<{ hz: number; vm: number }>()
        .x((d) => this._xScale!(d.hz))
        .y((d) => this._yScale!(d.vm))
        .curve(d3.curveBasis)

      // Library preset curves (faint background - no cosTheta, use default 1.0)
      const libGroup = g.select<SVGGElement>('.curves-library')
      libGroup.selectAll<SVGPathElement, typeof CELL_PRESETS[0]>('path.lib-curve')
        .data(CELL_PRESETS, (d) => d.presetId)
        .join('path')
        .attr('class', 'lib-curve')
        .attr('fill', 'none')
        .attr('stroke', (d) => GROUP_COLORS[d.group])
        .attr('stroke-width', 1)
        .attr('stroke-opacity', 0.18)
        .attr('d', (d) => lineGen(this.computeCurve(d, sigma_e)) || '')

      // Active curves
      const activeGroup = g.select<SVGGElement>('.curves-active')
      activeGroup.selectAll('path').remove()

      // ── σ_i uncertainty bands ──────────────────────────────────────────────
      // ±pct% variation in internal conductivity σ_i propagates through τ → fc,
      // producing a shaded region representing literature parameter uncertainty.
      // Uncertainty scales with cell category: mammalian 20%, bacteria 35%, virus 45%.
      const sigmaUncPct = (radius: number): number => {
        if (radius < 0.1) return 45  // virus, lipid bilayer σ_i highly variable
        if (radius < 2.0) return 35  // bacteria, complex wall composition
        return 20                     // mammalian, well-characterised reference ranges
      }

      const computeUncBand = (
        cell: typeof this.store.healthy,
        pct: number,
      ): { hz: number; vmLow: number; vmHigh: number }[] => {
        const field = this.store.fieldIntensity
        return F_POINTS_HZ.map((hz) => {
          const khz    = hz / 1000
          const sigma_i = cell.conductivity  // σ_i = cytoplasm conductivity [S/m]
          const vmLow  = computeSchwan(
            { ...cell, conductivity: sigma_i * (1 - pct / 100) },
            khz, field, sigma_e, cosTheta,
          ) * 1000
          const vmHigh = computeSchwan(
            { ...cell, conductivity: sigma_i * (1 + pct / 100) },
            khz, field, sigma_e, cosTheta,
          ) * 1000
          return { hz, vmLow, vmHigh }
        })
      }

      const areaGen = d3.area<{ hz: number; vmLow: number; vmHigh: number }>()
        .x((d) => this._xScale!(d.hz))
        .y0((d) => this._yScale!(Math.max(0, d.vmLow)))
        .y1((d) => this._yScale!(Math.min(maxVm, d.vmHigh)))
        .curve(d3.curveBasis)

      const hPct = sigmaUncPct(this.store.healthy.radius)
      const tPct = sigmaUncPct(this.store.target.radius)

      activeGroup.append('path')
        .datum(computeUncBand(this.store.healthy, hPct))
        .attr('fill', C.primary)
        .attr('fill-opacity', 0.10)
        .attr('stroke', 'none')
        .attr('d', areaGen)

      activeGroup.append('path')
        .datum(computeUncBand(this.store.target, tPct))
        .attr('fill', C.danger)
        .attr('fill-opacity', 0.10)
        .attr('stroke', 'none')
        .attr('d', areaGen)
      // ── End uncertainty bands ─────────────────────────────────────────────

      activeGroup.append('path')
        .datum(healthyCurve)
        .attr('fill', 'none')
        .attr('stroke', C.primary)
        .attr('stroke-width', 2.5)
        .attr('stroke-opacity', 1)
        .attr('filter', `drop-shadow(0 0 4px ${C.primary}88)`)
        .attr('d', lineGen)

      activeGroup.append('path')
        .datum(targetCurve)
        .attr('fill', 'none')
        .attr('stroke', C.danger)
        .attr('stroke-width', 2.5)
        .attr('stroke-opacity', 1)
        .attr('filter', `drop-shadow(0 0 4px ${C.danger}88)`)
        .attr('d', lineGen)

      // ── Nuclear Vm curves (Kotnik & Miklavcic 2006 double-shell) ────────
      const nucGroup = g.select<SVGGElement>('.curves-nuclear')
      nucGroup.selectAll('path').remove()

      if (this.store.doubleShellEnabled) {
        const hNucCurve = this.computeNuclearCurve(this.store.healthy, sigma_e, cosTheta)
        const tNucCurve = this.computeNuclearCurve(this.store.target,  sigma_e, cosTheta)

        nucGroup.append('path')
          .datum(hNucCurve)
          .attr('fill', 'none')
          .attr('stroke', C.primary)
          .attr('stroke-width', 1.5)
          .attr('stroke-opacity', 0.45)
          .attr('stroke-dasharray', '5,4')
          .attr('d', lineGen)

        nucGroup.append('path')
          .datum(tNucCurve)
          .attr('fill', 'none')
          .attr('stroke', C.danger)
          .attr('stroke-width', 1.5)
          .attr('stroke-opacity', 0.45)
          .attr('stroke-dasharray', '5,4')
          .attr('d', lineGen)
      }

      // ── Threshold lines: lysis + reversible EP (50%) ───────────────────
      const thrGroup = g.select<SVGGElement>('.thresholds')
      thrGroup.selectAll('*').remove()

      const thrData = [
        { label: this.$t('chart.thrH'), vm: this.store.healthy.thresholdVoltage * 1000, color: C.primary },
        { label: this.$t('chart.thrT'), vm: this.store.target.thresholdVoltage * 1000,  color: C.danger  },
      ]
      thrData.forEach(({ label, vm, color }) => {
        // Lysis threshold line
        if (vm <= maxVm) {
          const y = this._yScale!(vm)
          thrGroup.append('line')
            .attr('x1', 0).attr('x2', this._chartW)
            .attr('y1', y).attr('y2', y)
            .attr('stroke', color).attr('stroke-width', 0.75)
            .attr('stroke-dasharray', '4,3').attr('stroke-opacity', 0.5)
          thrGroup.append('text')
            .attr('x', this._chartW + 4).attr('y', y + 4)
            .attr('fill', color).attr('font-size', '0.52rem')
            .attr('font-family', 'var(--font-mono)')
            .text(label)
        }

        // Reversible EP threshold at 50% of lysis threshold
        const vmRev = vm * 0.5
        if (vmRev <= maxVm) {
          const yRev = this._yScale!(vmRev)
          thrGroup.append('line')
            .attr('x1', 0).attr('x2', this._chartW)
            .attr('y1', yRev).attr('y2', yRev)
            .attr('stroke', color).attr('stroke-width', 0.6)
            .attr('stroke-dasharray', '3,4').attr('stroke-opacity', 0.28)
          thrGroup.append('text')
            .attr('x', this._chartW + 4).attr('y', yRev + 4)
            .attr('fill', color).attr('font-size', '0.48rem')
            .attr('font-family', 'var(--font-mono)')
            .attr('opacity', 0.6)
            .text(this.$t('chart.revEp'))
        }
      })

      // fc markers
      const fcGroup = g.select<SVGGElement>('.fc-markers')
      fcGroup.selectAll('*').remove()
      const tauHNs = computeTau(this.store.healthy, sigma_e) * 1e9
      const tauTNs = computeTau(this.store.target,  sigma_e) * 1e9
      const fcData = [
        { fc: computeFc(this.store.healthy, sigma_e), color: C.primary, label: this.$t('chart.fcH'), tauNs: tauHNs },
        { fc: computeFc(this.store.target,  sigma_e), color: C.danger,  label: this.$t('chart.fcT'), tauNs: tauTNs },
      ]
      // Build visible fc markers (within chart x domain)
      const visibleFc = fcData
        .map(({ fc, color, label, tauNs }) => {
          const hz = fc * 1000
          if (hz < F_MIN_HZ || hz > F_MAX_HZ) return null
          const fcDisplay = fc >= 1000 ? `${(fc / 1000).toFixed(1)}M` : `${fc.toFixed(0)}k`
          const tauDisplay = tauNs >= 1000
            ? `τ=${(tauNs / 1000).toFixed(0)}${UNIT.US}`
            : `τ=${tauNs.toFixed(0)}${UNIT.NS}`
          return { x: this._xScale!(hz), color, label, fcDisplay, tauDisplay }
        })
        .filter(Boolean) as { x: number; color: string; label: string; fcDisplay: string; tauDisplay: string }[]

      // When the two markers are within 52 px, flip text-anchor outward to avoid overlap
      const MIN_GAP_PX = 52
      const anchors: ('middle' | 'end' | 'start')[] = visibleFc.map(() => 'middle' as const)
      if (visibleFc.length === 2) {
        const v0 = visibleFc[0]!
        const v1 = visibleFc[1]!
        if (Math.abs(v0.x - v1.x) < MIN_GAP_PX) {
          const [li, ri] = v0.x <= v1.x ? [0, 1] : [1, 0]
          anchors[li] = 'end'
          anchors[ri] = 'start'
        }
      }

      visibleFc.forEach(({ x, color, label, fcDisplay, tauDisplay }, i) => {
        const anchor: 'middle' | 'end' | 'start' = anchors[i] ?? 'middle'
        fcGroup.append('text')
          .attr('x', x).attr('y', this._chartH + 20)
          .attr('text-anchor', 'middle')
          .attr('fill', color).attr('font-size', '0.62rem')
          .attr('font-family', 'var(--font-mono)')
          .text(ICON.TRIANGLE_UP)
        fcGroup.append('text')
          .attr('x', x).attr('y', this._chartH + 34)
          .attr('text-anchor', anchor)
          .attr('fill', color).attr('font-size', '0.6rem')
          .attr('font-family', 'var(--font-mono)')
          .attr('letter-spacing', '0.03em')
          .text(`${label} ${fcDisplay}`)
        fcGroup.append('text')
          .attr('x', x).attr('y', this._chartH + 46)
          .attr('text-anchor', anchor)
          .attr('fill', color).attr('font-size', '0.55rem')
          .attr('font-family', 'var(--font-mono)')
          .attr('opacity', 0.65)
          .text(tauDisplay)
      })

      // Optimal frequency marker (golden dashed line + star label)
      const optGroup = g.select<SVGGElement>('.opt-marker')
      optGroup.selectAll('*').remove()
      const optHz = this.computeOptimalFreqHz(sigma_e)
      if (optHz >= F_MIN_HZ && optHz <= F_MAX_HZ) {
        const ox     = this._xScale!(optHz)
        const optKhz = optHz / 1000
        const hVmOpt = computeSchwan(this.store.healthy, optKhz, this.store.fieldIntensity, sigma_e)
        const tVmOpt = computeSchwan(this.store.target,  optKhz, this.store.fieldIntensity, sigma_e)
        const optSel = hVmOpt > 0 ? tVmOpt / hVmOpt : 0
        const optLabel = optHz >= 1e6
          ? `${ICON.STAR} ${(optHz / 1e6).toFixed(2)}M Vm×${optSel.toFixed(1)}`
          : `${ICON.STAR} ${(optHz / 1e3).toFixed(0)}k Vm×${optSel.toFixed(1)}`
        optGroup.append('line')
          .attr('x1', ox).attr('x2', ox)
          .attr('y1', 0).attr('y2', this._chartH)
          .attr('stroke', C.amber).attr('stroke-width', 1)
          .attr('stroke-dasharray', '3,4').attr('stroke-opacity', 0.45)
        const optAnchor = ox < 60 ? 'start' : ox > this._chartW - 60 ? 'end' : 'middle'
        const optTextX  = ox < 60 ? Math.max(4, ox) : ox > this._chartW - 60 ? Math.min(this._chartW - 4, ox) : ox
        optGroup.append('text')
          .attr('x', optTextX).attr('y', -5)
          .attr('text-anchor', optAnchor)
          .attr('fill', C.amber).attr('font-size', '0.58rem')
          .attr('font-family', 'var(--font-mono)')
          .attr('letter-spacing', '0.04em')
          .text(optLabel)
      }

      this.updateCursor()
    },

    // ── Cursor-only update (cheap) ───────────────────────────────────────
    updateCursor() {
      if (!this._svg || !this._xScale) return
      const g = this._svg.select<SVGGElement>('.chart-g')
      const hz = this.store.currentBroadcastFrequency * 1000
      // Use dynamic domain (changes in resonance mode)
      const [domMin, domMax] = this._xScale.domain() as [number, number]
      const x = this._xScale(Math.max(domMin, Math.min(domMax, hz)))

      this._cursorX = x
      g.select('.cursor-line').attr('x1', x).attr('x2', x)
      g.select('.cursor-drag-hint').attr('x', x)

      const freqKHz = this.store.currentBroadcastFrequency
      const label = freqKHz >= 1e6 ? `${(freqKHz / 1e6).toFixed(2)} ${UNIT.GHZ}`
                  : freqKHz >= 1000 ? `${(freqKHz / 1000).toFixed(1)} ${UNIT.MHZ}`
                  : `${freqKHz} ${UNIT.KHZ}`
      const textEl = g.select<SVGTextElement>('.cursor-label')
      textEl.attr('x', x).text(label)

      const textWidth = (textEl.node()?.getComputedTextLength?.() ?? label.length * 5.5) + 8
      g.select('.cursor-bg')
        .attr('x', x - textWidth / 2)
        .attr('width', textWidth)
    },

    // ── Hover tooltip ────────────────────────────────────────────────────
    onHover(event: MouseEvent) {
      if (!this._xScale || !this._yScale) return
      const [mx] = d3.pointer(event)

      // Near the cursor line: show drag affordance, suppress tooltip
      const nearCursor = Math.abs(mx - this._cursorX) < 20
      const overlay = this._svg?.select<SVGRectElement>('.hover-overlay')
      overlay?.style('cursor', nearCursor ? 'ew-resize' : 'crosshair')
      if (nearCursor) { this._tooltipData = null; return }
      const hz = this._xScale.invert(mx)
      const khz = hz / 1000
      const sigma_e  = this.store.effectiveSigmaE
      const cosTheta = this.store.cosThetaFactor
      const cat = this.store.targetCellCategory
      const t = this.store.target as { resonantFreqGHz?: number; capsidQ?: number; resonantThresholdVcm?: number }

      // In resonance mode show DR (disruption ratio), not Vm - axes are incompatible
      if (
        this.store.chartMode === CHART_MODE.RESONANCE &&
        (cat === CELL_CATEGORY.VIRUS || cat === CELL_CATEGORY.BACTERIA) &&
        t.resonantFreqGHz && t.resonantThresholdVcm
      ) {
        const dr = computeResonantDisruption(
          t.resonantFreqGHz,
          t.capsidQ ?? DEFAULT_CAPSID_Q,
          t.resonantThresholdVcm,
          hz,
          this.store.fieldIntensity,
        )
        const flipLeft = mx > (this._chartW ?? 0) * 0.55
        this._tooltipData = {
          x: mx, freqHz: hz, mode: 'resonance', healthyVm: 0, targetVm: 0, targetDR: dr,
          healthyDRPct: 0, targetDRPct: dr * 100, selRatio: 0, inWindow: false, flipLeft,
        }
        return
      }

      const hVm = computeSchwan(this.store.healthy, khz, this.store.fieldIntensity, sigma_e, cosTheta) * 1000
      const tVm = computeSchwan(this.store.target,  khz, this.store.fieldIntensity, sigma_e, cosTheta) * 1000
      const hDRPct  = (hVm / (this.store.healthy.thresholdVoltage * 1000)) * 100
      const tDRPct  = (tVm / (this.store.target.thresholdVoltage  * 1000)) * 100
      const selRatio = hVm > 0.01 ? tVm / hVm : 0
      const inWindow = tDRPct >= THRESHOLDS.DISRUPTION_WARN * 100 && hDRPct < THRESHOLDS.HEALTHY_APPROACHING * 100
      const flipLeft = mx > (this._chartW ?? 0) * 0.55
      this._tooltipData = {
        x: mx, freqHz: hz, mode: 'schwan',
        healthyVm: hVm, targetVm: tVm, targetDR: 0,
        healthyDRPct: hDRPct, targetDRPct: tDRPct,
        selRatio, inWindow, flipLeft,
      }
    },
  },
})
</script>

<style lang="scss" scoped>
@use '../../styles/mixins' as *;

/* Expose group colors as CSS vars for the legend dots */
.freq-chart {
  --group-reference: var(--color-group-reference);
  --group-cancer:    var(--color-group-cancer);
  --group-bacteria:  var(--color-group-bacteria);
  --group-virus:     var(--color-group-virus);

  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  overflow: visible;
  position: relative;

  &__header {
    @include flex-between(1rem);
    padding: 0.6rem 0.85rem 0.2rem;
    flex-wrap: wrap;
  }

  &__title {
    @include mono-upper(0.82rem, 0.12em);
    color: var(--color-text);
    white-space: nowrap;
  }

  &__legend {
    @include flex-row(0.75rem);
    flex-wrap: wrap;

    &-item {
      @include flex-row(0.3rem);
      font-size: 0.62rem;
      font-family: var(--font-mono);
      color: var(--color-text);
      white-space: nowrap;
    }

    &-dot {
      width: 7px; height: 7px;
      border-radius: 50%;
      opacity: 0.75;
      flex-shrink: 0;
    }

    &-line {
      width: 14px; height: 2px;
      border-radius: 1px;
      flex-shrink: 0;

      &--h   { background: var(--color-primary); box-shadow: 0 0 4px var(--color-primary); }
      &--t   { background: var(--color-danger);  box-shadow: 0 0 4px var(--color-danger); }
      &--sel {
        width: 18px; height: 0;
        border-top: 2px dashed #fbbf24;
        background: transparent;
        opacity: 0.8;
      }
      &--nuc-h {
        width: 18px; height: 0;
        border-top: 2px dashed rgba(0, 212, 255, 0.55);
        background: transparent;
      }
      &--nuc-t {
        width: 18px; height: 0;
        border-top: 2px dashed rgba(255, 77, 109, 0.55);
        background: transparent;
      }
    }
  }

  &__svg-wrap {
    width: 100%;
    height: 260px;
    position: relative;

    svg { display: block; }
  }

  &__tooltip {
    position: absolute;
    top: 32px;
    transform: translateX(-50%);
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 0.35rem 0.6rem;
    pointer-events: none;
    z-index: 10;
    white-space: nowrap;

    &--flip {
      transform: translateX(-110%);
    }

    &-freq {
      font-size: 0.68rem;
      font-family: var(--font-mono);
      color: var(--color-text);
      margin-bottom: 0.2rem;
      letter-spacing: 0.03em;
    }

    &-row {
      font-size: 0.68rem;
      font-family: var(--font-mono);
      display: flex;
      align-items: baseline;
      gap: 0.45rem;

      &--h { color: var(--color-primary); }
      &--t { color: var(--color-danger); }
    }

    &-dr {
      font-size: 0.58rem;
      opacity: 0.65;
      font-family: var(--font-mono);
    }

    &-sel {
      font-size: 0.62rem;
      font-family: var(--font-mono);
      color: #fbbf24;
      opacity: 0.85;
      margin-top: 0.18rem;
    }

    &-window {
      font-size: 0.62rem;
      font-family: var(--font-mono);
      color: #4ade80;
      font-weight: 600;
      letter-spacing: 0.05em;
      margin-top: 0.2rem;
      padding-top: 0.2rem;
      border-top: 1px solid rgba(74, 222, 128, 0.25);
    }
  }
}

.tip-enter-active, .tip-leave-active { transition: opacity 0.1s; }
.tip-enter-from, .tip-leave-to { opacity: 0; }
</style>
