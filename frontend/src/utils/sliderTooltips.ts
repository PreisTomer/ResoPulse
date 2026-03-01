/**
 * Tooltip content builders for FrequencySlider.vue.
 *
 * All functions are pure — they accept explicit parameters so they remain
 * testable and reusable without a Vue component instance.
 * Functions that render i18n strings receive a `t` translator.
 */

import { MEDIA } from '../constants/media'
import type { MediumKey } from '../types/media'

/** i18n translator signature (matches vue-i18n's `useI18n().t`) */
type T = (key: string, params?: Record<string, unknown>) => string

/** Resonance-specific fields that cell presets may carry (beyond CellConfig). */
interface ResonanceExtra {
  resonantFreqGHz?: number
  capsidQ?: number
  resonantThresholdVcm?: number
  label: string
  thresholdVoltage: number
}

// ── Helper ────────────────────────────────────────────────────────────────────

export function formatLysisTime(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}

// ── Tooltip builders ──────────────────────────────────────────────────────────

export function tipWaveform(currentField: number, maxSteadyTemp: number): string {
  const cwWarn = maxSteadyTemp > 42
    ? `\n\n<span class="tip-warn">⚠ At current field (${currentField} V/cm), CW would heat cells to T_ss ≈ ${Math.min(maxSteadyTemp, 150).toFixed(0)}°C — reduce field before switching to CW.</span>`
    : ''
  return `<strong>Waveform Type</strong>
<span class="tip-val">CW (sinusoidal)</span>  — continuous wave, always on
  SAR = σ_i·α²·E²/(2ρ)  [waveformFactor = 0.5, RMS halving]
  Thermal: effective duty cycle = 1.0 (full continuous heating)
  Use case: continuous RF sinusoidal exposure (e.g. unmodulated carrier)

<span class="tip-val">Pulsed</span>  — bipolar square-wave bursts at carrier frequency (H-FIRE/IRE regime)
  SAR = σ_i·α²·E²/ρ  [waveformFactor = 1.0; bipolar square wave: E²_rms = E²_peak during on-time]
  Thermal load = SAR_peak × duty cycle (use low dc to limit heating)
  Vm: Schwan at carrier freq — standard H-FIRE first-order approx
    True square-wave fundamental Vm ≈ 4/π × shown (+27%); cancels in selectivity ratios${cwWarn}`
}

export function tipDutyCycle(opts: {
  effectiveDutyCycle: number
  targetSAR: number
  healthySAR: number
  maxSteadyTemp: number
  thermalDangerLevel: string
  dutyCycleDisplay: string
}): string {
  const { effectiveDutyCycle, targetSAR, healthySAR, maxSteadyTemp, thermalDangerLevel, dutyCycleDisplay } = opts
  const effT = (targetSAR  * effectiveDutyCycle).toFixed(2)
  const effH = (healthySAR * effectiveDutyCycle).toFixed(2)
  const warnText = thermalDangerLevel === 'vaporizing'
    ? '\n<span class="tip-warn">⚡ VAPORIZING — cells instantly destroyed at T_ss ≥ 100°C</span>'
    : thermalDangerLevel === 'denaturing'
      ? '\n<span class="tip-warn">⚠ DENATURING — protein coagulation at T_ss ≥ 60°C (collagen ~60°C, albumin ~68°C)</span>'
      : thermalDangerLevel === 'hyperthermic'
        ? '\n<span class="tip-warn">⚠ HYPERTHERMIC — thermal damage onset at T_ss ≥ 42°C (IAHT threshold)</span>'
        : ''
  return `<strong>Pulse Duty Cycle  (t_on / period)</strong>
Current: <span class="tip-val">${dutyCycleDisplay}</span>

Fraction of time the field is active.
Scales effective SAR → thermal load:
  SAR_eff = SAR_peak × duty_cycle

<span class="tip-val">T: ${effT} W/kg</span>  ·  <span class="tip-val">H: ${effH} W/kg</span>

Projected T_ss = <span class="tip-val">${maxSteadyTemp.toFixed(0)}°C</span>  (T_ss = 37 + SAR_eff/(λ·cp))
Typical pulsed electroporation: 0.001%–1%${warnText}`
}

