// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Paper-ready manuscript bundle. Builds Markdown, JSON, and residuals-only CSV from a session's log entries plus the active calibration state. The same structured payload feeds all three formats — only the rendering differs.

import type { CellCalibration } from '@/stores/cellCalibrationStore'

import { downloadText } from '@/utils/experimentExport'
import { formatFreqKHz } from '@/utils/format'

import type { EntryResidual } from '@/stores/experimentStore'
import type { CellConfig } from '@/types/cell'
import type { LogEntry } from '@/types/experiment'

const SCHEMA_VERSION = '1.0.0'
const APP_NAME       = 'SimBiotix'

// ── Public types ────────────────────────────────────────────────────────────

export type ManuscriptScopeType = 'session' | 'all'

export interface ManuscriptScope {
  type:        ManuscriptScopeType
  sessionName: string                  // active session name (used for filename + label)
}

// Live cell-pair + protocol context. The Reports view assembles this from cellStore at export time so the bundle reflects what the user is actually looking at.
export interface ManuscriptCellContext {
  healthy:                 CellConfig
  target:                  CellConfig
  medium:                  string
  effectiveSigmaE:         number
  fieldIntensity:          number
  currentBroadcastFrequency: number
  waveform:                string
  dutyCycle:               number
  pulseWidthNs:            number
  orientationDeg:          number
  chartMode:               'schwan' | 'resonance'
}

export interface ManuscriptCalibrationContext {
  // All calibration rows for the active org, keyed by (cellPresetId, mode).
  calibrations:        CellCalibration[]
  // Tier-and-residual summary (already computed by experimentStore).
  summary: {
    tier:                   string
    sampleCount:            number
    rmseResidualPct:        number | null
    meanTargetResidualPct:  number | null
    meanHealthyResidualPct: number | null
    meanFieldResidualVcm:   number | null
  }
}

export interface ManuscriptInput {
  entries:        LogEntry[]
  residuals:      EntryResidual[]
  scope:          ManuscriptScope
  cell:           ManuscriptCellContext
  calibration:    ManuscriptCalibrationContext
  generatedAt?:   string                  // ISO timestamp; defaults to Date.now()
}

// ── Scope filtering ─────────────────────────────────────────────────────────

export function filterEntriesByScope(entries: LogEntry[], scope: ManuscriptScope): LogEntry[] {
  if (scope.type === 'all') return entries
  return entries.filter(e => (e.sessionName ?? scope.sessionName) === scope.sessionName)
}

export function filterResidualsByScope(residuals: EntryResidual[], scope: ManuscriptScope): EntryResidual[] {
  if (scope.type === 'all') return residuals
  return residuals.filter(r => (r.sessionName ?? scope.sessionName) === scope.sessionName)
}

// ── Filename helpers ────────────────────────────────────────────────────────

function safe(s: string): string { return s.replace(/\s+/g, '_').replace(/[^A-Za-z0-9_-]/g, '') }

export function manuscriptFilename(scope: ManuscriptScope, ext: 'md' | 'json' | 'csv'): string {
  const tag = scope.type === 'all' ? 'all-sessions' : safe(scope.sessionName || 'session')
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').replace(/T/, '_').replace(/Z$/, 'Z')
  return `simbiotix_${tag}_${stamp}.${ext}`
}

// ── Markdown builder ────────────────────────────────────────────────────────

function fmtFreqKhz(khz: number): string { return formatFreqKHz(khz) }

function fmtField(vcm: number): string {
  return vcm >= 10000 ? `${(vcm / 1000).toFixed(1)} kV/cm` : `${vcm.toFixed(0)} V/cm`
}

function fmtPct(v: number | null | undefined, digits = 1): string {
  return v === null || v === undefined ? '—' : `${v.toFixed(digits)}`
}

function calForPreset(calibrations: CellCalibration[], presetId: string, mode: 'schwan' | 'resonance'): CellCalibration | undefined {
  return calibrations.find(c => c.cellPresetId === presetId && c.mode === mode)
}

function calibrationLine(c: CellCalibration | undefined): string {
  if (!c) return '_no calibration row — running on literature baseline_'
  const sd1 = Math.sqrt(Math.max(0, c.cov11)).toFixed(3)
  const sd2 = Math.sqrt(Math.max(0, c.cov22)).toFixed(3)
  const flags: string[] = []
  if (c.param1Clamped) flags.push('param1 clamped')
  if (c.param2Clamped) flags.push('param2 clamped')
  if (c.param1Unident) flags.push('param1 unidentifiable (pinned at 1.0)')
  if (c.param2Unident) flags.push('param2 unidentifiable (pinned at 1.0)')
  const flagText = flags.length ? ` · ${flags.join(', ')}` : ''
  return `param1 ×${c.param1Mult.toFixed(3)} ± ${sd1} · param2 ×${c.param2Mult.toFixed(3)} ± ${sd2} · residualStd ${c.residualStd.toFixed(4)} · n=${c.nSamples}${flagText}`
}

