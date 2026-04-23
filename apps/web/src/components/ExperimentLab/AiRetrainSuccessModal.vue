<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <Transition name="arsm">
    <div v-if="isOpen" class="arsm" role="dialog" aria-modal="true" @click.self="onClose">
      <div class="arsm__panel">

        <div class="arsm__header">
          <span class="arsm__eyebrow">{{ ICON.AI }} {{ $t('ai.retrainModalTitle') }}</span>
          <h2 class="arsm__subtitle">{{ $t('ai.retrainModalSubtitle') }}</h2>
        </div>

        <div class="arsm__body">

          <div class="arsm__verdict" :class="`arsm__verdict--${verdict.tone}`">
            <span class="arsm__verdict-icon" aria-hidden="true">{{ verdict.icon }}</span>
            <div class="arsm__verdict-body">
              <span class="arsm__verdict-title">{{ verdict.title }}</span>
              <span class="arsm__verdict-sub">{{ verdict.subtitle }}</span>
            </div>
          </div>

          <p class="arsm__body-text">{{ $t('ai.retrainModalBody', { n: samplesUsed }) }}</p>

          <div v-if="hasPerOutcomeMetrics" class="arsm__metrics">
            <div class="arsm__metrics-title">{{ $t('ai.retrainModalMetricsTitle') }}</div>
            <table class="arsm__metrics-table">
              <thead>
                <tr>
                  <th>{{ $t('ai.retrainModalOutcomeCol') }}</th>
                  <th>{{ $t('ai.retrainModalMaeCol') }}</th>
                  <th>{{ $t('ai.retrainModalRmseCol') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in perOutcomeRows" :key="row.label">
                  <td>{{ row.label }}</td>
                  <td class="arsm__metric-val">{{ row.mae }}</td>
                  <td class="arsm__metric-val">{{ row.rmse }}</td>
                </tr>
              </tbody>
            </table>
            <div class="arsm__metrics-hint">{{ $t('ai.retrainModalMetricsHint') }}</div>
          </div>

          <div class="arsm__tip-title">{{ $t('ai.retrainModalTipList') }}</div>
          <ul class="arsm__tip-list">
            <li>{{ $t('ai.retrainModalTip1') }}</li>
            <li>{{ $t('ai.retrainModalTip2') }}</li>
            <li>{{ $t('ai.retrainModalTip3') }}</li>
          </ul>
        </div>

        <div class="arsm__footer">
          <button class="arsm__btn" @click="onClose">{{ $t('ai.retrainModalCta') }}</button>
        </div>

      </div>
    </div>
  </Transition>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import type { PropType } from 'vue'

import type { TrainerOutcomeMetrics } from '@resopulse/shared-types'

import { NULL_DISPLAY } from '@/constants/strings'
import { ICON } from '@/constants/icons'

interface Verdict {
  tone:     'promoted' | 'rejected' | 'initial'
  icon:     string
  title:    string
  subtitle: string
}

interface MetricRow {
  label: string
  mae:   string
  rmse:  string
}

export default defineComponent({
  name: 'AiRetrainSuccessModal',

  props: {
    isOpen:           { type: Boolean, required: true },
    samplesUsed:      { type: Number,  required: true },
    modelVersion:     { type: String as PropType<string | null>, default: null },
    promoted:         { type: Boolean, default: false },
    holdoutMae:       { type: Number as PropType<number | null>, default: null },
    previousBestMae:  { type: Number as PropType<number | null>, default: null },
    targetDr:         { type: Object as PropType<TrainerOutcomeMetrics | null>, default: null },
    healthyDr:        { type: Object as PropType<TrainerOutcomeMetrics | null>, default: null },
    rating:           { type: Object as PropType<TrainerOutcomeMetrics | null>, default: null },
  },

  emits: ['close'],

  computed: {
    ICON() { return ICON },

    verdict(): Verdict {
      const hasMae = this.holdoutMae !== null
      const maeTxt = hasMae ? this.holdoutMae!.toFixed(3) : NULL_DISPLAY
      const version = this.modelVersion ?? NULL_DISPLAY

      if (this.promoted && this.previousBestMae === null) {
        return {
          tone:     'initial',
          icon:     ICON.CHECK,
          title:    this.$t('ai.retrainVerdictInitialTitle', { version }) as string,
          subtitle: this.$t('ai.retrainVerdictInitialSub',   { mae: maeTxt }) as string,
        }
      }
      if (this.promoted) {
        const delta = (this.previousBestMae! - this.holdoutMae!)
        const deltaTxt = `${delta >= 0 ? '−' : '+'}${Math.abs(delta).toFixed(3)}`
        return {
          tone:     'promoted',
          icon:     ICON.CHECK,
          title:    this.$t('ai.retrainVerdictPromotedTitle', { version }) as string,
          subtitle: this.$t('ai.retrainVerdictPromotedSub', {
            mae:      maeTxt,
            previous: this.previousBestMae!.toFixed(3),
            delta:    deltaTxt,
          }) as string,
        }
      }
      return {
        tone:     'rejected',
        icon:     ICON.WARNING,
        title:    this.$t('ai.retrainVerdictRejectedTitle') as string,
        subtitle: this.$t('ai.retrainVerdictRejectedSub', {
          mae:      maeTxt,
          previous: this.previousBestMae !== null ? this.previousBestMae.toFixed(3) : NULL_DISPLAY,
        }) as string,
      }
    },

    hasPerOutcomeMetrics(): boolean {
      return this.targetDr !== null || this.healthyDr !== null || this.rating !== null
    },

    perOutcomeRows(): MetricRow[] {
      const fmt = (v: number | undefined): string => v === undefined ? NULL_DISPLAY : v.toFixed(3)
      const pairs: Array<[string, TrainerOutcomeMetrics | null]> = [
        [this.$t('ai.retrainMetricTargetDr')  as string, this.targetDr],
        [this.$t('ai.retrainMetricHealthyDr') as string, this.healthyDr],
        [this.$t('ai.retrainMetricRating')    as string, this.rating],
      ]
      return pairs
        .filter(([, m]) => m !== null)
        .map(([label, m]) => ({ label, mae: fmt(m!.mae), rmse: fmt(m!.rmse) }))
    },
  },

  methods: {
    onClose(): void { this.$emit('close') },
  },
})
</script>

<style lang="scss" scoped>
.arsm {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--color-bg) 92%, transparent);
  padding: 1rem;

  &__panel {
    @include surface-card(var(--radius-lg), 0);
    width: 100%;
    max-width: 560px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  &__header {
    @include flex-col(0.3rem);
    padding: 1.1rem 1.4rem 0.8rem;
    border-bottom: 1px solid color-mix(in srgb, var(--color-primary) 12%, transparent);
  }

  &__eyebrow {
    @include mono-upper(var(--fs-xxs));
    color: var(--color-primary);
  }

  &__subtitle {
    margin: 0;
    font-size: var(--fs-lg);
    color: var(--color-text);
  }

  &__body {
    @include flex-col(0.9rem);
    padding: 1rem 1.4rem;
    overflow-y: auto;
  }

  &__body-text {
    margin: 0;
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
    line-height: 1.55;
  }

  &__verdict {
    @include flex-row(0.7rem);
    align-items: flex-start;
    padding: 0.75rem 0.9rem;
    border-radius: var(--radius);
    border: 1px solid;

    &--promoted { @include color-variant(lime,    40%, 10%); }
    &--initial  { @include color-variant(primary, 40%, 10%); }
    &--rejected { @include color-variant(amber,   40%, 10%); }
  }

  &__verdict-icon {
    font-size: var(--fs-lg);
    line-height: 1.2;
    flex-shrink: 0;
  }

  &__verdict-body {
    @include flex-col(0.2rem);
    flex: 1;
    min-width: 0;
  }

  &__verdict-title {
    font-size: var(--fs-md);
    font-weight: 700;
    color: var(--color-text);
  }

  &__verdict-sub {
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
    line-height: 1.5;
    word-break: break-word;
  }

  &__metrics {
    @include flex-col(0.4rem);
    padding: 0.75rem 0.9rem;
    border-radius: var(--radius);
    border: 1px solid var(--color-border);
    background: color-mix(in srgb, white 2%, transparent);
  }

  &__metrics-title {
    @include mono-upper(var(--fs-xxs), 0.08em);
    color: var(--color-primary);
  }

  &__metrics-table {
    width: 100%;
    border-collapse: collapse;
    font-family: var(--font-mono);
    font-size: var(--fs-xs);

    th {
      @include mono-upper(var(--fs-xxs), 0.06em);
      color: var(--color-text-muted);
      text-align: left;
      padding: 0.3rem 0.4rem;
      border-bottom: 1px solid var(--color-border);
    }

    td {
      padding: 0.3rem 0.4rem;
      color: var(--color-text);
      border-bottom: 1px solid color-mix(in srgb, var(--color-border) 50%, transparent);
    }

    tr:last-child td { border-bottom: none; }
  }

  &__metric-val {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  &__metrics-hint {
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    color: var(--color-text-muted);
    opacity: var(--op-dim);
    line-height: 1.5;
  }

  &__tip-title {
    @include mono-upper(var(--fs-xxs), 0.08em);
    color: var(--color-primary);
  }

  &__tip-list {
    margin: 0;
    padding-left: 1.1rem;
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
    line-height: 1.5;

    li + li { margin-top: 0.35rem; }
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    padding: 0.85rem 1.4rem 1.1rem;
    border-top: 1px solid color-mix(in srgb, var(--color-primary) 12%, transparent);
  }

  &__btn {
    @include mono-upper(var(--fs-xs), 0.06em);
    padding: 0.45rem 1rem;
    background: color-mix(in srgb, var(--color-primary) 16%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-primary) 45%, transparent);
    border-radius: var(--radius);
    color: var(--color-primary);
    cursor: pointer;
    transition: background var(--tr-fast);

    &:hover { background: color-mix(in srgb, var(--color-primary) 28%, transparent); }
  }
}

.arsm-enter-active, .arsm-leave-active { transition: opacity 0.2s ease; }
.arsm-enter-from,   .arsm-leave-to     { opacity: 0; }
</style>