export function tipMedium(medium: MediumKey): string {
  const m = MEDIA[medium]
  return `<strong>Propagation Medium</strong>
Sets external conductivity <span class="tip-val">σ_e = ${m.conductivity} S/m</span>
Used in Schwan time constant:
  τ = R·Cm·(2σ_e+σ_i) / (2σ_e·σ_i)
Higher σ_e → lower τ → higher fc → broader quasi-DC regime`
}

export function tipMediumKeys(): Record<string, string> {
  const descs: Record<string, string> = {
    saline: 'Matches physiological interstitial fluid',
    blood:  'Whole blood — moderate coupling',
    tissue: 'Soft tissue (low-perfusion) — note: DMEM has σ_e ≈ 1.4–1.6 S/m, not 0.4 S/m',
    water:  'Distilled water — near-zero coupling',
  }
  const out: Record<string, string> = {}
  for (const key of Object.keys(MEDIA)) {
    const m = MEDIA[key as MediumKey]
    out[key] = `<strong>${m.name}</strong>
σ_e = <span class="tip-val">${m.conductivity} S/m</span>
${descs[key] ?? ''}`
  }
  return out
}

export function tipFreq(freqDisplay: string, targetFcDisplay: string, healthyFcDisplay: string): string {
  return `<strong>RF Broadcast Frequency</strong>
Current: <span class="tip-val">${freqDisplay}</span>
Schwan denominator: √(1 + (2πf·τ)²)

<span class="tip-val">fc(T) = ${targetFcDisplay}</span> — target roll-off frequency
<span class="tip-val">fc(H) = ${healthyFcDisplay}</span> — healthy roll-off frequency

Below fc → quasi-DC regime, Vm at maximum
Above fc → Vm rolls off toward zero`
}

export function tipFcSub(): string {
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
}

export function tipField(opts: {
  chartMode: string
  target: ResonanceExtra
  fieldDisplay: string
  targetDisruption: number
  targetCellCategory: string
  targetLysisField: number
  healthyLysisField: number
  t: T
}): string {
  const { chartMode, target, fieldDisplay, targetDisruption, targetCellCategory, targetLysisField, healthyLysisField, t } = opts
  if (chartMode === 'resonance') {
    if (target.resonantFreqGHz && target.resonantThresholdVcm) {
      const fStr = target.resonantFreqGHz >= 1
        ? `${target.resonantFreqGHz.toFixed(1)} GHz`
        : `${(target.resonantFreqGHz * 1000).toFixed(0)} MHz`
      const thrStr = `${target.resonantThresholdVcm} V/cm`
      const pct = (targetDisruption * 100).toFixed(0) + '%'
      const warn = targetDisruption >= 1.0
        ? '\n<span class="tip-warn">⚡ Disruption threshold exceeded — capsid/cell-wall rupture</span>'
        : targetDisruption > 0.85
          ? '\n<span class="tip-warn">⚠ Approaching disruption threshold</span>'
          : ''
      return `<strong>${t('resonance.tipFieldTitle')}</strong>
${t('slider.fieldIntensity')}: <span class="tip-val">${fieldDisplay}</span>

${t('resonance.tipFieldFormula')}
f_res(T) = <span class="tip-val">${fStr}</span>  ·  E_threshold = <span class="tip-val">${thrStr}</span>  ·  Q = ${target.capsidQ ?? 20}

${t('resonance.tipFieldRatio')}: <span class="tip-val">${pct}</span>
${t('resonance.tipFieldDisruptNote')}${warn}`
    }
    return `<strong>${t('slider.fieldIntensity')}</strong>\n${t('resonance.noResonance')}`
  }
  const tLysis = targetLysisField
  const hLysis = healthyLysisField
  const tStr   = tLysis >= 1000 ? `${(tLysis / 1000).toFixed(1)} kV/cm` : `${tLysis.toFixed(0)} V/cm`
  const hStr   = hLysis >= 1000 ? `${(hLysis / 1000).toFixed(1)} kV/cm` : `${hLysis.toFixed(0)} V/cm`
  const contextNote = targetCellCategory === 'virus'
    ? `\n<span class="tip-warn">⚠ Virion IRE threshold ≈ ${tStr} — impractical at any safe field.\nSwitch to Resonance mode for virion disruption.</span>`
    : targetCellCategory === 'bacteria'
      ? `\n<span class="tip-warn">⚠ Bacterial IRE threshold ≈ ${tStr}.\nUse nsEP: short pulse width (≪ τ) lowers effective E_lysis by reducing charge time.</span>`
      : `\nTherapeutic window at current frequency:\n  Target lysis ≥ <span class="tip-val">${tStr}</span>  ·  Healthy lysis ≥ <span class="tip-val">${hStr}</span>`
  return `<strong>Applied Electric Field Intensity</strong>
Current: <span class="tip-val">${fieldDisplay}</span>
Vm scales linearly:  Vm = 1.5 × E × R × cos θ / √(1+(ωτ)²)
${contextNote}`
}

