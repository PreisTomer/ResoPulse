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
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import type { PropType } from 'vue'
import { mapStores } from 'pinia'
import { useCellStore } from '@/stores/cellStore'
import { CELL_STATE, CELL_TYPE } from '@/constants/strings'
import { splitFreqKHz, formatLysisFieldVcm } from '@/utils/format'
import { LYSIS_FIELD_SENTINEL, THRESHOLDS } from '@/constants/physics'

export default defineComponent({
  props: {
    type:        { type: String as PropType<'healthy' | 'target'>, required: true },
    description: { type: String, required: true },
  },

  computed: {
    ...mapStores(useCellStore),
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
}
</style>
