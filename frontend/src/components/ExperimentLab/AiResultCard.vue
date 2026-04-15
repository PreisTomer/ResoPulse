<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="ai-tab__result">

    <!-- Source + confidence badges -->
    <div class="ai-tab__badge-row">
      <span
        class="ai-tab__source-badge"
        :class="aiStore.isPhysicsBaseline ? 'ai-tab__source-badge--physics' : 'ai-tab__source-badge--ml'"
        v-tip="aiStore.isPhysicsBaseline ? $t('ai.tipPhysicsBaseline') : $t('ai.tipConfidence')"
      >
        {{ aiStore.isPhysicsBaseline ? $t('ai.physicsBaselineBadge') : $t('ai.mlBadge') }}
      </span>
      <span
        class="ai-tab__confidence"
        :class="confidenceClass"
        v-tip="$t('ai.tipConfidence')"
      >
        {{ $t('ai.confidenceLabel', { conf: confidencePct }) }}
      </span>
      <span v-if="aiStore.suggestionApplied" class="ai-tab__applied-badge">
        {{ ICON.CHECK }} {{ $t('ai.appliedBadge') }}
      </span>
    </div>

    <!-- Suggested params -->
    <div v-if="aiResult.suggestion" class="ai-tab__suggestion">
      <div class="ai-tab__section-label">{{ $t('ai.suggestedParamsLabel') }}</div>
      <div class="ai-tab__params-grid">
        <span class="ai-tab__param-key">{{ $t('slider.freq') }}</span>
        <span class="ai-tab__param-val">{{ formatFreqKHz(aiResult.suggestion.freqKHz) }}</span>
        <span class="ai-tab__param-key">{{ $t('slider.fieldIntensity') }}</span>
        <span class="ai-tab__param-val">{{ aiResult.suggestion.fieldVcm }} {{ UNIT.V_PER_CM }}</span>
        <span class="ai-tab__param-key">{{ $t('slider.dutyCycle') }}</span>
        <span class="ai-tab__param-val">{{ formatDutyCycle(aiResult.suggestion.dutyCycle) }}</span>
        <span class="ai-tab__param-key">{{ $t('slider.pulseWidth') }}</span>
        <span class="ai-tab__param-val">{{ aiResult.suggestion.pulseWidthNs }} {{ UNIT.NS }}</span>
        <span class="ai-tab__param-key">{{ $t('slider.waveform') }}</span>
        <span class="ai-tab__param-val ai-tab__param-val--upper">{{ aiResult.suggestion.waveform }}</span>
      </div>
    </div>

    <!-- Predicted outcomes -->
    <div class="ai-tab__prediction">
      <div class="ai-tab__section-label">{{ $t('ai.predictedOutcomeLabel') }}</div>
      <div class="ai-tab__outcome-row">
        <span class="ai-tab__outcome-item">
          <span class="ai-tab__outcome-key">{{ $t('ai.predictedTargetDr') }}</span>
          <span class="ai-tab__outcome-val ai-tab__outcome-val--target">
            {{ (aiResult.predictedTargetDr * 100).toFixed(0) }}%
          </span>
        </span>
        <span class="ai-tab__outcome-item">
          <span class="ai-tab__outcome-key">{{ $t('ai.predictedHealthyDr') }}</span>
          <span class="ai-tab__outcome-val ai-tab__outcome-val--healthy">
            {{ (aiResult.predictedHealthyDr * 100).toFixed(0) }}%
          </span>
        </span>
        <span class="ai-tab__outcome-item">
          <span class="ai-tab__outcome-key">{{ $t('ai.predictedTi') }}</span>
          <span class="ai-tab__outcome-val" :class="tiClass">
            x{{ aiResult.predictedTi.toFixed(2) }}
          </span>
        </span>
      </div>
    </div>

    <!-- Apply button -->
    <div class="ai-tab__apply-row">
      <button
        class="ai-tab__apply-btn"
        :class="{ 'ai-tab__apply-btn--applied': aiStore.suggestionApplied }"
        :disabled="aiStore.suggestionApplied"
        v-tip="$t('ai.tipApplyBtn')"
        @click="$emit('apply')"
      >
        {{ aiStore.suggestionApplied ? ($t('ai.appliedBadge') + ' ' + ICON.CHECK) : $t('ai.applyBtn') }}
      </button>
    </div>

    <!-- Explanation -->
    <div v-if="aiResult.explanation" class="ai-tab__explanation">
      <span class="ai-tab__explanation-label">{{ $t('ai.explanationLabel') }}:</span>
      <span class="ai-tab__explanation-text">{{ aiResult.explanation }}</span>
    </div>

    <!-- Feature importance (collapsible) -->
    <div v-if="hasFeatureImportance" class="ai-tab__importance">
      <button class="ai-tab__importance-toggle" @click="aiStore.toggleImportance()">
        {{ aiStore.importanceExpanded ? $t('ai.whyBtnCollapse') : $t('ai.whyBtn') }}
        <span
          class="ai-tab__importance-chevron"
          :class="{ 'ai-tab__importance-chevron--open': aiStore.importanceExpanded }"
        >{{ ICON.CHEVRON }}</span>
      </button>
      <div v-if="aiStore.importanceExpanded" class="ai-tab__importance-body">
        <div class="ai-tab__importance-title">{{ $t('ai.featureImportanceTitle') }}</div>
        <div
          v-for="[key, val] in sortedImportance"
          :key="key"
          class="ai-tab__importance-row"
        >
          <span class="ai-tab__importance-key">{{ formatFeatureKey(key) }}</span>
          <div class="ai-tab__importance-bar-wrap">
            <div class="ai-tab__importance-bar" :style="{ width: (val * 100).toFixed(1) + '%' }" />
          </div>
          <span class="ai-tab__importance-pct">{{ (val * 100).toFixed(1) }}%</span>
        </div>
      </div>
    </div>

  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'

