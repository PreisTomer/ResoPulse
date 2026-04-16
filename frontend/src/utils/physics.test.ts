// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// Unit tests: Schwan Vm/τ, H-FIRE threshold, PEF, lysis field, DR field independence,
//             tempCorrectedVth electrosensitization, slider bounds

import { describe, it, expect } from 'vitest'

import { SLIDER_RANGES } from '@/constants/sliderBounds'
import {
  H_FIRE_THRESHOLD_MULTIPLIER,
  SCHWAN_SPHERE_FACTOR,
  TWO_PI,
  MIN_PULSE_ENVELOPE,
  ELECTROSENSITIZATION_EXPONENT,
  ELECTROSENSITIZATION_CLAMP_MIN,
  TEMP_EP_COEFF,
  TEMP_EP_CLAMP_MIN,
  BODY_TEMP_C,
} from '@/constants/physics'

import type { CellConfig } from '@/types/cell'

import {
  computeSchwan,
  computeTau,
  computePulseStepResponse,
  computeSAR,
  tempCorrectedVth,
} from './physics'
import { TARGET_CELL, HEALTHY_CELL, SIGMA_E, FIELD } from './testFixtures'

// ── computeTau ───────────────────────────────────────────────────────────────

describe('computeTau', () => {
  it('returns a positive time constant for a standard cell', () => {
    const tau = computeTau(TARGET_CELL, SIGMA_E)
    expect(tau).toBeGreaterThan(0)
  })

  it('τ scales linearly with radius (doubling R doubles τ)', () => {
    const bigCell = { ...TARGET_CELL, radius: TARGET_CELL.radius * 2 }
    expect(computeTau(bigCell, SIGMA_E)).toBeCloseTo(computeTau(TARGET_CELL, SIGMA_E) * 2, 6)
  })

  it('τ decreases when σ_e increases (higher conductivity → faster charging)', () => {
    const tauLow  = computeTau(TARGET_CELL, 0.05)
    const tauHigh = computeTau(TARGET_CELL, 1.0)
    expect(tauHigh).toBeLessThan(tauLow)
  })

  it('matches known value for HeLa-like cell in EP buffer (~µs range)', () => {
    // τ = R·Cm·(2σ_e+σ_i)/(2σ_e·σ_i)
    // R = 10e-6 m, Cm = 10*ε₀/7e-9 ≈ 12.65e-3 F/m²
    // (2*0.14 + 0.4)/(2*0.14*0.4) = 0.68/0.112 ≈ 6.07
    // τ ≈ 10e-6 * 12.65e-3 * 6.07 ≈ 768 ns
    const tau = computeTau(TARGET_CELL, SIGMA_E)
    expect(tau).toBeGreaterThan(100e-9)    // > 100 ns
    expect(tau).toBeLessThan(10e-6)        // < 10 µs
  })
})

// ── computeSchwan ─────────────────────────────────────────────────────────────