export function buildManuscriptMarkdown(input: ManuscriptInput): string {
  const { entries, residuals, scope, cell, calibration } = input
  const generatedAt = input.generatedAt ?? new Date().toISOString()
  const scopedEntries   = filterEntriesByScope(entries, scope)
  const scopedResiduals = filterResidualsByScope(residuals, scope)
  const measuredOnly    = scopedResiduals.filter(r =>
    r.targetResidualPct !== null || r.healthyResidualPct !== null || r.fieldResidualVcm !== null
  )

  const hCal = calForPreset(calibration.calibrations, cell.healthy.id, 'schwan')
  const tCalSchwan    = calForPreset(calibration.calibrations, cell.target.id,  'schwan')
  const tCalResonance = calForPreset(calibration.calibrations, cell.target.id,  'resonance')

  const lines: string[] = []

  lines.push(`# ${APP_NAME} Manuscript Bundle`)
  lines.push('')
  lines.push(`- **Scope**: ${scope.type === 'all' ? 'all sessions' : `session "${scope.sessionName}"`}`)
  lines.push(`- **Generated**: ${generatedAt}`)
  lines.push(`- **Schema**: ${SCHEMA_VERSION}`)
  lines.push(`- **Entries**: ${scopedEntries.length} (of which ${measuredOnly.length} have a measured outcome)`)
  lines.push('')

  // Cell pair
  lines.push('## Cell pair')
  lines.push('')
  lines.push('| Parameter | Healthy | Target |')
  lines.push('|---|---|---|')
  lines.push(`| Label | ${cell.healthy.label} | ${cell.target.label} |`)
  lines.push(`| Preset id | \`${cell.healthy.id}\` | \`${cell.target.id}\` |`)
  lines.push(`| Radius (µm) | ${cell.healthy.radius} | ${cell.target.radius} |`)
  lines.push(`| Membrane thickness (nm) | ${cell.healthy.membraneThickness} | ${cell.target.membraneThickness} |`)
  lines.push(`| Dielectric ε_r | ${cell.healthy.dielectricConstant} | ${cell.target.dielectricConstant} |`)
  lines.push(`| Cytoplasm σ_i (S/m, baseline) | ${cell.healthy.conductivity} | ${cell.target.conductivity} |`)
  lines.push(`| EP threshold V_th (V, baseline) | ${cell.healthy.thresholdVoltage} | ${cell.target.thresholdVoltage} |`)
  if (cell.target.resonantFreqGHz || cell.target.capsidQ) {
    lines.push(`| Resonant freq (GHz, baseline) | — | ${cell.target.resonantFreqGHz ?? '—'} |`)
    lines.push(`| Capsid Q (baseline) | — | ${cell.target.capsidQ ?? '—'} |`)
    lines.push(`| Acoustic threshold V_thr (V/cm, baseline) | — | ${cell.target.resonantThresholdVcm ?? '—'} |`)
  }
  lines.push('')

  // Protocol
  lines.push('## Protocol')
  lines.push('')
  lines.push(`- **Mode**: ${cell.chartMode === 'resonance' ? 'Acoustic Resonance' : 'Schwan / IRE'}`)
  lines.push(`- **Medium**: \`${cell.medium}\` (effective σ_e = ${cell.effectiveSigmaE.toFixed(4)} S/m)`)
  lines.push(`- **Frequency**: ${fmtFreqKhz(cell.currentBroadcastFrequency)}`)
  lines.push(`- **Field**: ${fmtField(cell.fieldIntensity)}`)
  lines.push(`- **Waveform**: ${cell.waveform.toUpperCase()}`)
  if (cell.waveform !== 'cw') {
    lines.push(`- **Duty cycle**: ${(cell.dutyCycle * 100).toFixed(3)} %`)
    lines.push(`- **Pulse width**: ${cell.pulseWidthNs} ns`)
  }
  lines.push(`- **Orientation θ**: ${cell.orientationDeg}° (cos θ = ${Math.abs(Math.cos(cell.orientationDeg * Math.PI / 180)).toFixed(3)})`)
  lines.push('')

  // Closed-loop calibration state
  lines.push('## Closed-loop calibration state')
  lines.push('')
  lines.push(`Aggregate residual tier across **${calibration.summary.sampleCount}** measured entries: **${calibration.summary.tier}**`)
  if (calibration.summary.rmseResidualPct !== null) {
    lines.push(`- RMSE of |Δ lysis|: ${calibration.summary.rmseResidualPct.toFixed(2)} pp`)
  }
  if (calibration.summary.meanTargetResidualPct !== null) {
    lines.push(`- Mean target lysis residual: ${calibration.summary.meanTargetResidualPct.toFixed(2)} pp`)
  }
  if (calibration.summary.meanHealthyResidualPct !== null) {
    lines.push(`- Mean healthy lysis residual: ${calibration.summary.meanHealthyResidualPct.toFixed(2)} pp`)
  }
  if (calibration.summary.meanFieldResidualVcm !== null) {
    lines.push(`- Mean field residual (measured − slider): ${calibration.summary.meanFieldResidualVcm.toFixed(1)} V/cm`)
  }
  lines.push('')

  lines.push('### Per-cell physics-inversion fits')
  lines.push('')
  lines.push(`- **Healthy (Schwan)** — \`${cell.healthy.id}\`: ${calibrationLine(hCal)}`)
  lines.push(`  param1 = σᵢ multiplier, param2 = Vₜₕ multiplier`)
  lines.push(`- **Target (Schwan)** — \`${cell.target.id}\`: ${calibrationLine(tCalSchwan)}`)
  lines.push(`  param1 = σᵢ multiplier, param2 = Vₜₕ multiplier`)
  if (tCalResonance || cell.target.resonantFreqGHz) {
    lines.push(`- **Target (Resonance)** — \`${cell.target.id}\`: ${calibrationLine(tCalResonance)}`)
    lines.push(`  param1 = Q multiplier, param2 = Vₜₕᵣₑₛ multiplier`)
  }
  lines.push('')

  // Methods narrative
  lines.push('## Methods')
  lines.push('')
  lines.push(buildMethodsNarrative(cell, !!hCal || !!tCalSchwan || !!tCalResonance))
  lines.push('')

  // Predicted-vs-measured table
  if (measuredOnly.length > 0) {
    lines.push('## Predicted vs measured')
    lines.push('')
    lines.push('| Entry # | Time | Freq | Field (V/cm) | Pred DR_T | Meas T-lysis | Δ T (pp) | Pred DR_H | Meas H-lysis | Δ H (pp) | Δ Field (V/cm) |')
    lines.push('|---|---|---|---|---|---|---|---|---|---|---|')
    const byId = new Map(scopedEntries.map(e => [e.id, e]))
    for (const r of measuredOnly) {
      const e = byId.get(r.entryId)
      if (!e) continue
      const measT = e.measured?.targetLysisPct
      const measH = e.measured?.healthyLysisPct
      const measF = e.measured?.actualFieldVcm
      lines.push([
        `| #${r.entryId}`,
        r.timestamp,
        fmtFreqKhz(e.freqKHz),
        e.fieldVcm.toFixed(0),
        (e.targetRatio * 100).toFixed(1) + '%',
        measT !== undefined ? `${measT.toFixed(1)}%` : '—',
        fmtPct(r.targetResidualPct),
        (e.healthyRatio * 100).toFixed(1) + '%',
        measH !== undefined ? `${measH.toFixed(1)}%` : '—',
        fmtPct(r.healthyResidualPct),
        measF !== undefined ? fmtPct(r.fieldResidualVcm, 0) : '—',
      ].join(' | ') + ' |')
    }
    lines.push('')
  }

  // References
  lines.push('## References')
  lines.push('')
  for (const ref of buildReferenceList(cell)) lines.push(`- ${ref}`)
  lines.push('')

  lines.push('---')
  lines.push(`Generated by ${APP_NAME} — Closed-Loop Electroporation Digital Twin.`)
  lines.push('Every value above is a model prediction unless explicitly labelled "measured". Calibration multipliers are fitted from the lab\'s own bench measurements via two-parameter physics inversion; covariances are post-fit (JᵀJ)⁻¹·σ²res on the multiplier scale.')

  return lines.join('\n')
}

