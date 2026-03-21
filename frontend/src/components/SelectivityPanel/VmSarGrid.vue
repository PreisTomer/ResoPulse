<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="vm-sar" v-tip="tipVmSar">
    <template v-if="isResonanceTarget">
      <div class="vm-sar__cell">
        <span class="vm-sar__type vm-sar__type--t">{{ $t('selectivity.tDisr') }}</span>
        <span class="vm-sar__vm vm-sar__vm--t">{{ targetRatioPct.toFixed(1) }}%</span>
        <span class="vm-sar__sar">{{ targetSarVal }} {{ UNIT.W_PER_KG }}</span>
        <span class="vm-sar__elysis" v-tip="tipEthr">E<sub>thr</sub> {{ targetResonanceEthr }}</span>
      </div>
      <div class="vm-sar__cell">
        <span class="vm-sar__type vm-sar__type--h">{{ $t('selectivity.hSafe') }}</span>
        <span class="vm-sar__vm vm-sar__vm--res">≈0%</span>
        <span class="vm-sar__sar">{{ healthySarVal }} {{ UNIT.W_PER_KG }}</span>
        <span class="vm-sar__elysis vm-sar__elysis--safe" v-tip="tipNoGhzRes">{{ $t('selectivity.noGhzRes') }}</span>
      </div>
    </template>
    <template v-else>
      <div class="vm-sar__cell">
        <span class="vm-sar__type vm-sar__type--t">{{ $t('selectivity.targetBar') }}-Vm</span>
        <span class="vm-sar__vm vm-sar__vm--t">{{ targetVmMv }} {{ UNIT.MV }}</span>
        <span class="vm-sar__sar">{{ targetSarVal }} {{ UNIT.W_PER_KG }}</span>
        <span class="vm-sar__elysis" v-tip="$t('selectivity.tipTargetLysisField')">E<sub>lys</sub> {{ targetLysisField }}</span>
      </div>
      <div class="vm-sar__cell">
        <span class="vm-sar__type vm-sar__type--h">{{ $t('selectivity.healthyBar') }}-Vm</span>
        <span class="vm-sar__vm vm-sar__vm--h">{{ healthyVmMv }} {{ UNIT.MV }}</span>
        <span class="vm-sar__sar">{{ healthySarVal }} {{ UNIT.W_PER_KG }}</span>
        <span class="vm-sar__elysis" v-tip="$t('selectivity.tipHealthyLysisField')">E<sub>lys</sub> {{ healthyLysisField }}</span>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useCellStore } from '@/stores/cellStore'
import { CELL_CATEGORY } from '@/constants/strings'
import { UNIT } from '@/constants/units'
import { formatFieldVcm } from '@/utils/format'

export default defineComponent({
  setup() {
    return { store: useCellStore(), UNIT }
  },

  computed: {
    isResonanceTarget(): boolean {
      const cat = this.store.targetCellCategory
      const t = this.store.target as { resonantFreqGHz?: number; resonantThresholdVcm?: number }
      return (cat === CELL_CATEGORY.VIRUS || cat === CELL_CATEGORY.BACTERIA) && !!t.resonantFreqGHz && !!t.resonantThresholdVcm
    },

    targetRatioPct(): number { return Math.min(100, this.store.targetDisruptionRatio * 100) },
    targetVmMv(): string    { return (this.store.targetVm  * 1000).toFixed(1) },
    healthyVmMv(): string   { return (this.store.healthyVm * 1000).toFixed(1) },
    targetSarVal(): string  { return this.store.targetSAR.toFixed(1) },
    healthySarVal(): string { return this.store.healthySAR.toFixed(1) },

    targetLysisField(): string  { return formatFieldVcm(this.store.targetLysisField) },
    healthyLysisField(): string { return formatFieldVcm(this.store.healthyLysisField) },

    targetResonanceEthr(): string {
      const t = this.store.target as { resonantThresholdVcm?: number }
      return t.resonantThresholdVcm ? formatFieldVcm(t.resonantThresholdVcm) : ', '
    },

    tipVmSar(): string {
      return this.isResonanceTarget
        ? this.$t('selectivity.tipVmSarResonance')
        : this.$t('selectivity.tipVmSarSchwan')
    },

    tipEthr(): string {
      return `<strong>${this.$t('selectivity.tipEthr')}</strong>\n${this.$t('selectivity.tipEthrBody')}`
    },

    tipNoGhzRes(): string {
      return `<strong>${this.$t('selectivity.tipNoGhzRes')}</strong>\n${this.$t('selectivity.tipNoGhzResBody')}`
    },
  },
})
</script>

<style lang="scss" scoped>
.vm-sar {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.45rem 0.65rem;
  cursor: default;

  &__cell { display: flex; align-items: baseline; gap: 0.35rem; flex-wrap: wrap; }

  &__type {
    font-size: 0.65rem;
    font-family: var(--font-mono);
    font-weight: 700;
    opacity: 0.85;
    flex-shrink: 0;

    &--t { color: var(--color-danger); }
    &--h { color: var(--color-primary); }
  }

  &__vm {
    font-size: 0.9rem;
    font-family: var(--font-mono);
    font-weight: 700;
    line-height: 1;

    &--t   { color: var(--color-danger); }
    &--h   { color: var(--color-primary); }
    &--res { color: var(--color-lime); }
  }

  &__sar {
    font-size: 0.62rem;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    opacity: 0.85;
    white-space: nowrap;
  }

  &__elysis {
    font-size: 0.58rem;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    opacity: 0.7;
    white-space: nowrap;
    cursor: default;

    &--safe { color: var(--color-lime); opacity: 1; }
  }
}
</style>
