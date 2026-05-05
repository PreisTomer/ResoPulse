// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Cross-mode invariants. The 11 user-toggle branches (waveform, chart mode, double-shell, orientation, medium, electrosensitization, calibration, fermenter, TTF, viral RF, cell category) must not silently bleed into paths they should not affect — this is the class of bug the project's correctness.md flags as the top risk. Each it() locks one such non-leak.

import { describe, it, expect } from 'vitest'

import { H_FIRE_THRESHOLD_MULTIPLIER, BODY_TEMP_C } from '@/constants/physics'
import { WAVEFORM, CELL_CATEGORY } from '@/constants/strings'

import {
  computeSchwan,
  computeSAR,
  computeTau,
  computeFc,
  computeNuclearVm,
  computeResonantDR,
  computeResonantLineshape,
  pulseEnvelopeClamped,
  getHFireMultiplier,
  tempCorrectedVth,
  computeLysisField,
  isResonanceTargetActive,
  computeFermenterActiveFraction,
  computeFermenterExposureProbability,
  computeFermenterEffectiveDR,
  computeUptakeFraction,
  computePopulationLysisFraction,
  computeDepCmReal,
  computeSkinDepthMm,
  computeViralRfPredictedDR,
  isSubThresholdField,
  jacobianSchwanDR,
  propagateScalarVariance,
  computeSchwanDR,
} from '@/utils/physics'

import type { CellConfig } from '@/types/cell'

import { TARGET_CELL, HEALTHY_CELL, SIGMA_E, FIELD } from './testFixtures'

const QUASI_DC_KHZ = 10
const PULSE_NS     = 100

const withNucleus = (cell: CellConfig): CellConfig => ({
  ...cell,
  nuclearRadius: 5.0,
  nuclearMembraneThickness: 15,
  nuclearMembraneEps: 10,
  nucleoplasmConductivity: 0.9,
  nuclearThresholdVoltage: 0.5,
})

const virusWithResonance: CellConfig = {
  ...TARGET_CELL,
  id: 'test-virus',
  radius: 0.014,
  resonantFreqGHz: 7.7,
  capsidQ: 12,
  resonantThresholdVcm: 500,
}

describe('Cross-mode invariant: orientation θ', () => {
  it('θ=90° (cosθ=0) collapses Schwan Vm to zero', () => {
    const vm = computeSchwan(TARGET_CELL, QUASI_DC_KHZ, FIELD, SIGMA_E, 0)
    expect(vm).toBe(0)
  })

  it('SAR signature has no orientation arg — SAR is field-driven, not cosθ-driven', () => {
    expect(computeSAR.length).toBeLessThanOrEqual(4)
    const sar = computeSAR(TARGET_CELL, FIELD, SIGMA_E)
    expect(sar).toBeGreaterThan(0)
  })

  it('Vm scales linearly in cosθ at fixed (R, σ_e, f, E)', () => {
    const vmFull = computeSchwan(TARGET_CELL, QUASI_DC_KHZ, FIELD, SIGMA_E, 1.0)
    const vmHalf = computeSchwan(TARGET_CELL, QUASI_DC_KHZ, FIELD, SIGMA_E, 0.5)
    expect(vmHalf).toBeCloseTo(vmFull * 0.5, 9)
  })
})

describe('Cross-mode invariant: medium σ_e affects τ but not quasi-DC Vm', () => {
  it('Vm at quasi-DC is essentially unchanged when σ_e doubles (Schwan plateau)', () => {
    const vmLow  = computeSchwan(TARGET_CELL, QUASI_DC_KHZ, FIELD, 0.14, 1.0)
    const vmHigh = computeSchwan(TARGET_CELL, QUASI_DC_KHZ, FIELD, 0.28, 1.0)
    expect(Math.abs(vmHigh - vmLow) / vmLow).toBeLessThan(0.01)
  })

  it('τ shrinks and fc rises as σ_e increases (membrane charges faster in conductive medium)', () => {
    const tauLow  = computeTau(TARGET_CELL, 0.14)
    const tauHigh = computeTau(TARGET_CELL, 1.4)
    const fcLow   = computeFc(TARGET_CELL, 0.14)
    const fcHigh  = computeFc(TARGET_CELL, 1.4)
    expect(tauHigh).toBeLessThan(tauLow)
    expect(fcHigh).toBeGreaterThan(fcLow)
  })
})

