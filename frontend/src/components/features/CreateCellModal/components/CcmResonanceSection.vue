<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="ccm-resonance">
    <div class="ccm-resonance__title">
      {{ $t('userPresets.resonanceSectionTitle') }}
      <span class="ccm-resonance__sub">{{ $t('userPresets.resonanceSectionSub') }}</span>
    </div>

    <div class="ccm-resonance__grid">
      <CcmNumericField
        v-for="field in fields"
        :key="field.key"
        :fieldKey="field.key"
        :labelKey="field.labelKey"
        :subHintKey="field.subHintKey"
        :tipKey="field.tipKey"
        :value="form[field.key]"
        :step="field.step"
        :min="field.min"
        :max="field.max"
        :unit="field.unit"
        @field-change="$emit(EMIT.FIELD_CHANGE, $event)"
        @show-tip="$emit(EMIT.SHOW_TIP, $event)"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import CcmNumericField from './CcmNumericField.vue'

import { UNIT } from '@/constants/units'
import { EMIT } from '@/constants/emitEvents'

interface FieldConfig {
  key: string
  labelKey: string
  subHintKey: string
  tipKey: string
  unit?: string
  step: number
  min: number
  max: number
}

export default defineComponent({
  name: 'CcmResonanceSection',

  components: { CcmNumericField },

  props: {
    form: { type: Object as () => Record<string, unknown>, required: true },
  },

  emits: [EMIT.FIELD_CHANGE, EMIT.SHOW_TIP],

  computed: {
    UNIT() { return UNIT },
    EMIT() { return EMIT },
    fields(): FieldConfig[] {
      return [
        { key: 'resonantFreqGHz', labelKey: 'userPresets.fieldResFreq', subHintKey: 'userPresets.fieldResFreqSub', tipKey: 'resFreq', unit: UNIT.GHZ, step: 0.01, min: 0.001, max: 1000 },
        { key: 'capsidQ', labelKey: 'userPresets.fieldCapsidQ', subHintKey: 'userPresets.fieldCapsidQSub', tipKey: 'capsidQ', step: 1, min: 1, max: 100 },
        { key: 'resonantThresholdVcm', labelKey: 'userPresets.fieldResThr', subHintKey: 'userPresets.fieldResThrSub', tipKey: 'resThr', unit: UNIT.V_PER_CM, step: 100, min: 10, max: 100000 },
      ]
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
}
</style>
