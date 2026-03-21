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

      <!-- Controls -->
      <div class="pop-panel__controls">
        <div class="pop-panel__ctrl-group">
          <span class="pop-panel__ctrl-label" v-tip="$t('population.tipPopSize')">{{ $t('population.ctrlSizeLabel') }}</span>
          <div class="pop-panel__pills">
            <button v-for="n in [100, 300, 1000]" :key="n"
              class="pop-panel__pill"
              :class="{ 'pop-panel__pill--active': nCells === n }"
              v-tip="tipNPill(n)"
              @click="nCells = n; resample()"
            >N={{ n }}</button>
          </div>
        </div>

        <div class="pop-panel__ctrl-group">
          <span class="pop-panel__ctrl-label" v-tip="$t('population.tipRVariance')">{{ $t('population.ctrlVarianceLabel') }}</span>
          <input class="pop-panel__input" type="number" v-model.number="rVariancePct"
            min="1" max="30" step="1" v-tip="$t('population.tipRVariance')"
          />
          <span class="pop-panel__ctrl-unit">{{ $t('population.varianceUnit') }}</span>
        </div>

        <div class="pop-panel__ctrl-group">
          <span class="pop-panel__ctrl-label" v-tip="$t('population.tipVThVariance')">{{ $t('population.ctrlVThVarianceLabel') }}</span>
          <input class="pop-panel__input" type="number" v-model.number="vThVariancePct"
            min="0" max="35" step="1" v-tip="$t('population.tipVThVariance')"
          />
          <span class="pop-panel__ctrl-unit">{{ $t('population.varianceUnit') }}</span>
        </div>

        <button class="pop-panel__resample-btn"
          v-tip="$t('population.tipResample')"
          @click="resample"
        >{{ $t('population.resampleBtn') }}</button>

        <!-- Histogram Y-axis mode toggle -->
        <div class="pop-panel__norm-toggle" v-tip="$t('population.tipNormalize')">
          <button
            class="pop-panel__norm-btn"
            :class="{ 'pop-panel__norm-btn--active': !normalizeChart }"
            @click="normalizeChart = false; _drawChart()"
          >{{ $t('population.normCount') }}</button>
          <button
            class="pop-panel__norm-btn"
            :class="{ 'pop-panel__norm-btn--active': normalizeChart }"
            @click="normalizeChart = true; _drawChart()"
          >{{ $t('population.normFraction') }}</button>
        </div>

        <button class="pop-panel__export-btn"
          v-tip="$t('population.tipExport')"
          @click="exportCSV"
        >{{ $t('population.exportBtn') }}</button>
      </div>

      <!-- Stats cards -->
      <div class="pop-panel__stats">
        <div class="pop-panel__stat pop-panel__stat--target" v-tip="tipTargetCard">
          <div class="pop-panel__stat-label">{{ store.target.label }}</div>
          <div class="pop-panel__stat-row">
            <span class="pop-panel__stat-badge pop-panel__stat-badge--lysed" v-tip="tipLysedTarget">
              {{ $t('population.badgeLysed', { pct: targetStats.pctLysed }) }}<span class="pop-panel__badge-se"> ±{{ targetStats.seLysed }}%</span>
            </span>
            <span class="pop-panel__stat-badge pop-panel__stat-badge--revep" v-tip="tipRevEpTarget">
              {{ $t('population.badgeRevEp', { pct: targetStats.pctRevEp }) }}<span class="pop-panel__badge-se"> ±{{ targetStats.seRevEp }}%</span>
            </span>
            <span class="pop-panel__stat-badge pop-panel__stat-badge--nour" v-tip="tipNourTarget">
              {{ $t('population.badgeNour', { pct: targetStats.pctNour }) }}<span class="pop-panel__badge-se"> ±{{ targetStats.seNour }}%</span>
            </span>
          </div>
          <div class="pop-panel__stat-sub" v-tip="tipMeanDr(targetStats, targetUncPct)">
            {{ $t('population.statMeanDr') }} {{ targetStats.meanDr.toFixed(2) }} ± {{ targetStats.stdDr.toFixed(2) }} &nbsp;·&nbsp;
            σ<sub>i</sub> ±{{ targetUncPct }}%
          </div>
        </div>
        <div class="pop-panel__stat pop-panel__stat--healthy" v-tip="tipHealthyCard">
          <div class="pop-panel__stat-label">{{ store.healthy.label }}</div>
          <div class="pop-panel__stat-row">
            <span class="pop-panel__stat-badge pop-panel__stat-badge--lysed" v-tip="tipLysedHealthy">
              {{ $t('population.badgeLysed', { pct: healthyStats.pctLysed }) }}<span class="pop-panel__badge-se"> ±{{ healthyStats.seLysed }}%</span>
            </span>
            <span class="pop-panel__stat-badge pop-panel__stat-badge--revep" v-tip="tipRevEpHealthy">
              {{ $t('population.badgeRevEp', { pct: healthyStats.pctRevEp }) }}<span class="pop-panel__badge-se"> ±{{ healthyStats.seRevEp }}%</span>
            </span>
            <span class="pop-panel__stat-badge pop-panel__stat-badge--nour" v-tip="tipNourHealthy">
              {{ $t('population.badgeNour', { pct: healthyStats.pctNour }) }}<span class="pop-panel__badge-se"> ±{{ healthyStats.seNour }}%</span>
            </span>
          </div>
          <div class="pop-panel__stat-sub" v-tip="tipMeanDr(healthyStats, healthyUncPct)">
            {{ $t('population.statMeanDr') }} {{ healthyStats.meanDr.toFixed(2) }} ± {{ healthyStats.stdDr.toFixed(2) }} &nbsp;·&nbsp;
            σ<sub>i</sub> ±{{ healthyUncPct }}%
          </div>
        </div>
      </div>

      <!-- Population Treatment Window Score -->
      <div class="pop-panel__window" :class="windowScoreClass" v-tip="tipWindowScore">
        <span class="pop-panel__window-label">{{ $t('population.windowScoreLabel') }}</span>
        <span class="pop-panel__window-score">{{ windowScore.toFixed(2) }}</span>
        <span class="pop-panel__window-verdict">{{ windowVerdict }}</span>
      </div>

      <!-- D3 histogram -->
      <div ref="chartWrap" class="pop-panel__chart-wrap" v-tip="$t('population.tipChart')">
        <svg ref="svgEl" class="pop-panel__svg"></svg>
      </div>

      <!-- Collateral damage / success note -->
      <div class="pop-panel__note" v-if="healthyStats.pctLysed > 0">
        <span class="pop-panel__note-warn">{{ $t('population.warnIcon') }}</span>
        {{ $t('population.warnCollateral', { pct: healthyStats.pctLysed }) }}
      </div>
      <div class="pop-panel__note pop-panel__note--ok" v-else-if="targetStats.pctLysed > 50">
        <span class="pop-panel__note-ok">{{ $t('population.okIcon') }}</span>
        {{ $t('population.okWindow', { pct: targetStats.pctLysed }) }}
      </div>

    </div>
    </AccordionPanel>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import * as d3 from 'd3'