describe('computeSchwan', () => {
  it('returns Vm proportional to field (linear in E)', () => {
    const vm1 = computeSchwan(TARGET_CELL, 100, FIELD,      SIGMA_E)
    const vm2 = computeSchwan(TARGET_CELL, 100, FIELD * 2,  SIGMA_E)
    expect(vm2).toBeCloseTo(vm1 * 2, 6)
  })

  it('returns Vm proportional to radius at quasi-DC (linear in R)', () => {
    const bigCell = { ...TARGET_CELL, radius: TARGET_CELL.radius * 2 }
    const vmSmall = computeSchwan(TARGET_CELL, 0.001, FIELD, SIGMA_E)
    const vmBig   = computeSchwan(bigCell,     0.001, FIELD, SIGMA_E)
    expect(vmBig).toBeCloseTo(vmSmall * 2, 4)
  })

  it('rolls off at high frequency (Vm decreases well above fc)', () => {
    const vmLow  = computeSchwan(TARGET_CELL, 1,       FIELD, SIGMA_E)
    const vmHigh = computeSchwan(TARGET_CELL, 100_000, FIELD, SIGMA_E)
    expect(vmHigh).toBeLessThan(vmLow)
  })

  it('Vm = 1.5·E·R at f → 0 (quasi-DC, cosTheta=1)', () => {
    // Vm_DC = 1.5 * E[V/m] * R[m] = 1.5 * (500*100) * 10e-6 = 1.5 * 50000 * 10e-6 = 0.75 V
    const vmDC = computeSchwan(TARGET_CELL, 0.001, FIELD, SIGMA_E)
    const expected = SCHWAN_SPHERE_FACTOR * FIELD * 100 * TARGET_CELL.radius * 1e-6
    expect(vmDC).toBeCloseTo(expected, 3)
  })

  it('rolls off by 1/√2 at characteristic frequency fc = 1/(2π·τ)', () => {
    const tau = computeTau(TARGET_CELL, SIGMA_E)
    const fc  = 1 / (TWO_PI * tau) / 1e3  // → kHz
    const vmDC = computeSchwan(TARGET_CELL, 0.001, FIELD, SIGMA_E)
    const vmFc = computeSchwan(TARGET_CELL, fc,    FIELD, SIGMA_E)
    expect(vmFc).toBeCloseTo(vmDC / Math.sqrt(2), 3)
  })

  it('cosTheta scales Vm linearly', () => {
    const vm90  = computeSchwan(TARGET_CELL, 100, FIELD, SIGMA_E, 1.0)
    const vm45  = computeSchwan(TARGET_CELL, 100, FIELD, SIGMA_E, Math.cos(Math.PI / 4))
    expect(vm45).toBeCloseTo(vm90 * Math.cos(Math.PI / 4), 6)
  })

  it('larger cell always has higher Vm at same frequency (mammalian cells)', () => {
    // At any frequency, bigger cell → higher Vm because R_T > R_H and τ_T > τ_H
    // But rolloff is faster for larger cell, so this is a quasi-DC test.
    const vmTarget  = computeSchwan(TARGET_CELL,  100, FIELD, SIGMA_E)
    const vmHealthy = computeSchwan(HEALTHY_CELL, 100, FIELD, SIGMA_E)
    expect(vmTarget).toBeGreaterThan(vmHealthy)
  })
})

// ── computePulseStepResponse (PEF) ────────────────────────────────────────────

describe('computePulseStepResponse', () => {
  it('returns a value between 0 and 1', () => {
    const tau = computeTau(TARGET_CELL, SIGMA_E)
    const pef = computePulseStepResponse(tau, 100)
    expect(pef).toBeGreaterThan(0)
    expect(pef).toBeLessThanOrEqual(1)
  })

  it('approaches 1 for very long pulses (t_p >> τ)', () => {
    const tau = computeTau(TARGET_CELL, SIGMA_E)
    const pef = computePulseStepResponse(tau, 1e9)  // 1 s pulse >> µs τ
    expect(pef).toBeCloseTo(1.0, 4)
  })

  it('approaches 0 for very short pulses (t_p << τ)', () => {
    const tau = computeTau(TARGET_CELL, SIGMA_E)
    const pef = computePulseStepResponse(tau, 0.001)  // 1 ps << µs τ
    expect(pef).toBeLessThan(0.01)
  })

  it('pef = 1−exp(−1) ≈ 0.632 when t_p = τ', () => {
    const tau = computeTau(TARGET_CELL, SIGMA_E)
    const tauNs = tau * 1e9
    const pef = computePulseStepResponse(tau, tauNs)
    expect(pef).toBeCloseTo(1 - Math.exp(-1), 5)
  })
})

// ── H-FIRE threshold multiplier ───────────────────────────────────────────────

describe('H_FIRE_THRESHOLD_MULTIPLIER', () => {
  it('equals 1.75', () => {
    expect(H_FIRE_THRESHOLD_MULTIPLIER).toBe(1.75)
  })

  it('DR with H-FIRE is 1.75× lower than CW DR at same Vm', () => {
    const vm  = computeSchwan(TARGET_CELL, 500, FIELD, SIGMA_E)
    const vth = TARGET_CELL.thresholdVoltage
    const drCW    = vm / vth
    const drHfire = vm / (vth * H_FIRE_THRESHOLD_MULTIPLIER)
    expect(drCW / drHfire).toBeCloseTo(H_FIRE_THRESHOLD_MULTIPLIER, 5)
  })
})

// ── Lysis-field formula (inline, mirrors cellStore.targetLysisField) ──────────
// This validates the formula used in the store without depending on Pinia.

