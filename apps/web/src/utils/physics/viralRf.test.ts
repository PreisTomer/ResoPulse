// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

import { describe, it, expect } from 'vitest'

import {
  computeMediumDebyeSAR,
  computeViralRfPredictedDR,
  viralRfMarginFraction,
} from '@/utils/physics'

import { TARGET_CELL, SIGMA_E } from '@/utils/physics/testFixtures'

import {
  EPSILON_R_MEDIUM_WATER,
  RHO_AQUEOUS_KG_M3,
  IEEE_PUBLIC_SAR_LIMIT_W_KG,
  IEEE_OCCUPATIONAL_SAR_LIMIT_W_KG,
} from '@/constants/physics'

import type { CellConfig } from '@/types/cell'

const VIRAL_TARGET: CellConfig & { resonantFreqGHz: number; capsidQ: number; resonantThresholdVcm: number } = {
  ...TARGET_CELL,
  resonantFreqGHz:        8.4,    // SARS-CoV-2 capsid-resonance literature midpoint
  capsidQ:                30,
  resonantThresholdVcm:   100,
}

describe('computeMediumDebyeSAR', () => {
  it('returns 0 for non-positive sigma_e (defensive)', () => {
    expect(computeMediumDebyeSAR(0,  8, EPSILON_R_MEDIUM_WATER, 50, RHO_AQUEOUS_KG_M3)).toBe(0)
    expect(computeMediumDebyeSAR(-1, 8, EPSILON_R_MEDIUM_WATER, 50, RHO_AQUEOUS_KG_M3)).toBe(0)
  })

  it('returns 0 for non-positive density (defensive)', () => {
    expect(computeMediumDebyeSAR(SIGMA_E, 8, EPSILON_R_MEDIUM_WATER, 50,  0)).toBe(0)
    expect(computeMediumDebyeSAR(SIGMA_E, 8, EPSILON_R_MEDIUM_WATER, 50, -1)).toBe(0)
  })

  it('returns 0 for non-positive frequency (defensive)', () => {
    expect(computeMediumDebyeSAR(SIGMA_E, 0, EPSILON_R_MEDIUM_WATER, 50, RHO_AQUEOUS_KG_M3)).toBe(0)
  })

  it('scales with E²', () => {
    const lo = computeMediumDebyeSAR(SIGMA_E, 8, EPSILON_R_MEDIUM_WATER, 10, RHO_AQUEOUS_KG_M3)
    const hi = computeMediumDebyeSAR(SIGMA_E, 8, EPSILON_R_MEDIUM_WATER, 20, RHO_AQUEOUS_KG_M3)
    expect(hi / lo).toBeCloseTo(4, 6)
  })

  it('grows with frequency in the GHz range due to Debye loss', () => {
    const at1  = computeMediumDebyeSAR(SIGMA_E, 1,  EPSILON_R_MEDIUM_WATER, 30, RHO_AQUEOUS_KG_M3)
    const at8  = computeMediumDebyeSAR(SIGMA_E, 8,  EPSILON_R_MEDIUM_WATER, 30, RHO_AQUEOUS_KG_M3)
    const at20 = computeMediumDebyeSAR(SIGMA_E, 20, EPSILON_R_MEDIUM_WATER, 30, RHO_AQUEOUS_KG_M3)
    expect(at8).toBeGreaterThan(at1)
    expect(at20).toBeGreaterThan(at8)
  })
})

describe('computeViralRfPredictedDR', () => {
  it('returns 0 when target lacks resonance metadata (mammalian cell)', () => {
    expect(computeViralRfPredictedDR(TARGET_CELL, 8.4, 50)).toBe(0)
  })

  it('returns 0 for non-positive frequency (defensive)', () => {
    expect(computeViralRfPredictedDR(VIRAL_TARGET,  0, 50)).toBe(0)
    expect(computeViralRfPredictedDR(VIRAL_TARGET, -1, 50)).toBe(0)
  })

  it('peaks at the capsid resonance frequency (Lorentzian)', () => {
    const onRes  = computeViralRfPredictedDR(VIRAL_TARGET, 8.4, 50)
    const offRes = computeViralRfPredictedDR(VIRAL_TARGET, 4.0, 50)
    expect(onRes).toBeGreaterThan(offRes)
  })

  it('scales linearly with field at on-resonance frequency', () => {
    const f50  = computeViralRfPredictedDR(VIRAL_TARGET, 8.4, 50)
    const f100 = computeViralRfPredictedDR(VIRAL_TARGET, 8.4, 100)
    expect(f100 / f50).toBeCloseTo(2, 6)
  })

  it('reaches DR ≥ 1.0 at on-resonance threshold field', () => {
    const drAtThr = computeViralRfPredictedDR(VIRAL_TARGET, 8.4, VIRAL_TARGET.resonantThresholdVcm)
    expect(drAtThr).toBeGreaterThanOrEqual(1)
  })
})

describe('viralRfMarginFraction', () => {
  it('returns 1 when value is zero', () => {
    expect(viralRfMarginFraction(0, IEEE_PUBLIC_SAR_LIMIT_W_KG)).toBe(1)
  })

  it('returns 0 when value equals the limit', () => {
    expect(viralRfMarginFraction(IEEE_PUBLIC_SAR_LIMIT_W_KG, IEEE_PUBLIC_SAR_LIMIT_W_KG)).toBe(0)
  })

  it('returns negative when value exceeds the limit', () => {
    expect(viralRfMarginFraction(IEEE_PUBLIC_SAR_LIMIT_W_KG * 1.5, IEEE_PUBLIC_SAR_LIMIT_W_KG)).toBeLessThan(0)
  })

  it('clamps to [-1, 1]', () => {
    expect(viralRfMarginFraction(IEEE_PUBLIC_SAR_LIMIT_W_KG * 100, IEEE_PUBLIC_SAR_LIMIT_W_KG)).toBe(-1)
    expect(viralRfMarginFraction(0, IEEE_OCCUPATIONAL_SAR_LIMIT_W_KG)).toBe(1)
  })

  it('returns 0 for non-positive limit (defensive)', () => {
    expect(viralRfMarginFraction(1,  0)).toBe(0)
    expect(viralRfMarginFraction(1, -1)).toBe(0)
  })

  it('matches the public IEEE benchmark for typical bench RF doses', () => {
    // 30 V/cm, 8.4 GHz in saline gives a SAR substantially under 1.6 W/kg → margin > 0.
    const sar = computeMediumDebyeSAR(SIGMA_E, 8.4, EPSILON_R_MEDIUM_WATER, 30, RHO_AQUEOUS_KG_M3)
    const m   = viralRfMarginFraction(sar, IEEE_PUBLIC_SAR_LIMIT_W_KG)
    expect(m).toBeGreaterThanOrEqual(-1)
    expect(m).toBeLessThanOrEqual(1)
  })
})
