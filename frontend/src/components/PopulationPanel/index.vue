<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="pop-panel">

    <AccordionPanel
      :icon="ICON.GRID"
      :title="$t('population.title')"
      :subtitle="subtitle"
      @open-change="onAccordionChange"
    >
    <div class="pop-panel__body">

      <PopControls
        :nCells="nCells"
        :rVariancePct="rVariancePct"
        :vThVariancePct="vThVariancePct"
        :normalizeChart="normalizeChart"
        @update:nCells="nCells = $event"
        @update:rVariancePct="rVariancePct = $event"
        @update:vThVariancePct="vThVariancePct = $event"
        @update:normalizeChart="normalizeChart = $event"
        @resample="resample"
        @export-csv="exportCSV"
        @redraw="_drawChart"
      />

      <PopStatCards
        :targetStats="targetStats"
        :healthyStats="healthyStats"
        :targetUncPct="targetUncPct"
        :healthyUncPct="healthyUncPct"
        :targetLabel="cellStore.target.label"
        :healthyLabel="cellStore.healthy.label"
      />

      <PopWindowScore
        :score="windowScore"
        :scoreClass="windowScoreClass"
        :verdict="windowVerdict"
        :tipText="tipWindowScore"
      />

      <!-- D3 histogram -->
      <div ref="chartWrap" class="pop-panel__chart-wrap" v-tip="$t('population.tipChart')">
        <svg ref="svgEl" class="pop-panel__svg"></svg>
      </div>

      <PopNote
        :healthyPctLysed="healthyStats.pctLysed"
        :targetPctLysed="targetStats.pctLysed"
      />

    </div>
    </AccordionPanel>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import * as d3 from 'd3'
import { C } from '@/theme/colors'
import { mapStores } from 'pinia'
import { useCellStore } from '@/stores/cellStore'
import AccordionPanel from '@/components/AccordionPanel.vue'
import { computeSchwan, computeTau, computePulseStepResponse, computeResonantDisruption, tempCorrectedVth } from '@/utils/physics'
import { WAVEFORM, CELL_CATEGORY } from '@/constants/strings'
import { THRESHOLDS, DEFAULT_CAPSID_Q, H_FIRE_THRESHOLD_MULTIPLIER } from '@/constants/physics'
import { ICON } from '@/constants/icons'
import { UNIT } from '@/constants/units'
import { EMIT } from '@/constants/emitEvents'
import type { CellConfig } from '@/types/cell'
import {
  sampleGaussian, binomialSE, MARGIN, N_BINS,
  CHART_HEIGHT, POP_DEFAULT_N_CELLS, POP_DEFAULT_R_VARIANCE_PCT, POP_DEFAULT_VTH_VARIANCE_PCT,
  POP_CHART_DR_X_MIN, POP_LEGEND_ITEM_WIDTH, POP_LIVE_RESAMPLE_INTERVAL_MS, POP_RESAMPLE_DEBOUNCE_MS,
} from './popPanelCompute'
import type { PopStats } from './popPanelCompute'
import PopControls from './PopControls.vue'
import PopStatCards from './PopStatCards.vue'
import PopWindowScore from './PopWindowScore.vue'
import PopNote from './PopNote.vue'

type ResizeObserverInstance = InstanceType<typeof ResizeObserver>