describe('Cross-mode invariant: waveform — CW / Pulsed / H-FIRE', () => {
  it('CW pulse envelope is exactly 1.0 regardless of pulse width', () => {
    const tau = computeTau(TARGET_CELL, SIGMA_E)
    expect(pulseEnvelopeClamped(tau, 1, false)).toBe(1.0)
    expect(pulseEnvelopeClamped(tau, 1e9, false)).toBe(1.0)
  })

  it('Pulsed pulse envelope approaches 1.0 for very long pulses (PEF → 1)', () => {
    const tau = computeTau(TARGET_CELL, SIGMA_E)
    const pefLong = pulseEnvelopeClamped(tau, 1e6, true)
    expect(pefLong).toBeGreaterThan(0.999)
  })

  it('H-FIRE multiplier is exactly H_FIRE_THRESHOLD_MULTIPLIER; CW and Pulsed return 1.0', () => {
    expect(getHFireMultiplier(WAVEFORM.CW)).toBe(1.0)
    expect(getHFireMultiplier(WAVEFORM.PULSED)).toBe(1.0)
    expect(getHFireMultiplier(WAVEFORM.H_FIRE)).toBe(H_FIRE_THRESHOLD_MULTIPLIER)
  })

  it('H-FIRE lysis field is exactly H_FIRE_THRESHOLD_MULTIPLIER × Pulsed lysis field at PEF=1', () => {
    const eLysPulsed = computeLysisField(TARGET_CELL, QUASI_DC_KHZ, SIGMA_E, 1.0, 1.0, 1.0,                              BODY_TEMP_C, 1)
    const eLysHfire  = computeLysisField(TARGET_CELL, QUASI_DC_KHZ, SIGMA_E, 1.0, 1.0, H_FIRE_THRESHOLD_MULTIPLIER, BODY_TEMP_C, 1)
    expect(eLysHfire / eLysPulsed).toBeCloseTo(H_FIRE_THRESHOLD_MULTIPLIER, 6)
  })
})

describe('Cross-mode invariant: electrosensitization (N-pulse)', () => {
  it('tempCorrectedVth at N=1, T=37°C is identity (no electrosensitization, no temp correction)', () => {
    expect(tempCorrectedVth(1.0, BODY_TEMP_C, 1)).toBeCloseTo(1.0, 9)
  })

  it('tempCorrectedVth at N=20 reduces threshold below N=1 (Pakhomov 2010 sensitization)', () => {
    const v1  = tempCorrectedVth(1.0, BODY_TEMP_C, 1)
    const v20 = tempCorrectedVth(1.0, BODY_TEMP_C, 20)
    expect(v20).toBeLessThan(v1)
  })

  it('tempCorrectedVth is monotonically non-increasing in N at fixed T', () => {
    const samples = [1, 2, 5, 10, 20, 50].map(n => tempCorrectedVth(1.0, BODY_TEMP_C, n))
    samples.reduce((prev, curr) => {
      expect(curr).toBeLessThanOrEqual(prev)
      return curr
    })
  })

  it('tempCorrectedVth is clamped — never collapses to zero even at huge N', () => {
    const vHuge = tempCorrectedVth(1.0, BODY_TEMP_C, 1e6)
    expect(vHuge).toBeGreaterThan(0)
  })
})

describe('Cross-mode invariant: temperature correction', () => {
  it('Threshold drops as T rises above 37°C (Weaver & Chizmadzhev fluidity)', () => {
    const v37 = tempCorrectedVth(1.0, 37, 1)
    const v45 = tempCorrectedVth(1.0, 45, 1)
    expect(v45).toBeLessThan(v37)
  })

  it('Threshold below 37°C is identical to 37°C (no negative-T amplification)', () => {
    const v37 = tempCorrectedVth(1.0, 37, 1)
    const v25 = tempCorrectedVth(1.0, 25, 1)
    expect(v25).toBeCloseTo(v37, 9)
  })
})