function lysisFieldImpl(
  cell: CellConfig,
  freqKHz: number,
  sigma_e: number,
  cosTheta: number,
  pef: number,
  hfireMult: number,
): number {
  const omega = TWO_PI * freqKHz * 1e3
  const tau   = computeTau(cell, sigma_e)
  const pefClamped = Math.max(MIN_PULSE_ENVELOPE, pef)
  return (cell.thresholdVoltage * hfireMult * Math.sqrt(1 + (omega * tau) ** 2)) /
    (SCHWAN_SPHERE_FACTOR * cell.radius * 1e-6 * cosTheta * 100 * pefClamped)
}

describe('lysisField formula', () => {
  it('at quasi-DC, E_lysis = Vth / (1.5·R·100) (frequency independent)', () => {
    const E = lysisFieldImpl(TARGET_CELL, 0.001, SIGMA_E, 1.0, 1.0, 1.0)
    const expected = TARGET_CELL.thresholdVoltage / (SCHWAN_SPHERE_FACTOR * TARGET_CELL.radius * 1e-6 * 100)
    expect(E).toBeCloseTo(expected, 1)
  })

  it('H-FIRE lysis field is 1.75× higher than CW at same frequency', () => {
    const eCW    = lysisFieldImpl(TARGET_CELL, 500, SIGMA_E, 1.0, 1.0, 1.0)
    const eHfire = lysisFieldImpl(TARGET_CELL, 500, SIGMA_E, 1.0, 1.0, H_FIRE_THRESHOLD_MULTIPLIER)
    expect(eHfire).toBeCloseTo(eCW * H_FIRE_THRESHOLD_MULTIPLIER, 5)
  })

  it('lysis field increases with frequency (harder to lyse at high f)', () => {
    const eLow  = lysisFieldImpl(TARGET_CELL, 10,      SIGMA_E, 1.0, 1.0, 1.0)
    const eHigh = lysisFieldImpl(TARGET_CELL, 100_000, SIGMA_E, 1.0, 1.0, 1.0)
    expect(eHigh).toBeGreaterThan(eLow)
  })

  it('lysis field scales inversely with PEF (short pulses need higher field)', () => {
    const pefFull = 1.0
    const pefHalf = 0.5
    const eFull = lysisFieldImpl(TARGET_CELL, 500, SIGMA_E, 1.0, pefFull, 1.0)
    const eHalf = lysisFieldImpl(TARGET_CELL, 500, SIGMA_E, 1.0, pefHalf, 1.0)
    expect(eHalf).toBeCloseTo(eFull * 2, 5)
  })

  it('at DR = 1 (lysis threshold): Vm = Vth', () => {
    // If we apply E = lysisField, the resulting Vm should equal thresholdVoltage
    const e = lysisFieldImpl(TARGET_CELL, 500, SIGMA_E, 1.0, 1.0, 1.0)
    const vm = computeSchwan(TARGET_CELL, 500, e, SIGMA_E)
    expect(vm).toBeCloseTo(TARGET_CELL.thresholdVoltage, 4)
  })
})

// ── Disruption-ratio field independence ──────────────────────────────────────
// DR_T/DR_H = (Vm_T/Vth_T) / (Vm_H/Vth_H) — field cancels in ratio.
// This is the core justification for using UNIT_FIELD in optimalFreqResult.

