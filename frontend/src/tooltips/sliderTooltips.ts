// Copyright © 2026 Tomer Preis. All rights reserved.
// Unauthorized copying or distribution is prohibited.

/**
 * Tooltip content builders for FrequencySlider.vue.
 *
 * All functions are pure - they accept explicit parameters so they remain
 * testable and reusable without a Vue component instance.
 * Functions that render i18n strings receive a `t` translator.
 */

import { MEDIA } from '@/constants/media'
import { DEFAULT_CAPSID_Q } from '@/constants/physics'
import { CELL_CATEGORY, THERMAL_LEVEL } from '@/constants/strings'
import { UNIT } from '@/constants/units'
import type { MediumKey } from '@/types/media'

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
    ? `\n\n<span class="tip-warn">⚠ At current field (${currentField} V/cm), CW would heat cells to T_ss ≈ ${Math.min(maxSteadyTemp, 150).toFixed(0)}°C, reduce field before switching to CW.</span>`
    : ''
  return `<strong>Waveform Type</strong>
<span class="tip-val">CW (sinusoidal)</span> , continuous wave, always on
  SAR = σ_i·α²·E²/(2ρ)  [waveformFactor = 0.5, RMS halving]
  Thermal: effective duty cycle = 1.0 (full continuous heating)
  Use case: continuous RF sinusoidal exposure (e.g. unmodulated carrier)

<span class="tip-val">Pulsed (Monopolar IRE)</span> , unipolar square pulses at set duty cycle
  SAR = σ_i·α²·E²/ρ  [waveformFactor = 1.0; E²_rms = E²_peak during on-time]
  Thermal load = SAR_peak × duty cycle; pulse-envelope factor applies (PEF = 1−exp(−tp/τ))
  Lysis threshold: nominal Vth
  True square-wave fundamental Vm ≈ 4/π × shown (+27%); cancels in selectivity ratios

<span class="tip-val">H-FIRE (Bipolar burst IRE)</span> , bipolar square-wave bursts at intra-burst carrier frequency
  SAR = σ_i·α²·E²/ρ  [same waveformFactor = 1.0 as monopolar; bipolar E²_rms = E²_peak during on-time]
  Polarity reversals partially discharge membrane capacitance between half-cycles
  Effective lysis threshold raised ×1.75 vs. monopolar (Sano et al. 2015; Arena et al. 2011)
  Benefit: carrier freq &gt;1 kHz is below neuromuscular activation threshold${cwWarn}`
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
  const warnText = thermalDangerLevel === THERMAL_LEVEL.VAPORIZING
    ? '\n<span class="tip-warn">⚡ VAPORIZING, cells instantly destroyed at T_ss ≥ 100°C</span>'
    : thermalDangerLevel === THERMAL_LEVEL.DENATURING
      ? '\n<span class="tip-warn">⚠ DENATURING, protein coagulation at T_ss ≥ 60°C (collagen ~60°C, albumin ~68°C)</span>'
      : thermalDangerLevel === THERMAL_LEVEL.HYPERTHERMIC
        ? '\n<span class="tip-warn">⚠ HYPERTHERMIC, thermal damage onset at T_ss ≥ 42°C (IAHT threshold)</span>'
        : ''
  return `<strong>Pulse Duty Cycle  (t_on / period)</strong>
Current: <span class="tip-val">${dutyCycleDisplay}</span>

Fraction of time the field is active.
Scales effective SAR → thermal load:
  SAR_eff = SAR_peak × duty_cycle

<span class="tip-val">T: ${effT} W/kg</span>  ·  <span class="tip-val">H: ${effH} W/kg</span>

Projected T_ss = <span class="tip-val">${maxSteadyTemp.toFixed(0)}°C</span>  (T_ss = 37 + SAR_eff/(λ·cp))
Typical pulsed electroporation: 0.001%-1%${warnText}`
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
    blood:  'Whole blood: moderate coupling',
    tissue: 'Soft tissue (low-perfusion region)',
    water:  'Distilled water: near-zero coupling',
    dmem:   'Dulbecco\'s Modified Eagle Medium, standard adherent cell culture · σ_e ≈ saline',
    rpmi:   'RPMI 1640, suspension / haematological cell lines · slightly lower ionic strength',
    mhb:    'Mueller-Hinton Broth: CLSI/EUCAST bacteriology standard · τ ~12% longer than saline',
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

<span class="tip-val">fc(T) = ${targetFcDisplay}</span>, target roll-off frequency
<span class="tip-val">fc(H) = ${healthyFcDisplay}</span>, healthy roll-off frequency

