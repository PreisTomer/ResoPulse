// Copyright © 2026 Tomer Preis. Licensed under the MIT License.
import { describe, it, expect } from 'vitest'

import { buildSampleMeasuredCsv } from './index'
import { parseMeasuredCsv } from '@/utils/experimentImport'

describe('buildSampleMeasuredCsv', () => {
  it('round-trips through parseMeasuredCsv with both example rows imported', () => {
    const text   = buildSampleMeasuredCsv()
    const report = parseMeasuredCsv(text)
    expect(report.matchable.map(r => r.id)).toEqual([1, 2])
    expect(report.ignoredRows).toHaveLength(0)
    expect(report.duplicateIds).toHaveLength(0)
  })

  it('preserves measured fields for each row', () => {
    const report = parseMeasuredCsv(buildSampleMeasuredCsv())
    const r1 = report.matchable.find(r => r.id === 1)!
    expect(r1.measured.targetLysisPct).toBeCloseTo(62.3, 1)
    expect(r1.measured.viabilityAssay).toBe('flowPi')
    expect(r1.measured.qpcrTarget).toBe('GFP')
  })

  it('opens with metadata "# " comment lines describing the schema', () => {
    const text  = buildSampleMeasuredCsv()
    const lines = text.split('\n')
    expect(lines[0]!.startsWith('# ')).toBe(true)
    expect(lines.filter(l => l.startsWith('# ')).length).toBeGreaterThanOrEqual(3)
  })
})