describe('DR selectivity ratio is field-independent', () => {
  it('selectivity ratio is the same at any field intensity', () => {
    const computeSelectivity = (fieldVcm: number, freqKHz: number): number => {
      const vmT = computeSchwan(TARGET_CELL,  freqKHz, fieldVcm, SIGMA_E)
      const vmH = computeSchwan(HEALTHY_CELL, freqKHz, fieldVcm, SIGMA_E)
      const drT = vmT / TARGET_CELL.thresholdVoltage
      const drH = vmH / HEALTHY_CELL.thresholdVoltage
      return drH > 0 ? drT / drH : drT
    }

    const sel1   = computeSelectivity(100,    500)
    const sel500 = computeSelectivity(500,    500)
    const sel5k  = computeSelectivity(5_000,  500)
    expect(sel500).toBeCloseTo(sel1,   8)
    expect(sel5k).toBeCloseTo(sel1,    8)
  })

  it('selectivity ratio is frequency-dependent (different at different freqs)', () => {
    const computeSelectivity = (freqKHz: number): number => {
      const vmT = computeSchwan(TARGET_CELL,  freqKHz, FIELD, SIGMA_E)
      const vmH = computeSchwan(HEALTHY_CELL, freqKHz, FIELD, SIGMA_E)
      const drT = vmT / TARGET_CELL.thresholdVoltage
      const drH = vmH / HEALTHY_CELL.thresholdVoltage
      return drH > 0 ? drT / drH : drT
    }
    // At quasi-DC, sel = R_T/R_H = 10/6 ≈ 1.67
    // At high frequency: sel → (R_T·τ_H)/(R_H·τ_T)
    const selDC   = computeSelectivity(0.001)
    const selHigh = computeSelectivity(100_000)
    expect(selDC).not.toBeCloseTo(selHigh, 1)
  })

  it('quasi-DC selectivity equals R_T/R_H when thresholds are equal', () => {
    // When Vth_T = Vth_H, DR selectivity at DC = R_T/R_H
    const vmT = computeSchwan(TARGET_CELL,  0.001, FIELD, SIGMA_E)
    const vmH = computeSchwan(HEALTHY_CELL, 0.001, FIELD, SIGMA_E)
    const sel = (vmT / TARGET_CELL.thresholdVoltage) / (vmH / HEALTHY_CELL.thresholdVoltage)
    expect(sel).toBeCloseTo(TARGET_CELL.radius / HEALTHY_CELL.radius, 2)
  })
})

// ── SAR model ────────────────────────────────────────────────────────────────

describe('computeSAR', () => {
  it('SAR scales as E² (doubling field → 4× SAR)', () => {
    const sar1 = computeSAR(TARGET_CELL, FIELD,      SIGMA_E)
    const sar2 = computeSAR(TARGET_CELL, FIELD * 2,  SIGMA_E)
    expect(sar2).toBeCloseTo(sar1 * 4, 5)
  })

  it('returns non-negative values', () => {
    expect(computeSAR(TARGET_CELL, 0, SIGMA_E)).toBe(0)
    expect(computeSAR(TARGET_CELL, FIELD, SIGMA_E)).toBeGreaterThan(0)
  })
})

// ── Slider ranges ─────────────────────────────────────────────────────────────
// Validates that each category has a sensible, non-overlapping frequency range
// and that the snap-to-optimal clamping logic will operate correctly.

describe('SLIDER_RANGES', () => {
  const ranges = [
    ['IRE_MAMMALIAN',      SLIDER_RANGES.IRE_MAMMALIAN],
    ['IRE_BACTERIA',       SLIDER_RANGES.IRE_BACTERIA],
    ['IRE_VIRUS',          SLIDER_RANGES.IRE_VIRUS],
    ['RESONANCE_MAMMALIAN',SLIDER_RANGES.RESONANCE_MAMMALIAN],
    ['RESONANCE_BACTERIA', SLIDER_RANGES.RESONANCE_BACTERIA],
    ['RESONANCE_VIRUS',    SLIDER_RANGES.RESONANCE_VIRUS],
  ] as const

  it.each(ranges)('%s: freqMin < freqMax', (_, range) => {
    expect(range.freqMin).toBeLessThan(range.freqMax)
  })

  it.each(ranges)('%s: fieldMin < fieldMax', (_, range) => {
    expect(range.fieldMin).toBeLessThan(range.fieldMax)
  })

  it.each(ranges)('%s: freqMin >= 1 kHz', (_, range) => {
    expect(range.freqMin).toBeGreaterThanOrEqual(1)
  })

  it('IRE_MAMMALIAN top is 100 MHz', () => {
    expect(SLIDER_RANGES.IRE_MAMMALIAN.freqMax).toBe(100_000)
  })

  it('IRE_BACTERIA top is 1 GHz', () => {
    expect(SLIDER_RANGES.IRE_BACTERIA.freqMax).toBe(1_000_000)
  })

  it('IRE_VIRUS top is 5 GHz', () => {
    expect(SLIDER_RANGES.IRE_VIRUS.freqMax).toBe(5_000_000)
  })

  it('clamping logic: snap to max when optimal > freqMax', () => {
    const range = SLIDER_RANGES.IRE_MAMMALIAN
    const optimalBeyond = range.freqMax + 1_000
    const clamped = Math.round(Math.max(range.freqMin, Math.min(range.freqMax, optimalBeyond)))
    expect(clamped).toBe(range.freqMax)
  })

  it('clamping logic: snap to min when optimal < freqMin', () => {
    const range = SLIDER_RANGES.IRE_MAMMALIAN
    const optimalBelow = range.freqMin - 1
    const clamped = Math.round(Math.max(range.freqMin, Math.min(range.freqMax, optimalBelow)))
    expect(clamped).toBe(range.freqMin)
  })

  it('clamping logic: optimal within range passes through unchanged', () => {
    const range = SLIDER_RANGES.IRE_MAMMALIAN
    const optimal = Math.round((range.freqMin + range.freqMax) / 2)
    const clamped = Math.round(Math.max(range.freqMin, Math.min(range.freqMax, optimal)))
    expect(clamped).toBe(optimal)
  })

  it('optimalBeyondRange detects both above-max and below-min', () => {
    const range = SLIDER_RANGES.IRE_MAMMALIAN
    const checkBeyond = (khz: number): boolean =>
      khz > range.freqMax || khz < range.freqMin
    expect(checkBeyond(range.freqMax + 1)).toBe(true)
    expect(checkBeyond(range.freqMin - 1)).toBe(true)
    expect(checkBeyond(range.freqMin)).toBe(false)
    expect(checkBeyond(range.freqMax)).toBe(false)
    expect(checkBeyond((range.freqMin + range.freqMax) / 2)).toBe(false)
  })
})

