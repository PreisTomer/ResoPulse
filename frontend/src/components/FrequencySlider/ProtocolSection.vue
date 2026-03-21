<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <button class="field-panel__accordion" @click="open = !open">
    <span class="field-panel__accordion-label">{{ $t('slider.protocol') }}</span>
    <span class="field-panel__accordion-chevron" :class="{ 'field-panel__accordion-chevron--open': open }">{{ ICON.CHEVRON }}</span>
  </button>

  <div v-show="open" class="field-panel__accordion-body">
    <!-- Row 4: Waveform selector -->
    <div class="field-panel__row field-panel__row--medium" v-tip="tipWaveform">
      <div class="field-panel__row-header">
        <span class="field-panel__row-label">{{ $t('slider.waveform') }}</span>
        <div class="field-panel__pills">
          <label class="field-panel__pill" :class="{ 'field-panel__pill--active': currentWaveform === WAVEFORM.PULSED }">
            <input type="radio" :value="WAVEFORM.PULSED" :checked="currentWaveform === WAVEFORM.PULSED" name="waveform" @change="onWaveformChange(WAVEFORM.PULSED)" />
            {{ $t('slider.pulsed') }}
          </label>
          <label class="field-panel__pill" :class="{ 'field-panel__pill--active': currentWaveform === WAVEFORM.CW }">
            <input type="radio" :value="WAVEFORM.CW" :checked="currentWaveform === WAVEFORM.CW" name="waveform" @change="onWaveformChange(WAVEFORM.CW)" />
            {{ $t('slider.cw') }}
          </label>
        </div>
        <span class="field-panel__row-meta">wf×{{ currentWaveform === WAVEFORM.CW ? CW_WAVEFORM_FACTOR : PULSED_WAVEFORM_FACTOR }}</span>
      </div>
    </div>

    <!-- Row 5: Duty Cycle (pulsed only) -->
    <div
      v-if="currentWaveform === WAVEFORM.PULSED"
      class="field-panel__row field-panel__row--compact-readout"
      :class="thermalDangerLevel !== THERMAL_LEVEL.SAFE ? `field-panel__row--${thermalDangerLevel}` : ''"
    >
      <div class="field-panel__row-header">
        <span class="field-panel__row-label" v-tip="tipDutyCycle">{{ $t('slider.dutyCycle') }}</span>
        <div class="field-panel__readout">
          <span
            class="field-panel__readout-value"
            :class="thermalDangerLevel !== THERMAL_LEVEL.SAFE ? `field-panel__readout--${thermalDangerLevel}` : ''"
            v-tip="tipDutyCycle"
          >{{ dutyCycleDisplay }}</span>
          <span class="field-panel__readout-sub" v-tip="tipDutyCycle">T_ss {{ maxSteadyTemp.toFixed(0) }} {{ UNIT.DEG_C }}</span>
          <span class="field-panel__readout-sub" v-tip="tipDutyCycle">SAR_eff {{ CELL_LABEL.TARGET }} {{ (store.targetSAR * store.dutyCycle).toFixed(1) }} {{ UNIT.W_PER_KG }}</span>
        </div>
      </div>
      <div class="field-panel__track">
        <input
          class="field-panel__slider"
          type="range"
          :min="SLIDER_DC.LOG_MIN"
          :max="SLIDER_DC.LOG_MAX"
          :step="SLIDER_DC.LOG_STEP"
          :value="dutyCycleLogVal"
          @input="onDutyCycleInput"
        />
      </div>
    </div>

    <!-- Row 6: Pulse Width (pulsed only) -->
    <div v-if="currentWaveform === WAVEFORM.PULSED" class="field-panel__row field-panel__row--compact-readout">
      <div class="field-panel__row-header">
        <span class="field-panel__row-label" v-tip="tipPulseWidth">{{ $t('slider.pulseWidth') }}</span>
        <div class="field-panel__readout">
          <span class="field-panel__readout-value" v-tip="tipPulseWidth">{{ pulseWidthDisplay }}</span>
          <span class="field-panel__readout-sub" v-tip="tipPulseWidth">Lysis {{ lysisTimeDisplay }}</span>
          <span class="field-panel__readout-sub" :style="minPwStyle" v-tip="tipMinPulse">{{ minPwDisplay }}</span>
        </div>
      </div>
      <div class="field-panel__track">
        <input
          class="field-panel__slider"
          type="range"
          :min="sliderRanges.pwLogMin"
          :max="sliderRanges.pwLogMax"
          step="0.05"
          :value="pulseWidthLogVal"
          @input="onPulseWidthInput"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import type { PropType } from 'vue'
