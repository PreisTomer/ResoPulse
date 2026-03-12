<template>
  <div class="field-panel">
    <div class="field-panel__title-row">
      <span class="field-panel__title">{{ $t('slider.title') }}</span>
      <!-- Safe Mode toggle -->
      <div class="field-panel__safe-toggle">
        <label
          class="field-panel__pill field-panel__pill--sm"
          :class="{ 'field-panel__pill--active field-panel__pill--expert': !isSafeMode }"
          v-tip="tipExpertMode"
        >
          <input type="radio" name="safemode" :checked="!isSafeMode" @change="onSafeModeChange(false)" />
          {{ $t('slider.expert') }}
        </label>
        <label
          class="field-panel__pill field-panel__pill--sm"
          :class="{ 'field-panel__pill--active field-panel__pill--safe': isSafeMode }"
          v-tip="tipSafeMode"
        >
          <input type="radio" name="safemode" :checked="isSafeMode" @change="onSafeModeChange(true)" />
          {{ $t('slider.safe') }}
        </label>
      </div>
    </div>

    <!-- Scope legend: which controls affect which cell -->
    <div
      class="field-panel__scope-note"
      v-tip="tipScopeNote"
    >
      <span class="field-panel__scope-chip field-panel__scope-chip--both">{{ $t('labels.scopeBoth') }}</span>
      <span class="field-panel__scope-sep">{{ $t('slider.sharedField') }}</span>
      <span class="field-panel__scope-chip field-panel__scope-chip--card">{{ $t('slider.cardParams') }}</span>
      <span class="field-panel__scope-sep">{{ $t('slider.cellSpecific') }}</span>
    </div>

    <!-- Thermal danger banner (IRE/Schwan mode only) -->
    <div
      v-if="!isResonanceMode && thermalDangerLevel !== THERMAL_LEVEL.SAFE"
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

    <!-- Row 1: Medium selector -->
    <div class="field-panel__row field-panel__row--medium">
      <span class="field-panel__row-label" v-tip="tipMedium">{{ $t('slider.medium') }}</span>
      <select
        class="field-panel__medium-select"
        :value="currentMedium"
        v-tip="tipMediumKeys[currentMedium]"
        @change="onMediumChange(($event.target as HTMLSelectElement).value as typeof currentMedium)"
      >
        <optgroup :label="$t('slider.mediumGroupPhysio')">
          <option value="saline">{{ $t('slider.mediums.saline') }}</option>
          <option value="blood">{{ $t('slider.mediums.blood') }}</option>
          <option value="tissue">{{ $t('slider.mediums.tissue') }}</option>
        </optgroup>
        <optgroup :label="$t('slider.mediumGroupCulture')">
          <option value="dmem">{{ $t('slider.mediums.dmem') }}</option>
          <option value="rpmi">{{ $t('slider.mediums.rpmi') }}</option>
        </optgroup>
        <optgroup :label="$t('slider.mediumGroupMicro')">
          <option value="mhb">{{ $t('slider.mediums.mhb') }}</option>
        </optgroup>
        <optgroup :label="$t('slider.mediumGroupRef')">
          <option value="water">{{ $t('slider.mediums.water') }}</option>
        </optgroup>
      </select>
      <span
        class="field-panel__row-meta"
        v-tip="tipSigmaE"
      >σ_e {{ MEDIA[currentMedium].conductivity }} S/m</span>
    </div>

    <!-- Snap to Optimal / fc buttons (Schwan/IRE mode only) — above RF Frequency slider -->
    <div v-if="!isResonanceMode" class="field-panel__optimal-row">
      <button
        class="field-panel__optimal-btn field-panel__optimal-btn--fc field-panel__optimal-btn--fc-h"
        v-tip="tipSnapFcH"
        @click="snapToFc('healthy')"
        type="button"
      >{{ $t('slider.snapFcH') }} {{ healthyFcDisplay }}</button>
      <button
        class="field-panel__optimal-btn field-panel__optimal-btn--fc field-panel__optimal-btn--fc-t"
        v-tip="tipSnapFcT"
        @click="snapToFc('target')"
        type="button"
      >{{ $t('slider.snapFcT') }} {{ targetFcDisplay }}</button>
      <button
        class="field-panel__optimal-btn"
        :class="{ 'field-panel__optimal-btn--beyond': optimalBeyondRange }"
        v-tip="tipOptimalBtn"
        @click="snapToOptimal"
        type="button"
      >{{ $t('slider.snapOptimal') }} {{ optimalFreqLabel }}</button>
    </div>

    <!-- Row 2: RF Frequency -->
    <div class="field-panel__row">
      <span class="field-panel__row-label" v-tip="tipFreq">{{ $t('slider.rfFrequency') }}</span>
      <div class="field-panel__track">
        <input
          class="field-panel__slider"
          type="range"
          :min="sliderRanges.freqMin"
          :max="sliderRanges.freqMax"
          :step="sliderRanges.freqStep"
          :value="currentFreq"
          @input="onFreqInput"
        />
      </div>
      <div class="field-panel__readout">
        <span class="field-panel__readout-value" v-tip="tipFreq">{{ freqDisplay }}</span>
        <span class="field-panel__readout-sub" v-tip="tipFcSub">{{ freqSubDisplay }}</span>
      </div>
    </div>

    <!-- Frequency coupling regime badge -->
    <div
      class="field-panel__regime"
      :class="`field-panel__regime--${store.freqRegime}`"
      v-tip="tipFreqRegime"
    >
      <span class="field-panel__regime-dot"></span>
      {{ $t(`slider.regime.${store.freqRegime}`) }}
    </div>

    <!-- Row 3: Field Intensity + disruption indicators -->
    <div
      class="field-panel__row"
      :class="!isResonanceMode && thermalDangerLevel !== THERMAL_LEVEL.SAFE ? `field-panel__row--${thermalDangerLevel}` : ''"
    >
      <span class="field-panel__row-label" v-tip="tipField">{{ $t('slider.fieldIntensity') }}</span>
      <div class="field-panel__track">
        <input
          class="field-panel__slider"
          type="range"
          :min="sliderRanges.fieldMin"
          :max="sliderRanges.fieldMax"
          :step="sliderRanges.fieldStep"
          :value="currentField"
          @input="onFieldInput"
        />
      </div>
      <div class="field-panel__readout">
        <span class="field-panel__readout-value" v-tip="tipField">{{ fieldDisplay }}</span>
        <div class="field-panel__badges">
          <span
            class="field-panel__badge field-panel__badge--target"
            :class="{ 'field-panel__badge--warn': targetDisruption > THRESHOLDS.DISRUPTION_WARN }"
            v-tip="tipTargetBadge"
          >{{ CELL_LABEL.TARGET }} {{ targetDisruptPercent }}%</span>
          <span
            class="field-panel__badge field-panel__badge--healthy"
            :class="{ 'field-panel__badge--warn': healthyDisruption > THRESHOLDS.DISRUPTION_WARN }"
            v-tip="tipHealthyBadge"
          >{{ CELL_LABEL.HEALTHY }} {{ healthyDisruptPercent }}%</span>
        </div>
      </div>
    </div>

    <!-- Resonance mode note -->
    <div v-if="isResonanceMode" class="field-panel__resonance-note">
      <span class="field-panel__resonance-note-icon">{{ ICON.INFO }}</span>
      <span class="field-panel__resonance-note-text">
        <strong>{{ $t('resonance.noteTitle') }}</strong> — {{ $t('resonance.noteBody') }}
      </span>
    </div>

    <!-- Protocol + Advanced accordions (IRE/Schwan mode only) -->
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
import { broadcastStateSync } from '@/services/socket'
import { MEDIA } from '@/constants/media'
import { CHART_MODE, CELL_CATEGORY, CELL_LABEL, THERMAL_LEVEL, FREQ_REGIME } from '@/constants/strings'
import { THRESHOLDS } from '@/constants/cellCard'
import { ICON } from '@/constants/icons'
import type { MediumKey } from '@/types/media'
import { formatFreqKHz, formatFieldVcm } from '@/utils/format'
import { UNIT } from '@/constants/units'
import { SLIDER_RANGES } from '@/constants/sliderBounds'
import type { SliderRange } from '@/constants/sliderBounds'
import {
  tipMedium,
  tipMediumKeys,
  tipFreq,
  tipFcSub,
  tipField,
  tipTargetBadge,
  tipHealthyBadge,
  tipOptimalBtn,
  tipExpertMode,
  tipSafeMode,
  tipScopeNote,
  tipThermalBanner,
  tipSigmaE,
} from '@/tooltips/sliderTooltips'
import ProtocolSection from './ProtocolSection.vue'
import AdvancedSection from './AdvancedSection.vue'