// ── MIN_PULSE_ENVELOPE guard ──────────────────────────────────────────────────

describe('MIN_PULSE_ENVELOPE', () => {
  it('is a small positive number that prevents division by zero in lysis field', () => {
    expect(MIN_PULSE_ENVELOPE).toBeGreaterThan(0)
    expect(MIN_PULSE_ENVELOPE).toBeLessThan(0.01)
  })

  it('lysis field with pef=0 uses MIN_PULSE_ENVELOPE, not infinity', () => {
    const e = lysisFieldImpl(TARGET_CELL, 500, SIGMA_E, 1.0, 0, 1.0)
    expect(isFinite(e)).toBe(true)
  })
})

// ── tempCorrectedVth — electrosensitization and temperature correction ─────────
// Central threshold function. Two independent multiplicative corrections:
//   1. Temperature: max(TEMP_EP_CLAMP_MIN, 1 − TEMP_EP_COEFF × max(0, T − 37))
//   2. Electrosensitization: max(CLAMP_MIN, N^(−α)) when N > 1, else 1.0

describe('tempCorrectedVth — N=1 baseline (no electrosensitization)', () => {
  it('N=1 at body temp returns nominal Vth unchanged', () => {
    expect(tempCorrectedVth(1.0, BODY_TEMP_C, 1)).toBeCloseTo(1.0, 10)
  })

  it('N=0 (single-call edge case) behaves as N=1 — no reduction', () => {
    // pulseCount <= 1 → nFactor = 1.0; same result as N=1
    expect(tempCorrectedVth(1.0, BODY_TEMP_C, 0)).toBeCloseTo(1.0, 10)
  })

  it('scales linearly with nominalVth regardless of N', () => {
    const v1 = tempCorrectedVth(0.5, BODY_TEMP_C, 1)
    const v2 = tempCorrectedVth(1.0, BODY_TEMP_C, 1)
    const v3 = tempCorrectedVth(2.0, BODY_TEMP_C, 1)
    expect(v2).toBeCloseTo(v1 * 2, 10)
    expect(v3).toBeCloseTo(v1 * 4, 10)
  })
})