export function tipTargetBadge(opts: {
  chartMode: string
  target: ResonanceExtra
  targetDisruptPercent: string
  targetDisruption: number
  targetVmMv: number
  lysisDelayMs: number
  t: T
}): string {
  const { chartMode, target, targetDisruptPercent: pct, targetDisruption, targetVmMv, lysisDelayMs, t } = opts
  const lysisStr = formatLysisTime(lysisDelayMs)
  if (chartMode === 'resonance') {
    const fStr = target.resonantFreqGHz
      ? (target.resonantFreqGHz >= 1 ? `${target.resonantFreqGHz.toFixed(1)} GHz` : `${(target.resonantFreqGHz * 1000).toFixed(0)} MHz`)
      : '—'
    const warn = targetDisruption >= 1.0
      ? '\n<span class="tip-warn">⚡ Disruption threshold exceeded — capsid/cell-wall rupture imminent</span>'
      : targetDisruption > 0.85
        ? `\n<span class="tip-warn">⚠ >85% — approaching disruption threshold (${lysisStr} countdown)</span>`
        : ''
    return `<strong>${t('resonance.tipTargetBadgeTitle', { pct })}</strong>
${t('resonance.tipTargetBadgeFormula')}
f_res = <span class="tip-val">${fStr}</span>  ·  Q = ${(target as { capsidQ?: number }).capsidQ ?? 20}${warn}
${t('resonance.tipTargetBadgeNote')}`
  }
  const tThr  = (target.thresholdVoltage * 1000).toFixed(0)
  const warn  = targetDisruption > 0.85
    ? `\n<span class="tip-warn">⚡ >85% — lysis countdown active (${lysisStr})</span>` : ''
  return `<strong>Target membrane disruption: <span class="tip-val">${pct}%</span></strong>
Ratio = Vm / lysis threshold voltage

Vm = <span class="tip-val">${targetVmMv.toFixed(2)} mV</span>  ·  Threshold = ${tThr} mV${warn}
>85% held for ${lysisStr} → irreversible membrane lysis`
}

export function tipHealthyBadge(opts: {
  chartMode: string
  healthyDisruptPercent: string
  healthyDisruption: number
  healthyVmMv: number
  thresholdVoltage: number
  t: T
}): string {
  const { chartMode, healthyDisruptPercent: pct, healthyDisruption, healthyVmMv, thresholdVoltage, t } = opts
  if (chartMode === 'resonance') {
    return `<strong>${t('resonance.tipHealthyBadgeTitle')}</strong>
${t('resonance.tipHealthyBadgeBody')}
<span class="tip-ok">✓ ${t('resonance.tipHealthyBadgeSafe')}</span>`
  }
  const hThr = (thresholdVoltage * 1000).toFixed(0)
  const ok   = healthyDisruption < 0.5
    ? '\n<span class="tip-ok">✓ Healthy cells are safe</span>'
    : healthyDisruption > 0.85
      ? '\n<span class="tip-warn">⚠ Approaching ablative — reduce field</span>'
      : '\n<span class="tip-warn">⚠ Approaching limit — monitor closely</span>'
  return `<strong>Healthy membrane disruption: <span class="tip-val">${pct}%</span></strong>
Ratio = Vm / lysis threshold voltage

Vm = <span class="tip-val">${healthyVmMv.toFixed(2)} mV</span>  ·  Threshold = ${hThr} mV${ok}
Keep below 50% for a safe therapeutic window`
}

