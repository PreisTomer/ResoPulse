// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

import { describe, it, expect } from 'vitest'

import { computeUptakeFraction, computeUptakeWindowCurve } from '@/utils/physics'

describe('computeUptakeFraction — DR window invariants', () => {
  it('returns 0 below DR=0.50 (sub-threshold reversible-EP boundary)', () => {
    expect(computeUptakeFraction(0.30, 1000, 8)).toBe(0)
    expect(computeUptakeFraction(0.49, 1000, 8)).toBe(0)
    expect(computeUptakeFraction(0.50, 1000, 8)).toBe(0)
  })

  it('returns 0 at and above DR=0.85 (lysis collapses productive uptake)', () => {
    expect(computeUptakeFraction(0.85, 1000, 8)).toBe(0)
    expect(computeUptakeFraction(0.95, 1000, 8)).toBe(0)
  })

  it('peaks at the reversible-EP midpoint DR=0.675', () => {
    const peak  = computeUptakeFraction(0.675, 1000, 8)
    const left  = computeUptakeFraction(0.55, 1000, 8)
    const right = computeUptakeFraction(0.80, 1000, 8)
    expect(peak).toBeGreaterThan(left)
    expect(peak).toBeGreaterThan(right)
  })

  it('window function is symmetric around DR=0.675', () => {
    const lo = computeUptakeFraction(0.575, 1000, 8)   // 0.675 - 0.10
    const hi = computeUptakeFraction(0.775, 1000, 8)   // 0.675 + 0.10
    expect(lo).toBeCloseTo(hi, 9)
  })
})

describe('computeUptakeFraction — cargo size dependence', () => {
  it('small molecules (e.g. PI 668 Da) approach 100% size factor', () => {
    const dr = 0.675
    const small = computeUptakeFraction(dr, 668, 50)
    expect(small).toBeGreaterThan(0.85)
  })

  it('plasmids (~3 MDa) drop well below 50%', () => {
    const dr = 0.675
    const plasmid = computeUptakeFraction(dr, 3_000_000, 50)
    expect(plasmid).toBeLessThan(0.40)
  })

  it('uptake decreases monotonically with cargo MW at fixed DR + N', () => {
    const dr = 0.675
    const mws = [500, 5_000, 50_000, 500_000, 5_000_000]
    const ups = mws.map(mw => computeUptakeFraction(dr, mw, 50))
    for (let i = 1; i < ups.length; i++) {
      expect(ups[i]!).toBeLessThanOrEqual(ups[i - 1]!)
    }
  })

  it('returns 0 for non-positive cargo MW (defensive)', () => {
    expect(computeUptakeFraction(0.675, 0,  8)).toBe(0)
    expect(computeUptakeFraction(0.675, -5, 8)).toBe(0)
  })
})

describe('computeUptakeFraction — pulse-count saturation', () => {
  it('zero pulses → zero uptake', () => {
    expect(computeUptakeFraction(0.675, 1000, 0)).toBe(0)
  })

  it('uptake increases with N but saturates', () => {
    const dr = 0.675
    const u1   = computeUptakeFraction(dr, 1000, 1)
    const u5   = computeUptakeFraction(dr, 1000, 5)
    const u15  = computeUptakeFraction(dr, 1000, 15)
    const u50  = computeUptakeFraction(dr, 1000, 50)
    expect(u5).toBeGreaterThan(u1)
    expect(u15).toBeGreaterThan(u5)
    // At N=15 we're already past 3 e-foldings; further pulses add < 5%.
    expect(u50 - u15).toBeLessThan(0.05)
  })
})

describe('computeUptakeWindowCurve', () => {
  it('produces (steps + 1) sample points across [0.40, 0.90]', () => {
    const curve = computeUptakeWindowCurve(1000, 8, 30)
    expect(curve).toHaveLength(31)
    expect(curve[0]!.dr).toBeCloseTo(0.40, 9)
    expect(curve[curve.length - 1]!.dr).toBeCloseTo(0.90, 9)
  })

  it('all uptake values are bounded in [0, 1]', () => {
    const curve = computeUptakeWindowCurve(1000, 8)
    for (const p of curve) {
      expect(p.uptake).toBeGreaterThanOrEqual(0)
      expect(p.uptake).toBeLessThanOrEqual(1)
    }
  })

  it('uptake hits 0 at the edges of the reversible-EP window', () => {
    const curve = computeUptakeWindowCurve(1000, 8, 50)
    // 0.40 sample
    expect(curve[0]!.uptake).toBe(0)
    // 0.90 sample
    expect(curve[curve.length - 1]!.uptake).toBe(0)
  })
})