Below fc → quasi-DC regime, Vm at maximum
Above fc → Vm rolls off toward zero`
}

export function tipFcSub(): string {
  return `<strong>Characteristic Frequency  fc = 1 / (2πτ)</strong>
At f = fc,  Vm = 0.707 × Vm_DC  (−3 dB point)
τ = R·Cm·(2σ_e+σ_i)/(2σ_e·σ_i)  [Kotnik & Miklavcic 2000]

Depends on cell size and membrane properties:
  Reference cells: ~1.1-1.4 MHz  (hepatocyte ~1.08 MHz)
  Cancer cells:    ~0.5-1.4 MHz  (adenocarcinoma ~0.49 MHz, HL-60 ~1.35 MHz)
  Bacteria:        ~11-49 MHz  (E. coli ~11 MHz, MRSA ~49 MHz; σ_i = 0.3 S/m)
  Virions:         fc ~0.6-0.75 MHz (σ_i-limited; Schwan model is approximate for virions)

Note: for cancer/normal cell pairs where τ_T > τ_H (typical),
  maximum selectivity is at quasi-DC. Above fc(T) selectivity decreases.`
}

export function tipField(opts: {
  isResonanceMode: boolean
  target: ResonanceExtra
  fieldDisplay: string
  targetDisruption: number
  targetCellCategory: string
  targetLysisField: number
  healthyLysisField: number
  t: T
}): string {
  const { isResonanceMode, target, fieldDisplay, targetDisruption, targetCellCategory, targetLysisField, healthyLysisField, t } = opts
  if (isResonanceMode) {
    if (target.resonantFreqGHz && target.resonantThresholdVcm) {
      const fStr = target.resonantFreqGHz >= 1
        ? `${target.resonantFreqGHz.toFixed(1)} GHz`
        : `${(target.resonantFreqGHz * 1000).toFixed(0)} MHz`
      const thrStr = `${target.resonantThresholdVcm} V/cm`
      const pct = (targetDisruption * 100).toFixed(0) + '%'
      const warn = targetDisruption >= 1.0
        ? '\n<span class="tip-warn">⚡ Disruption threshold exceeded, capsid/cell-wall rupture</span>'
        : targetDisruption > 0.85
          ? '\n<span class="tip-warn">⚠ Approaching disruption threshold</span>'
          : ''
      return `<strong>${t('resonance.tipFieldTitle')}</strong>
${t('slider.fieldIntensity')}: <span class="tip-val">${fieldDisplay}</span>

${t('resonance.tipFieldFormula')}
f_res(T) = <span class="tip-val">${fStr}</span>  ·  E_threshold = <span class="tip-val">${thrStr}</span>  ·  Q = ${target.capsidQ ?? DEFAULT_CAPSID_Q}

${t('resonance.tipFieldRatio')}: <span class="tip-val">${pct}</span>
${t('resonance.tipFieldDisruptNote')}${warn}`
    }
    return `<strong>${t('slider.fieldIntensity')}</strong>\n${t('resonance.noResonance')}`
  }
  const tLysis = targetLysisField
  const hLysis = healthyLysisField
  const tStr   = tLysis >= 1000 ? `${(tLysis / 1000).toFixed(1)} kV/cm` : `${tLysis.toFixed(0)} V/cm`
  const hStr   = hLysis >= 1000 ? `${(hLysis / 1000).toFixed(1)} kV/cm` : `${hLysis.toFixed(0)} V/cm`
  const contextNote = targetCellCategory === CELL_CATEGORY.VIRUS
    ? `\n<span class="tip-warn">⚠ Virion IRE threshold ≈ ${tStr}, impractical at any safe field.\nSwitch to Resonance mode for virion disruption.</span>`
    : targetCellCategory === CELL_CATEGORY.BACTERIA
      ? `\n<span class="tip-warn">⚠ Bacterial IRE threshold ≈ ${tStr}.\nUse nsEP: short pulse width (≪ τ) lowers effective E_lysis by reducing charge time.</span>`
      : `\nTherapeutic window at current frequency:\n  Target lysis ≥ <span class="tip-val">${tStr}</span>  ·  Healthy lysis ≥ <span class="tip-val">${hStr}</span>`
  return `<strong>Applied Electric Field Intensity</strong>