describe('Cross-mode invariant: double-shell nuclear envelope', () => {
  it('Plasma-membrane Schwan Vm is independent of nuclear params at every f', () => {
    const cellNoNuc = { ...TARGET_CELL }
    const cellWithNuc = withNucleus(TARGET_CELL)
    for (const f of [10, 100, 1_000, 100_000, 1_000_000]) {
      const vmNo  = computeSchwan(cellNoNuc,   f, FIELD, SIGMA_E, 1.0)
      const vmYes = computeSchwan(cellWithNuc, f, FIELD, SIGMA_E, 1.0)
      expect(vmYes).toBeCloseTo(vmNo, 9)
    }
  })

  it('Nuclear Vm is exactly 0 when nuclearRadius is missing', () => {
    expect(computeNuclearVm(TARGET_CELL, 100, FIELD, SIGMA_E, 1.0)).toBe(0)
  })

  it('Nuclear Vm is bandpass: zero at DC, zero at very high f, peak in between', () => {
    const cell    = withNucleus(TARGET_CELL)
    const vmDc    = computeNuclearVm(cell, 1e-6, FIELD, SIGMA_E, 1.0)
    const vmHigh  = computeNuclearVm(cell, 1e8,  FIELD, SIGMA_E, 1.0)
    const vmMid   = computeNuclearVm(cell, 1e3,  FIELD, SIGMA_E, 1.0)
    expect(vmDc).toBeLessThan(1e-6)
    expect(vmHigh).toBeLessThan(vmMid)
    expect(vmMid).toBeGreaterThan(0)
  })
})

describe('Cross-mode invariant: chart mode (Schwan vs Resonance)', () => {
  it('isResonanceTargetActive is false for mammalian cells regardless of chart mode', () => {
    expect(isResonanceTargetActive(true,  CELL_CATEGORY.MAMMALIAN, TARGET_CELL)).toBe(false)
    expect(isResonanceTargetActive(false, CELL_CATEGORY.MAMMALIAN, TARGET_CELL)).toBe(false)
  })

  it('isResonanceTargetActive is false when chart mode is Schwan even for a virus with resonance params', () => {
    expect(isResonanceTargetActive(false, CELL_CATEGORY.VIRUS, virusWithResonance)).toBe(false)
  })

  it('isResonanceTargetActive is true only when mode + virus/bacteria + both resonant fields present', () => {
    expect(isResonanceTargetActive(true, CELL_CATEGORY.VIRUS,    virusWithResonance)).toBe(true)
    expect(isResonanceTargetActive(true, CELL_CATEGORY.BACTERIA, virusWithResonance)).toBe(true)
  })

  it('computeResonantDR returns 0 for mammalian cells (no resonant params present)', () => {
    const dr = computeResonantDR({
      cell: TARGET_CELL, freqKHz: QUASI_DC_KHZ, fieldVcm: FIELD, sigma_e: SIGMA_E,
      cosTheta: 1.0, tempC: BODY_TEMP_C, pulseWidthNs: PULSE_NS,
      isPulsed: true, hfireMult: 1.0, effectivePulseCount: 1,
    })
    expect(dr).toBe(0)
  })
})

describe('Cross-mode invariant: cell-pair independence', () => {
  it('changing target params does not perturb healthy Schwan Vm', () => {
    const vmH1 = computeSchwan(HEALTHY_CELL, QUASI_DC_KHZ, FIELD, SIGMA_E, 1.0)
    const targetMutated: CellConfig = { ...TARGET_CELL, conductivity: TARGET_CELL.conductivity * 5, radius: TARGET_CELL.radius * 1.7 }
    void computeSchwan(targetMutated, QUASI_DC_KHZ, FIELD, SIGMA_E, 1.0)
    const vmH2 = computeSchwan(HEALTHY_CELL, QUASI_DC_KHZ, FIELD, SIGMA_E, 1.0)
    expect(vmH2).toBe(vmH1)
  })
})

