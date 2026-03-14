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
        <strong>{{ $t('resonance.noteTitle') }}</strong> — {{ $t('resonance.noteBody') }}
      </span>
    </div>

    <template v-if="!isResonanceMode">
      <ProtocolSection
        :slider-ranges="sliderRanges"
        :thermal-danger-level="thermalDangerLevel"
        :max-steady-temp="maxSteadyTemp"
        :is-safe-mode="isSafeMode"
        :safe-duty-cycle-max-log="safeDutyCycleMaxLog"
      />
      <AdvancedSection />
    </template>
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

export default defineComponent({
  components: { TitleRow, ThermalBanner, MediumRow, FreqRow, FieldRow, ProtocolSection, AdvancedSection },

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

    isSafeMode(): boolean { return this.store.safeMode },

    safeDutyCycleMaxLog(): number {
      return Math.log10(Math.max(1e-6, this.store.maxSafeDutyCycle))
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

  &__resonance-note {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.45rem 0.65rem;
    border-radius: var(--radius);
    border: 1px solid rgba(167, 139, 250, 0.3);
    background: rgba(167, 139, 250, 0.06);
    color: var(--color-purple);
    font-family: var(--font-mono);
    font-size: 0.62rem;
    line-height: 1.5;

    &-icon { flex-shrink: 0; margin-top: 0.05rem; opacity: 0.8; }
    &-text strong { color: var(--color-purple-light); }
  }
}
</style>
