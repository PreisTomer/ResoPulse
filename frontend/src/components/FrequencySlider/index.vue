<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="field-panel">
    <TitleRow />

    <ThermalBanner
      v-if="isThermalBannerVisible"
      :thermal-danger-level="activeThermalLevel"
      :max-steady-temp="maxSteadyTemp"
    />

    <MediumRow />

    <FreqRow :slider-ranges="sliderRanges" />

    <FieldRow
      :slider-ranges="sliderRanges"
      :thermal-danger-level="thermalDangerLevel"
    />

    <div v-if="isResonanceMode" class="field-panel__resonance-note">
      <span class="field-panel__resonance-note-icon">{{ ICON.INFO }}</span>
      <span class="field-panel__resonance-note-text">
        <strong>{{ $t('resonance.noteTitle') }}</strong>, {{ $t('resonance.noteBody') }}
      </span>
    </div>

    <div v-if="!isResonanceMode" class="field-panel__sections">
      <ProtocolSection
        id="hl-proto-section"
        :slider-ranges="sliderRanges"
        :thermal-danger-level="thermalDangerLevel"
        :max-steady-temp="maxSteadyTemp"
      />
      <AdvancedSection id="hl-adv-section" />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'

import { useCellStore } from '@/stores/cellStore'

import { THERMAL_LEVEL } from '@/constants/strings'
import { ICON } from '@/constants/icons'
import type { SliderRange } from '@/constants/sliderBounds'

import TitleRow from './TitleRow.vue'
import ThermalBanner from './ThermalBanner.vue'
import MediumRow from './MediumRow.vue'
import FreqRow from './FreqRow.vue'
import FieldRow from './FieldRow.vue'
import ProtocolSection from './ProtocolSection.vue'
import AdvancedSection from './AdvancedSection.vue'
export default defineComponent({
  components: { TitleRow, ThermalBanner, MediumRow, FreqRow, FieldRow, ProtocolSection, AdvancedSection },

  computed: {
    ...mapStores(useCellStore),
    ICON()         { return ICON },
    THERMAL_LEVEL() { return THERMAL_LEVEL },

    isResonanceMode(): boolean { return this.cellStore.isResonanceMode },

    sliderRanges(): SliderRange { return this.cellStore.sliderRanges },

    maxSteadyTemp(): number {
      return Math.max(this.cellStore.healthySteadyStateTemp, this.cellStore.targetSteadyStateTemp)
    },

    thermalDangerLevel(): 'safe' | 'hyperthermic' | 'denaturing' | 'vaporizing' {
      if (this.maxSteadyTemp >= 100) return THERMAL_LEVEL.VAPORIZING
      if (this.maxSteadyTemp >= 60)  return THERMAL_LEVEL.DENATURING
      if (this.maxSteadyTemp >= 42)  return THERMAL_LEVEL.HYPERTHERMIC
      return THERMAL_LEVEL.SAFE
    },

    isThermalBannerVisible(): boolean { return !this.isResonanceMode && this.thermalDangerLevel !== THERMAL_LEVEL.SAFE },
    activeThermalLevel(): 'hyperthermic' | 'denaturing' | 'vaporizing' {
      return this.thermalDangerLevel as 'hyperthermic' | 'denaturing' | 'vaporizing'
    },
  },
})
</script>

<style lang="scss" scoped>
.field-panel {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.85rem 1.25rem;
  container-type: inline-size;
  flex: 1;

  // ── Collapsible sections zone ──────────────────────────────────────────────
  // Zero-gap flex column so protocol's border-bottom = advanced's border-top (one shared line).
  &__sections {
    display: flex;
    flex-direction: column;
    gap: 0;
    margin: 0 -1.25rem -0.85rem;
    border-top: 1px solid var(--color-border);
    border-radius: 0 0 var(--radius) var(--radius);
  }

  &__resonance-note {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.45rem 0.65rem;
    border-radius: var(--radius);
    border: 1px solid color-mix(in srgb, var(--color-purple) 30%, transparent);
    background: color-mix(in srgb, var(--color-purple) 6%, transparent);
    color: var(--color-purple);
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    line-height: 1.5;

    &-icon { flex-shrink: 0; margin-top: 0.05rem; opacity: var(--op-partial); }
    &-text strong { color: var(--color-purple-light); }
  }
}
</style>