import { useCellStore } from '@/stores/cellStore'
import { broadcastStateSync } from '@/services/socket'
import { WAVEFORM, THERMAL_LEVEL, CELL_LABEL } from '@/constants/strings'
import { ICON } from '@/constants/icons'
import { UNIT } from '@/constants/units'
import { tipWaveform, tipDutyCycle, tipPulseWidth, formatLysisTime } from '@/tooltips/sliderTooltips'
import { CW_WAVEFORM_FACTOR, PULSED_WAVEFORM_FACTOR } from '@/constants/experimentDefaults'
import { SLIDER_DC } from '@/constants/sliderBounds'

export default defineComponent({
  props: {
    sliderRanges: {
      type: Object as PropType<{
        freqMin: number; freqMax: number; freqStep: number
        fieldMin: number; fieldMax: number; fieldStep: number
        pwLogMin: number; pwLogMax: number
      }>,
      required: true,
    },
    thermalDangerLevel: {
      type: String as PropType<'safe' | 'hyperthermic' | 'denaturing' | 'vaporizing'>,
      required: true,
    },
    maxSteadyTemp:      { type: Number,  required: true },
  },

  setup() {
    return { store: useCellStore(), WAVEFORM, THERMAL_LEVEL, ICON, UNIT, CELL_LABEL, CW_WAVEFORM_FACTOR, PULSED_WAVEFORM_FACTOR, SLIDER_DC }
  },

  data() {
    return { open: true }
  },

  computed: {
    currentWaveform(): 'cw' | 'pulsed' { return this.store.waveform },

    dutyCycleLogVal(): number { return Math.log10(this.store.dutyCycle) },

    dutyCycleDisplay(): string {
      const pct = this.store.dutyCycle * 100
      if (pct < 0.001) return (pct * 1000).toFixed(1) + ' µ%'
      return pct.toFixed(2) + '%'
    },

    pulseWidthLogVal(): number { return Math.log10(this.store.pulseWidthNs) },

    pulseWidthDisplay(): string {
      const ns = this.store.pulseWidthNs
      if (ns >= 1000) return (ns / 1000).toFixed(ns >= 10000 ? 0 : 1) + ' ' + UNIT.US
      return ns.toFixed(0) + ' ' + UNIT.NS
    },

    tipWaveform(): string {
      return tipWaveform(this.store.fieldIntensity, this.maxSteadyTemp)
    },

    tipDutyCycle(): string {
      return tipDutyCycle({
        effectiveDutyCycle: this.store.effectiveDutyCycle,
        targetSAR:          this.store.targetSAR,
        healthySAR:         this.store.healthySAR,
        maxSteadyTemp:      this.maxSteadyTemp,
        thermalDangerLevel: this.thermalDangerLevel,
        dutyCycleDisplay:   this.dutyCycleDisplay,
      })
    },

    tipPulseWidth(): string {
      return tipPulseWidth({
        targetFc:          this.store.targetFc,
        healthyFc:         this.store.healthyFc,
        pulseWidthDisplay: this.pulseWidthDisplay,
        lysisDelayMs:      this.store.lysisDelayMs,
        lysisNPulses:      this.store.lysisNPulses,
        dutyCycle:         this.store.dutyCycle,
      })
    },

    lysisTimeDisplay(): string { return formatLysisTime(this.store.lysisDelayMs) },

    /** τ of target cell in ns, derived from fc (τ = 1/2πfc) */
    tauTargetNs(): number {
      return this.store.targetFc > 0 ? 1e6 / (2 * Math.PI * this.store.targetFc) : 0
    },

    /** Minimum effective pulse width for full membrane charging (3τ) */
    minPwNs(): number { return 3 * this.tauTargetNs },

    minPwDisplay(): string {
      const ns = this.minPwNs
      if (ns <= 0) return ''
      if (ns >= 1000) return `3τ_T ≥ ${(ns / 1000).toFixed(1)} ${UNIT.US}`
      return `3τ_T ≥ ${ns.toFixed(0)} ${UNIT.NS}`
    },

    pwSufficiency(): 'ok' | 'marginal' | 'below' {
      const pw = this.store.pulseWidthNs
      if (pw >= this.minPwNs) return 'ok'
      if (pw >= this.tauTargetNs) return 'marginal'
      return 'below'
    },

    minPwStyle(): string {
      if (this.pwSufficiency === 'ok')       return 'color: var(--color-lime)'
      if (this.pwSufficiency === 'marginal') return 'color: var(--color-amber)'
      return 'color: var(--color-danger)'
    },

    tipMinPulse(): string { return this.$t('slider.tipMinPulse') },
  },

  methods: {
    onWaveformChange(mode: typeof WAVEFORM[keyof typeof WAVEFORM]) {
      this.store.setWaveform(mode)
      broadcastStateSync()
    },

    onDutyCycleInput(e: Event) {
      const logVal = Number((e.target as HTMLInputElement).value)
      this.store.setDutyCycle(Math.pow(10, logVal))
      broadcastStateSync()
    },

    onPulseWidthInput(e: Event) {
      const logVal = Number((e.target as HTMLInputElement).value)
      this.store.setPulseWidthNs(Math.round(Math.pow(10, logVal)))
      broadcastStateSync()
    },
  },
})
</script>

