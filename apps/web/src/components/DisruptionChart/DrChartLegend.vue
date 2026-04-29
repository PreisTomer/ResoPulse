<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="dr-legend">
    <span class="dr-legend__item dr-legend__item--target">{{ $t('drChart.legendTarget') }}</span>
    <span class="dr-legend__item dr-legend__item--healthy">{{ $t('drChart.legendHealthy') }}</span>
    <span class="dr-legend__item dr-legend__item--revep">{{ $t('drChart.legendRevEp') }}</span>
    <span class="dr-legend__item dr-legend__item--lysis">{{ $t('drChart.legendLysis') }}</span>
    <span class="dr-legend__item dr-legend__item--window">{{ $t('drChart.legendWindow') }}</span>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({})
</script>

<style lang="scss" scoped>


.dr-legend {
  @include flex-row(0.9rem);
  flex-wrap: wrap;

  &__item {
    @include mono-upper(var(--fs-xs), 0.05em);
    display: flex;
    align-items: center;
    gap: 0.3rem;

    &::before {
      content: '';
      display: inline-block;
      width: 14px;
      height: 2px;
      border-radius: 1px;
    }

    &--target::before  { background: var(--color-danger); }
    &--healthy::before { background: var(--color-primary); }

    &--revep {
      color: var(--color-amber);
      &::before {
        background: transparent;
        border-top: 2px dashed var(--color-amber);
        height: 0;
      }
    }

    &--lysis {
      color: var(--color-danger);
      &::before {
        background: transparent;
        border-top: 2px dashed var(--color-danger);
        height: 0;
      }
    }

    &--window {
      color: color-mix(in srgb, var(--color-lime) 80%, transparent);
      &::before {
        height: 8px;
        border-radius: 2px;
        background: color-mix(in srgb, var(--color-lime) 25%, transparent);
        border: 1px solid color-mix(in srgb, var(--color-lime) 50%, transparent);
      }
    }
  }
}
</style>
