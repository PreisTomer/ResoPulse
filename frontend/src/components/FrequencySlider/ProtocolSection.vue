<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="field-panel__section" :class="{ 'field-panel__section--open': open }">
  <button class="field-panel__accordion" :class="{ 'field-panel__accordion--open': open }" @click="open = !open">
    <span class="field-panel__accordion-label">{{ $t('slider.protocol') }}</span>
    <span class="field-panel__accordion-chevron" :class="{ 'field-panel__accordion-chevron--open': open }">{{ ICON.CHEVRON }}</span>
  </button>

  <div v-show="open" class="field-panel__accordion-body">
    <ProtocolSnapBar :slider-ranges="sliderRanges" />

    <!-- Resonance mode note: replaces waveform/duty-cycle/pulse-width controls -->
    <div v-if="isResonanceMode" class="field-panel__row field-panel__row--acoustic-note">
      <span class="field-panel__acoustic-label">{{ $t('slider.acousticModeNote') }}</span>
    </div>

    <!-- Row 4: Waveform selector — EP only -->
    <div v-if="!isResonanceMode" id="hl-waveform-row" class="field-panel__row field-panel__row--medium" v-tip="tipWaveform">
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
          <label
            class="field-panel__pill field-panel__pill--hfire"
            :class="{ 'field-panel__pill--active': currentWaveform === WAVEFORM.H_FIRE }"
            v-tip="$t('slider.tipHfire')"
          >
            <input type="radio" :value="WAVEFORM.H_FIRE" :checked="currentWaveform === WAVEFORM.H_FIRE" name="waveform" @change="onWaveformChange(WAVEFORM.H_FIRE)" />
            {{ $t('slider.hfire') }}
          </label>
        </div>
        <span class="field-panel__row-meta">{{ waveformMetaLabel }}</span>
      </div>
    </div>

    <!-- Row 5: Duty Cycle — EP + pulsed/H-FIRE only -->
    <div
      v-if="!isResonanceMode && isTimedWaveform"
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
          <span class="field-panel__readout-sub" v-tip="tipDutyCycle">SAR_eff {{ CELL_LABEL.TARGET }} {{ (cellStore.targetSAR * cellStore.dutyCycle).toFixed(1) }} {{ UNIT.W_PER_KG }}</span>
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

    <!-- Row 6: Pulse Width — EP + pulsed/H-FIRE only -->
    <div v-if="!isResonanceMode && isTimedWaveform" class="field-panel__row field-panel__row--compact-readout field-panel__row--pw">
      <div class="field-panel__row-header">
        <span class="field-panel__row-label" v-tip="tipPulseWidth">{{ $t('slider.pulseWidth') }}</span>
        <div class="field-panel__readout">
          <span class="field-panel__readout-value" v-tip="tipPulseWidth">{{ pulseWidthDisplay }}</span>
          <span class="field-panel__readout-sub" v-tip="tipPulseWidth">Lysis {{ lysisTimeDisplay }}</span>
          <span class="field-panel__readout-sub" :class="`field-panel__readout-sub--pw-${pwSufficiency}`" v-tip="tipMinPulse">{{ minPwDisplay }}</span>
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
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'
import type { PropType } from 'vue'

import { useCellStore } from '@/stores/cellStore'
import { useUiStore } from '@/stores/uiStore'

import { broadcastStateSync } from '@/services/socket'

import { tipWaveform, tipDutyCycle, tipPulseWidth, formatLysisTime } from '@/tooltips/sliderTooltips'

import { WAVEFORM, THERMAL_LEVEL, CELL_LABEL, type WaveformMode } from '@/constants/strings'
import { ICON } from '@/constants/icons'
import { UNIT } from '@/constants/units'
import { CW_WAVEFORM_FACTOR, PULSED_WAVEFORM_FACTOR } from '@/constants/experimentDefaults'
import { H_FIRE_THRESHOLD_MULTIPLIER } from '@/constants/physics'
import { SLIDER_DC } from '@/constants/sliderBounds'

import ProtocolSnapBar from './ProtocolSnapBar.vue'

