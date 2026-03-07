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
      <span class="field-panel__scope-chip field-panel__scope-chip--both">H + T</span>
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
      <span class="field-panel__thermal-temp">T_ss {{ maxSteadyTemp.toFixed(0) }}°C</span>
    </div>

    <!-- Row 1: Medium selector -->
    <div class="field-panel__row field-panel__row--medium">
      <span class="field-panel__row-label" v-tip="tipMedium">{{ $t('slider.medium') }}</span>
      <div class="field-panel__pills">
        <label
          v-for="key in mediaKeys"
          :key="key"
          class="field-panel__pill"
          :class="{ 'field-panel__pill--active': currentMedium === key }"
          v-tip="tipMediumKeys[key]"
        >
          <input
            type="radio"
            :value="key"
            :checked="currentMedium === key"
            name="medium"
            @change="onMediumChange(key)"
          />
          {{ MEDIA[key].name.split(' ')[0] }}
        </label>
      </div>
      <span
        class="field-panel__row-meta"
        v-tip="tipSigmaE"
      >σ_e {{ MEDIA[currentMedium].conductivity }} S/m</span>
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
        <button
          v-if="!isResonanceMode"
          class="field-panel__optimal-btn"
          :class="{ 'field-panel__optimal-btn--beyond': optimalBeyondRange }"
          v-tip="tipOptimalBtn"
          @click="snapToOptimal"
          type="button"
        >{{ $t('slider.snapOptimal') }} {{ optimalFreqLabel }}</button>
        <span v-else class="field-panel__readout-sub" v-tip="tipFcSub">{{ freqSubDisplay }}</span>
      </div>
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
            :class="{ 'field-panel__badge--warn': targetDisruption > 0.85 }"
            v-tip="tipTargetBadge"
          >T {{ targetDisruptPercent }}%</span>
          <span
            class="field-panel__badge field-panel__badge--healthy"
            :class="{ 'field-panel__badge--warn': healthyDisruption > 0.85 }"
            v-tip="tipHealthyBadge"
          >H {{ healthyDisruptPercent }}%</span>
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
import { broadcastFieldParams } from '@/services/socket'
import { MEDIA } from '@/constants/media'
import { CHART_MODE, CELL_CATEGORY, THERMAL_LEVEL } from '@/constants/strings'
import { ICON } from '@/constants/icons'
import type { MediumKey } from '@/types/media'
import { formatFreqKHz, formatFieldVcm } from '@/utils/format'
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
} from '@/utils/sliderTooltips'
import ProtocolSection from './ProtocolSection.vue'
import AdvancedSection from './AdvancedSection.vue'

export default defineComponent({
  components: { ProtocolSection, AdvancedSection },

  setup() {
    const store = useCellStore()
    return { store, MEDIA, ICON, THERMAL_LEVEL }
  },

  computed: {
    currentFreq(): number      { return this.store.currentBroadcastFrequency },
    currentField(): number     { return this.store.fieldIntensity },
    currentMedium(): MediumKey { return this.store.medium },

    isResonanceMode(): boolean { return this.store.chartMode === CHART_MODE.RESONANCE },

    targetDisruption(): number  { return this.store.targetDisruptionRatio },
    healthyDisruption(): number { return this.store.healthyDisruptionRatio },

    sliderRanges(): { freqMin: number; freqMax: number; freqStep: number; fieldMin: number; fieldMax: number; fieldStep: number; pwLogMin: number; pwLogMax: number } {
      const cat = this.store.targetCellCategory
      if (this.isResonanceMode) {
        if (cat === CELL_CATEGORY.VIRUS)
          return { freqMin: 1000000, freqMax: 50000000, freqStep: 100000, fieldMin: 10, fieldMax: 5000, fieldStep: 10, pwLogMin: 0, pwLogMax: 2 }
        if (cat === CELL_CATEGORY.MAMMALIAN)
          return { freqMin: 10, freqMax: 10000, freqStep: 1, fieldMin: 10, fieldMax: 3000, fieldStep: 1, pwLogMin: 0, pwLogMax: 5 }
        return { freqMin: 10000, freqMax: 10000000, freqStep: 10000, fieldMin: 10, fieldMax: 10000, fieldStep: 100, pwLogMin: 0, pwLogMax: 3 }
      }
      if (cat === CELL_CATEGORY.VIRUS)
        return { freqMin: 1, freqMax: 5000000, freqStep: 1000, fieldMin: 10, fieldMax: 100000, fieldStep: 10, pwLogMin: 0, pwLogMax: 2 }
      if (cat === CELL_CATEGORY.BACTERIA)
        return { freqMin: 10, freqMax: 1000000, freqStep: 100, fieldMin: 10, fieldMax: 100000, fieldStep: 100, pwLogMin: 0, pwLogMax: 3 }
      return { freqMin: 10, freqMax: 10000, freqStep: 1, fieldMin: 10, fieldMax: 3000, fieldStep: 1, pwLogMin: 0, pwLogMax: 5 }
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
      broadcastFieldParams(this.currentFreq, this.currentField, key)
    },

    onFreqInput(e: Event) {
      const freq = Number((e.target as HTMLInputElement).value)
      this.store.setBroadcastFreqKHz(freq)
      broadcastFieldParams(freq, this.currentField, this.currentMedium)
    },

    onFieldInput(e: Event) {
      const vcm = Number((e.target as HTMLInputElement).value)
      this.store.setFieldIntensity(vcm)
      broadcastFieldParams(this.currentFreq, vcm, this.currentMedium)
    },

    onSafeModeChange(on: boolean) {
      this.store.setSafeMode(on)
    },

    snapToOptimal() {
      const { khz } = this.optimalFreqResult
      const snapped = Math.round(Math.max(this.sliderRanges.freqMin, Math.min(this.sliderRanges.freqMax, khz)))
      this.store.setBroadcastFreqKHz(snapped)
      broadcastFieldParams(snapped, this.currentField, this.currentMedium)
    },
  },
})
</script>

<style lang="scss">
/* ── Container query ───────────────────── */
@container (max-width: 320px) {
  .field-panel__row {
    grid-template-columns: 5rem 1fr auto;
    gap: 0.5rem;
  }
  .field-panel__readout { min-width: 5.5rem; }
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

/* ── Mobile ──────────────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .field-panel {
    margin-top: 1rem;
    padding: 0.7rem 0.85rem;
  }
  .field-panel__row {
    grid-template-columns: 5.5rem 1fr auto;
    gap: 0.5rem;
  }
  .field-panel__readout { min-width: 6rem; }
  .field-panel__readout-value { font-size: 0.85rem; }
  .field-panel__readout-sub { display: none; }
  .field-panel__row-meta { display: none; }
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
    grid-template-columns: 7.5rem 1fr auto;
    align-items: center;
    gap: 0.85rem;
    min-height: 2.75rem;

    &--medium {
      grid-template-columns: 7.5rem 1fr auto;
    }

    /* Advanced rows: shorter label column + narrower readout → more slider room */
    &--compact-readout {
      grid-template-columns: 5.5rem 1fr auto;
      .field-panel__readout { min-width: 6rem; }
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
    min-width: 8rem;

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
