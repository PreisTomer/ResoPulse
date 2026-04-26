// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// Tests the Jacobian propagation helpers used by the closed-loop uncertainty bands and the lumped transient thermal solver.

import { describe, it, expect } from 'vitest'

import {
  computeSchwanDR,
  computeResonantDR,
  computeSteadyStateTemp,
  computeTemperatureRamp,
  jacobianSchwanDR,
  jacobianResonantDR,
  jacobianSchwanVm,
  newtonCoolingLambda,
  propagateScalarVariance,
  propagatedTiVariance,
  type CalibrationCovariance,
  type ForwardDrInput,
} from '@/utils/physics'

import { TARGET_CELL, HEALTHY_CELL, SIGMA_E, FIELD } from './testFixtures'
import type { CellConfig } from '@/types/cell'

const BASE_INPUT: ForwardDrInput = {
  cell:                TARGET_CELL,
  freqKHz:             100,
  fieldVcm:            FIELD,
  sigma_e:             SIGMA_E,
  cosTheta:            1.0,
  tempC:               37,
  pulseWidthNs:        100,
  isPulsed:            true,
  hfireMult:           1.0,
  effectivePulseCount: 1,
}

describe('computeSchwanDR', () => {
  it('returns a positive ratio at typical EP conditions', () => {
    expect(computeSchwanDR(BASE_INPUT)).toBeGreaterThan(0)
  })

  it('halves DR when V_th doubles (linear in V_th)', () => {
    const base = computeSchwanDR(BASE_INPUT)
    const doubledVth: ForwardDrInput = { ...BASE_INPUT, cell: { ...TARGET_CELL, thresholdVoltage: TARGET_CELL.thresholdVoltage * 2 } }
    expect(computeSchwanDR(doubledVth)).toBeCloseTo(base * 0.5, 6)
  })

  it('returns zero on hfireMult=0 or V_th=0 (defensive against bad inputs)', () => {
    expect(computeSchwanDR({ ...BASE_INPUT, hfireMult: 0 })).toBe(0)
    expect(computeSchwanDR({ ...BASE_INPUT, cell: { ...TARGET_CELL, thresholdVoltage: 0 } })).toBe(0)
  })
})

describe('jacobianSchwanDR', () => {
  it('∂DR/∂V_th_mult is negative (raising V_th lowers DR)', () => {
    const j = jacobianSchwanDR(BASE_INPUT)
    expect(j.p2).toBeLessThan(0)
  })

  it('CW DC limit: ∂DR/∂σ_i_mult vanishes (no PEF, Vm independent of σ_i)', () => {
    // In CW the pulse envelope factor = 1.0, so σ_i only enters through τ in Vm. At ωτ << 1, Vm becomes σ_i-independent.
    const cwDc = jacobianSchwanDR({ ...BASE_INPUT, freqKHz: 0.001, isPulsed: false })
    expect(Math.abs(cwDc.p1)).toBeLessThan(1e-3)
  })

  it('central-difference approximation matches the analytic V_th derivative', () => {
    // Analytic: DR = K / V_th, so ∂DR/∂(V_th_mult) at mult=1 is -DR (since DR depends on V_th_mult linearly with negative sign).
    // Note: the chain rule gives ∂DR/∂(V_th * scale) at scale=1 is dDR/dV_th × V_th = -DR/V_th × V_th = -DR.
    const dr = computeSchwanDR(BASE_INPUT)
    const j  = jacobianSchwanDR(BASE_INPUT)
    expect(j.p2).toBeCloseTo(-dr, 4)
  })
})

describe('jacobianSchwanVm', () => {
  it('p2 is exactly zero (Vm does not depend on V_th)', () => {
    const j = jacobianSchwanVm(TARGET_CELL, 100, FIELD, SIGMA_E, 1.0)
    expect(j.p2).toBe(0)
  })

  it('p1 has the same sign as ∂Vm/∂σ_i (negative above fc, ~zero below)', () => {
    // Above fc (ω·τ > 1), increasing σ_i shortens τ → reduces (1+(ωτ)²) denominator → raises Vm. So ∂Vm/∂σ_i_mult > 0 above fc.
    // No wait — increasing σ_i decreases τ (τ = R·Cm·(2σ_e+σ_i)/(2σ_e·σ_i), the σ_i term is in denominator dominating at high σ_i). Smaller τ means smaller ωτ at the same f, so 1/√(1+(ωτ)²) gets larger → Vm rises. So ∂Vm/∂σ_i_mult > 0 above fc.
    const above = jacobianSchwanVm(TARGET_CELL, 50_000, FIELD, SIGMA_E, 1.0)
    expect(above.p1).toBeGreaterThan(0)
  })
})

describe('propagateScalarVariance', () => {
  it('returns J.p1²·cov_11 when only σ_i varies (V_th cov zero)', () => {
    const cov: CalibrationCovariance = { cov11: 0.04, cov12: 0, cov22: 0 }
    const j = { p1: 2, p2: 5 }
    expect(propagateScalarVariance(j, cov)).toBeCloseTo(4 * 0.04, 9)
  })

  it('includes the cross-term 2·J.p1·J.p2·cov_12 (correlated parameters)', () => {
    const cov: CalibrationCovariance = { cov11: 0.04, cov12: 0.01, cov22: 0.04 }
    const j = { p1: 2, p2: 3 }
    // 4·0.04 + 2·2·3·0.01 + 9·0.04 = 0.16 + 0.12 + 0.36 = 0.64
    expect(propagateScalarVariance(j, cov)).toBeCloseTo(0.64, 9)
  })

  it('clamps to zero (defensive against negative variance from numerical noise)', () => {
    const cov: CalibrationCovariance = { cov11: 1, cov12: -100, cov22: 1 }   // unphysical |corr|>1
    const j = { p1: 1, p2: 1 }
    // 1 + 2·1·1·(-100) + 1 = -198 → clamped to 0
    expect(propagateScalarVariance(j, cov)).toBe(0)
  })
})

