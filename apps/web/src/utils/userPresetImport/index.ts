// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// JSON import for user cell presets; mirror of userPresetExport/index.ts.

import type {
  UserCellPreset,
  UserCellPresetInput,
  CellRole,
  CellFormType,
  ParameterConfidence,
  SigmaSource,
} from '@/stores/userPresetsStore'

export interface PresetImportReport {
  ok:       boolean
  schema:   string
  accepted: UserCellPresetInput[]
  rejected: Array<{ index: number; reason: string }>
  error?:   string
}

interface RawEnvelope {
  schema?:  string
  presets?: Partial<UserCellPreset>[]
}

const REQUIRED_NUMBERS = [
  'radius', 'membraneThickness', 'dielectricConstant', 'conductivity', 'thresholdVoltage',
  'density', 'specificHeatCapacity',
] as const satisfies readonly (keyof UserCellPreset)[]

const OPTIONAL_NUMBERS = [
  'membraneConductivity', 'sigmaUncertaintyPct',
  'nuclearRadius', 'nuclearMembraneThickness', 'nuclearMembraneEps',
  'nucleoplasmConductivity', 'nuclearThresholdVoltage',
  'resonantFreqGHz', 'capsidQ', 'resonantThresholdVcm',
  'resonantFreqUncertaintyPct', 'capsidQMin', 'capsidQMax',
  'resonantFreqGHz2', 'capsidQ2', 'resonantMode2Amplitude',
] as const satisfies readonly (keyof UserCellPreset)[]

const VALID_ROLES:       readonly string[] = ['target', 'healthy']
const VALID_CELL_TYPES:  readonly string[] = ['mammalian', 'bacteria', 'virus']
const VALID_CONFIDENCES: readonly string[] = ['literature', 'measured', 'estimated']
const VALID_SIGMA:       readonly string[] = ['literature', 'measured', 'electrorotation', 'impedance', 'estimated']

function isNonEmptyString(v: string | undefined): v is string {
  return typeof v === 'string' && v.trim().length > 0
}

function validatePreset(raw: Partial<UserCellPreset>): { input?: UserCellPresetInput; error?: string } {
  if (!isNonEmptyString(raw.label))      return { error: 'missing or empty label' }
  if (!isNonEmptyString(raw.shortLabel)) return { error: 'missing or empty shortLabel' }
  if (!raw.role     || !VALID_ROLES.includes(raw.role))          return { error: `invalid role: "${raw.role}"` }
  if (!raw.cellType || !VALID_CELL_TYPES.includes(raw.cellType)) return { error: `invalid cellType: "${raw.cellType}"` }

  for (const key of REQUIRED_NUMBERS) {
    const v = raw[key]
    if (typeof v !== 'number' || !Number.isFinite(v)) return { error: `missing or non-numeric ${key}` }
  }

  const confidence: ParameterConfidence = raw.parameterConfidence && VALID_CONFIDENCES.includes(raw.parameterConfidence)
    ? (raw.parameterConfidence as ParameterConfidence)
    : 'literature'

  const input: UserCellPresetInput = {
    role:                 raw.role as CellRole,
    cellType:             raw.cellType as CellFormType,
    label:                raw.label.trim(),
    shortLabel:           raw.shortLabel.trim(),
    notes:                typeof raw.notes === 'string' ? raw.notes : '',
    parameterConfidence:  confidence,
    radius:               raw.radius!,
    membraneThickness:    raw.membraneThickness!,
    dielectricConstant:   raw.dielectricConstant!,
    conductivity:         raw.conductivity!,
    thresholdVoltage:     raw.thresholdVoltage!,
    density:              raw.density!,
    specificHeatCapacity: raw.specificHeatCapacity!,
  }

  const writable = input as Record<string, number | string>
  for (const key of OPTIONAL_NUMBERS) {
    const v = raw[key]
    if (typeof v === 'number' && Number.isFinite(v)) writable[key] = v
  }

  if (raw.sigmaSource && VALID_SIGMA.includes(raw.sigmaSource)) input.sigmaSource = raw.sigmaSource as SigmaSource
  if (isNonEmptyString(raw.sigmaCitation)) input.sigmaCitation = raw.sigmaCitation.trim()

  return { input }
}

export function parseUserPresetsJson(text: string): PresetImportReport {
  const report: PresetImportReport = { ok: false, schema: '', accepted: [], rejected: [] }
  let envelope: RawEnvelope
  try {
    envelope = JSON.parse(text) as RawEnvelope
  } catch (err) {
    report.error = `Could not parse JSON: ${(err as Error).message}`
    return report
  }

  if (typeof envelope.schema !== 'string' || !envelope.schema.startsWith('resopulse-user-presets@')) {
    report.error = 'Not a ResoPulse preset export (missing or invalid "schema" field).'
    return report
  }
  report.schema = envelope.schema

  if (!Array.isArray(envelope.presets)) {
    report.error = 'Expected a "presets" array in the envelope.'
    return report
  }

  envelope.presets.forEach((raw, i) => {
    const { input, error } = validatePreset(raw)
    if (input) report.accepted.push(input)
    else       report.rejected.push({ index: i, reason: error ?? 'validation failed' })
  })

  report.ok = report.accepted.length > 0
  return report
}
