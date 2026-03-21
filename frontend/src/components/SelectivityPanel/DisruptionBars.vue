<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
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
import { THRESHOLDS } from '@/constants/physics'
import { CELL_CATEGORY, CELL_LABEL } from '@/constants/strings'
import { ICON } from '@/constants/icons'
import { formatLysisTime } from '@/tooltips/sliderTooltips'
import { computeLysisProbability } from '@/utils/physics'
import {
  tipTargetPlysis,
  tipHealthyPlysis,
  tipNuclearSection,
  tipTargetBar,
  tipHealthyBar,
} from '@/tooltips/disruptionBarTooltips'

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

<style lang="scss" scoped>
@use '../../styles/mixins' as *;

@keyframes bar-flash {
  from { opacity: 1; }
  to   { opacity: 0.5; }
}

.sel-panel {
  &__bars { display: flex; flex-direction: column; gap: 0.35rem; }

  &__bar-row { display: flex; align-items: center; gap: 0.5rem; }

  &__bar-label {
    font-size: var(--fs-xs);
    font-family: var(--font-mono);
    color: var(--color-text);
    width: 1rem;
    text-align: right;
    flex-shrink: 0;
  }

  &__bar-track {
    flex: 1;
    height: 6px;
    background: rgba(255, 255, 255, 0.08);
    border-radius: 3px;
    overflow: hidden;
  }

  &__bar-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s ease;

    &--t    { background: var(--color-danger); }
    &--h    { background: var(--color-primary); }
    &--warn { animation: bar-flash 0.6s ease-in-out infinite alternate; }
  }

  &__bar-val {
    font-size: var(--fs-xs);
    font-family: var(--font-mono);
    color: var(--color-text);
    width: 2.2rem;
    text-align: right;
    flex-shrink: 0;
  }

  &__bar-plysis {
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    opacity: 0.7;
    width: 2.6rem;
    text-align: right;
    flex-shrink: 0;
    transition: color 0.3s, opacity 0.3s;

    &--high { color: var(--color-danger); opacity: 1; font-weight: 600; }
  }

  &__nuc-section {
    margin-top: 0.5rem;
    padding: 0.35rem 0.5rem;
    background: color-mix(in srgb, var(--color-purple) 5%, transparent);
    border-left: 2px solid color-mix(in srgb, var(--color-purple) 30%, transparent);
    border-radius: 0 4px 4px 0;
    display: flex;
    flex-direction: column;
    gap: 0.28rem;
  }

  &__nuc-bar-row { display: flex; align-items: center; gap: 0.5rem; }

  &__nuc-bar-label {
    font-size: var(--fs-xs);
    font-family: var(--font-mono);
    color: var(--color-purple);
    width: 3rem;
    flex-shrink: 0;
  }

  &__nuc-bar-track {
    flex: 1;
    height: 3px;
    background: color-mix(in srgb, var(--color-purple) 12%, transparent);
    border-radius: 2px;
    overflow: hidden;
  }

  &__nuc-bar-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.3s ease;

    &--t    { background: var(--color-purple); }
    &--h    { background: color-mix(in srgb, var(--color-primary) 70%, transparent); }
    &--warn { background: var(--color-danger) !important; animation: bar-flash 0.6s ease-in-out infinite alternate; }
  }

  &__nuc-bar-val {
    font-size: var(--fs-xs);
    font-family: var(--font-mono);
    color: var(--color-purple);
    width: 2rem;
    text-align: right;
    flex-shrink: 0;
  }

  &__nuc-sel-row {
    @include flex-between();
    padding-top: 0.15rem;
    border-top: 1px solid color-mix(in srgb, var(--color-purple) 12%, transparent);
    margin-top: 0.05rem;
  }

  &__nuc-sel-label { font-size: var(--fs-xs); color: color-mix(in srgb, var(--color-purple) 70%, transparent); }

  &__nuc-sel-val {
    font-size: var(--fs-xs);
    font-family: var(--font-mono);
    font-weight: 600;
    color: var(--color-purple);
  }

  &__nuc-sel--good { color: var(--color-lime); }
  &__nuc-sel--ok   { color: var(--color-amber); }
  &__nuc-sel--low  { color: var(--color-danger); }
}
</style>
