<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="ccm-num-field">
    <label class="ccm-num-field__label">
      {{ $t(labelKey) }}
      <span v-if="unit" class="ccm-num-field__unit">{{ unit }}</span>
      <button class="ccm-num-field__tip-btn" type="button" @click="$emit(EMIT.SHOW_TIP, tipKey)">?</button>
    </label>

    <input
      :value="value"
      class="ccm-num-field__input"
      type="number"
      :step="step"
      :min="min"
      :max="max"
      @input="onNumericInput"
    />

    <span class="ccm-num-field__sub-hint">{{ $t(subHintKey) }}</span>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { EMIT } from '@/constants/emitEvents'

export default defineComponent({
  name: 'CcmNumericField',

  props: {
    fieldKey: { type: String, required: true },
    labelKey: { type: String, required: true },
    subHintKey: { type: String, required: true },
    tipKey: { type: String, required: true },
    value: { type: [Number, String], required: true },
    step: { type: [Number, String], required: true },
    min: { type: [Number, String], required: true },
    max: { type: [Number, String], required: true },
    unit: { type: String, default: '' },
  },

  emits: [EMIT.FIELD_CHANGE, EMIT.SHOW_TIP],

  computed: {
    EMIT() { return EMIT },
  },

  methods: {
    onNumericInput(event: Event) {
      const value = parseFloat((event.target as HTMLInputElement).value)
      this.$emit(EMIT.FIELD_CHANGE, { key: this.fieldKey, value })
    },
  },
})
</script>

<style lang="scss" scoped>
.ccm-num-field {
  @include flex-col(0.25rem);

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