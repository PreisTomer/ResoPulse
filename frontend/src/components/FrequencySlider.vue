<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import { useCellStore } from '../stores/cellStore'
import { broadcastFieldParams } from '../services/socket'
import { MEDIA } from '../mockData'
import type { MediumKey } from '../mockData'

export default defineComponent({
  props: {
    chartMode: { type: String as PropType<'schwan' | 'resonance'>, default: 'schwan' },
  },

  setup() {
    const store = useCellStore()
    return { store, MEDIA }
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
      if (this.chartMode === 'resonance') {
        if (cat === 'virus') {
          // GHz range for viral capsid resonance (Flu ~12 GHz, SARS-CoV-2 ~10 GHz)
          // freqMax = 50 GHz = 50,000,000 kHz; step = 100 MHz = 100,000 kHz
          return { freqMin: 1000000, freqMax: 50000000, freqStep: 100000, fieldMin: 10, fieldMax: 5000, fieldStep: 10, pwLogMin: 0, pwLogMax: 2 }
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
      const tssNow = this.maxSteadyTemp
      const cwWarn = tssNow > 42
        ? `\n\n<span class="tip-warn">⚠ At current field (${this.currentField} V/cm), CW would heat cells to T_ss ≈ ${Math.min(tssNow, 150).toFixed(0)}°C — reduce field before switching to CW.</span>`
        : ''
      return `<strong>Waveform Type</strong>
<span class="tip-val">CW (sinusoidal)</span>  — continuous wave, always on
  SAR = σ_i·α²·E²/(2ρ)  [waveformFactor = 0.5, RMS halving]
  Thermal: effective duty cycle = 1.0 (full continuous heating)
  Typical for TTFields (1–3 V/cm, 100–500 kHz sinusoidal)

<span class="tip-val">Pulsed (DC)</span>  — square-wave bursts
  SAR = σ_i·α²·E²/ρ  [waveformFactor = 1.0, full peak field]
  Thermal load = SAR_peak × duty cycle (use low dc to limit heating)
  Typical for IRE / electroporation protocols${cwWarn}`
    },

    tipDutyCycle(): string {
      const dc    = this.store.effectiveDutyCycle
      const effT  = (this.store.targetSAR  * dc).toFixed(2)
      const effH  = (this.store.healthySAR * dc).toFixed(2)
      const tss   = this.maxSteadyTemp
      const level = this.thermalDangerLevel
      const warnText = level === 'vaporizing'
        ? '\n<span class="tip-warn">⚡ VAPORIZING — cells instantly destroyed at T_ss ≥ 100°C</span>'
        : level === 'denaturing'
          ? '\n<span class="tip-warn">⚠ DENATURING — protein coagulation at T_ss ≥ 60°C (collagen ~60°C, albumin ~68°C)</span>'
          : level === 'hyperthermic'
            ? '\n<span class="tip-warn">⚠ HYPERTHERMIC — thermal damage onset at T_ss ≥ 42°C (IAHT threshold)</span>'
            : ''
      return `<strong>Pulse Duty Cycle  (t_on / period)</strong>
Current: <span class="tip-val">${this.dutyCycleDisplay}</span>

Fraction of time the field is active.
Scales effective SAR → thermal load:
  SAR_eff = SAR_peak × duty_cycle

<span class="tip-val">T: ${effT} W/kg</span>  ·  <span class="tip-val">H: ${effH} W/kg</span>

Projected T_ss = <span class="tip-val">${tss.toFixed(0)}°C</span>  (T_ss = 37 + SAR_eff/(λ·cp))
Typical pulsed electroporation: 0.001%–1%${warnText}`
    },

    // ── Tooltip content ───────────────────────────────────────────────────
    tipMedium(): string {
      const key = this.currentMedium
      const m = this.MEDIA[key]
      return `<strong>Propagation Medium</strong>
Sets external conductivity <span class="tip-val">σ_e = ${m.conductivity} S/m</span>
Used in Schwan time constant:
  τ = R·Cm·(2σ_e+σ_i) / (2σ_e·σ_i)
Higher σ_e → lower τ → higher fc → broader quasi-DC regime`
    },

    tipMediumKeys(): Record<string, string> {
      const descs: Record<string, string> = {
        saline: 'Matches physiological interstitial fluid',
        blood:  'Whole blood — moderate coupling',
        tissue: 'Soft tissue (low-perfusion) — note: DMEM has σ_e ≈ 1.4–1.6 S/m, not 0.4 S/m',
        water:  'Distilled water — near-zero coupling',
      }
      const out: Record<string, string> = {}
      for (const key of Object.keys(this.MEDIA)) {
        const m = this.MEDIA[key as keyof typeof this.MEDIA]
        out[key] = `<strong>${m.name}</strong>
σ_e = <span class="tip-val">${m.conductivity} S/m</span>
${descs[key] ?? ''}`
      }
      return out
    },

    tipFreq(): string {
      return `<strong>RF Broadcast Frequency</strong>
Current: <span class="tip-val">${this.freqDisplay}</span>
Schwan denominator: √(1 + (2πf·τ)²)

<span class="tip-val">fc(T) = ${this.targetFcDisplay}</span> — target roll-off frequency
<span class="tip-val">fc(H) = ${this.healthyFcDisplay}</span> — healthy roll-off frequency

Below fc → quasi-DC regime, Vm at maximum
Above fc → Vm rolls off toward zero`
    },

    tipFcSub(): string {
      return `<strong>Characteristic Frequency  fc = 1 / (2πτ)</strong>
At f = fc,  Vm = 0.707 × Vm_DC  (−3 dB point)
τ = R·Cm·(2σ_e+σ_i)/(2σ_e·σ_i)  [Kotnik & Miklavcic 2000]

Depends on cell size and membrane properties:
  Reference cells: ~1.1–1.4 MHz  (hepatocyte ~1.08 MHz)
  Cancer cells:    ~0.5–1.4 MHz  (adenocarcinoma ~0.49 MHz, HL-60 ~1.35 MHz)
  Bacteria:        ~11–49 MHz  (E. coli ~11 MHz, MRSA ~49 MHz; σ_i = 0.3 S/m)
  Virions:         fc ~0.6–0.75 MHz (σ_i-limited; Schwan model is approximate for virions)

Note: for cancer/normal cell pairs where τ_T > τ_H (typical),
  maximum selectivity is at quasi-DC. Above fc(T) selectivity decreases.`
    },

    /** Sub-text below frequency readout: shows f_res in resonance mode, fc in Schwan mode. */
    freqSubDisplay(): string {
      if (this.chartMode === 'resonance') {
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
      if (this.chartMode === 'resonance') {
        const t = this.store.target as { resonantFreqGHz?: number; capsidQ?: number; resonantThresholdVcm?: number }
        if (t.resonantFreqGHz && t.resonantThresholdVcm) {
          const fStr = t.resonantFreqGHz >= 1 ? `${t.resonantFreqGHz.toFixed(1)} GHz` : `${(t.resonantFreqGHz * 1000).toFixed(0)} MHz`
          const thrStr = `${t.resonantThresholdVcm} V/cm`
          const pct = (this.targetDisruption * 100).toFixed(0) + '%'
          const warn = this.targetDisruption >= 1.0
            ? '\n<span class="tip-warn">⚡ Disruption threshold exceeded — capsid/cell-wall rupture</span>'
            : this.targetDisruption > 0.85
              ? '\n<span class="tip-warn">⚠ Approaching disruption threshold</span>'
              : ''
          return `<strong>${this.$t('resonance.tipFieldTitle')}</strong>
${this.$t('slider.fieldIntensity')}: <span class="tip-val">${this.fieldDisplay}</span>

${this.$t('resonance.tipFieldFormula')}
f_res(T) = <span class="tip-val">${fStr}</span>  ·  E_threshold = <span class="tip-val">${thrStr}</span>  ·  Q = ${t.capsidQ ?? 20}

${this.$t('resonance.tipFieldRatio')}: <span class="tip-val">${pct}</span>
${this.$t('resonance.tipFieldDisruptNote')}${warn}`
        }
        return `<strong>${this.$t('slider.fieldIntensity')}</strong>\n${this.$t('resonance.noResonance')}`
      }
      const cat    = this.store.targetCellCategory
      const tLysis = this.store.targetLysisField
      const hLysis = this.store.healthyLysisField
      const tStr   = tLysis >= 1000 ? `${(tLysis / 1000).toFixed(1)} kV/cm` : `${tLysis.toFixed(0)} V/cm`
      const hStr   = hLysis >= 1000 ? `${(hLysis / 1000).toFixed(1)} kV/cm` : `${hLysis.toFixed(0)} V/cm`
      const contextNote = cat === 'virus'
        ? `\n<span class="tip-warn">⚠ Virion IRE threshold ≈ ${tStr} — impractical at any safe field.\nSwitch to Resonance mode for virion disruption.</span>`
        : cat === 'bacteria'
          ? `\n<span class="tip-warn">⚠ Bacterial IRE threshold ≈ ${tStr}.\nUse nsEP: short pulse width (≪ τ) lowers effective E_lysis by reducing charge time.</span>`
          : `\nTherapeutic window at current frequency:\n  Target lysis ≥ <span class="tip-val">${tStr}</span>  ·  Healthy lysis ≥ <span class="tip-val">${hStr}</span>`
      return `<strong>Applied Electric Field Intensity</strong>
Current: <span class="tip-val">${this.fieldDisplay}</span>
Vm scales linearly:  Vm = 1.5 × E × R / √(1+(ωτ)²)
${contextNote}`
    },

    tipTargetBadge(): string {
      const pct = this.targetDisruptPercent
      if (this.chartMode === 'resonance') {
        const t = this.store.target as { resonantFreqGHz?: number; capsidQ?: number; resonantThresholdVcm?: number; label: string }
        const fStr = t.resonantFreqGHz
          ? (t.resonantFreqGHz >= 1 ? `${t.resonantFreqGHz.toFixed(1)} GHz` : `${(t.resonantFreqGHz * 1000).toFixed(0)} MHz`)
          : '—'
        const warn = this.targetDisruption >= 1.0
          ? '\n<span class="tip-warn">⚡ Disruption threshold exceeded — capsid/cell-wall rupture imminent</span>'
          : this.targetDisruption > 0.85
            ? '\n<span class="tip-warn">⚠ >85% — approaching disruption threshold (2.5 s countdown)</span>'
            : ''
        return `<strong>${this.$t('resonance.tipTargetBadgeTitle', { pct })}</strong>
${this.$t('resonance.tipTargetBadgeFormula')}
f_res = <span class="tip-val">${fStr}</span>  ·  Q = ${t.capsidQ ?? 20}${warn}
${this.$t('resonance.tipTargetBadgeNote')}`
      }
      const tVm   = (this.store.targetVm * 1000).toFixed(2)
      const tThr  = (this.store.target.thresholdVoltage * 1000).toFixed(0)
      const warn  = this.targetDisruption > 0.85
        ? '\n<span class="tip-warn">⚡ >85% — lysis countdown active (2.5 s)</span>' : ''
      return `<strong>Target membrane disruption: <span class="tip-val">${pct}%</span></strong>
Ratio = Vm / lysis threshold voltage

Vm = <span class="tip-val">${tVm} mV</span>  ·  Threshold = ${tThr} mV${warn}
>85% held for 2.5 s → irreversible membrane lysis`
    },

    tipHealthyBadge(): string {
      const pct  = this.healthyDisruptPercent
      if (this.chartMode === 'resonance') {
        return `<strong>${this.$t('resonance.tipHealthyBadgeTitle')}</strong>
${this.$t('resonance.tipHealthyBadgeBody')}
<span class="tip-ok">✓ ${this.$t('resonance.tipHealthyBadgeSafe')}</span>`
      }
      const hVm  = (this.store.healthyVm * 1000).toFixed(2)
      const hThr = (this.store.healthy.thresholdVoltage * 1000).toFixed(0)
      const ok   = this.healthyDisruption < 0.5
        ? '\n<span class="tip-ok">✓ Healthy cells are safe</span>'
        : this.healthyDisruption > 0.85
          ? '\n<span class="tip-warn">⚠ Approaching ablative — reduce field</span>'
          : '\n<span class="tip-warn">⚠ Approaching limit — monitor closely</span>'
      return `<strong>Healthy membrane disruption: <span class="tip-val">${pct}%</span></strong>
Ratio = Vm / lysis threshold voltage

Vm = <span class="tip-val">${hVm} mV</span>  ·  Threshold = ${hThr} mV${ok}
Keep below 50% for a safe therapeutic window`
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
      const tFactor = (this.store.targetPulseStepFactor * 100).toFixed(1)
      const hFactor = (this.store.healthyPulseStepFactor * 100).toFixed(1)
      const tTau_ns = this.store.targetFc > 0 ? (1 / (2 * Math.PI * this.store.targetFc * 1e3) * 1e9) : 0
      const hTau_ns = this.store.healthyFc > 0 ? (1 / (2 * Math.PI * this.store.healthyFc * 1e3) * 1e9) : 0
      const tTauStr = tTau_ns > 0 ? tTau_ns.toFixed(0) + ' ns' : '—'
      const hTauStr = hTau_ns > 0 ? hTau_ns.toFixed(0) + ' ns' : '—'
      const pw      = this.pulseWidthDisplay
      const tLabel  = this.store.target.label
      const hLabel  = this.store.healthy.label
      // Selectivity direction: if τ_T < τ_H, short pulses FAVOUR the target (bacteria case)
      //                        if τ_T > τ_H, short pulses HURT selectivity (typical cancer case)
      const selNote = tTau_ns > 0 && hTau_ns > 0
        ? tTau_ns < hTau_ns
          ? `<span class="tip-ok">▲ Short pulses INCREASE selectivity for this target (τ_T ${tTau_ns.toFixed(0)} ns &lt; τ_H ${hTau_ns.toFixed(0)} ns)</span>`
          : `<span class="tip-warn">▼ Short pulses DECREASE selectivity for this target (τ_T ${tTau_ns.toFixed(0)} ns &gt; τ_H ${hTau_ns.toFixed(0)} ns)\n  Use quasi-DC (long pulse width) for maximum cancer selectivity</span>`
        : ''
      return `<strong>Pulse Width  t_p</strong>
Current: <span class="tip-val">${pw}</span>

Membrane charges exponentially after field onset:
  <span class="tip-val">Vm_eff = Vm_DC × (1 − e^(−t_p / τ))</span>
At t_p ≫ τ → factor → 1 (quasi-DC limit)
At t_p ≪ τ → cells with shorter τ charge proportionally more

τ(${tLabel}) = <span class="tip-val">${tTauStr}</span>  ·  charging: <span class="tip-val">${tFactor}%</span>
τ(${hLabel}) = <span class="tip-val">${hTauStr}</span>  ·  charging: <span class="tip-val">${hFactor}%</span>

${selNote}

Ref: Beebe et al. 2003 (nsEP); Batista Napotnik et al. 2016`
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
    <div class="panel-title-row">
      <span class="panel-title">Field Control</span>
      <!-- Safe Mode toggle -->
      <div class="safe-mode-toggle">
        <label
          class="pill pill--sm"
          :class="{ 'pill--active pill--expert': !isSafeMode }"
          v-tip="'<strong>Expert Mode</strong>\nFull parameter range — all duty cycle values allowed.\nWarnings shown; no automatic clamping.\nRecommended for experienced users who understand\nthe thermal model.'"
        >
          <input type="radio" name="safemode" :checked="!isSafeMode" @change="onSafeModeChange(false)" />
          Expert
        </label>
        <label
          class="pill pill--sm"
          :class="{ 'pill--active pill--safe': isSafeMode }"
          v-tip="'<strong>Safe Mode</strong>\nDuty cycle is automatically clamped so that\nprojected steady-state temperature T_ss ≤ 42°C.\nRecommended for initial exploration.\nUse Expert mode to override for high-duty protocols.'"
        >
          <input type="radio" name="safemode" :checked="isSafeMode" @change="onSafeModeChange(true)" />
          Safe
        </label>
      </div>
    </div>

    <!-- Thermal danger banner (IRE/Schwan mode only — not applicable in DEP) -->
    <div
      v-if="chartMode !== 'resonance' && thermalDangerLevel !== 'safe'"
      class="thermal-banner"
      :class="`thermal-banner--${thermalDangerLevel}`"
      v-tip="tipDutyCycle"
    >
      <span class="thermal-banner-icon">{{ thermalDangerLevel === 'vaporizing' ? '⚡' : '⚠' }}</span>
      <span class="thermal-banner-text">
        {{ thermalDangerLevel === 'vaporizing'
            ? 'VAPORIZING REGIME — cells instantly destroyed'
            : thermalDangerLevel === 'denaturing'
              ? 'PROTEIN DENATURATION — reduce duty cycle'
              : 'HYPERTHERMIC — thermal damage onset' }}
      </span>
      <span class="thermal-banner-temp">T_ss {{ maxSteadyTemp.toFixed(0) }}°C</span>
    </div>

    <!-- Row 1: Medium selector -->
    <div class="panel-row panel-row--medium">
      <span class="row-label" v-tip="tipMedium">Medium</span>
      <div class="medium-pills">
        <label
          v-for="key in mediaKeys"
          :key="key"
          class="pill"
          :class="{ 'pill--active': currentMedium === key }"
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
        class="row-meta"
        v-tip="`<strong>External conductivity σ_e = ${MEDIA[currentMedium].conductivity} S/m</strong>\nUsed in Schwan time constant:\nτ = R·Cm·(2·<span class=\'tip-val\'>σ_e</span>+σ_i)/(2·<span class=\'tip-val\'>σ_e</span>·σ_i)\nChange medium to shift the coupling strength`"
      >σ_e {{ MEDIA[currentMedium].conductivity }} S/m</span>
    </div>

    <!-- Row 2: RF Frequency -->
    <div class="panel-row">
      <span class="row-label" v-tip="tipFreq">RF Frequency</span>
      <div class="slider-track-wrap">
        <input
          class="ctrl-slider"
          type="range"
          :min="sliderRanges.freqMin"
          :max="sliderRanges.freqMax"
          :step="sliderRanges.freqStep"
          :value="currentFreq"
          @input="onFreqInput"
        />
      </div>
      <div class="row-readout">
        <span class="readout-value" v-tip="tipFreq">{{ freqDisplay }}</span>
        <span class="readout-sub" v-tip="tipFcSub">{{ freqSubDisplay }}</span>
      </div>
    </div>

    <!-- Row 3: Field Intensity + disruption indicators -->
    <div
      class="panel-row"
      :class="chartMode !== 'resonance' && thermalDangerLevel !== 'safe' ? `panel-row--thermal-${thermalDangerLevel}` : ''"
    >
      <span class="row-label" v-tip="tipField">Field Intensity</span>
      <div class="slider-track-wrap">
        <input
          class="ctrl-slider"
          type="range"
          :min="sliderRanges.fieldMin"
          :max="sliderRanges.fieldMax"
          :step="sliderRanges.fieldStep"
          :value="currentField"
          @input="onFieldInput"
        />
      </div>
      <div class="row-readout">
        <span class="readout-value" v-tip="tipField">{{ fieldDisplay }}</span>
        <!-- Disruption badges: Vm-based (Schwan mode) or resonant ratio (Resonance mode) -->
        <div class="disruption-badges">
          <span
            class="badge badge--target"
            :class="{ 'badge--warn': targetDisruption > 0.85 }"
            v-tip="tipTargetBadge"
          >T {{ targetDisruptPercent }}%</span>
          <span
            class="badge badge--healthy"
            :class="{ 'badge--warn': healthyDisruption > 0.85 }"
            v-tip="tipHealthyBadge"
          >H {{ healthyDisruptPercent }}%</span>
        </div>
      </div>
    </div>
    <!-- Resonance mode note (replaces waveform/duty-cycle/pulse-width rows) -->
    <div v-if="chartMode === 'resonance'" class="resonance-mode-note">
      <span class="resonance-mode-note-icon">ℹ</span>
      <span class="resonance-mode-note-text">
        <strong>{{ $t('resonance.noteTitle') }}</strong> — {{ $t('resonance.noteBody') }}
      </span>
    </div>

    <!-- Row 4: Waveform selector (IRE/Schwan mode only) -->
    <div v-if="chartMode !== 'resonance'" class="panel-row panel-row--medium" v-tip="tipWaveform">
      <span class="row-label">Waveform</span>
      <div class="medium-pills">
        <label
          class="pill"
          :class="{ 'pill--active': currentWaveform === 'pulsed' }"
        >
          <input type="radio" value="pulsed" :checked="currentWaveform === 'pulsed'" name="waveform" @change="onWaveformChange('pulsed')" />
          Pulsed
        </label>
        <label
          class="pill"
          :class="{ 'pill--active': currentWaveform === 'cw' }"
        >
          <input type="radio" value="cw" :checked="currentWaveform === 'cw'" name="waveform" @change="onWaveformChange('cw')" />
          CW
        </label>
      </div>
      <span class="row-meta">wf×{{ currentWaveform === 'cw' ? '0.5' : '1.0' }}</span>
    </div>

    <!-- Row 5: Duty Cycle (pulsed + IRE mode only) -->
    <div
      v-if="chartMode !== 'resonance' && currentWaveform === 'pulsed'"
      class="panel-row"
      :class="thermalDangerLevel !== 'safe' ? `panel-row--thermal-${thermalDangerLevel}` : ''"
    >
      <span class="row-label" v-tip="tipDutyCycle">
        Duty Cycle
        <span v-if="isSafeMode" class="safe-lock" v-tip="'Safe Mode active — duty cycle capped at T_ss ≤ 42°C'">🔒</span>
      </span>
      <div class="slider-track-wrap">
        <input
          class="ctrl-slider"
          type="range"
          min="-6"
          :max="isSafeMode ? safeDutyCycleMaxLog : -1"
          step="0.05"
          :value="dutyCycleLogVal"
          @input="onDutyCycleInput"
        />
      </div>
      <div class="row-readout">
        <span
          class="readout-value"
          :class="thermalDangerLevel !== 'safe' ? `readout--${thermalDangerLevel}` : ''"
          v-tip="tipDutyCycle"
        >{{ dutyCycleDisplay }}</span>
        <span class="readout-sub" v-tip="tipDutyCycle">
          T_ss {{ maxSteadyTemp.toFixed(0) }}°C · SAR_eff T {{ (store.targetSAR * store.dutyCycle).toFixed(1) }} W/kg
        </span>
      </div>
    </div>

    <!-- Row 6: Pulse Width (pulsed + IRE mode only) -->
    <div
      v-if="chartMode !== 'resonance' && currentWaveform === 'pulsed'"
      class="panel-row"
    >
      <span class="row-label" v-tip="tipPulseWidth">Pulse Width</span>
      <div class="slider-track-wrap">
        <input
          class="ctrl-slider"
          type="range"
          :min="sliderRanges.pwLogMin"
          :max="sliderRanges.pwLogMax"
          step="0.05"
          :value="pulseWidthLogVal"
          @input="onPulseWidthInput"
        />
      </div>
      <div class="row-readout">
        <span class="readout-value" v-tip="tipPulseWidth">{{ pulseWidthDisplay }}</span>
        <span class="readout-sub" v-tip="tipPulseWidth">
          T {{ (store.targetPulseStepFactor * 100).toFixed(1) }}%
          · H {{ (store.healthyPulseStepFactor * 100).toFixed(1) }}% charging
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* ── Panel container ─────────────────────────────────────────────────── */
.field-panel {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.85rem 1.25rem;
}

/* ── Panel title row (title + safe mode toggle) ──────────────────────── */
.panel-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.1rem;
}

.panel-title {
  font-size: 0.62rem;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--color-text);
}

.safe-mode-toggle {
  display: flex;
  gap: 0.3rem;
}

/* ── Thermal danger banner ───────────────────────────────────────────── */
.thermal-banner {
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
}
.thermal-banner--hyperthermic {
  color: var(--color-amber);
  background: rgba(251, 191, 36, 0.07);
  border-color: rgba(251, 191, 36, 0.3);
}
.thermal-banner--denaturing {
  color: var(--color-orange);
  background: rgba(251, 130, 20, 0.1);
  border-color: rgba(251, 130, 20, 0.4);
  animation: thermal-pulse 1s ease-in-out infinite;
}
.thermal-banner--vaporizing {
  color: var(--color-danger);
  background: rgba(255, 77, 109, 0.1);
  border-color: rgba(255, 77, 109, 0.5);
  animation: thermal-pulse 0.5s ease-in-out infinite;
}
.thermal-banner-icon { flex-shrink: 0; }
.thermal-banner-text { flex: 1; }
.thermal-banner-temp { flex-shrink: 0; font-weight: 700; }

@keyframes thermal-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.6; }
}

/* ── Safe lock icon ──────────────────────────────────────────────────── */
.safe-lock {
  font-size: 0.55rem;
  opacity: 0.7;
  margin-left: 0.2rem;
}

/* ── Row layout ──────────────────────────────────────────────────────── */
.panel-row {
  display: grid;
  grid-template-columns: 7.5rem 1fr auto;
  align-items: center;
  gap: 0.85rem;
  min-height: 2.75rem;
}

.panel-row--medium {
  grid-template-columns: 7.5rem 1fr auto;
}

/* ── Row label ───────────────────────────────────────────────────────── */
.row-label {
  font-size: 0.62rem;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
  white-space: nowrap;
  flex-shrink: 0;
}

/* ── Medium pills ────────────────────────────────────────────────────── */
.medium-pills {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.pill {
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
}

.pill input {
  display: none;
}

.pill--active {
  border-color: var(--color-primary);
  color: var(--color-primary);
  background-color: var(--color-primary-dim);
}

/* ── Slider track ────────────────────────────────────────────────────── */
.slider-track-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.ctrl-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 3px;
  border-radius: 2px;
  background: var(--color-border);
  outline: none;
}

.ctrl-slider::-webkit-slider-thumb {
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
}

.ctrl-slider::-webkit-slider-thumb:hover {
  box-shadow: 0 0 9px rgba(255, 255, 255, 0.45);
}

.ctrl-slider::-moz-range-thumb {
  width: 13px;
  height: 13px;
  border-radius: 50%;
  background: var(--color-text-heading);
  border: 2px solid var(--color-surface);
  cursor: pointer;
}

/* ── Right-side readout ──────────────────────────────────────────────── */
.row-readout {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.25rem;
  min-width: 8rem;
}

.row-meta {
  font-size: 0.58rem;
  font-family: var(--font-mono);
  color: var(--color-text-muted);
  white-space: nowrap;
  opacity: 0.65;
}

.readout-value {
  font-size: 1rem;
  font-weight: 700;
  font-family: var(--font-mono);
  color: var(--color-text-heading);
  letter-spacing: -0.02em;
  line-height: 1;
  white-space: nowrap;
}

.readout-unit {
  font-size: 0.6rem;
  font-weight: 400;
  color: var(--color-text-muted);
}

.readout-sub {
  font-size: 0.64rem;
  font-family: var(--font-mono);
  color: var(--color-text-muted);
  white-space: nowrap;
  opacity: 0.82;
}

/* ── Thermal slider thumb coloring ──────────────────────────────────── */
/* Thumb turns amber → orange → red as projected T_ss rises             */
.panel-row--thermal-hyperthermic .ctrl-slider::-webkit-slider-thumb {
  background: var(--color-amber);
  box-shadow: 0 0 6px rgba(251, 191, 36, 0.5);
}
.panel-row--thermal-hyperthermic .ctrl-slider::-moz-range-thumb {
  background: var(--color-amber);
}
.panel-row--thermal-denaturing .ctrl-slider::-webkit-slider-thumb {
  background: var(--color-orange);
  box-shadow: 0 0 8px rgba(251, 130, 20, 0.7);
}
.panel-row--thermal-denaturing .ctrl-slider::-moz-range-thumb {
  background: var(--color-orange);
}
.panel-row--thermal-vaporizing .ctrl-slider::-webkit-slider-thumb {
  background: var(--color-danger);
  box-shadow: 0 0 10px rgba(255, 77, 109, 0.9);
  animation: thumb-danger-pulse 0.5s ease-in-out infinite;
}
.panel-row--thermal-vaporizing .ctrl-slider::-moz-range-thumb {
  background: var(--color-danger);
}

@keyframes thumb-danger-pulse {
  0%, 100% { box-shadow: 0 0 6px rgba(255, 77, 109, 0.6); }
  50%       { box-shadow: 0 0 16px rgba(255, 77, 109, 1.0); }
}

/* ── Thermal readout value coloring ─────────────────────────────────── */
.readout--hyperthermic { color: var(--color-amber)  !important; }
.readout--denaturing   { color: var(--color-orange) !important; }
.readout--vaporizing   { color: var(--color-danger) !important; animation: state-blink 0.5s ease-in-out infinite; }

@keyframes state-blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.35; }
}