export default defineComponent({
  components: { ProtocolSnapBar },

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

  data() {
    return { open: true, WAVEFORM, THERMAL_LEVEL, ICON, UNIT, CELL_LABEL, CW_WAVEFORM_FACTOR, PULSED_WAVEFORM_FACTOR, H_FIRE_THRESHOLD_MULTIPLIER, SLIDER_DC }
  },

  computed: {
    ...mapStores(useCellStore, useUiStore),

    isResonanceMode(): boolean { return this.cellStore.isResonanceMode },

    currentWaveform(): 'cw' | 'pulsed' | 'hfire' { return this.cellStore.waveform },

    isTimedWaveform(): boolean { return this.currentWaveform === WAVEFORM.PULSED || this.currentWaveform === WAVEFORM.H_FIRE },

    waveformMetaLabel(): string {
      if (this.currentWaveform === WAVEFORM.CW)     return `wf×${CW_WAVEFORM_FACTOR}`
      if (this.currentWaveform === WAVEFORM.H_FIRE) return `wf×${PULSED_WAVEFORM_FACTOR} thr×${H_FIRE_THRESHOLD_MULTIPLIER}`
      return `wf×${PULSED_WAVEFORM_FACTOR}`
    },

    dutyCycleLogVal(): number { return Math.log10(this.cellStore.dutyCycle) },

    dutyCycleDisplay(): string {
      const pct = this.cellStore.dutyCycle * 100
      if (pct < 0.001) return (pct * 1000).toFixed(1) + ' µ%'
      return pct.toFixed(2) + '%'
    },

    pulseWidthLogVal(): number { return Math.log10(this.cellStore.pulseWidthNs) },

    pulseWidthDisplay(): string {
      const ns = this.cellStore.pulseWidthNs
      if (ns >= 1000) return (ns / 1000).toFixed(ns >= 10000 ? 0 : 1) + ' ' + UNIT.US
      return ns.toFixed(0) + ' ' + UNIT.NS
    },

    tipWaveform(): string {
      return tipWaveform(this.cellStore.fieldIntensity, this.maxSteadyTemp)
    },

    tipDutyCycle(): string {
      return tipDutyCycle({
        effectiveDutyCycle: this.cellStore.effectiveDutyCycle,
        targetSAR:          this.cellStore.targetSAR,
        healthySAR:         this.cellStore.healthySAR,
        maxSteadyTemp:      this.maxSteadyTemp,
        thermalDangerLevel: this.thermalDangerLevel,
        dutyCycleDisplay:   this.dutyCycleDisplay,
      })
    },

    tipPulseWidth(): string {
      return tipPulseWidth({
        targetFc:          this.cellStore.targetFc,
        healthyFc:         this.cellStore.healthyFc,
        pulseWidthDisplay: this.pulseWidthDisplay,
        lysisDelayMs:      this.cellStore.lysisDelayMs,
        lysisNPulses:      this.cellStore.lysisNPulses,
        dutyCycle:         this.cellStore.dutyCycle,
      })
    },

    lysisTimeDisplay(): string { return formatLysisTime(this.cellStore.lysisDelayMs) },

    tauTargetNs(): number {
      return this.cellStore.targetFc > 0 ? 1e6 / (2 * Math.PI * this.cellStore.targetFc) : 0
    },

    minPwNs(): number { return 3 * this.tauTargetNs },

    minPwDisplay(): string {
      const ns = this.minPwNs
      if (ns <= 0) return ''
      if (ns >= 1000) return `3τ_T ≥ ${(ns / 1000).toFixed(1)} ${UNIT.US}`
      return `3τ_T ≥ ${ns.toFixed(0)} ${UNIT.NS}`
    },

    pwSufficiency(): 'ok' | 'marginal' | 'below' {
      const pw = this.cellStore.pulseWidthNs
      if (pw >= this.minPwNs) return 'ok'
      if (pw >= this.tauTargetNs) return 'marginal'
      return 'below'
    },

    tipMinPulse(): string { return this.$t('slider.tipMinPulse') },
  },

  watch: {
    'uiStore.replayProtocolOpen'(val: boolean) {
      if (val) this.open = true
    },
  },

  methods: {
    onWaveformChange(mode: WaveformMode) {
      this.cellStore.setWaveform(mode)
      broadcastStateSync()
    },

    onDutyCycleInput(e: Event) {
      const logVal = Number((e.target as HTMLInputElement).value)
      this.cellStore.setDutyCycle(Math.pow(10, logVal))
      broadcastStateSync()
    },

    onPulseWidthInput(e: Event) {
      const logVal = Number((e.target as HTMLInputElement).value)
      this.cellStore.setPulseWidthNs(Math.round(Math.pow(10, logVal)))
      broadcastStateSync()
    },
  },
})
</script>

