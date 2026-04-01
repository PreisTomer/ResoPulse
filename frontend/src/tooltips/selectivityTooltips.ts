// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// Selectivity-panel tooltip builders. Pure — no store access.
import { ICON } from '@/constants/icons'
import { THRESHOLDS, DEFAULT_CAPSID_Q } from '@/constants/physics'
import { CELL_CATEGORY } from '@/constants/strings'
import { formatFreqKHz } from '@/utils/format'

export function tipTiRange(params: {
  low: number
  high: number
  uncH: string
  uncT: string
}): string {
  const { low, high, uncH, uncT } = params
  const highStr = high >= 99 ? '∞' : high.toFixed(2)
  return `<strong>TI Uncertainty from σ_i Variability</strong>
TI_low  = ×${low.toFixed(2)} (worst case: target σ_i at −${uncT}, healthy at +${uncH})
TI_high = ×${highStr} (best case: target σ_i at +${uncT}, healthy at −${uncH})

σ_i (cytoplasm conductivity) is a literature range, not a single measured value.
Variability: healthy (±${uncH}) · target (±${uncT})
These bounds propagate through τ → fc → Vm → DR → TI.

<span class="tip-note">A wide uncertainty band means the TI claim depends strongly on
the exact σ_i value used. Validate with measured cell impedance (patch clamp / DEP).</span>`
}

export function tipSelectivity(params: {
  sel: number
  vmSel: number
  isResonanceTarget: boolean
  tiDc: number
  tiHighFreqLimit: number
  targetLabel: string
  healthyLabel: string
}): string {
  const { sel, vmSel, isResonanceTarget, tiDc, tiHighFreqLimit, targetLabel, healthyLabel } = params
  const { SEL_STRONG: ss, SEL_MARGINAL: sm } = THRESHOLDS
  const quality = sel >= ss
    ? '<span class="tip-ok">Strong selectivity window</span>'
    : sel >= sm
      ? '<span class="tip-warn">Marginal window, adjust field or preset</span>'
      : '<span class="tip-warn">Non-selective, healthy cells equally at risk</span>'
  const selStr = sel >= 99 ? ICON.INFINITY : sel.toFixed(2)
  if (isResonanceTarget) {
    return `<strong>Selectivity Index (TI) = Target / Healthy disruption ratio</strong>
Current: <span class="tip-val">×${selStr}</span>

${quality}
≥ ${ss} → strong window (green)  ·  < ${sm} → non-selective (red)

<strong>Resonance mode selectivity:</strong>
Mammalian cells lack rigid-shell resonance, Schwan Vm → 0 at GHz (ωτ ≫ 1).
At f_res(target), healthy disruption ≈ 0 → TI → ∞

<span class="tip-ok">Frequency-selective, healthy tissue unperturbed at GHz fields</span>
Ref: Tsen et al. (2007); Dykeman &amp; Sankey (2008)
<span class="tip-warn">${ICON.WARNING} Enveloped viruses (Influenza, SARS-CoV-2): lipid envelope has no rigid-shell resonance (Q≈1). f_res/Q/E_thr values are theoretical extrapolations, not experimentally validated.</span>`
  }
  const vmStr    = vmSel >= 99 ? ICON.INFINITY : vmSel.toFixed(2)
  const tiDcStr  = tiDc  >= 99 ? ICON.INFINITY : tiDc.toFixed(2)
  const tiHfStr  = tiHighFreqLimit.toFixed(2)
  const tiHfNote = tiHighFreqLimit < 1.0
    ? `<span class="tip-warn"> (sub-unity — counter-selective at high f)</span>`
    : tiHighFreqLimit < 1.5 ? ` (marginal at high f)` : ''
  return `<strong>Selectivity Index (TI) = (Vm_T/Vth_T) / (Vm_H/Vth_H)</strong>
Current: <span class="tip-val">×${selStr}</span>  ·  ${targetLabel} vs ${healthyLabel}

${quality}
≥ ${ss} → strong window (green)
${sm} - ${ss} → marginal (amber)
< ${sm} → non-selective (red)

TI bounds for current pair:
  Quasi-DC ceiling:   ×${tiDcStr}  = (R_T·Vth_H)/(R_H·Vth_T)
  High-f limit:       ×${tiHfStr}${tiHfNote}

<strong>Raw Vm ratio</strong> = Vm_T / Vm_H (current frequency)
Current: <span class="tip-val">×${vmStr}</span>
TI incorporates lysis thresholds, more predictive for protocol selectivity than Vm ratio alone.`
}

export function tipCmpTitle(title: string, body: string): string {
  return `<strong>${title}</strong>\n${body}`
}

