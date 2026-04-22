// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { describe, it, expect } from 'vitest'

import { parseMeasuredCsv } from './index'

describe('parseMeasuredCsv', () => {
  it('returns an empty report for blank text', () => {
    const report = parseMeasuredCsv('')
    expect(report.rowsSeen).toBe(0)
    expect(report.rowsWithMeasuredData).toBe(0)
    expect(report.matchable).toEqual([])
  })

  it('returns an empty report when there is no data row', () => {
    const report = parseMeasuredCsv('#,T-Lysis measured (%)\n')
    expect(report.rowsSeen).toBe(0)
    expect(report.matchable).toEqual([])
  })

  it('flags missing id column', () => {
    const text = 'foo,bar\n1,2\n'
    const report = parseMeasuredCsv(text)
    expect(report.ignoredRows).toContainEqual({ row: 0, reason: 'no id / # column' })
    expect(report.matchable).toEqual([])
  })

  it('strips comment (#-prefixed) meta lines before parsing', () => {
    const text = [
      '# Session: Lab A',
      '# Sample: HepG2 passage 12',
      '#,T-Lysis measured (%)',
      '3,47.2',
    ].join('\n')
    const report = parseMeasuredCsv(text)
    expect(report.matchable).toHaveLength(1)
    expect(report.matchable[0]!.id).toBe(3)
    expect(report.matchable[0]!.measured.targetLysisPct).toBe(47.2)
  })

  it('parses target / healthy / viability / permeabilized / transfection columns', () => {
    const text = [
      '#,T-Lysis measured (%),H-Lysis measured (%),Viability measured (%),Permeabilized measured (%),Transfection measured (%)',
      '1,80,12,88,75,42',
    ].join('\n')
    const report = parseMeasuredCsv(text)
    expect(report.matchable).toHaveLength(1)
    expect(report.matchable[0]!.measured).toMatchObject({
      targetLysisPct:   80,
      healthyLysisPct:  12,
      viabilityPct:     88,
      permeabilizedPct: 75,
      transfectionPct:  42,
    })
  })

  it('accepts shorthand and case-insensitive header aliases', () => {
    const text = [
      '#,Target Lysis %,HEALTHY LYSIS %,viability %,PI+ (%),GFP+ (%)',
      '2,77,9,92,68,30',
    ].join('\n')
    const report = parseMeasuredCsv(text)
    expect(report.matchable[0]!.measured).toMatchObject({
      targetLysisPct:   77,
      healthyLysisPct:  9,
      viabilityPct:     92,
      permeabilizedPct: 68,
      transfectionPct:  30,
    })
  })

  it('parses viability assay and timepoint', () => {
    const text = [
      '#,Viability assay,Assay timepoint (h)',
      '4,flowPi,24',
    ].join('\n')
    const report = parseMeasuredCsv(text)
    expect(report.matchable[0]!.measured).toMatchObject({
      viabilityAssay:  'flowPi',
      assayTimepointH: 24,
    })
  })

  it('rejects an unknown assay method', () => {
    const text = [
      '#,Viability assay,T-Lysis measured (%)',
      '5,glowstick,70',
    ].join('\n')
    const report = parseMeasuredCsv(text)
    expect(report.matchable).toHaveLength(1)
    expect(report.matchable[0]!.measured.viabilityAssay).toBeUndefined()
    expect(report.matchable[0]!.measured.targetLysisPct).toBe(70)
  })

  it('captures on-bench conditions: temp, actual field, observed lysis delay', () => {
    const text = [
      '#,Temp measured (°C),Actual field measured (V/cm),Lysis delay measured (ms)',
      '6,41.2,1480,312',
    ].join('\n')
    const report = parseMeasuredCsv(text)
    expect(report.matchable[0]!.measured).toMatchObject({
      tempC:                41.2,
      actualFieldVcm:       1480,
      observedLysisDelayMs: 312,
    })
  })

  it('captures free-form measured notes', () => {
    const text = [
      '#,Measured notes',
      '7,"electrode arced on pulse 3, cuvette reused"',
    ].join('\n')
    const report = parseMeasuredCsv(text)
    expect(report.matchable[0]!.measured.notes).toBe('electrode arced on pulse 3, cuvette reused')
  })

  it('handles embedded commas and escaped quotes inside quoted fields', () => {
    const text = [
      '#,Measured notes',
      '8,"value ""with"" quotes, and a comma"',
    ].join('\n')
    const report = parseMeasuredCsv(text)
    expect(report.matchable[0]!.measured.notes).toBe('value "with" quotes, and a comma')
  })

  it('skips rows with non-numeric ids', () => {
    const text = [
      '#,T-Lysis measured (%)',
      'abc,50',
      '9,60',
    ].join('\n')
    const report = parseMeasuredCsv(text)
    expect(report.matchable).toHaveLength(1)
    expect(report.matchable[0]!.id).toBe(9)
    expect(report.ignoredRows.some(r => r.reason.includes('non-numeric id'))).toBe(true)
  })

  it('ignores rows where every measured column is blank', () => {
    const text = [
      '#,T-Lysis measured (%),H-Lysis measured (%),Viability (%)',
      '10,,,',
      '11,55,,',
    ].join('\n')
    const report = parseMeasuredCsv(text)
    expect(report.rowsSeen).toBe(2)
    expect(report.rowsWithMeasuredData).toBe(1)
    expect(report.matchable).toHaveLength(1)
    expect(report.matchable[0]!.id).toBe(11)
  })

  it('ignores unparseable numeric cells without dropping the row when other columns parse', () => {
    const text = [
      '#,T-Lysis measured (%),Viability (%)',
      '12,not-a-number,88',
    ].join('\n')
    const report = parseMeasuredCsv(text)
    expect(report.matchable).toHaveLength(1)
    expect(report.matchable[0]!.measured.targetLysisPct).toBeUndefined()
    expect(report.matchable[0]!.measured.viabilityPct).toBe(88)
  })

  it('tolerates trailing blank lines and mixed CRLF line endings', () => {
    const text = '#,T-Lysis measured (%)\r\n13,66\r\n\r\n'
    const report = parseMeasuredCsv(text)
    expect(report.matchable).toHaveLength(1)
    expect(report.matchable[0]!.id).toBe(13)
    expect(report.matchable[0]!.measured.targetLysisPct).toBe(66)
  })
})
