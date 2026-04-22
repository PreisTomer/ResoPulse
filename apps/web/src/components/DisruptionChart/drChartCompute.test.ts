// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// drChartCompute DR paths: resonance-vs-Schwan routing, H-FIRE Vth, acoustic cell selection — chart layer must mirror the store's isResonanceMode gate.

import { describe, it, expect } from 'vitest'

import { H_FIRE_THRESHOLD_MULTIPLIER, BODY_TEMP_C } from '@/constants/physics'

import type { CellConfig } from '@/types/cell'

import { computeDR, effectiveVth } from '@/components/DisruptionChart/drChartCompute'

// ── Test fixtures ─────────────────────────────────────────────────────────────

const SIGMA_E = 0.14  // EP buffer [S/m]
const FIELD   = 500   // V/cm

// Mammalian cell — no acoustic fields
const MAMMALIAN: CellConfig = {
  id: 'hep', type: 'target', label: 'Hepatocyte',
  radius: 15, membraneThickness: 7, dielectricConstant: 10,
  conductivity: 0.4, density: 1050, thresholdVoltage: 0.8,
  naturalFrequency: 0.5, specificHeatCapacity: 3600, amplitude: 0.8,
}

// Bacteria preset mirror — carries both EP Vth [V] and acoustic Vcm [V/cm]; mixing them is the guarded-against bug.
const ECOLI: CellConfig & { resonantFreqGHz: number; capsidQ: number; resonantThresholdVcm: number } = {
  id: 'ecoli', type: 'target', label: 'E. coli K-12',
  radius: 1.0, membraneThickness: 8, dielectricConstant: 10,
  conductivity: 0.5, density: 1100, thresholdVoltage: 0.3,  // EP threshold [V]
  naturalFrequency: 0.5, specificHeatCapacity: 3500, amplitude: 0.8,
  resonantFreqGHz:      0.0015,  // 1.5 MHz in GHz units
  capsidQ:              3,
  resonantThresholdVcm: 800,     // acoustic threshold [V/cm] — very different from 0.3 V
}

const FREQ_AT_RESONANCE_HZ = ECOLI.resonantFreqGHz * 1e9  // 1.5 MHz

// ── effectiveVth ──────────────────────────────────────────────────────────────

describe('effectiveVth — baseline (pulseCount=1, default)', () => {
  it('returns nominalVth unchanged at body temperature with hfireMult=1', () => {
    expect(effectiveVth(1.0, BODY_TEMP_C, 1.0)).toBeCloseTo(1.0, 9)
  })

  it('scales nominalVth by H_FIRE_THRESHOLD_MULTIPLIER in H-FIRE mode', () => {
    const vth = effectiveVth(1.0, BODY_TEMP_C, H_FIRE_THRESHOLD_MULTIPLIER)
    expect(vth).toBeCloseTo(H_FIRE_THRESHOLD_MULTIPLIER, 9)
  })

  it('applies temperature correction before the multiplier', () => {
    // At T=42°C: factor = max(0.70, 1 - 0.003×(42-37)) = 0.985
    const vthTempOnly = effectiveVth(1.0, 42, 1.0)
    const vthHfire    = effectiveVth(1.0, 42, H_FIRE_THRESHOLD_MULTIPLIER)
    expect(vthHfire).toBeCloseTo(vthTempOnly * H_FIRE_THRESHOLD_MULTIPLIER, 9)
  })

  it('explicit pulseCount=1 matches the no-arg default', () => {
    // Ensures the default parameter is truly 1 and not some other value
    const withDefault  = effectiveVth(1.0, BODY_TEMP_C, 1.0)
    const withExplicit = effectiveVth(1.0, BODY_TEMP_C, 1.0, 1)
    expect(withExplicit).toBeCloseTo(withDefault, 12)
  })
})

