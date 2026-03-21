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
          <span class="ccm-resonance__unit">GHz</span>
          <button class="ccm-resonance__tip-btn" @click="$emit('show-tip', 'resFreq')">?</button>
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
          <button class="ccm-resonance__tip-btn" @click="$emit('show-tip', 'capsidQ')">?</button>
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
          <span class="ccm-resonance__unit">V/cm</span>
          <button class="ccm-resonance__tip-btn" @click="$emit('show-tip', 'resThr')">?</button>
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

    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'CcmResonanceSection',

  props: {
    form: { type: Object as () => Record<string, unknown>, required: true },
  },

  emits: ['field-change', 'show-tip'],

  methods: {
    onNumericInput(key: string, event: Event) {
      const value = parseFloat((event.target as HTMLInputElement).value)
      this.$emit('field-change', { key, value })
    },
  },
})
</script>

<style lang="scss" scoped>
@use '../../styles/mixins' as *;

.ccm-resonance {
  @include flex-col(0.6rem);
  padding:       0.75rem 0.9rem;
  border-radius: 6px;
  border:        1px solid color-mix(in srgb, var(--color-purple) 25%, transparent);
  background:    color-mix(in srgb, var(--color-purple) 5%, transparent);

  &__title {
    @include flex-col(0.2rem);
    font-size:      0.73rem;
    font-weight:    600;
    color:          var(--color-purple);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  &__sub {
    font-size:      0.67rem;
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
    font-size:      0.73rem;
    font-weight:    600;
    color:          var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  &__unit {
    font-weight:    400;
    font-size:      0.68rem;
    opacity:        0.75;
    text-transform: none;
  }

  &__input {
    background:    var(--color-bg);
    border:        1px solid var(--color-border, rgba(255,255,255,0.12));
    border-radius: 5px;
    color:         var(--color-text);
    font-size:     0.88rem;
    padding:       0.38rem 0.6rem;
    width:         100%;
    box-sizing:    border-box;
    outline:       none;
    transition:    border-color 0.15s;

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
    border:        1px solid rgba(136,153,170,0.45);
    background:    transparent;
    color:         rgba(136,153,170,0.75);
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
