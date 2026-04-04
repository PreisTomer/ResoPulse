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
    <!-- Pulse energy dose row (always shown) -->
    <div class="vm-sar__dose-row" v-tip="$t('selectivity.tipEnergyDose')">
      <span class="vm-sar__dose-label">{{ $t('selectivity.energyDoseLabel') }}</span>
      <span class="vm-sar__dose-val">{{ energyDoseDisplay }}</span>
      <span class="vm-sar__dose-unit">{{ UNIT.MJ_PER_CM3 }}</span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'

import { useCellStore } from '@/stores/cellStore'

import { formatFieldVcm, formatLysisFieldVcm } from '@/utils/format'

import { CELL_CATEGORY } from '@/constants/strings'
import { UNIT } from '@/constants/units'

export default defineComponent({
  computed: {
    ...mapStores(useCellStore),
    UNIT() { return UNIT },
    isResonanceTarget(): boolean {
      const cat = this.cellStore.targetCellCategory
      const t = this.cellStore.target as { resonantFreqGHz?: number; resonantThresholdVcm?: number }
      return (cat === CELL_CATEGORY.VIRUS || cat === CELL_CATEGORY.BACTERIA) && !!t.resonantFreqGHz && !!t.resonantThresholdVcm && this.cellStore.isResonanceMode
    },

    targetRatioPct(): number { return Math.min(100, this.cellStore.targetDisruptionRatio * 100) },
    targetVmMv(): string    { return (this.cellStore.targetVm  * 1000).toFixed(1) },
    healthyVmMv(): string   { return (this.cellStore.healthyVm * 1000).toFixed(1) },
    targetSarVal(): string  { return (this.cellStore.targetSAR  * this.cellStore.effectiveDutyCycle).toFixed(2) },
    healthySarVal(): string { return (this.cellStore.healthySAR * this.cellStore.effectiveDutyCycle).toFixed(2) },

    targetLysisField(): string  { return formatLysisFieldVcm(this.cellStore.targetLysisField) },
    healthyLysisField(): string { return formatLysisFieldVcm(this.cellStore.healthyLysisField) },

    targetResonanceEthr(): string {
      const t = this.cellStore.target as { resonantThresholdVcm?: number }
      return t.resonantThresholdVcm ? formatFieldVcm(t.resonantThresholdVcm) : ', '
    },

    tipVmSar(): string {
      return this.isResonanceTarget
        ? this.$t('selectivity.tipVmSarResonance')
        : this.$t('selectivity.tipVmSarSchwan')
    },

    tipEthr():      string { return this.$t('selectivity.tipEthrFull') },
    tipNoGhzRes():  string { return this.$t('selectivity.tipNoGhzResFull') },

    energyDoseDisplay(): string {
      const e = this.cellStore.pulsedEnergyDensity_mJcm3
      if (e >= 1000) return (e / 1000).toFixed(2) + 'k'
      if (e >= 10)   return e.toFixed(2)
      if (e >= 0.01) return e.toFixed(4)
      return e.toExponential(2)
    },
  },
})
</script>

<style lang="scss" scoped>
.vm-sar {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  background: color-mix(in srgb, black 20%, transparent);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.45rem 0.65rem;
  cursor: default;

  &__cell { display: flex; align-items: baseline; gap: 0.35rem; flex-wrap: wrap; }

  &__type {
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    font-weight: 700;
    opacity: 0.85; // intentional between-tier value
    flex-shrink: 0;

    &--t { color: var(--color-danger); }
    &--h { color: var(--color-primary); }
  }

  &__vm {
    font-size: var(--fs-xl);
    font-family: var(--font-mono);
    font-weight: 700;
    line-height: 1;

    &--t   { color: var(--color-danger); }
    &--h   { color: var(--color-primary); }
    &--res { color: var(--color-lime); }
  }

  &__sar {
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    opacity: 0.85; // intentional between-tier value
    white-space: nowrap;
  }

  &__elysis {
    font-size: var(--fs-xs);
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    opacity: var(--op-dim);
    white-space: nowrap;
    cursor: default;

    &--safe { color: var(--color-lime); opacity: 1; }
  }

  &__dose-row {
    grid-column: 1 / -1;
    display: flex;
    align-items: baseline;
    gap: 0.4rem;
    padding-top: 0.3rem;
    border-top: 1px solid var(--color-border);
    cursor: default;
  }

  &__dose-label {
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-text-muted);
    opacity: var(--op-muted);
    flex-shrink: 0;
  }

  &__dose-val {
    font-size: var(--fs-sm);
    font-family: var(--font-mono);
    font-weight: 600;
    color: var(--color-purple);
  }

  &__dose-unit {
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    opacity: var(--op-muted);
  }
}
</style>
