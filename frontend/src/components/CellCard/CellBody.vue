<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="cell-body">
    <p class="cell-body__description">{{ description }}</p>

    <!-- Target-only: key protocol metrics row (hidden when lysed) -->
    <div
      v-if="type === CELL_TYPE.TARGET && cellState !== CELL_STATE.LYSED"
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
import { useCellStore } from '@/stores/cellStore'
import { CELL_STATE, CELL_TYPE } from '@/constants/strings'
import { splitFreqKHz, formatFieldVcm } from '@/utils/format'

export default defineComponent({
  props: {
    type:        { type: String as PropType<'healthy' | 'target'>, required: true },
    description: { type: String, required: true },
  },

  setup() {
    return { store: useCellStore(), CELL_STATE, CELL_TYPE }
  },

  computed: {
    cellState() {
      return this.type === CELL_TYPE.HEALTHY
        ? this.store.healthyCellState
        : this.store.targetCellState
    },

    metricsElysis(): string {
      return formatFieldVcm(this.store.targetLysisField)
    },

    metricsElysisClass(): string {
      const ratio = this.store.fieldIntensity / this.store.targetLysisField
      if (ratio >= 1.0)  return 'cell-body__metric-value--danger'
      if (ratio >= 0.85) return 'cell-body__metric-value--warn'
      return ''
    },

    metricsTi(): string {
      const ti = this.store.therapeuticIndex
      return ti >= 10 ? '>10\u00D7' : `\u00D7${ti.toFixed(1)}`
    },

    metricsTiClass(): string {
      const ti = this.store.therapeuticIndex
      if (ti >= 1.5) return 'cell-body__metric-value--good'
      if (ti >= 1.0) return 'cell-body__metric-value--warn'
      return 'cell-body__metric-value--danger'
    },

    metricsFc(): string {
      const parts = splitFreqKHz(this.store.targetFc, 2)
      return `${parts.value} ${parts.unit}`
    },
  },
})
</script>

<style lang="scss" scoped>
.cell-body {
  color: var(--color-text-muted);
  font-size: 0.875rem;
  line-height: 1.65;
  flex: 1;

  &__description { margin: 0; }

  &__metrics {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.75rem;
    padding-top: 0.6rem;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }

  &__metric {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.18rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: var(--radius);
    padding: 0.35rem 0.4rem;
    cursor: default;
  }

  &__metric-label {
    font-family: var(--font-mono);
    font-size: 0.58rem;
    letter-spacing: 0.06em;
    color: var(--color-text-muted);
    text-transform: uppercase;
  }

  &__metric-value {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: 600;
    color: var(--color-primary);
    letter-spacing: 0.02em;

    &--good   { color: var(--color-accent); }
    &--warn   { color: var(--color-amber); }
    &--danger { color: var(--color-danger); }
  }
}
</style>
