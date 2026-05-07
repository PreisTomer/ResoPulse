<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="ccm-sigma-prov">
    <div class="ccm-sigma-prov__title">
      {{ $t('userPresets.sigmaProvSectionTitle') }}
      <span class="ccm-sigma-prov__sub">{{ $t('userPresets.sigmaProvSectionSub') }}</span>
    </div>

    <div class="ccm-sigma-prov__grid">

      <div class="ccm-sigma-prov__field">
        <label class="ccm-sigma-prov__label">
          {{ $t('userPresets.fieldSigmaMeasurementTemp') }}
          <span class="ccm-sigma-prov__unit">{{ UNIT.DEG_C }}</span>
          <button class="ccm-sigma-prov__tip-btn" @click="$emit(EMIT.SHOW_TIP, 'conductivityMeasurementTempC')">?</button>
        </label>
        <input
          :value="form.conductivityMeasurementTempC ?? ''"
          class="ccm-sigma-prov__input"
          type="number"
          step="1"
          min="4"
          max="42"
          :placeholder="$t('userPresets.sigmaMeasurementTempPlaceholder')"
          @input="onNumericOrNullInput('conductivityMeasurementTempC', $event, 4, 42)"
        />
        <span class="ccm-sigma-prov__sub-hint">{{ $t('userPresets.fieldSigmaMeasurementTempSub') }}</span>
      </div>

      <div class="ccm-sigma-prov__field">
        <label class="ccm-sigma-prov__label">
          {{ $t('userPresets.fieldSigmaMeasurementSigmaE') }}
          <span class="ccm-sigma-prov__unit">{{ UNIT.S_PER_M }}</span>
          <button class="ccm-sigma-prov__tip-btn" @click="$emit(EMIT.SHOW_TIP, 'conductivityMeasurementSigmaE')">?</button>
        </label>
        <input
          :value="form.conductivityMeasurementSigmaE ?? ''"
          class="ccm-sigma-prov__input"
          type="number"
          step="0.01"
          min="0.001"
          max="10"
          :placeholder="$t('userPresets.sigmaMeasurementSigmaEPlaceholder')"
          @input="onNumericOrNullInput('conductivityMeasurementSigmaE', $event, 0.001, 10)"
        />
        <span class="ccm-sigma-prov__sub-hint">{{ $t('userPresets.fieldSigmaMeasurementSigmaESub') }}</span>
      </div>

      <div class="ccm-sigma-prov__field">
        <label class="ccm-sigma-prov__label">
          {{ $t('userPresets.fieldSigmaUncertaintyPct') }}
          <span class="ccm-sigma-prov__unit">{{ UNIT.PERCENT }}</span>
          <button class="ccm-sigma-prov__tip-btn" @click="$emit(EMIT.SHOW_TIP, 'sigmaUncertaintyPct')">?</button>
        </label>
        <input
          :value="form.sigmaUncertaintyPct ?? ''"
          class="ccm-sigma-prov__input"
          type="number"
          step="1"
          min="0"
          max="100"
          :placeholder="$t('userPresets.sigmaUncertaintyPlaceholder')"
          @input="onNumericOrNullInput('sigmaUncertaintyPct', $event)"
        />
        <span class="ccm-sigma-prov__sub-hint">{{ $t('userPresets.fieldSigmaUncertaintyPctSub') }}</span>
      </div>

      <div class="ccm-sigma-prov__field">
        <label class="ccm-sigma-prov__label">
          {{ $t('userPresets.fieldSigmaSource') }}
          <button class="ccm-sigma-prov__tip-btn" @click="$emit(EMIT.SHOW_TIP, 'sigmaSource')">?</button>
        </label>
        <select
          :value="form.sigmaSource ?? ''"
          class="ccm-sigma-prov__select"
          @change="onSelectChange('sigmaSource', $event)"
        >
          <option value="">{{ $t('userPresets.sigmaSourceUnspecified') }}</option>
          <option value="literature">{{ $t('userPresets.sigmaSourceLiterature') }}</option>
          <option value="measured">{{ $t('userPresets.sigmaSourceMeasured') }}</option>
          <option value="electrorotation">{{ $t('userPresets.sigmaSourceElectrorotation') }}</option>
          <option value="impedance">{{ $t('userPresets.sigmaSourceImpedance') }}</option>
          <option value="estimated">{{ $t('userPresets.sigmaSourceEstimated') }}</option>
        </select>
        <span class="ccm-sigma-prov__sub-hint">{{ $t('userPresets.fieldSigmaSourceSub') }}</span>
      </div>

      <div class="ccm-sigma-prov__field ccm-sigma-prov__field--wide">
        <label class="ccm-sigma-prov__label">
          {{ $t('userPresets.fieldSigmaCitation') }}
          <button class="ccm-sigma-prov__tip-btn" @click="$emit(EMIT.SHOW_TIP, 'sigmaCitation')">?</button>
        </label>
        <input
          :value="form.sigmaCitation ?? ''"
          class="ccm-sigma-prov__input"
          type="text"
          maxlength="500"
          :placeholder="$t('userPresets.sigmaCitationPlaceholder')"
          @input="onTextInput('sigmaCitation', $event)"
        />
        <span class="ccm-sigma-prov__sub-hint">{{ $t('userPresets.fieldSigmaCitationSub') }}</span>
      </div>

    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { UNIT } from '@/constants/units'
import { EMIT } from '@/constants/emitEvents'

export default defineComponent({
  name: 'CcmSigmaProvenanceSection',

  props: {
    form: { type: Object as () => Record<string, unknown>, required: true },
  },

  emits: [EMIT.FIELD_CHANGE, EMIT.SHOW_TIP],

  computed: {
    UNIT() { return UNIT },
    EMIT() { return EMIT },
  },

  methods: {
    onNumericOrNullInput(key: string, event: Event, min = 0, max = 100) {
      const raw    = (event.target as HTMLInputElement).value
      if (raw === '') { this.$emit(EMIT.FIELD_CHANGE, { key, value: null }); return }
      const parsed = parseFloat(raw)
      if (!Number.isFinite(parsed)) return
      const clamped = Math.max(min, Math.min(max, parsed))
      this.$emit(EMIT.FIELD_CHANGE, { key, value: clamped })
    },

    onSelectChange(key: string, event: Event) {
      const value = (event.target as HTMLSelectElement).value
      this.$emit(EMIT.FIELD_CHANGE, { key, value })
    },

    onTextInput(key: string, event: Event) {
      const value = (event.target as HTMLInputElement).value
      this.$emit(EMIT.FIELD_CHANGE, { key, value })
    },
  },
})
</script>

<style lang="scss" scoped>
.ccm-sigma-prov {
  @include flex-col(0.6rem);
  padding:       0.75rem 0.9rem;
  border-radius: 6px;
  border:        1px solid color-mix(in srgb, var(--color-amber) 25%, transparent);
  background:    color-mix(in srgb, var(--color-amber) 5%, transparent);

  &__title {
    @include flex-col(0.2rem);
    font-size:      var(--fs-sm);
    font-weight:    600;
    color:          var(--color-amber);
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

    &--wide { grid-column: 1 / -1; }
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
    opacity:        0.75; // intentional: between --op-dim and --op-partial for unit label
    text-transform: none;
  }

  &__input, &__select { @include ccm-form-input(); }
  &__input { @include number-input-reset(); }

  &__sub-hint {
    font-size: var(--fs-xs);
    color:     var(--color-text-muted);
    opacity:   var(--op-dim);
  }

  &__tip-btn { @include ccm-tip-btn(); }
}
</style>
