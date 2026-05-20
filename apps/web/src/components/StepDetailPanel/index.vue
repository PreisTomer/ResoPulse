<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <aside class="step-detail">
    <div v-if="!entry" class="step-detail__empty">
      <p class="step-detail__empty-text">{{ $t('downstream.detail.noSelection') }}</p>
    </div>

    <template v-else>
      <header class="step-detail__header">
        <div class="step-detail__visual">
          <StepVisual :category="entry.category" />
        </div>
        <div>
          <h3 class="step-detail__name">{{ entry.name }}</h3>
          <span class="step-detail__yield" :data-tier="yieldTier">{{ $t('downstream.detail.predictedYield') }}: {{ Math.round(predictedYield) }}%</span>
        </div>
      </header>

      <p class="step-detail__desc">{{ entry.description }}</p>

      <!-- Parameters -->
      <div class="step-detail__params">
        <label v-for="param in entry.parameters" :key="param.key" class="step-detail__param">
          <span class="step-detail__param-label" v-tip="paramTip(param)">
            {{ param.label }}
            <span class="step-detail__param-value">{{ paramValue(param.key) }} {{ param.unit }}</span>
          </span>
          <input
            type="range"
            :min="param.min" :max="param.max" :step="paramStep(param)"
            :value="paramValue(param.key)"
            class="step-detail__slider"
            :disabled="!param.affectsYield && param.unit === 'bool'"
            @input="onParam(param.key, $event)"
          />
        </label>
      </div>

      <!-- Clearance metrics -->
      <div class="step-detail__metrics">
        <div class="step-detail__metric">
          <span class="step-detail__metric-label">{{ $t('downstream.detail.litRange') }}</span>
          <span class="step-detail__metric-value">{{ entry.yieldRangePct[0] }}–{{ entry.yieldRangePct[1] }}%</span>
        </div>
        <div class="step-detail__metric">
          <span class="step-detail__metric-label">{{ $t('downstream.detail.hcpClearance') }}</span>
          <span class="step-detail__metric-value">{{ hcpMid }} {{ $t('downstream.detail.logReductionUnit') }}</span>
        </div>
        <div class="step-detail__metric">
          <span class="step-detail__metric-label">{{ $t('downstream.detail.dnaClearance') }}</span>
          <span class="step-detail__metric-value">{{ dnaMid }} {{ $t('downstream.detail.logReductionUnit') }}</span>
        </div>
      </div>

      <!-- Challenges -->
      <div v-if="entry.commonChallenges.length" class="step-detail__challenges">
        <span class="step-detail__challenges-label">{{ $t('downstream.detail.challengesLabel') }}</span>
        <ul class="step-detail__challenges-list">
          <li v-for="(c, i) in entry.commonChallenges" :key="i">{{ c }}</li>
        </ul>
      </div>

      <!-- Sources -->
      <div class="step-detail__sources">
        <span class="step-detail__sources-label">{{ $t('downstream.detail.sourcesLabel') }}</span>
        <span v-for="(ref, i) in entry.references" :key="i" class="step-detail__source">{{ ref }}</span>
      </div>
    </template>
  </aside>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'

import { getStepById, type ProcessStepEntry, type StepParameter } from '@/constants/processStepCatalog'

import { predictStepYield } from '@/utils/downstream/yieldPrediction'

import StepVisual from '@/components/StepVisual/index.vue'