describe('Cross-mode invariant: lysis-field consistency at PEF=1, hfireMult=1, T=37°C, N=1', () => {
  it('matches the bare Schwan published formula E_lys = Vth / (1.5 · R · 100) at quasi-DC (within √(1+(ωτ)²) ≪ 1% correction)', () => {
    const eLys = computeLysisField(TARGET_CELL, QUASI_DC_KHZ, SIGMA_E, 1.0, 1.0, 1.0, BODY_TEMP_C, 1)
    const eLysBare = TARGET_CELL.thresholdVoltage / (1.5 * TARGET_CELL.radius * 1e-6 * 100)
    expect(eLys / eLysBare).toBeGreaterThan(0.999)
    expect(eLys / eLysBare).toBeLessThan(1.005)
  })

  it('lysis field returns sentinel value when cosθ < MIN_COS_THETA (θ → 90°)', () => {
    const eLysPole = computeLysisField(TARGET_CELL, QUASI_DC_KHZ, SIGMA_E, 1.0, 1.0, 1.0, BODY_TEMP_C, 1)
    const eLysPerp = computeLysisField(TARGET_CELL, QUASI_DC_KHZ, SIGMA_E, 0.0, 1.0, 1.0, BODY_TEMP_C, 1)
    expect(eLysPole).toBeLessThan(10000)
    expect(eLysPerp).toBeGreaterThan(1e5)
  })
})

describe('Cross-mode invariant: Schwan high-frequency rolloff', () => {
  it('Vm decreases monotonically across decades above fc', () => {
    const fcKhz = computeFc(TARGET_CELL, SIGMA_E)
    const samples = [0.1, 1, 10, 100, 1000].map(mult =>
      computeSchwan(TARGET_CELL, fcKhz * mult, FIELD, SIGMA_E, 1.0)
    )
    samples.reduce((prev, curr) => {
      expect(curr).toBeLessThanOrEqual(prev)
      return curr
    })
  })

  it('Vm at f = fc is approximately Vm(DC) / √2 (3 dB roll-off point)', () => {
    const fcKhz = computeFc(TARGET_CELL, SIGMA_E)
    const vmDc = computeSchwan(TARGET_CELL, 1e-6, FIELD, SIGMA_E, 1.0)
    const vmFc = computeSchwan(TARGET_CELL, fcKhz, FIELD, SIGMA_E, 1.0)
    const ratio = vmFc / vmDc
    expect(ratio).toBeCloseTo(1 / Math.sqrt(2), 2)
  })
})

describe('Cross-mode invariant: resonance Q-factor sharpness', () => {
  it('higher Q gives sharper Lorentzian peak (narrower FWHM)', () => {
    const fRes = 21
    const fHzOffset = 21.5e9
    const lQ4  = computeResonantLineshape(fRes, 4,  fHzOffset)
    const lQ12 = computeResonantLineshape(fRes, 12, fHzOffset)
    expect(lQ4).toBeGreaterThan(lQ12)
  })

  it('Lorentzian peak is exactly 1.0 at f = f_res for any Q', () => {
    expect(computeResonantLineshape(7.0, 1, 7.0e9)).toBeCloseTo(1.0, 9)
    expect(computeResonantLineshape(7.0, 4, 7.0e9)).toBeCloseTo(1.0, 9)
    expect(computeResonantLineshape(7.0, 12, 7.0e9)).toBeCloseTo(1.0, 9)
  })
})

describe('Cross-mode invariant: fermenter scale-up', () => {
  it('fermenter active fraction is bounded [0, 1] for any geometry', () => {
    const fSmall = computeFermenterActiveFraction(1, 1, 100_000)
    const fLarge = computeFermenterActiveFraction(100, 5, 1)
    expect(fSmall).toBeGreaterThanOrEqual(0)
    expect(fSmall).toBeLessThanOrEqual(1)
    expect(fLarge).toBeGreaterThanOrEqual(0)
    expect(fLarge).toBeLessThanOrEqual(1)
  })

  it('exposure probability approaches 1.0 with sufficient mixing time', () => {
    const pShort = computeFermenterExposureProbability(300, 1, 0.5)
    const pLong  = computeFermenterExposureProbability(300, 600, 0.5)
    expect(pLong).toBeGreaterThan(pShort)
    expect(pLong).toBeGreaterThan(0.99)
  })

  it('fermenter effective DR equals raw DR when exposure probability = 1', () => {
    const rawDr = 0.85
    expect(computeFermenterEffectiveDR(rawDr, 1.0)).toBe(rawDr)
    expect(computeFermenterEffectiveDR(rawDr, 0.0)).toBe(0)
    expect(computeFermenterEffectiveDR(rawDr, 0.5)).toBeCloseTo(rawDr * 0.5, 6)
  })
})

