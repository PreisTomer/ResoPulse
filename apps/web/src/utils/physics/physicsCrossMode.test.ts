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
  pulseEnvelopeClamped,
  getHFireMultiplier,
  tempCorrectedVth,
  computeLysisField,
  isResonanceTargetActive,
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
})
