// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

import { describe, it, expect } from 'vitest'

import { MOLECULE_TYPE } from '@/constants/moleculeTypes'

import { computeDevelopabilityScore, DEVELOPABILITY_AXES } from './score'

describe('computeDevelopabilityScore', () => {
  it('returns unavailable result when no cell line is selected', () => {
    const r = computeDevelopabilityScore(null, MOLECULE_TYPE.MAB)
    expect(r.available).toBe(false)
    expect(r.composite).toBe(0)
  })

  it('returns unavailable result when cell line id is unknown', () => {
    const r = computeDevelopabilityScore('not-real', MOLECULE_TYPE.MAB)
    expect(r.available).toBe(false)
  })

  it('returns a composite score in the [0, 1] range', () => {
    const r = computeDevelopabilityScore('cho-k1', MOLECULE_TYPE.MAB)
    expect(r.composite).toBeGreaterThanOrEqual(0)
    expect(r.composite).toBeLessThanOrEqual(1)
  })

  it('returns all four axes with values in the [0, 1] range', () => {
    const r = computeDevelopabilityScore('cho-k1', MOLECULE_TYPE.MAB)
    for (const axis of DEVELOPABILITY_AXES) {
      expect(r.axes[axis]).toBeGreaterThanOrEqual(0)
      expect(r.axes[axis]).toBeLessThanOrEqual(1)
    }
  })

  it('composite equals the equal-weighted mean of the four axes', () => {
    const r = computeDevelopabilityScore('cho-k1', MOLECULE_TYPE.MAB)
    const mean = (r.axes.productivity + r.axes.stability + r.axes.scalability + r.axes.regulatory) / 4
    expect(r.composite).toBeCloseTo(mean, 5)
  })

  it('scores CHO-K1 (established mAb platform) above 0.6 for mAb production', () => {
    const r = computeDevelopabilityScore('cho-k1', MOLECULE_TYPE.MAB)
    expect(r.composite).toBeGreaterThan(0.6)
  })

  it('ranks bacterial scalability higher than insect scalability', () => {
    const ecoli  = computeDevelopabilityScore('bl21-de3', MOLECULE_TYPE.RECOMBINANT_PROTEIN)
    const sf9    = computeDevelopabilityScore('sf9',      MOLECULE_TYPE.VACCINE_ANTIGEN)
    expect(ecoli.axes.scalability).toBeGreaterThan(sf9.axes.scalability)
  })

  it('returns rationale strings for every axis when score is available', () => {
    const r = computeDevelopabilityScore('cho-k1', MOLECULE_TYPE.MAB)
    for (const axis of DEVELOPABILITY_AXES) {
      expect(r.rationale[axis].length).toBeGreaterThan(0)
    }
  })
})
