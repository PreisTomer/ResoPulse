<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="ccm-params-grid">
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
</template>

<script lang="ts">
import { defineComponent } from "vue";

import CcmNumericField from "./CcmNumericField.vue";

import { UNIT } from "@/constants/units";
import { EMIT } from "@/constants/emitEvents";

interface FieldConfig {
  key: string;
  labelKey: string;
  subHintKey: string;
  tipKey: string;
  unit?: string;
  step: number;
  min: number;
  max: number;
}

export default defineComponent({
  name: "CcmParamsGrid",

  components: { CcmNumericField },

  props: {
    form: { type: Object as () => Record<string, unknown>, required: true },
  },

  emits: [EMIT.FIELD_CHANGE, EMIT.SHOW_TIP],

  computed: {
    UNIT() {
      return UNIT;
    },
    EMIT() {
      return EMIT;
    },
    fields(): FieldConfig[] {
      return [
        {
          key: "radius",
          labelKey: "userPresets.fieldRadius",
          subHintKey: "userPresets.fieldRadiusSub",
          tipKey: "radius",
          unit: UNIT.UM,
          step: 0.001,
          min: 0.001,
          max: 100,
        },
        {
          key: "membraneThickness",
          labelKey: "userPresets.fieldMemThick",
          subHintKey: "userPresets.fieldMemThickSub",
          tipKey: "memThick",
          unit: UNIT.NM,
          step: 0.1,
          min: 1,
          max: 200,
        },
        {
          key: "dielectricConstant",
          labelKey: "userPresets.fieldEpsR",
          subHintKey: "userPresets.fieldEpsRSub",
          tipKey: "epsR",
          step: 0.5,
          min: 1,
          max: 80,
        },
        {
          key: "conductivity",
          labelKey: "userPresets.fieldSigmaI",
          subHintKey: "userPresets.fieldSigmaISub",
          tipKey: "sigmaI",
          unit: UNIT.S_PER_M,
          step: 0.01,
          min: 0.001,
          max: 10,
        },
        {
          key: "thresholdVoltage",
          labelKey: "userPresets.fieldVmThr",
          subHintKey: "userPresets.fieldVmThrSub",
          tipKey: "vmThr",
          unit: UNIT.V,
          step: 0.05,
          min: 0.05,
          max: 10,
        },
        {
          key: "density",
          labelKey: "userPresets.fieldDensity",
          subHintKey: "userPresets.fieldDensitySub",
          tipKey: "density",
          unit: UNIT.KG_PER_M3,
          step: 10,
          min: 500,
          max: 2000,
        },
        {
          key: "specificHeatCapacity",
          labelKey: "userPresets.fieldCp",
          subHintKey: "userPresets.fieldCpSub",
          tipKey: "cp",
          unit: UNIT.J_PER_KG_K,
          step: 50,
          min: 500,
          max: 5000,
        },
      ];
    },
  },
});
</script>

<style lang="scss" scoped>
.ccm-params-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem 1rem;
}
</style>
