/**
 * Tooltip content builders for CellCard components.
 * Pure functions — no Vue component dependency.
 */

import { CELL_STATE, CELL_TYPE, CHART_MODE, WAVEFORM } from '@/constants/strings'
import { computeTau } from './physics'
import type { CellConfig } from '@/types/cell'

export function formatLysisTimeLocal(ms: number): string {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}

export function tipVm(opts: {
  vmDisplay: string
  disruptionRatio: number
  thresholdVoltage: number
  waveform: string
}): string {
  const { vmDisplay, disruptionRatio, thresholdVoltage, waveform } = opts
  const thr = (thresholdVoltage * 1000).toFixed(0)
  const pct = (disruptionRatio * 100).toFixed(0)
  const pulsedNote = waveform === WAVEFORM.PULSED
    ? '\n<span class="tip-note">Pulsed mode (H-FIRE/IRE): Vm uses E_peak as standard approx.\nTrue square-wave fundamental ≈ 4/π × shown (+27%). Cancels in selectivity ratio.</span>'
    : ''
  return `<strong>Transmembrane Potential (Vm)</strong>
Current: <span class="tip-val">${vmDisplay}</span>

Peak voltage induced across the cell membrane
by the applied electric field — Schwan equation:
  Vm = 1.5 × E × R × cos θ / √(1 + (2πf·τ)²)

Lysis threshold: ${thr} mV
Disruption: <span class="tip-val">${pct}%</span>${pulsedNote}`
}

export function tipTemp(opts: {
  tempDisplay: string
  tempVaporizing: boolean
  tempDenaturing: boolean
  tempWarning: boolean
}): string {
  const { tempDisplay, tempVaporizing, tempDenaturing, tempWarning } = opts
  let warnLine = ''
  if (tempVaporizing) {
    warnLine = '\n<span class="tip-warn">⚡ ≥100°C — THERMAL LYSIS — water boiling / steam pressure</span>'
  } else if (tempDenaturing) {
    warnLine = '\n<span class="tip-warn">⚠ ≥60°C — protein denaturation (collagen ~60°C, albumin ~68°C) — reduce duty cycle / field</span>'
  } else if (tempWarning) {
    warnLine = '\n<span class="tip-warn">⚠ ≥42°C — hyperthermic damage onset (IAHT threshold) — monitor closely</span>'
  }
  return `<strong>Cell Temperature</strong>
Current: <span class="tip-val">${tempDisplay}</span>

Modelled via Specific Absorption Rate (SAR):
  SAR = σ_i × α² × E² × w_f / ρ  [W/kg]
  α = 3σ_e/(2σ_e+σ_i)  (internal field factor — sphere in medium)
  w_f = 0.5 (CW sinusoidal, E²_rms = E²_peak/2) | 1.0 (pulsed bipolar square wave, E²_rms = E²_peak)

Pennes bioheat: T_ss = 37 + SAR_eff / ((λ_Newton + λ_perf) × cp)
  λ_Newton = 0.02 /s (surface/diffusion cooling)
  λ_perf   = ω_b × 63.9 / cp  (blood perfusion — Advanced → Blood Perfusion ω_b)
Thresholds: 42°C hyperthermic · 60°C denaturing · 100°C vaporizing${warnLine}`
}

export function tipState(opts: {
  cellState: string
  thermalLysis: boolean
  cellType: string
  lysisDelayMs: number
}): string {
  const { cellState, thermalLysis, cellType, lysisDelayMs } = opts
  const lysisTime = formatLysisTimeLocal(lysisDelayMs)
  const labels: Record<string, string> = {
    [CELL_STATE.STABLE]:      'stable — no significant membrane or thermal response',
    [CELL_STATE.NOURISHING]:  '<span class="tip-ok">nourishing — sub-threshold Ca²⁺ stimulation window (DR 8–50%)\nMembrane intact · PIEZO1 + voltage-gated Ca²⁺ channels activated\nOptimal biomodulation at DR ≈ 20–40% of lysis threshold</span>',
    [CELL_STATE.APPROACHING]: '<span class="tip-warn">⚠ approaching — membrane stress OR T ≥ 42°C · ion channel perturbation onset</span>',
    [CELL_STATE.REV_EP]:      '<span class="tip-warn">⚡ reversible EP window (50–85%) — membrane transiently permeabilized each pulse.\nPores open and re-seal after the field is removed.\nThis is the drug/gene delivery window — cells survive.\nSustained or increasing field progresses to irreversible lysis.</span>',
    [CELL_STATE.CRITICAL]:    '<span class="tip-warn">⚡ critical — Vm >85% threshold OR T ≥ 60°C (protein denaturation) · reduce field / duty cycle immediately</span>',
    [CELL_STATE.VIBRATING]:   '<span class="tip-warn">⚡ LYSIS ARMED — Vm >85% of threshold · irreversible electroporation imminent</span>',
    [CELL_STATE.LYSING]:      '<span class="tip-warn">lysing — irreversible membrane disruption in progress</span>',
    [CELL_STATE.LYSED]:       thermalLysis
      ? '<span class="tip-warn">thermal lysis — cell vaporized (T ≥ 100°C)</span>'
      : '<span class="tip-warn">lysed — membrane permanently disrupted by electric field</span>',
  }
  const transitions = cellType === CELL_TYPE.HEALTHY
    ? `\nElectrical: Vm >50% → approaching · Vm >85% → critical`
       + `\nThermal:   T ≥42°C → approaching · T ≥60°C → critical · T ≥100°C → lysis`
    : `\nElectrical: 50–85% → rev-ep (reversible) · >85% → armed (${lysisTime}) → lysed`
      + `\nThermal:   T ≥60°C → critical · T ≥100°C → instant thermal lysis`
  return `<strong>Cell State</strong>
${labels[cellState] ?? cellState}
${transitions}`
}