import { useCellStore } from '@/stores/cellStore'
import AccordionPanel from '@/components/AccordionPanel.vue'
import { computeSchwan, computeTau, computePulseStepResponse, computeResonantDisruption } from '@/utils/physics'
import { WAVEFORM, CHART_MODE, CELL_CATEGORY } from '@/constants/strings'
import { THRESHOLDS, DEFAULT_CAPSID_Q } from '@/constants/physics'
import { ICON } from '@/constants/icons'
import { UNIT } from '@/constants/units'
import type { CellConfig } from '@/types/cell'

type ResizeObserverInstance = InstanceType<typeof ResizeObserver>

/** Box-Muller Gaussian sample, clamped to [min, max] by rejection. */
function sampleGaussian(mean: number, stddev: number, min: number, max: number): number {
  let z: number
  do {
    const u1 = Math.max(1e-10, Math.random())
    const u2 = Math.random()
    z = mean + stddev * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  } while (z < min || z > max)
  return z
}

/**
 * Binomial standard error as a percentage: SE(p) = √(p(1−p)/n) × 100.
 * @param count - Number of successes
 * @param n     - Total sample size
 * @returns SE in percentage points, rounded to one decimal
 */
function binomialSE(count: number, n: number): number {
  const p = count / n
  return +(Math.sqrt(p * (1 - p) / n) * 100).toFixed(1)
}

