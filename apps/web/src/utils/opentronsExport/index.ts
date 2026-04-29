// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Generates an executable Opentrons protocol Python script (API v2) from current ResoPulse simulator state plus user-supplied wet-lab parameters. Covers liquid-handling steps; pulse delivery happens on a separate EP device, surfaced via protocol.pause() with the simulator's suggested protocol embedded. Pure builders only — no Vue/Pinia imports.

import { downloadText } from '@/utils/experimentExport'

import type { CellConfig } from '@/types/cell'
import type { CalibrationMode } from '@resopulse/shared-types'

export interface OpentronsCellPair {
  healthy: CellConfig
  target:  CellConfig
}

// Calibration row passed in from cellCalibrationStore. Optional — script comments simply note "uncalibrated" when absent.
export interface OpentronsCalibrationRow {
  cellPresetId: string
  cellLabel:    string
  mode:         CalibrationMode
  param1Mult:   number
  param2Mult:   number
  residualStd:  number
  nSamples:     number
  param1Unident: boolean
  param2Unident: boolean
}

export interface OpentronsProtocolContext {
  freqKHz:       number
  fieldVcm:      number
  waveform:      'cw' | 'pulsed' | 'hfire'
  dutyCycle:     number
  pulseWidthNs:  number
  lysisNPulses:  number
  medium:        string
  effectiveSigmaE: number
  chartMode:     'schwan' | 'resonance'
  predictedTargetDr:  number
  predictedHealthyDr: number
  predictedTi:        number
}

// Wet-lab parameters supplied by the user wizard. Opentrons load names come from labware.opentrons.com; deck slots are 1-11 (OT-2) or A1-D4 (Flex).
export interface OpentronsWetLabParams {
  robotType:       'OT-2' | 'Flex'
  pipetteMount:    'left' | 'right'
  pipetteName:     string
  tipRackLoadName: string
  sourceLoadName:  string
  destLoadName:    string
  tipRackSlot:     string
  sourceSlot:      string
  destSlot:        string
  sourceWell:      string
  cellDensityCellsPerMl: number
  volumeUlPerWell:       number
  replicateCount:        number
  pausePromptOverride?:  string
}

export interface OpentronsExportInput {
  cellPair:    OpentronsCellPair
  protocol:    OpentronsProtocolContext
  wetLab:      OpentronsWetLabParams
  calibrations: OpentronsCalibrationRow[]
  generatedAt?: string
}

const SCHEMA_VERSION = '1.0.0'
const DEFAULT_API_LEVEL = '2.15'

// ── Public entry points ─────────────────────────────────────────────────────

export function buildOpentronsScript(input: OpentronsExportInput): string {
  const generatedAt = input.generatedAt ?? new Date().toISOString()
  const sections: string[] = []
  sections.push(buildDocstring(input, generatedAt))
  sections.push(buildImports())
  sections.push(buildMetadata(input))
  sections.push(buildRequirements(input.wetLab.robotType))
  sections.push(buildRunFunction(input))
  return sections.join('\n\n') + '\n'
}

export function opentronsFilename(input: OpentronsExportInput): string {
  const safe = (s: string) => s.replace(/\s+/g, '_').replace(/[^A-Za-z0-9_-]/g, '')
  const target = safe(input.cellPair.target.label || input.cellPair.target.id || 'cells')
  const stamp  = (input.generatedAt ?? new Date().toISOString()).replace(/[:.]/g, '-').replace(/T/, '_').replace(/Z$/, 'Z')
  return `resopulse_${target}_opentrons_${stamp}.py`
}

export function downloadOpentronsScript(input: OpentronsExportInput): void {
  downloadText(buildOpentronsScript(input), opentronsFilename(input), 'text/x-python')
}

// ── Section builders ────────────────────────────────────────────────────────

