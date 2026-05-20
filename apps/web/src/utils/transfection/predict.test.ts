// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

import { describe, it, expect } from 'vitest'

import { predictTransfection, TRANSFECTION_WINDOW_BOUNDS, type TransfectionInputs } from './predict'

const BASE: TransfectionInputs = {
  cellRadiusUm:          10,
  membraneThicknessNm:   7,
  dielectricConstant:    5,
  cytoplasmConductivity: 0.5,
  bufferConductivity:    0.14,
  thresholdVoltage:      1.0,
  voltage:               500,    // V/cm
  pulseWidthUs:          100,
  numPulses:             1,
}

describe('predictTransfection', () => {
  it('returns zero vm and zero DR when voltage is zero', () => {
    const r = predictTransfection({ ...BASE, voltage: 0 })
    expect(r.vm).toBeCloseTo(0, 6)
    expect(r.disruptionRatio).toBeCloseTo(0, 6)
  })

  it('vm and DR scale with applied voltage', () => {
    const low  = predictTransfection({ ...BASE, voltage: 200 })
    const high = predictTransfection({ ...BASE, voltage: 800 })
    expect(high.vm).toBeGreaterThan(low.vm)
    expect(high.disruptionRatio).toBeGreaterThan(low.disruptionRatio)
  })

  it('larger cells reach higher vm at the same field strength', () => {
    const small = predictTransfection({ ...BASE, cellRadiusUm: 5  })
    const big   = predictTransfection({ ...BASE, cellRadiusUm: 15 })
    expect(big.vm).toBeGreaterThan(small.vm)
  })

  it('more pulses reduce the effective threshold (higher DR for same vm)', () => {
    const single = predictTransfection({ ...BASE, numPulses: 1 })
    const ten    = predictTransfection({ ...BASE, numPulses: 10 })
    expect(ten.disruptionRatio).toBeGreaterThan(single.disruptionRatio)
  })

  it('reports below-window state when voltage is too low', () => {
    const r = predictTransfection({ ...BASE, voltage: 100 })
    expect(r.disruptionRatio).toBeLessThan(TRANSFECTION_WINDOW_BOUNDS.lower)
    expect(r.windowState).toBe('below')
  })

  it('reports optimal-window state when voltage is well-tuned', () => {
    // For a 10 µm cell with 1.0 V threshold, ~400 V/cm puts Vm mid-window
    const r = predictTransfection({ ...BASE, voltage: 400, pulseWidthUs: 100 })
    expect(r.disruptionRatio).toBeGreaterThanOrEqual(TRANSFECTION_WINDOW_BOUNDS.lower)
    expect(r.disruptionRatio).toBeLessThanOrEqual(TRANSFECTION_WINDOW_BOUNDS.upper)
    expect(r.windowState).toBe('optimal')
  })

  it('reports above-window state when voltage is too high', () => {
    const r = predictTransfection({ ...BASE, voltage: 3000, pulseWidthUs: 1000 })
    expect(r.disruptionRatio).toBeGreaterThan(TRANSFECTION_WINDOW_BOUNDS.upper)
    expect(r.windowState).toBe('above')
  })

  it('viability stays at 1.0 below the decay threshold', () => {
    const r = predictTransfection({ ...BASE, voltage: 500 })
    expect(r.viability).toBeCloseTo(1, 5)
  })

  it('viability decreases when DR exceeds the decay start', () => {
    const safe   = predictTransfection({ ...BASE, voltage: 500 })
    const lethal = predictTransfection({ ...BASE, voltage: 3000, pulseWidthUs: 1000 })
    expect(lethal.viability).toBeLessThan(safe.viability)
  })

  it('transfectionEfficiency stays in [0, 1]', () => {
    const r = predictTransfection({ ...BASE, voltage: 1500 })
    expect(r.transfectionEfficiency).toBeGreaterThanOrEqual(0)
    expect(r.transfectionEfficiency).toBeLessThanOrEqual(1)
  })

  it('fieldStrength stays in [0, 1] across voltage ranges', () => {
    for (const voltage of [0, 100, 500, 1000, 3000, 10000]) {
      const r = predictTransfection({ ...BASE, voltage })
      expect(r.fieldStrength).toBeGreaterThanOrEqual(0)
      expect(r.fieldStrength).toBeLessThanOrEqual(1)
    }
  })

  it('longer pulses approach steady-state vm', () => {
    const short = predictTransfection({ ...BASE, pulseWidthUs: 1 })
    const long  = predictTransfection({ ...BASE, pulseWidthUs: 1000 })
    expect(long.vm).toBeGreaterThan(short.vm)
  })
})