interface PopStats {
  pctLysed:  number
  pctRevEp:  number
  pctNour:   number
  pctStable: number
  meanDr:    number
  stdDr:     number
  /** Binomial SE on pctLysed (percentage points) */
  seLysed: number
  /** Binomial SE on pctRevEp (percentage points) */
  seRevEp: number
  /** Binomial SE on pctNour (percentage points) */
  seNour:  number
}

const MARGIN = { top: 14, right: 16, bottom: 40, left: 50 }
const N_BINS = 20

export default defineComponent({
  components: { AccordionPanel },
  emits: ['openChange'],
  setup() {
    return { store: useCellStore(), THRESHOLDS, ICON, UNIT }
  },

  data() {
    return {
      open: false,
      nCells: 300,
      rVariancePct:   10,
      /** V_th CV as % — cell-to-cell lysis threshold variation (Weaver & Chizmadzhev 1996) */
      vThVariancePct: 20,
      /** When true histogram Y-axis shows fraction [0,1]; when false shows raw count */
      normalizeChart: false,
      targetDRs:    [] as number[],
      healthyDRs:   [] as number[],
      _resizeObs:     null as ResizeObserverInstance | null,
      _resampleTimer: null as ReturnType<typeof setTimeout> | null,
      /** Slow live-update interval: resamples every 2 s when open to show Monte Carlo spread */
      _liveTimer:     null as ReturnType<typeof setInterval> | null,
    }
  },

  computed: {
    isResonanceTarget(): boolean {
      const cat = this.store.targetCellCategory
      const t = this.store.target as CellConfig & { resonantFreqGHz?: number; resonantThresholdVcm?: number }
      return (cat === CELL_CATEGORY.BACTERIA || cat === CELL_CATEGORY.VIRUS) &&
        !!(t.resonantFreqGHz && t.resonantThresholdVcm) &&
        this.store.chartMode === CHART_MODE.RESONANCE
    },

    targetUncPct(): number {
      const cat = this.store.targetCellCategory
      if (cat === CELL_CATEGORY.VIRUS)    return 45
      if (cat === CELL_CATEGORY.BACTERIA) return 35
      return 20
    },

    healthyUncPct(): number { return 20 },

    targetStats(): PopStats  { return this._calcStats(this.targetDRs) },
    healthyStats(): PopStats { return this._calcStats(this.healthyDRs) },

    /**
     * Population Treatment Window Score.
     * WS = (% target lysed / 100) × (1 − % healthy lysed / 100)
     * WS = 1.0: all target destroyed, zero healthy collateral (ideal).
     * WS = 0.0: no target lysis, or complete healthy destruction (unusable).
     */
    windowScore(): number {
      return (this.targetStats.pctLysed / 100) * (1 - this.healthyStats.pctLysed / 100)
    },

    windowScoreClass(): string {
      const s = this.windowScore
      if (s >= 0.5) return 'pop-panel__window--good'
      if (s >= 0.2) return 'pop-panel__window--marginal'
      return 'pop-panel__window--poor'
    },

    windowVerdict(): string {
      const s = this.windowScore
      if (s >= 0.5) return this.$t('population.windowGood')
      if (s >= 0.2) return this.$t('population.windowMarginal')
      return this.$t('population.windowPoor')
    },

    subtitle(): string {
      const { nCells, store } = this
      return `N=${nCells} · ${store.fieldIntensity} ${UNIT.V_PER_CM} · ${store.currentBroadcastFrequency} ${UNIT.KHZ}`
    },

    // ── Tooltips ──────────────────────────────────────────────────────────────

    tipTargetCard(): string {
      return this.$t('population.tipTargetCard', {
        label: this.store.target.label,
        uncPct: this.targetUncPct,
      })
    },

    tipHealthyCard(): string {
      return this.$t('population.tipHealthyCard', {
        label: this.store.healthy.label,
        uncPct: this.healthyUncPct,
      })
    },

    tipLysedTarget(): string  { return this.$t('population.tipLysedTarget',  { pct: this.targetStats.pctLysed,  se: this.targetStats.seLysed  }) },
    tipRevEpTarget(): string  { return this.$t('population.tipRevEpTarget',  { pct: this.targetStats.pctRevEp,  se: this.targetStats.seRevEp  }) },
    tipNourTarget(): string   { return this.$t('population.tipNourTarget',   { pct: this.targetStats.pctNour,   se: this.targetStats.seNour   }) },
    tipLysedHealthy(): string { return this.$t('population.tipLysedHealthy', { pct: this.healthyStats.pctLysed, se: this.healthyStats.seLysed }) },
    tipRevEpHealthy(): string { return this.$t('population.tipRevEpHealthy', { pct: this.healthyStats.pctRevEp, se: this.healthyStats.seRevEp }) },
    tipNourHealthy(): string  { return this.$t('population.tipNourHealthy',  { pct: this.healthyStats.pctNour,  se: this.healthyStats.seNour  }) },

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
      this.$emit('openChange', v)
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
    'store.fieldIntensity'()            { this._scheduleResample() },
    'store.currentBroadcastFrequency'() { this._scheduleResample() },
    'store.waveform'()                  { this._scheduleResample() },
    'store.pulseWidthNs'()              { this._scheduleResample() },
    'store.dutyCycle'()                 { this._scheduleResample() },
    'store.healthy.id'()                { this._scheduleResample() },
    'store.target.id'()                 { this._scheduleResample() },
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

    tipNPill(n: number): string {
      if (n === 100) return this.$t('population.tipNPill100')
      if (n === 300) return this.$t('population.tipNPill300')
      return this.$t('population.tipNPill1000')
    },

    tipMeanDr(stats: PopStats, uncPct: number): string {
      return this.$t('population.tipMeanDr', {
        mean: stats.meanDr.toFixed(3),
        std:  stats.stdDr.toFixed(3),
        uncPct,
      })
    },

    _startLiveTimer() {
      this._stopLiveTimer()
      this._liveTimer = setInterval(() => { this.resample() }, 2000)
    },

    _stopLiveTimer() {
      if (this._liveTimer) { clearInterval(this._liveTimer); this._liveTimer = null }
    },

    /** Debounced entry-point for resample — collapses multiple synchronous watcher
     *  firings (e.g. snap-to-window touching field + freq in one tick) into a single
     *  resample 150 ms later, preventing the chart from jumping repeatedly.
     *  Non-cancelling: once a timer is in flight, additional calls are ignored so that
     *  the temperature interval (which continuously updates effectiveSigmaE) cannot
     *  keep resetting the timer and prevent resample from ever running. */
    _scheduleResample() {
      if (this._resampleTimer) return
      this._resampleTimer = setTimeout(() => {
        this._resampleTimer = null
        this.resample()
      }, 150)
    },

    resample() {
      const { store } = this
      const sigma_e  = store.effectiveSigmaE
      const cosTheta = store.cosThetaFactor
      const waveform = store.waveform
      const pwNs     = store.pulseWidthNs
      const freqKHz  = store.currentBroadcastFrequency
      const E        = store.fieldIntensity

      const healthy = store.healthy
      const target  = store.target
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

      const sampleDR = (base: CellConfig, sigmaUnc: number, isTarget: boolean): number => {
        // ── Sample biophysical parameters independently (Box-Muller) ────────
        const R    = sampleGaussian(base.radius,       base.radius       * rVar,      base.radius       * 0.4, base.radius       * 2.0)
        const sigI = sampleGaussian(base.conductivity, base.conductivity * sigmaUnc,  base.conductivity * 0.2, base.conductivity * 3.0)
        // V_th CV ~20-35% in isogenic mammalian populations (Weaver & Chizmadzhev 1996)
        const vTh  = vThUncFrac > 0
          ? sampleGaussian(base.thresholdVoltage, base.thresholdVoltage * vThUncFrac, base.thresholdVoltage * 0.5, base.thresholdVoltage * 2.0)
          : base.thresholdVoltage
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
          const threshVcm = vThUncFrac > 0
            ? sampleGaussian(t.resonantThresholdVcm!, t.resonantThresholdVcm! * vThUncFrac, t.resonantThresholdVcm! * 0.5, t.resonantThresholdVcm! * 2.0)
            : t.resonantThresholdVcm!
          return computeResonantDisruption(fResScaled, Q, threshVcm, freqKHz * 1e3, E)
        }

        // ── Schwan mode (all mammalian; bacteria / virus in IRE / CW mode) ──
        const tau = computeTau(cell, sigma_e)
        const pef = waveform === WAVEFORM.PULSED
          ? computePulseStepResponse(tau, pwNs)
          : 1.0
        const vm  = computeSchwan(cell, freqKHz, E, sigma_e, cosTheta)
        return (vm * pef) / vTh
      }

      this.targetDRs  = Array.from({ length: this.nCells }, () => sampleDR(target,  uncT, true))
      this.healthyDRs = Array.from({ length: this.nCells }, () => sampleDR(healthy, uncH, false))
    },

    _calcStats(drs: number[]): PopStats {
      if (drs.length === 0) {
        return { pctLysed: 0, pctRevEp: 0, pctNour: 0, pctStable: 0, meanDr: 0, stdDr: 0, seLysed: 0, seRevEp: 0, seNour: 0 }
      }
      const n       = drs.length
      const nLysed  = drs.filter(d => d >= 1.0).length
      const nRevEp  = drs.filter(d => d >= THRESHOLDS.HEALTHY_APPROACHING && d < 1.0).length
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
      const H  = 196
      const iW = W - MARGIN.left - MARGIN.right
      const iH = H - MARGIN.top - MARGIN.bottom

      const svg = d3.select(svgEl).attr('width', W).attr('height', H)
      svg.selectAll('*').remove()
      const g = svg.append('g').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)

      const allDRs  = [...this.targetDRs, ...this.healthyDRs]
      const xMax    = Math.max(1.6, d3.max(allDRs) ?? 1.6)
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

      const CSS_PRIMARY = getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#00d4ff'
      const CSS_DANGER  = getComputedStyle(document.documentElement).getPropertyValue('--color-danger').trim()  || '#ef4444'
      const CSS_BORDER  = getComputedStyle(document.documentElement).getPropertyValue('--color-border').trim()  || 'rgba(255,255,255,0.1)'

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
        { x: THRESHOLDS.HEALTHY_APPROACHING, label: this.$t('chart.revEp'),    color: 'rgba(251,191,36,0.7)', dash: '3,2' },
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
        .call(ax => ax.selectAll('text').attr('fill', 'rgba(255,255,255,0.5)').attr('font-size', 9))
        .call(ax => ax.selectAll('.tick line').attr('stroke', CSS_BORDER))

      const yAxis = normalize
        ? d3.axisLeft(yScale).ticks(5).tickSize(3).tickFormat(d => `${(+d * 100).toFixed(0)}%`)
        : d3.axisLeft(yScale).ticks(4).tickSize(3)
      g.append('g')
        .call(yAxis)
        .call(ax => ax.select('.domain').attr('stroke', CSS_BORDER))
        .call(ax => ax.selectAll('text').attr('fill', 'rgba(255,255,255,0.5)').attr('font-size', 9))
        .call(ax => ax.selectAll('.tick line').attr('stroke', CSS_BORDER))

      // ── Axis labels ──────────────────────────────────────────────────────────
      g.append('text')
        .attr('x', iW / 2).attr('y', iH + 32)
        .attr('text-anchor', 'middle')
        .attr('font-size', 10).attr('fill', 'rgba(255,255,255,0.4)')
        .text(this.$t('population.chartAxisDr'))

      g.append('text')
        .attr('transform', 'rotate(-90)')
        .attr('x', -iH / 2).attr('y', -36)
        .attr('text-anchor', 'middle')
        .attr('font-size', 10).attr('fill', 'rgba(255,255,255,0.4)')
        .text(normalize ? this.$t('population.chartAxisFraction') : this.$t('population.chartAxisCount'))

      // ── Legend ───────────────────────────────────────────────────────────────
      const legend = [
        { color: CSS_DANGER,  label: `${this.$t('population.chartLegendTarget')} (${this.store.target.label})` },
        { color: CSS_PRIMARY, label: `${this.$t('population.chartLegendHealthy')} (${this.store.healthy.label})` },
      ]
      legend.forEach(({ color, label }, i) => {
        const lx = i * 160
        const lg = g.append('g').attr('transform', `translate(${lx},${iH + 32})`)
        lg.append('rect').attr('width', 12).attr('height', 8).attr('y', -8).attr('fill', color).attr('opacity', 0.6)
        lg.append('text')
          .attr('x', 16).attr('y', -1)
          .attr('font-size', 9).attr('fill', 'rgba(255,255,255,0.5)')
          .text(label)
      })
    },

    exportCSV() {
      const { store } = this
      const meta = [
        `# ResoPulse: Population Monte Carlo Export`,
        `# Exported: ${new Date().toISOString()}`,
        `# Healthy: ${store.healthy.label} · R=${store.healthy.radius} ${UNIT.UM} · N=${this.nCells} · σ_i ±${this.healthyUncPct}% · R ±${this.rVariancePct}% · V_th ±${this.vThVariancePct}%`,
        `# Target:  ${store.target.label} · R=${store.target.radius} ${UNIT.UM} · N=${this.nCells} · σ_i ±${this.targetUncPct}% · R ±${this.rVariancePct}% · V_th ±${this.vThVariancePct}%`,
        `# Medium: ${store.medium} · σ_e=${store.effectiveSigmaE.toFixed(3)} ${UNIT.S_PER_M}`,
        `# Field: ${store.currentBroadcastFrequency} ${UNIT.KHZ} · ${store.fieldIntensity} ${UNIT.V_PER_CM} · ${store.waveform} · dc=${store.dutyCycle.toExponential(2)} · pw=${store.pulseWidthNs} ${UNIT.NS}`,
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
@use '../../styles/mixins' as *;

.pop-panel {
  @include surface-card(var(--radius-lg));
  overflow: hidden;

  &__body {
    @include flex-col(0.75rem);
    padding: 0.85rem 1rem;
    border-top: 1px solid var(--color-border);
  }

  // ── Controls ─────────────────────────────────────────────────────────────────

  &__controls {
    @include flex-row(0.7rem);
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem 0.9rem;
  }

  &__ctrl-group {
    @include flex-row(0.45rem);
    align-items: center;
  }

  &__ctrl-label {
    font-size: 0.72rem;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    white-space: nowrap;
    cursor: help;
  }

  &__ctrl-unit {
    font-size: 0.72rem;
    color: var(--color-text-muted);
    font-family: var(--font-mono);
  }

  &__pills { @include flex-row(0.3rem); }

  &__pill {
    font-size: 0.72rem;
    font-family: var(--font-mono);
    padding: 0.22rem 0.55rem;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: all 0.15s;

    &--active { border-color: var(--color-primary); color: var(--color-primary); background: var(--color-primary-dim); }
    &:hover:not(&--active) { border-color: rgba(255,255,255,0.2); }
  }

  &__input {
    width: 52px;
    padding: 0.22rem 0.4rem;
    font-size: 0.76rem;
    font-family: var(--font-mono);
    background: var(--color-surface-2, #0a1628);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    color: var(--color-text);
    text-align: right;
    outline: none;

    &:focus { border-color: var(--color-primary); }
  }

  &__resample-btn,
  &__export-btn {
    font-size: 0.72rem;
    font-family: var(--font-mono);
    padding: 0.28rem 0.65rem;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: all 0.15s;

    &:hover { border-color: var(--color-primary); color: var(--color-primary); }
  }

  &__export-btn { margin-left: auto; }

  &__norm-toggle {
    @include flex-row(0);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    overflow: hidden;
    cursor: help;
  }

  &__norm-btn {
    font-size: 0.68rem;
    font-family: var(--font-mono);
    padding: 0.22rem 0.5rem;
    border: none;
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: all 0.15s;

    &--active {
      background: var(--color-primary-dim);
      color: var(--color-primary);
    }

    &:hover:not(&--active) { background: rgba(255,255,255,0.04); }
  }

  // ── Stats cards ───────────────────────────────────────────────────────────────

  &__stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.6rem;
  }

  &__stat {
    @include flex-col(0.35rem);
    padding: 0.65rem 0.8rem;
    border-radius: var(--radius);
    border: 1px solid var(--color-border);
    cursor: help;

    &--target  { border-color: rgba(239,68,68,0.25);  background: rgba(239,68,68,0.04); }
    &--healthy { border-color: rgba(0,212,255,0.2);   background: rgba(0,212,255,0.03); }
  }

  &__stat-label {
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--color-text-heading);
    font-family: var(--font-mono);
    letter-spacing: 0.03em;
  }

  &__stat-row {
    @include flex-row(0.35rem);
    flex-wrap: wrap;
  }

  &__stat-badge {
    font-size: 0.68rem;
    font-family: var(--font-mono);
    padding: 0.15rem 0.4rem;
    border-radius: 3px;
    cursor: help;

    &--lysed { background: rgba(239,68,68,0.15);  color: var(--color-danger); }
    &--revep { background: rgba(251,191,36,0.12); color: var(--color-amber);  }
    &--nour  { background: rgba(0,212,255,0.1);   color: var(--color-primary); }
  }

  &__badge-se {
    font-size: 0.75em;
    opacity: 0.6;
  }

  &__stat-sub {
    font-size: 0.68rem;
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    cursor: help;
  }

  // ── Population Window Score ───────────────────────────────────────────────────

  &__window {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    padding: 0.45rem 0.8rem;
    border-radius: var(--radius);
    border: 1px solid var(--color-border);
    cursor: help;

    &--good     { border-color: rgba(34,197,94,0.35);  background: rgba(34,197,94,0.05); }
    &--marginal { border-color: rgba(251,191,36,0.35); background: rgba(251,191,36,0.05); }
    &--poor     { border-color: rgba(239,68,68,0.25);  background: rgba(239,68,68,0.04); }
  }

  &__window-label {
    font-size: 0.65rem;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.07em;
    white-space: nowrap;
  }

  &__window-score {
    font-size: 1.05rem;
    font-family: var(--font-mono);
    font-weight: 700;
    color: var(--color-text-heading);
    letter-spacing: 0.02em;
  }

  &__window-verdict {
    font-size: 0.72rem;
    font-family: var(--font-mono);
    font-weight: 600;

    .pop-panel__window--good &     { color: rgb(34,197,94); }
    .pop-panel__window--marginal & { color: var(--color-amber); }
    .pop-panel__window--poor &     { color: var(--color-danger); }
  }

  // ── Chart ─────────────────────────────────────────────────────────────────────

  &__chart-wrap {
    width: 100%;
    min-height: 196px;
    cursor: help;
  }

  &__svg { display: block; width: 100%; }

  // ── Notes ─────────────────────────────────────────────────────────────────────

  &__note {
    @include flex-row(0.5rem);
    align-items: flex-start;
    padding: 0.55rem 0.75rem;
    border-radius: var(--radius);
    font-size: 0.78rem;
    color: var(--color-text-muted);
    border: 1px solid rgba(251,191,36,0.3);
    background: rgba(251,191,36,0.05);

    &--ok {
      border-color: rgba(34,197,94,0.3);
      background: rgba(34,197,94,0.05);
    }
  }

  &__note-warn { color: var(--color-amber); flex-shrink: 0; }
  &__note-ok   { color: rgb(34,197,94); flex-shrink: 0; }
}
</style>