function buildDocstring(input: OpentronsExportInput, generatedAt: string): string {
  const { cellPair, protocol, wetLab, calibrations } = input
  const lines: string[] = []
  lines.push('"""')
  lines.push('ResoPulse — Opentrons protocol export')
  lines.push(`Schema:    ${SCHEMA_VERSION}`)
  lines.push(`Generated: ${generatedAt}`)
  lines.push('Source:    ResoPulse closed-loop digital twin')
  lines.push('')
  lines.push('Suggested EP protocol (apply manually during the protocol.pause() step):')
  lines.push(`  Mode:        ${protocol.chartMode === 'resonance' ? 'Acoustic Resonance' : 'Schwan / IRE'}`)
  lines.push(`  Frequency:   ${formatFreq(protocol.freqKHz)}`)
  lines.push(`  Field:       ${formatField(protocol.fieldVcm)}`)
  lines.push(`  Waveform:    ${protocol.waveform.toUpperCase()}`)
  if (protocol.waveform !== 'cw') {
    lines.push(`  Duty cycle:  ${(protocol.dutyCycle * 100).toFixed(3)} %`)
    lines.push(`  Pulse width: ${protocol.pulseWidthNs} ns`)
    lines.push(`  N pulses:    ${protocol.lysisNPulses}`)
  }
  lines.push(`  Medium:      ${protocol.medium} (effective σ_e = ${protocol.effectiveSigmaE.toFixed(4)} S/m)`)
  lines.push('')
  lines.push('Cell pair:')
  lines.push(`  Target:  ${cellPair.target.label}  (R=${cellPair.target.radius}µm, σ_i baseline=${cellPair.target.conductivity} S/m, V_th baseline=${cellPair.target.thresholdVoltage} V)`)
  lines.push(`  Healthy: ${cellPair.healthy.label}  (R=${cellPair.healthy.radius}µm, σ_i baseline=${cellPair.healthy.conductivity} S/m, V_th baseline=${cellPair.healthy.thresholdVoltage} V)`)
  lines.push('')
  lines.push('Calibration state:')
  if (calibrations.length === 0) {
    lines.push('  No calibration applied — using literature baseline values.')
  } else {
    for (const c of calibrations) {
      const flags: string[] = []
      if (c.param1Unident) flags.push('param1 unidentifiable (pinned at 1.0)')
      if (c.param2Unident) flags.push('param2 unidentifiable (pinned at 1.0)')
      const flagText = flags.length ? ` · ${flags.join(', ')}` : ''
      const p1Label = c.mode === 'resonance' ? 'Q'        : 'σ_i'
      const p2Label = c.mode === 'resonance' ? 'V_thr_res' : 'V_th'
      lines.push(`  ${c.cellLabel} (${c.mode}): ${p1Label} ×${c.param1Mult.toFixed(3)} · ${p2Label} ×${c.param2Mult.toFixed(3)} · residualStd ${c.residualStd.toFixed(4)} · n=${c.nSamples}${flagText}`)
    }
  }
  lines.push('')
  lines.push('Predicted outcomes at this protocol:')
  lines.push(`  Target DR:   ${(protocol.predictedTargetDr  * 100).toFixed(1)} %`)
  lines.push(`  Healthy DR:  ${(protocol.predictedHealthyDr * 100).toFixed(1)} %`)
  lines.push(`  TI (T/H):    ${protocol.predictedTi.toFixed(2)}`)
  lines.push('')
  lines.push('Wet-lab parameters (configured in ResoPulse export wizard):')
  lines.push(`  Robot:           ${wetLab.robotType}`)
  lines.push(`  Pipette:         ${wetLab.pipetteName} on the ${wetLab.pipetteMount} mount`)
  lines.push(`  Tip rack:        ${wetLab.tipRackLoadName} in slot ${wetLab.tipRackSlot}`)
  lines.push(`  Source labware:  ${wetLab.sourceLoadName} in slot ${wetLab.sourceSlot}, well ${wetLab.sourceWell}`)
  lines.push(`  Dest labware:    ${wetLab.destLoadName} in slot ${wetLab.destSlot}`)
  lines.push(`  Cell density:    ${wetLab.cellDensityCellsPerMl.toExponential(2)} cells/mL`)
  lines.push(`  Volume per well: ${wetLab.volumeUlPerWell} µL`)
  lines.push(`  Replicates:      ${wetLab.replicateCount} wells`)
  lines.push('')
  lines.push('Honesty caveats:')
  lines.push('  - All predicted DR / TI values are simulator outputs, not measured.')
  lines.push('  - Calibration multipliers come from the user\'s own bench fits where logged; falls back to literature baseline otherwise.')
  lines.push('  - The lumped 0-D thermal model is a Pennes-style approximation valid for in-vitro cuvettes; full Pennes PDE is out of scope.')
  lines.push('  - This script handles ONLY the liquid handling. Pulse delivery happens on the user\'s EP device during the manual pause step.')
  lines.push('')
  lines.push('Generated by ResoPulse — Closed-Loop Electroporation Digital Twin.')
  lines.push('Copyright © 2026 Tomer Preis. Licensed under the MIT License.')
  lines.push('"""')
  return lines.join('\n')
}

function buildImports(): string {
  return 'from opentrons import protocol_api'
}