/* ── Safe / Expert mode pill variants ───────────────────────────────── */
.pill--safe {
  border-color: var(--color-lime) !important;
  color: var(--color-lime) !important;
  background-color: rgba(57, 255, 20, 0.08) !important;
}
.pill--expert {
  border-color: var(--color-amber) !important;
  color: var(--color-amber) !important;
  background-color: rgba(251, 191, 36, 0.08) !important;
}
.pill--sm {
  font-size: 0.58rem;
  padding: 0.14rem 0.45rem;
}

/* ── Disruption badges ───────────────────────────────────────────────── */
.disruption-badges {
  display: flex;
  gap: 0.35rem;
  align-items: center;
}

.badge {
  font-size: 0.6rem;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0.1rem 0.35rem;
  border-radius: 3px;
  border: 1px solid transparent;
  transition: color 0.2s, border-color 0.2s;
}

.badge--target  { color: var(--color-danger);  border-color: rgba(255,77,109,0.3); }
.badge--healthy { color: var(--color-accent); border-color: rgba(0,212,255,0.3); }

.badge--warn.badge--target  { background-color: rgba(255,77,109,0.12); border-color: var(--color-danger); }
.badge--warn.badge--healthy { background-color: rgba(0,212,255,0.12); border-color: var(--color-accent); }

/* ── DEP mode info note ──────────────────────────────────────────────── */
.resonance-mode-note {
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
}

.resonance-mode-note-icon {
  flex-shrink: 0;
  margin-top: 0.05rem;
  opacity: 0.8;
}

.resonance-mode-note-text strong {
  color: var(--color-purple-light);
}

/* ── Mobile ──────────────────────────────────────────────────────────── */
@media (max-width: 768px) {
  .field-panel {
    margin-top: 1rem;
    padding: 0.7rem 0.85rem;
  }

  .panel-row {
    grid-template-columns: 5.5rem 1fr auto;
    gap: 0.5rem;
  }

  .row-readout {
    min-width: 6rem;
  }

  .readout-value {
    font-size: 0.85rem;
  }

  .readout-sub {
    display: none;
  }

  .row-meta {
    display: none;
  }
}
</style>