<style lang="scss" scoped>

.field-panel {
  &__section {
    border-bottom: 1px solid var(--color-border);
    background: color-mix(in srgb, var(--color-text) 3%, var(--color-surface));
  }

  &__accordion {
    @include accordion-header();
    border-top: none;
    padding: 0.65rem 1.25rem;

    &-label  { flex: 1; }

    &-chevron {
      font-size: var(--fs-2xl);
      line-height: 1;
      display: inline-block;
      transform: rotate(0deg);
      transition: transform var(--tr-normal);
      opacity: var(--op-muted);

      &--open { transform: rotate(90deg); }
    }

    &-body {
      display: flex;
      flex-direction: column;
      gap: 0.9rem;
      padding: 0.6rem 1.25rem 0.8rem;
    }
  }

  &__safe-lock { font-size: var(--fs-xxs); opacity: var(--op-dim); margin-left: 0.2rem; }

  &__row {
    @include field-row-grid();

    &--medium .field-panel__row-label { min-width: 4.2rem; flex-shrink: 0; }
    &--medium .field-panel__row-header .field-panel__pills { flex: 1; justify-content: flex-start; }
    &--medium .field-panel__row-meta {
      min-width: 7.5rem;
      text-align: right;
      @media (max-width: 480px) { min-width: 5rem; }
    }

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

    &--pw { margin-bottom: 10px; }

    &--acoustic-note {
      padding: 0.6rem 1.25rem;
      display: block;
    }
  }

  &__acoustic-label {
    @include mono-upper(var(--fs-xxs));
    color: var(--color-amber);
    opacity: var(--op-dim);
    line-height: 1.5;
    display: block;
  }

  &__row-header { @include field-row-header(); }

  &__row-label { @include row-label(); }

  &__row-meta { font-size: var(--fs-xxs); font-family: var(--font-mono); color: var(--color-text-muted); white-space: nowrap; opacity: var(--op-partial); }

  &__pills { display: flex; gap: 0.35rem; flex-wrap: wrap; }

  &__pill {
    @include mono-upper(0.62rem, 0);
    text-transform: capitalize;
    padding: 0.18rem 0.55rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    cursor: pointer;
    color: var(--color-text-muted);
    transition: border-color var(--tr-fast), color var(--tr-fast), background-color var(--tr-fast);
    user-select: none;
    white-space: nowrap;

    input { display: none; }

    &:active   { filter: brightness(1.4); transform: scale(0.95); }
    &--active  { border-color: var(--color-primary); color: var(--color-primary); background-color: var(--color-primary-dim); }
    &--sm      { font-size: var(--fs-xs); padding: 0.14rem 0.45rem; }
    &--hfire   {
      border-color: color-mix(in srgb, var(--color-amber) 40%, var(--color-border)) !important;
      color: color-mix(in srgb, var(--color-amber) 55%, var(--color-text-muted)) !important;
      &.field-panel__pill--active {
        border-color: var(--color-amber) !important;
        color: var(--color-amber) !important;
        background-color: color-mix(in srgb, var(--color-amber) 24%, transparent) !important;
        box-shadow: 0 0 8px color-mix(in srgb, var(--color-amber) 28%, transparent);
      }
    }
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
      font-size: var(--fs-2xl);
      font-weight: 700;
      font-family: var(--font-mono);
      color: var(--color-text-heading);
      letter-spacing: -0.02em;
      line-height: 1;
      white-space: nowrap;
    }

    &-sub {
      font-size: var(--fs-xxs);
      font-family: var(--font-mono);
      color: var(--color-text-muted);
      white-space: nowrap;
      opacity: 0.82;

      &--pw-ok      { color: var(--color-lime);   opacity: 1; }
      &--pw-marginal { color: var(--color-amber);  opacity: 1; }
      &--pw-below   { color: var(--color-danger);  opacity: 1; }
    }

    &--hyperthermic { color: var(--color-amber)  !important; }
    &--denaturing   { color: var(--color-orange) !important; }
    &--vaporizing   { color: var(--color-danger) !important; animation: state-blink 0.5s ease-in-out infinite; }
  }
}
</style>
