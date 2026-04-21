<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="ccm-nuclear">
    <div class="ccm-nuclear__title">
      {{ $t('userPresets.nuclearSectionTitle') }}
      <span class="ccm-nuclear__sub">{{ $t('userPresets.nuclearSectionSub') }}</span>
    </div>

    <div class="ccm-nuclear__grid">

      <div class="ccm-nuclear__field">
        <label class="ccm-nuclear__label">
          {{ $t('userPresets.fieldNuclearRadius') }}
          <span class="ccm-nuclear__unit">{{ UNIT.UM }}</span>
          <button class="ccm-nuclear__tip-btn" @click="$emit(EMIT.SHOW_TIP, 'nuclearRadius')">?</button>
        </label>
        <input
          :value="form.nuclearRadius"
          class="ccm-nuclear__input"
          type="number"
          step="0.1"
          min="0.1"
          max="20"
          @input="onNumericInput('nuclearRadius', $event)"
        />
        <span class="ccm-nuclear__sub-hint">{{ $t('userPresets.fieldNuclearRadiusSub') }}</span>
      </div>

      <div class="ccm-nuclear__field">
        <label class="ccm-nuclear__label">
          {{ $t('userPresets.fieldNuclearMemThick') }}
          <span class="ccm-nuclear__unit">{{ UNIT.NM }}</span>
          <button class="ccm-nuclear__tip-btn" @click="$emit(EMIT.SHOW_TIP, 'nuclearMemThick')">?</button>
        </label>
        <input
          :value="form.nuclearMembraneThickness"
          class="ccm-nuclear__input"
          type="number"
          step="1"
          min="1"
          max="100"
          @input="onNumericInput('nuclearMembraneThickness', $event)"
        />
        <span class="ccm-nuclear__sub-hint">{{ $t('userPresets.fieldNuclearMemThickSub') }}</span>
      </div>

      <div class="ccm-nuclear__field">
        <label class="ccm-nuclear__label">
          {{ $t('userPresets.fieldNuclearEps') }}
          <button class="ccm-nuclear__tip-btn" @click="$emit(EMIT.SHOW_TIP, 'nuclearEps')">?</button>
        </label>
        <input
          :value="form.nuclearMembraneEps"
          class="ccm-nuclear__input"
          type="number"
          step="0.5"
          min="1"
          max="40"
          @input="onNumericInput('nuclearMembraneEps', $event)"
        />
        <span class="ccm-nuclear__sub-hint">{{ $t('userPresets.fieldNuclearEpsSub') }}</span>
      </div>

      <div class="ccm-nuclear__field">
        <label class="ccm-nuclear__label">
          {{ $t('userPresets.fieldNucleoplasmSigma') }}
          <span class="ccm-nuclear__unit">{{ UNIT.S_PER_M }}</span>
          <button class="ccm-nuclear__tip-btn" @click="$emit(EMIT.SHOW_TIP, 'nucleoplasmSigma')">?</button>
        </label>
        <input
          :value="form.nucleoplasmConductivity"
          class="ccm-nuclear__input"
          type="number"
          step="0.05"
          min="0.01"
          max="5"
          @input="onNumericInput('nucleoplasmConductivity', $event)"
        />
        <span class="ccm-nuclear__sub-hint">{{ $t('userPresets.fieldNucleoplasmSigmaSub') }}</span>
      </div>

      <div class="ccm-nuclear__field">
        <label class="ccm-nuclear__label">
          {{ $t('userPresets.fieldNuclearVmThr') }}
          <span class="ccm-nuclear__unit">{{ UNIT.V }}</span>
          <button class="ccm-nuclear__tip-btn" @click="$emit(EMIT.SHOW_TIP, 'nuclearVmThr')">?</button>
        </label>
        <input
          :value="form.nuclearThresholdVoltage"
          class="ccm-nuclear__input"
          type="number"
          step="0.05"
          min="0.05"
          max="5"
          @input="onNumericInput('nuclearThresholdVoltage', $event)"
        />
        <span class="ccm-nuclear__sub-hint">{{ $t('userPresets.fieldNuclearVmThrSub') }}</span>
      </div>

    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { UNIT } from '@/constants/units'
import { EMIT } from '@/constants/emitEvents'

export default defineComponent({
  name: 'CcmNuclearSection',

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
      if (!Number.isFinite(value)) return
      this.$emit(EMIT.FIELD_CHANGE, { key, value })
    },
  },
})
</script>

<style lang="scss" scoped>
.ccm-nuclear {
  @include flex-col(0.6rem);
  padding:       0.75rem 0.9rem;
  border-radius: 6px;
  border:        1px solid color-mix(in srgb, var(--color-primary) 25%, transparent);
  background:    color-mix(in srgb, var(--color-primary) 5%, transparent);

  &__title {
    @include flex-col(0.2rem);
    font-size:      var(--fs-sm);
    font-weight:    600;
    color:          var(--color-primary);
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

    @include number-input-reset();
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
