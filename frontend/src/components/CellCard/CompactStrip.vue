<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="compact-strip">
    <div class="compact-strip__top">
      <span :class="['compact-strip__badge', `compact-strip__badge--${type}`]">
        {{ type === CELL_TYPE.HEALTHY ? 'H' : 'T' }}
      </span>
      <span :class="['compact-strip__dr', `compact-strip__dr--${cellState}`]">
        DR&nbsp;{{ (disruptionRatio * 100).toFixed(0) }}%
      </span>
      <span class="compact-strip__sep">·</span>
      <span class="compact-strip__temp">{{ temperature.toFixed(1) }}{{ UNIT.DEG_C }}</span>
    </div>
    <div class="compact-strip__bottom">
      <span :class="['compact-strip__dot', `compact-strip__dot--${cellState}`]">{{ ICON.DOT }}</span>
      <span :class="['compact-strip__state', `compact-strip__state--${cellState}`]">
        {{ compactStateLabel }}
      </span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import type { PropType } from 'vue'

import { CELL_STATE, CELL_TYPE } from '@/constants/strings'
import { ICON } from '@/constants/icons'
import { UNIT } from '@/constants/units'

import type { CellState } from '@/types/cell'

export default defineComponent({
  props: {
    type:            { type: String as PropType<'healthy' | 'target'>, required: true },
    cellState:       { type: String as PropType<CellState>, required: true },
    disruptionRatio: { type: Number, required: true },
    temperature:     { type: Number, required: true },
  },

  computed: {
    CELL_TYPE() { return CELL_TYPE },
    ICON()      { return ICON },
    UNIT()      { return UNIT },

    compactStateLabel(): string {
      const keyMap: Record<string, string> = {
        [CELL_STATE.STABLE]:      'stable',
        [CELL_STATE.NOURISHING]:  'nourishing',
        [CELL_STATE.APPROACHING]: 'approaching',
        [CELL_STATE.REV_EP]:      'revEp',
        [CELL_STATE.CRITICAL]:    'critical',
        [CELL_STATE.VIBRATING]:   'vibrating',
        [CELL_STATE.LYSING]:      'lysing',
        [CELL_STATE.LYSED]:       'lysed',
      }
      const key = keyMap[this.cellState]
      return key ? (this.$t(`cells.compactStates.${key}`) as string) : ''
    },
  },
})
</script>

<style lang="scss" scoped>
.compact-strip {
  @include flex-col(0.2rem);
  padding: 0.45rem 0.5rem 0.3rem;
  font-family: var(--font-mono);
  font-size: 1.05rem;

  &__top    { @include flex-row(0.45rem); white-space: nowrap; }
  &__bottom { @include flex-row(0.35rem); padding-left: 0.1rem; }

  &__badge {
    font-size: 1.0rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    padding: 0.1rem 0.4rem;
    border-radius: 3px;
    line-height: 1.4;

    &--healthy { background: color-mix(in srgb, var(--color-primary) 15%, transparent); color: var(--color-primary); }
    &--target  { background: color-mix(in srgb, var(--color-danger) 15%, transparent);  color: var(--color-danger); }
  }

  &__dr {
    font-size: 1.05rem;
    font-weight: 600;
    color: var(--color-text-muted);

    &--nourishing  { color: var(--color-primary); }
    &--approaching { color: var(--color-amber); }
    &--rev-ep      { color: var(--color-amber); }
    &--critical    { color: var(--color-danger); }
    &--vibrating   { color: var(--color-danger); }
    &--lysing      { color: var(--color-danger); }
    &--lysed       { color: color-mix(in srgb, var(--color-danger) 60%, transparent); }
  }

  &__sep  { color: var(--color-text-muted); opacity: 0.45; font-size: var(--fs-xl); }
  &__temp { font-size: 1.0rem; color: var(--color-text-muted); opacity: var(--op-partial); }

  &__dot {
    font-size: var(--fs-sm);
    color: var(--color-text-muted);

    &--nourishing  { color: var(--color-primary); }
    &--approaching { color: var(--color-amber); }
    &--rev-ep      { color: var(--color-amber); }
    &--critical    { color: var(--color-danger); }
    &--vibrating   { color: var(--color-danger); animation: warn-fade 0.8s ease-in-out infinite; }
    &--lysing      { color: var(--color-danger); animation: warn-fade 0.5s ease-in-out infinite; }
    &--lysed       { color: color-mix(in srgb, var(--color-danger) 50%, transparent); }
  }

  &__state {
    font-size: var(--fs-xl);
    letter-spacing: 0.1em;
    color: var(--color-text-muted);

    &--nourishing  { color: var(--color-primary); }
    &--approaching { color: var(--color-amber); }
    &--rev-ep      { color: var(--color-amber); }
    &--critical    { color: var(--color-danger); }
    &--vibrating   { color: var(--color-danger); font-weight: 600; }
    &--lysing      { color: var(--color-danger); font-weight: 600; }
    &--lysed       { color: color-mix(in srgb, var(--color-danger) 60%, transparent); }
  }
}
</style>