export function tipCmpRow(params: {
  label: string
  notes: string
  tVmMv: string
  sel: number
  hasRes: boolean
  disrLabel: string
  selLabel: string
  clickHint: string
  counterSelectiveNote: string
  unit: string
}): string {
  const { label, notes, tVmMv, sel, hasRes, disrLabel, selLabel, clickHint, counterSelectiveNote, unit } = params
  const selStr = sel >= 99 ? ICON.INFINITY : sel.toFixed(2)
  const vmPart = hasRes
    ? `${disrLabel} = <span class='tip-val'>${tVmMv}</span>`
    : `Vm = <span class='tip-val'>${tVmMv} ${unit}</span>`
  return `<strong>${label}</strong>\n${notes}\n${vmPart}  ·  ${selLabel} = <span class='tip-val'>×${selStr}</span>${counterSelectiveNote}${clickHint}`
}

export function tipSmallCellNote(params: {
  rT: number
  rH: number
  vthT: number
  vthH: number
}): string {
  const { rT, rH, vthT, vthH } = params
  const tiDc = (rT * vthH) / (rH * vthT)
  return `<strong>Size Disadvantage: Target R &lt; Healthy R</strong>
At quasi-DC, Vm = 1.5·E·R·cosθ (geometric only).
TI limit = (R_T/R_H) × (Vth_H/Vth_T) = ${tiDc.toFixed(2)}
A smaller target cannot be selectively lysed by field strength alone
if TI_limit &lt; 1.0. Frequency tuning (f ≈ fc_T) recovers partial selectivity
via τ differences, but the upper bound is (R_T·τ_H)/(R_H·τ_T).
Consider: different healthy reference, H-FIRE (threshold gap), or
a frequency between fc_H and fc_T if τ values differ sufficiently.`
}

export function tipOptimal(params: {
  isResonanceTarget: boolean
  resonantFreqGHz?: number
  resonantThresholdVcm?: number
  capsidQ?: number
  optKhz: number
  optSel: number
  beyondRange: boolean
  tiHighFreqLimit: number
  healthyRadius: number
  healthyLabel: string
  targetCategory: string
  targetFcDisplay: string
}): string {
  const { isResonanceTarget, resonantFreqGHz, resonantThresholdVcm, capsidQ, optKhz, optSel, beyondRange, tiHighFreqLimit, healthyRadius, healthyLabel, targetCategory, targetFcDisplay } = params
  if (isResonanceTarget) {
    const label = formatFreqKHz((resonantFreqGHz ?? 0) * 1e6)
    const rStr  = healthyRadius >= 1 ? `${healthyRadius.toFixed(1)} µm` : `${(healthyRadius * 1000).toFixed(0)} nm`
    return `<strong>Resonant Frequency: f_res = ${label}</strong>
Acoustic/mechanical resonance: disruption ratio peaks at 1.0 at f_res.
Lorentzian lineshape L(f) = 1 / √(1 + (Q·(f/f₀ − f₀/f))²)

E_threshold = ${resonantThresholdVcm} V/cm  ·  Q = ${capsidQ ?? DEFAULT_CAPSID_Q}
${healthyLabel} (R = ${rStr}) has no GHz resonance → selectivity → ${ICON.INFINITY}

<span class="tip-ok">Click to snap cursor to f_res</span>
Ref: Tsen et al. (2007); Dykeman &amp; Sankey (2008)
<span class="tip-warn">${ICON.WARNING} Enveloped viruses (Influenza, SARS-CoV-2): lipid envelope, no rigid-shell resonance. Extrapolated values only.</span>`
  }
  const label  = formatFreqKHz(optKhz)
  const cls    = optSel >= THRESHOLDS.TI_STRONG ? 'tip-ok' : optSel >= THRESHOLDS.TI_MARGINAL ? 'tip-val' : 'tip-warn'
  const snapNote = beyondRange
    ? `<span class="tip-warn">${ICON.WARNING} Optimal lies outside the current slider range.\n  Snap sets frequency to the nearest reachable bound.</span>`
    : `<span class="tip-ok">Click to snap cursor to this frequency</span>`
  return `<strong>Optimal Broadcast Frequency (Schwan mode)</strong>
Scanned 300 log-spaced points from 10 kHz → 500 MHz.
Maximises target / healthy disruption ratio at current field and medium.

Peak: <span class="${cls}">${label} · ×${optSel.toFixed(2)}</span>
${snapNote}

Physics:
  f ≪ fc_T and fc_H : sel = (R_T·Vth_H)/(R_H·Vth_T)  (quasi-DC ceiling)
  When τ_T > τ_H (target larger/higher Cm): sel decreases above fc(T), target rolls off first
  f ≫ fc_H : sel → (R_T·τ_H·Vth_H)/(R_H·τ_T·Vth_T) = ×${tiHighFreqLimit.toFixed(2)} at current pair${targetCategory === CELL_CATEGORY.VIRUS ? `\n<span class="tip-note">Virion fc(T) = ${targetFcDisplay} (σ_i-limited). Schwan model is an approximation for virions; fc may be inaccessible in practice.</span>` : ''}`
}
