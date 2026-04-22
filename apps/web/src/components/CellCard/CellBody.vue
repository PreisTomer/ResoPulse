<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="cell-body">
    <p class="cell-body__description">{{ description }}</p>

    <!-- Target-only: key protocol metrics row (hidden when lysed) -->
    <div
      v-if="isMetricsVisible"
      class="cell-body__metrics"
    >
      <div class="cell-body__metric" v-tip="$t('cells.targetMetrics.tipElysis')">
        <span class="cell-body__metric-label">{{ $t('cells.targetMetrics.elysis') }}</span>
        <span class="cell-body__metric-value" :class="metricsElysisClass">{{ metricsElysis }}</span>
      </div>
      <div class="cell-body__metric" v-tip="$t('cells.targetMetrics.tipTi')">
        <span class="cell-body__metric-label">{{ $t('cells.targetMetrics.ti') }}</span>
        <span class="cell-body__metric-value" :class="metricsTiClass">{{ metricsTi }}</span>
      </div>
      <div class="cell-body__metric" v-tip="$t('cells.targetMetrics.tipFc')">
        <span class="cell-body__metric-label">{{ $t('cells.targetMetrics.fc') }}</span>
        <span class="cell-body__metric-value">{{ metricsFc }}</span>
      </div>
    </div>

    <!-- Any-type: predicted vs measured overlay ("the magic moment") -->
    <div
      v-if="measuredOverlay"
      class="cell-body__mvp"
      v-tip="$t('cells.measuredVsPredicted.tip')"
    >
      <div class="cell-body__mvp-header">
        <span class="cell-body__mvp-label">{{ $t('cells.measuredVsPredicted.label') }}</span>
        <span class="cell-body__mvp-delta" :class="mvpDeltaClass">{{ mvpDeltaText }}</span>
      </div>
      <div class="cell-body__mvp-bars">
        <div class="cell-body__mvp-bar cell-body__mvp-bar--predicted">
          <div class="cell-body__mvp-bar-fill" :style="{ width: mvpPredictedWidth }"></div>
          <div class="cell-body__mvp-bar-value">
            <span class="cell-body__mvp-bar-caption">{{ $t('cells.measuredVsPredicted.predicted') }}</span>
            <span class="cell-body__mvp-bar-number">{{ mvpPredictedPct }}%</span>
          </div>
        </div>
        <div class="cell-body__mvp-bar cell-body__mvp-bar--measured">
          <div class="cell-body__mvp-bar-fill" :style="{ width: mvpMeasuredWidth }"></div>
          <div class="cell-body__mvp-bar-value">
            <span class="cell-body__mvp-bar-caption">{{ $t('cells.measuredVsPredicted.measured') }}</span>
            <span class="cell-body__mvp-bar-number">{{ mvpMeasuredPct }}%</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import type { PropType } from 'vue'
import { mapStores } from 'pinia'

import { useCellStore } from '@/stores/cellStore'
import { useExperimentStore } from '@/stores/experimentStore'

import { splitFreqKHz, formatLysisFieldVcm } from '@/utils/format'

import { CELL_STATE, CELL_TYPE } from '@/constants/strings'
import { LYSIS_FIELD_SENTINEL, THRESHOLDS } from '@/constants/physics'

import type { MeasuredVsPredicted } from '@/stores/experimentStore'

