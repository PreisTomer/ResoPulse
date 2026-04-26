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
    <ChartTooltip :data="_tooltipData" />
  </div>
</template>

<script lang="ts">
import { defineComponent, markRaw } from 'vue'
import { mapStores } from 'pinia'

import * as d3 from 'd3'

import { useCellStore } from '@/stores/cellStore'

import { broadcastStateSync } from '@/services/socket'

import { computeFc, computeTau, tempCorrectedVth } from '@/utils/physics'

import { C } from '@/theme/colors'

import { CELL_PRESETS, GROUP_COLORS } from '@/constants/cellLibrary'
import { CELL_CATEGORY } from '@/constants/strings'
import { MEDIA } from '@/constants/media'
import { UNIT } from '@/constants/units'

// Module-level cache for the 19 library preset Vm curves.
// Only busts when sigma_e, cosTheta, or fieldIntensity change — not on cursor drags.
interface LibraryCurveCache { key: string; curves: Map<string, { hz: number; vm: number }[]> }
let _libCurveCache: LibraryCurveCache | null = null

import ChartLegend from './ChartLegend.vue'
import ChartTooltip from './ChartTooltip.vue'
import {
  F_MIN_HZ, F_MAX_HZ, F_CURSOR_MAX_KHZ, MARGIN,
  formatHz,
  computeVmCurve, computeNuclearVmCurve, computeDepCurve, computeSelCurve,
  computeUncBand,
} from './chartCompute'
import type { TooltipData } from './chartCompute'
import { drawThresholds } from './chartDrawThresholds'
import { drawFcMarkers } from './chartDrawFcMarkers'
import { drawSelCurve } from './chartDrawSelCurve'
import { drawDepOverlay } from './chartDrawDep'
import { drawDepCrossovers } from './chartDrawDepCrossovers'
import { drawOptimalMarker } from './chartDrawOptimal'
import { drawResonanceChart } from './chartDrawResonance'
import { buildHoverTooltip } from './chartHover'

