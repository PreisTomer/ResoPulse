<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div v-if="windowRange" class="sweep-window" v-tip="tipWindow">
    <span class="sweep-window__label">{{ $t('sweep.windowLabel') }}</span>
    <span class="sweep-window__val">
      {{ windowRange.lo.toFixed(0) }} - {{ windowRange.hi.toFixed(0) }}
      {{ sweepParam === 'field' ? $t('sweep.fieldUnit') : $t('sweep.freqUnit') }}
    </span>
    <span class="sweep-window__sub" v-html="$t('sweep.windowSub')"></span>
  </div>

  <div v-else class="sweep-window sweep-window--none" v-tip="tipNoWindow">
    <template v-if="recommendedMax !== null">
      <span>{{ $t('sweep.windowNoneRange', { max: recommendedMax, unit: sweepParam === 'field' ? $t('sweep.fieldUnit') : $t('sweep.freqUnit') }) }}</span>
      <button class="sweep-window__expand" @click="$emit('expand', recommendedMax)">
        {{ $t('sweep.windowExpandBtn') }}
      </button>
    </template>
    <template v-else>
      <span>{{ $t('sweep.windowNoneImpossible', { ti: bestTIPoint ? bestTIPoint.ti.toFixed(2) : '—' }) }}</span>
    </template>
    <span v-if="bestTIPoint" class="sweep-window__best-ti">
      {{ $t('sweep.windowBestTI', {
        ti:   bestTIPoint.ti.toFixed(2),
        x:    bestTIPoint.x.toFixed(0),
        drT:  (bestTIPoint.drT * 100).toFixed(0),
        unit: sweepParam === 'field' ? $t('sweep.fieldUnit') : $t('sweep.freqUnit'),
      }) }}
    </span>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import { UNIT } from '@/constants/units'
import { tipWindow, tipNoWindow } from '@/tooltips/sweepTooltips'

interface SweepPoint {
  x: number; drH: number; drT: number; ti: number; tH: number; tT: number
}

export default defineComponent({
  props: {
    windowRange:    { type: Object as PropType<{ lo: number; hi: number } | null>, default: null },
    sweepParam:     { type: String as () => 'field' | 'freq', required: true },
    recommendedMax: { type: Number as PropType<number | null>, default: null },
    bestTIPoint:    { type: Object as PropType<SweepPoint | null>, default: null },
  },
  emits: ['expand'],

  computed: {
    tipWindow(): string {
      const wr = this.windowRange
      if (!wr) return ''
      return tipWindow({
        loStr:  wr.lo.toFixed(0),
        hiStr:  wr.hi.toFixed(0),
        center: ((wr.lo + wr.hi) / 2).toFixed(0),
        unit:   this.sweepParam === 'field' ? UNIT.V_PER_CM : UNIT.KHZ,
      })
    },
    tipNoWindow(): string { return tipNoWindow(this.sweepParam === 'field') },
  },
})
</script>

<style lang="scss" scoped>
@use '../../styles/mixins' as *;

.sweep-window {
  @include flex-row(0.6rem);
  align-items: center;
  flex-wrap: wrap;
  padding: 0.5rem 0.75rem;
  background: rgba(34, 197, 94, 0.06);
  border: 1px solid rgba(34, 197, 94, 0.25);
  border-radius: var(--radius);
  font-size: 0.78rem;
  gap: 0.4rem 0.7rem;

  &--none {
    background: rgba(255, 255, 255, 0.03);
    border-color: var(--color-border);
    color: var(--color-text-muted);
    font-style: italic;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.35rem;
  }

  &__label {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    color: var(--color-text-muted);
  }

  &__val {
    font-family: var(--font-mono);
    font-size: 0.82rem;
    color: rgb(34, 197, 94);
    font-weight: 600;
  }

  &__sub { font-size: 0.72rem; color: var(--color-text-muted); }

  &__expand {
    padding: 0.18rem 0.6rem;
    background: var(--color-primary-surface);
    border: 1px solid var(--color-primary-border);
    border-radius: 4px;
    color: var(--color-primary);
    font-family: var(--font-mono);
    font-size: 0.67rem;
    font-style: normal;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;

    &:hover {
      background: rgba(0, 212, 255, 0.20);
      border-color: rgba(0, 212, 255, 0.60);
    }
  }

  &__best-ti {
    font-size: 0.66rem;
    font-style: normal;
    color: var(--color-text-muted);
    opacity: 0.8;
  }
}
</style>
