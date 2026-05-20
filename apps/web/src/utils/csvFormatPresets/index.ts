// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Format presets for the measured-outcome CSV importer. Each preset prefills CsvColumnMapping with sensible defaults for a class of CSV — SimBiotix's own export, generic plate-reader long-format (well-row), and generic plate-reader wide-format (matrix layout with leading metadata block). User can still override any field in CsvMappingModal.

import type { CsvColumnMapping } from '@/stores/csvMappingStore'

export interface CsvFormatPreset {
  id:          string
  label:       string
  description: string
  // Mapping prefill applied when the user picks this preset. Existing user overrides are preserved unless explicitly replaced.
  mapping:     CsvColumnMapping
  // Heuristic that scans the first ~50 raw lines (already trimmed of empty rows) and returns a confidence score [0, 1]. Highest-scoring preset wins; ties favor SIMBIOTIX_NATIVE.
  detect:      (firstLines: string[]) => number
}

const SIMBIOTIX_NATIVE: CsvFormatPreset = {
  id:          'simbiotix',
  label:       'SimBiotix export',
  description: 'CSV produced by SimBiotix itself (header row starts with "#" or "id"). Default — covers any round-trip from this app.',
  mapping: {
    formatPresetId: 'simbiotix',
    headerSkip:     0,
  },
  detect: (lines) => {
    if (lines.length === 0) return 0
    const firstNonComment = lines.find(l => !l.startsWith('# '))
    if (!firstNonComment) return 0
    const lower = firstNonComment.toLowerCase()
    // SimBiotix exports always start the header row with `#` (the id column) and include the verbose "T-Lysis measured (%)" / "H-Lysis measured (%)" headers.
    if (lower.startsWith('#') && lower.includes('t-lysis')) return 0.95
    if (lower.startsWith('#'))                              return 0.55
    if (lower.startsWith('id,') || lower.startsWith('id\t')) return 0.40
    return 0
  },
}

const PLATE_READER_LONG: CsvFormatPreset = {
  id:          'plate-reader-long',
  label:       'Plate reader (long format with Sample column)',
  description: 'One row per well/sample. Sample names contain the SimBiotix entry id (e.g. "Run #3 MCF-7"); the importer extracts the digits. Common for Tecan SparkControl, BioTek Gen5 long export.',
  mapping: {
    formatPresetId: 'plate-reader-long',
    headerSkip:     0,
    idColumn:       'Sample',
    // Match a `#`-prefixed number first ("Run #3"), otherwise any standalone integer ("Run 3"). Capture group is the digits.
    idRegex:        '#\\s*(\\d+)|\\b(\\d+)\\b',
    targetLysisPct: 'Target Lysis %',
    healthyLysisPct: 'Healthy Lysis %',
    viabilityPct:   'Viability %',
    actualFieldVcm: 'Field (V/cm)',
    tempC:          'Temp (°C)',
  },
  detect: (lines) => {
    if (lines.length < 2) return 0
    const headerLine = findHeaderLine(lines)
    if (!headerLine) return 0
    const lower = headerLine.toLowerCase()
    let score = 0
    if (/\bsample\b/.test(lower))           score += 0.40
    if (/\bwell\b/.test(lower))             score += 0.20
    if (/\bvalue\b|\babsorbance\b|\bod\b/.test(lower)) score += 0.20
    if (lines[0]!.toLowerCase().startsWith('plate id') || lines[0]!.toLowerCase().startsWith('experiment')) score += 0.10
    return Math.min(0.95, score)
  },
}

const PLATE_READER_WIDE: CsvFormatPreset = {
  id:          'plate-reader-wide',
  label:       'Plate reader (matrix layout with metadata header)',
  description: 'Leading metadata block (5–20 rows of "Plate ID:", "Date:", etc.) followed by a header row and one row per measurement. Common for BMG CLARIOstar / PHERAstar exports. Set the metadata-row count below.',
  mapping: {
    formatPresetId: 'plate-reader-wide',
    headerSkip:     10,
    idColumn:       'Sample ID',
    idRegex:        '#\\s*(\\d+)|\\b(\\d+)\\b',
    targetLysisPct: 'Target Lysis %',
    healthyLysisPct: 'Healthy Lysis %',
    viabilityPct:   'Viability %',
  },
  detect: (lines) => {
    if (lines.length < 6) return 0
    const top = lines.slice(0, 8).join('\n').toLowerCase()
    let score = 0
    if (/plate\s*id/.test(top))     score += 0.30
    if (/date\s*[:,]/.test(top))    score += 0.15
    if (/test\s*name/.test(top))    score += 0.15
    if (/instrument|reader\s*serial/.test(top)) score += 0.15
    if (/raw\s*data|reading\s*mode/.test(top))  score += 0.15
    return Math.min(0.95, score)
  },
}

export const CSV_FORMAT_PRESETS: ReadonlyArray<CsvFormatPreset> = [
  SIMBIOTIX_NATIVE,
  PLATE_READER_LONG,
  PLATE_READER_WIDE,
]

export function getPresetById(id: string | undefined): CsvFormatPreset | undefined {
  return id ? CSV_FORMAT_PRESETS.find(p => p.id === id) : undefined
}

export const DEFAULT_PRESET_ID = SIMBIOTIX_NATIVE.id

// Looks at the first 50 raw lines and returns the highest-confidence preset, plus the raw scores for all presets so the UI can show a "this looked most like X" hint. Confidence < 0.30 is treated as "no clear match" — caller should fall back to the user-saved mapping or default.
export interface DetectResult {
  preset:     CsvFormatPreset
  confidence: number
  scores:     Array<{ preset: CsvFormatPreset; score: number }>
}

export function detectFormat(text: string): DetectResult {
  const lines = text.split(/\r?\n/).filter(l => l.length > 0).slice(0, 50)
  const scores = CSV_FORMAT_PRESETS.map(preset => ({ preset, score: preset.detect(lines) }))
  scores.sort((a, b) => b.score - a.score)
  const best = scores[0]!
  return { preset: best.preset, confidence: best.score, scores }
}

// Helper: skip leading metadata-style lines and return the first line that looks like a CSV header (multiple commas + at least one alphabetic identifier).
function findHeaderLine(lines: string[]): string | undefined {
  for (const line of lines.slice(0, 50)) {
    const commaCount = (line.match(/,/g) ?? []).length
    if (commaCount < 1) continue
    if (/[A-Za-z]/.test(line)) return line
  }
  return undefined
}
