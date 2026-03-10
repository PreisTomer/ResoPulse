<template>
  <div class="sel-panel__bars">
    <div class="sel-panel__bar-row" v-tip="tipTargetBar">
      <span class="sel-panel__bar-label">{{ CELL_LABEL.TARGET }}</span>
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
      <span class="sel-panel__bar-label">{{ CELL_LABEL.HEALTHY }}</span>
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
        <span class="sel-panel__nuc-bar-label">{{ $t('labels.neTarget') }}</span>
        <div class="sel-panel__nuc-bar-track">
          <div class="sel-panel__nuc-bar-fill sel-panel__nuc-bar-fill--t"
            :style="{ width: Math.min(100, store.targetNuclearDisruptionRatio * 100) + '%' }"
            :class="{ 'sel-panel__nuc-bar-fill--warn': store.targetNuclearDisruptionRatio >= THRESHOLDS.DISRUPTION_WARN }"
          ></div>
        </div>
        <span class="sel-panel__nuc-bar-val">{{ (store.targetNuclearDisruptionRatio * 100).toFixed(0) }}%</span>
      </div>
      <div class="sel-panel__nuc-bar-row">
        <span class="sel-panel__nuc-bar-label">{{ $t('labels.neHealthy') }}</span>
        <div class="sel-panel__nuc-bar-track">
          <div class="sel-panel__nuc-bar-fill sel-panel__nuc-bar-fill--h"
            :style="{ width: Math.min(100, store.healthyNuclearDisruptionRatio * 100) + '%' }"
            :class="{ 'sel-panel__nuc-bar-fill--warn': store.healthyNuclearDisruptionRatio >= THRESHOLDS.DISRUPTION_WARN }"
          ></div>
        </div>
        <span class="sel-panel__nuc-bar-val">{{ (store.healthyNuclearDisruptionRatio * 100).toFixed(0) }}%</span>
      </div>
      <div class="sel-panel__nuc-sel-row">
        <span class="sel-panel__nuc-sel-label">{{ $t('selectivity.neSelectivity') }}</span>
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
import { THRESHOLDS } from '@/constants/cellCard'
import { CELL_CATEGORY, CELL_LABEL } from '@/constants/strings'
import { ICON } from '@/constants/icons'
import { formatLysisTime } from '@/utils/sliderTooltips'
import { computeLysisProbability } from '@/utils/physics'
import {
  tipTargetPlysis,
  tipHealthyPlysis,
  tipNuclearSection,
  tipTargetBar,
  tipHealthyBar,
} from '@/utils/disruptionBarTooltips'

export default defineComponent({
  setup() {
    return { store: useCellStore(), CELL_CATEGORY, CELL_LABEL, ICON, THRESHOLDS }
  },

  computed: {
    targetRatio(): number  { return this.store.targetDisruptionRatio },
    healthyRatio(): number { return this.store.healthyDisruptionRatio },
    targetRatioPct(): number  { return Math.min(100, this.targetRatio  * 100) },
    healthyRatioPct(): number { return Math.min(100, this.healthyRatio * 100) },

    targetLysisProbability(): number {
      return computeLysisProbability(this.targetRatio, THRESHOLDS.LYSIS_PROB_CENTER, THRESHOLDS.LYSIS_PROB_SLOPE)
    },
    healthyLysisProbability(): number {
      return computeLysisProbability(this.healthyRatio, THRESHOLDS.LYSIS_PROB_CENTER, THRESHOLDS.LYSIS_PROB_SLOPE)
    },

    lysisTimeDisplay(): string { return formatLysisTime(this.store.lysisDelayMs) },

    isResonanceTarget(): boolean {
      const cat = this.store.targetCellCategory
      const t = this.store.target as { resonantFreqGHz?: number; resonantThresholdVcm?: number }
      return (cat === CELL_CATEGORY.VIRUS || cat === CELL_CATEGORY.BACTERIA) && !!t.resonantFreqGHz && !!t.resonantThresholdVcm
    },

    tipTargetPlysis(): string { return tipTargetPlysis(this.lysisTimeDisplay) },
    tipHealthyPlysis(): string { return tipHealthyPlysis() },
    tipNuclearSection(): string { return tipNuclearSection() },

    tipTargetBar(): string {
      const t = this.store.target as { resonantFreqGHz?: number; resonantThresholdVcm?: number }
      return tipTargetBar({
        pct:                  this.targetRatioPct.toFixed(0),
        isResonanceTarget:    this.isResonanceTarget,
        resonantFreqGHz:      t.resonantFreqGHz,
        resonantThresholdVcm: t.resonantThresholdVcm,
        targetVmMv:           (this.store.targetVm * 1000).toFixed(2),
        thresholdMv:          (this.store.target.thresholdVoltage * 1000).toFixed(0),
        lysisTime:            this.lysisTimeDisplay,
        targetRatio:          this.targetRatio,
      })
    },

    tipHealthyBar(): string {
      return tipHealthyBar({
        pct:               this.healthyRatioPct.toFixed(0),
        isResonanceTarget: this.isResonanceTarget,
        healthyVmMv:       (this.store.healthyVm * 1000).toFixed(2),
        thresholdMv:       (this.store.healthy.thresholdVoltage * 1000).toFixed(0),
        healthyRatio:      this.healthyRatio,
      })
    },
  },
})
</script>