export function tipOrientation(orientationDeg: number, cosThetaFactor: number): string {
  const cosT = (cosThetaFactor * 100).toFixed(0)
  return `<strong>Cell Orientation  θ = ${orientationDeg}°</strong>
|cos(θ)| = <span class="tip-val">${cosT}%</span> of maximum Vm coupling

Schwan equation:  Vm = 1.5·E·R·<span class="tip-val">cos(θ)</span> / √(1+(ωτ)²)
θ = angle between applied field vector and cell symmetry axis.

<span class="tip-val">θ = 0°</span>  (field-aligned) → maximum Vm, fastest pore-formation onset
<span class="tip-val">θ = 90°</span> (perpendicular) → Vm → 0, field cannot charge the membrane

cos(θ) cancels in the Vm_T/Vm_H selectivity ratio — orientation does
not change the relative advantage between target and healthy cells.`
}

export function tipLysisN(opts: {
  lysisNPulses: number
  lysisDelayMs: number
  dutyCycle: number
  pulseWidthNs: number
}): string {
  const { lysisNPulses: n, lysisDelayMs, dutyCycle, pulseWidthNs } = opts
  const periodMs  = dutyCycle > 0 ? (pulseWidthNs * 1e-6) / dutyCycle : 0
  const periodStr = periodMs > 0
    ? (periodMs < 1 ? `${(periodMs * 1000).toFixed(1)} µs` : `${periodMs.toFixed(3)} ms`)
    : '—'
  return `<strong>Pulses to Lysis  N = ${n}</strong>
Estimated protocol time: <span class="tip-val">${formatLysisTime(lysisDelayMs)}</span>

Number of above-threshold pulses required for irreversible lysis.
Based on cumulative electroporation pore-formation kinetics.

Protocol time = N × t_period = N × (t_p / dc)
  t_period = <span class="tip-val">${periodStr}</span>  ·  N = <span class="tip-val">${n}</span>

Lysis countdown in the cell card resets immediately when N changes.
At CW waveform a fixed 2.5 s delay is used instead.`
}

export function tipPulseWidth(opts: {
  targetFc: number
  healthyFc: number
  pulseWidthDisplay: string
  lysisDelayMs: number
  lysisNPulses: number
  dutyCycle: number
}): string {
  const { targetFc, healthyFc, pulseWidthDisplay, lysisDelayMs, lysisNPulses, dutyCycle } = opts
  const tTau_ns = targetFc  > 0 ? (1 / (2 * Math.PI * targetFc  * 1e3) * 1e9) : 0
  const hTau_ns = healthyFc > 0 ? (1 / (2 * Math.PI * healthyFc * 1e3) * 1e9) : 0
  const tTauStr = tTau_ns > 0 ? tTau_ns.toFixed(0) + ' ns' : '—'
  const hTauStr = hTau_ns > 0 ? hTau_ns.toFixed(0) + ' ns' : '—'
  const dcPct   = (dutyCycle * 100).toFixed(4)
  return `<strong>Pulse Width  t_p</strong>
Current: <span class="tip-val">${pulseWidthDisplay}</span>

This simulation uses AC sinusoidal fields — Vm is set by carrier
frequency and field amplitude via the Schwan equation. Pulse width
does NOT alter Vm in this model.

Pulse width controls:
  1. <span class="tip-val">Lysis protocol timing</span>  →  Protocol time = N × (t_p / dc)
       N = ${lysisNPulses}  ·  dc = ${dcPct}%  →  <span class="tip-val">${formatLysisTime(lysisDelayMs)}</span>
  2. <span class="tip-val">SAR thermal load</span>  — waveformFactor = 1.0 (bipolar square wave; E²_rms = E²_peak during on-time)

Reference time constants (Schwan model):
  τ(target)  = <span class="tip-val">${tTauStr}</span>
  τ(healthy) = <span class="tip-val">${hTauStr}</span>

For true nsEP (t_p ≪ τ, DC pulse model), see §2.5 of the Protocol page.
Ref: Beebe et al. 2003; Batista Napotnik et al. 2016`
}
