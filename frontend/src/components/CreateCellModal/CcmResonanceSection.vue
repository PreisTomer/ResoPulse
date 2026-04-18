<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="ccm-resonance">
    <div class="ccm-resonance__title">
      {{ $t('userPresets.resonanceSectionTitle') }}
      <span class="ccm-resonance__sub">{{ $t('userPresets.resonanceSectionSub') }}</span>
    </div>

    <div class="ccm-resonance__grid">

      <!-- Resonant frequency -->
      <div class="ccm-resonance__field">
        <label class="ccm-resonance__label">
          {{ $t('userPresets.fieldResFreq') }}
          <span class="ccm-resonance__unit">{{ UNIT.GHZ }}</span>
          <button class="ccm-resonance__tip-btn" @click="$emit(EMIT.SHOW_TIP, 'resFreq')">?</button>
        </label>
        <input
          :value="form.resonantFreqGHz"
          class="ccm-resonance__input"
          type="number"
          step="0.01"
          min="0.001"
          max="1000"
          @input="onNumericInput('resonantFreqGHz', $event)"
        />
        <span class="ccm-resonance__sub-hint">{{ $t('userPresets.fieldResFreqSub') }}</span>
      </div>

      <!-- Quality factor -->
      <div class="ccm-resonance__field">
        <label class="ccm-resonance__label">
          {{ $t('userPresets.fieldCapsidQ') }}
          <button class="ccm-resonance__tip-btn" @click="$emit(EMIT.SHOW_TIP, 'capsidQ')">?</button>
        </label>
        <input
          :value="form.capsidQ"
          class="ccm-resonance__input"
          type="number"
          step="1"
          min="1"
          max="100"
          @input="onNumericInput('capsidQ', $event)"
        />
        <span class="ccm-resonance__sub-hint">{{ $t('userPresets.fieldCapsidQSub') }}</span>
      </div>

      <!-- Resonance threshold -->
      <div class="ccm-resonance__field">
        <label class="ccm-resonance__label">
          {{ $t('userPresets.fieldResThr') }}
          <span class="ccm-resonance__unit">{{ UNIT.V_PER_CM }}</span>
          <button class="ccm-resonance__tip-btn" @click="$emit(EMIT.SHOW_TIP, 'resThr')">?</button>
        </label>
        <input
          :value="form.resonantThresholdVcm"
          class="ccm-resonance__input"
          type="number"
          step="100"
          min="10"
          max="100000"
          @input="onNumericInput('resonantThresholdVcm', $event)"
        />
        <span class="ccm-resonance__sub-hint">{{ $t('userPresets.fieldResThrSub') }}</span>
      </div>

      <!-- f_res uncertainty band (±%) -->
      <div class="ccm-resonance__field">
        <label class="ccm-resonance__label">
          {{ $t('userPresets.fieldResFreqUnc') }}
          <span class="ccm-resonance__unit">%</span>
          <button class="ccm-resonance__tip-btn" @click="$emit(EMIT.SHOW_TIP, 'resFreqUnc')">?</button>
        </label>
        <input
          :value="form.resonantFreqUncertaintyPct"
          class="ccm-resonance__input"
          type="number"
          step="1"
          min="0"
          max="80"
          @input="onNumericInput('resonantFreqUncertaintyPct', $event)"
        />
        <span class="ccm-resonance__sub-hint">{{ $t('userPresets.fieldResFreqUncSub') }}</span>
      </div>

      <!-- Q lower bound (uncertainty) -->
      <div class="ccm-resonance__field">
        <label class="ccm-resonance__label">
          {{ $t('userPresets.fieldCapsidQMin') }}
          <button class="ccm-resonance__tip-btn" @click="$emit(EMIT.SHOW_TIP, 'capsidQMin')">?</button>
        </label>
        <input
          :value="form.capsidQMin"
          class="ccm-resonance__input"
          type="number"
          step="0.5"
          min="1"
          max="100"
          @input="onNumericInput('capsidQMin', $event)"
        />
        <span class="ccm-resonance__sub-hint">{{ $t('userPresets.fieldCapsidQMinSub') }}</span>
      </div>

      <!-- Q upper bound (uncertainty) -->
      <div class="ccm-resonance__field">
        <label class="ccm-resonance__label">
          {{ $t('userPresets.fieldCapsidQMax') }}
          <button class="ccm-resonance__tip-btn" @click="$emit(EMIT.SHOW_TIP, 'capsidQMax')">?</button>
        </label>
        <input
          :value="form.capsidQMax"
          class="ccm-resonance__input"
          type="number"
          step="0.5"
          min="1"
          max="100"
          @input="onNumericInput('capsidQMax', $event)"
        />
        <span class="ccm-resonance__sub-hint">{{ $t('userPresets.fieldCapsidQMaxSub') }}</span>
      </div>

      <!-- Secondary mode frequency (optional) -->
      <div class="ccm-resonance__field">
        <label class="ccm-resonance__label">
          {{ $t('userPresets.fieldResFreq2') }}
          <span class="ccm-resonance__unit">{{ UNIT.GHZ }}</span>
          <button class="ccm-resonance__tip-btn" @click="$emit(EMIT.SHOW_TIP, 'resFreq2')">?</button>
        </label>
        <input
          :value="form.resonantFreqGHz2"
          class="ccm-resonance__input"
          type="number"
          step="0.01"
          min="0"
          max="1000"
          @input="onNumericInput('resonantFreqGHz2', $event)"
        />
        <span class="ccm-resonance__sub-hint">{{ $t('userPresets.fieldResFreq2Sub') }}</span>
      </div>

      <!-- Secondary mode Q (optional, defaults to primary Q when blank) -->
      <div class="ccm-resonance__field">
        <label class="ccm-resonance__label">
          {{ $t('userPresets.fieldCapsidQ2') }}
          <button class="ccm-resonance__tip-btn" @click="$emit(EMIT.SHOW_TIP, 'capsidQ2')">?</button>
        </label>
        <input
          :value="form.capsidQ2"
          class="ccm-resonance__input"
          type="number"
          step="1"
          min="1"
          max="100"
          @input="onNumericInput('capsidQ2', $event)"
        />
        <span class="ccm-resonance__sub-hint">{{ $t('userPresets.fieldCapsidQ2Sub') }}</span>
      </div>

      <!-- Secondary mode relative amplitude (0-1) -->
      <div class="ccm-resonance__field">
        <label class="ccm-resonance__label">
          {{ $t('userPresets.fieldResMode2Amp') }}
          <button class="ccm-resonance__tip-btn" @click="$emit(EMIT.SHOW_TIP, 'resMode2Amp')">?</button>
        </label>
        <input
          :value="form.resonantMode2Amplitude"
          class="ccm-resonance__input"
          type="number"
          step="0.05"
          min="0"
          max="1"
          @input="onNumericInput('resonantMode2Amplitude', $event)"
        />
        <span class="ccm-resonance__sub-hint">{{ $t('userPresets.fieldResMode2AmpSub') }}</span>
      </div>

    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { UNIT } from '@/constants/units'
