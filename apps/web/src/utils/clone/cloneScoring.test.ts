// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

import { describe, it, expect } from 'vitest'

import { rankClones, predictLongTermTiter, CLONE_WEIGHTS } from './cloneScoring'

import { GENETIC_STABILITY, STABILITY_RISK, type CloneScreeningData } from '@/types/clone'

function clone(over: Partial<CloneScreeningData> = {}): CloneScreeningData {
  return {
    id: over.id ?? 'x',
    label: 'C',
    titerDay3GL: 0.4, titerDay7GL: 1.5, titerDay14GL: 4.0,
    peakVcdE6: 16, viabilityPct: 90,
    geneticStability: GENETIC_STABILITY.STABLE, aggregatePct: 2.5,
    ...over,
  }
}

describe('rankClones', () => {
  it('returns empty for no clones', () => {
    expect(rankClones([])).toEqual([])
  })

  it('sorts by composite score descending', () => {
    const ranked = rankClones([
      clone({ id: 'a', titerDay14GL: 2.0 }),
      clone({ id: 'b', titerDay14GL: 6.0 }),
      clone({ id: 'c', titerDay14GL: 4.0 }),
    ])
    for (let i = 1; i < ranked.length; i++) {
      expect(ranked[i]!.composite).toBeLessThanOrEqual(ranked[i - 1]!.composite)
    }
  })

  it('penalizes an unstable high-titer clone below a stable one', () => {
    const ranked = rankClones([
      clone({ id: 'stable', titerDay14GL: 4.5, geneticStability: GENETIC_STABILITY.STABLE, aggregatePct: 2 }),
      clone({ id: 'unstable', titerDay14GL: 6.0, geneticStability: GENETIC_STABILITY.UNSTABLE, aggregatePct: 8 }),
    ])
    // The stable clone should win despite lower raw titer, because stability+quality weigh heavily.
    expect(ranked[0]!.cloneId).toBe('stable')
  })

  it('flags high stability risk for unstable clones', () => {
    const ranked = rankClones([clone({ id: 'u', geneticStability: GENETIC_STABILITY.UNSTABLE })])
    expect(ranked[0]!.stabilityRisk).toBe(STABILITY_RISK.HIGH)
  })

  it('keeps composite scores within [0, 1]', () => {
    const ranked = rankClones([clone({ titerDay14GL: 10, peakVcdE6: 40, viabilityPct: 99, aggregatePct: 0 })])
    expect(ranked[0]!.composite).toBeGreaterThanOrEqual(0)
    expect(ranked[0]!.composite).toBeLessThanOrEqual(1)
  })

  it('weights sum to 1.0', () => {
    const total = CLONE_WEIGHTS.PRODUCTIVITY + CLONE_WEIGHTS.STABILITY + CLONE_WEIGHTS.GROWTH + CLONE_WEIGHTS.QUALITY
    expect(total).toBeCloseTo(1.0, 6)
  })
})

describe('predictLongTermTiter', () => {
  it('projects a stable clone retaining most of its titer', () => {
    const t = predictLongTermTiter(clone({ titerDay14GL: 5, geneticStability: GENETIC_STABILITY.STABLE }))
    expect(t).toBeGreaterThan(4)
    expect(t).toBeLessThanOrEqual(5)
  })

  it('projects an unstable clone losing significant titer', () => {
    const stable   = predictLongTermTiter(clone({ titerDay14GL: 5, geneticStability: GENETIC_STABILITY.STABLE }))
    const unstable = predictLongTermTiter(clone({ titerDay14GL: 5, geneticStability: GENETIC_STABILITY.UNSTABLE }))
    expect(unstable).toBeLessThan(stable)
  })
})
