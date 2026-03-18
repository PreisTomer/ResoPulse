// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// Pure export-formatting utilities for experiment log entries.
// No store or Vue imports — all inputs arrive as plain parameters.

import { MEDIA } from '@/constants/media'
import { UNIT } from '@/constants/units'
import { CELL_LABEL } from '@/constants/strings'
import { EPSILON_0 } from '@/utils/physics'
import { TWO_PI } from '@/constants/physics'
import type { MediumKey } from '@/types/media'
import type { CellParamSnapshot, LogEntry } from '@/types/experiment'

// ── Low-level text helpers ─────────────────────────────────────────────────

/** Horizontal rule of `n` repeated `ch` characters. */
export const sep = (ch = '─', n = 54): string => ch.repeat(n)

/** Left-padded key=value field line for methods files. */
export const fld = (label: string, value: string, width = 26): string =>
  `  ${label.padEnd(width)}= ${value}`

/** Trigger a browser download of text content with the given MIME type. */
export function downloadText(txt: string, filename: string, mimeType = 'text/plain'): void {
  const blob = new Blob([txt], { type: mimeType })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// ── Section builders ───────────────────────────────────────────────────────

export function buildHealthySection(h: CellParamSnapshot, isDbl: boolean, mediumName: string): string[] {
  const cm   = (h.dielectricConstant * EPSILON_0 / (h.membraneThickness * 1e-9) * 1e3).toFixed(2)
  const tau  = h.fc > 0 ? (1e6 / (TWO_PI * h.fc)).toFixed(0) : '—'
  const lines: string[] = [
    `Reference (Healthy): ${h.label}`,
    fld('Radius R',               `${h.radius} ${UNIT.UM}`),
    fld('Membrane thickness d',   `${h.membraneThickness} nm`),
    fld('Permittivity εr',        `${h.dielectricConstant}`),
    fld('Conductivity σi',        `${h.conductivity} ${UNIT.S_PER_M}`),
    fld('Membrane capacitance Cm', `${cm} mF/m²  [εr·ε0/d]`),
    fld('Lysis threshold Vm,thr', `${h.thresholdVoltage} ${UNIT.V}`),
    fld('Time constant τ',        `${tau} ${UNIT.NS}  [medium: ${mediumName}]`),
    fld('Corner frequency fc',    `${h.fc.toFixed(0)} ${UNIT.KHZ}  [1/(2πτ)]`),
  ]
  if (isDbl && h.nuclearRadius) {
    lines.push(
      fld('Nuclear radius R_n',     `${h.nuclearRadius} ${UNIT.UM}`),
      fld('Nuclear mem. thickness', `${h.nuclearMembraneThickness ?? 'n/a'} nm`),
      fld('Nuclear mem. εr',        `${h.nuclearMembraneEps ?? 'n/a'}`),
      fld('Nucleoplasm σn',         `${h.nucleoplasmConductivity ?? 'n/a'} ${UNIT.S_PER_M}`),
    )
  }
  return lines
}

export function buildTargetSection(t: CellParamSnapshot, isRes: boolean, isDbl: boolean, mediumName: string): string[] {
  const cm   = (t.dielectricConstant * EPSILON_0 / (t.membraneThickness * 1e-9) * 1e3).toFixed(2)
  const lines: string[] = [
    `Target Cell: ${t.label}  [category: ${t.category}]`,
    fld('Radius R',               `${t.radius} ${UNIT.UM}`),
    fld('Membrane thickness d',   `${t.membraneThickness} nm`),
    fld('Permittivity εr',        `${t.dielectricConstant}`),
    fld('Conductivity σi',        `${t.conductivity} ${UNIT.S_PER_M}`),
    fld('Membrane capacitance Cm', `${cm} mF/m²  [εr·ε0/d]`),
  ]
  if (isRes && t.resonantFreqGHz) {
    const fResGHz  = t.resonantFreqGHz.toFixed(3)
    const fResMHz  = (t.resonantFreqGHz * 1000).toFixed(0)
    const qNominal = t.capsidQ?.toFixed(0) ?? '—'
    const qMin     = t.capsidQMin?.toFixed(0) ?? qNominal
    const qMax     = t.capsidQMax?.toFixed(0) ?? qNominal
    lines.push(
      fld('Resonant frequency f_res', `${fResGHz} GHz  (${fResMHz} MHz)`),
      fld('Quality factor Q',         `${qNominal}  [range: ${qMin}–${qMax}]`),
      fld('Resonant threshold E_thr', `${t.resonantThresholdVcm?.toFixed(0) ?? '—'} ${UNIT.V_PER_CM}`),
      fld('f_res uncertainty',        `±${t.resonantFreqUncertaintyPct?.toFixed(0) ?? '—'}%`),
      fld('Experimental basis',       t.experimentalBasis ?? 'unknown'),
    )
  } else {
    const tau = t.fc > 0 ? (1e6 / (TWO_PI * t.fc)).toFixed(0) : '—'
    lines.push(
      fld('Lysis threshold Vm,thr', `${t.thresholdVoltage} ${UNIT.V}`),
      fld('Time constant τ',        `${tau} ${UNIT.NS}  [medium: ${mediumName}]`),
      fld('Corner frequency fc',    `${t.fc.toFixed(0)} ${UNIT.KHZ}  [1/(2πτ)]`),
    )
  }
  if (isDbl && t.nuclearRadius) {
    lines.push(
      fld('Nuclear radius R_n',     `${t.nuclearRadius} ${UNIT.UM}`),
      fld('Nuclear mem. thickness', `${t.nuclearMembraneThickness ?? 'n/a'} nm`),
      fld('Nuclear mem. εr',        `${t.nuclearMembraneEps ?? 'n/a'}`),
      fld('Nucleoplasm σn',         `${t.nucleoplasmConductivity ?? 'n/a'} ${UNIT.S_PER_M}`),
    )
  }
  if (t.category === 'virus') {
    lines.push(
      '',
      'NOTE (virus): Lorentzian shell model treats viral capsid/envelope as a thin spherical',
      'shell. For enveloped viruses (influenza, SARS-CoV-2), the lipid bilayer is mechanically',
      'distinct from protein capsids. Resonant frequency estimates are highly speculative and',
      'not validated by direct RF inactivation experiments at these frequencies.',
    )
  } else if (t.category === 'bacteria') {
    lines.push(
      '',
      'NOTE (bacteria): Spherical shell approximation applied to a rod-shaped or coccoid',
      'organism. For rod-shaped bacteria, R is the effective radius of equivalent-volume sphere.',
      'Viscoelastic peptidoglycan wall → low Q (Q = 3–4) vs. stiff protein capsids.',
    )
  }
  return lines
}

export function buildModelSection(isRes: boolean, isPulsed: boolean, isDbl: boolean): string[] {
  const lines: string[] = []
  if (isRes) {
    lines.push(
      'Acoustic / mechanical resonance — Lorentzian model (Tsen et al. 2007):',
      '  DR(f) = 1 / √(1 + Q² · (f/f_res − f_res/f)²)',
      '  f_res : fundamental resonant frequency of the capsid shell',
      '  Q     : quality factor (sharpness of resonance)',
      '  Inactivation occurs when DR(f) · E ≥ E_thr',
      '',
      'Healthy cell transmembrane voltage — Schwan equation (Kotnik & Miklavcic 2000):',
      '  Vm(f) = 1.5 · E · R · cos(θ) / √(1 + (ωτ)²)',
      '  τ = R · Cm · (2σe + σi) / (2σe · σi)',
    )
  } else {
    lines.push(
      'Transmembrane voltage — Schwan equation (Kotnik & Miklavcic 2000):',
      '  Vm(f) = 1.5 · E · R · cos(θ) / √(1 + (ωτ)²)',
      '  τ = R · Cm · (2σe + σi) / (2σe · σi)',
      '  Cm = εr · ε0 / d',
    )
  }
  lines.push(
    '',
    'Specific absorption rate (SAR) and thermal model:',
    '  SAR = σi · α² · E² · wf / ρ',
    '  α = 3σe / (2σe + σi)   [internal field correction — Kotnik 2000]',
    '  T_ss = 37 + SAR · dc / (λ · cp)',
    '  λ = 0.02 s⁻¹ (Newton cooling constant)',
  )
  if (isPulsed && !isRes) {
    lines.push(
      '',
      'Pulse charging — pulse envelope factor (Weaver & Chizmadzhev 1996):',
      '  PEF = 1 − exp(−t_p / τ)   [fraction of steady-state Vm reached]',
      '  Effective Vm = Vm(f) · PEF',
      '  At t_p < τ: membrane substantially undercharged (PEF < 0.63)',
      '  At t_p ≥ 3τ: membrane reaches ≥95% plateau (full charging)',
    )
  }
  if (isDbl) {
    lines.push(
      '',
      'Double-shell (nuclear envelope) model (Kotnik & Miklavcic 2006):',
      '  Extends single-shell Schwan model to include nuclear membrane.',
      '  Nuclear Vm exhibits bandpass response; peak near f_n = 1/(2πτ_n)',
      '  τ_n = R_n · Cm_n · (2σcyto + σnucleus) / (2σcyto · σnucleus)',
    )
  }
  if (!isRes) {
    lines.push(
      '',
      'Dielectrophoresis (DEP) — Clausius-Mossotti factor (Gascoyne & Vykoukal 2002):',
      '  F_DEP ∝ ∇|E|² · Re[K(ω)]',
      '  K(ω) = (ε*_eff − ε*_m) / (ε*_eff + 2ε*_m)',
      '  ε*(ω) = ε_r·ε₀ − j·σ/ω   (complex permittivity)',
      '  Single-shell effective permittivity:',
      '    γ = ((R−d)/R)³',
      '    ε*_eff = ε*_mem · [γ(ε*_c + 2ε*_mem) + 2(ε*_c − ε*_mem)]',
      '                     / [γ(ε*_c + 2ε*_mem) − (ε*_c − ε*_mem)]',
      '  Re[K] > 0 → positive DEP (attracted to field maxima)',
      '  Re[K] < 0 → negative DEP (repelled from field maxima)',
      '  Waveform force scale: CW ×0.5 ; pulsed H-FIRE ×duty-cycle',
      '  NOTE: model invalid at GHz acoustic resonance frequencies.',
    )
  }
  return lines
}

export function buildRefs(isRes: boolean, isDbl: boolean, cat: string): string[] {
  const refs: string[] = []
  let i = 1
  refs.push(
    `[${i++}] Kotnik, T. & Miklavcic, D. (2000). Analytical description of transmembrane voltage`,
    '    induced by electric fields on spheroidal cells. Biophys. J. 79(2), 670–679.',
    `[${i++}] Weaver, J.C. & Chizmadzhev, Y.A. (1996). Theory of electroporation: a review.`,
    '    Bioelectrochem. Bioenerg. 41(2), 135–160.',
  )
  if (isDbl) refs.push(
    `[${i++}] Kotnik, T. & Miklavcic, D. (2006). Theoretical evaluation of voltage inducement`,
    '    on internal membranes of biological cells exposed to electric fields.',
    '    Biophys. J. 90(2), 480–491.',
  )
  if (!isRes) {
    refs.push(
      `[${i++}] Gascoyne, P.R.C. & Vykoukal, J. (2002). Particle separation by dielectrophoresis.`,
      '    Electrophoresis 23(13), 1973–1983.',
    )
  }
  if (isRes) {
    refs.push(
      `[${i++}] Tsen, S.W.D. et al. (2007). Non-thermal effects in the inactivation of viruses.`,
      '    J. Phys. D: Appl. Phys. 40(15), 4571–4577.',
      `[${i++}] Dykeman, E.C. & Sankey, O.F. (2008). Low-frequency mechanical modes of viral capsids.`,
      '    Phys. Rev. Lett. 100(2), 028101.',
    )
    if (cat === 'virus') refs.push(
      `[${i++}] Sankey, O.F. et al. (2009). Simulations of the mechanical modes of viral capsids.`,
      '    Proc. Natl. Acad. Sci. USA 106(30), 12347–12352.',
    )
  }
  return refs
}

// ── Full document assemblers ───────────────────────────────────────────────

/**
 * Builds the full methods .txt text for a single log entry.
 * Returns the text and a suggested filename.
 */
export function buildEntryMethodsText(entry: LogEntry, sessionName: string): { text: string; filename: string } {
  const filename = `${sessionName.replace(/\s+/g, '_')}_entry${entry.id}_methods.txt`

  if (!entry.healthySnap || !entry.targetSnap) {
    // Legacy entry — no snapshot
    const medName = entry.medium in MEDIA ? MEDIA[entry.medium as MediumKey].name : entry.medium
    const text = [
      'MATERIALS AND METHODS — ResoPulse',
      sep('═'),
      `Session  : ${sessionName}`,
      `Entry #${entry.id}  logged at ${entry.timestamp}`,
      `Generated: ${new Date().toISOString()}`,
      '',
      'NOTE: This entry was logged before full parameter snapshots were introduced.',
      'Only the values recorded at log time are available.',
      '',
      sep(),
      fld('Target preset',    entry.targetPreset),
      fld('Medium',           medName),
      fld('RF Frequency',     `${entry.freqKHz} ${UNIT.KHZ}`),
      fld('Electric Field E', `${entry.fieldVcm} ${UNIT.V_PER_CM}`),
      fld('Healthy Vm',       `${entry.healthyVm} ${UNIT.MV}`),
      fld('Target Vm',        `${entry.targetVm} ${UNIT.MV}`),
      fld('Selectivity',      `${entry.selectivity}×`),
      fld('Target DR',        `${(entry.targetRatio * 100).toFixed(1)}%`),
      fld('Healthy DR',       `${(entry.healthyRatio * 100).toFixed(1)}%`),
      fld('Target T_ss',      `${entry.targetTemp} ${UNIT.DEG_C}`),
      fld('Event',            entry.event),
      '',
      sep('═'),
      'Generated by ResoPulse — virtual biophysics engine',
    ].join('\n')
    return { text, filename: `entry_${entry.id}_methods.txt` }
  }

  const h         = entry.healthySnap
  const t         = entry.targetSnap
  const isRes     = entry.chartMode === 'resonance'
  const isPulsed  = entry.waveform === 'pulsed'
  const isDbl     = entry.doubleShellEnabled ?? false
  const cat       = t.category
  const medKey    = entry.medium as MediumKey
  const medName   = medKey in MEDIA ? MEDIA[medKey].name : entry.medium
  const sigE      = entry.sigmaE ?? 0
  const cosTheta  = Math.cos((entry.orientationDeg ?? 0) * Math.PI / 180)
  const modelLabel = isRes ? 'Lorentzian resonance model' : 'Schwan model'

  const freqDisplay = entry.freqKHz >= 1e6
    ? `${(entry.freqKHz / 1e6).toFixed(3)} GHz`
    : entry.freqKHz >= 1000
      ? `${(entry.freqKHz / 1000).toFixed(3)} MHz`
      : `${entry.freqKHz} ${UNIT.KHZ}`
  const fieldDisplay = entry.fieldVcm >= 10000
    ? `${(entry.fieldVcm / 1000).toFixed(1)} ${UNIT.KV_PER_CM}`
    : `${entry.fieldVcm} ${UNIT.V_PER_CM}`

  const protocolLines: string[] = [
    fld('Medium',              medName),
    fld('Conductivity σe',     `${sigE.toFixed(3)} ${UNIT.S_PER_M}  [T-corrected at 37°C]`),
    fld('RF Frequency',        freqDisplay),
    fld('Electric Field E',    fieldDisplay),
    fld('Waveform',            `${(entry.waveform ?? 'cw').toUpperCase()}`),
    ...(isPulsed ? [
      fld('Duty cycle dc',     `${((entry.dutyCycle ?? 0) * 100).toExponential(2)}%`),
      fld('Pulse width t_p',   `${entry.pulseWidthNs ?? '—'} ${UNIT.NS}`),
      fld('N-pulses (lysis)',  `${entry.lysisNPulses ?? '—'}`),
    ] : []),
    fld('Cell orientation θ',  `${entry.orientationDeg ?? 0}°  (cos θ = ${cosTheta.toFixed(3)})`),
  ]

  const computedLines: string[] = [
    fld('Healthy Vm',           `${entry.healthyVm} ${UNIT.MV}`),
    fld('Target Vm / DR',       `${entry.targetVm} ${UNIT.MV}  |  ${(entry.targetRatio * 100).toFixed(1)}%  [${modelLabel}]`),
    fld('Healthy DR',           `${(entry.healthyRatio * 100).toFixed(1)}%`),
    fld('Selectivity (TI)',     `${entry.selectivity}×`),
    fld('Healthy T_ss',         `${entry.healthyTemp} ${UNIT.DEG_C}`),
    fld('Target T_ss',          `${entry.targetTemp} ${UNIT.DEG_C}`),
    fld('Event',                entry.event),
  ]
  if (isDbl && entry.healthyNuclearVm !== undefined) {
    computedLines.push(
      fld('Healthy nuclear Vm',  `${entry.healthyNuclearVm} ${UNIT.MV}`),
      fld('Target nuclear Vm',   `${entry.targetNuclearVm ?? '—'} ${UNIT.MV}`),
    )
  }
  if (!isRes && entry.depHealthyK !== undefined) {
    const hXover    = entry.depHealthyCrossoverKHz
    const tXover    = entry.depTargetCrossoverKHz
    const hXoverStr = hXover ? `f_cross = ${hXover.toFixed(1)} ${UNIT.KHZ}` : 'no crossover in range'
    const tXoverStr = tXover ? `f_cross = ${tXover.toFixed(1)} ${UNIT.KHZ}` : 'no crossover in range'
    computedLines.push(
      fld('H Re[K] (DEP)',   `${entry.depHealthyK?.toFixed(4) ?? '—'}  [${entry.depHealthyK != null && entry.depHealthyK > 0 ? 'pDEP' : 'nDEP'}]  ${hXoverStr}`),
      fld('T Re[K] (DEP)',   `${entry.depTargetK?.toFixed(4)  ?? '—'}  [${entry.depTargetK  != null && entry.depTargetK  > 0 ? 'pDEP' : 'nDEP'}]  ${tXoverStr}`),
    )
  }

  const text = [
    'MATERIALS AND METHODS — ResoPulse Electroporation Simulation',
    sep('═'),
    `Session  : ${sessionName}`,
    `Entry    : #${entry.id}  logged at ${entry.timestamp}`,
    `Generated: ${new Date().toISOString()}`,
    `Model    : ${isRes ? 'Acoustic/Mechanical Resonance (Lorentzian)' : 'Transmembrane Voltage (Schwan/IRE)'}`,
    `Target   : ${cat.toUpperCase()} — ${t.label}`,
    '',
    'CELL MODELS',
    sep(),
    ...buildHealthySection(h, isDbl, medName),
    '',
    ...buildTargetSection(t, isRes, isDbl, medName),
    '',
    'EXPOSURE PROTOCOL',
    sep(),
    ...protocolLines,
    '',
    `RESULTS AT LOGGED PARAMETERS  [${modelLabel}]`,
    sep(),
    ...computedLines,
    '',
    'PHYSICAL MODEL',
    sep(),
    ...buildModelSection(isRes, isPulsed, isDbl),
    '',
    'REFERENCES',
    sep(),
    ...buildRefs(isRes, isDbl, cat),
    '',
    sep('═'),
    'Generated by ResoPulse — virtual biophysics engine',
  ].join('\n')

  return { text, filename }
}

/** Cell metadata needed for the CSV header block — passed in by the store action. */
export interface CellExportMeta {
  healthyLabel: string
  healthyRadius: number
  healthyFc: number
  targetLabel: string
  targetRadius: number
  targetFc: number
  medium: string
  effectiveSigmaE: number
  currentBroadcastFrequency: number
  fieldIntensity: number
  waveform: string
  dutyCycle: number
  pulseWidthNs: number
}

/**
 * Builds the full CSV text for the experiment log.
 * Returns the text and a suggested filename.
 */
export function buildCsvText(
  entries: LogEntry[],
  sessionName: string,
  sampleDescription: string,
  sessionNotes: string,
  cell: CellExportMeta,
): { text: string; filename: string } {
  const H = CELL_LABEL.HEALTHY
  const T = CELL_LABEL.TARGET

  const meta = [
    `# Session: ${sessionName}`,
    `# Exported: ${new Date().toISOString()}`,
    ...(sampleDescription ? [`# Sample: ${sampleDescription}`] : []),
    ...(sessionNotes      ? [`# Notes: ${sessionNotes}`]       : []),
    `# Healthy: ${cell.healthyLabel} · R=${cell.healthyRadius} ${UNIT.UM} · fc=${cell.healthyFc.toFixed(0)} ${UNIT.KHZ}`,
    `# Target:  ${cell.targetLabel} · R=${cell.targetRadius} ${UNIT.UM} · fc=${cell.targetFc.toFixed(0)} ${UNIT.KHZ}`,
    `# Medium: ${cell.medium} · σ_e=${cell.effectiveSigmaE.toFixed(3)} ${UNIT.S_PER_M}`,
    `# Field: ${cell.currentBroadcastFrequency} ${UNIT.KHZ} · ${cell.fieldIntensity} ${UNIT.V_PER_CM} · ${cell.waveform} · dc=${cell.dutyCycle.toExponential(2)} · pw=${cell.pulseWidthNs} ${UNIT.NS}`,
    `# Model: Schwan equation (Kotnik & Miklavcic 2000) — ResoPulse`,
  ].join('\n')

  const headers = [
    '#', 'Time', 'Session',
    `Freq (${UNIT.KHZ})`, `Field (${UNIT.V_PER_CM})`, 'Medium', 'Target',
    `${H}-Vm (${UNIT.MV})`, `${T}-Vm (${UNIT.MV})`, 'Selectivity',
    `${H}-Ratio`, `${T}-Ratio`,
    `${H}-Temp (${UNIT.DEG_C})`, `${T}-Temp (${UNIT.DEG_C})`,
    `${H}-Re[K]`, `${T}-Re[K]`,
    `${H}-f_cross (${UNIT.KHZ})`, `${T}-f_cross (${UNIT.KHZ})`,
    'Event',
  ]
  const rows = entries.map((e) => [
    e.id, e.timestamp, sessionName, e.freqKHz, e.fieldVcm, e.medium, e.targetPreset,
    e.healthyVm, e.targetVm, e.selectivity,
    (e.healthyRatio * 100).toFixed(1) + UNIT.PERCENT,
    (e.targetRatio  * 100).toFixed(1) + UNIT.PERCENT,
    e.healthyTemp, e.targetTemp,
    e.depHealthyK ?? '—', e.depTargetK ?? '—',
    e.depHealthyCrossoverKHz ?? '—', e.depTargetCrossoverKHz ?? '—',
    e.event,
  ])

  const text = meta + '\n' + [headers, ...rows].map((row) => row.join(',')).join('\n')
  const filename = `${sessionName.replace(/\s+/g, '_')}_${Date.now()}.csv`
  return { text, filename }
}
