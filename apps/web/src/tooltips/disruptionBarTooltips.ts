// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Disruption-bar tooltip builders. Pure — no store access.
import { ICON } from '@/constants/icons'
import { THRESHOLDS } from '@/constants/physics'

export function tipTargetPlysis(lysisTime: string): string {
  return `<strong>P(electroporation)</strong>
Sigmoid probability centered at 100% disruption threshold.
P = 1 / (1 + e^−((ratio−1.0)/0.05))
≥50% → lysis likely if held for ${lysisTime}`
}

export function tipHealthyPlysis(): string {
  return `<strong>P(electroporation), Healthy</strong>
Sigmoid probability centered at 100% disruption threshold.
Keep this value near 0% for a selective lysis protocol`
}

export function tipNuclearSection(params: {
  targetLabel: string
  healthyLabel: string
  targetFpeakKHz: number
  healthyFpeakKHz: number
  hasTargetNucleus: boolean
  hasHealthyNucleus: boolean
}): string {
  const { targetLabel, healthyLabel, targetFpeakKHz, healthyFpeakKHz, hasTargetNucleus, hasHealthyNucleus } = params
  const fmtMhz = (khz: number) => khz >= 1000 ? `${(khz / 1000).toFixed(2)} MHz` : `${khz.toFixed(0)} kHz`
  const peakT = hasTargetNucleus  ? `  fc(T, nuc) = <span class="tip-val">${fmtMhz(targetFpeakKHz)}</span>  (${targetLabel})` : `  ${targetLabel}: no nuclear params`
  const peakH = hasHealthyNucleus ? `  fc(H, nuc) = <span class="tip-val">${fmtMhz(healthyFpeakKHz)}</span>  (${healthyLabel})` : `  ${healthyLabel}: no nuclear params`
  return `<strong>Nuclear Envelope Disruption (Double-Shell Model)</strong>
Vm_nuc / V_threshold_nuc for each cell.
Bandpass peak at f_peak = 1/(2π√(τ_pm·τ_ne)):
${peakT}
${peakH}
Cancer nuclei have thinner/leakier NE and lower thresholds → higher disruption ratio.
Kotnik &amp; Miklavcic, Biophys. J. 90:480 (2006)`
}

export function tipTargetBar(params: {
  pct: string
  isResonanceTarget: boolean
  resonantThresholdVcm?: number
  resonantFreqGHz?: number
  targetVmMv: string
  thresholdMv: string
  lysisTime: string
  targetRatio: number
}): string {
  const { pct, isResonanceTarget, resonantThresholdVcm, resonantFreqGHz, targetVmMv, thresholdMv, lysisTime, targetRatio } = params
  const warn = targetRatio >= THRESHOLDS.DISRUPTION_WARN
    ? `\n<span class="tip-warn">${ICON.LIGHTNING} >85%, disruption countdown active (${lysisTime})</span>`
    : ''
  if (isResonanceTarget) {
    return `<strong>Target resonant disruption: <span class="tip-val">${pct}%</span></strong>
Disruption ratio = (E / E_threshold) × L(f, f_res, Q)
E_threshold = ${resonantThresholdVcm} V/cm  ·  f_res = ${resonantFreqGHz} GHz${warn}
≥100% → capsid/cell-wall disruption threshold exceeded`
  }
  return `<strong>Target membrane disruption: <span class="tip-val">${pct}%</span></strong>
Induced Vm = <span class="tip-val">${targetVmMv} mV</span>
Lysis threshold = ${thresholdMv} mV
Ratio = (Vm × PEF) / threshold${warn}
>85% held for ${lysisTime} → irreversible lysis`
}

export function tipHealthyBar(params: {
  pct: string
  isResonanceTarget: boolean
  healthyVmMv: string
  thresholdMv: string
  healthyRatio: number
}): string {
  const { pct, isResonanceTarget, healthyVmMv, thresholdMv, healthyRatio } = params
  if (isResonanceTarget) {
    return `<strong>Healthy cell: <span class="tip-val">${pct}% disruption (≈0)</span></strong>
Mammalian cells lack rigid-shell resonance, Schwan Vm → 0 at GHz (ωτ ≫ 1).
No membrane coupling at pathogen-targeting frequencies.
<span class="tip-ok">${ICON.CHECK} Frequency-selective, healthy tissue unperturbed</span>
Ref: Tsen et al. (2007)`
  }
  const status = healthyRatio < THRESHOLDS.HEALTHY_APPROACHING
    ? `\n<span class="tip-ok">${ICON.CHECK} Healthy cells are safe</span>`
    : `\n<span class="tip-warn">${ICON.WARNING} Approaching threshold, reduce field</span>`
  return `<strong>Healthy membrane disruption: <span class="tip-val">${pct}%</span></strong>
Induced Vm = <span class="tip-val">${healthyVmMv} mV</span>
Lysis threshold = ${thresholdMv} mV
Ratio = (Vm × PEF) / threshold
Keep below 50% for selectivity window${status}`
}