// ── Methods narrative ───────────────────────────────────────────────────────

function buildMethodsNarrative(cell: ManuscriptCellContext, anyCalibration: boolean): string {
  const lines: string[] = []
  lines.push('Predictions in this bundle were computed by the SimBiotix simulator using the following peer-reviewed forward physics:')
  lines.push('')
  lines.push('- Transmembrane potential V_m(f) was computed via the Schwan single-shell model (Kotnik & Miklavčič 2000) with τ = R·C_m·(2σ_e + σ_i)/(2σ_e·σ_i) and C_m = ε_r·ε₀/d.')
  lines.push('- The disruption ratio DR = V_m·pef / (V_th_eff·hfire_mult), with pef the single-pulse RC envelope (1 − exp(−t_p/τ)), V_th_eff temperature-corrected and electrosensitization-discounted (N^(−0.20); Weaver & Chizmadzhev 1996, Pakhomov 2007).')
  if (cell.chartMode === 'resonance') {
    lines.push('- For the active resonance-mode target, capsid disruption uses the Lorentzian lineshape DR = (E/V_thr)·1/√(1 + (Q·(f/f₀ − f₀/f))²) (Tsen 2007; Dykeman & Sankey 2010).')
  }
  lines.push('- Specific absorption rate SAR = σ_i·α²·E²·w_f/ρ with α = 3σ_e/(2σ_e + σ_i) (Foster & Schwan 1989).')
  lines.push('- Steady-state temperature follows a 0-D lumped thermal balance with a Pennes-style perfusion sink: T_ss = T_amb + SAR·dc / (λ·c_p), where λ = U·A / (ρ·V·c_p) is derived from cuvette geometry. This is an in-vitro well-mixed-cuvette approximation; the full Pennes PDE is out of scope for this work.')
  lines.push('')
  if (anyCalibration) {
    lines.push('A two-parameter physics-inversion calibration was performed for the cell preset(s) above. The simulator inverts its own forward DR on each measured row to recover (σ_i_mult, V_th_mult) on the Schwan path or (Q_mult, V_thr_mult) on the resonance path via Levenberg-Marquardt least-squares with category-specific physiological bounds and MAD-based outlier rejection. The post-fit 2×2 parameter covariance (JᵀJ)⁻¹·σ²res propagates through forward Jacobians into the Vm and TI uncertainty bands shown in the simulator. Cells where (JᵀJ) was ill-conditioned have one parameter pinned at 1.0 and are flagged "unidentifiable" — additional measurements at varied frequencies or fields are needed to separate the two parameters.')
  } else {
    lines.push('No calibration fit was applied at the time of generation; all predictions use literature baseline parameters and the radius-based σ_i uncertainty prior (mammalian ±20%, bacteria ±35%, virus ±45%).')
  }
  lines.push('')
  lines.push('Selectivity (Therapeutic Index, TI) is reported as DR_T / DR_H. Uncertainty bands on TI use Jacobian propagation: σ²_TI = (J_T/DR_H)·Σ_T·(J_T/DR_H)ᵀ + (−DR_T/DR_H²·J_H)·Σ_H·(−DR_T/DR_H²·J_H)ᵀ where Σ_X is the post-fit 2×2 parameter covariance for cell X.')
  return lines.join('\n')
}

