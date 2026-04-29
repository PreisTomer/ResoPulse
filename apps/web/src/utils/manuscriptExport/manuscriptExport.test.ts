// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

import { describe, it, expect } from 'vitest'

import {
  buildManuscriptMarkdown,
  buildManuscriptJson,
  buildResidualsCsv,
  filterEntriesByScope,
  filterResidualsByScope,
  manuscriptFilename,
  type ManuscriptInput,
  type ManuscriptScope,
  type ManuscriptCellContext,
  type ManuscriptCalibrationContext,
} from './index'

import { CELL_TYPE } from '@/constants/strings'
import type { CellConfig } from '@/types/cell'
import type { LogEntry } from '@/types/experiment'
import type { EntryResidual } from '@/stores/experimentStore'
import type { CellCalibration } from '@/stores/cellCalibrationStore'

const HEALTHY: CellConfig = {
  id: 'mcf10a', type: CELL_TYPE.HEALTHY, label: 'MCF-10A',
  radius: 9, membraneThickness: 5, naturalFrequency: 0.4, dielectricConstant: 5.0,
  conductivity: 0.5, density: 1050, thresholdVoltage: 1.0, specificHeatCapacity: 3600, amplitude: 0.7,
}
const TARGET: CellConfig = {
  id: 'mcf7', type: CELL_TYPE.TARGET, label: 'MCF-7',
  radius: 11, membraneThickness: 5, naturalFrequency: 0.5, dielectricConstant: 6.0,
  conductivity: 0.45, density: 1050, thresholdVoltage: 0.9, specificHeatCapacity: 3600, amplitude: 0.8,
}

const VIRUS_TARGET: CellConfig = {
  ...TARGET,
  id: 'sars2', label: 'SARS-CoV-2', radius: 0.05,
  resonantFreqGHz: 8.0, capsidQ: 5.0, resonantThresholdVcm: 100,
}

function makeEntry(over: Partial<LogEntry> = {}): LogEntry {
  return {
    id:           1,
    sessionName:  'Session-A',
    timestamp:    '10:00:00',
    freqKHz:      500,
    fieldVcm:     800,
    medium:       'saline',
    targetPreset: TARGET.id,
    healthyVm:    300,
    targetVm:     500,
    selectivity:  1.7,
    healthyRatio: 0.30,
    targetRatio:  0.65,
    healthyTemp:  37,
    targetTemp:   37.5,
    event:        'manual',
    chartMode:    'schwan',
    waveform:     'pulsed',
    dutyCycle:    0.001,
    pulseWidthNs: 100,
    lysisNPulses: 8,
    orientationDeg: 0,
    sigmaE:       0.14,
    ...over,
  }
}

function makeResidual(over: Partial<EntryResidual> = {}): EntryResidual {
  return {
    entryId:            1,
    timestamp:          '10:00:00',
    sessionName:        'Session-A',
    targetResidualPct:  -8,
    healthyResidualPct: 2,
    fieldResidualVcm:   null,
    ...over,
  }
}

const SCOPE_SESSION: ManuscriptScope = { type: 'session', sessionName: 'Session-A' }
const SCOPE_ALL:     ManuscriptScope = { type: 'all',     sessionName: 'Session-A' }

const CELL_CTX: ManuscriptCellContext = {
  healthy: HEALTHY, target: TARGET,
  medium: 'saline', effectiveSigmaE: 0.14, fieldIntensity: 800,
  currentBroadcastFrequency: 500, waveform: 'pulsed', dutyCycle: 0.001,
  pulseWidthNs: 100, orientationDeg: 0, chartMode: 'schwan',
}

const CALIB_NONE: ManuscriptCalibrationContext = {
  calibrations: [],
  summary: { tier: 'none', sampleCount: 0, rmseResidualPct: null,
             meanTargetResidualPct: null, meanHealthyResidualPct: null, meanFieldResidualVcm: null },
}

const CALIB_TARGET: CellCalibration = {
  cellPresetId: TARGET.id, mode: 'schwan', category: 'mammalian',
  param1Mult: 1.18, param2Mult: 0.93,
  cov11: 0.005, cov12: 0.0001, cov22: 0.003, residualStd: 0.04,
  param1Clamped: false, param2Clamped: false, param1Unident: false, param2Unident: false,
  nSamples: 8, updatedAt: Date.parse('2026-04-26T10:00:00Z'),
}

const CALIB_WITH_TARGET: ManuscriptCalibrationContext = {
  calibrations: [CALIB_TARGET],
  summary: { tier: 'moderate', sampleCount: 8, rmseResidualPct: 6.2,
             meanTargetResidualPct: -3.1, meanHealthyResidualPct: 1.2, meanFieldResidualVcm: -10 },
}