describe('tempCorrectedVth — electrosensitization N factor', () => {
  it('N=10: factor = 10^(−0.20) ≈ 0.631', () => {
    const expected = Math.pow(10, -ELECTROSENSITIZATION_EXPONENT)
    expect(tempCorrectedVth(1.0, BODY_TEMP_C, 10)).toBeCloseTo(expected, 5)
  })

  it('N=100: factor = 100^(−0.20) ≈ 0.398', () => {
    const expected = Math.pow(100, -ELECTROSENSITIZATION_EXPONENT)
    expect(tempCorrectedVth(1.0, BODY_TEMP_C, 100)).toBeCloseTo(expected, 5)
  })

  it('N=2: factor = 2^(−0.20) ≈ 0.871', () => {
    const expected = Math.pow(2, -ELECTROSENSITIZATION_EXPONENT)
    expect(tempCorrectedVth(1.0, BODY_TEMP_C, 2)).toBeCloseTo(expected, 5)
  })

  it('N=200: factor is clamped to ELECTROSENSITIZATION_CLAMP_MIN (0.35)', () => {
    // 200^(−0.20) ≈ 0.347 < 0.35, so clamp applies
    expect(tempCorrectedVth(1.0, BODY_TEMP_C, 200)).toBeCloseTo(ELECTROSENSITIZATION_CLAMP_MIN, 5)
  })

  it('N=1000: deeply clamped — still returns CLAMP_MIN, not near-zero', () => {
    expect(tempCorrectedVth(1.0, BODY_TEMP_C, 1000)).toBeCloseTo(ELECTROSENSITIZATION_CLAMP_MIN, 5)
  })

  it('threshold decreases monotonically as N increases from 1 to 100', () => {
    const v1   = tempCorrectedVth(1.0, BODY_TEMP_C, 1)
    const v5   = tempCorrectedVth(1.0, BODY_TEMP_C, 5)
    const v20  = tempCorrectedVth(1.0, BODY_TEMP_C, 20)
    const v100 = tempCorrectedVth(1.0, BODY_TEMP_C, 100)
    expect(v1).toBeGreaterThan(v5)
    expect(v5).toBeGreaterThan(v20)
    expect(v20).toBeGreaterThan(v100)
  })

  it('threshold at very high N never drops below CLAMP_MIN × nominalVth', () => {
    const vth = 0.8
    const floor = vth * ELECTROSENSITIZATION_CLAMP_MIN
    expect(tempCorrectedVth(vth, BODY_TEMP_C, 10_000)).toBeGreaterThanOrEqual(floor - 1e-12)
  })
})

describe('tempCorrectedVth — temperature correction', () => {
  it('at body temperature (37°C) there is no thermal reduction', () => {
    expect(tempCorrectedVth(1.0, BODY_TEMP_C, 1)).toBeCloseTo(1.0, 10)
  })

  it('below body temperature also has no thermal reduction (one-sided softening)', () => {
    // max(0, T−37) clamps negative delta to 0 — cold doesn't harden the threshold
    expect(tempCorrectedVth(1.0, 20, 1)).toBeCloseTo(1.0, 10)
    expect(tempCorrectedVth(1.0, 4,  1)).toBeCloseTo(1.0, 10)
  })

  it('at T=42°C: factor = max(0.70, 1 − 0.003×5) = 0.985', () => {
    const expected = Math.max(TEMP_EP_CLAMP_MIN, 1 - TEMP_EP_COEFF * 5)
    expect(tempCorrectedVth(1.0, 42, 1)).toBeCloseTo(expected, 8)
  })

  it('at T=137°C: factor is exactly TEMP_EP_CLAMP_MIN (0.70) — clamp boundary', () => {
    // 1 − 0.003×100 = 0.70, exactly at the clamp
    expect(tempCorrectedVth(1.0, 137, 1)).toBeCloseTo(TEMP_EP_CLAMP_MIN, 8)
  })

  it('above clamp temperature (T=200°C) still returns TEMP_EP_CLAMP_MIN, not lower', () => {
    expect(tempCorrectedVth(1.0, 200, 1)).toBeCloseTo(TEMP_EP_CLAMP_MIN, 8)
  })
})

describe('tempCorrectedVth — combined temperature and electrosensitization', () => {
  it('N=10, T=42°C: both corrections multiply independently', () => {
    const nFactor   = Math.pow(10, -ELECTROSENSITIZATION_EXPONENT)              // ≈ 0.631
    const tempFactor = Math.max(TEMP_EP_CLAMP_MIN, 1 - TEMP_EP_COEFF * 5)      // 0.985
    expect(tempCorrectedVth(1.0, 42, 10)).toBeCloseTo(nFactor * tempFactor, 7)
  })

  it('N=100, T=42°C: corrections independent and always positive', () => {
    const result = tempCorrectedVth(1.0, 42, 100)
    expect(result).toBeGreaterThan(0)
    expect(result).toBeLessThan(1.0)
  })

  it('result is always strictly positive regardless of inputs', () => {
    expect(tempCorrectedVth(1.0, 500, 10_000)).toBeGreaterThan(0)
    expect(tempCorrectedVth(0.001, 500, 10_000)).toBeGreaterThan(0)
  })
})
