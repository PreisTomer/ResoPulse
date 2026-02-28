<script lang="ts">
import { defineComponent } from 'vue'
import { useCellStore } from '../stores/cellStore'
import { broadcastFieldParams } from '../services/socket'
import { MEDIA } from '../mockData'
import type { MediumKey } from '../mockData'
import {
  formatLysisTime,
  tipWaveform,
  tipDutyCycle,
  tipMedium,
  tipMediumKeys,
  tipFreq,
  tipFcSub,
  tipField,
  tipTargetBadge,
  tipHealthyBadge,
  tipOrientation,
  tipLysisN,
  tipPulseWidth,
} from '../utils/sliderTooltips'

export default defineComponent({
  setup() {
    const store = useCellStore()
    return { store, MEDIA }
  },

  data() {
    return {
      protocolOpen: true,
      advancedOpen: false,
    }
  },

  computed: {
    currentFreq(): number {
      return this.store.currentBroadcastFrequency
    },

    currentField(): number {
      return this.store.fieldIntensity
    },

    currentMedium(): MediumKey {
      return this.store.medium
    },

    targetDisruption(): number {
      return this.store.targetDisruptionRatio
    },

    healthyDisruption(): number {
      return this.store.healthyDisruptionRatio
    },

    /** Per-category and per-mode slider ranges. */
    sliderRanges(): { freqMin: number; freqMax: number; freqStep: number; fieldMin: number; fieldMax: number; fieldStep: number; pwLogMin: number; pwLogMax: number } {
      const cat = this.store.targetCellCategory
      if (this.store.chartMode === 'resonance') {
        if (cat === 'virus') {
          // GHz range for viral capsid resonance (Flu ~12 GHz, SARS-CoV-2 ~10 GHz)
          // freqMax = 50 GHz = 50,000,000 kHz; step = 100 MHz = 100,000 kHz
          return { freqMin: 1000000, freqMax: 50000000, freqStep: 100000, fieldMin: 10, fieldMax: 5000, fieldStep: 10, pwLogMin: 0, pwLogMax: 2 }
        }
        if (cat === 'mammalian') {
          // Resonance mode is disabled for mammalian cells (no rigid capsid resonance).
          // Fallback to standard IRE range — button should be disabled, but defend against any
          // state inconsistency (e.g. loading a cancer preset while chartMode is already 'resonance').
          return { freqMin: 10, freqMax: 10000, freqStep: 1, fieldMin: 10, fieldMax: 3000, fieldStep: 1, pwLogMin: 0, pwLogMax: 5 }
        }
        // Bacteria resonance (E. coli ~500 MHz, MRSA ~1.5 GHz)
        // freqMax = 10 GHz = 10,000,000 kHz; step = 10 MHz = 10,000 kHz
        return { freqMin: 10000, freqMax: 10000000, freqStep: 10000, fieldMin: 10, fieldMax: 10000, fieldStep: 100, pwLogMin: 0, pwLogMax: 3 }
      }
      if (cat === 'virus') {
        // Schwan mode for virus (rarely used but available)
        return { freqMin: 1, freqMax: 5000000, freqStep: 1000, fieldMin: 10, fieldMax: 100000, fieldStep: 10, pwLogMin: 0, pwLogMax: 2 }
      }
      if (cat === 'bacteria') {
        // nsEP regime: high field, sub-τ pulses (τ_ecoli ≈ 14 ns, τ_mrsa ≈ 3 ns)
        return { freqMin: 10, freqMax: 1000000, freqStep: 100, fieldMin: 10, fieldMax: 100000, fieldStep: 100, pwLogMin: 0, pwLogMax: 3 }
      }
      // Mammalian: standard IRE / electroporation range
      return { freqMin: 10, freqMax: 10000, freqStep: 1, fieldMin: 10, fieldMax: 3000, fieldStep: 1, pwLogMin: 0, pwLogMax: 5 }
    },

    freqDisplay(): string {
      const f = this.currentFreq
      if (f >= 1000000) return `${(f / 1000000).toFixed(2)} GHz`
      if (f >= 1000)    return `${(f / 1000).toFixed(2)} MHz`
      return `${f} kHz`
    },

    targetFcDisplay(): string {
      const fc = this.store.targetFc
      if (fc >= 1000000) return `${(fc / 1000000).toFixed(2)} GHz`
      if (fc >= 1000)    return `${(fc / 1000).toFixed(2)} MHz`
      return `${fc.toFixed(0)} kHz`
    },

    healthyFcDisplay(): string {
      const fc = this.store.healthyFc
      if (fc >= 1000000) return `${(fc / 1000000).toFixed(2)} GHz`
      if (fc >= 1000)    return `${(fc / 1000).toFixed(2)} MHz`
      return `${fc.toFixed(0)} kHz`
    },

    fieldDisplay(): string {
      const vcm = this.currentField
      return vcm >= 10000 ? `${(vcm / 1000).toFixed(1)} kV/cm` : `${vcm} V/cm`
    },

    mediaKeys(): MediumKey[] {
      return Object.keys(this.MEDIA) as MediumKey[]
    },

    targetDisruptPercent(): string {
      return (this.targetDisruption * 100).toFixed(0)
    },

    healthyDisruptPercent(): string {
      return (this.healthyDisruption * 100).toFixed(0)
    },

    dutyCycleLogVal(): number {
      return Math.log10(this.store.dutyCycle)
    },

    dutyCycleDisplay(): string {
      const pct = this.store.dutyCycle * 100
      if (pct < 0.001) return (pct * 1000).toFixed(1) + ' µ%'
      if (pct < 0.1)   return pct.toFixed(4) + '%'
      return pct.toFixed(2) + '%'
    },

    currentWaveform(): 'cw' | 'pulsed' {
      return this.store.waveform
    },

    // ── Thermal danger ────────────────────────────────────────────────────
    /**
     * Projected steady-state temperature — worst of both cells.
     * T_ss = 37 + SAR_eff / (λ × cp)
     */
    maxSteadyTemp(): number {
      return Math.max(this.store.healthySteadyStateTemp, this.store.targetSteadyStateTemp)
    },

    /**
     * Thermal danger level based on projected T_ss.
     * Thresholds are biologically grounded:
     *   hyperthermic : 42°C (IAHT damage onset)
     *   denaturing   : 60°C (collagen ~60°C, albumin ~68°C)
     *   vaporizing   : 100°C (water boiling — instant thermal lysis)
     */
    thermalDangerLevel(): 'safe' | 'hyperthermic' | 'denaturing' | 'vaporizing' {
      if (this.maxSteadyTemp >= 100) return 'vaporizing'
      if (this.maxSteadyTemp >= 60)  return 'denaturing'
      if (this.maxSteadyTemp >= 42)  return 'hyperthermic'
      return 'safe'
    },

    isSafeMode(): boolean {
      return this.store.safeMode
    },

    safeDutyCycleMaxLog(): number {
      return Math.log10(Math.max(1e-6, this.store.maxSafeDutyCycle))
    },

    tipWaveform(): string {
      return tipWaveform(this.currentField, this.maxSteadyTemp)
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

    // ── Tooltip content ───────────────────────────────────────────────────
    tipMedium(): string {
      return tipMedium(this.currentMedium)
    },

    tipMediumKeys(): Record<string, string> {
      return tipMediumKeys()
    },

    tipFreq(): string {
      return tipFreq(this.freqDisplay, this.targetFcDisplay, this.healthyFcDisplay)
    },

    tipFcSub(): string {
      return tipFcSub()
    },

    /** Sub-text below frequency readout: shows f_res in resonance mode, fc in Schwan mode. */
    freqSubDisplay(): string {
      if (this.store.chartMode === 'resonance') {
        const t = this.store.target as { resonantFreqGHz?: number }
        if (t.resonantFreqGHz) {
          const f0 = t.resonantFreqGHz
          const fStr = f0 >= 1 ? `${f0.toFixed(1)} GHz` : `${(f0 * 1000).toFixed(0)} MHz`
          return `f_res(T) ${fStr}`
        }
        return this.$t('resonance.noResonance')
      }
      return `fc(T) ${this.targetFcDisplay} · fc(H) ${this.healthyFcDisplay}`
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
        chartMode:          this.store.chartMode,
        target:             this.store.target as Parameters<typeof tipTargetBadge>[0]['target'],
        targetDisruptPercent: this.targetDisruptPercent,
        targetDisruption:   this.targetDisruption,
        targetVmMv:         this.store.targetVm * 1000,
        t:                  this.$t.bind(this),
      })
    },

    tipHealthyBadge(): string {
      return tipHealthyBadge({
        chartMode:            this.store.chartMode,
        healthyDisruptPercent: this.healthyDisruptPercent,
        healthyDisruption:    this.healthyDisruption,
        healthyVmMv:          this.store.healthyVm * 1000,
        thresholdVoltage:     this.store.healthy.thresholdVoltage,
        t:                    this.$t.bind(this),
      })
    },

    orientationDeg(): number {
      return this.store.orientationDeg
    },

    cosThetaDisplay(): string {
      const cosT = this.store.cosThetaFactor
      return `${this.store.orientationDeg}° — ${(cosT * 100).toFixed(0)}% Vm coupling`
    },

    lysisNLogVal(): number {
      return Math.log10(Math.max(1, this.store.lysisNPulses))
    },

    lysisNDisplay(): string {
      const n = this.store.lysisNPulses
      return `${n} pulse${n === 1 ? '' : 's'} — est. ${formatLysisTime(this.store.lysisDelayMs)}`
    },

    tipOrientation(): string {
      return tipOrientation(this.store.orientationDeg, this.store.cosThetaFactor)
    },

    tipLysisN(): string {
      return tipLysisN({
        lysisNPulses: this.store.lysisNPulses,
        lysisDelayMs: this.store.lysisDelayMs,
        dutyCycle:    this.store.dutyCycle,
        pulseWidthNs: this.store.pulseWidthNs,
      })
    },

    pulseWidthLogVal(): number {
      return Math.log10(this.store.pulseWidthNs)
    },

    pulseWidthDisplay(): string {
      const ns = this.store.pulseWidthNs
      if (ns >= 1000) return (ns / 1000).toFixed(ns >= 10000 ? 0 : 1) + ' µs'
      return ns.toFixed(0) + ' ns'
    },

    tipPulseWidth(): string {
      return tipPulseWidth({
        targetPulseStepFactor:  this.store.targetPulseStepFactor,
        healthyPulseStepFactor: this.store.healthyPulseStepFactor,
        targetFc:               this.store.targetFc,
        healthyFc:              this.store.healthyFc,
        pulseWidthDisplay:      this.pulseWidthDisplay,
        targetLabel:            this.store.target.label,
        healthyLabel:           this.store.healthy.label,
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

    onDutyCycleInput(e: Event) {
      let logVal = Number((e.target as HTMLInputElement).value)
      // In safe mode, clamp to the thermally-safe maximum
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

    onOrientationInput(e: Event) {
      const deg = Number((e.target as HTMLInputElement).value)
      this.store.setOrientationDeg(deg)
    },

    onLysisNInput(e: Event) {
      const logVal = Number((e.target as HTMLInputElement).value)
      this.store.setLysisNPulses(Math.round(Math.pow(10, logVal)))
    },

    onWaveformChange(mode: 'cw' | 'pulsed') {
      this.store.setWaveform(mode)
    },

    onSafeModeChange(on: boolean) {
      this.store.setSafeMode(on)
    },
  },
})
</script>

<template>
  <div class="field-panel">
    <div class="field-panel__title-row">
      <span class="field-panel__title">Field Control</span>
      <!-- Safe Mode toggle -->
      <div class="field-panel__safe-toggle">
        <label
          class="field-panel__pill field-panel__pill--sm"
          :class="{ 'field-panel__pill--active field-panel__pill--expert': !isSafeMode }"
          v-tip="'<strong>Expert Mode</strong>\nFull parameter range — all duty cycle values allowed.\nWarnings shown; no automatic clamping.\nRecommended for experienced users who understand\nthe thermal model.'"
        >
          <input type="radio" name="safemode" :checked="!isSafeMode" @change="onSafeModeChange(false)" />
          Expert
        </label>
        <label
          class="field-panel__pill field-panel__pill--sm"
          :class="{ 'field-panel__pill--active field-panel__pill--safe': isSafeMode }"
          v-tip="'<strong>Safe Mode</strong>\nDuty cycle is automatically clamped so that\nprojected steady-state temperature T_ss ≤ 42°C.\nRecommended for initial exploration.\nUse Expert mode to override for high-duty protocols.'"
        >
          <input type="radio" name="safemode" :checked="isSafeMode" @change="onSafeModeChange(true)" />
          Safe
        </label>
      </div>
    </div>

    <!-- Thermal danger banner (IRE/Schwan mode only — not applicable in DEP) -->
    <div
      v-if="store.chartMode !== 'resonance' && thermalDangerLevel !== 'safe'"
      class="field-panel__thermal-banner"
      :class="`field-panel__thermal-banner--${thermalDangerLevel}`"
      v-tip="tipDutyCycle"
    >
      <span class="field-panel__thermal-icon">{{ thermalDangerLevel === 'vaporizing' ? '⚡' : '⚠' }}</span>
      <span class="field-panel__thermal-text">
        {{ thermalDangerLevel === 'vaporizing'
            ? 'VAPORIZING REGIME — cells instantly destroyed'
            : thermalDangerLevel === 'denaturing'
              ? 'PROTEIN DENATURATION — reduce duty cycle'
              : 'HYPERTHERMIC — thermal damage onset' }}
      </span>
      <span class="field-panel__thermal-temp">T_ss {{ maxSteadyTemp.toFixed(0) }}°C</span>
    </div>

    <!-- Row 1: Medium selector -->
    <div class="field-panel__row field-panel__row--medium">
      <span class="field-panel__row-label" v-tip="tipMedium">Medium</span>
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
        v-tip="`<strong>External conductivity σ_e = ${MEDIA[currentMedium].conductivity} S/m</strong>\nUsed in Schwan time constant:\nτ = R·Cm·(2·<span class=\'tip-val\'>σ_e</span>+σ_i)/(2·<span class=\'tip-val\'>σ_e</span>·σ_i)\nChange medium to shift the coupling strength`"
      >σ_e {{ MEDIA[currentMedium].conductivity }} S/m</span>
    </div>

    <!-- Row 2: RF Frequency -->
    <div class="field-panel__row">
      <span class="field-panel__row-label" v-tip="tipFreq">RF Frequency</span>
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

    <!-- Row 3: Field Intensity + disruption indicators -->
    <div
      class="field-panel__row"
      :class="store.chartMode !== 'resonance' && thermalDangerLevel !== 'safe' ? `field-panel__row--${thermalDangerLevel}` : ''"
    >
      <span class="field-panel__row-label" v-tip="tipField">Field Intensity</span>
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
        <!-- Disruption badges: Vm-based (Schwan mode) or resonant ratio (Resonance mode) -->
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

    <!-- Resonance mode note (replaces protocol/advanced sections in resonance mode) -->
    <div v-if="store.chartMode === 'resonance'" class="field-panel__resonance-note">
      <span class="field-panel__resonance-note-icon">ℹ</span>
      <span class="field-panel__resonance-note-text">
        <strong>{{ $t('resonance.noteTitle') }}</strong> — {{ $t('resonance.noteBody') }}
      </span>
    </div>

    <!-- ── Protocol accordion (IRE/Schwan mode only) ──────────── -->
    <template v-if="store.chartMode !== 'resonance'">
      <button class="field-panel__accordion" @click="protocolOpen = !protocolOpen">
        <span class="field-panel__accordion-label">Protocol</span>
        <span class="field-panel__accordion-chevron" :class="{ 'field-panel__accordion-chevron--open': protocolOpen }">›</span>
      </button>

      <div v-show="protocolOpen" class="field-panel__accordion-body">
        <!-- Row 4: Waveform selector -->
        <div class="field-panel__row field-panel__row--medium" v-tip="tipWaveform">
          <span class="field-panel__row-label">Waveform</span>
          <div class="field-panel__pills">
            <label class="field-panel__pill" :class="{ 'field-panel__pill--active': currentWaveform === 'pulsed' }">
              <input type="radio" value="pulsed" :checked="currentWaveform === 'pulsed'" name="waveform" @change="onWaveformChange('pulsed')" />
              Pulsed
            </label>
            <label class="field-panel__pill" :class="{ 'field-panel__pill--active': currentWaveform === 'cw' }">
              <input type="radio" value="cw" :checked="currentWaveform === 'cw'" name="waveform" @change="onWaveformChange('cw')" />
              CW
            </label>
          </div>
          <span class="field-panel__row-meta">wf×{{ currentWaveform === 'cw' ? '0.5' : '1.0' }}</span>
        </div>

        <!-- Row 5: Duty Cycle (pulsed only) -->
        <div
          v-if="currentWaveform === 'pulsed'"
          class="field-panel__row"
          :class="thermalDangerLevel !== 'safe' ? `field-panel__row--${thermalDangerLevel}` : ''"
        >
          <span class="field-panel__row-label" v-tip="tipDutyCycle">
            Duty Cycle
            <span v-if="isSafeMode" class="field-panel__safe-lock" v-tip="'Safe Mode active — duty cycle capped at T_ss ≤ 42°C'">🔒</span>
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
              :class="thermalDangerLevel !== 'safe' ? `field-panel__readout--${thermalDangerLevel}` : ''"
              v-tip="tipDutyCycle"
            >{{ dutyCycleDisplay }}</span>
            <span class="field-panel__readout-sub" v-tip="tipDutyCycle">
              T_ss {{ maxSteadyTemp.toFixed(0) }}°C · SAR_eff T {{ (store.targetSAR * store.dutyCycle).toFixed(1) }} W/kg
            </span>
          </div>
        </div>

        <!-- Row 6: Pulse Width (pulsed only) -->
        <div v-if="currentWaveform === 'pulsed'" class="field-panel__row">
          <span class="field-panel__row-label" v-tip="tipPulseWidth">Pulse Width</span>
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
              T {{ (store.targetPulseStepFactor * 100).toFixed(1) }}%
              · H {{ (store.healthyPulseStepFactor * 100).toFixed(1) }}% charging
            </span>
          </div>
        </div>
      </div>

      <!-- ── Advanced accordion ───────────────────────────────── -->
      <button class="field-panel__accordion" @click="advancedOpen = !advancedOpen">
        <span class="field-panel__accordion-label">Advanced</span>
        <span class="field-panel__accordion-chevron" :class="{ 'field-panel__accordion-chevron--open': advancedOpen }">›</span>
      </button>

      <div v-show="advancedOpen" class="field-panel__accordion-body">
        <!-- Row 7: Cell Orientation θ -->
        <div class="field-panel__row">
          <span class="field-panel__row-label" v-tip="tipOrientation">{{ $t('slider.orientationAngle') }}</span>
          <div class="field-panel__track">
            <input
              class="field-panel__slider"
              type="range"
              min="0"
              max="90"
              step="1"
              :value="orientationDeg"
              @input="onOrientationInput"
            />
          </div>
          <div class="field-panel__readout">
            <span class="field-panel__readout-value" v-tip="tipOrientation">{{ cosThetaDisplay }}</span>
            <span class="field-panel__readout-sub" v-tip="tipOrientation">{{ $t('slider.orientationSub') }}</span>
          </div>
        </div>

        <!-- Row 8: Pulses to Lysis N (pulsed only) -->
        <div v-if="currentWaveform === 'pulsed'" class="field-panel__row">
          <span class="field-panel__row-label" v-tip="tipLysisN">{{ $t('slider.lysisNPulses') }}</span>
          <div class="field-panel__track">
            <input
              class="field-panel__slider"
              type="range"
              min="0"
              max="3"
              step="0.05"
              :value="lysisNLogVal"
              @input="onLysisNInput"
            />
          </div>
          <div class="field-panel__readout">
            <span class="field-panel__readout-value" v-tip="tipLysisN">{{ lysisNDisplay }}</span>
            <span class="field-panel__readout-sub" v-tip="tipLysisN">{{ $t('slider.lysisNSub') }}</span>
          </div>
        </div>

        <!-- Row 9: Double-Shell Model toggle (mammalian nucleated cells only) -->
        <div
          v-if="store.targetCellCategory === 'mammalian' && store.hasNuclearParams"
          class="field-panel__row field-panel__row--medium"
        >
          <span
            class="field-panel__row-label"
            v-tip="'<strong>Shell Model</strong>\nChoose the membrane model used to compute transmembrane potential.\nSingle-Shell: standard Schwan (plasma membrane only).\n+ Nuclear Envelope: adds nuclear Vm bandpass — Kotnik &amp; Miklavcic (2006).'"
          >{{ $t('slider.doubleShell') }}</span>
          <div class="field-panel__pills">
            <label
              class="field-panel__pill"
              :class="{ 'field-panel__pill--active': !store.doubleShellEnabled }"
              v-tip="'<strong>Single-Shell (Schwan)</strong>\nStandard single-shell model — only plasma membrane Vm is computed.\nτ = R·Cm·(2σ_e+σ_i)/(2σ_e·σ_i)  ·  Vm = 1.5·E·R / √(1+(ωτ)²)\nDefault mode. Applicable to all cell types.\nRef: Kotnik &amp; Miklavcic, Biophys. J. 79:670 (2000)'"
            >
              <input type="radio" name="shellModel" :checked="!store.doubleShellEnabled" @change="store.doubleShellEnabled && store.toggleDoubleShell()" />
              {{ $t('slider.doubleShellSingle') }}
            </label>
            <label
              class="field-panel__pill field-panel__pill--nuclear"
              :class="{ 'field-panel__pill--active': store.doubleShellEnabled }"
              v-tip="'<strong>+ Nuclear Envelope (Double-Shell)</strong>\nAdds nuclear membrane Vm as a two-pole bandpass function.\nVm_nuc peaks at f_peak = 1/(2π√(τ_out·τ_ne))\nτ_ne = R_nuc·Cm_ne·(2σ_i+σ_np)/(2σ_i·σ_np)  [σ_i = cytoplasm, external medium for nucleus]\nCancer nuclei: thinner NE, lower σ_ne threshold → additional selectivity axis.\n\nExpected at 417 kHz / 150 V/cm / saline:\n  Hepatocyte:    Vm_nuc ≈ 40 mV  (f_peak ≈ 1.66 MHz)\n  Adeno CA:      Vm_nuc ≈ 113 mV (f_peak ≈ 0.87 MHz)\n  GBM:           Vm_nuc ≈ 87 mV  (f_peak ≈ 1.05 MHz)\n\nRef: Kotnik &amp; Miklavcic, Biophys. J. 90:480 (2006)'"
            >
              <input type="radio" name="shellModel" :checked="store.doubleShellEnabled" @change="!store.doubleShellEnabled && store.toggleDoubleShell()" />
              {{ $t('slider.doubleShellDouble') }}
            </label>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style lang="scss" scoped>
/* ── Container query (top-level, cannot be nested) ───────────────────── */
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

  &__safe-toggle {
    display: flex;
    gap: 0.3rem;
  }

  &__safe-lock {
    font-size: 0.55rem;
    opacity: 0.7;
    margin-left: 0.2rem;
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

    /* Thermal thumb coloring via descendant selector */
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
      width: 13px;
      height: 13px;
      border-radius: 50%;
      background: var(--color-text-heading);
      border: 2px solid var(--color-surface);
      box-shadow: 0 0 5px rgba(255, 255, 255, 0.2);
      cursor: pointer;
      transition: box-shadow 0.15s;

      &:hover { box-shadow: 0 0 9px rgba(255, 255, 255, 0.45); }
    }

    &::-moz-range-thumb {
      width: 13px;
      height: 13px;
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