export default defineComponent({
  components: { ChartLegend, ChartTooltip },

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
      _tooltipData: null as TooltipData | null,
      _isDragging: false,
      _pendingDragKhz: null as number | null,
      _dragRafPending: false,
    }
  },

  computed: {
    ...mapStores(useCellStore),
    UNIT() { return UNIT },

    physicsKey(): string {
      const s = this.cellStore
      const t = s.target as { resonantFreqGHz?: number }
      return [
        s.healthy.id, s.healthy.radius, s.healthy.membraneThickness,
        s.healthy.dielectricConstant, s.healthy.conductivity, s.healthy.thresholdVoltage,
        s.healthy.nuclearRadius ?? 0,
        s.target.id, s.target.radius, s.target.membraneThickness,
        s.target.dielectricConstant, s.target.conductivity, s.target.thresholdVoltage,
        s.target.nuclearRadius ?? 0, t.resonantFreqGHz ?? 0,
        s.fieldIntensity, s.medium, s.waveform, s.dutyCycle, s.pulseWidthNs,
        s.chartMode, s.doubleShellEnabled, s.orientationDeg,
        s.healthyTemp, s.targetTemp, s.effectivePulseCount, s.resetCounter,
      ].join('|')
    },
  },

  watch: {
    physicsKey()                                                    { this.updateChart() },
    'cellStore.currentBroadcastFrequency'() { if (!this._isDragging) this.updateCursor() },
  },

  mounted() {
    this._resizeObserver = markRaw(new ResizeObserver(() => {
      this.initChart()
      this.updateChart()
    }))
    const el = this.$refs.chartEl as HTMLElement
    if (el) this._resizeObserver.observe(el)
  },

  beforeUnmount() {
    this._resizeObserver?.disconnect()
  },

  methods: {
    // ── Chart init (called on mount + resize) ───────────────────────────
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

      this._svg = markRaw(svgEl)

      const g = svgEl.append('g')
        .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)
        .attr('class', 'chart-g')

      this._xScale      = markRaw(d3.scaleLog().domain([F_MIN_HZ, F_MAX_HZ]).range([0, this._chartW]))
      this._yScale      = markRaw(d3.scaleLinear().domain([0, 100]).range([this._chartH, 0]))
      this._yRightScale = markRaw(d3.scaleLinear().domain([0, 2]).range([this._chartH, 0]))
      this._yDepScale   = markRaw(d3.scaleLinear().domain([-0.5, 0.5]).range([this._chartH, 0]))

      this.appendChartStructure(g)
      this.attachDragBehavior(g)
    },

    // ── Append static SVG structure (groups, axes, labels, cursor) ──────
    appendChartStructure(g: d3.Selection<SVGGElement, unknown, null, undefined>) {
      g.append('g').attr('class', 'grid-h')
      g.append('g').attr('class', 'x-axis').attr('transform', `translate(0,${this._chartH})`)
      g.append('g').attr('class', 'y-axis')
      g.append('g').attr('class', 'y-right-axis').attr('transform', `translate(${this._chartW},0)`)
      g.append('g').attr('class', 'y-dep-axis').attr('transform', `translate(${this._chartW + 90},0)`)

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

      g.append('text')
        .attr('class', 'axis-label-dep')
        .attr('text-anchor', 'middle')
        .attr('transform', 'rotate(-90)')
        .attr('x', -this._chartH / 2)
        .attr('y', this._chartW + 122)
        .attr('fill', C.w28)
        .attr('font-size', '0.52rem')
        .attr('font-family', 'var(--font-mono)')
        .attr('letter-spacing', '0.1em')
        .text('Re[K], DEP')

      g.append('g').attr('class', 'curves-library')
      g.append('g').attr('class', 'curves-active')
      g.append('g').attr('class', 'thresholds')
      g.append('g').attr('class', 'curves-nuclear')
      g.append('g').attr('class', 'sel-curve')
      g.append('g').attr('class', 'dep-curves')
      g.append('g').attr('class', 'dep-crossover')
      g.append('g').attr('class', 'fc-markers')
      g.append('g').attr('class', 'opt-marker')

      g.append('line')
        .attr('class', 'cursor-line')
        .attr('y1', 0).attr('y2', this._chartH)
        .attr('stroke', C.w85)
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4,3')

      g.append('rect')
        .attr('class', 'cursor-bg')
        .attr('y', -2).attr('height', 14).attr('rx', 2)
        .attr('fill', C.w12)

      g.append('text')
        .attr('class', 'cursor-label')
        .attr('y', 8)
        .attr('text-anchor', 'middle')
        .attr('fill', C.w75)
        .attr('font-size', '0.7rem')
        .attr('font-family', 'var(--font-mono)')

      g.append('text')
        .attr('class', 'cursor-drag-hint')
        .attr('y', -6)
        .attr('text-anchor', 'middle')
        .attr('fill', C.w55)
        .attr('font-size', '0.58rem')
        .attr('font-family', 'var(--font-mono)')
        .attr('letter-spacing', '0.08em')
        .attr('pointer-events', 'none')
        .text(this.$t('chart.dragHint'))
    },

    // ── Attach drag + hover overlay ──────────────────────────────────────
    attachDragBehavior(g: d3.Selection<SVGGElement, unknown, null, undefined>) {
      const dragBehavior = d3.drag<SVGRectElement, unknown>()
        .on('start', () => { this._isDragging = true })
        .on('drag', (event) => {
          if (!this._xScale) return
          const khz = this.clampEventToKhz(event.x)
          this.updateCursor(khz)
          this.scheduleDragUpdate(khz)
        })
        .on('end', () => {
          this._isDragging = false
          this.flushDragUpdate()
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

    // ── Full chart update (Schwan mode) ──────────────────────────────────
    updateChart() {
      if (!this._svg || !this._xScale || !this._yScale) return

      const g = this._svg.select<SVGGElement>('.chart-g')
      const cat = this.cellStore.targetCellCategory
      const t = this.cellStore.target

      // Branch: resonance mode
      if (
        this.cellStore.isResonanceMode &&
        (cat === CELL_CATEGORY.VIRUS || cat === CELL_CATEGORY.BACTERIA) &&
        t.resonantFreqGHz && t.resonantThresholdVcm
      ) {
        g.select('.axis-label-y').text(this.$t('chart.axisDisruptionRatio'))
        drawResonanceChart({
          g, xScale: this._xScale!, yScale: this._yScale!,
          chartW: this._chartW, chartH: this._chartH,
          target: t, fieldIntensity: this.cellStore.fieldIntensity,
          drOneLabel: this.$t('chart.drOne'),
          t18n: (key) => this.$t(key),
        })
        this.updateCursor()
        return
      }

      // Schwan mode: reset x domain and axis label
      this._xScale!.domain([F_MIN_HZ, F_MAX_HZ])
      g.select('.axis-label-y').text(`${this.$t('chart.axisVm')} (${UNIT.MV})`)

      const sigma_e  = this.cellStore.effectiveSigmaE
      const cosTheta = this.cellStore.cosThetaFactor

      this.updateSchanAxes(g)
      this.updateVmCurves(g, sigma_e, cosTheta)
      this.updateNuclearCurves(g, sigma_e, cosTheta)
      this.updateThresholdLines(g)
      this.updateFcMarkers(g, sigma_e)

      const eps_r = MEDIA[this.cellStore.medium].permittivity
      const depHCurve = computeDepCurve(this.cellStore.effectiveHealthy, sigma_e, eps_r)
      const depTCurve = computeDepCurve(this.cellStore.effectiveTarget,  sigma_e, eps_r)

      drawDepOverlay(
        g.select<SVGGElement>('.dep-curves'),
        g.select<SVGGElement>('.y-dep-axis'),
        g.select<SVGTextElement>('.axis-label-dep'),
        this._xScale!, this._yDepScale!,
        this._chartH, depHCurve, depTCurve,
      )

      drawDepCrossovers(
        g.select<SVGGElement>('.dep-crossover'),
        this._xScale!, this._chartH,
        [
          { fKhz: this.cellStore.depHealthyCrossoverKHz,       color: C.primary, tag: this.$t('chart.depCrossH')  },
          { fKhz: this.cellStore.depHealthySecondCrossoverKHz, color: C.primary, tag: this.$t('chart.depCrossH2') },
          { fKhz: this.cellStore.depTargetCrossoverKHz,        color: C.danger,  tag: this.$t('chart.depCrossT')  },
          { fKhz: this.cellStore.depTargetSecondCrossoverKHz,  color: C.danger,  tag: this.$t('chart.depCrossT2') },
        ],
      )

      drawSelCurve(
        g.select<SVGGElement>('.sel-curve'),
        g.select<SVGGElement>('.y-right-axis'),
        this._xScale!, this._yRightScale!,
        this._chartW, this._chartH,
        computeSelCurve(this.cellStore.effectiveHealthy, this.cellStore.effectiveTarget, this.cellStore.fieldIntensity, sigma_e),
      )

      drawOptimalMarker(
        g.select<SVGGElement>('.opt-marker'),
        this._xScale!, this._chartW, this._chartH,
        this.cellStore.effectiveHealthy, this.cellStore.effectiveTarget,
        this.cellStore.fieldIntensity, sigma_e,
        (optHz, sel) => optHz >= 1e6
          ? `${(optHz / 1e6).toFixed(2)}M Vm×${sel.toFixed(1)}`
          : `${(optHz / 1e3).toFixed(0)}k Vm×${sel.toFixed(1)}`,
      )

      this.updateCursor()
    },

    // ── Schwan: axes + grid ───────────────────────────────────────────────
    updateSchanAxes(g: d3.Selection<SVGGElement, unknown, null, undefined>) {
      const xAxis = d3.axisBottom<number>(this._xScale!)
        .tickValues([1e4, 1e5, 1e6, 1e7, 1e8, 5e8])
        .tickFormat((d) => formatHz(+d))
        .tickSize(4)

      const yAxis = d3.axisLeft<number>(this._yScale!).ticks(5).tickSize(4)

      g.select<SVGGElement>('.x-axis')
        .call(xAxis)
        .call((a) => a.select('.domain').attr('stroke', C.w15))
        .call((a) => a.selectAll('text').attr('fill', 'var(--color-text)').attr('font-size', '0.64rem').attr('font-family', 'var(--font-mono)'))
        .call((a) => a.selectAll('line').attr('stroke', C.w20))

      g.select<SVGGElement>('.y-axis')
        .call(yAxis)
        .call((a) => a.select('.domain').attr('stroke', C.w15))
        .call((a) => a.selectAll('text').attr('fill', 'var(--color-text)').attr('font-size', '0.64rem').attr('font-family', 'var(--font-mono)'))
        .call((a) => a.selectAll('line').attr('stroke', C.w20))

      g.select<SVGGElement>('.grid-h')
        .call(d3.axisLeft<number>(this._yScale!).ticks(5).tickSize(-this._chartW).tickFormat(() => ''))
        .call((a) => a.select('.domain').remove())
        .call((a) => a.selectAll('line').attr('stroke', C.w06))
    },

    // ── Schwan: Vm curves (active cells + library + uncertainty bands) ────
    updateVmCurves(
      g: d3.Selection<SVGGElement, unknown, null, undefined>,
      sigma_e: number,
      cosTheta: number,
    ) {
      const healthyCurve = computeVmCurve(this.cellStore.effectiveHealthy, this.cellStore.fieldIntensity, sigma_e, cosTheta)
      const targetCurve  = computeVmCurve(this.cellStore.effectiveTarget,  this.cellStore.fieldIntensity, sigma_e, cosTheta)

      const allVm = [...healthyCurve.map((d) => d.vm), ...targetCurve.map((d) => d.vm)]
      const maxVm = Math.ceil(Math.max(...allVm, 50) / 50) * 50
      this._yScale!.domain([0, maxVm])

      const lineGen = d3.line<{ hz: number; vm: number }>()
        .x((d) => this._xScale!(d.hz))
        .y((d) => this._yScale!(d.vm))
        .curve(d3.curveBasis)

      // Library preset curves (faint background) — cached on sigma_e / cosTheta / fieldIntensity
      const libKey = `${sigma_e}|${cosTheta}|${this.cellStore.fieldIntensity}`
      if (!_libCurveCache || _libCurveCache.key !== libKey) {
        const curves = new Map<string, { hz: number; vm: number }[]>()
        for (const preset of CELL_PRESETS) {
          curves.set(preset.presetId, computeVmCurve(preset, this.cellStore.fieldIntensity, sigma_e, cosTheta))
        }
        _libCurveCache = { key: libKey, curves }
      }
      g.select<SVGGElement>('.curves-library')
        .selectAll<SVGPathElement, typeof CELL_PRESETS[0]>('path.lib-curve')
        .data(CELL_PRESETS, (d) => d.presetId)
        .join('path')
        .attr('class', 'lib-curve')
        .attr('fill', 'none')
        .attr('stroke', (d) => GROUP_COLORS[d.group])
        .attr('stroke-width', 1)
        .attr('stroke-opacity', 0.18)
        .attr('d', (d) => lineGen(_libCurveCache!.curves.get(d.presetId) ?? []) || '')

      const areaGen = d3.area<{ hz: number; vmLow: number; vmHigh: number }>()
        .x((d) => this._xScale!(d.hz))
        .y0((d) => this._yScale!(Math.max(0, d.vmLow)))
        .y1((d) => this._yScale!(Math.min(maxVm, d.vmHigh)))
        .curve(d3.curveBasis)

      // Vm bands: post-fit covariance when a calibration exists (Jacobian-propagated); literature radius-based prior otherwise. computeUncBand decides per-cell.
      const hCov = this.cellStore.healthyCalibrationCovariance
      const tCov = this.cellStore.targetCalibrationCovariance

      const activeGroup = g.select<SVGGElement>('.curves-active')
      activeGroup.selectAll('path').remove()

      activeGroup.append('path')
        .datum(computeUncBand(this.cellStore.effectiveHealthy, this.cellStore.fieldIntensity, sigma_e, cosTheta, hCov))
        .attr('fill', C.primary).attr('fill-opacity', 0.10).attr('stroke', 'none')
        .attr('d', areaGen)

      activeGroup.append('path')
        .datum(computeUncBand(this.cellStore.effectiveTarget, this.cellStore.fieldIntensity, sigma_e, cosTheta, tCov))
        .attr('fill', C.danger).attr('fill-opacity', 0.10).attr('stroke', 'none')
        .attr('d', areaGen)

      // Active cell curves
      activeGroup.append('path')
        .datum(healthyCurve)
        .attr('fill', 'none').attr('stroke', C.primary)
        .attr('stroke-width', 2.5).attr('stroke-opacity', 1)
        .attr('filter', `drop-shadow(0 0 4px ${C.primary}88)`)
        .attr('d', lineGen)

      activeGroup.append('path')
        .datum(targetCurve)
        .attr('fill', 'none').attr('stroke', C.danger)
        .attr('stroke-width', 2.5).attr('stroke-opacity', 1)
        .attr('filter', `drop-shadow(0 0 4px ${C.danger}88)`)
        .attr('d', lineGen)
    },

    // ── Schwan: nuclear envelope Vm curves ───────────────────────────────
    updateNuclearCurves(
      g: d3.Selection<SVGGElement, unknown, null, undefined>,
      sigma_e: number,
      cosTheta: number,
    ) {
      const lineGen = d3.line<{ hz: number; vm: number }>()
        .x((d) => this._xScale!(d.hz))
        .y((d) => this._yScale!(d.vm))
        .curve(d3.curveBasis)

      const nucGroup = g.select<SVGGElement>('.curves-nuclear')
      nucGroup.selectAll('path').remove()

      if (!this.cellStore.doubleShellEnabled) return

      if (this.cellStore.healthy.nuclearRadius) {
        nucGroup.append('path')
          .datum(computeNuclearVmCurve(this.cellStore.effectiveHealthy, this.cellStore.fieldIntensity, sigma_e, cosTheta))
          .attr('fill', 'none').attr('stroke', C.primary)
          .attr('stroke-width', 1.5).attr('stroke-opacity', 0.45)
          .attr('stroke-dasharray', '5,4').attr('d', lineGen)
      }
      if (this.cellStore.target.nuclearRadius) {
        nucGroup.append('path')
          .datum(computeNuclearVmCurve(this.cellStore.effectiveTarget, this.cellStore.fieldIntensity, sigma_e, cosTheta))
          .attr('fill', 'none').attr('stroke', C.danger)
          .attr('stroke-width', 1.5).attr('stroke-opacity', 0.45)
          .attr('stroke-dasharray', '5,4').attr('d', lineGen)
      }
    },

    // ── Schwan: threshold + rev-EP lines ─────────────────────────────────
    updateThresholdLines(g: d3.Selection<SVGGElement, unknown, null, undefined>) {
      const allVm = [
        ...(this._yScale!.domain()),
      ]
      const maxVm = allVm[1] ?? 100
      const thrHfireMult = this.cellStore.hFireMultiplier

      drawThresholds(
        g.select<SVGGElement>('.thresholds'),
        this._yScale!, this._chartW, maxVm,
        [
          { label: this.$t('chart.thrH'), vm: tempCorrectedVth(this.cellStore.healthy.thresholdVoltage, this.cellStore.healthyTemp, this.cellStore.effectivePulseCount) * thrHfireMult * 1000, color: C.primary },
          { label: this.$t('chart.thrT'), vm: tempCorrectedVth(this.cellStore.target.thresholdVoltage,  this.cellStore.targetTemp,  this.cellStore.effectivePulseCount) * thrHfireMult * 1000, color: C.danger  },
        ],
        this.$t('chart.revEp'),
      )
    },

    // ── Schwan: fc markers ────────────────────────────────────────────────
    updateFcMarkers(g: d3.Selection<SVGGElement, unknown, null, undefined>, sigma_e: number) {
      const tauHNs = computeTau(this.cellStore.effectiveHealthy, sigma_e) * 1e9
      const tauTNs = computeTau(this.cellStore.effectiveTarget,  sigma_e) * 1e9

      drawFcMarkers(
        g.select<SVGGElement>('.fc-markers'),
        this._xScale!, this._chartH,
        [
          { fc: computeFc(this.cellStore.effectiveHealthy, sigma_e), color: C.primary, label: this.$t('chart.fcH'), tauNs: tauHNs },
          { fc: computeFc(this.cellStore.effectiveTarget,  sigma_e), color: C.danger,  label: this.$t('chart.fcT'), tauNs: tauTNs },
        ],
      )
    },

    // ── Drag helpers ─────────────────────────────────────────────────────

    clampEventToKhz(eventX: number): number {
      const xClamped = Math.max(0, Math.min(this._chartW, eventX))
      const hz = this._xScale!.invert(xClamped)
      return Math.max(10, Math.min(F_CURSOR_MAX_KHZ, hz / 1000))
    },

    scheduleDragUpdate(khz: number): void {
      this._pendingDragKhz = khz
      if (this._dragRafPending) return
      this._dragRafPending = true
      requestAnimationFrame(() => {
        this._dragRafPending = false
        this.flushDragUpdate()
      })
    },

    flushDragUpdate(): void {
      if (this._pendingDragKhz === null) return
      this.cellStore.setBroadcastFreqKHz(this._pendingDragKhz)
      broadcastStateSync()
      this._pendingDragKhz = null
    },

    // ── Cursor-only update (cheap — no curve recompute) ──────────────────
    updateCursor(overrideKhz?: number) {
      if (!this._svg || !this._xScale) return
      const g = this._svg.select<SVGGElement>('.chart-g')
      const freqKHz = overrideKhz ?? this.cellStore.currentBroadcastFrequency
      const hz = freqKHz * 1000
      const [domMin, domMax] = this._xScale.domain() as [number, number]
      const x = this._xScale(Math.max(domMin, Math.min(domMax, hz)))

      this._cursorX = x
      g.select('.cursor-line').attr('x1', x).attr('x2', x)
      g.select('.cursor-drag-hint').attr('x', x)

      const label = freqKHz >= 1e6 ? `${(freqKHz / 1e6).toFixed(2)} ${UNIT.GHZ}`
                  : freqKHz >= 1000 ? `${(freqKHz / 1000).toFixed(2)} ${UNIT.MHZ}`
                  : `${freqKHz.toFixed(1)} ${UNIT.KHZ}`
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

      const nearCursor = Math.abs(mx - this._cursorX) < 20
      const overlay = this._svg?.select<SVGRectElement>('.hover-overlay')
      overlay?.style('cursor', nearCursor ? 'ew-resize' : 'crosshair')
      if (nearCursor) { this._tooltipData = null; return }

      const hz = this._xScale.invert(mx)
      this._tooltipData = buildHoverTooltip({
        mx, chartW: this._chartW, hz,
        healthy: this.cellStore.effectiveHealthy,
        target: this.cellStore.effectiveTarget,
        fieldIntensity: this.cellStore.fieldIntensity,
        effectiveSigmaE: this.cellStore.effectiveSigmaE,
        cosThetaFactor: this.cellStore.cosThetaFactor,
        medium: this.cellStore.medium,
        waveform: this.cellStore.waveform,
        healthyTemp: this.cellStore.healthyTemp,
        targetTemp: this.cellStore.targetTemp,
        pulseEnvelopeFactorHealthy: this.cellStore.pulseEnvelopeFactorHealthy,
        pulseEnvelopeFactorTarget: this.cellStore.pulseEnvelopeFactorTarget,
        targetCellCategory: this.cellStore.targetCellCategory,
        isResonanceMode: this.cellStore.isResonanceMode,
        lysisNPulses: this.cellStore.effectivePulseCount,
      })
    },
  },
})
</script>

<style lang="scss" scoped>

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
    @include mono-upper(var(--fs-md), 0.12em);
    color: var(--color-text);
    white-space: nowrap;
  }

  &__svg-wrap {
    width: 100%;
    height: 260px;
    position: relative;

    svg { display: block; }
  }
}
</style>
