<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="field-panel">
    <TitleRow />

    <ThermalBanner
      v-if="!isResonanceMode && thermalDangerLevel !== THERMAL_LEVEL.SAFE"
      :thermal-danger-level="thermalDangerLevel"
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

    <div v-if="!isResonanceMode" class="field-panel__protocol-zone">
      <ProtocolSnapBar :slider-ranges="sliderRanges" />
      <ProtocolSection
        :slider-ranges="sliderRanges"
        :thermal-danger-level="thermalDangerLevel"
        :max-steady-temp="maxSteadyTemp"
      />
      <AdvancedSection />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useCellStore } from '@/stores/cellStore'
import { CHART_MODE, CELL_CATEGORY, THERMAL_LEVEL } from '@/constants/strings'
import { ICON } from '@/constants/icons'
import { SLIDER_RANGES } from '@/constants/sliderBounds'
import type { SliderRange } from '@/constants/sliderBounds'
import TitleRow from './TitleRow.vue'
import ThermalBanner from './ThermalBanner.vue'
import MediumRow from './MediumRow.vue'
import FreqRow from './FreqRow.vue'
import FieldRow from './FieldRow.vue'
import ProtocolSection from './ProtocolSection.vue'
import AdvancedSection from './AdvancedSection.vue'
import ProtocolSnapBar from './ProtocolSnapBar.vue'

export default defineComponent({
  components: { TitleRow, ThermalBanner, MediumRow, FreqRow, FieldRow, ProtocolSection, AdvancedSection, ProtocolSnapBar },

  setup() {
    return { store: useCellStore(), ICON, THERMAL_LEVEL }
  },

  computed: {
    isResonanceMode(): boolean { return this.store.chartMode === CHART_MODE.RESONANCE },

    sliderRanges(): SliderRange {
      const cat = this.store.targetCellCategory
      if (this.isResonanceMode) {
        if (cat === CELL_CATEGORY.VIRUS)     return SLIDER_RANGES.RESONANCE_VIRUS
        if (cat === CELL_CATEGORY.MAMMALIAN) return SLIDER_RANGES.RESONANCE_MAMMALIAN
        return SLIDER_RANGES.RESONANCE_BACTERIA
      }
      if (cat === CELL_CATEGORY.VIRUS)    return SLIDER_RANGES.IRE_VIRUS
      if (cat === CELL_CATEGORY.BACTERIA) return SLIDER_RANGES.IRE_BACTERIA
      return SLIDER_RANGES.IRE_MAMMALIAN
    },

    maxSteadyTemp(): number {
      return Math.max(this.store.healthySteadyStateTemp, this.store.targetSteadyStateTemp)
    },

    thermalDangerLevel(): 'safe' | 'hyperthermic' | 'denaturing' | 'vaporizing' {
      if (this.maxSteadyTemp >= 100) return THERMAL_LEVEL.VAPORIZING
      if (this.maxSteadyTemp >= 60)  return THERMAL_LEVEL.DENATURING
      if (this.maxSteadyTemp >= 42)  return THERMAL_LEVEL.HYPERTHERMIC
      return THERMAL_LEVEL.SAFE
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

  &__protocol-zone {
    display: flex;
    flex-direction: column;
    gap: 0.9rem;
    margin: 0 -1.25rem -0.85rem;
    padding: 0.8rem 1.25rem 0.85rem;
    border-top: 1px solid var(--color-border);
    background: rgba(255, 255, 255, 0.018);
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
