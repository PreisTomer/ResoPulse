<template>
  <button class="field-panel__accordion" @click="open = !open">
    <span class="field-panel__accordion-label">{{ $t('slider.protocol') }}</span>
    <span class="field-panel__accordion-chevron" :class="{ 'field-panel__accordion-chevron--open': open }">{{ ICON.CHEVRON }}</span>
  </button>

  <div v-show="open" class="field-panel__accordion-body">
    <!-- Row 4: Waveform selector -->
    <div class="field-panel__row field-panel__row--medium" v-tip="tipWaveform">
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
      <span class="field-panel__row-meta">wf×{{ currentWaveform === WAVEFORM.CW ? '0.5' : '1.0' }}</span>
    </div>

    <!-- Row 5: Duty Cycle (pulsed only) -->
    <div
      v-if="currentWaveform === WAVEFORM.PULSED"
      class="field-panel__row"
      :class="thermalDangerLevel !== THERMAL_LEVEL.SAFE ? `field-panel__row--${thermalDangerLevel}` : ''"
    >
      <span class="field-panel__row-label" v-tip="tipDutyCycle">
        {{ $t('slider.dutyCycle') }}
        <span v-if="isSafeMode" class="field-panel__safe-lock" v-tip="tipSafeModeLock">{{ ICON.LOCK }}</span>
      </span>
      <div class="field-panel__track">
        <input
          class="field-panel__slider"
          type="range"
          min="-6"
          :max="isSafeMode ? safeDutyCycleMaxLog : -1"
          step="0.05"
          :value="dutyCycleLogVal"
          @input="onDutyCycleInput"
        />
      </div>
      <div class="field-panel__readout">
        <span
          class="field-panel__readout-value"
          :class="thermalDangerLevel !== THERMAL_LEVEL.SAFE ? `field-panel__readout--${thermalDangerLevel}` : ''"
          v-tip="tipDutyCycle"
        >{{ dutyCycleDisplay }}</span>
        <span class="field-panel__readout-sub" v-tip="tipDutyCycle">
          T_ss {{ maxSteadyTemp.toFixed(0) }}°C · SAR_eff T {{ (store.targetSAR * store.dutyCycle).toFixed(1) }} W/kg
        </span>
      </div>
    </div>

    <!-- Row 6: Pulse Width (pulsed only) -->
    <div v-if="currentWaveform === WAVEFORM.PULSED" class="field-panel__row">
      <span class="field-panel__row-label" v-tip="tipPulseWidth">{{ $t('slider.pulseWidth') }}</span>
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
      <div class="field-panel__readout">
        <span class="field-panel__readout-value" v-tip="tipPulseWidth">{{ pulseWidthDisplay }}</span>
        <span class="field-panel__readout-sub" v-tip="tipPulseWidth">
          Lysis {{ store.lysisDelayMs >= 1000 ? (store.lysisDelayMs / 1000).toFixed(1) + 's' : store.lysisDelayMs + 'ms' }}
        </span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import type { PropType } from 'vue'
import { useCellStore } from '@/stores/cellStore'
import { WAVEFORM, THERMAL_LEVEL } from '@/constants/strings'
import { ICON } from '@/constants/icons'
import { tipWaveform, tipDutyCycle, tipPulseWidth, tipSafeModeLock } from '@/utils/sliderTooltips'

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
    isSafeMode:         { type: Boolean, required: true },
    safeDutyCycleMaxLog:{ type: Number,  required: true },
  },

  setup() {
    return { store: useCellStore(), WAVEFORM, THERMAL_LEVEL, ICON }
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
      if (pct < 0.1)   return pct.toFixed(2) + '%'
      return pct.toFixed(2) + '%'
    },

    pulseWidthLogVal(): number { return Math.log10(this.store.pulseWidthNs) },

    pulseWidthDisplay(): string {
      const ns = this.store.pulseWidthNs
      if (ns >= 1000) return (ns / 1000).toFixed(ns >= 10000 ? 0 : 1) + ' µs'
      return ns.toFixed(0) + ' ns'
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

    tipSafeModeLock(): string { return tipSafeModeLock() },
  },

  methods: {
    onWaveformChange(mode: typeof WAVEFORM[keyof typeof WAVEFORM]) {
      this.store.setWaveform(mode)
    },

    onDutyCycleInput(e: Event) {
      let logVal = Number((e.target as HTMLInputElement).value)
      if (this.isSafeMode) {
        const maxLog = this.safeDutyCycleMaxLog
        if (logVal > maxLog) {
          logVal = maxLog
          ;(e.target as HTMLInputElement).value = String(logVal)
        }
      }
      this.store.setDutyCycle(Math.pow(10, logVal))
    },

    onPulseWidthInput(e: Event) {
      const logVal = Number((e.target as HTMLInputElement).value)
      this.store.setPulseWidthNs(Math.round(Math.pow(10, logVal)))
    },
  },
})
</script>
