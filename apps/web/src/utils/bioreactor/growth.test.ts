// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

import { describe, it, expect } from 'vitest'

import { predictBioreactor, type BioreactorInputs } from './growth'

const BASE: BioreactorInputs = {
  seedingDensityE5:     5,
  maxVcdE6:             20,
  growthRatePerDay:     0.6,
  tempShiftDay:         6,
  durationDays:         14,
  specificProductivity: 20,
}

describe('predictBioreactor', () => {
  it('produces a curve point for every culture day inclusive', () => {
    const r = predictBioreactor(BASE)
    expect(r.curve.length).toBe(BASE.durationDays + 1)
  })

  it('VCD never exceeds the carrying capacity', () => {
    const r = predictBioreactor(BASE)
    for (const p of r.curve) {
      expect(p.vcdE6).toBeLessThanOrEqual(BASE.maxVcdE6 + 0.01)
    }
  })

  it('VCD grows from the seeding density', () => {
    const r = predictBioreactor(BASE)
    const seedVcd = BASE.seedingDensityE5 / 10
    expect(r.curve[0]!.vcdE6).toBeCloseTo(seedVcd, 1)
    expect(r.peakVcdE6).toBeGreaterThan(seedVcd)
  })

  it('titer accumulates monotonically over the run', () => {
    const r = predictBioreactor(BASE)
    for (let i = 1; i < r.curve.length; i++) {
      expect(r.curve[i]!.titerGL).toBeGreaterThanOrEqual(r.curve[i - 1]!.titerGL)
    }
  })

  it('higher specific productivity yields higher final titer', () => {
    const low  = predictBioreactor({ ...BASE, specificProductivity: 10 })
    const high = predictBioreactor({ ...BASE, specificProductivity: 35 })
    expect(high.finalTiterGL).toBeGreaterThan(low.finalTiterGL)
  })

  it('higher carrying capacity yields higher peak VCD', () => {
    const low  = predictBioreactor({ ...BASE, maxVcdE6: 10 })
    const high = predictBioreactor({ ...BASE, maxVcdE6: 35 })
    expect(high.peakVcdE6).toBeGreaterThan(low.peakVcdE6)
  })

  it('projects a final titer in a plausible mAb fed-batch band (1-12 g/L)', () => {
    const r = predictBioreactor(BASE)
    expect(r.finalTiterGL).toBeGreaterThan(1)
    expect(r.finalTiterGL).toBeLessThan(12)
  })
})