export function tipAcousticVm(opts: {
  disruptionRatio: number
  resonantFreqGHz: number
  capsidQ: number
  freqKHz: number
  fieldVcm: number
  experimentalBasis?: string
}): string {
  const { disruptionRatio, resonantFreqGHz, capsidQ, freqKHz, fieldVcm, experimentalBasis } = opts
  const pct = (disruptionRatio * 100).toFixed(0)
  const freqGHz = (freqKHz / 1e6).toFixed(3)
  const basisNote = experimentalBasis === 'speculative'
    ? '\n<span class="tip-warn">⚠ ENVELOPED VIRUS: lipid bilayer has no rigid resonance.\nParameters are theoretical extrapolations — not RF-validated.</span>'
    : experimentalBasis === 'rf-extrapolated'
      ? '\n<span class="tip-note">Acoustic resonance extrapolated from RF data.\nTsen et al. (2007) experiments used femtosecond laser pulses, not RF.\nRF coupling mechanism is the unvalidated extrapolation.</span>'
      : ''
  return `<strong>Acoustic Disruption Ratio (DR)</strong>
Current: <span class="tip-val">${pct}%</span>

Acoustic shell resonance (Lorentzian) model:
  DR = (E / E_thr) × L(f, f_res, Q)
  L(f) = 1/√(1 + Q²·(f/f₀ − f₀/f)²)

f_res: <span class="tip-val">${resonantFreqGHz} GHz</span>  ·  Q: ${capsidQ}
Current f: ${freqGHz} GHz  ·  E: ${fieldVcm.toFixed(0)} V/cm

Schwan Vm ≈ 0 at GHz — capacitive charging
is negligible at these frequencies.
Disruption is via mechanical shell resonance.
Ref: Tsen et al. (2007); Dykeman &amp; Sankey (2010)${basisNote}`
}

export function tipNuclearBar(): string {
  return `<strong>Nuclear Envelope Disruption (Double-Shell Model)</strong>
Vm_nuc / V_threshold_nuc
Bandpass peak at f_peak = 1/(2π√(τ_pm·τ_ne))
Kotnik &amp; Miklavcic (2006, Biophys J 90:480)`
}

export function tipDisruption(opts: {
  disruptionRatio: number
  thresholdVoltage: number
  lysisNPulses: number
  lysisDelayMs: number
  pulseEnvelopeFactor: number
  waveform: string
  chartMode: string
  pulseWidthNs: number
  effectiveSigmaE: number
  vmDisplay: string
  cellType: string
  cell: CellConfig
}): string {
  const {
    disruptionRatio, thresholdVoltage, lysisNPulses, lysisDelayMs,
    pulseEnvelopeFactor, waveform, chartMode, pulseWidthNs,
    effectiveSigmaE, vmDisplay, cellType, cell,
  } = opts
  const pct = (disruptionRatio * 100).toFixed(0)
  const thr = (thresholdVoltage * 1000).toFixed(0)
  const n   = lysisNPulses
  const t   = formatLysisTimeLocal(lysisDelayMs)

  const isResonance = cellType === CELL_TYPE.TARGET && chartMode === CHART_MODE.RESONANCE
  const tau_ns = (computeTau(cell, effectiveSigmaE) * 1e9).toFixed(1)

  const pefNote = (waveform === WAVEFORM.PULSED && pulseEnvelopeFactor < 0.99 && !isResonance)
    ? `\n<span class="tip-note">Pulse factor: ${(pulseEnvelopeFactor * 100).toFixed(1)}% (t_p = ${pulseWidthNs} ns vs τ = ${tau_ns} ns).\nMembrane charges to ${(pulseEnvelopeFactor * 100).toFixed(1)}% of Schwan Vm per pulse.\nEffective threshold is ${(1 / pulseEnvelopeFactor).toFixed(1)}× higher at this pulse width.\nRef: Weaver &amp; Chizmadzhev (1996).</span>`
    : ''

  const revEpNote = (cellType === CELL_TYPE.TARGET && disruptionRatio >= 0.50 && disruptionRatio < 0.85)
    ? `\n<span class="tip-note">Reversible EP window: pores open transiently and re-seal.\nThis is the drug/gene delivery regime — cells survive.\nIncrease field or hold to progress to irreversible lysis.</span>`
    : ''

  const formulaLine = isResonance
    ? 'Ratio = (E / E_thr) × L(f, f_res, Q)  — acoustic Lorentzian'
    : `Ratio = Vm × pulse_factor / lysis threshold\n  Vm = ${vmDisplay}  ·  Threshold = ${thr} mV`

  return `<strong>Membrane Disruption: <span class="tip-val">${pct}%</span></strong>
${formulaLine}

>85% → lysis after ${n} pulses (est. ${t})
100% = at disruption threshold${pefNote}${revEpNote}`
}