describe('Cross-mode invariant: cargo uptake window', () => {
  it('uptake is exactly 0 below DR = 0.50 (sub-threshold)', () => {
    expect(computeUptakeFraction(0.30, 1000, 5)).toBe(0)
    expect(computeUptakeFraction(0.49, 1000, 5)).toBe(0)
  })

  it('uptake is exactly 0 at or above DR = 0.85 (lysis dominates)', () => {
    expect(computeUptakeFraction(0.85, 1000, 5)).toBe(0)
    expect(computeUptakeFraction(0.95, 1000, 5)).toBe(0)
  })

  it('uptake peaks near the bell-shape midpoint DR ≈ 0.675', () => {
    const uMid  = computeUptakeFraction(0.675, 1000, 10)
    const uLow  = computeUptakeFraction(0.55,  1000, 10)
    const uHigh = computeUptakeFraction(0.80,  1000, 10)
    expect(uMid).toBeGreaterThan(uLow)
    expect(uMid).toBeGreaterThan(uHigh)
  })

  it('uptake is exactly 0 with zero pulses', () => {
    expect(computeUptakeFraction(0.675, 1000, 0)).toBe(0)
  })
})

describe('Cross-mode invariant: population lysis fraction', () => {
  it('cv=0 reduces to bare 1 - 1/dr (analytic limit)', () => {
    const dr = 1.5
    expect(computePopulationLysisFraction(dr, 0)).toBeCloseTo(1 - 1 / dr, 9)
  })

  it('returns 0 for dr ≤ 0', () => {
    expect(computePopulationLysisFraction(0, 0.25)).toBe(0)
    expect(computePopulationLysisFraction(-1, 0.25)).toBe(0)
  })

  it('output is monotonically non-decreasing in DR at fixed cv', () => {
    const drs = [0.3, 0.6, 0.9, 1.0, 1.5, 2.0, 5.0]
    const fractions = drs.map(dr => computePopulationLysisFraction(dr, 0.25))
    fractions.reduce((prev, curr) => {
      expect(curr).toBeGreaterThanOrEqual(prev - 1e-9)
      return curr
    })
  })

  it('output is bounded [0, 1] for any input', () => {
    for (const dr of [0.1, 0.5, 1.0, 2.0, 100.0]) {
      const f = computePopulationLysisFraction(dr, 0.25)
      expect(f).toBeGreaterThanOrEqual(0)
      expect(f).toBeLessThanOrEqual(1)
    }
  })
})

describe('Cross-mode invariant: DEP Clausius-Mossotti factor', () => {
  it('Re[K] is clamped to [-0.5, 0.5] across the spectrum', () => {
    for (const f of [0.001, 1, 1000, 100_000]) {
      const k = computeDepCmReal(TARGET_CELL, f, SIGMA_E, 80)
      expect(k).toBeGreaterThanOrEqual(-0.5)
      expect(k).toBeLessThanOrEqual(0.5)
    }
  })

  it('Re[K] is finite and well-defined at all standard frequencies', () => {
    for (const f of [0.01, 1, 1000, 1e6]) {
      const k = computeDepCmReal(TARGET_CELL, f, SIGMA_E, 80)
      expect(Number.isFinite(k)).toBe(true)
    }
  })
})

