// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
import { describe, it, expect } from 'vitest'

import { suggestNextProtocol, suggestNextProtocols } from './index'
import type { SliderRange } from '@/constants/sliderBounds'
import type { LogEntry } from '@/types/experiment'

const BOUNDS: SliderRange = {
  freqMin: 10, freqMax: 100_000, freqStep: 10,
  fieldMin: 10, fieldMax: 3_000, fieldStep: 1,
  pwLogMin: 0, pwLogMax: 5,
}

function makeEntry(id: number, freqKHz: number, fieldVcm: number, measured = true): LogEntry {
  return {
    id,
    timestamp:    '00:00:00',
    freqKHz,
    fieldVcm,
    medium:       'saline',
    targetPreset: 'adenocarcinoma',
    healthyVm:    0, targetVm: 0, selectivity: 1,
    healthyRatio: 0, targetRatio: 0,
    healthyTemp:  37, targetTemp: 37,
    event:        'manual',
    ...(measured && { measured: { targetLysisPct: 50, measuredAt: '2026-01-01T00:00:00Z' } }),
  }
}

describe('suggestNextProtocol', () => {
  it('returns a cold-start suggestion at the geometric midpoint when no measured entries exist', () => {
    const s = suggestNextProtocol([], BOUNDS)
    expect(s.strategy).toBe('cold-start')
    expect(s.freqKHz).toBe(Math.round(Math.sqrt(BOUNDS.freqMin * BOUNDS.freqMax)))
    expect(s.fieldVcm).toBe(Math.round(Math.sqrt(BOUNDS.fieldMin * BOUNDS.fieldMax)))
    expect(s.dutyCycle).toBeGreaterThan(0)
  })

  it('ignores log entries without a measured outcome (treats them as cold-start)', () => {
    const entries = [makeEntry(1, 100, 500, false), makeEntry(2, 200, 800, false)]
    const s = suggestNextProtocol(entries, BOUNDS)
    expect(s.strategy).toBe('cold-start')
  })

  it('in space-filling mode, suggests a point far from all measured entries in log-space', () => {
    const measured = [
      makeEntry(1, BOUNDS.freqMin,  BOUNDS.fieldMin),
      makeEntry(2, BOUNDS.freqMin,  BOUNDS.fieldMin * 2),
    ]
    const s = suggestNextProtocol(measured, BOUNDS)
    expect(s.strategy).toBe('space-filling')
    expect(s.freqKHz).toBeGreaterThan(BOUNDS.freqMin)
    expect(s.fieldVcm).toBeGreaterThan(BOUNDS.fieldMin)
  })

  it('keeps suggestions within the slider bounds', () => {
    const entries = [
      makeEntry(1, BOUNDS.freqMin, BOUNDS.fieldMin),
      makeEntry(2, BOUNDS.freqMax, BOUNDS.fieldMax),
    ]
    const s = suggestNextProtocol(entries, BOUNDS)
    expect(s.freqKHz).toBeGreaterThanOrEqual(BOUNDS.freqMin)
    expect(s.freqKHz).toBeLessThanOrEqual(BOUNDS.freqMax)
    expect(s.fieldVcm).toBeGreaterThanOrEqual(BOUNDS.fieldMin)
    expect(s.fieldVcm).toBeLessThanOrEqual(BOUNDS.fieldMax)
  })

  it('reports the measurement count on space-filling picks for honest UI labelling', () => {
    const entries = [makeEntry(1, 100, 500), makeEntry(2, 300, 1000), makeEntry(3, 1000, 200)]
    const s = suggestNextProtocol(entries, BOUNDS)
    expect(s.strategy).toBe('space-filling')
    expect(s.measuredCount).toBe(3)
  })

  it('reports measuredCount=0 on a cold-start pick', () => {
    const s = suggestNextProtocol([], BOUNDS)
    expect(s.strategy).toBe('cold-start')
    expect(s.measuredCount).toBe(0)
  })
})

describe('suggestNextProtocols — top-N batch', () => {
  it('returns three diverse space-filling picks when measured data exists', () => {
    const entries = [makeEntry(1, 100, 500), makeEntry(2, 300, 1000)]
    const picks = suggestNextProtocols(entries, BOUNDS, 3)
    expect(picks).toHaveLength(3)
    expect(picks.every(p => p.strategy === 'space-filling')).toBe(true)
  })

  it('picks do not collapse into a single region (epsilon exclusion)', () => {
    const entries = [makeEntry(1, BOUNDS.freqMin, BOUNDS.fieldMin)]
    const picks = suggestNextProtocols(entries, BOUNDS, 3)
    const keys = new Set(picks.map(p => `${p.freqKHz}|${p.fieldVcm}`))
    expect(keys.size).toBe(picks.length)
  })

  it('every pick respects the slider bounds', () => {
    const entries = [makeEntry(1, BOUNDS.freqMin, BOUNDS.fieldMin)]
    for (const p of suggestNextProtocols(entries, BOUNDS, 3)) {
      expect(p.freqKHz).toBeGreaterThanOrEqual(BOUNDS.freqMin)
      expect(p.freqKHz).toBeLessThanOrEqual(BOUNDS.freqMax)
      expect(p.fieldVcm).toBeGreaterThanOrEqual(BOUNDS.fieldMin)
      expect(p.fieldVcm).toBeLessThanOrEqual(BOUNDS.fieldMax)
      expect(p.dutyCycle).toBeGreaterThan(0)
      expect(p.dutyCycle).toBeLessThanOrEqual(1)
    }
  })

  it('falls back to a single cold-start pick when no measured entries exist', () => {
    const picks = suggestNextProtocols([], BOUNDS, 3)
    expect(picks).toHaveLength(1)
    expect(picks[0]!.strategy).toBe('cold-start')
  })
})
