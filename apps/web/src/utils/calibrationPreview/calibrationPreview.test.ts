// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { describe, it, expect } from 'vitest'

import { WAVEFORM } from '@/constants/strings'
import { BODY_TEMP_C } from '@/constants/physics'
import { HEALTHY_CELL, TARGET_CELL, SIGMA_E, FIELD } from '@/utils/physics/testFixtures'
import { computeCalibrationPreview, type CalibrationPreviewInput } from '@/utils/calibrationPreview'

function baseInput(overrides: Partial<CalibrationPreviewInput> = {}): CalibrationPreviewInput {
  return {
    healthy:             HEALTHY_CELL,
    target:              TARGET_CELL,
    sigmaE:              SIGMA_E,
    cosThetaFactor:      1.0,
    freqKHz:             1,
    fieldVcm:            FIELD,
    healthyTemp:         BODY_TEMP_C,
    targetTemp:          BODY_TEMP_C,
    waveform:            WAVEFORM.CW,
    pulseWidthNs:        100,
    effectivePulseCount: 1,
    healthyMultiplier:   1.0,
    targetMultiplier:    1.0,
    ...overrides,
  }
}

describe('computeCalibrationPreview', () => {
  it('returns positive DR and TI for a standard protocol', () => {
    const r = computeCalibrationPreview(baseInput())
    expect(r.healthyDr).toBeGreaterThan(0)
    expect(r.targetDr).toBeGreaterThan(0)
    expect(r.ti).toBeGreaterThan(0)
  })

  it('multiplier=1 matches the live physics baseline (DC limit: DR independent of σ_i)', () => {
    // At quasi-DC (ω·τ << 1) Schwan Vm is independent of σ_i, so doubling the multiplier
    // on both cells must not change DR or TI within numerical precision.
    const base = computeCalibrationPreview(baseInput())
    const scaled = computeCalibrationPreview(baseInput({
      healthyMultiplier: 2.0,
      targetMultiplier:  2.0,
    }))
    expect(scaled.healthyDr).toBeCloseTo(base.healthyDr, 5)
    expect(scaled.targetDr).toBeCloseTo(base.targetDr, 5)
    expect(scaled.ti).toBeCloseTo(base.ti, 5)
  })

  it('high-frequency regime: raising target multiplier shifts τ and changes target DR', () => {
    // Above fc (ω·τ > 1) Vm rolls off with 1/τ, and τ depends on σ_i — so the multiplier has bite.
    const base = computeCalibrationPreview(baseInput({ freqKHz: 5_000 }))
    const higher = computeCalibrationPreview(baseInput({ freqKHz: 5_000, targetMultiplier: 1.5 }))
    expect(higher.targetDr).not.toBeCloseTo(base.targetDr, 3)
  })

  it('TI is never negative and respects the display cap', () => {
    const r = computeCalibrationPreview(baseInput({ fieldVcm: 10_000 }))
    expect(r.ti).toBeGreaterThanOrEqual(0)
    expect(r.ti).toBeLessThanOrEqual(100)
  })

  it('V_th multiplier scales DR inversely on both cells', () => {
    // DR = Vm·pef / (V_th·hfire). Doubling V_th must halve DR; the ratio TI is unchanged when both are scaled identically.
    const base = computeCalibrationPreview(baseInput())
    const doubledVth = computeCalibrationPreview(baseInput({
      healthyVthMultiplier: 2.0,
      targetVthMultiplier:  2.0,
    }))
    expect(doubledVth.targetDr).toBeCloseTo(base.targetDr * 0.5, 5)
    expect(doubledVth.healthyDr).toBeCloseTo(base.healthyDr * 0.5, 5)
    expect(doubledVth.ti).toBeCloseTo(base.ti, 5)
  })

  it('V_th multiplier defaults to 1.0 when omitted (back-compat)', () => {
    const withDefault = computeCalibrationPreview(baseInput())
    const explicit    = computeCalibrationPreview(baseInput({ healthyVthMultiplier: 1.0, targetVthMultiplier: 1.0 }))
    expect(withDefault.targetDr).toBeCloseTo(explicit.targetDr, 9)
    expect(withDefault.ti).toBeCloseTo(explicit.ti, 9)
  })
})
