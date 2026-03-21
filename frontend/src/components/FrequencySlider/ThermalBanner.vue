<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div
    class="field-panel__thermal-banner"
    :class="`field-panel__thermal-banner--${thermalDangerLevel}`"
    v-tip="tipThermalBanner"
  >
    <span class="field-panel__thermal-icon">{{ thermalDangerLevel === THERMAL_LEVEL.VAPORIZING ? ICON.LIGHTNING : ICON.WARNING }}</span>
    <span class="field-panel__thermal-text">
      {{ thermalDangerLevel === THERMAL_LEVEL.VAPORIZING
          ? $t('slider.thermalVaporizing')
          : thermalDangerLevel === THERMAL_LEVEL.DENATURING
            ? $t('slider.thermalDenaturing')
            : $t('slider.thermalHyperthermic') }}
    </span>
    <span class="field-panel__thermal-temp">T_ss {{ maxSteadyTemp.toFixed(0) }} {{ UNIT.DEG_C }}</span>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import type { PropType } from 'vue'
import { THERMAL_LEVEL } from '@/constants/strings'
import { ICON } from '@/constants/icons'
import { UNIT } from '@/constants/units'
import { tipThermalBanner } from '@/tooltips/sliderTooltips'

export default defineComponent({
  props: {
    thermalDangerLevel: {
      type: String as PropType<'hyperthermic' | 'denaturing' | 'vaporizing'>,
      required: true,
    },
    maxSteadyTemp: { type: Number, required: true },
  },

  setup() {
    return { THERMAL_LEVEL, ICON, UNIT }
  },

  computed: {
    tipThermalBanner(): string {
      return tipThermalBanner(
        this.thermalDangerLevel as typeof THERMAL_LEVEL.VAPORIZING | typeof THERMAL_LEVEL.DENATURING | typeof THERMAL_LEVEL.HYPERTHERMIC,
      )
    },
  },
})
</script>

<style lang="scss" scoped>
@keyframes thermal-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.6; }
}

.field-panel {
  &__thermal-banner {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.3rem 0.65rem;
    border-radius: var(--radius);
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    border: 1px solid;
    animation: thermal-pulse 2s ease-in-out infinite;

    &--hyperthermic {
      color: var(--color-amber);
      background: color-mix(in srgb, var(--color-amber) 7%, transparent);
      border-color: color-mix(in srgb, var(--color-amber) 30%, transparent);
    }

    &--denaturing {
      color: var(--color-orange);
      background: color-mix(in srgb, var(--color-orange) 10%, transparent);
      border-color: color-mix(in srgb, var(--color-orange) 40%, transparent);
      animation: thermal-pulse 1s ease-in-out infinite;
    }

    &--vaporizing {
      color: var(--color-danger);
      background: color-mix(in srgb, var(--color-danger) 10%, transparent);
      border-color: color-mix(in srgb, var(--color-danger) 50%, transparent);
      animation: thermal-pulse 0.5s ease-in-out infinite;
    }
  }

  &__thermal-icon { flex-shrink: 0; }
  &__thermal-text { flex: 1; }
  &__thermal-temp { flex-shrink: 0; font-weight: 700; }
}
</style>