function buildMetadata(input: OpentronsExportInput): string {
  const targetSafe = pyString((input.cellPair.target.label || input.cellPair.target.id || 'cells').replace(/\s+/g, '_'))
  const protoName = pyString(`ResoPulse_${(input.cellPair.target.label || 'target').replace(/\s+/g, '_')}_${input.protocol.freqKHz}kHz_${input.wetLab.replicateCount}wells`)
  return [
    'metadata = {',
    `    "protocolName":   ${protoName},`,
    `    "author":         "ResoPulse digital twin",`,
    `    "description":    "Closed-loop suggested EP protocol — wet-lab pipetting + manual pulse pause",`,
    `    "source":         "ResoPulse",`,
    `    "apiLevel":       ${pyString(DEFAULT_API_LEVEL)},`,
    `    "targetCell":     ${targetSafe},`,
    '}',
  ].join('\n')
}

function buildRequirements(robotType: 'OT-2' | 'Flex'): string {
  return [
    'requirements = {',
    `    "robotType":   ${pyString(robotType)},`,
    `    "apiLevel":    ${pyString(DEFAULT_API_LEVEL)},`,
    '}',
  ].join('\n')
}

function buildRunFunction(input: OpentronsExportInput): string {
  const w = input.wetLab
  const lines: string[] = []
  lines.push('def run(protocol: protocol_api.ProtocolContext):')
  lines.push('    # Labware: tip rack, source plate (cell suspension), destination plate (cuvettes/wells).')
  lines.push(`    tiprack  = protocol.load_labware(${pyString(w.tipRackLoadName)}, ${pyString(w.tipRackSlot)})`)
  lines.push(`    source   = protocol.load_labware(${pyString(w.sourceLoadName)}, ${pyString(w.sourceSlot)})`)
  lines.push(`    cuvettes = protocol.load_labware(${pyString(w.destLoadName)}, ${pyString(w.destSlot)})`)
  lines.push('')
  lines.push(`    pipette = protocol.load_instrument(${pyString(w.pipetteName)}, ${pyString(w.pipetteMount)}, tip_racks=[tiprack])`)
  lines.push('')
  lines.push('    # Distribute cells from source to destination. Mix-before keeps the suspension homogenous; new_tip="once" reuses one tip across all wells.')
  lines.push('    dest_wells = cuvettes.wells()[: ' + String(w.replicateCount) + ']')
  lines.push('    pipette.distribute(')
  lines.push(`        ${w.volumeUlPerWell},`)
  lines.push(`        source.wells_by_name()[${pyString(w.sourceWell)}],`)
  lines.push('        dest_wells,')
  lines.push('        new_tip="once",')
  lines.push(`        mix_before=(3, ${Math.min(w.volumeUlPerWell, 100)}),`)
  lines.push('    )')
  lines.push('')
  lines.push('    # Manual electroporation step. Operator runs the pulse on their EP device, then resumes.')
  const pausePrompt = w.pausePromptOverride ?? defaultPausePrompt(input)
  lines.push(`    protocol.pause(${pyMultiline(pausePrompt, '        ')})`)
  lines.push('')
  lines.push('    # Post-pulse: customize this block for your downstream readout (PI uptake, viability, qPCR, ...).')
  lines.push('    # Example: pipette.transfer(50, dest_wells, assay_plate.wells()[:N], new_tip="always")')
  lines.push('    pass')
  return lines.join('\n')
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function defaultPausePrompt(input: OpentronsExportInput): string {
  const p = input.protocol
  const lines: string[] = []
  lines.push('Apply EP pulse externally on your electroporator:')
  lines.push(`  Frequency:   ${formatFreq(p.freqKHz)}`)
  lines.push(`  Field:       ${formatField(p.fieldVcm)}`)
  lines.push(`  Waveform:    ${p.waveform.toUpperCase()}`)
  if (p.waveform !== 'cw') {
    lines.push(`  Duty cycle:  ${(p.dutyCycle * 100).toFixed(3)} %`)
    lines.push(`  Pulse width: ${p.pulseWidthNs} ns`)
    lines.push(`  N pulses:    ${p.lysisNPulses}`)
  }
  lines.push('')
  lines.push('Return cuvettes to the destination labware slot, then resume the run.')
  return lines.join('\n')
}

function formatFreq(khz: number): string {
  if (khz >= 1e6) return `${(khz / 1e6).toFixed(3)} GHz`
  if (khz >= 1e3) return `${(khz / 1e3).toFixed(3)} MHz`
  return `${khz} kHz`
}

function formatField(vcm: number): string {
  return vcm >= 10000 ? `${(vcm / 1000).toFixed(1)} kV/cm` : `${vcm.toFixed(0)} V/cm`
}

function pyString(s: string): string {
  return `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
}

function pyMultiline(s: string, indent: string): string {
  const indented = s.replace(/\\/g, '\\\\').split('\n').map(l => l).join('\n' + indent)
  return `"""\n${indent}${indented}\n${indent}"""`
}