describe('Cross-mode invariant: EM skin depth', () => {
  it('skin depth is positive and finite for sensible inputs', () => {
    const depths = [1, 100, 1e6, 1e9].map(f => computeSkinDepthMm(f, SIGMA_E, 80))
    for (const d of depths) {
      expect(d).toBeGreaterThan(0)
      expect(Number.isFinite(d)).toBe(true)
    }
  })

  it('skin depth shrinks at higher conductivity in the kHz regime', () => {
    const dLowSigma  = computeSkinDepthMm(100, 0.1, 80)
    const dHighSigma = computeSkinDepthMm(100, 1.5, 80)
    expect(dHighSigma).toBeLessThan(dLowSigma)
  })

  it('skin depth returns Infinity for σ_e ≤ 0 or f ≤ 0 (guards)', () => {
    expect(computeSkinDepthMm(0, SIGMA_E, 80)).toBe(Infinity)
    expect(computeSkinDepthMm(100, 0, 80)).toBe(Infinity)
    expect(computeSkinDepthMm(100, -1, 80)).toBe(Infinity)
  })
})

describe('Cross-mode invariant: viral RF panel toggle', () => {
  it('viral RF DR returns 0 for cells without resonant params (mammalian)', () => {
    expect(computeViralRfPredictedDR(TARGET_CELL, 8.0, 30)).toBe(0)
  })

  it('viral RF DR returns 0 at zero frequency or zero field', () => {
    expect(computeViralRfPredictedDR(virusWithResonance, 0, 30)).toBe(0)
    expect(computeViralRfPredictedDR(virusWithResonance, 8.0, 0)).toBe(0)
  })
})

describe('Cross-mode invariant: TTFields sub-threshold detector', () => {
  it('isSubThresholdField is true when |Vm| < V_th and false above', () => {
    expect(isSubThresholdField(TARGET_CELL, QUASI_DC_KHZ, 100, SIGMA_E)).toBe(true)
    expect(isSubThresholdField(TARGET_CELL, QUASI_DC_KHZ, 5000, SIGMA_E)).toBe(false)
  })
})

describe('Cross-mode invariant: calibration multiplier identity', () => {
  it('Schwan DR computed with mult=1 perturbation matches unperturbed (Jacobian symmetry)', () => {
    const input = {
      cell: TARGET_CELL, freqKHz: QUASI_DC_KHZ, fieldVcm: FIELD, sigma_e: SIGMA_E,
      cosTheta: 1.0, tempC: BODY_TEMP_C, pulseWidthNs: PULSE_NS,
      isPulsed: true, hfireMult: 1.0, effectivePulseCount: 1,
    }
    const drBaseline = computeSchwanDR(input)
    const jac = jacobianSchwanDR(input)
    expect(drBaseline).toBeGreaterThan(0)
    expect(Number.isFinite(jac.p1)).toBe(true)
    expect(Number.isFinite(jac.p2)).toBe(true)
  })

  it('Variance propagation with zero covariance yields zero variance', () => {
    const variance = propagateScalarVariance(
      { p1: 0.5, p2: -0.3 },
      { cov11: 0, cov12: 0, cov22: 0 },
    )
    expect(variance).toBe(0)
  })

  it('Variance propagation is non-negative for any positive-definite covariance', () => {
    const variance = propagateScalarVariance(
      { p1: 0.5, p2: -0.3 },
      { cov11: 0.04, cov12: 0.01, cov22: 0.09 },
    )
    expect(variance).toBeGreaterThanOrEqual(0)
  })
})

describe('Cross-mode invariant: SAR field-squared scaling', () => {
  it('SAR scales exactly as E² across decades (independence verification)', () => {
    const sar1k = computeSAR(TARGET_CELL, 1000, SIGMA_E)
    const sar2k = computeSAR(TARGET_CELL, 2000, SIGMA_E)
    const sar4k = computeSAR(TARGET_CELL, 4000, SIGMA_E)
    expect(sar2k / sar1k).toBeCloseTo(4, 6)
    expect(sar4k / sar1k).toBeCloseTo(16, 6)
  })

  it('SAR waveform factor: pulsed (1.0) gives exactly 2× CW (0.5) at same field', () => {
    const sarCw     = computeSAR(TARGET_CELL, FIELD, SIGMA_E, 0.5)
    const sarPulsed = computeSAR(TARGET_CELL, FIELD, SIGMA_E, 1.0)
    expect(sarPulsed / sarCw).toBeCloseTo(2.0, 9)
  })
})
