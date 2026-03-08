<template>
  <div class="sel-panel__bars">
    <div class="sel-panel__bar-row" v-tip="tipTargetBar">
      <span class="sel-panel__bar-label">T</span>
      <div class="sel-panel__bar-track">
        <div
          class="sel-panel__bar-fill sel-panel__bar-fill--t"
          :style="{ width: targetRatioPct + '%' }"
          :class="{ 'sel-panel__bar-fill--warn': targetRatio >= THRESHOLDS.DISRUPTION_WARN }"
        ></div>
      </div>
      <span class="sel-panel__bar-val">{{ targetRatioPct.toFixed(0) }}%</span>
      <span
        class="sel-panel__bar-plysis"
        :class="{ 'sel-panel__bar-plysis--high': targetLysisProbability >= 50 }"
        v-tip="tipTargetPlysis"
      >P{{ targetLysisProbability }}%</span>
    </div>
    <div class="sel-panel__bar-row" v-tip="tipHealthyBar">
      <span class="sel-panel__bar-label">H</span>
      <div class="sel-panel__bar-track">
        <div
          class="sel-panel__bar-fill sel-panel__bar-fill--h"
          :style="{ width: healthyRatioPct + '%' }"
          :class="{ 'sel-panel__bar-fill--warn': healthyRatio >= THRESHOLDS.DISRUPTION_WARN }"
        ></div>
      </div>
      <span class="sel-panel__bar-val">{{ healthyRatioPct.toFixed(0) }}%</span>
      <span
        class="sel-panel__bar-plysis"
        :class="{ 'sel-panel__bar-plysis--high': healthyLysisProbability >= 50 }"
        v-tip="tipHealthyPlysis"
      >P{{ healthyLysisProbability }}%</span>
    </div>
  </div>

  <!-- Nuclear envelope disruption bars (double-shell model) -->
  <template v-if="store.doubleShellEnabled && store.targetCellCategory === CELL_CATEGORY.MAMMALIAN">
    <div class="sel-panel__nuc-section" v-tip="tipNuclearSection">
      <div class="sel-panel__nuc-bar-row">
        <span class="sel-panel__nuc-bar-label">&#x26AC; NE-T</span>
        <div class="sel-panel__nuc-bar-track">
          <div class="sel-panel__nuc-bar-fill sel-panel__nuc-bar-fill--t"
            :style="{ width: Math.min(100, store.targetNuclearDisruptionRatio * 100) + '%' }"
            :class="{ 'sel-panel__nuc-bar-fill--warn': store.targetNuclearDisruptionRatio >= THRESHOLDS.DISRUPTION_WARN }"
          ></div>
        </div>
        <span class="sel-panel__nuc-bar-val">{{ (store.targetNuclearDisruptionRatio * 100).toFixed(0) }}%</span>
      </div>
      <div class="sel-panel__nuc-bar-row">
        <span class="sel-panel__nuc-bar-label">&#x26AC; NE-H</span>
        <div class="sel-panel__nuc-bar-track">
          <div class="sel-panel__nuc-bar-fill sel-panel__nuc-bar-fill--h"
            :style="{ width: Math.min(100, store.healthyNuclearDisruptionRatio * 100) + '%' }"
            :class="{ 'sel-panel__nuc-bar-fill--warn': store.healthyNuclearDisruptionRatio >= THRESHOLDS.DISRUPTION_WARN }"
          ></div>
        </div>
        <span class="sel-panel__nuc-bar-val">{{ (store.healthyNuclearDisruptionRatio * 100).toFixed(0) }}%</span>
      </div>
      <div class="sel-panel__nuc-sel-row">
        <span class="sel-panel__nuc-sel-label">NE Selectivity</span>
        <span class="sel-panel__nuc-sel-val" :class="store.nuclearSelectivityRatio >= THRESHOLDS.SEL_STRONG ? 'sel-panel__nuc-sel--good' : store.nuclearSelectivityRatio >= THRESHOLDS.SEL_MARGINAL ? 'sel-panel__nuc-sel--ok' : 'sel-panel__nuc-sel--low'">
          ×{{ store.nuclearSelectivityRatio >= 99 ? ICON.INFINITY : store.nuclearSelectivityRatio.toFixed(2) }}
        </span>
      </div>
    </div>
  </template>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useCellStore } from '@/stores/cellStore'
import { THRESHOLDS, DISRUPTION_WARN_THRESHOLD } from '@/constants/cellCard'
import { CELL_CATEGORY } from '@/constants/strings'
import { ICON } from '@/constants/icons'
import { formatLysisTime } from '@/utils/sliderTooltips'

