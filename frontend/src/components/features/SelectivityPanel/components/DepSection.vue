<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="dep-section" v-tip="$t('selectivity.tipDep')">
    <div class="dep-section__title">{{ $t('selectivity.depTitle') }}</div>
    <div class="dep-section__row">
      <span class="dep-section__cell-lbl dep-section__cell-lbl--t">T</span>
      <span class="dep-section__badge" :class="targetBadgeClass">{{ targetLabel }}</span>
      <span class="dep-section__k" :class="targetKClass">{{ targetVal }}</span>
      <span class="dep-section__dir dep-section__meta">{{ targetDirLabel }}</span>
      <span class="dep-section__meta">{{ $t('selectivity.depCrossLabel') }} {{ targetXover }}</span>
      <span v-if="targetXover2" class="dep-section__meta dep-section__meta--xover2">/ {{ targetXover2 }}</span>
    </div>
    <div class="dep-section__row">
      <span class="dep-section__cell-lbl dep-section__cell-lbl--h">H</span>
      <span class="dep-section__badge" :class="healthyBadgeClass">{{ healthyLabel }}</span>
      <span class="dep-section__k" :class="healthyKClass">{{ healthyVal }}</span>
      <span class="dep-section__dir dep-section__meta">{{ healthyDirLabel }}</span>
      <span class="dep-section__meta">{{ $t('selectivity.depCrossLabel') }} {{ healthyXover }}</span>
      <span v-if="healthyXover2" class="dep-section__meta dep-section__meta--xover2">/ {{ healthyXover2 }}</span>
    </div>
    <div class="dep-section__scale">
      {{ $t('selectivity.depForceLabel') }}: ×{{ forceScaleLabel }}
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'

import { useCellStore } from '@/stores/cellStore'

import { formatFreqKHz } from '@/utils/format'
export default defineComponent({
  computed: {
    ...mapStores(useCellStore),

    targetVal(): string {
      const k = this.cellStore.depTargetCmReal
      return (k >= 0 ? '+' : '') + k.toFixed(3)
    },
    healthyVal(): string {
      const k = this.cellStore.depHealthyCmReal
      return (k >= 0 ? '+' : '') + k.toFixed(3)
    },

    targetLabel(): string  { return this.cellStore.depTargetCmReal  >= 0 ? this.$t('selectivity.depPdep') : this.$t('selectivity.depNdep') },
    healthyLabel(): string { return this.cellStore.depHealthyCmReal >= 0 ? this.$t('selectivity.depPdep') : this.$t('selectivity.depNdep') },

    targetBadgeClass(): string  { return this.cellStore.depTargetCmReal  >= 0 ? 'dep-section__badge--pdep' : 'dep-section__badge--ndep' },
    healthyBadgeClass(): string { return this.cellStore.depHealthyCmReal >= 0 ? 'dep-section__badge--pdep' : 'dep-section__badge--ndep' },
    targetKClass(): string      { return this.cellStore.depTargetCmReal  >= 0 ? 'dep-section__k--pdep'    : 'dep-section__k--ndep' },
    healthyKClass(): string     { return this.cellStore.depHealthyCmReal >= 0 ? 'dep-section__k--pdep'    : 'dep-section__k--ndep' },

    forceScaleLabel(): string {
      const s = this.cellStore.depForceScale
      return s >= 0.1 ? s.toFixed(2) : s.toExponential(1)
    },

    targetDirLabel(): string  { return this.cellStore.depTargetCmReal  >= 0 ? this.$t('selectivity.depPdepDir') : this.$t('selectivity.depNdepDir') },
    healthyDirLabel(): string { return this.cellStore.depHealthyCmReal >= 0 ? this.$t('selectivity.depPdepDir') : this.$t('selectivity.depNdepDir') },

    targetXover(): string  {
      const f = this.cellStore.depTargetCrossoverKHz
      return f > 0 ? formatFreqKHz(f) : this.$t('selectivity.depCrossNone')
    },
    healthyXover(): string {
      const f = this.cellStore.depHealthyCrossoverKHz
      return f > 0 ? formatFreqKHz(f) : this.$t('selectivity.depCrossNone')
    },

    targetXover2(): string {
      const f = this.cellStore.depTargetSecondCrossoverKHz
      return f > 0 ? formatFreqKHz(f) : ''
    },
    healthyXover2(): string {
      const f = this.cellStore.depHealthySecondCrossoverKHz
      return f > 0 ? formatFreqKHz(f) : ''
    },
  },
})
</script>

<style lang="scss" scoped>


.dep-section {
  @include info-panel(color-mix(in srgb, var(--color-dep) 4%, transparent), color-mix(in srgb, var(--color-dep) 15%, transparent));
  cursor: default;

  &__title { @include section-title(); }

  &__row {
    display: flex;
    align-items: baseline;
    gap: 0.35rem;
    flex-wrap: wrap;
  }

  &__cell-lbl {
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    font-weight: 700;
    width: 0.7rem;
    flex-shrink: 0;

    &--t { color: var(--color-danger); }
    &--h { color: var(--color-primary); }
  }

  &__badge {
    @include mono-upper(0.6rem, 0.07em);
    padding: 0.08rem 0.35rem;
    border-radius: 2px;
    border: 1px solid;
    flex-shrink: 0;

    &--pdep { color: var(--color-lime); border-color: color-mix(in srgb, var(--color-lime) 35%, transparent); background: color-mix(in srgb, var(--color-lime) 6%, transparent); }
    &--ndep { color: var(--color-dep); border-color: color-mix(in srgb, var(--color-dep) 35%, transparent); background: color-mix(in srgb, var(--color-dep) 6%, transparent); }
  }

  &__k {
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    font-weight: 600;

    &--pdep { color: var(--color-lime); }
    &--ndep { color: var(--color-dep); }
  }

  &__meta {
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    opacity: var(--op-dim);

    &--xover2 { opacity: var(--op-muted); }
  }

  &__scale {
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    opacity: 0.65; // intentional between-tier value
    margin-top: 0.05rem;
    padding-top: 0.18rem;
    border-top: 1px solid color-mix(in srgb, var(--color-dep) 12%, transparent);
  }
}
</style>