export default defineComponent({
  props: {
    type:        { type: String as PropType<'healthy' | 'target'>, required: true },
    description: { type: String, required: true },
  },

  computed: {
    ...mapStores(useCellStore, useExperimentStore),
    CELL_STATE() { return CELL_STATE },
    CELL_TYPE()  { return CELL_TYPE },

    cellState() {
      return this.type === CELL_TYPE.HEALTHY
        ? this.cellStore.healthyCellState
        : this.cellStore.targetCellState
    },

    metricsElysis(): string {
      return formatLysisFieldVcm(this.cellStore.targetLysisField)
    },

    metricsElysisClass(): string {
      const lf = this.cellStore.targetLysisField
      if (lf >= LYSIS_FIELD_SENTINEL) return ''
      const ratio = this.cellStore.fieldIntensity / lf
      if (ratio >= 1.0)  return 'cell-body__metric-value--danger'
      if (ratio >= THRESHOLDS.DISRUPTION_WARN) return 'cell-body__metric-value--warn'
      return ''
    },

    metricsTi(): string {
      const ti = this.cellStore.therapeuticIndex
      return ti >= 10 ? '>10\u00D7' : `\u00D7${ti.toFixed(1)}`
    },

    metricsTiClass(): string {
      const ti = this.cellStore.therapeuticIndex
      if (ti >= THRESHOLDS.TI_STRONG)   return 'cell-body__metric-value--good'
      if (ti >= THRESHOLDS.TI_MARGINAL) return 'cell-body__metric-value--warn'
      return 'cell-body__metric-value--danger'
    },

    metricsFc(): string {
      const parts = splitFreqKHz(this.cellStore.targetFc, 2)
      return `${parts.value} ${parts.unit}`
    },

    isMetricsVisible(): boolean { return this.type === CELL_TYPE.TARGET && this.cellState !== CELL_STATE.LYSED },

    measuredOverlay(): MeasuredVsPredicted | null {
      return this.experimentStore.latestMeasuredOutcomes[this.type]
    },

    mvpPredictedPct(): string { return this.measuredOverlay ? this.measuredOverlay.predictedPct.toFixed(0) : '0' },
    mvpMeasuredPct():  string { return this.measuredOverlay ? this.measuredOverlay.measuredPct.toFixed(0)  : '0' },

    mvpPredictedWidth(): string {
      if (!this.measuredOverlay) return '0%'
      return `${Math.min(100, Math.max(0, this.measuredOverlay.predictedPct))}%`
    },

    mvpMeasuredWidth(): string {
      if (!this.measuredOverlay) return '0%'
      return `${Math.min(100, Math.max(0, this.measuredOverlay.measuredPct))}%`
    },

    mvpDeltaText(): string {
      if (!this.measuredOverlay) return ''
      const d = this.measuredOverlay.deltaPct
      const sign = d > 0 ? '+' : ''
      return this.$t('cells.measuredVsPredicted.deltaPp', { pp: `${sign}${d.toFixed(1)}` })
    },

    mvpDeltaClass(): string {
      if (!this.measuredOverlay) return ''
      const abs = Math.abs(this.measuredOverlay.deltaPct)
      if (abs > THRESHOLDS.CALIB_DRIFT_PP)   return 'cell-body__mvp-delta--drift'
      if (abs < THRESHOLDS.CALIB_STRONG_PP)  return 'cell-body__mvp-delta--strong'
      return 'cell-body__mvp-delta--moderate'
    },
  },
})
</script>

<style lang="scss" scoped>
.cell-body {
  color: var(--color-text-muted);
  font-size: var(--fs-lg);
  line-height: 1.65;
  flex: 1;

  &__description { margin: 0; }

  &__metrics {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.75rem;
    padding-top: 0.6rem;
    border-top: 1px solid color-mix(in srgb, white 6%, transparent);
  }

  &__metric {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.18rem;
    background: color-mix(in srgb, white 3%, transparent);
    border: 1px solid color-mix(in srgb, white 6%, transparent);
    border-radius: var(--radius);
    padding: 0.35rem 0.4rem;
    cursor: default;
  }

  &__metric-label {
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    letter-spacing: 0.06em;
    color: var(--color-text-muted);
    text-transform: uppercase;
  }

  &__metric-value {
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
    font-weight: 600;
    color: var(--color-primary);
    letter-spacing: 0.02em;

    &--good   { color: var(--color-accent); }
    &--warn   { color: var(--color-amber); }
    &--danger { color: var(--color-danger); }
  }

  &__mvp {
    @include flex-col(0.35rem);
    margin-top: 0.6rem;
    padding: 0.45rem 0.55rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    background: color-mix(in srgb, white 2.5%, transparent);
    cursor: help;
  }

  &__mvp-header {
    @include flex-between(0.5rem);
    align-items: baseline;
  }

  &__mvp-label {
    @include mono-upper(var(--fs-xxs), 0.08em);
    opacity: var(--op-muted);
  }

  &__mvp-delta {
    @include mono-upper(var(--fs-xxs), 0.05em);
    font-weight: 700;

    &--drift    { color: var(--color-danger); }
    &--moderate { color: var(--color-amber); }
    &--strong   { color: var(--color-accent); }
  }

  &__mvp-bars {
    @include flex-col(0.25rem);
  }

  &__mvp-bar {
    position: relative;
    height: 1.1rem;
    border-radius: 3px;
    background: color-mix(in srgb, white 3%, transparent);
    overflow: hidden;

    &--predicted .cell-body__mvp-bar-fill { background: color-mix(in srgb, var(--color-primary) 35%, transparent); }
    &--measured  .cell-body__mvp-bar-fill { background: color-mix(in srgb, var(--color-accent)  55%, transparent); }
  }

  &__mvp-bar-fill {
    position: absolute;
    inset: 0 auto 0 0;
    transition: width var(--tr-slow);
  }

  &__mvp-bar-value {
    position: relative;
    z-index: 1;
    @include flex-between(0.5rem);
    align-items: center;
    height: 100%;
    padding: 0 0.5rem;
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    line-height: 1;
  }

  &__mvp-bar-caption {
    letter-spacing: 0.06em;
    text-transform: uppercase;
    opacity: var(--op-muted);
  }

  &__mvp-bar-number {
    font-weight: 700;
    letter-spacing: -0.01em;
  }
}
</style>