function input(over: Partial<ManuscriptInput> = {}): ManuscriptInput {
  return {
    entries:     [makeEntry({ id: 1 }), makeEntry({ id: 2, sessionName: 'Other' })],
    residuals:   [makeResidual({ entryId: 1 }), makeResidual({ entryId: 2, sessionName: 'Other' })],
    scope:       SCOPE_SESSION,
    cell:        CELL_CTX,
    calibration: CALIB_NONE,
    generatedAt: '2026-04-26T12:00:00Z',
    ...over,
  }
}

// ── Scope filtering ────────────────────────────────────────────────────────

describe('filterEntriesByScope', () => {
  it('session scope keeps only entries whose sessionName matches', () => {
    const filtered = filterEntriesByScope([
      makeEntry({ id: 1, sessionName: 'Session-A' }),
      makeEntry({ id: 2, sessionName: 'Session-B' }),
    ], SCOPE_SESSION)
    expect(filtered.map(e => e.id)).toEqual([1])
  })

  it('all scope keeps every entry', () => {
    const filtered = filterEntriesByScope([
      makeEntry({ id: 1, sessionName: 'Session-A' }),
      makeEntry({ id: 2, sessionName: 'Session-B' }),
    ], SCOPE_ALL)
    expect(filtered.map(e => e.id)).toEqual([1, 2])
  })
})

describe('filterResidualsByScope', () => {
  it('session scope drops residuals from other sessions', () => {
    const r = filterResidualsByScope([
      makeResidual({ entryId: 1, sessionName: 'Session-A' }),
      makeResidual({ entryId: 2, sessionName: 'Session-B' }),
    ], SCOPE_SESSION)
    expect(r.map(x => x.entryId)).toEqual([1])
  })
})

// ── Filename ───────────────────────────────────────────────────────────────

describe('manuscriptFilename', () => {
  it('embeds the session name when scope is session', () => {
    const fn = manuscriptFilename(SCOPE_SESSION, 'md')
    expect(fn).toMatch(/^resopulse_Session-A_/)
    expect(fn).toMatch(/\.md$/)
  })

  it('embeds "all-sessions" when scope is all', () => {
    const fn = manuscriptFilename(SCOPE_ALL, 'json')
    expect(fn).toMatch(/^resopulse_all-sessions_/)
    expect(fn).toMatch(/\.json$/)
  })
})

// ── Markdown output ────────────────────────────────────────────────────────

describe('buildManuscriptMarkdown', () => {
  it('includes the headline and scope marker', () => {
    const md = buildManuscriptMarkdown(input())
    expect(md).toContain('# ResoPulse Manuscript Bundle')
    expect(md).toContain('Session-A')
    expect(md).toContain('Schema')
  })

  it('reports entry counts after applying the session scope filter', () => {
    const md = buildManuscriptMarkdown(input())
    expect(md).toMatch(/Entries\*\*:\s*1\b/)
  })

  it('lists baseline cell biophysics for both cells', () => {
    const md = buildManuscriptMarkdown(input())
    expect(md).toContain('MCF-10A')
    expect(md).toContain('MCF-7')
    expect(md).toContain('Cytoplasm σ_i')
  })

  it('shows resonance row when target has capsid params', () => {
    const md = buildManuscriptMarkdown(input({ cell: { ...CELL_CTX, target: VIRUS_TARGET, chartMode: 'resonance' } }))
    expect(md).toContain('Resonant freq')
    expect(md).toContain('Capsid Q')
    expect(md).toContain('Acoustic Resonance')
  })

  it('renders calibration multipliers + covariance + sample count when present', () => {
    const md = buildManuscriptMarkdown(input({ calibration: CALIB_WITH_TARGET }))
    expect(md).toContain('×1.180')   // param1Mult
    expect(md).toContain('×0.930')   // param2Mult
    expect(md).toContain('n=8')
  })

  it('falls back to "no calibration row" when none exists for the active cell', () => {
    const md = buildManuscriptMarkdown(input())
    expect(md).toContain('no calibration row')
  })

  it('describes the unidentifiable flag in the calibration line when triggered', () => {
    const calClamped: ManuscriptCalibrationContext = {
      calibrations: [{ ...CALIB_TARGET, param1Unident: true }],
      summary: CALIB_WITH_TARGET.summary,
    }
    const md = buildManuscriptMarkdown(input({ calibration: calClamped }))
    expect(md).toContain('unidentifiable')
  })

  it('renders the predicted-vs-measured table when residuals exist', () => {
    const md = buildManuscriptMarkdown(input({
      entries: [makeEntry({ id: 1, measured: { measuredAt: '...', targetLysisPct: 57, healthyLysisPct: 32 } })],
      residuals: [makeResidual({ entryId: 1, targetResidualPct: -8, healthyResidualPct: 2 })],
    }))
    expect(md).toContain('Predicted vs measured')
    expect(md).toContain('57.0%')
    expect(md).toContain('32.0%')
  })

  it('includes Pennes-style honesty caveat in the methods narrative', () => {
    const md = buildManuscriptMarkdown(input())
    expect(md).toContain('Pennes-style')
    expect(md).toContain('full Pennes PDE is out of scope')
  })

  it('cites Tsen + Dykeman references on the resonance path', () => {
    const md = buildManuscriptMarkdown(input({ cell: { ...CELL_CTX, target: VIRUS_TARGET, chartMode: 'resonance' } }))
    expect(md).toContain('Tsen')
    expect(md).toContain('Dykeman')
  })
})

