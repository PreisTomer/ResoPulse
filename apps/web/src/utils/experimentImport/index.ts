// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Mirror of experimentExport.buildCsvText: parses CSV back into measured outcomes keyed by log-entry id.

import type { MeasuredOutcome, ViabilityAssay } from '@resopulse/shared-types'

import type { CsvColumnMapping, CsvMappingField } from '@/stores/csvMappingStore'

export interface ImportedRow {
  id:       number
  measured: Omit<MeasuredOutcome, 'measuredAt'> & { measuredAt?: string }
}

export interface ImportReport {
  rowsSeen:             number
  rowsWithMeasuredData: number
  matchable:            ImportedRow[]
  ignoredRows:          Array<{ row: number; reason: string }>
  duplicateIds:         number[]
}

const ID_HEADERS       = ['#', 'id', 'entry', 'entry #', 'entry#']
const MEASURED_COLS: Record<keyof Omit<MeasuredOutcome, 'measuredAt' | 'notes' | 'viabilityAssay' | 'qpcrTarget'>, string[]> = {
  targetLysisPct:       ['t-lysis measured (%)', 'target lysis measured (%)', 'target lysis (%)', 'target lysis %'],
  healthyLysisPct:      ['h-lysis measured (%)', 'healthy lysis measured (%)', 'healthy lysis (%)', 'healthy lysis %'],
  viabilityPct:         ['viability measured (%)', 'viability (%)', 'viability %'],
  permeabilizedPct:     ['permeabilized measured (%)', 'permeabilized (%)', 'permeabilized %', 'pi+ (%)', 'pi uptake (%)'],
  transfectionPct:      ['transfection measured (%)', 'transfection (%)', 'transfection %', 'gfp+ (%)', 'cargo+ (%)'],
  assayTimepointH:      ['assay timepoint (h)', 'timepoint (h)', 'assay timepoint h'],
  qpcrFoldChange:       ['qpcr fold-change', 'qpcr fold change', 'qpcr 2^-ddct', '2^(-ddct)', 'fold-change (qpcr)'],
  tempC:                ['temp measured (°c)', 'temp measured (c)', 'temperature (°c)', 'post-run temp (°c)', 'temp meas (°c)'],
  actualFieldVcm:       ['actual field measured (v/cm)', 'actual field (v/cm)', 'field measured (v/cm)'],
  observedLysisDelayMs: ['lysis delay measured (ms)', 'lysis delay (ms)', 'observed lysis delay (ms)'],
}
const ASSAY_COL_NAMES = ['viability assay', 'assay method', 'viability method', 'assay type', 'assay_type']
const QPCR_TARGET_COL_NAMES = ['qpcr transcript', 'qpcr target', 'qpcr gene']
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

// Returns a function (cell → id | null). Without a regex it's just numeric parsing of the trimmed cell. With a regex, the first capture group is the id (or the full match when the regex has none); a malformed regex degrades to numeric parsing rather than throwing.
function compileIdExtractor(idRegex: string | undefined): (raw: string) => number | null {
  const numericFallback = (raw: string): number | null => {
    const n = Number(raw.trim())
    return Number.isFinite(n) && n > 0 ? n : null
  }
  if (!idRegex || idRegex.trim() === '') return numericFallback
  let re: RegExp
  try {
    re = new RegExp(idRegex)
  } catch {
    return numericFallback
  }
  return (raw: string): number | null => {
    const m = re.exec(raw)
    if (!m) return null
    const captured = m.length > 1 ? m[1] : m[0]
    if (captured === undefined) return null
    const n = Number(captured.trim())
    return Number.isFinite(n) && n > 0 ? n : null
  }
}

export function parseMeasuredCsv(text: string, userMapping: CsvColumnMapping = {}): ImportReport {
  const report: ImportReport = {
    rowsSeen:             0,
    rowsWithMeasuredData: 0,
    matchable:            [],
    ignoredRows:          [],
    duplicateIds:         [],
  }
  if (!text) return report

  // ResoPulse exports prefix metadata lines with "# " (hash + space). Plate readers don't follow that convention; the user can instead specify `headerSkip` to drop the first N lines unconditionally.
  let lines = text.split(/\r?\n/).filter(l => l.length > 0 && !l.startsWith('# '))
  const headerSkip = Math.max(0, Math.floor(userMapping.headerSkip ?? 0))
  if (headerSkip > 0) lines = lines.slice(headerSkip)
  if (lines.length < 2) return report

  const headers = splitCsvLine(lines[0]!)

  // ID column resolution: explicit user-supplied column name first; fall back to the built-in heuristic ('id' / '#' / 'entry'). When the user supplies an idRegex, it'll be applied to each cell value to extract a numeric id (e.g. "Run #3 MCF-7" → 3).
  const idCol = userMapping.idColumn
    ? findColumn(headers, [userMapping.idColumn])
    : findColumn(headers, ID_HEADERS)
  if (idCol === -1) {
    const wanted = userMapping.idColumn ?? ID_HEADERS.join(' / ')
    report.ignoredRows.push({ row: 0, reason: `id column not found (looked for: ${wanted})` })
    return report
  }
  const idExtractor = compileIdExtractor(userMapping.idRegex)

  const aliasesFor = (field: CsvMappingField, builtIn: string[]): string[] => {
    const user = userMapping[field]
    return user ? [user, ...builtIn] : builtIn
  }

  const colIndex: Partial<Record<keyof typeof MEASURED_COLS, number>> = {}
  ;(Object.keys(MEASURED_COLS) as Array<keyof typeof MEASURED_COLS>).forEach(key => {
    const idx = findColumn(headers, aliasesFor(key, MEASURED_COLS[key]))
    if (idx !== -1) colIndex[key] = idx
  })
  const assayIdx      = findColumn(headers, aliasesFor('viabilityAssay', ASSAY_COL_NAMES))
  const qpcrTargetIdx = findColumn(headers, aliasesFor('qpcrTarget',     QPCR_TARGET_COL_NAMES))
  const notesIdx      = findColumn(headers, aliasesFor('notes',          NOTES_COL_NAMES))
  const measuredAtIdx = findColumn(headers, aliasesFor('measuredAt',     MEASURED_AT_COL_NAMES))

  for (let i = 1; i < lines.length; i++) {
    const cells = splitCsvLine(lines[i]!)
    report.rowsSeen++
    const idRaw = cells[idCol]?.trim() ?? ''
    const id    = idExtractor(idRaw)
    if (id === null) {
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
    if (qpcrTargetIdx !== -1) {
      const label = cells[qpcrTargetIdx]?.trim()
      if (label) {
        measured.qpcrTarget = label
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

  const seen = new Set<number>()
  const dups = new Set<number>()
  for (const row of report.matchable) {
    if (seen.has(row.id)) dups.add(row.id)
    seen.add(row.id)
  }
  report.duplicateIds = [...dups].sort((a, b) => a - b)

  return report
}