export default defineComponent({
  components: { AccordionPanel, PopControls, PopStatCards, PopWindowScore, PopNote },
  emits: [EMIT.OPEN_CHANGE],
  data() {
    return {
      open: false,
      nCells: POP_DEFAULT_N_CELLS,
      rVariancePct:   POP_DEFAULT_R_VARIANCE_PCT,
      vThVariancePct: POP_DEFAULT_VTH_VARIANCE_PCT,
      normalizeChart: false,
      targetDRs:    [] as number[],
      healthyDRs:   [] as number[],
      _resizeObs:     null as ResizeObserverInstance | null,
      _resampleTimer: null as ReturnType<typeof setTimeout> | null,
      _liveTimer:     null as ReturnType<typeof setInterval> | null,  // resamples every 2s when open
    }
  },

  computed: {
    ...mapStores(useCellStore),
    THRESHOLDS() { return THRESHOLDS },
    ICON()       { return ICON },
    UNIT()       { return UNIT },

    isResonanceTarget(): boolean {
      const cat = this.cellStore.targetCellCategory
      const t = this.cellStore.target as CellConfig & { resonantFreqGHz?: number; resonantThresholdVcm?: number }
      return (cat === CELL_CATEGORY.BACTERIA || cat === CELL_CATEGORY.VIRUS) &&
        !!(t.resonantFreqGHz && t.resonantThresholdVcm) &&
        this.cellStore.isResonanceMode
    },

    targetUncPct(): number {
      const cat = this.cellStore.targetCellCategory
      if (cat === CELL_CATEGORY.VIRUS)    return THRESHOLDS.UNCERTAINTY_VIRUS     * 100
      if (cat === CELL_CATEGORY.BACTERIA) return THRESHOLDS.UNCERTAINTY_BACTERIA  * 100
      return THRESHOLDS.UNCERTAINTY_MAMMALIAN * 100
    },

    healthyUncPct(): number { return THRESHOLDS.UNCERTAINTY_MAMMALIAN * 100 },

    targetStats(): PopStats  { return this._calcStats(this.targetDRs) },
    healthyStats(): PopStats { return this._calcStats(this.healthyDRs) },

    // WS = (% target lysed / 100) × (1 − % healthy lysed / 100). 1.0=ideal, 0.0=unusable.
    windowScore(): number {
      return (this.targetStats.pctLysed / 100) * (1 - this.healthyStats.pctLysed / 100)
    },

    windowScoreClass(): string {
      const s = this.windowScore
      if (s >= THRESHOLDS.WINDOW_SCORE_GOOD)     return 'pop-window-score--good'
      if (s >= THRESHOLDS.WINDOW_SCORE_MARGINAL) return 'pop-window-score--marginal'
      return 'pop-window-score--poor'
    },

    windowVerdict(): string {
      const s = this.windowScore
      if (s >= THRESHOLDS.WINDOW_SCORE_GOOD)     return this.$t('population.windowGood')
      if (s >= THRESHOLDS.WINDOW_SCORE_MARGINAL) return this.$t('population.windowMarginal')
      return this.$t('population.windowPoor')
    },

    subtitle(): string {
      const { nCells } = this
      return `N=${nCells} · ${this.cellStore.fieldIntensity} ${UNIT.V_PER_CM} · ${this.cellStore.currentBroadcastFrequency} ${UNIT.KHZ}`
    },

    tipWindowScore(): string {
      return this.$t('population.tipWindowScore', {
        score:   this.windowScore.toFixed(2),
        verdict: this.windowVerdict,
        pctT:    this.targetStats.pctLysed,
        pctH:    this.healthyStats.pctLysed,
      })
    },
  },

  watch: {
    open(v: boolean) {
      this.$emit(EMIT.OPEN_CHANGE, v)
      if (v) {
        if (this.targetDRs.length === 0) this.resample()
        this.$nextTick(() => { this._initChart(); this._drawChart() })
        this._startLiveTimer()
      } else {
        this._stopLiveTimer()
      }
    },
    targetDRs() { if (this.open) this._drawChart() },
    // All parameter changes are funnelled through _scheduleResample (150 ms debounce).
    // This prevents a burst of redraws when a single user action (e.g. snap-to-window)
    // triggers multiple store mutations in one tick.
    // Note: no open guard here — _drawChart() is gated on open via the targetDRs watcher.
    'cellStore.fieldIntensity'()            { this._scheduleResample() },
    'cellStore.currentBroadcastFrequency'() { this._scheduleResample() },
    'cellStore.waveform'()                  { this._scheduleResample() },
    'cellStore.pulseWidthNs'()              { this._scheduleResample() },
    'cellStore.dutyCycle'()                 { this._scheduleResample() },
    'cellStore.healthy.id'()                { this._scheduleResample() },
    'cellStore.target.id'()                 { this._scheduleResample() },
    rVariancePct()                      { this._scheduleResample() },
    vThVariancePct()                    { this._scheduleResample() },
  },

  beforeUnmount() {
    (this._resizeObs as ResizeObserverInstance | null)?.disconnect()
    if (this._resampleTimer) clearTimeout(this._resampleTimer)
    this._stopLiveTimer()
  },

  methods: {
    onAccordionChange(v: boolean) {
      this.open = v
    },

    _startLiveTimer() {
      this._stopLiveTimer()
      this._liveTimer = setInterval(() => { this.resample() }, POP_LIVE_RESAMPLE_INTERVAL_MS)
    },

    _stopLiveTimer() {
      if (this._liveTimer) { clearInterval(this._liveTimer); this._liveTimer = null }
    },

    // Debounced resample: collapses simultaneous watcher firings into one call 150 ms later.
    // Non-cancelling so the temperature interval cannot prevent resample from ever running.
    _scheduleResample() {
      if (this._resampleTimer) return
      this._resampleTimer = setTimeout(() => {
        this._resampleTimer = null
        this.resample()
      }, POP_RESAMPLE_DEBOUNCE_MS)
    },

    resample() {
      const { cellStore } = this
      const sigma_e  = cellStore.effectiveSigmaE
      const cosTheta = cellStore.cosThetaFactor
      const waveform = cellStore.waveform
      const pwNs     = cellStore.pulseWidthNs
      const freqKHz  = cellStore.currentBroadcastFrequency
      const E        = cellStore.fieldIntensity

      const healthy = cellStore.healthy
      const target  = cellStore.target
      const t = target as CellConfig & {
        resonantFreqGHz?: number
        capsidQ?: number
        capsidQMin?: number
        capsidQMax?: number
        resonantThresholdVcm?: number
      }

      const uncH       = this.healthyUncPct    / 100
      const uncT       = this.targetUncPct     / 100
      const rVar       = this.rVariancePct     / 100
      const vThUncFrac = this.vThVariancePct   / 100
      const isPulsed   = waveform === WAVEFORM.PULSED || waveform === WAVEFORM.H_FIRE
      const hfireMult  = waveform === WAVEFORM.H_FIRE ? H_FIRE_THRESHOLD_MULTIPLIER : 1.0

      const sampleDR = (base: CellConfig, sigmaUnc: number, isTarget: boolean): number => {
        // ── Sample biophysical parameters independently (Box-Muller) ────────
        const R    = sampleGaussian(base.radius,       base.radius       * rVar,      base.radius       * 0.4, base.radius       * 2.0)
        const sigI = sampleGaussian(base.conductivity, base.conductivity * sigmaUnc,  base.conductivity * 0.2, base.conductivity * 3.0)
        // V_th CV ~20-35% in isogenic mammalian populations (Weaver & Chizmadzhev 1996)
        // Sample the nominal threshold first, then apply temperature correction — variability is in the nominal value.
        const vThNominal = vThUncFrac > 0
          ? sampleGaussian(base.thresholdVoltage, base.thresholdVoltage * vThUncFrac, base.thresholdVoltage * 0.5, base.thresholdVoltage * 2.0)
          : base.thresholdVoltage
        const cellTemp = isTarget ? cellStore.targetTemp : cellStore.healthyTemp
        const cell = { ...base, radius: R, conductivity: sigI }

        // ── Resonance mode (bacteria / virus) ────────────────────────────────
        if (isTarget && this.isResonanceTarget) {
          // Spherical breathing mode: f_res ∝ 1/R.
          // Note: rod geometry (E. coli) requires f ∝ 1/√(R·L) — spherical approximation here.
          const fResScaled = t.resonantFreqGHz! * (base.radius / R)
          const qNominal   = t.capsidQ    ?? DEFAULT_CAPSID_Q
          const qMin       = t.capsidQMin ?? qNominal
          const qMax       = t.capsidQMax ?? qNominal
          const Q = qMin === qMax ? qNominal : sampleGaussian((qMin + qMax) / 2, (qMax - qMin) / 4, qMin, qMax)
          const threshNominal = vThUncFrac > 0
            ? sampleGaussian(t.resonantThresholdVcm!, t.resonantThresholdVcm! * vThUncFrac, t.resonantThresholdVcm! * 0.5, t.resonantThresholdVcm! * 2.0)
            : t.resonantThresholdVcm!
          // Acoustic resonance threshold: temperature correction only — hfireMult does not apply
          const threshEff = tempCorrectedVth(threshNominal, cellTemp)
          return computeResonantDisruption(fResScaled, Q, threshEff, freqKHz * 1e3, E)
        }

        // ── Schwan mode (all mammalian; bacteria / virus in IRE / CW mode) ──
        const tau   = computeTau(cell, sigma_e)
        const pef   = isPulsed ? computePulseStepResponse(tau, pwNs) : 1.0
        const vm    = computeSchwan(cell, freqKHz, E, sigma_e, cosTheta)
        const vThEff = tempCorrectedVth(vThNominal, cellTemp) * hfireMult
        return (vm * pef) / vThEff
      }

      this.targetDRs  = Array.from({ length: this.nCells }, () => sampleDR(target,  uncT, true))
      this.healthyDRs = Array.from({ length: this.nCells }, () => sampleDR(healthy, uncH, false))
    },

    _calcStats(drs: number[]): PopStats {
      if (drs.length === 0) {
        return { pctLysed: 0, pctRevEp: 0, pctNour: 0, pctStable: 0, meanDr: 0, stdDr: 0, seLysed: 0, seRevEp: 0, seNour: 0 }
      }
      const n       = drs.length
      const nLysed  = drs.filter(d => d >= THRESHOLDS.DISRUPTION_WARN).length
      const nRevEp  = drs.filter(d => d >= THRESHOLDS.HEALTHY_APPROACHING && d < THRESHOLDS.DISRUPTION_WARN).length
      const nNour   = drs.filter(d => d >= THRESHOLDS.VIBRATING_MIN && d < THRESHOLDS.HEALTHY_APPROACHING).length
      const nStable = drs.filter(d => d < THRESHOLDS.VIBRATING_MIN).length
      const mean    = drs.reduce((s, d) => s + d, 0) / n
      const std     = Math.sqrt(drs.reduce((s, d) => s + (d - mean) ** 2, 0) / n)
      return {
        pctLysed:  +((nLysed  / n) * 100).toFixed(0),
        pctRevEp:  +((nRevEp  / n) * 100).toFixed(0),
        pctNour:   +((nNour   / n) * 100).toFixed(0),
        pctStable: +((nStable / n) * 100).toFixed(0),
        meanDr: mean,
        stdDr:  std,
        seLysed: binomialSE(nLysed, n),
        seRevEp: binomialSE(nRevEp, n),
        seNour:  binomialSE(nNour,  n),
      }
    },

    _initChart() {
      const wrap = this.$refs.chartWrap as HTMLElement
      if (!wrap || (this._resizeObs as ResizeObserverInstance | null)) return
      const obs = new ResizeObserver(() => { if (this.open) this._drawChart() })
      obs.observe(wrap)
      this._resizeObs = obs as unknown as ResizeObserverInstance
    },

    _drawChart() {
      const wrap  = this.$refs.chartWrap as HTMLElement
      const svgEl = this.$refs.svgEl    as SVGSVGElement
      if (!wrap || !svgEl || this.targetDRs.length === 0) return

      const W  = wrap.clientWidth
      const H  = CHART_HEIGHT
      const iW = W - MARGIN.left - MARGIN.right
      const iH = H - MARGIN.top - MARGIN.bottom

      const svg = d3.select(svgEl).attr('width', W).attr('height', H)
      svg.selectAll('*').remove()
      const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)

      const allDRs  = [...this.targetDRs, ...this.healthyDRs]
      const xMax    = Math.max(POP_CHART_DR_X_MIN, d3.max(allDRs) ?? POP_CHART_DR_X_MIN)
      const xScale  = d3.scaleLinear().domain([0, xMax]).range([0, iW])
      const histGen = d3.histogram<number, number>()
        .value(d => d)
        .domain([0, xMax])
        .thresholds(d3.range(0, xMax + xMax / N_BINS, xMax / N_BINS))

      const targetBins  = histGen(this.targetDRs)
      const healthyBins = histGen(this.healthyDRs)
      const nT          = this.targetDRs.length
      const nH          = this.healthyDRs.length
      const normalize   = this.normalizeChart

      const binValue = (b: d3.Bin<number, number>, total: number) =>
        normalize ? b.length / total : b.length

      const yMax = Math.max(
        d3.max(targetBins,  b => binValue(b, nT)) ?? 0,
        d3.max(healthyBins, b => binValue(b, nH)) ?? 0,
      )
      const yScale = d3.scaleLinear().domain([0, yMax * 1.1]).range([iH, 0])

      const CSS_PRIMARY = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim()
      const CSS_DANGER  = getComputedStyle(document.documentElement).getPropertyValue('--color-danger').trim()
      const CSS_BORDER  = getComputedStyle(document.documentElement).getPropertyValue('--color-border').trim()

      const drawBins = (bins: d3.Bin<number, number>[], color: string, opacity: number, total: number) => {
        g.selectAll(null)
          .data(bins)
          .join('rect')
          .attr('x',      b => xScale(b.x0 ?? 0) + 0.5)
          .attr('width',  b => Math.max(0, xScale(b.x1 ?? 0) - xScale(b.x0 ?? 0) - 1))
          .attr('y',      b => yScale(binValue(b, total)))
          .attr('height', b => iH - yScale(binValue(b, total)))
          .attr('fill', color)
          .attr('opacity', opacity)
      }

      drawBins(healthyBins, CSS_PRIMARY, 0.35, nH)
      drawBins(targetBins,  CSS_DANGER,  0.35, nT)

      // ── Threshold reference lines ────────────────────────────────────────────
      const lines = [
        { x: THRESHOLDS.HEALTHY_APPROACHING, label: this.$t('chart.revEp'),    color: C.amberChart,          dash: '3,2' },
        { x: THRESHOLDS.DISRUPTION_WARN,     label: this.$t('chart.thresh85'), color: CSS_DANGER,             dash: '3,2' },
        { x: 1.00,                           label: this.$t('chart.lysis'),    color: CSS_DANGER,             dash: '2,2' },
      ]
      for (const { x, label, color, dash } of lines) {
        if (x > xMax) continue
        const px = xScale(x)
        g.append('line')
          .attr('x1', px).attr('y1', 0).attr('x2', px).attr('y2', iH)
          .attr('stroke', color).attr('stroke-width', 1).attr('stroke-dasharray', dash)
        g.append('text')
          .attr('x', px + 2).attr('y', 10)
          .attr('font-size', 8).attr('fill', color)
          .text(label)
      }

      // ── Axes ─────────────────────────────────────────────────────────────────
      g.append('g')
        .attr('transform', `translate(0,${iH})`)
        .call(d3.axisBottom(xScale).ticks(8).tickSize(3).tickFormat(d => `${(+d * 100).toFixed(0)}%`))
        .call(ax => ax.select('.domain').attr('stroke', CSS_BORDER))
        .call(ax => ax.selectAll('text').attr('fill', C.w50).attr('font-size', 9))
        .call(ax => ax.selectAll('.tick line').attr('stroke', CSS_BORDER))

      const yAxis = normalize
        ? d3.axisLeft(yScale).ticks(5).tickSize(3).tickFormat(d => `${(+d * 100).toFixed(0)}%`)
        : d3.axisLeft(yScale).ticks(4).tickSize(3)
      g.append('g')
        .call(yAxis)
        .call(ax => ax.select('.domain').attr('stroke', CSS_BORDER))
        .call(ax => ax.selectAll('text').attr('fill', C.w50).attr('font-size', 9))
        .call(ax => ax.selectAll('.tick line').attr('stroke', CSS_BORDER))

      // ── Axis labels ──────────────────────────────────────────────────────────
      g.append('text')
        .attr('x', iW / 2).attr('y', iH + 32)
        .attr('text-anchor', 'middle')
        .attr('font-size', 10).attr('fill', C.w40)
        .text(this.$t('population.chartAxisDr'))

      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -iH / 2).attr('y', -36)
        .attr('text-anchor', 'middle')
        .attr('font-size', 10).attr('fill', C.w40)
        .text(normalize ? this.$t('population.chartAxisFraction') : this.$t('population.chartAxisCount'))

      // ── Legend ───────────────────────────────────────────────────────────────
      const legend = [
        { color: CSS_DANGER,  label: `${this.$t('population.chartLegendTarget')} (${this.cellStore.target.label})` },
        { color: CSS_PRIMARY, label: `${this.$t('population.chartLegendHealthy')} (${this.cellStore.healthy.label})` },
      ]
      legend.forEach(({ color, label }, i) => {
        const lx = i * POP_LEGEND_ITEM_WIDTH
        const lg = g.append('g').attr('transform', `translate(${lx},${iH + 32})`)
        lg.append('rect').attr('width', 12).attr('height', 8).attr('y', -8).attr('fill', color).attr('opacity', 0.6)
        lg.append('text')
          .attr('x', 16).attr('y', -1)
          .attr('font-size', 9).attr('fill', C.w50)
          .text(label)
      })
    },

    exportCSV() {
      const { cellStore } = this
      const meta = [
        `# ResoPulse: Population Monte Carlo Export`,
        `# Exported: ${new Date().toISOString()}`,
        `# Healthy: ${cellStore.healthy.label} · R=${cellStore.healthy.radius} ${UNIT.UM} · N=${this.nCells} · σ_i ±${this.healthyUncPct}% · R ±${this.rVariancePct}% · V_th ±${this.vThVariancePct}%`,
        `# Target:  ${cellStore.target.label} · R=${cellStore.target.radius} ${UNIT.UM} · N=${this.nCells} · σ_i ±${this.targetUncPct}% · R ±${this.rVariancePct}% · V_th ±${this.vThVariancePct}%`,
        `# Medium: ${cellStore.medium} · σ_e=${cellStore.effectiveSigmaE.toFixed(3)} ${UNIT.S_PER_M}`,
        `# Field: ${cellStore.currentBroadcastFrequency} ${UNIT.KHZ} · ${cellStore.fieldIntensity} ${UNIT.V_PER_CM} · ${cellStore.waveform} · dc=${cellStore.dutyCycle.toExponential(2)} · pw=${cellStore.pulseWidthNs} ${UNIT.NS}`,
        `# Window Score: ${this.windowScore.toFixed(3)} (${this.windowVerdict}) — WS = (pctLysedTarget/100) × (1 − pctLysedHealthy/100)`,
        `# Model: Schwan + Box-Muller Gaussian sampling (Kotnik & Miklavcic 2000; V_th: Weaver & Chizmadzhev 1996)`,
        `cell_type,sample_index,DR`,
      ].join('\n')
      const targetRows  = this.targetDRs.map((d, i)  => `target,${i},${d.toFixed(4)}`)
      const healthyRows = this.healthyDRs.map((d, i) => `healthy,${i},${d.toFixed(4)}`)
      const blob = new Blob([meta + '\n' + [...targetRows, ...healthyRows].join('\n')], { type: 'text/csv' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `population_model_${Date.now()}.csv`
      a.click()
      URL.revokeObjectURL(a.href)
    },
  },
})
</script>

<style lang="scss" scoped>


.pop-panel {
  @include surface-card(var(--radius-lg));
  overflow: hidden;

  &__body {
    @include flex-col(0.75rem);
    padding: 0.85rem 1rem;
    border-top: 1px solid var(--color-border);
  }

  // ── Chart ─────────────────────────────────────────────────────────────────────

  &__chart-wrap {
    width: 100%;
    min-height: 196px;
    cursor: help;
  }

  &__svg { display: block; width: 100%; }
}
</style>
