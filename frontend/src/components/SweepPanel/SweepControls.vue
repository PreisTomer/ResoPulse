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
          @click="$emit(EMIT.PARAM_CHANGE, { param: 'field', max: 1000 })"
        >{{ $t('sweep.sweepFieldPill') }}</button>
        <button
          class="sweep-ctrl__pill"
          :class="{ 'sweep-ctrl__pill--active': sweepParam === 'freq' }"
          v-tip="$t('sweep.tipFreqPill')"
          @click="$emit(EMIT.PARAM_CHANGE, { param: 'freq', max: defaultFreqMax })"
        >{{ $t('sweep.sweepFreqPill') }}</button>
      </div>
    </div>

    <div class="sweep-ctrl__group">
      <span class="sweep-ctrl__label" v-tip="tipMaxLabel">{{ $t('sweep.ctrlMaxLabel') }}</span>
      <input
        class="sweep-ctrl__input"
        type="number"
        :value="sweepParam === 'field' ? sweepMax : freqDisplayValue"
        v-tip="tipMaxLabel"
        :step="sweepParam === 'field' ? 100 : freqInputStep"
        :min="sweepParam === 'field' ? 100 : freqInputMin"
        @input="onMaxInput"
      />
      <span class="sweep-ctrl__unit">{{ sweepParam === 'field' ? $t('sweep.fieldUnit') : freqUnit }}</span>
    </div>

    <button class="sweep-ctrl__export" v-tip="$t('sweep.tipExport')" @click="$emit(EMIT.EXPORT)">
      {{ $t('sweep.exportBtn') }}
    </button>

  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { splitFreqKHz } from '@/utils/format'

import { UNIT } from '@/constants/units'
import { EMIT } from '@/constants/emitEvents'

export default defineComponent({
  props: {
    sweepParam:     { type: String as () => 'field' | 'freq', required: true },
    sweepMax:       { type: Number, required: true },
    defaultFreqMax: { type: Number, required: true },
  },
  emits: [EMIT.PARAM_CHANGE, EMIT.MAX_CHANGE, EMIT.EXPORT],

  computed: {
    EMIT() { return EMIT },

    // Unit string (kHz / MHz / GHz) anchored to defaultFreqMax so it stays stable while typing
    freqUnit(): string {
      return splitFreqKHz(this.defaultFreqMax).unit
    },

    // Multiplicative factor: display unit → kHz (e.g. GHz → 1_000_000)
    freqUnitFactor(): number {
      if (this.freqUnit === UNIT.GHZ) return 1_000_000
      if (this.freqUnit === UNIT.MHZ) return 1_000
      return 1
    },

    // sweepMax expressed in the display unit for the input :value binding
    freqDisplayValue(): number {
      return this.sweepMax / this.freqUnitFactor
    },

    // Step size in display unit: 0.1 GHz / 1 MHz / 100 kHz
    freqInputStep(): number {
      if (this.freqUnit === UNIT.GHZ) return 0.1
      if (this.freqUnit === UNIT.MHZ) return 1
      return 100
    },

    // Minimum input value in display unit (corresponds to 100 kHz absolute minimum)
    freqInputMin(): number {
      return 100 / this.freqUnitFactor
    },

    tipMaxLabel(): string {
      const unit = this.sweepParam === 'field' ? UNIT.V_PER_CM : this.freqUnit
      return this.$t('sweep.tipMaxLabel', { unit })
    },
  },

  methods: {
    onMaxInput(e: Event) {
      const v = +(e.target as HTMLInputElement).value
      if (v <= 0) return
      // Convert display-unit value back to kHz before emitting
      const kHz = this.sweepParam === 'field' ? v : v * this.freqUnitFactor
      this.$emit(EMIT.MAX_CHANGE, kHz)
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
    transition: border-color var(--tr-fast), color var(--tr-fast), background var(--tr-fast);

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
    transition: border-color var(--tr-fast), color var(--tr-fast), background var(--tr-fast);

    &:hover { border-color: var(--color-primary); color: var(--color-primary); }
  }
}
</style>