describe('effectiveVth — electrosensitization (pulseCount > 1)', () => {
  it('N=10 reduces effective threshold vs N=1 at body temp', () => {
    const vthN1  = effectiveVth(1.0, BODY_TEMP_C, 1.0, 1)
    const vthN10 = effectiveVth(1.0, BODY_TEMP_C, 1.0, 10)
    expect(vthN10).toBeLessThan(vthN1)
  })

  it('N=10: threshold factor ≈ 0.631 (10^(−0.20))', () => {
    const expected = Math.pow(10, -0.20)
    expect(effectiveVth(1.0, BODY_TEMP_C, 1.0, 10)).toBeCloseTo(expected, 5)
  })

  it('N=200: factor clamped at 0.35 minimum', () => {
    // 200^(−0.20) ≈ 0.347, below the 0.35 floor
    expect(effectiveVth(1.0, BODY_TEMP_C, 1.0, 200)).toBeCloseTo(0.35, 5)
  })

  it('H-FIRE and N are both applied (multiplicative): N=10, H-FIRE', () => {
    // H-FIRE raises threshold by ×1.75; N=10 lowers by ×0.631 — both multiply
    const nFactor    = Math.pow(10, -0.20)
    const expected   = 1.0 * nFactor * H_FIRE_THRESHOLD_MULTIPLIER
    expect(effectiveVth(1.0, BODY_TEMP_C, H_FIRE_THRESHOLD_MULTIPLIER, 10)).toBeCloseTo(expected, 5)
  })

  it('acoustic callers: passing pulseCount=1 explicitly gives N-invariant result', () => {
    // Acoustic resonance callers always pass pulseCount=1 to prevent N from affecting
    // mechanical capsid thresholds. This test confirms passing 1 is truly a no-op.
    const acousticN1   = effectiveVth(800.0, BODY_TEMP_C, 1.0, 1)
    const acousticN100 = effectiveVth(800.0, BODY_TEMP_C, 1.0, 1)  // always 1 for acoustic
    expect(acousticN1).toBeCloseTo(acousticN100, 12)
    // And it must NOT equal the EP result with N=100
    const epN100 = effectiveVth(800.0, BODY_TEMP_C, 1.0, 100)
    expect(acousticN1).toBeGreaterThan(epN100)
  })
})

// ── computeDR: Schwan path ────────────────────────────────────────────────────

describe('computeDR — Schwan path', () => {
  it('returns a positive finite DR for a mammalian cell in EP buffer', () => {
    const vthEff = effectiveVth(MAMMALIAN.thresholdVoltage, BODY_TEMP_C, 1.0)
    const dr = computeDR(MAMMALIAN, 100_000, FIELD, SIGMA_E, 1.0, 1.0, false, false, vthEff)
    expect(dr).toBeGreaterThan(0)
    expect(isFinite(dr)).toBe(true)
  })

  it('DR scales linearly with field intensity (quasi-DC Schwan is linear in E)', () => {
    const vthEff = effectiveVth(MAMMALIAN.thresholdVoltage, BODY_TEMP_C, 1.0)
    const dr1 = computeDR(MAMMALIAN, 100_000, FIELD,       SIGMA_E, 1.0, 1.0, false, false, vthEff)
    const dr2 = computeDR(MAMMALIAN, 100_000, FIELD * 2.0, SIGMA_E, 1.0, 1.0, false, false, vthEff)
    expect(dr2).toBeCloseTo(dr1 * 2, 5)
  })

  it('H-FIRE (hfireMult=1.75) reduces DR vs CW for EP Schwan targets', () => {
    const vthCW    = effectiveVth(MAMMALIAN.thresholdVoltage, BODY_TEMP_C, 1.0)
    const vthHfire = effectiveVth(MAMMALIAN.thresholdVoltage, BODY_TEMP_C, H_FIRE_THRESHOLD_MULTIPLIER)
    const drCW    = computeDR(MAMMALIAN, 100_000, FIELD, SIGMA_E, 1.0, 1.0, false, false, vthCW)
    const drHfire = computeDR(MAMMALIAN, 100_000, FIELD, SIGMA_E, 1.0, 1.0, false, false, vthHfire)
    expect(drCW / drHfire).toBeCloseTo(H_FIRE_THRESHOLD_MULTIPLIER, 3)
  })
})

// ── computeDR: resonance path ─────────────────────────────────────────────────