<style lang="scss" scoped>
@use '../../styles/mixins' as *;

@keyframes thumb-danger-pulse {
  0%, 100% { box-shadow: 0 0 6px color-mix(in srgb, var(--color-danger) 60%, transparent); }
  50%       { box-shadow: 0 0 16px var(--color-danger); }
}

@keyframes state-blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.35; }
}

.field-panel {
  &__accordion {
    @include accordion-header();

    &-label  { flex: 1; }

    &-chevron {
      font-size: 1rem;
      line-height: 1;
      display: inline-block;
      transform: rotate(0deg);
      transition: transform 0.2s ease;
      opacity: 0.55;

      &--open { transform: rotate(90deg); }
    }

    &-body { display: flex; flex-direction: column; gap: 0.9rem; padding-top: 0.4rem; }
  }

  &__safe-lock { font-size: var(--fs-xxs); opacity: 0.7; margin-left: 0.2rem; }

  &__row {
    @include field-row-grid();

    &--medium .field-panel__row-header .field-panel__pills { flex: 1; justify-content: center; }

    &--hyperthermic .field-panel__slider {
      &::-webkit-slider-thumb { background: var(--color-amber);  box-shadow: 0 0 6px  color-mix(in srgb, var(--color-amber) 50%, transparent); }
      &::-moz-range-thumb     { background: var(--color-amber); }
    }

    &--denaturing .field-panel__slider {
      &::-webkit-slider-thumb { background: var(--color-orange); box-shadow: 0 0 8px  color-mix(in srgb, var(--color-orange) 70%, transparent); }
      &::-moz-range-thumb     { background: var(--color-orange); }
    }

    &--vaporizing .field-panel__slider {
      &::-webkit-slider-thumb { background: var(--color-danger); box-shadow: 0 0 10px color-mix(in srgb, var(--color-danger) 90%, transparent); animation: thumb-danger-pulse 0.5s ease-in-out infinite; }
      &::-moz-range-thumb     { background: var(--color-danger); }
    }
  }

  &__row-header { @include field-row-header(); }

  &__row-label { @include row-label(); }

  &__row-meta { font-size: var(--fs-xxs); font-family: var(--font-mono); color: var(--color-text-muted); white-space: nowrap; opacity: 0.80; }

  &__pills { display: flex; gap: 0.35rem; flex-wrap: wrap; }

  &__pill {
    @include mono-upper(0.62rem, 0);
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

    &--active  { border-color: var(--color-primary); color: var(--color-primary); background-color: var(--color-primary-dim); }
    &--sm      { font-size: var(--fs-xs); padding: 0.14rem 0.45rem; }
    &--safe    { border-color: var(--color-lime)  !important; color: var(--color-lime)  !important; background-color: color-mix(in srgb, var(--color-lime) 8%, transparent)   !important; }
    &--expert  { border-color: var(--color-amber) !important; color: var(--color-amber) !important; background-color: color-mix(in srgb, var(--color-amber) 8%, transparent)  !important; }
    &--nuclear {
      border-color: color-mix(in srgb, var(--color-purple) 50%, transparent) !important;
      color: var(--color-purple) !important;
      &.field-panel__pill--active { border-color: var(--color-purple) !important; background-color: var(--color-purple-dim) !important; }
    }
  }

  &__track { position: relative; display: flex; align-items: center; }

  &__slider {
    @include slider-track();
    @include slider-thumb();
  }

  &__readout {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem;
    flex-shrink: 0;

    &-value {
      font-size: 1rem;
      font-weight: 700;
      font-family: var(--font-mono);
      color: var(--color-text-heading);
      letter-spacing: -0.02em;
      line-height: 1;
      white-space: nowrap;
    }

    &-sub { font-size: var(--fs-xxs); font-family: var(--font-mono); color: var(--color-text-muted); white-space: nowrap; opacity: 0.82; }

    &--hyperthermic { color: var(--color-amber)  !important; }
    &--denaturing   { color: var(--color-orange) !important; }
    &--vaporizing   { color: var(--color-danger) !important; animation: state-blink 0.5s ease-in-out infinite; }
  }
}
</style>