import { EMIT } from '@/constants/emitEvents'
export default defineComponent({
  name: 'CcmResonanceSection',

  props: {
    form: { type: Object as () => Record<string, unknown>, required: true },
  },

  emits: [EMIT.FIELD_CHANGE, EMIT.SHOW_TIP],

  computed: {
    UNIT() { return UNIT },
    EMIT() { return EMIT },
  },

  methods: {
    onNumericInput(key: string, event: Event) {
      const value = parseFloat((event.target as HTMLInputElement).value)
      this.$emit(EMIT.FIELD_CHANGE, { key, value })
    },
  },
})
</script>

<style lang="scss" scoped>


.ccm-resonance {
  @include flex-col(0.6rem);
  padding:       0.75rem 0.9rem;
  border-radius: 6px;
  border:        1px solid color-mix(in srgb, var(--color-purple) 25%, transparent);
  background:    color-mix(in srgb, var(--color-purple) 5%, transparent);

  &__title {
    @include flex-col(0.2rem);
    font-size:      var(--fs-sm);
    font-weight:    600;
    color:          var(--color-purple);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  &__sub {
    font-size:      var(--fs-xs);
    font-weight:    400;
    color:          var(--color-text-muted);
    text-transform: none;
    letter-spacing: 0;
  }

  &__grid {
    display:               grid;
    grid-template-columns: 1fr 1fr;
    gap:                   0.75rem 1rem;
  }

  &__field {
    @include flex-col(0.25rem);
  }

  &__label {
    @include flex-row(0.35rem);
    font-size:      var(--fs-sm);
    font-weight:    600;
    color:          var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  &__unit {
    font-weight:    400;
    font-size:      var(--fs-xs);
    opacity:        0.75;
    text-transform: none;
  }

  &__input {
    background:    var(--color-bg);
    border:        1px solid var(--color-border);
    border-radius: 5px;
    color:         var(--color-text);
    font-size:     0.88rem;
    padding:       0.38rem 0.6rem;
    width:         100%;
    box-sizing:    border-box;
    outline:       none;
    transition:    border-color var(--tr-fast);

    &:focus { border-color: var(--color-primary); }

    -moz-appearance: textfield;
    appearance:      textfield;

    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button {
      -webkit-appearance: none;
      appearance:         none;
    }
  }

  &__sub-hint {
    font-size: var(--fs-xs);
    color:     var(--color-text-muted);
    opacity:   0.7;
  }

  &__tip-btn {
    @include inline-flex-center();
    width:         14px;
    height:        14px;
    border-radius: 50%;
    border:        1px solid color-mix(in srgb, var(--color-text-muted) 45%, transparent);
    background:    transparent;
    color:         color-mix(in srgb, var(--color-text-muted) 75%, transparent);
    font-size:     0.6rem;
    font-weight:   700;
    cursor:        pointer;
    padding:       0;
    line-height:   1;
    flex-shrink:   0;

    &:hover {
      border-color: var(--color-primary);
      color:        var(--color-primary);
    }
  }
}
</style>
