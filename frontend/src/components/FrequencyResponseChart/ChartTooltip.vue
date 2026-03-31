<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <Transition name="tip">
    <div
      v-if="data"
      class="chart-tooltip"
      :class="{ 'chart-tooltip--flip': data.flipLeft }"
      :style="{ left: (data.x + 54) + 'px' }"
    >
      <div class="chart-tooltip__freq">{{ formatTooltipFreq(data.freqHz) }}</div>
      <template v-if="data.mode === 'schwan'">
        <div class="chart-tooltip__row chart-tooltip__row--h">
          {{ CELL_LABEL.HEALTHY }} {{ data.healthyVm.toFixed(2) }} {{ UNIT.MV }}
          <span class="chart-tooltip__dr">DR {{ data.healthyDRPct.toFixed(1) }}%</span>
        </div>
        <div class="chart-tooltip__row chart-tooltip__row--t">
          {{ CELL_LABEL.TARGET }} {{ data.targetVm.toFixed(2) }} {{ UNIT.MV }}
          <span class="chart-tooltip__dr">DR {{ data.targetDRPct.toFixed(1) }}%</span>
        </div>
        <div class="chart-tooltip__sel">
          {{ $t('chart.tooltipSel') }} {{ data.selRatio.toFixed(2) }}×
        </div>
        <div v-if="data.depHealthyK !== undefined && data.depTargetK !== undefined" class="chart-tooltip__dep">
          <span class="chart-tooltip__dep-row chart-tooltip__dep-row--h">
            {{ $t('chart.tooltipDepH') }} <span :class="depKClass(data.depHealthyK)">{{ depKLabel(data.depHealthyK) }} {{ data.depHealthyK.toFixed(3) }}</span>
          </span>
          <span class="chart-tooltip__dep-row chart-tooltip__dep-row--t">
            {{ $t('chart.tooltipDepT') }} <span :class="depKClass(data.depTargetK)">{{ depKLabel(data.depTargetK) }} {{ data.depTargetK.toFixed(3) }}</span>
          </span>
          <span v-if="isDepSeparation(data.depHealthyK, data.depTargetK)" class="chart-tooltip__dep-sep">
            {{ $t('chart.tooltipDepSep') }}
          </span>
        </div>
        <div v-if="data.inWindow" class="chart-tooltip__window">
          {{ $t('chart.tooltipWindow') }}
        </div>
      </template>
      <template v-else>
        <div class="chart-tooltip__row chart-tooltip__row--t">{{ $t('chart.tooltipDR') }} {{ (data.targetDR * 100).toFixed(1) }}%</div>
        <div class="chart-tooltip__row chart-tooltip__row--h">{{ $t('chart.tooltipNoRes') }}</div>
      </template>
    </div>
  </Transition>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import type { PropType } from 'vue'
import { formatTooltipFreq } from './chartCompute'
import type { TooltipData } from './chartCompute'
import { CELL_LABEL } from '@/constants/strings'
import { UNIT } from '@/constants/units'

export default defineComponent({
  props: {
    data: {
      type: Object as PropType<TooltipData | null>,
      default: null,
    },
  },

  computed: {
    CELL_LABEL() { return CELL_LABEL },
    UNIT()       { return UNIT },
    formatTooltipFreq(): typeof formatTooltipFreq { return formatTooltipFreq },
  },

  methods: {
    depKLabel(k: number): string { return k >= 0 ? 'pDEP' : 'nDEP' },
    depKClass(k: number): string { return k >= 0 ? 'chart-tooltip__dep-pdep' : 'chart-tooltip__dep-ndep' },
    isDepSeparation(kH: number, kT: number): boolean { return (kH >= 0) !== (kT >= 0) },  // opposite regimes = cells migrate apart
  },
})
</script>

<style lang="scss" scoped>


.chart-tooltip {
  position: absolute;
  top: 32px;
  transform: translateX(-50%);
  background: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 0.35rem 0.6rem;
  pointer-events: none;
  z-index: 10;
  white-space: nowrap;

  &--flip {
    transform: translateX(-110%);
  }

  &__freq {
    font-size: var(--fs-xs);
    font-family: var(--font-mono);
    color: var(--color-text);
    margin-bottom: 0.2rem;
    letter-spacing: 0.03em;
  }

  &__row {
    font-size: var(--fs-xs);
    font-family: var(--font-mono);
    display: flex;
    align-items: baseline;
    gap: 0.45rem;

    &--h { color: var(--color-primary); }
    &--t { color: var(--color-danger); }
  }

  &__dr {
    font-size: var(--fs-xs);
    opacity: 0.65;
    font-family: var(--font-mono);
  }

  &__sel {
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    color: var(--color-amber);
    opacity: 0.85;
    margin-top: 0.18rem;
  }

  &__window {
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    color: var(--color-lime);
    font-weight: 600;
    letter-spacing: 0.05em;
    margin-top: 0.2rem;
    padding-top: 0.2rem;
    border-top: 1px solid color-mix(in srgb, var(--color-ok) 25%, transparent);
  }

  &__dep {
    @include flex-col(0.08rem);
    margin-top: 0.18rem;
    padding-top: 0.18rem;
    border-top: 1px solid color-mix(in srgb, var(--color-dep) 18%, transparent);
  }

  &__dep-row {
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    display: flex;
    gap: 0.35rem;
    align-items: baseline;

    &--h { color: var(--color-text-muted); }
    &--t { color: var(--color-text-muted); }
  }

  &__dep-pdep { color: var(--color-lime); }
  &__dep-ndep { color: var(--color-dep); }

  &__dep-sep {
    @include mono-upper(0.48rem, 0.07em);
    color: var(--color-dep);
    margin-top: 0.1rem;
    opacity: var(--op-dim);
  }
}
</style>

<style>
.tip-enter-active, .tip-leave-active { transition: opacity 0.1s; }
.tip-enter-from, .tip-leave-to { opacity: 0; }
</style>