import { useAiStore } from '@/stores/aiStore'

import { formatFreqKHz } from '@/utils/format'

import { ICON } from '@/constants/icons'
import { UNIT } from '@/constants/units'
import { THRESHOLDS } from '@/constants/physics'

export default defineComponent({
  name: 'AiResultCard',

  emits: ['apply'],

  computed: {
    ICON() { return ICON },
    UNIT() { return UNIT },
    ...mapStores(useAiStore),

    aiResult() { return this.aiStore.result! },

    confidencePct(): string {
      return (this.aiStore.confidence * 100).toFixed(0) + '%'
    },

    confidenceClass(): string {
      const c = this.aiStore.confidence
      if (c >= 0.7) return 'ai-tab__confidence--high'
      if (c >= 0.5) return 'ai-tab__confidence--medium'
      return 'ai-tab__confidence--low'
    },

    tiClass(): string {
      const ti = this.aiStore.result?.predictedTi ?? 0
      if (ti >= THRESHOLDS.SEL_STRONG)   return 'ai-tab__outcome-val--ti-strong'
      if (ti >= THRESHOLDS.SEL_MARGINAL) return 'ai-tab__outcome-val--ti-marginal'
      return 'ai-tab__outcome-val--ti-weak'
    },

    hasFeatureImportance(): boolean {
      const fi = this.aiStore.result?.featureImportance
      return !!fi && Object.keys(fi).length > 0
    },

    sortedImportance(): [string, number][] {
      const fi = this.aiStore.result?.featureImportance
      if (!fi) return []
      return Object.entries(fi).sort(([, a], [, b]) => b - a).slice(0, 8)
    },
  },

  methods: {
    formatFreqKHz,

    formatDutyCycle(dc: number): string {
      if (dc >= 0.01) return (dc * 100).toFixed(1) + '%'
      return dc.toExponential(1)
    },

    formatFeatureKey(key: string): string {
      const labels: Record<string, string> = {
        freq_khz:         'Frequency',
        field_vcm:        'Field intensity',
        duty_cycle:       'Duty cycle',
        pulse_width_ns:   'Pulse width',
        target_tau_ns:    'Target tau',
        healthy_tau_ns:   'Healthy tau',
        target_fc_khz:    'Target fc',
        healthy_fc_khz:   'Healthy fc',
        target_radius_um: 'Target radius',
        sigma_e:          'Sigma e (medium)',
        orientation_deg:  'Orientation angle',
      }
      return labels[key] ?? key
    },
  },
})
</script>

<style lang="scss" scoped>

