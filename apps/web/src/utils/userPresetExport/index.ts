// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// Pure export utilities for user cell presets. No store or Vue imports.
// JSON export preserves full fidelity; CSV is a flat table for spreadsheet use.

import type { UserCellPreset } from '@/stores/userPresetsStore'

type CsvValue = string | number | null | undefined

// Column order is the public export schema. Appending a new field is safe;
// reordering or renaming is a breaking change for spreadsheets consuming the CSV.
const CSV_COLUMNS: readonly (keyof UserCellPreset)[] = [
  'id', 'role', 'cellType', 'label', 'shortLabel', 'notes', 'parameterConfidence',
  'radius', 'membraneThickness', 'dielectricConstant', 'conductivity', 'thresholdVoltage',
  'density', 'specificHeatCapacity', 'membraneConductivity',
  'sigmaUncertaintyPct', 'sigmaSource', 'sigmaCitation',
  'nuclearRadius', 'nuclearMembraneThickness', 'nuclearMembraneEps',
  'nucleoplasmConductivity', 'nuclearThresholdVoltage',
  'resonantFreqGHz', 'capsidQ', 'resonantThresholdVcm',
  'resonantFreqUncertaintyPct', 'capsidQMin', 'capsidQMax',
  'resonantFreqGHz2', 'capsidQ2', 'resonantMode2Amplitude',
  'createdAt',
] as const

function csvEscape(value: CsvValue): string {
  if (value === null || value === undefined) return ''
  const s = typeof value === 'string' ? value : String(value)
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

export function userPresetsToCsv(presets: UserCellPreset[]): string {
  const header = CSV_COLUMNS.join(',')
  const rows   = presets.map(p =>
    CSV_COLUMNS.map(col => csvEscape((p as object as Record<string, CsvValue>)[col])).join(','),
  )
  return [header, ...rows].join('\n')
}

export function userPresetsToJson(presets: UserCellPreset[]): string {
  return JSON.stringify({ schema: 'resopulse-user-presets@1', exportedAt: Date.now(), presets }, null, 2)
}

export function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function timestampForFilename(now: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`
}

export function downloadUserPresetsJson(presets: UserCellPreset[]): void {
  downloadBlob(userPresetsToJson(presets), `resopulse-presets-${timestampForFilename()}.json`, 'application/json')
}

export function downloadUserPresetsCsv(presets: UserCellPreset[]): void {
  downloadBlob(userPresetsToCsv(presets), `resopulse-presets-${timestampForFilename()}.csv`, 'text/csv;charset=utf-8')
}