export default defineComponent({
  components: { ProtocolSection, AdvancedSection },

  setup() {
    const store = useCellStore()
    return { store, MEDIA, ICON, THERMAL_LEVEL, THRESHOLDS, CELL_LABEL, UNIT }
  },

  computed: {
    currentFreq(): number      { return this.store.currentBroadcastFrequency },
    currentField(): number     { return this.store.fieldIntensity },
    currentMedium(): MediumKey { return this.store.medium },

    isResonanceMode(): boolean { return this.store.chartMode === CHART_MODE.RESONANCE },

    targetDisruption(): number  { return this.store.targetDisruptionRatio },
    healthyDisruption(): number { return this.store.healthyDisruptionRatio },

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

    freqDisplay(): string      { return formatFreqKHz(this.currentFreq) },
    targetFcDisplay(): string  { return formatFreqKHz(this.store.targetFc) },
    healthyFcDisplay(): string { return formatFreqKHz(this.store.healthyFc) },
    fieldDisplay(): string     { return formatFieldVcm(this.currentField) },
    mediaKeys(): MediumKey[]   { return Object.keys(this.MEDIA) as MediumKey[] },

    targetDisruptPercent(): string  { return (this.targetDisruption * 100).toFixed(0) },
    healthyDisruptPercent(): string { return (this.healthyDisruption * 100).toFixed(0) },

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

    freqSubDisplay(): string {
      if (this.isResonanceMode) {
        const t = this.store.target as { resonantFreqGHz?: number }
        if (t.resonantFreqGHz) {
          return this.$t('slider.fResSub', { freq: formatFreqKHz(t.resonantFreqGHz * 1_000_000) })
        }
        return this.$t('resonance.noResonance')
      }
      return this.$t('slider.fcSub', { target: this.targetFcDisplay, healthy: this.healthyFcDisplay })
    },

    optimalFreqResult(): { khz: number; sel: number } {
      return this.store.optimalFreqResult
    },

    optimalBeyondRange(): boolean {
      return this.optimalFreqResult.khz > this.sliderRanges.freqMax
    },

    optimalFreqLabel(): string {
      const { khz, sel } = this.optimalFreqResult
      const beyond = this.optimalBeyondRange
      return ` ${formatFreqKHz(khz)} · ×${sel >= 99 ? ICON.INFINITY : sel.toFixed(2)}${beyond ? ICON.BEYOND : ''}`
    },

    tipOptimalBtn(): string    { return tipOptimalBtn(this.optimalBeyondRange) },
    tipSnapFcH(): string { return this.$t('slider.tipSnapFcH', { fc: this.healthyFcDisplay }) },
    tipSnapFcT(): string { return this.$t('slider.tipSnapFcT', { fc: this.targetFcDisplay }) },
    tipExpertMode(): string    { return tipExpertMode() },
    tipSafeMode(): string      { return tipSafeMode() },
    tipScopeNote(): string     { return tipScopeNote() },
    tipSigmaE(): string        { return tipSigmaE(this.MEDIA[this.currentMedium].conductivity) },
    tipThermalBanner(): string {
      return this.thermalDangerLevel !== THERMAL_LEVEL.SAFE
        ? tipThermalBanner(this.thermalDangerLevel as typeof THERMAL_LEVEL.VAPORIZING | typeof THERMAL_LEVEL.DENATURING | typeof THERMAL_LEVEL.HYPERTHERMIC)
        : ''
    },
    tipMedium(): string    { return tipMedium(this.currentMedium) },
    tipMediumKeys(): Record<string, string> { return tipMediumKeys() },
    tipFreq(): string      { return tipFreq(this.freqDisplay, this.targetFcDisplay, this.healthyFcDisplay) },
    tipFcSub(): string     { return tipFcSub() },
    tipFreqRegime(): string {
      const tips: Record<string, string> = {
        electrolytic: this.$t('slider.regime.tipElectrolytic'),
        nearfield_rf: this.$t('slider.regime.tipNearfieldRf'),
        microwave:    this.$t('slider.regime.tipMicrowave'),
      }
      let tip = tips[this.store.freqRegime] ?? ''
      // In resonance mode for bacteria/virus the capsid f_res is in GHz —
      // warn if slider is not already in microwave regime
      if (
        this.isResonanceMode &&
        this.store.targetCellCategory !== CELL_CATEGORY.MAMMALIAN &&
        this.store.freqRegime !== FREQ_REGIME.MICROWAVE
      ) {
        const t = this.store.target as { resonantFreqGHz?: number }
        const fRes = t.resonantFreqGHz ? ` (f_res = ${t.resonantFreqGHz} GHz)` : ''
        tip += `\n\n⚠ Resonance mode active${fRes}: acoustic capsid disruption requires GHz delivery — rectangular waveguide or resonant cavity hardware needed. Current frequency is below the resonant target.`
      }
      return tip
    },

    tipField(): string {
      return tipField({
        chartMode:          this.store.chartMode,
        target:             this.store.target as Parameters<typeof tipField>[0]['target'],
        fieldDisplay:       this.fieldDisplay,
        targetDisruption:   this.targetDisruption,
        targetCellCategory: this.store.targetCellCategory,
        targetLysisField:   this.store.targetLysisField,
        healthyLysisField:  this.store.healthyLysisField,
        t:                  this.$t.bind(this),
      })
    },

    tipTargetBadge(): string {
      return tipTargetBadge({
        chartMode:            this.store.chartMode,
        target:               this.store.target as Parameters<typeof tipTargetBadge>[0]['target'],
        targetDisruptPercent: this.targetDisruptPercent,
        targetDisruption:     this.targetDisruption,
        targetVmMv:           this.store.targetVm * 1000,
        lysisDelayMs:         this.store.lysisDelayMs,
        t:                    this.$t.bind(this),
      })
    },

    tipHealthyBadge(): string {
      return tipHealthyBadge({
        chartMode:             this.store.chartMode,
        healthyDisruptPercent: this.healthyDisruptPercent,
        healthyDisruption:     this.healthyDisruption,
        healthyVmMv:           this.store.healthyVm * 1000,
        thresholdVoltage:      this.store.healthy.thresholdVoltage,
        t:                     this.$t.bind(this),
      })
    },
  },

  methods: {
    onMediumChange(key: MediumKey) {
      this.store.setMedium(key)
      broadcastStateSync()
    },

    onFreqInput(e: Event) {
      const freq = Number((e.target as HTMLInputElement).value)
      this.store.setBroadcastFreqKHz(freq)
      broadcastStateSync()
    },

    onFieldInput(e: Event) {
      const vcm = Number((e.target as HTMLInputElement).value)
      this.store.setFieldIntensity(vcm)
      broadcastStateSync()
    },

    onSafeModeChange(on: boolean) {
      this.store.setSafeMode(on)
      broadcastStateSync()
    },

    snapToFc(cellType: 'healthy' | 'target') {
      const fcKhz = cellType === 'healthy' ? this.store.healthyFc : this.store.targetFc
      const snapped = Math.round(Math.max(this.sliderRanges.freqMin, Math.min(this.sliderRanges.freqMax, fcKhz)))
      this.store.setBroadcastFreqKHz(snapped)
      broadcastStateSync()
    },

    snapToOptimal() {
      const { khz } = this.optimalFreqResult
      const snapped = Math.round(Math.max(this.sliderRanges.freqMin, Math.min(this.sliderRanges.freqMax, khz)))
      this.store.setBroadcastFreqKHz(snapped)
      broadcastStateSync()
    },
  },
})
</script>