Current: <span class="tip-val">${fieldDisplay}</span>
Vm scales linearly:  Vm = 1.5 × E × R × cos θ / √(1+(ωτ)²)
${contextNote}`
}

export function tipTargetBadge(opts: {
  isResonanceMode: boolean
  target: ResonanceExtra
  targetDisruptPercent: string
  targetDisruption: number
  targetVmMv: number
  lysisDelayMs: number
  t: T
}): string {
  const { isResonanceMode, target, targetDisruptPercent: pct, targetDisruption, targetVmMv, lysisDelayMs, t } = opts
  const lysisStr = formatLysisTime(lysisDelayMs)
  if (isResonanceMode) {
    const fStr = target.resonantFreqGHz
      ? (target.resonantFreqGHz >= 1 ? `${target.resonantFreqGHz.toFixed(1)} GHz` : `${(target.resonantFreqGHz * 1000).toFixed(0)} MHz`)
      : ', '
    const warn = targetDisruption >= 1.0
      ? '\n<span class="tip-warn">⚡ Disruption threshold exceeded, capsid/cell-wall rupture imminent</span>'
      : targetDisruption > 0.85
        ? `\n<span class="tip-warn">⚠ >85%, approaching disruption threshold (${lysisStr} countdown)</span>`
        : ''
    return `<strong>${t('resonance.tipTargetBadgeTitle', { pct })}</strong>
${t('resonance.tipTargetBadgeFormula')}
f_res = <span class="tip-val">${fStr}</span>  ·  Q = ${(target as { capsidQ?: number }).capsidQ ?? DEFAULT_CAPSID_Q}${warn}
${t('resonance.tipTargetBadgeNote')}`
  }
  const tThr  = (target.thresholdVoltage * 1000).toFixed(0)
  const warn  = targetDisruption > 0.85
    ? `\n<span class="tip-warn">⚡ >85%, lysis countdown active (${lysisStr})</span>` : ''
  return `<strong>Target membrane disruption: <span class="tip-val">${pct}%</span></strong>
Ratio = Vm / lysis threshold voltage

Vm = <span class="tip-val">${targetVmMv.toFixed(2)} mV</span>  ·  Threshold = ${tThr} mV${warn}
>85% held for ${lysisStr} → irreversible membrane lysis`
}

export function tipHealthyBadge(opts: {
  isResonanceMode: boolean
  healthyDisruptPercent: string
  healthyDisruption: number
  healthyVmMv: number
  thresholdVoltage: number
  t: T
}): string {
  const { isResonanceMode, healthyDisruptPercent: pct, healthyDisruption, healthyVmMv, thresholdVoltage, t } = opts
  if (isResonanceMode) {
    return `<strong>${t('resonance.tipHealthyBadgeTitle')}</strong>
${t('resonance.tipHealthyBadgeBody')}
<span class="tip-ok">✓ ${t('resonance.tipHealthyBadgeSafe')}</span>`
  }
  const hThr = (thresholdVoltage * 1000).toFixed(0)
  const ok   = healthyDisruption < 0.5
    ? '\n<span class="tip-ok">✓ Healthy cells are safe</span>'
    : healthyDisruption > 0.85
      ? '\n<span class="tip-warn">⚠ Healthy cells approaching lysis threshold, reduce field</span>'
      : '\n<span class="tip-warn">⚠ Approaching rev-EP zone, monitor closely</span>'
  return `<strong>Healthy membrane disruption: <span class="tip-val">${pct}%</span></strong>
Ratio = Vm / lysis threshold voltage

Vm = <span class="tip-val">${healthyVmMv.toFixed(2)} mV</span>  ·  Threshold = ${hThr} mV${ok}
Keep below 50% for a selective protocol window`
}

export function tipOrientation(orientationDeg: number, cosThetaFactor: number): string {
  const cosT = (cosThetaFactor * 100).toFixed(0)
  return `<strong>Cell Orientation  θ = ${orientationDeg}°</strong>
|cos(θ)| = <span class="tip-val">${cosT}%</span> of maximum Vm coupling

Schwan equation:  Vm = 1.5·E·R·<span class="tip-val">cos(θ)</span> / √(1+(ωτ)²)
θ = angle between applied field vector and cell symmetry axis.

<span class="tip-val">θ = 0°</span>  (field-aligned) → maximum Vm, fastest pore-formation onset
<span class="tip-val">θ = 90°</span> (perpendicular) → Vm → 0, field cannot charge the membrane

cos(θ) cancels in the Vm_T/Vm_H selectivity ratio, orientation does
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
    : ', '
  return `<strong>Pulses to Lysis  N = ${n}</strong>
Estimated protocol time: <span class="tip-val">${formatLysisTime(lysisDelayMs)}</span>

Number of above-threshold pulses required for irreversible lysis.
Based on cumulative electroporation pore-formation kinetics.

Protocol time = N × t_period = N × (t_p / dc)
  t_period = <span class="tip-val">${periodStr}</span>  ·  N = <span class="tip-val">${n}</span>

Lysis countdown in the cell card resets immediately when N changes.
At CW waveform a fixed 2.5 s delay is used instead.`
}