export default defineComponent({
  setup() {
    return { store: useCellStore(), CELL_CATEGORY, ICON, THRESHOLDS }
  },

  computed: {
    targetRatio(): number  { return this.store.targetDisruptionRatio },
    healthyRatio(): number { return this.store.healthyDisruptionRatio },
    targetRatioPct(): number  { return Math.min(100, this.targetRatio  * 100) },
    healthyRatioPct(): number { return Math.min(100, this.healthyRatio * 100) },

    targetLysisProbability(): number {
      return Math.round(100 / (1 + Math.exp(-(this.targetRatio - THRESHOLDS.LYSIS_PROB_CENTER) / THRESHOLDS.LYSIS_PROB_SLOPE)))
    },
    healthyLysisProbability(): number {
      return Math.round(100 / (1 + Math.exp(-(this.healthyRatio - THRESHOLDS.LYSIS_PROB_CENTER) / THRESHOLDS.LYSIS_PROB_SLOPE)))
    },

    lysisTimeDisplay(): string {
      return formatLysisTime(this.store.lysisDelayMs)
    },

    tipTargetPlysis(): string {
      return `<strong>P(electroporation)</strong>\nSigmoid probability centered at 100% disruption threshold.\nP = 1 / (1 + e^−((ratio−1.0)/0.05))\n≥50% → lysis likely if held for ${this.lysisTimeDisplay}`
    },

    isResonanceTarget(): boolean {
      const cat = this.store.targetCellCategory
      const t = this.store.target as { resonantFreqGHz?: number; resonantThresholdVcm?: number }
      return (cat === CELL_CATEGORY.VIRUS || cat === CELL_CATEGORY.BACTERIA) && !!t.resonantFreqGHz && !!t.resonantThresholdVcm
    },

    tipHealthyPlysis(): string {
      return `<strong>P(electroporation) — Healthy</strong>\nSigmoid probability centered at 100% disruption threshold.\nKeep this value near 0% for selective therapy`
    },

    tipNuclearSection(): string {
      return `<strong>Nuclear Envelope Disruption (Double-Shell Model)</strong>\nVm_nuc / V_threshold_nuc for each cell.\nBandpass peak at f_peak = 1/(2π√(τ_pm·τ_ne)) — typically 0.87–2.1 MHz.\nCancer nuclei have thinner/leakier NE and lower thresholds → higher disruption ratio.\nKotnik &amp; Miklavcic, Biophys. J. 90:480 (2006)`
    },

    tipTargetBar(): string {
      const pct  = this.targetRatioPct.toFixed(0)
      const warn = this.targetRatio >= DISRUPTION_WARN_THRESHOLD
        ? `\n<span class="tip-warn">${ICON.LIGHTNING} >85% — disruption countdown active (${this.lysisTimeDisplay})</span>` : ''
      if (this.isResonanceTarget) {
        const t = this.store.target as { resonantFreqGHz?: number; resonantThresholdVcm?: number }
        return `<strong>Target resonant disruption: <span class="tip-val">${pct}%</span></strong>
Disruption ratio = (E / E_threshold) × L(f, f_res, Q)
E_threshold = ${t.resonantThresholdVcm} V/cm  ·  f_res = ${t.resonantFreqGHz} GHz${warn}
≥100% → capsid/cell-wall disruption threshold exceeded`
      }
      const tVm  = (this.store.targetVm * 1000).toFixed(2)
      const tThr = (this.store.target.thresholdVoltage * 1000).toFixed(0)
      return `<strong>Target membrane disruption: <span class="tip-val">${pct}%</span></strong>
Induced Vm = <span class="tip-val">${tVm} mV</span>
Lysis threshold = ${tThr} mV
Ratio = Vm / threshold${warn}
>85% held for ${this.lysisTimeDisplay} → irreversible lysis`
    },

    tipHealthyBar(): string {
      const pct = this.healthyRatioPct.toFixed(0)
      if (this.isResonanceTarget) {
        return `<strong>Healthy cell: <span class="tip-val">${pct}% disruption (≈0)</span></strong>
Mammalian cells lack rigid-shell resonance — Schwan Vm → 0 at GHz (ωτ ≫ 1).
No membrane coupling at pathogen-targeting frequencies.
<span class="tip-ok">${ICON.CHECK} Frequency-selective — healthy tissue unperturbed</span>
Ref: Tsen et al. (2007)`
      }
      const hVm  = (this.store.healthyVm * 1000).toFixed(2)
      const hThr = (this.store.healthy.thresholdVoltage * 1000).toFixed(0)
      const status = this.healthyRatio < THRESHOLDS.HEALTHY_APPROACHING
        ? `\n<span class="tip-ok">${ICON.CHECK} Healthy cells are safe</span>`
        : `\n<span class="tip-warn">${ICON.WARNING} Approaching threshold — reduce field</span>`
      return `<strong>Healthy membrane disruption: <span class="tip-val">${pct}%</span></strong>
Induced Vm = <span class="tip-val">${hVm} mV</span>
Lysis threshold = ${hThr} mV
Keep below 50% for therapeutic window${status}`
    },
  },
})
</script>