<style lang="scss" scoped>
/* ── Container query ───────────────────── */
@container (max-width: 320px) {
  .field-panel__row {
    grid-template-columns: 5rem 1fr 5.5rem;
    gap: 0.5rem;
  }
  .field-panel__readout { width: 5.5rem; }
  .field-panel__readout-sub { display: none; }
  .field-panel__row-meta { display: none; }
  .field-panel__row-label { font-size: 0.58rem; }
}

/* ── Keyframes ───────────────────────────────────────────────────────── */
@keyframes thermal-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.6; }
}

@keyframes thumb-danger-pulse {
  0%, 100% { box-shadow: 0 0 6px rgba(255, 77, 109, 0.6); }
  50%       { box-shadow: 0 0 16px rgba(255, 77, 109, 1.0); }
}

@keyframes state-blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.35; }
}

/* ── Block ───────────────────────────────────────────────────────────── */
.field-panel {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.85rem 1.25rem;
  container-type: inline-size;
  flex: 1;  /* fills __field column height → matches cell card height */

  &__title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.1rem;
  }

  &__title {
    font-size: 0.62rem;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--color-text);
  }

  &__scope-note {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-top: -0.45rem;
    cursor: help;
  }

  &__scope-chip {
    font-family: var(--font-mono);
    font-size: 0.5rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    padding: 0.08rem 0.32rem;
    border-radius: 2px;

    &--both {
      background: rgba(0, 212, 255, 0.10);
      color: var(--color-accent);
      border: 1px solid rgba(0, 212, 255, 0.20);
    }

    &--card {
      background: rgba(167, 139, 250, 0.10);
      color: #a78bfa;
      border: 1px solid rgba(167, 139, 250, 0.20);
    }
  }

  &__scope-sep {
    font-family: var(--font-mono);
    font-size: 0.48rem;
    color: var(--color-text-muted);
    opacity: 0.55;
    white-space: nowrap;
  }

  &__safe-toggle {
    display: flex;
    gap: 0.3rem;
  }

  &__safe-lock {
    font-size: 0.55rem;
    opacity: 0.7;
    margin-left: 0.2rem;
  }

  &__scope-tag {
    display: inline-block;
    font-size: 0.44rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    padding: 0.04rem 0.25rem;
    border-radius: 2px;
    vertical-align: middle;
    margin-left: 0.2rem;
    position: relative;
    top: -0.5px;

    &--target {
      background: rgba(255, 77, 109, 0.12);
      color: #ff4d6d;
      border: 1px solid rgba(255, 77, 109, 0.22);
    }

    &--healthy {
      background: rgba(0, 212, 255, 0.10);
      color: var(--color-accent);
      border: 1px solid rgba(0, 212, 255, 0.20);
    }
  }

  /* ── Frequency coupling regime badge ────────────────────────────── */
  &__regime {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-size: 0.62rem;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.07em;
    padding: 0.22rem 0.7rem;
    border-radius: 20px;
    border: 1px solid transparent;
    cursor: default;
    transition: color 0.2s, border-color 0.2s, background 0.2s;

    &--electrolytic {
      color: var(--color-primary);
      border-color: rgba(0, 212, 255, 0.3);
      background: rgba(0, 212, 255, 0.05);
    }

    &--nearfield_rf {
      color: var(--color-amber-warm);
      border-color: rgba(251, 191, 36, 0.35);
      background: rgba(251, 191, 36, 0.06);
    }

    &--microwave {
      color: var(--color-danger, #ff4d6d);
      border-color: rgba(255, 77, 109, 0.35);
      background: rgba(255, 77, 109, 0.06);
    }
  }

  &__regime-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  &__regime--electrolytic &__regime-dot { background: var(--color-primary); }
  &__regime--nearfield_rf &__regime-dot { background: var(--color-amber-warm); }
  &__regime--microwave    &__regime-dot { background: var(--color-danger, #ff4d6d); }

  /* ── Thermal banner ──────────────────────────────────────────────── */
  &__thermal-banner {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.3rem 0.65rem;
    border-radius: var(--radius);
    font-family: var(--font-mono);
    font-size: 0.6rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    border: 1px solid;
    animation: thermal-pulse 2s ease-in-out infinite;

    &--hyperthermic {
      color: var(--color-amber);
      background: rgba(251, 191, 36, 0.07);
      border-color: rgba(251, 191, 36, 0.3);
    }

    &--denaturing {
      color: var(--color-orange);
      background: rgba(251, 130, 20, 0.1);
      border-color: rgba(251, 130, 20, 0.4);
      animation: thermal-pulse 1s ease-in-out infinite;
    }

    &--vaporizing {
      color: var(--color-danger);
      background: rgba(255, 77, 109, 0.1);
      border-color: rgba(255, 77, 109, 0.5);
      animation: thermal-pulse 0.5s ease-in-out infinite;
    }
  }

  &__thermal-icon { flex-shrink: 0; }
  &__thermal-text { flex: 1; }
  &__thermal-temp { flex-shrink: 0; font-weight: 700; }

  /* ── Row ─────────────────────────────────────────────────────────── */
  &__row {
    display: grid;
    // Fixed readout column (8.5rem) prevents text width changes from resizing the slider
    grid-template-columns: 7.5rem 1fr 8.5rem;
    align-items: center;
    gap: 0.85rem;
    min-height: 2.75rem;

    &--medium {
      grid-template-columns: 7.5rem 1fr 8.5rem;
    }

    /* Advanced rows: shorter label column + narrower readout → more slider room */
    &--compact-readout {
      grid-template-columns: 5.5rem 1fr 6.5rem;
      .field-panel__readout { width: 6.5rem; }
    }

    &--hyperthermic .field-panel__slider {
      &::-webkit-slider-thumb {
        background: var(--color-amber);
        box-shadow: 0 0 6px rgba(251, 191, 36, 0.5);
      }
      &::-moz-range-thumb { background: var(--color-amber); }
    }

    &--denaturing .field-panel__slider {
      &::-webkit-slider-thumb {
        background: var(--color-orange);
        box-shadow: 0 0 8px rgba(251, 130, 20, 0.7);
      }
      &::-moz-range-thumb { background: var(--color-orange); }
    }

    &--vaporizing .field-panel__slider {
      &::-webkit-slider-thumb {
        background: var(--color-danger);
        box-shadow: 0 0 10px rgba(255, 77, 109, 0.9);
        animation: thumb-danger-pulse 0.5s ease-in-out infinite;
      }
      &::-moz-range-thumb { background: var(--color-danger); }
    }
  }

  &__row-label {
    font-size: 0.62rem;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-text-muted);
    white-space: nowrap;
    flex-shrink: 0;
  }

  &__row-meta {
    font-size: 0.58rem;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    white-space: nowrap;
    opacity: 0.65;
  }

  /* ── Medium select ───────────────────────────────────────────────── */
  &__medium-select {
    flex: 1;
    min-width: 0;
    padding: 0.26rem 0.55rem;
    font-size: 0.62rem;
    font-family: var(--font-mono);
    background: var(--color-surface-2, #0a1628);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    color: var(--color-primary);
    cursor: pointer;
    outline: none;
    -moz-appearance: none;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='rgba(148,163,184,0.5)'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.5rem center;
    padding-right: 1.6rem;
    transition: border-color 0.15s;

    &:focus,
    &:hover { border-color: var(--color-primary); }

    option, optgroup { background: #0a1628; color: var(--color-text); }
    optgroup { color: var(--color-text-muted); font-style: normal; }
  }

  /* ── Pills ───────────────────────────────────────────────────────── */
  &__pills {
    display: flex;
    gap: 0.35rem;
    flex-wrap: wrap;
  }

  &__pill {
    font-size: 0.62rem;
    font-family: var(--font-mono);
    text-transform: capitalize;
    padding: 0.18rem 0.55rem;
    border: 1px solid var(--color-border);
    border-radius: 12px;
    cursor: pointer;
    color: var(--color-text-muted);
    transition: border-color 0.15s, color 0.15s, background-color 0.15s;
    user-select: none;
    white-space: nowrap;

    input { display: none; }

    &--active {
      border-color: var(--color-primary);
      color: var(--color-primary);
      background-color: var(--color-primary-dim);
    }

    &--sm {
      font-size: 0.58rem;
      padding: 0.14rem 0.45rem;
    }

    &--safe {
      border-color: var(--color-lime) !important;
      color: var(--color-lime) !important;
      background-color: rgba(57, 255, 20, 0.08) !important;
    }

    &--expert {
      border-color: var(--color-amber) !important;
      color: var(--color-amber) !important;
      background-color: rgba(251, 191, 36, 0.08) !important;
    }

    &--nuclear {
      border-color: rgba(167, 139, 250, 0.5) !important;
      color: #a78bfa !important;

      &.field-panel__pill--active {
        border-color: #a78bfa !important;
        background-color: rgba(167, 139, 250, 0.10) !important;
      }
    }
  }

  /* ── Slider track ────────────────────────────────────────────────── */
  &__track {
    position: relative;
    display: flex;
    align-items: center;
  }

  &__slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 3px;
    border-radius: 2px;
    background: var(--color-border);
    outline: none;

    &::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 15px;
      height: 15px;
      border-radius: 50%;
      background: var(--color-text-heading);
      border: 2px solid var(--color-surface);
      box-shadow: 0 0 5px rgba(255, 255, 255, 0.2);
      cursor: pointer;
      transition: box-shadow 0.15s;

      &:hover { box-shadow: 0 0 9px rgba(255, 255, 255, 0.45); }
    }

    &::-moz-range-thumb {
      width: 15px;
      height: 15px;
      border-radius: 50%;
      background: var(--color-text-heading);
      border: 2px solid var(--color-surface);
      cursor: pointer;
    }
  }

  /* ── Readout ─────────────────────────────────────────────────────── */
  &__readout {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem;
    width: 8.5rem;    // fixed — must match grid column so text never shifts slider
    overflow: hidden; // clip rather than push layout

    &-value {
      font-size: 1rem;
      font-weight: 700;
      font-family: var(--font-mono);
      color: var(--color-text-heading);
      letter-spacing: -0.02em;
      line-height: 1;
      white-space: nowrap;
    }

    &-unit {
      font-size: 0.6rem;
      font-weight: 400;
      color: var(--color-text-muted);
    }

    &-sub {
      font-size: 0.64rem;
      font-family: var(--font-mono);
      color: var(--color-text-muted);
      white-space: nowrap;
      opacity: 0.82;
    }

    &--hyperthermic { color: var(--color-amber)  !important; }
    &--denaturing   { color: var(--color-orange) !important; }
    &--vaporizing   { color: var(--color-danger) !important; animation: state-blink 0.5s ease-in-out infinite; }
  }

  &__optimal-row {
    display: flex;
    justify-content: flex-end;
    align-items: center;
    gap: 0.35rem;
    margin-top: -0.35rem;  /* pull closer to the freq slider below */
    margin-bottom: -0.2rem;
  }

  &__optimal-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    padding: 0.18rem 0.55rem;
    font-size: 0.58rem;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #a78bfa;
    background: rgba(167, 139, 250, 0.1);
    border: 1px solid rgba(167, 139, 250, 0.35);
    border-radius: 4px;
    white-space: nowrap;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, color 0.15s, box-shadow 0.15s;

    &:hover {
      background: rgba(167, 139, 250, 0.18);
      border-color: rgba(167, 139, 250, 0.6);
      color: #c4b5fd;
      box-shadow: 0 0 8px rgba(167, 139, 250, 0.25);
    }

    &:active {
      background: rgba(167, 139, 250, 0.25);
    }

    &--beyond {
      color: var(--color-text-muted);
      background: rgba(148, 163, 184, 0.06);
      border-color: rgba(148, 163, 184, 0.2);
      &:hover {
        background: rgba(148, 163, 184, 0.12);
        border-color: rgba(148, 163, 184, 0.35);
        box-shadow: none;
        color: var(--color-text-muted);
      }
    }

    &--fc {
      font-size: 0.56rem;
      padding: 0.15rem 0.45rem;
    }

    &--fc-h {
      color: var(--color-primary);
      background: rgba(0, 212, 255, 0.06);
      border-color: rgba(0, 212, 255, 0.25);
      &:hover {
        background: rgba(0, 212, 255, 0.14);
        border-color: rgba(0, 212, 255, 0.5);
        color: var(--color-primary);
        box-shadow: 0 0 6px rgba(0, 212, 255, 0.2);
      }
    }

    &--fc-t {
      color: var(--color-danger);
      background: rgba(239, 68, 68, 0.06);
      border-color: rgba(239, 68, 68, 0.25);
      &:hover {
        background: rgba(239, 68, 68, 0.14);
        border-color: rgba(239, 68, 68, 0.5);
        color: var(--color-danger);
        box-shadow: 0 0 6px rgba(239, 68, 68, 0.2);
      }
    }
  }

  /* ── Disruption badges ───────────────────────────────────────────── */
  &__badges {
    display: flex;
    gap: 0.35rem;
    align-items: center;
  }

  &__badge {
    font-size: 0.6rem;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 0.1rem 0.35rem;
    border-radius: 3px;
    border: 1px solid transparent;
    transition: color 0.2s, border-color 0.2s;

    &--target  { color: var(--color-danger);  border-color: rgba(255, 77, 109, 0.3); }
    &--healthy { color: var(--color-accent);  border-color: rgba(0, 212, 255, 0.3); }

    &--warn {
      &.field-panel__badge--target  { background-color: rgba(255, 77, 109, 0.12); border-color: var(--color-danger); }
      &.field-panel__badge--healthy { background-color: rgba(0, 212, 255, 0.12);  border-color: var(--color-accent); }
    }
  }

  /* ── Resonance mode note ─────────────────────────────────────────── */
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

    &-icon {
      flex-shrink: 0;
      margin-top: 0.05rem;
      opacity: 0.8;
    }

    &-text strong { color: var(--color-purple-light); }
  }

  /* ── Accordions ──────────────────────────────────────────────────── */
  &__accordion {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 0.3rem 0;
    background: none;
    border: none;
    border-top: 1px solid var(--color-border);
    color: var(--color-text-muted);
    font-size: 0.6rem;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    cursor: pointer;
    text-align: left;
    transition: color 0.15s;
    margin-top: 0.1rem;

    &:hover { color: var(--color-text); }

    &-label { flex: 1; }

    &-chevron {
      font-size: 1rem;
      line-height: 1;
      display: inline-block;
      transform: rotate(0deg);
      transition: transform 0.2s ease;
      opacity: 0.55;

      &--open { transform: rotate(90deg); }
    }

    &-body {
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
      padding-top: 0.4rem;
    }
  }
}
</style>
