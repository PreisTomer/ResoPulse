// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

import { describe, it, expect } from 'vitest'

import {
  computeDepForceN,
  computeMitoticExposureIndex,
  isSubThresholdField,
  computeDepCmReal,
} from '@/utils/physics'

import { TARGET_CELL, SIGMA_E } from '@/utils/physics/testFixtures'

import { EPSILON_R_MEDIUM_WATER, TTF_INDEX_REF_PN_HR } from '@/constants/physics'

describe('computeDepForceN', () => {
  it('scales linearly with Re[K]', () => {
    const f1 = computeDepForceN(0.10, 10, EPSILON_R_MEDIUM_WATER, 1e10)
    const f2 = computeDepForceN(0.20, 10, EPSILON_R_MEDIUM_WATER, 1e10)
    expect(f2 / f1).toBeCloseTo(2, 6)
  })

  it('scales with R³', () => {
    const small = computeDepForceN(0.1, 5,  EPSILON_R_MEDIUM_WATER, 1e10)
    const large = computeDepForceN(0.1, 10, EPSILON_R_MEDIUM_WATER, 1e10)
    expect(large / small).toBeCloseTo(8, 6)   // (10/5)³ = 8
  })

  it('flips sign with Re[K] sign', () => {
    const pos = computeDepForceN( 0.20, 10, EPSILON_R_MEDIUM_WATER, 1e10)
    const neg = computeDepForceN(-0.20, 10, EPSILON_R_MEDIUM_WATER, 1e10)
    expect(pos).toBeGreaterThan(0)
    expect(neg).toBeLessThan(0)
    expect(Math.abs(pos)).toBeCloseTo(Math.abs(neg), 12)
  })

  it('returns 0 for non-positive radius (defensive)', () => {
    expect(computeDepForceN(0.1, 0,  EPSILON_R_MEDIUM_WATER, 1e10)).toBe(0)
    expect(computeDepForceN(0.1, -1, EPSILON_R_MEDIUM_WATER, 1e10)).toBe(0)
  })

  it('produces order-of-magnitude pN forces for typical TTFields conditions', () => {
    // E = 2 V/cm = 200 V/m → |E|² = 4e4 (V/m)². ∇|E|² ≈ |E|²/L_grad with L_grad = 1 mm → 4e7.
    const reK = computeDepCmReal(TARGET_CELL, 200, SIGMA_E, EPSILON_R_MEDIUM_WATER)
    const f   = computeDepForceN(reK, TARGET_CELL.radius, EPSILON_R_MEDIUM_WATER, 4e7)
    const fpN = Math.abs(f) * 1e12
    expect(fpN).toBeGreaterThan(1e-5)
    expect(fpN).toBeLessThan(100)
  })
})

describe('isSubThresholdField', () => {
  it('reports sub-threshold for typical TTFields-style conditions (200 kHz, 2 V/cm)', () => {
    expect(isSubThresholdField(TARGET_CELL, 200, 2, SIGMA_E)).toBe(true)
  })

  it('reports above-threshold for an IRE field (1 kHz, 1500 V/cm)', () => {
    expect(isSubThresholdField(TARGET_CELL, 1, 1500, SIGMA_E)).toBe(false)
  })

  it('higher frequency raises sub-threshold safe-field ceiling (Schwan ωτ rolloff)', () => {
    // 1000 V/cm × 10 µm × 1.5 plateau ≈ 1.5 V — over 1.0 V threshold at quasi-DC.
    // At 500 kHz the Schwan ωτ rolloff drops |Vm| below threshold.
    const lowFreqOk  = isSubThresholdField(TARGET_CELL, 10,  1000, SIGMA_E)
    const highFreqOk = isSubThresholdField(TARGET_CELL, 500, 1000, SIGMA_E)
    expect(lowFreqOk).toBe(false)
    expect(highFreqOk).toBe(true)
  })
})

describe('computeMitoticExposureIndex', () => {
  it('returns 1.0 when |F|·duration matches the reference (10 pN × 10 hr)', () => {
    const f10pN = 10e-12
    const idx = computeMitoticExposureIndex(f10pN, 10, TTF_INDEX_REF_PN_HR)
    expect(idx).toBeCloseTo(1, 9)
  })

  it('grows linearly in duration', () => {
    const f = 5e-12
    const i10  = computeMitoticExposureIndex(f, 10,  TTF_INDEX_REF_PN_HR)
    const i100 = computeMitoticExposureIndex(f, 100, TTF_INDEX_REF_PN_HR)
    expect(i100 / i10).toBeCloseTo(10, 6)
  })

  it('grows linearly in |force|', () => {
    const ia = computeMitoticExposureIndex(1e-12,  24, TTF_INDEX_REF_PN_HR)
    const ib = computeMitoticExposureIndex(10e-12, 24, TTF_INDEX_REF_PN_HR)
    expect(ib / ia).toBeCloseTo(10, 6)
  })

  it('treats negative DEP (repulsive) the same magnitude as positive DEP', () => {
    const pos = computeMitoticExposureIndex( 5e-12, 24, TTF_INDEX_REF_PN_HR)
    const neg = computeMitoticExposureIndex(-5e-12, 24, TTF_INDEX_REF_PN_HR)
    expect(pos).toBeCloseTo(neg, 12)
  })

  it('returns 0 for non-positive duration (defensive)', () => {
    expect(computeMitoticExposureIndex(5e-12,  0, TTF_INDEX_REF_PN_HR)).toBe(0)
    expect(computeMitoticExposureIndex(5e-12, -1, TTF_INDEX_REF_PN_HR)).toBe(0)
  })

  it('returns 0 for non-positive reference (defensive)', () => {
    expect(computeMitoticExposureIndex(5e-12, 24,  0)).toBe(0)
    expect(computeMitoticExposureIndex(5e-12, 24, -1)).toBe(0)
  })
})