export default defineComponent({
  name: 'StepDetailPanel',
  components: { StepVisual },
  props: {
    stepType:    { type: String as PropType<string | null>, default: null },
    paramValues: { type: Object as PropType<Record<string, number>>, default: () => ({}) },
  },
  emits: ['setParam'],
  computed: {
    entry(): ProcessStepEntry | undefined {
      return this.stepType ? getStepById(this.stepType) : undefined
    },
    predictedYield(): number {
      return this.entry ? predictStepYield(this.entry, this.paramValues) : 0
    },
    yieldTier(): string {
      if (this.predictedYield >= 90) return 'high'
      if (this.predictedYield >= 75) return 'mid'
      return 'low'
    },
    hcpMid(): string {
      if (!this.entry) return '0'
      return ((this.entry.hcpLogReduction[0] + this.entry.hcpLogReduction[1]) / 2).toFixed(1)
    },
    dnaMid(): string {
      if (!this.entry) return '0'
      return ((this.entry.dnaLogReduction[0] + this.entry.dnaLogReduction[1]) / 2).toFixed(1)
    },
  },
  methods: {
    paramValue(key: string): number {
      const entry = this.entry
      const fallback = entry?.parameters.find(p => p.key === key)?.defaultValue ?? 0
      return this.paramValues[key] ?? fallback
    },
    paramStep(param: StepParameter): number {
      const span = param.max - param.min
      if (span <= 2) return 0.05
      if (span <= 20) return 0.5
      return Math.max(1, Math.round(span / 100))
    },
    paramTip(param: StepParameter): string {
      return `<strong>${param.label}</strong>\n${param.description}`
    },
    onParam(key: string, event: Event) {
      const value = parseFloat((event.target as HTMLInputElement).value)
      this.$emit('setParam', key, value)
    },
  },
})
</script>

<style lang="scss" scoped>
.step-detail {
  @include flex-col(1.1rem);
  padding: 1.25rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);

  &__empty {
    padding: 2rem 1rem;
    text-align: center;
  }

  &__empty-text {
    margin: 0;
    opacity: var(--op-muted);
    font-size: var(--fs-md);
  }

  &__header {
    @include flex-row(0.75rem);
    align-items: center;
  }

  &__visual {
    width: 44px;
    height: 52px;
    flex-shrink: 0;
  }

  &__name {
    margin: 0 0 0.2rem;
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text-heading);
  }

  &__yield {
    @include mono-upper(var(--fs-xxs));

    &[data-tier="high"] { color: var(--color-ok); }
    &[data-tier="mid"]  { color: var(--color-primary); }
    &[data-tier="low"]  { color: var(--color-amber); }
  }

  &__desc {
    margin: 0;
    font-size: var(--fs-sm);
    opacity: var(--op-partial);
    line-height: 1.5;
  }

  &__params {
    @include flex-col(1rem);
  }

  &__param {
    @include flex-col(0.4rem);
  }

  &__param-label {
    @include flex-between(0.5rem);
    align-items: baseline;
    font-size: var(--fs-sm);
    color: var(--color-text);
    cursor: help;
  }

  &__param-value {
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    font-weight: 600;
    color: var(--color-primary);
  }

  &__slider {
    width: 100%;
    accent-color: var(--color-primary);
  }

  &__metrics {
    @include flex-row(0.75rem);
    padding: 0.75rem 0;
    border-top: 1px solid color-mix(in srgb, var(--color-text) 8%, transparent);
    border-bottom: 1px solid color-mix(in srgb, var(--color-text) 8%, transparent);
  }

  &__metric {
    @include flex-col(0.2rem);
    flex: 1;
  }

  &__metric-label {
    @include mono-upper(0.55rem);
    opacity: var(--op-muted);
  }

  &__metric-value {
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
    color: var(--color-text);
  }

  &__challenges-label,
  &__sources-label {
    @include mono-upper(var(--fs-xxs));
    opacity: var(--op-muted);
    display: block;
    margin-bottom: 0.4rem;
  }

  &__challenges-list {
    margin: 0;
    padding-left: 1.1rem;
    @include flex-col(0.3rem);

    li {
      font-size: var(--fs-sm);
      opacity: var(--op-partial);
      line-height: 1.4;
    }
  }

  &__sources {
    @include flex-col(0.3rem);
  }

  &__source {
    font-size: var(--fs-xs);
    opacity: var(--op-muted);
    font-style: italic;
    line-height: 1.4;
  }
}
</style>