// ── References ──────────────────────────────────────────────────────────────

function buildReferenceList(cell: ManuscriptCellContext): string[] {
  const refs: string[] = [
    'Kotnik T., Miklavčič D. (2000). *Analytical description of transmembrane voltage induced by electric fields on spheroidal cells.* Biophys. J. 79:670–679.',
    'Weaver J.C., Chizmadzhev Y.A. (1996). *Theory of electroporation: a review.* Bioelectrochem. Bioenerg. 41:135–160.',
    'Foster K.R., Schwan H.P. (1989). *Dielectric properties of tissues and biological materials: a critical review.* CRC Crit. Rev. Biomed. Eng. 17:25–104.',
    'Pennes H.H. (1948). *Analysis of tissue and arterial blood temperatures in the resting human forearm.* J. Appl. Physiol. 1:93–122.',
    'Pakhomov A.G., et al. (2007). *Long-lasting plasma membrane permeabilization in mammalian cells by nanosecond pulsed electric field (nsPEF).* Bioelectromagnetics 28:655–663.',
  ]
  if (cell.chartMode === 'resonance') {
    refs.push('Tsen K.T., et al. (2007). *Inactivation of viruses with a very low power visible femtosecond laser via impulsive stimulated Raman scattering.* J. Phys. Condens. Matter 19:472201.')
    refs.push('Dykeman E.C., Sankey O.F. (2010). *Atomistic modeling of the low-frequency mechanical modes and Raman spectra of icosahedral virus capsids.* Phys. Rev. E 81:021918.')
  }
  if (cell.target.nuclearRadius || cell.healthy.nuclearRadius) {
    refs.push('Kotnik T., Miklavčič D. (2006). *Theoretical evaluation of voltage inducement on internal membranes of biological cells exposed to electric fields.* Biophys. J. 90:480–491.')
  }
  return refs
}