export function tipOptimalBtn(beyondRange: boolean): string {
  const beyondNote = beyondRange
    ? '\n<span class="tip-warn">Optimal lies outside current slider range, slider clamped to nearest bound.</span>'
    : '\nClick to set frequency to optimal.'
  return `<strong>⭐ Snap to Optimal Frequency</strong>
Frequency that maximises selectivity ratio TI = T-DR / H-DR.
300-point log scan 10 kHz-500 MHz at current field &amp; medium.${beyondNote}`
}

export function tipScopeNote(): string {
  return `<strong>Applied field parameters</strong>
Medium · RF Frequency · Field Intensity · Waveform · Duty Cycle · Pulse Width · Orientation θ
are <strong>shared</strong>, the same field is applied to both healthy (H) and target (T) cells simultaneously.
Different Vm responses arise purely from each cell's biophysical parameters (R, ε_r, σ_i, τ).

<strong>Cell-specific parameters</strong> (Radius, ε_r, σ_i, Threshold Vm) are edited individually
on each cell card and determine how each cell responds to the shared applied field.

<strong>Pulses to Lysis N</strong> controls target-cell lysis timing only, it has no effect on the healthy cell.`
}

export function tipThermalBanner(level: 'vaporizing' | 'denaturing' | 'hyperthermic'): string {
  if (level === 'vaporizing') {
    return `<strong>Vaporizing Regime: T ≥ 100°C</strong>
Water boiling · rapid steam-pressure lysis
Reduce duty cycle or field intensity immediately`
  }
  if (level === 'denaturing') {
    return `<strong>Protein Denaturation: T ≥ 60°C</strong>
Irreversible protein damage onset
(collagen ~60°C · albumin ~68°C)
Reduce duty cycle or field intensity`
  }
  return `<strong>Hyperthermic Regime: T ≥ 42°C</strong>
IAHT thermal damage onset
Monitor and reduce duty cycle if sustained`
}

export function tipSigmaE(conductivity: number): string {
  return `<strong>External conductivity σ_e = ${conductivity} S/m</strong>
Used in Schwan time constant:
τ = R·Cm·(2·<span class="tip-val">σ_e</span>+σ_i)/(2·<span class="tip-val">σ_e</span>·σ_i)
Change medium to shift the coupling strength`
}

export function tipShellModel(): string {
  return `<strong>Shell Model</strong>
Choose the membrane model used to compute transmembrane potential.
Single-Shell: standard Schwan (plasma membrane only).
+ Nuclear Envelope: adds nuclear Vm bandpass, Kotnik &amp; Miklavcic (2006).`
}

export function tipSingleShell(): string {
  return `<strong>Single-Shell (Schwan)</strong>
Standard single-shell model, only plasma membrane Vm is computed.
τ = R·Cm·(2σ_e+σ_i)/(2σ_e·σ_i)  ·  Vm = 1.5·E·R·cos θ / √(1+(ωτ)²)
Default mode. Applicable to all cell types.
Ref: Kotnik &amp; Miklavcic, Biophys. J. 79:670 (2000)`
}

export function tipDoubleShell(): string {
  return `<strong>+ Nuclear Envelope (Double-Shell)</strong>
Adds nuclear membrane Vm as a two-pole bandpass function.
Vm_nuc peaks at f_peak = 1/(2π√(τ_out·τ_ne))
τ_ne = R_nuc·Cm_ne·(2σ_i+σ_np)/(2σ_i·σ_np)  [σ_i = cytoplasm, external medium for nucleus]
Cancer nuclei: thinner NE, lower σ_ne threshold → additional selectivity axis.

Expected at 417 kHz / 150 V/cm / saline:
  Hepatocyte:    Vm_nuc ≈ 40 mV  (f_peak ≈ 1.66 MHz)
  Adeno CA:      Vm_nuc ≈ 113 mV (f_peak ≈ 0.87 MHz)
  GBM:           Vm_nuc ≈ 87 mV  (f_peak ≈ 1.05 MHz)

Ref: Kotnik &amp; Miklavcic, Biophys. J. 90:480 (2006)`
}

export function tipLysisNNote(): string {
  return `\n<span class="tip-note">Affects target cell lysis countdown only.\nHas no effect on the healthy cell disruption model.</span>`
}

