// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

import { describe, it, expect } from 'vitest'

import {
  computeFermenterActiveFraction,
  computeFermenterExposureProbability,
  computeFermenterEffectiveDR,
} from '@/utils/physics'

describe('computeFermenterActiveFraction', () => {
  it('returns 1.0 when active volume meets or exceeds total volume (cuvette regime)', () => {
    // 4 cm² × 5 mm gap = 2 mL active; 1 mL total → fraction caps at 1.0.
    expect(computeFermenterActiveFraction(4, 5, 1)).toBe(1)
  })

  it('returns the geometric ratio for typical pilot scales', () => {
    // 4 cm² × 5 mm = 2 mL active; 100 mL bench fermenter → 2%.
    expect(computeFermenterActiveFraction(4, 5, 100)).toBeCloseTo(0.02, 4)
  })

  it('shrinks linearly with total volume at fixed electrode geometry', () => {
    const f10  = computeFermenterActiveFraction(4, 5, 10)
    const f100 = computeFermenterActiveFraction(4, 5, 100)
    expect(f10 / f100).toBeCloseTo(10, 2)
  })

  it('returns 0 when total volume is non-positive (defensive)', () => {
    expect(computeFermenterActiveFraction(4, 5, 0)).toBe(0)
    expect(computeFermenterActiveFraction(4, 5, -1)).toBe(0)
  })

  it('clamps to [0, 1] for any input', () => {
    const big   = computeFermenterActiveFraction(100, 100, 1)
    const tiny  = computeFermenterActiveFraction(0.01, 0.01, 1000)
    expect(big).toBe(1)
    expect(tiny).toBeGreaterThanOrEqual(0)
    expect(tiny).toBeLessThanOrEqual(1)
  })
})

describe('computeFermenterExposureProbability', () => {
  it('returns 0 when mixing rate is zero (no circulation)', () => {
    expect(computeFermenterExposureProbability(0, 60, 0.1)).toBe(0)
  })

  it('returns 0 when treatment duration is zero', () => {
    expect(computeFermenterExposureProbability(300, 0, 0.1)).toBe(0)
  })

  it('returns 0 when active fraction is zero (electrode disconnected)', () => {
    expect(computeFermenterExposureProbability(300, 60, 0)).toBe(0)
  })

  it('saturates near 1 for long treatments (well-mixed CSTR)', () => {
    // 1000 rpm × 5 min = 5000 passes × 5% active = 250 effective passes; 1 - e^(-250) ≈ 1.
    const p = computeFermenterExposureProbability(1000, 300, 0.05)
    expect(p).toBeGreaterThan(0.999)
  })

  it('grows monotonically with mixing rate when other inputs are fixed', () => {
    const a = computeFermenterExposureProbability(100, 30, 0.02)
    const b = computeFermenterExposureProbability(500, 30, 0.02)
    const c = computeFermenterExposureProbability(1000, 30, 0.02)
    expect(b).toBeGreaterThan(a)
    expect(c).toBeGreaterThan(b)
  })

  it('grows monotonically with treatment duration when other inputs are fixed', () => {
    const t10  = computeFermenterExposureProbability(300, 10, 0.02)
    const t60  = computeFermenterExposureProbability(300, 60, 0.02)
    const t300 = computeFermenterExposureProbability(300, 300, 0.02)
    expect(t60).toBeGreaterThan(t10)
    expect(t300).toBeGreaterThan(t60)
  })

  it('clamps to [0, 1]', () => {
    const p = computeFermenterExposureProbability(99999, 99999, 1)
    expect(p).toBeLessThanOrEqual(1)
    expect(p).toBeGreaterThanOrEqual(0)
  })
})

describe('computeFermenterEffectiveDR', () => {
  it('scales raw DR by exposure probability', () => {
    expect(computeFermenterEffectiveDR(0.8, 0.5)).toBeCloseTo(0.4, 9)
    expect(computeFermenterEffectiveDR(0.8, 1.0)).toBeCloseTo(0.8, 9)
    expect(computeFermenterEffectiveDR(0.8, 0.0)).toBe(0)
  })

  it('returns 0 for non-positive raw DR', () => {
    expect(computeFermenterEffectiveDR(0,  0.5)).toBe(0)
    expect(computeFermenterEffectiveDR(-1, 0.5)).toBe(0)
  })

  it('clamps exposure probability above 1 (defensive)', () => {
    expect(computeFermenterEffectiveDR(0.5, 1.5)).toBeCloseTo(0.5, 9)
  })

  it('clamps exposure probability below 0 (defensive)', () => {
    expect(computeFermenterEffectiveDR(0.5, -0.1)).toBe(0)
  })
})
