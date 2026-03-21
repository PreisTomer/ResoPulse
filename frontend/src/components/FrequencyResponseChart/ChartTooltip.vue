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

  setup() {
    return { formatTooltipFreq, CELL_LABEL, UNIT }
  },
})
</script>

<style lang="scss" scoped>
@use '../../styles/mixins' as *;

$amber: #fbbf24;
$lime:  #4ade80;

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
    font-size: 0.68rem;
    font-family: var(--font-mono);
    color: var(--color-text);
    margin-bottom: 0.2rem;
    letter-spacing: 0.03em;
  }

  &__row {
    font-size: 0.68rem;
    font-family: var(--font-mono);
    display: flex;
    align-items: baseline;
    gap: 0.45rem;

    &--h { color: var(--color-primary); }
    &--t { color: var(--color-danger); }
  }

  &__dr {
    font-size: 0.58rem;
    opacity: 0.65;
    font-family: var(--font-mono);
  }

  &__sel {
    font-size: 0.62rem;
    font-family: var(--font-mono);
    color: $amber;
    opacity: 0.85;
    margin-top: 0.18rem;
  }

  &__window {
    font-size: 0.62rem;
    font-family: var(--font-mono);
    color: $lime;
    font-weight: 600;
    letter-spacing: 0.05em;
    margin-top: 0.2rem;
    padding-top: 0.2rem;
    border-top: 1px solid rgba(74, 222, 128, 0.25);
  }
}
</style>

<style>
.tip-enter-active, .tip-leave-active { transition: opacity 0.1s; }
.tip-enter-from, .tip-leave-to { opacity: 0; }
</style>
