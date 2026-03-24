<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="sweep-ctrl">

    <div class="sweep-ctrl__group">
      <span class="sweep-ctrl__label" v-tip="$t('sweep.tipSweepLabel')">{{ $t('sweep.ctrlSweepLabel') }}</span>
      <div class="sweep-ctrl__pills">
        <button
          class="sweep-ctrl__pill"
          :class="{ 'sweep-ctrl__pill--active': sweepParam === 'field' }"
          v-tip="$t('sweep.tipFieldPill')"
          @click="$emit('param-change', { param: 'field', max: 1000 })"
        >{{ $t('sweep.sweepFieldPill') }}</button>
        <button
          class="sweep-ctrl__pill"
          :class="{ 'sweep-ctrl__pill--active': sweepParam === 'freq' }"
          v-tip="$t('sweep.tipFreqPill')"
          @click="$emit('param-change', { param: 'freq', max: defaultFreqMax })"
        >{{ $t('sweep.sweepFreqPill') }}</button>
      </div>
    </div>

    <div class="sweep-ctrl__group">
      <span class="sweep-ctrl__label" v-tip="tipMaxLabel">{{ $t('sweep.ctrlMaxLabel') }}</span>
      <input
        class="sweep-ctrl__input"
        type="number"
        :value="sweepMax"
        v-tip="tipMaxLabel"
        :step="sweepParam === 'field' ? 100 : 1000"
        :min="sweepParam === 'field' ? 100 : 100"
        @input="onMaxInput"
      />
      <span class="sweep-ctrl__unit">{{ sweepParam === 'field' ? $t('sweep.fieldUnit') : $t('sweep.freqUnit') }}</span>
    </div>

    <button class="sweep-ctrl__export" v-tip="$t('sweep.tipExport')" @click="$emit('export')">
      {{ $t('sweep.exportBtn') }}
    </button>

  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { UNIT } from '@/constants/units'

export default defineComponent({
  props: {
    sweepParam:     { type: String as () => 'field' | 'freq', required: true },
    sweepMax:       { type: Number, required: true },
    defaultFreqMax: { type: Number, required: true },
  },
  emits: ['param-change', 'max-change', 'export'],

  computed: {
    tipMaxLabel(): string {
      const unit = this.sweepParam === 'field' ? UNIT.V_PER_CM : UNIT.KHZ
      return this.$t('sweep.tipMaxLabel', { unit })
    },
  },

  methods: {
    onMaxInput(e: Event) {
      const v = +(e.target as HTMLInputElement).value
      if (v > 0) this.$emit('max-change', v)
    },
  },
})
</script>

<style lang="scss" scoped>


.sweep-ctrl {
  @include flex-row(1rem);
  align-items: center;
  flex-wrap: wrap;
  gap: 0.6rem 1rem;

  &__group {
    @include flex-row(0.5rem);
    align-items: center;
  }

  &__label {
    font-size: var(--fs-sm);
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    white-space: nowrap;
    cursor: help;
  }

  &__unit {
    font-size: var(--fs-sm);
    font-family: var(--font-mono);
    color: var(--color-text-muted);
  }

  &__pills { @include flex-row(0.3rem); }

  &__pill {
    @include mono-upper(0.72rem, 0);
    padding: 0.25rem 0.6rem;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: all 0.15s;

    &--active {
      border-color: var(--color-primary);
      color: var(--color-primary);
      background: var(--color-primary-dim);
    }

    &:hover:not(&--active) {
      border-color: color-mix(in srgb, white 20%, transparent);
      color: var(--color-text);
    }
  }

  &__input {
    width: 80px;
    padding: 0.22rem 0.45rem;
    font-size: var(--fs-sm);
    font-family: var(--font-mono);
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    color: var(--color-text);
    text-align: right;
    outline: none;

    &:focus { border-color: var(--color-primary); }
  }

  &__export {
    margin-left: auto;
    @include mono-upper(0.72rem, 0);
    padding: 0.28rem 0.7rem;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: all 0.15s;

    &:hover { border-color: var(--color-primary); color: var(--color-primary); }
  }
}
</style>