describe('computeDR — acoustic resonance path', () => {
  it('returns positive DR at resonance frequency when isResonanceMode=true', () => {
    const vthEff = effectiveVth(ECOLI.resonantThresholdVcm, BODY_TEMP_C, 1.0)
    const dr = computeDR(ECOLI, FREQ_AT_RESONANCE_HZ, FIELD, SIGMA_E, 1.0, 1.0, true, true, vthEff)
    expect(dr).toBeGreaterThan(0)
    expect(isFinite(dr)).toBe(true)
  })

  it('DR peaks at resonance and falls off away from it (Lorentzian shape)', () => {
    const vthEff = effectiveVth(ECOLI.resonantThresholdVcm, BODY_TEMP_C, 1.0)
    const drRes  = computeDR(ECOLI, FREQ_AT_RESONANCE_HZ,        FIELD, SIGMA_E, 1.0, 1.0, true, true, vthEff)
    const drFar  = computeDR(ECOLI, FREQ_AT_RESONANCE_HZ * 1000, FIELD, SIGMA_E, 1.0, 1.0, true, true, vthEff)
    expect(drRes).toBeGreaterThan(drFar * 5)
  })

  it('H-FIRE does NOT change resonance DR when vthEff is correctly computed without hfireMult', () => {
    // In resonance mode the caller must pass hfireMult=1.0 (acoustic disruption is mechanical).
    // DR_CW and DR_H_FIRE should be equal because neither threshold is scaled.
    const vthCW    = effectiveVth(ECOLI.resonantThresholdVcm, BODY_TEMP_C, 1.0)
    const vthHfire = effectiveVth(ECOLI.resonantThresholdVcm, BODY_TEMP_C, 1.0)  // mult=1.0 for acoustic
    const drCW    = computeDR(ECOLI, FREQ_AT_RESONANCE_HZ, FIELD, SIGMA_E, 1.0, 1.0, true, true, vthCW)
    const drHfire = computeDR(ECOLI, FREQ_AT_RESONANCE_HZ, FIELD, SIGMA_E, 1.0, 1.0, true, true, vthHfire)
    expect(drCW).toBeCloseTo(drHfire, 10)
  })

  it('wrongly applying hfireMult to resonance threshold deflates DR by 1.75× (demonstrates the bug)', () => {
    // This test documents the exact bug that was fixed: passing hfireMult=1.75 to effectiveVth
    // for an acoustic target inflates the threshold by 1.75× and deflates DR accordingly.
    const vthCorrect = effectiveVth(ECOLI.resonantThresholdVcm, BODY_TEMP_C, 1.0)
    const vthBuggy   = effectiveVth(ECOLI.resonantThresholdVcm, BODY_TEMP_C, H_FIRE_THRESHOLD_MULTIPLIER)
    const drCorrect  = computeDR(ECOLI, FREQ_AT_RESONANCE_HZ, FIELD, SIGMA_E, 1.0, 1.0, true, true, vthCorrect)
    const drBuggy    = computeDR(ECOLI, FREQ_AT_RESONANCE_HZ, FIELD, SIGMA_E, 1.0, 1.0, true, true, vthBuggy)
    expect(drCorrect / drBuggy).toBeCloseTo(H_FIRE_THRESHOLD_MULTIPLIER, 3)
  })
})

// ── computeDR: Schwan mode with acoustic cell ─────────────────────────────────

describe('computeDR — Schwan mode with bacteria cell (isResonanceMode=false)', () => {
  it('uses Schwan formula, not resonant disruption, when isResonanceMode=false', () => {
    // The correct threshold in Schwan mode is thresholdVoltage (in V).
    // Using resonantThresholdVcm (in V/cm ≈ 800 for E.coli) would give DR ≈ 0.0003 — wrong by ×2700.
    const vthEP   = effectiveVth(ECOLI.thresholdVoltage,     BODY_TEMP_C, 1.0)
    const vthWrong = effectiveVth(ECOLI.resonantThresholdVcm, BODY_TEMP_C, 1.0)

    const drCorrect = computeDR(ECOLI, 100_000, FIELD, SIGMA_E, 1.0, 1.0, false, true, vthEP)
    const drBuggy   = computeDR(ECOLI, 100_000, FIELD, SIGMA_E, 1.0, 1.0, false, true, vthWrong)

    // With correct threshold: E.coli at 500 V/cm should be in EP range
    expect(drCorrect).toBeGreaterThan(0.01)
    // With wrong threshold (V/cm used as V): DR is ~2700× too small
    expect(drCorrect / drBuggy).toBeCloseTo(ECOLI.resonantThresholdVcm / ECOLI.thresholdVoltage, 0)
  })

  it('isResonanceMode=false forces Schwan path even for cells with resonantFreqGHz', () => {
    // Both calls below use the same sigma_e and field.
    // In Schwan mode, DR should scale with Vm (which goes to 0 as freq→∞).
    const vthEff = effectiveVth(ECOLI.thresholdVoltage, BODY_TEMP_C, 1.0)
    const drLow  = computeDR(ECOLI, 100_000,     FIELD, SIGMA_E, 1.0, 1.0, false, true, vthEff)
    const drHigh = computeDR(ECOLI, 500_000_000, FIELD, SIGMA_E, 1.0, 1.0, false, true, vthEff)
    // Schwan rolls off at high freq → drHigh << drLow
    expect(drLow).toBeGreaterThan(drHigh * 10)
  })

  it('H-FIRE applies to bacteria in Schwan mode (EP membrane-charging mechanism)', () => {
    const vthCW    = effectiveVth(ECOLI.thresholdVoltage, BODY_TEMP_C, 1.0)
    const vthHfire = effectiveVth(ECOLI.thresholdVoltage, BODY_TEMP_C, H_FIRE_THRESHOLD_MULTIPLIER)
    const drCW    = computeDR(ECOLI, 100_000, FIELD, SIGMA_E, 1.0, 1.0, false, true, vthCW)
    const drHfire = computeDR(ECOLI, 100_000, FIELD, SIGMA_E, 1.0, 1.0, false, true, vthHfire)
    expect(drCW / drHfire).toBeCloseTo(H_FIRE_THRESHOLD_MULTIPLIER, 3)
  })
})
