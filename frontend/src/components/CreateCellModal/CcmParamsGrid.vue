<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="ccm-params-grid">

    <!-- Radius -->
    <div class="ccm-params-grid__field">
      <label class="ccm-params-grid__label">
        {{ $t('userPresets.fieldRadius') }}
        <span class="ccm-params-grid__unit">{{ UNIT.UM }}</span>
        <button class="ccm-params-grid__tip-btn" @click="$emit('show-tip', 'radius')">?</button>
      </label>
      <input
        :value="form.radius"
        class="ccm-params-grid__input"
        type="number"
        step="0.001"
        min="0.001"
        max="100"
        @input="onNumericInput('radius', $event)"
      />
      <span class="ccm-params-grid__sub-hint">{{ $t('userPresets.fieldRadiusSub') }}</span>
    </div>

    <!-- Membrane thickness -->
    <div class="ccm-params-grid__field">
      <label class="ccm-params-grid__label">
        {{ $t('userPresets.fieldMemThick') }}
        <span class="ccm-params-grid__unit">{{ UNIT.NM }}</span>
        <button class="ccm-params-grid__tip-btn" @click="$emit('show-tip', 'memThick')">?</button>
      </label>
      <input
        :value="form.membraneThickness"
        class="ccm-params-grid__input"
        type="number"
        step="0.1"
        min="1"
        max="200"
        @input="onNumericInput('membraneThickness', $event)"
      />
      <span class="ccm-params-grid__sub-hint">{{ $t('userPresets.fieldMemThickSub') }}</span>
    </div>

    <!-- Dielectric constant -->
    <div class="ccm-params-grid__field">
      <label class="ccm-params-grid__label">
        {{ $t('userPresets.fieldEpsR') }}
        <button class="ccm-params-grid__tip-btn" @click="$emit('show-tip', 'epsR')">?</button>
      </label>
      <input
        :value="form.dielectricConstant"
        class="ccm-params-grid__input"
        type="number"
        step="0.5"
        min="1"
        max="80"
        @input="onNumericInput('dielectricConstant', $event)"
      />
      <span class="ccm-params-grid__sub-hint">{{ $t('userPresets.fieldEpsRSub') }}</span>
    </div>

    <!-- Intracellular conductivity -->
    <div class="ccm-params-grid__field">
      <label class="ccm-params-grid__label">
        {{ $t('userPresets.fieldSigmaI') }}
        <span class="ccm-params-grid__unit">{{ UNIT.S_PER_M }}</span>
        <button class="ccm-params-grid__tip-btn" @click="$emit('show-tip', 'sigmaI')">?</button>
      </label>
      <input
        :value="form.conductivity"
        class="ccm-params-grid__input"
        type="number"
        step="0.01"
        min="0.001"
        max="10"
        @input="onNumericInput('conductivity', $event)"
      />
      <span class="ccm-params-grid__sub-hint">{{ $t('userPresets.fieldSigmaISub') }}</span>
    </div>

    <!-- Lysis threshold -->
    <div class="ccm-params-grid__field">
      <label class="ccm-params-grid__label">
        {{ $t('userPresets.fieldVmThr') }}
        <span class="ccm-params-grid__unit">{{ UNIT.V }}</span>
        <button class="ccm-params-grid__tip-btn" @click="$emit('show-tip', 'vmThr')">?</button>
      </label>
      <input
        :value="form.thresholdVoltage"
        class="ccm-params-grid__input"
        type="number"
        step="0.05"
        min="0.05"
        max="10"
        @input="onNumericInput('thresholdVoltage', $event)"
      />
      <span class="ccm-params-grid__sub-hint">{{ $t('userPresets.fieldVmThrSub') }}</span>
    </div>

    <!-- Density -->
    <div class="ccm-params-grid__field">
      <label class="ccm-params-grid__label">
        {{ $t('userPresets.fieldDensity') }}
        <span class="ccm-params-grid__unit">{{ UNIT.KG_PER_M3 }}</span>
        <button class="ccm-params-grid__tip-btn" @click="$emit('show-tip', 'density')">?</button>
      </label>
      <input
        :value="form.density"
        class="ccm-params-grid__input"
        type="number"
        step="10"
        min="500"
        max="2000"
        @input="onNumericInput('density', $event)"
      />
      <span class="ccm-params-grid__sub-hint">{{ $t('userPresets.fieldDensitySub') }}</span>
    </div>

    <!-- Specific heat capacity -->
    <div class="ccm-params-grid__field">
      <label class="ccm-params-grid__label">
        {{ $t('userPresets.fieldCp') }}
        <span class="ccm-params-grid__unit">{{ UNIT.J_PER_KG_K }}</span>
        <button class="ccm-params-grid__tip-btn" @click="$emit('show-tip', 'cp')">?</button>
      </label>
      <input
        :value="form.specificHeatCapacity"
        class="ccm-params-grid__input"
        type="number"
        step="50"
        min="500"
        max="5000"
        @input="onNumericInput('specificHeatCapacity', $event)"
      />
      <span class="ccm-params-grid__sub-hint">{{ $t('userPresets.fieldCpSub') }}</span>
    </div>

  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { UNIT } from '@/constants/units'

export default defineComponent({
  name: 'CcmParamsGrid',

  props: {
    form: { type: Object as () => Record<string, unknown>, required: true },
  },

  emits: ['field-change', 'show-tip'],

  setup() { return { UNIT } },

  methods: {
    onNumericInput(key: string, event: Event) {
      const value = parseFloat((event.target as HTMLInputElement).value)
      this.$emit('field-change', { key, value })
    },
  },
})
</script>

<style lang="scss" scoped>


.ccm-params-grid {
  display:               grid;
  grid-template-columns: 1fr 1fr;
  gap:                   0.75rem 1rem;

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
    border:        1px solid var(--color-border, rgba(255,255,255,0.12));
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
