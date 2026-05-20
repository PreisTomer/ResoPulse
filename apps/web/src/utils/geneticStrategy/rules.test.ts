// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

import { describe, it, expect } from 'vitest'

import { MOLECULE_TYPE } from '@/constants/moleculeTypes'

import { recommendStrategy } from './rules'

describe('recommendStrategy', () => {
  it('returns no-cell-line warning when cellLineId is null', () => {
    const r = recommendStrategy(null, MOLECULE_TYPE.MAB)
    expect(r.warnings).toContain('No cell line selected.')
    expect(r.primaryVector).toBeNull()
  })

  it('returns a primary vector for CHO-K1 mAb production', () => {
    const r = recommendStrategy('cho-k1', MOLECULE_TYPE.MAB)
    expect(r.primaryVector).not.toBeNull()
    expect(r.primaryVector?.compatibleHostCells).toContain('cho-k1')
  })

  it('recommends codon optimization for E. coli proteins', () => {
    const r = recommendStrategy('bl21-de3', MOLECULE_TYPE.RECOMBINANT_PROTEIN)
    expect(r.codonOptimization.recommended).toBe(true)
  })

  it('does not require codon optimization for mammalian therapeutic proteins', () => {
    const r = recommendStrategy('cho-k1', MOLECULE_TYPE.MAB)
    expect(r.codonOptimization.recommended).toBe(false)
  })

  it('recommends alpha-mating factor for Pichia secretion', () => {
    const r = recommendStrategy('pichia-gs115', MOLECULE_TYPE.RECOMBINANT_PROTEIN)
    expect(r.secretionSignal.value).toContain('alpha-mating')
  })

  it('warns when bacterial host is chosen for a mAb (no glycosylation)', () => {
    const r = recommendStrategy('bl21-de3', MOLECULE_TYPE.MAB)
    expect(r.warnings.some(w => w.includes('does not glycosylate') || w.includes('No vector'))).toBe(true)
  })

  it('returns transient expression mode for transient-only cell lines', () => {
    const r = recommendStrategy('expi293f', MOLECULE_TYPE.MAB)
    expect(r.expressionMode).toBe('transient')
  })

  it('returns stable expression mode for CHO-DG44 (stable-only)', () => {
    const r = recommendStrategy('cho-dg44', MOLECULE_TYPE.MAB)
    expect(r.expressionMode).toBe('stable')
  })

  it('handles unknown cell line id gracefully', () => {
    const r = recommendStrategy('not-a-real-cell', MOLECULE_TYPE.MAB)
    expect(r.primaryVector).toBeNull()
    expect(r.warnings.length).toBeGreaterThan(0)
  })
})