// ── JSON builder ────────────────────────────────────────────────────────────

export function buildManuscriptJson(input: ManuscriptInput): object {
  const { entries, residuals, scope, cell, calibration } = input
  const generatedAt = input.generatedAt ?? new Date().toISOString()
  const scopedEntries   = filterEntriesByScope(entries, scope)
  const scopedResiduals = filterResidualsByScope(residuals, scope)
  return {
    schema:      SCHEMA_VERSION,
    app:         APP_NAME,
    generatedAt,
    scope,
    cell: {
      healthy: { ...cell.healthy },
      target:  { ...cell.target  },
      protocol: {
        medium:                    cell.medium,
        effectiveSigmaE:           cell.effectiveSigmaE,
        currentBroadcastFrequency: cell.currentBroadcastFrequency,
        fieldIntensity:            cell.fieldIntensity,
        waveform:                  cell.waveform,
        dutyCycle:                 cell.dutyCycle,
        pulseWidthNs:              cell.pulseWidthNs,
        orientationDeg:            cell.orientationDeg,
        chartMode:                 cell.chartMode,
      },
    },
    calibration: {
      summary: calibration.summary,
      // Only the rows for the active cell pair — keeps the bundle scoped to what's relevant.
      fits: calibration.calibrations.filter(c => c.cellPresetId === cell.healthy.id || c.cellPresetId === cell.target.id),
    },
    entries:   scopedEntries,
    residuals: scopedResiduals,
  }
}

// ── Residuals CSV builder ───────────────────────────────────────────────────

export function buildResidualsCsv(input: ManuscriptInput): string {
  const { entries, residuals, scope } = input
  const scopedEntries   = filterEntriesByScope(entries, scope)
  const scopedResiduals = filterResidualsByScope(residuals, scope).filter(r =>
    r.targetResidualPct !== null || r.healthyResidualPct !== null || r.fieldResidualVcm !== null
  )
  const byId = new Map(scopedEntries.map(e => [e.id, e]))

  const headers = [
    'entryId', 'session', 'timestamp',
    'freqKHz', 'fieldVcm',
    'predictedTargetDR', 'measuredTargetLysisPct', 'targetResidualPP',
    'predictedHealthyDR', 'measuredHealthyLysisPct', 'healthyResidualPP',
    'measuredFieldVcm', 'fieldResidualVcm',
    'measuredViabilityPct', 'measuredQpcrFoldChange',
    'aiSuggestionApplied', 'rated',
  ]

  const rows: string[] = [headers.join(',')]
  for (const r of scopedResiduals) {
    const e = byId.get(r.entryId)
    if (!e) continue
    const m = e.measured
    rows.push([
      r.entryId,
      csvEscape(r.sessionName ?? ''),
      csvEscape(r.timestamp),
      e.freqKHz,
      e.fieldVcm,
      e.targetRatio,
      m?.targetLysisPct  ?? '',
      r.targetResidualPct ?? '',
      e.healthyRatio,
      m?.healthyLysisPct ?? '',
      r.healthyResidualPct ?? '',
      m?.actualFieldVcm  ?? '',
      r.fieldResidualVcm ?? '',
      m?.viabilityPct    ?? '',
      m?.qpcrFoldChange  ?? '',
      e.aiSuggestionApplied ? 'true' : 'false',
      e.outcomeRating ?? '',
    ].join(','))
  }
  return rows.join('\n')
}

function csvEscape(s: string): string {
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

// ── Download triggers ──────────────────────────────────────────────────────

export function downloadManuscriptMarkdown(input: ManuscriptInput): void {
  downloadText(buildManuscriptMarkdown(input), manuscriptFilename(input.scope, 'md'), 'text/markdown')
}

export function downloadManuscriptJson(input: ManuscriptInput): void {
  downloadText(JSON.stringify(buildManuscriptJson(input), null, 2), manuscriptFilename(input.scope, 'json'), 'application/json')
}

export function downloadResidualsCsv(input: ManuscriptInput): void {
  downloadText(buildResidualsCsv(input), manuscriptFilename(input.scope, 'csv'), 'text/csv')
}
