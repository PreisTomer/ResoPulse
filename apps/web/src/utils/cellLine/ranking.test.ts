// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

import { describe, it, expect } from 'vitest'

import { MOLECULE_TYPE } from '@/constants/moleculeTypes'

import { rankCellLines, getRankForCellLine, RANKING_WEIGHTS } from './ranking'

describe('rankCellLines', () => {
  it('returns only cell lines compatible with the requested molecule type', () => {
    const ranked = rankCellLines(MOLECULE_TYPE.MAB)
    expect(ranked.length).toBeGreaterThan(0)
    for (const r of ranked) {
      expect(r.cellLine.compatibleMoleculeTypes).toContain(MOLECULE_TYPE.MAB)
    }
  })

  it('sorts results by fit score descending', () => {
    const ranked = rankCellLines(MOLECULE_TYPE.MAB)
    for (let i = 1; i < ranked.length; i++) {
      const current = ranked[i]!
      const prev    = ranked[i - 1]!
      expect(current.fitScore).toBeLessThanOrEqual(prev.fitScore)
    }
  })

  it('ranks CHO lines highest for mAb (industry-standard host)', () => {
    const ranked = rankCellLines(MOLECULE_TYPE.MAB)
    const topThreeIds = ranked.slice(0, 3).map(r => r.cellLine.id)
    expect(topThreeIds.some(id => id.startsWith('cho-'))).toBe(true)
  })

  it('places HEK293T in the top three candidates for viral vector production', () => {
    const ranked = rankCellLines(MOLECULE_TYPE.VIRAL_VECTOR)
    const topThreeIds = ranked.slice(0, 3).map(r => r.cellLine.id)
    expect(topThreeIds).toContain('hek293t')
  })

  it('places Sf9 in the top three candidates for viral vector production (baculovirus path)', () => {
    const ranked = rankCellLines(MOLECULE_TYPE.VIRAL_VECTOR)
    const topThreeIds = ranked.slice(0, 3).map(r => r.cellLine.id)
    expect(topThreeIds).toContain('sf9')
  })

  it('ranks E. coli highly for plasmid DNA production', () => {
    const ranked = rankCellLines(MOLECULE_TYPE.PLASMID_DNA)
    expect(ranked.length).toBeGreaterThan(0)
    expect(ranked[0]!.cellLine.id).toBe('bl21-de3')
  })

  it('excludes E. coli from monoclonal antibody candidates (cannot glycosylate)', () => {
    const ranked = rankCellLines(MOLECULE_TYPE.MAB)
    const ids = ranked.map(r => r.cellLine.id)
    expect(ids).not.toContain('bl21-de3')
  })

  it('produces fit scores in the [0, 1] range', () => {
    const ranked = rankCellLines(MOLECULE_TYPE.MAB)
    for (const r of ranked) {
      expect(r.fitScore).toBeGreaterThanOrEqual(0)
      expect(r.fitScore).toBeLessThanOrEqual(1)
    }
  })

  it('returns empty array for a molecule type with no compatible cells', () => {
    const ranked = rankCellLines(MOLECULE_TYPE.OTHER)
    expect(ranked).toEqual([])
  })

  it('assigns productivity score 1.0 to the highest-titer cell line for that molecule', () => {
    const ranked = rankCellLines(MOLECULE_TYPE.MAB)
    const maxProductivityScore = Math.max(...ranked.map(r => r.productivityScore))
    expect(maxProductivityScore).toBeCloseTo(1, 5)
  })

  it('includes at most 3 reason chips per cell line', () => {
    const ranked = rankCellLines(MOLECULE_TYPE.MAB)
    for (const r of ranked) {
      expect(r.reasons.length).toBeLessThanOrEqual(3)
    }
  })

  it('weights productivity, regulatory, and confidence summing to 1.0', () => {
    const total = RANKING_WEIGHTS.PRODUCTIVITY + RANKING_WEIGHTS.REGULATORY + RANKING_WEIGHTS.CONFIDENCE
    expect(total).toBeCloseTo(1.0, 6)
  })
})

describe('getRankForCellLine', () => {
  it('returns the rank entry for a specific compatible cell line', () => {
    const r = getRankForCellLine(MOLECULE_TYPE.MAB, 'cho-k1')
    expect(r).not.toBeNull()
    expect(r?.cellLine.id).toBe('cho-k1')
  })

  it('returns null for an incompatible cell line', () => {
    const r = getRankForCellLine(MOLECULE_TYPE.MAB, 'bl21-de3')
    expect(r).toBeNull()
  })

  it('returns null for a nonexistent cell line id', () => {
    const r = getRankForCellLine(MOLECULE_TYPE.MAB, 'not-a-real-cell-line')
    expect(r).toBeNull()
  })
})