// ── JSON output ────────────────────────────────────────────────────────────

describe('buildManuscriptJson', () => {
  it('is JSON-serialisable and round-trips', () => {
    const obj = buildManuscriptJson(input())
    const round = JSON.parse(JSON.stringify(obj))
    expect(round.app).toBe('ResoPulse')
    expect(round.schema).toBe('1.0.0')
  })

  it('embeds the active scope marker', () => {
    const obj = buildManuscriptJson(input({ scope: SCOPE_ALL })) as { scope: ManuscriptScope }
    expect(obj.scope.type).toBe('all')
  })

  it('filters entries by scope', () => {
    const obj = buildManuscriptJson(input()) as { entries: LogEntry[] }
    expect(obj.entries).toHaveLength(1)
  })

  it('includes only calibration rows for the active cell pair', () => {
    const otherCal: CellCalibration = { ...CALIB_TARGET, cellPresetId: 'unrelated-preset' }
    const obj = buildManuscriptJson(input({
      calibration: { ...CALIB_WITH_TARGET, calibrations: [CALIB_TARGET, otherCal] },
    })) as { calibration: { fits: CellCalibration[] } }
    expect(obj.calibration.fits.map(f => f.cellPresetId)).toEqual([TARGET.id])
  })
})

// ── Residuals CSV output ──────────────────────────────────────────────────

describe('buildResidualsCsv', () => {
  it('produces a header row even when no residuals are scoped in', () => {
    const csv = buildResidualsCsv(input({ entries: [], residuals: [] }))
    expect(csv.split('\n')[0]).toContain('entryId')
    expect(csv.split('\n')).toHaveLength(1)
  })

  it('includes only residuals with at least one non-null measurement', () => {
    const csv = buildResidualsCsv(input({
      residuals: [
        makeResidual({ entryId: 1 }),                                            // has both
        makeResidual({ entryId: 2, targetResidualPct: null, healthyResidualPct: null, fieldResidualVcm: null }),  // empty
      ],
    }))
    const dataRows = csv.split('\n').slice(1).filter(Boolean)
    expect(dataRows).toHaveLength(1)
  })

  it('escapes commas / quotes / newlines in session names', () => {
    const csv = buildResidualsCsv(input({
      entries: [makeEntry({ id: 1, sessionName: 'Session, "weird"' })],
      residuals: [makeResidual({ entryId: 1, sessionName: 'Session, "weird"' })],
      scope: { type: 'all', sessionName: 'Session, "weird"' },
    }))
    const dataRow = csv.split('\n')[1]!
    expect(dataRow).toContain('"Session, ""weird"""')
  })

  it('emits predicted DR / measured lysis pp / residual pp side-by-side', () => {
    const csv = buildResidualsCsv(input({
      entries: [makeEntry({ id: 1, measured: { measuredAt: '...', targetLysisPct: 57, healthyLysisPct: 32 } })],
      residuals: [makeResidual({ entryId: 1, targetResidualPct: -8, healthyResidualPct: 2 })],
    }))
    expect(csv).toContain('predictedTargetDR')
    expect(csv).toContain('measuredTargetLysisPct')
    expect(csv).toContain('targetResidualPP')
    const dataRow = csv.split('\n')[1]!
    expect(dataRow).toContain('0.65')   // predicted DR_T
    expect(dataRow).toContain('57')     // measured T-lysis %
    expect(dataRow).toContain('-8')     // residual
  })
})