.ai-tab {

  // ── Result card shell ──────────────────────────────────────────────────────
  &__result {
    @include flex-col(0.75rem);
    padding: 0.7rem;
    background: color-mix(in srgb, white 3%, transparent);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
  }

  &__badge-row { @include flex-row(0.45rem); flex-wrap: wrap; }

  &__source-badge {
    @include badge-pill(0.15rem 0.5rem, 3px);
    font-size: var(--fs-xxs);

    &--physics {
      color: var(--color-amber);
      border-color: color-mix(in srgb, var(--color-amber) 35%, transparent);
      background: color-mix(in srgb, var(--color-amber) 8%, transparent);
    }
    &--ml {
      color: var(--color-primary);
      border-color: color-mix(in srgb, var(--color-primary) 35%, transparent);
      background: color-mix(in srgb, var(--color-primary) 8%, transparent);
    }
  }

  &__confidence {
    @include mono-upper(var(--fs-xxs));

    &--high   { color: var(--color-lime); }
    &--medium { color: var(--color-amber); }
    &--low    { color: var(--color-danger); opacity: var(--op-dim); }
  }

  &__applied-badge {
    @include badge-pill(0.12rem 0.4rem, 3px);
    font-size: var(--fs-xxs);
    color: var(--color-lime);
    border-color: color-mix(in srgb, var(--color-lime) 30%, transparent);
    background: color-mix(in srgb, var(--color-lime) 8%, transparent);
  }

  // ── Section label ──────────────────────────────────────────────────────────
  &__section-label {
    @include mono-upper(var(--fs-xxs));
    color: var(--color-text-muted);
    opacity: var(--op-muted);
    margin-bottom: 0.3rem;
  }

  // ── Params grid ────────────────────────────────────────────────────────────
  &__params-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.25rem 0.5rem;
  }

  &__param-key {
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
    opacity: var(--op-dim);
    font-family: var(--font-mono);
    align-self: center;
  }

  &__param-val {
    font-size: var(--fs-sm);
    font-family: var(--font-mono);
    color: var(--color-primary);
    font-weight: 600;
    align-self: center;

    &--upper { text-transform: uppercase; }
  }

  // ── Outcomes ───────────────────────────────────────────────────────────────
  &__outcome-row {
    @include flex-row(0.5rem);
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  &__outcome-item {
    @include flex-col(0.15rem);
    flex: 1;
    min-width: 60px;
  }

  &__outcome-key {
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    opacity: var(--op-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  &__outcome-val {
    font-size: var(--fs-md);
    font-family: var(--font-mono);
    font-weight: 700;
    color: var(--color-text);

    &--target      { color: var(--color-danger); }
    &--healthy     { color: var(--color-lime); }
    &--ti-strong   { color: var(--color-lime); }
    &--ti-marginal { color: var(--color-amber); }
    &--ti-weak     { color: var(--color-text-muted); }
  }

  // ── Apply button ───────────────────────────────────────────────────────────
  &__apply-row { display: flex; }

  &__apply-btn {
    flex: 1;
    padding: 0.45rem 1rem;
    background: color-mix(in srgb, var(--color-lime) 14%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-lime) 40%, transparent);
    border-radius: var(--radius);
    color: var(--color-lime);
    font-size: var(--fs-sm);
    font-family: var(--font-mono);
    font-weight: 600;
    cursor: pointer;
    transition: background var(--tr-fast), border-color var(--tr-fast);

    &:hover:not(:disabled) { background: color-mix(in srgb, var(--color-lime) 22%, transparent); }
    &:disabled { opacity: var(--op-muted); cursor: not-allowed; }

    &--applied {
      background: color-mix(in srgb, var(--color-lime) 8%, transparent);
      color: var(--color-lime);
      opacity: var(--op-partial);
    }
  }

  // ── Explanation ────────────────────────────────────────────────────────────
  &__explanation {
    font-size: var(--fs-xs);
    line-height: 1.5;
    color: var(--color-text-muted);
    opacity: var(--op-dim);
  }

  &__explanation-label {
    font-family: var(--font-mono);
    text-transform: uppercase;
    font-size: var(--fs-xxs);
    letter-spacing: 0.06em;
    margin-right: 0.3rem;
  }

  // ── Feature importance ─────────────────────────────────────────────────────
  &__importance { @include flex-col(0); }

  &__importance-toggle {
    @include flex-row(0.35rem);
    background: transparent;
    border: none;
    color: var(--color-primary);
    font-size: var(--fs-xs);
    font-family: var(--font-mono);
    cursor: pointer;
    padding: 0.3rem 0;
    opacity: var(--op-partial);
    transition: opacity var(--tr-fast);

    &:hover { opacity: 1; }
  }

  &__importance-chevron {
    font-size: var(--fs-xxs);
    transition: transform var(--tr-fast);
    display: inline-block;

    &--open { transform: rotate(90deg); }
  }

  &__importance-body { @include flex-col(0.4rem); padding-top: 0.5rem; }

  &__importance-title {
    @include mono-upper(var(--fs-xxs));
    color: var(--color-text-muted);
    opacity: var(--op-muted);
  }

  &__importance-row { @include flex-row(0.4rem); }

  &__importance-key {
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    min-width: 90px;
    flex-shrink: 0;
  }

  &__importance-bar-wrap {
    flex: 1;
    height: 4px;
    background: color-mix(in srgb, white 8%, transparent);
    border-radius: 2px;
    align-self: center;
    overflow: hidden;
  }

  &__importance-bar {
    height: 100%;
    background: var(--color-primary);
    border-radius: 2px;
    transition: width 0.4s ease;
  }

  &__importance-pct {
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    min-width: 32px;
    text-align: right;
  }
}
</style>