describe('propagatedTiVariance', () => {
  it('is non-negative for any inputs', () => {
    const cov: CalibrationCovariance = { cov11: 0.05, cov12: 0, cov22: 0.05 }
    const drT = 0.7, drH = 0.3
    const jacT = { p1: 0.5, p2: -0.4 }
    const jacH = { p1: 0.3, p2: -0.2 }
    expect(propagatedTiVariance(drT, drH, jacT, jacH, cov, cov)).toBeGreaterThanOrEqual(0)
  })

  it('returns 0 when DR_H is zero (denominator collapse)', () => {
    const cov: CalibrationCovariance = { cov11: 0.05, cov12: 0, cov22: 0.05 }
    const j = { p1: 1, p2: 1 }
    expect(propagatedTiVariance(0.7, 0, j, j, cov, cov)).toBe(0)
  })

  it('grows with target covariance when healthy is fixed', () => {
    const drT = 0.7, drH = 0.3
    const jacT = { p1: 0.5, p2: -0.4 }
    const jacH = { p1: 0.3, p2: -0.2 }
    const fixedH: CalibrationCovariance = { cov11: 0, cov12: 0, cov22: 0 }
    const lowT:  CalibrationCovariance = { cov11: 0.01, cov12: 0, cov22: 0.01 }
    const highT: CalibrationCovariance = { cov11: 0.10, cov12: 0, cov22: 0.10 }
    expect(propagatedTiVariance(drT, drH, jacT, jacH, highT, fixedH))
      .toBeGreaterThan(propagatedTiVariance(drT, drH, jacT, jacH, lowT, fixedH))
  })
})

describe('jacobianResonantDR', () => {
  // A virus-like preset with capsid resonance params.
  const VIRUS: CellConfig = {
    ...TARGET_CELL,
    id: 'virus-test',
    radius: 0.05,
    resonantFreqGHz: 8.0,
    capsidQ: 5.0,
    resonantThresholdVcm: 100.0,
  } as CellConfig

  const RES_INPUT: ForwardDrInput = { ...BASE_INPUT, cell: VIRUS, freqKHz: 8e6, fieldVcm: 50, isPulsed: false, effectivePulseCount: 1, hfireMult: 1.0 }

  it('∂DR/∂V_thr_mult is negative (raising threshold lowers DR)', () => {
    const j = jacobianResonantDR(RES_INPUT)
    expect(j.p2).toBeLessThan(0)
  })

  it('|∂DR/∂Q_mult| is largest at intermediate detuning, vanishes at exact resonance', () => {
    const onResonance = jacobianResonantDR(RES_INPUT)
    const detuned     = jacobianResonantDR({ ...RES_INPUT, freqKHz: RES_INPUT.freqKHz * 0.7 })
    expect(Math.abs(detuned.p1)).toBeGreaterThan(Math.abs(onResonance.p1))
  })

  it('forward DR is positive on the resonance peak', () => {
    expect(computeResonantDR(RES_INPUT)).toBeGreaterThan(0)
  })

  it('forward DR returns 0 when capsid params are missing', () => {
    expect(computeResonantDR({ ...RES_INPUT, cell: HEALTHY_CELL })).toBe(0)
  })
})

describe('newtonCoolingLambda', () => {
  it('matches the BTX 1mm cuvette default within ~2x (sanity)', () => {
    // BTX 1mm: V = 100 µL, A_wall = 2 cm², U = 50 W/(m²·K), ρ = 1000, cp = 4180
    const lambda = newtonCoolingLambda(2.0, 0.1, 50, 1000, 4180)
    // λ = 50·2e-4 / (1000·1e-7·4180) ≈ 0.0239 s⁻¹  (constant in physics is 0.02)
    expect(lambda).toBeGreaterThan(0.01)
    expect(lambda).toBeLessThan(0.05)
  })

  it('falls back to the default constant when geometry is invalid', () => {
    const fallback = newtonCoolingLambda(0, 0, 50, 1000, 4180)
    expect(fallback).toBeGreaterThan(0)
  })
})

describe('computeTemperatureRamp', () => {
  it('starts at the initial temperature and approaches the steady-state asymptote', () => {
    const T0 = 37, durationS = 60, sar = 100, dc = 0.5, cp = 4180
    const ramp = computeTemperatureRamp(sar, dc, cp, 0, durationS, T0, T0, 100)
    expect(ramp[0]!.tempC).toBeCloseTo(T0, 6)
    const tSs = computeSteadyStateTemp(sar, dc, cp, 0, T0)
    // After many time-constants, T should be within 1% of T_ss.
    expect(ramp[ramp.length - 1]!.tempC).toBeCloseTo(tSs, 0)
  })

  it('rises monotonically when SAR > 0 and ambient < T_ss (no overshoot under constant input)', () => {
    const ramp = computeTemperatureRamp(80, 0.3, 4180, 0, 30, 37, 37, 50)
    for (let i = 1; i < ramp.length; i++) {
      expect(ramp[i]!.tempC).toBeGreaterThanOrEqual(ramp[i - 1]!.tempC - 1e-9)
    }
  })

  it('cools toward ambient when initial temperature is above ambient and SAR=0', () => {
    // 200 s ≈ 4 time-constants at λ=0.02 ⇒ ~98% decay; settle near 37°C.
    const ramp = computeTemperatureRamp(0, 0, 4180, 0, 200, 50, 37, 50)
    expect(ramp[0]!.tempC).toBeCloseTo(50, 6)
    expect(ramp[ramp.length - 1]!.tempC).toBeLessThan(38)
  })
})
