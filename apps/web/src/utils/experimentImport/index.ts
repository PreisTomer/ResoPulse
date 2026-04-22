// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// Mirror of experimentExport.buildCsvText: parses CSV back into measured outcomes keyed by log-entry id.

import type { MeasuredOutcome, ViabilityAssay } from '@resopulse/shared-types'

export interface ImportedRow {
  id:       number
  measured: Omit<MeasuredOutcome, 'measuredAt'> & { measuredAt?: string }
}

export interface ImportReport {
  rowsSeen:             number
  rowsWithMeasuredData: number
  matchable:            ImportedRow[]
  ignoredRows:          Array<{ row: number; reason: string }>
}

const ID_HEADERS       = ['#', 'id', 'entry', 'entry #', 'entry#']
const MEASURED_COLS: Record<keyof Omit<MeasuredOutcome, 'measuredAt' | 'notes' | 'viabilityAssay'>, string[]> = {
  targetLysisPct:       ['t-lysis measured (%)', 'target lysis measured (%)', 'target lysis (%)', 'target lysis %'],
  healthyLysisPct:      ['h-lysis measured (%)', 'healthy lysis measured (%)', 'healthy lysis (%)', 'healthy lysis %'],
  viabilityPct:         ['viability measured (%)', 'viability (%)', 'viability %'],
  permeabilizedPct:     ['permeabilized measured (%)', 'permeabilized (%)', 'permeabilized %', 'pi+ (%)', 'pi uptake (%)'],
  transfectionPct:      ['transfection measured (%)', 'transfection (%)', 'transfection %', 'gfp+ (%)', 'cargo+ (%)'],
  assayTimepointH:      ['assay timepoint (h)', 'timepoint (h)', 'assay timepoint h'],
  tempC:                ['temp measured (°c)', 'temp measured (c)', 'temperature (°c)', 'post-run temp (°c)', 'temp meas (°c)'],
  actualFieldVcm:       ['actual field measured (v/cm)', 'actual field (v/cm)', 'field measured (v/cm)'],
  observedLysisDelayMs: ['lysis delay measured (ms)', 'lysis delay (ms)', 'observed lysis delay (ms)'],
}
const ASSAY_COL_NAMES = ['viability assay', 'assay method', 'viability method']
const NOTES_COL_NAMES = ['measured notes', 'notes']
const MEASURED_AT_COL_NAMES = ['measured at']

const VALID_ASSAYS: readonly ViabilityAssay[] = ['trypan', 'mtt', 'flowPi', 'resazurin', 'cellTiterGlo', 'other']

/** Tokenises one CSV line handling double-quoted fields with embedded commas and `""` escapes. */
function splitCsvLine(line: string): string[] {
  const out: string[] = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') { field += '"'; i++ }
      else if (ch === '"')                   { inQuotes = false }
      else                                    { field += ch }
    } else {
      if (ch === '"')       { inQuotes = true }
      else if (ch === ',')  { out.push(field); field = '' }
      else                   { field += ch }
    }
  }
  out.push(field)
  return out
}

/** Returns the first header index whose normalised name matches one of the candidates. */
function findColumn(headers: string[], candidates: string[]): number {
  const norm = headers.map(h => h.trim().toLowerCase())
  for (const c of candidates) {
    const idx = norm.indexOf(c.toLowerCase())
    if (idx !== -1) return idx
  }
  return -1
}

function toNumberOrU(raw: string | undefined): number | undefined {
  if (raw === undefined) return undefined
  const trimmed = raw.trim()
  if (trimmed === '') return undefined
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : undefined
}

function toAssayOrU(raw: string | undefined): ViabilityAssay | undefined {
  if (raw === undefined) return undefined
  const trimmed = raw.trim()
  if (trimmed === '') return undefined
  const match = VALID_ASSAYS.find(a => a.toLowerCase() === trimmed.toLowerCase())
  return match
}

export function parseMeasuredCsv(text: string): ImportReport {
  const report: ImportReport = {
    rowsSeen:             0,
    rowsWithMeasuredData: 0,
    matchable:            [],
    ignoredRows:          [],
  }
  if (!text) return report

  // Metadata lines start with "# " (hash + space) in ResoPulse exports.
  // The header row also starts with "#" (the id column) so match only the space form.
  const lines = text.split(/\r?\n/).filter(l => l.length > 0 && !l.startsWith('# '))
  if (lines.length < 2) return report

  const headers = splitCsvLine(lines[0]!)
  const idCol   = findColumn(headers, ID_HEADERS)
  if (idCol === -1) {
    report.ignoredRows.push({ row: 0, reason: 'no id / # column' })
    return report
  }

  const colIndex: Partial<Record<keyof typeof MEASURED_COLS, number>> = {}
  ;(Object.keys(MEASURED_COLS) as Array<keyof typeof MEASURED_COLS>).forEach(key => {
    const idx = findColumn(headers, MEASURED_COLS[key])
    if (idx !== -1) colIndex[key] = idx
  })
  const assayIdx      = findColumn(headers, ASSAY_COL_NAMES)
  const notesIdx      = findColumn(headers, NOTES_COL_NAMES)
  const measuredAtIdx = findColumn(headers, MEASURED_AT_COL_NAMES)

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]!)
    report.rowsSeen++
    const idRaw = cells[idCol]?.trim() ?? ''
    const id    = Number(idRaw)
    if (!Number.isFinite(id) || id <= 0) {
      report.ignoredRows.push({ row: i, reason: `non-numeric id: "${idRaw}"` })
      continue
    }

    const measured: Omit<MeasuredOutcome, 'measuredAt'> & { measuredAt?: string } = {}
    let any = false
    ;(Object.keys(colIndex) as Array<keyof typeof MEASURED_COLS>).forEach(key => {
      const idx = colIndex[key]
      if (idx === undefined) return
      const v = toNumberOrU(cells[idx])
      if (v !== undefined) {
        measured[key] = v
        any = true
      }
    })
    if (assayIdx !== -1) {
      const assay = toAssayOrU(cells[assayIdx])
      if (assay !== undefined) {
        measured.viabilityAssay = assay
        any = true
      }
    }
    if (notesIdx !== -1) {
      const notes = cells[notesIdx]?.trim()
      if (notes) {
        measured.notes = notes
        any = true
      }
    }
    if (measuredAtIdx !== -1) {
      const at = cells[measuredAtIdx]?.trim()
      if (at) measured.measuredAt = at
    }

    if (!any) continue
    report.rowsWithMeasuredData++
    report.matchable.push({ id, measured })
  }

  return report
}
