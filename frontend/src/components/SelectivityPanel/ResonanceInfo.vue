<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="res-info">
    <div class="res-info__title">{{ $t('selectivity.resonanceParamsTitle') }}</div>
    <div class="res-info__row" v-tip="$t('selectivity.tipSkinDepth')">
      <span class="res-info__label">{{ $t('selectivity.skinDepthLabel') }}</span>
      <span class="res-info__val" :class="skinDepthClass">{{ skinDepthLabel }}</span>
      <span class="res-info__note">at {{ freqDisplayLabel }}</span>
    </div>
    <div class="res-info__row" v-tip="$t('selectivity.tipFresRange')">
      <span class="res-info__label">{{ $t('selectivity.fresRangeLabel') }}</span>
      <span class="res-info__val">{{ resonantFreqRange }}</span>
    </div>
    <div v-if="resonantQRange" class="res-info__row" v-tip="$t('selectivity.tipQFactor')">
      <span class="res-info__label">{{ $t('selectivity.qRangeLabel') }}</span>
      <span class="res-info__val">{{ resonantQRange }}</span>
    </div>
    <div class="res-info__row" v-tip="$t('selectivity.tipBasis')">
      <span class="res-info__label">{{ $t('selectivity.basisLabel') }}</span>
      <span class="res-info__badge" :class="basisClass">{{ basisLabel }}</span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'
import { useCellStore } from '@/stores/cellStore'
import { EXPERIMENTAL_BASIS } from '@/constants/strings'
import { formatFreqKHz } from '@/utils/format'

export default defineComponent({
  computed: {
    ...mapStores(useCellStore),

    skinDepthMm(): number { return this.cellStore.skinDepthMm },

    skinDepthLabel(): string {
      const d = this.skinDepthMm
      if (!isFinite(d)) return '∞'
      return d >= 10 ? `${d.toFixed(0)} mm` : `${d.toFixed(1)} mm`
    },

    skinDepthClass(): string {
      const d = this.skinDepthMm
      if (d >= 20) return 'res-info__val--deep'
      if (d >= 5)  return 'res-info__val--medium'
      return 'res-info__val--shallow'
    },

    freqDisplayLabel(): string {
      return formatFreqKHz(this.cellStore.currentBroadcastFrequency)
    },

    resonantFreqRange(): string {
      const t = this.cellStore.target
      const f0 = t.resonantFreqGHz
      if (!f0) return ', '
      const label = (ghz: number) => formatFreqKHz(ghz * 1e6)
      const pct = t.resonantFreqUncertaintyPct
      if (!pct) return label(f0)
      return `${label(f0 * (1 - pct / 100))} - ${label(f0 * (1 + pct / 100))}`
    },

    resonantQRange(): string {
      const t = this.cellStore.target
      if (t.capsidQMin !== undefined && t.capsidQMax !== undefined) {
        return `${t.capsidQMin} - ${t.capsidQMax}  (nominal Q = ${t.capsidQ ?? '?'})`
      }
      if (t.capsidQ !== undefined) return `${t.capsidQ}`
      return ''
    },

    basisLabel(): string {
      switch (this.cellStore.target.experimentalBasis) {
        case EXPERIMENTAL_BASIS.LASER_VALIDATED: return this.$t('selectivity.basisLaserValidated')
        case EXPERIMENTAL_BASIS.RF_EXTRAPOLATED: return this.$t('selectivity.basisRfExtrapolated')
        case EXPERIMENTAL_BASIS.SPECULATIVE:     return this.$t('selectivity.basisSpeculative')
        default:                                  return this.$t('selectivity.basisUnclassified')
      }
    },

    basisClass(): string {
      switch (this.cellStore.target.experimentalBasis) {
        case EXPERIMENTAL_BASIS.LASER_VALIDATED: return 'res-info__badge--validated'
        case EXPERIMENTAL_BASIS.RF_EXTRAPOLATED: return 'res-info__badge--extrapolated'
        default:                                  return 'res-info__badge--speculative'
      }
    },
  },
})
</script>

<style lang="scss" scoped>


.res-info {
  @include info-panel(color-mix(in srgb, var(--color-primary) 4%, transparent), color-mix(in srgb, var(--color-primary) 15%, transparent));

  &__title { @include section-title(); }

  &__row {
    display: flex;
    align-items: baseline;
    gap: 0.4rem;
    flex-wrap: wrap;
    cursor: default;
  }

  &__label {
    font-size: var(--fs-xs);
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    min-width: 5.5rem;
    flex-shrink: 0;
  }

  &__val {
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    font-weight: 600;
    color: var(--color-text);

    &--deep    { color: var(--color-lime); }
    &--medium  { color: var(--color-amber); }
    &--shallow { color: var(--color-danger); }
  }

  &__note {
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    color: var(--color-text-muted);
  }

  &__badge {
    @include mono-upper(0.62rem, 0.07em);
    padding: 0.1rem 0.4rem;
    border-radius: 2px;
    border: 1px solid;

    &--validated    { color: var(--color-lime);   border-color: color-mix(in srgb, var(--color-lime)   30%, transparent); background: color-mix(in srgb, var(--color-lime)   6%, transparent); }
    &--extrapolated { color: var(--color-amber);  border-color: color-mix(in srgb, var(--color-amber)  30%, transparent); background: color-mix(in srgb, var(--color-amber)  6%, transparent); }
    &--speculative  { color: var(--color-danger); border-color: color-mix(in srgb, var(--color-danger) 30%, transparent); background: color-mix(in srgb, var(--color-danger) 6%, transparent); }
  }
}
</style>