export function tipPerfusion(perfusionRate: number, effLambdaH: number): string {
  const label = perfusionRate === 0
    ? 'in vitro (no perfusion)'
    : perfusionRate < 0.5 ? 'low perfusion (fat/cartilage)'
    : perfusionRate < 1.5 ? 'moderate perfusion (muscle/liver)'
    : perfusionRate < 3   ? 'high perfusion (brain/heart)'
    : 'very high perfusion (kidney)'
  const pct = ((effLambdaH - 0.02) / 0.02 * 100).toFixed(0)
  return `<strong>Blood Perfusion Rate ω_b</strong>
Current: <span class="tip-val">${perfusionRate.toFixed(2)} mL/(g·min)</span>, ${label}

Pennes bioheat equation (1948):
  λ_eff = λ_Newton + λ_perf
  λ_perf = ω_b × ρ_b × c_b / cp
         = ω_b × 63.9 / cp  [1/s]
  ρ_b = 1060 kg/m³  ·  c_b = 3617 J/(kg·K)

λ_Newton = 0.02 /s  (surface/diffusion cooling)
λ_perf   = ${(effLambdaH - 0.02).toFixed(4)} /s  (+${pct}% additional cooling)

T_ss = 37 + SAR_eff / (λ_eff × cp)

<span class="tip-note">0 = in vitro default (no blood supply)
Typical values: muscle 0.5 · brain 1.0 · kidney 5.0 mL/(g·min)
Higher ω_b → stronger cooling → lower T_ss → higher safe duty cycle</span>`
}

export function tipCellPacking(phi: number, sigma_e0: number, sigma_eff: number): string {
  const reduction = ((1 - sigma_eff / sigma_e0) * 100).toFixed(1)
  const context = phi === 0 ? 'isolated cell (no correction)'
    : phi < 0.3 ? 'sparse suspension'
    : phi < 0.5 ? 'moderate suspension (pellet density)'
    : phi < 0.7 ? 'dense suspension (aggregate / spheroid)'
    : 'very dense / compact cell mass'
  return `<strong>Cell Packing Fraction φ</strong>
Current: <span class="tip-val">φ = ${(phi * 100).toFixed(0)}%</span>, ${context}

Maxwell-Garnett effective medium (DC insulating-sphere limit):
  σ_e_eff = σ_e × (1 − φ) / (1 + φ/2)
  [Garnett 1904; Foster &amp; Schwan 1989]

  σ_e₀ = ${sigma_e0.toFixed(3)} S/m  →  σ_e_eff = ${sigma_eff.toFixed(3)} S/m (−${reduction}%)

Effect: reduces τ (faster fc rolloff) and internal field α.
At high packing fractions, cells shadow each other, the
effective field delivering Vm to each cell is lower.

<span class="tip-note">Valid for f ≪ fc. At f > fc the membrane polarises less and
the MG correction approaches the bare-medium limit.
φ = 0 (default) = isolated-cell in-vitro conditions.</span>`
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
  const tTauStr = tTau_ns > 0 ? tTau_ns.toFixed(0) + ' ' + UNIT.NS : ', '
  const hTauStr = hTau_ns > 0 ? hTau_ns.toFixed(0) + ' ' + UNIT.NS : ', '
  const dcPct   = (dutyCycle * 100).toFixed(4)
  return `<strong>Pulse Width  t_p</strong>
Current: <span class="tip-val">${pulseWidthDisplay}</span>

Vm (raw Schwan) is set by carrier frequency and field amplitude, it
does not depend on pulse width. However, pulse width DOES scale the
effective disruption ratio in IRE mode via the pulse envelope factor:
  <span class="tip-val">f_pulse = 1 − exp(−t_p / τ)</span>
At t_p ≪ τ the membrane barely charges → lower effective DR and
higher apparent lysis threshold. At t_p ≥ 3τ the membrane fully
charges → f_pulse → 1 (same as quasi-static Schwan result).

Pulse width controls:
  1. <span class="tip-val">Effective disruption ratio</span>  →  DR_eff = DR_Schwan × f_pulse
  2. <span class="tip-val">Lysis protocol timing</span>  →  Protocol time = N × (t_p / dc)
       N = ${lysisNPulses}  ·  dc = ${dcPct}%  →  <span class="tip-val">${formatLysisTime(lysisDelayMs)}</span>
  3. <span class="tip-val">SAR thermal load</span>: waveformFactor = 1.0 for square pulses (Monopolar IRE) or bursts (H-FIRE); E²_rms = E²_peak during on-time

Reference time constants (Schwan model):
  τ(target)  = <span class="tip-val">${tTauStr}</span>
  τ(healthy) = <span class="tip-val">${hTauStr}</span>

For true nsEP (t_p ≪ τ, DC pulse model), see §2.5 of the Protocol page.
Ref: Beebe et al. 2003; Batista Napotnik et al. 2016`
}
