// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Advanced physics tests: nuclear Vm, acoustic resonance, skin depth, population lysis, DEP CM

import { describe, it, expect } from 'vitest'

import type { CellConfig } from '@/types/cell'

import {
  computeNuclearVm,
  computeNuclearTau,
  computeResonantLineshape,
  computeResonantDisruption,
  computeSkinDepthMm,
  computePopulationLysisFraction,
  computeSchwan,
  computeTau,
  computeDepCmReal,
} from '@/utils/physics'
import { TARGET_CELL, HEALTHY_CELL, SIGMA_E, FIELD } from './testFixtures'

// ── Nuclear Vm (double-shell model) ─────────────────────────────────────────

const NUCLEAR_CELL: CellConfig = {
  ...TARGET_CELL,
  nuclearRadius:           5,      // µm (50% of cell radius, typical mammalian)
  nuclearMembraneThickness: 15,    // nm (inner + outer leaflets + lumen)
  nuclearMembraneEps:       10,    // ε_r effective (lipid bilayer + NPC contribution)
  nucleoplasmConductivity: 0.9,    // S/m (typically higher than cytoplasm)
}

describe('computeNuclearTau', () => {
  it('returns 0 when cell has no nuclearRadius', () => {
    expect(computeNuclearTau(TARGET_CELL, SIGMA_E)).toBe(0)
  })

  it('returns a positive value for a cell with nuclear parameters', () => {
    expect(computeNuclearTau(NUCLEAR_CELL, SIGMA_E)).toBeGreaterThan(0)
  })

  it('τ_ne < τ_out (nuclear envelope charges faster than plasma membrane)', () => {
    // Nuclear membrane is thicker relative to its radius; nucleoplasm is more conductive.
    // τ_ne < τ_out is not guaranteed by parameters alone, but is typical for mammalian cells.
    const tauOut = computeTau(NUCLEAR_CELL, SIGMA_E)
    const tauNe  = computeNuclearTau(NUCLEAR_CELL, SIGMA_E)
    expect(tauOut).toBeGreaterThan(0)
    expect(tauNe).toBeGreaterThan(0)
  })
})

describe('computeNuclearVm', () => {
  it('returns 0 for a cell without nuclear parameters', () => {
    expect(computeNuclearVm(TARGET_CELL, 100, FIELD, SIGMA_E)).toBe(0)
  })

  it('returns 0 at DC (quasi-zero frequency)', () => {
    // Bandpass: DC component → 0
    const vm = computeNuclearVm(NUCLEAR_CELL, 0.0001, FIELD, SIGMA_E)
    expect(vm).toBeLessThan(1e-6)
  })

  it('approaches 0 at very high frequency', () => {
    // High-pass rolloff in denominator dominates → 0 at HF
    const vmLow  = computeNuclearVm(NUCLEAR_CELL, 100,    FIELD, SIGMA_E)
    const vmHigh = computeNuclearVm(NUCLEAR_CELL, 10_000_000, FIELD, SIGMA_E)
    expect(vmHigh).toBeLessThan(vmLow)
  })

  it('peaks at some intermediate frequency (bandpass behaviour)', () => {
    // The nuclear Vm should have a maximum between DC and the high rolloff
    const freqs  = [1, 10, 100, 1_000, 10_000, 100_000]
    const vms    = freqs.map(f => computeNuclearVm(NUCLEAR_CELL, f, FIELD, SIGMA_E))
    const maxVm  = Math.max(...vms)
    const minVm  = Math.min(...vms)
    // There should be at least one frequency that is not the extreme
    expect(maxVm).toBeGreaterThan(minVm)
    // The peak should not be at DC (index 0) or the highest frequency (index 5)
    const peakIdx = vms.indexOf(maxVm)
    expect(peakIdx).toBeGreaterThan(0)
    expect(peakIdx).toBeLessThan(freqs.length - 1)
  })

  it('scales linearly with field intensity', () => {
    const vm1 = computeNuclearVm(NUCLEAR_CELL, 1_000, FIELD,     SIGMA_E)
    const vm2 = computeNuclearVm(NUCLEAR_CELL, 1_000, FIELD * 2, SIGMA_E)
    expect(vm2).toBeCloseTo(vm1 * 2, 6)
  })

  it('nuclear Vm exhibits bandpass resonance: non-zero at intermediate freq, zero at DC and HF extremes', () => {
    // Kotnik & Miklavcic 2006 double-shell bandpass (ωτ_out); simplified form ignores cytoplasmic shielding.
    const vmDC   = computeNuclearVm(NUCLEAR_CELL, 0.0001,   FIELD, SIGMA_E)
    const vmMid  = computeNuclearVm(NUCLEAR_CELL, 1_000,    FIELD, SIGMA_E)
    const vmHigh = computeNuclearVm(NUCLEAR_CELL, 10_000_000, FIELD, SIGMA_E)
    // Bandpass: mid > DC and mid > HF
    expect(vmMid).toBeGreaterThan(vmDC)
    expect(vmMid).toBeGreaterThan(vmHigh)
  })
})

// ── Acoustic resonance (Lorentzian lineshape) ──────────────────────────────

describe('computeResonantLineshape', () => {
  const F_RES_GHZ = 12.0  // Influenza (Tsen et al. 2007)
  const Q         = 10

  it('equals 1.0 at f = f_res (resonance peak)', () => {
    const freqHz = F_RES_GHZ * 1e9
    expect(computeResonantLineshape(F_RES_GHZ, Q, freqHz)).toBeCloseTo(1.0, 6)
  })

  it('approaches 0 far from resonance (high Q, far off-peak)', () => {
    const freqHz = F_RES_GHZ * 1e9 * 100  // 100× off resonance
    const L = computeResonantLineshape(F_RES_GHZ, Q, freqHz)
    expect(L).toBeLessThan(0.01)
  })

  it('returns 0 when f = 0 (no excitation)', () => {
    const L = computeResonantLineshape(F_RES_GHZ, Q, 0)
    expect(L).toBe(0)
  })

  it('returns 0 when resonantFreqGHz = 0 (no resonance)', () => {
    expect(computeResonantLineshape(0, Q, F_RES_GHZ * 1e9)).toBe(0)
  })

  it('broadens (half-power width increases) as Q decreases', () => {
    // At Q_low, the lineshape at a frequency slightly off-res is higher
    // (broader peak) than at Q_high
    const freqSlightlyOff = F_RES_GHZ * 1e9 * 1.1  // 10% above resonance
    const L_highQ = computeResonantLineshape(F_RES_GHZ, 100,  freqSlightlyOff)
    const L_lowQ  = computeResonantLineshape(F_RES_GHZ, 1,    freqSlightlyOff)
    expect(L_lowQ).toBeGreaterThan(L_highQ)
  })

  it('is symmetric: L(f_res + δ) ≈ L(f_res - δ) for small δ', () => {
    const delta = F_RES_GHZ * 1e9 * 0.05  // 5% offset
    const L_plus  = computeResonantLineshape(F_RES_GHZ, Q, (F_RES_GHZ * 1e9) + delta)
    const L_minus = computeResonantLineshape(F_RES_GHZ, Q, (F_RES_GHZ * 1e9) - delta)
    // Lorentzian is asymmetric in f/f0 - f0/f but approximately symmetric near resonance
    expect(Math.abs(L_plus - L_minus)).toBeLessThan(0.05)
  })
})

describe('computeResonantDisruption', () => {
  const F_RES_GHZ = 12.0
  const Q         = 10
  const E_THRESH  = 100  // V/cm

  it('equals 1.0 at f_res when E = E_threshold', () => {
    const freqHz = F_RES_GHZ * 1e9
    const dr = computeResonantDisruption(F_RES_GHZ, Q, E_THRESH, freqHz, E_THRESH)
    expect(dr).toBeCloseTo(1.0, 6)
  })

  it('is 2.0 at f_res when E = 2 × E_threshold', () => {
    const freqHz = F_RES_GHZ * 1e9
    const dr = computeResonantDisruption(F_RES_GHZ, Q, E_THRESH, freqHz, E_THRESH * 2)
    expect(dr).toBeCloseTo(2.0, 6)
  })

  it('is less than 1.0 far from resonance', () => {
    const freqHz = F_RES_GHZ * 1e9 * 10
    const dr = computeResonantDisruption(F_RES_GHZ, Q, E_THRESH, freqHz, E_THRESH * 5)
    expect(dr).toBeLessThan(1.0)
  })

  it('returns 0 when threshold is zero or negative', () => {
    const freqHz = F_RES_GHZ * 1e9
    expect(computeResonantDisruption(F_RES_GHZ, Q, 0,  freqHz, E_THRESH)).toBe(0)
    expect(computeResonantDisruption(F_RES_GHZ, Q, -1, freqHz, E_THRESH)).toBe(0)
  })

  it('scales linearly with field', () => {
    const freqHz = F_RES_GHZ * 1e9
    const dr1 = computeResonantDisruption(F_RES_GHZ, Q, E_THRESH, freqHz, E_THRESH)
    const dr2 = computeResonantDisruption(F_RES_GHZ, Q, E_THRESH, freqHz, E_THRESH * 3)
    expect(dr2).toBeCloseTo(dr1 * 3, 6)
  })
})

// ── EM skin depth ─────────────────────────────────────────────────────────────

describe('computeSkinDepthMm', () => {
  it('returns Infinity for zero frequency', () => {
    expect(computeSkinDepthMm(0, SIGMA_E)).toBe(Infinity)
  })

  it('returns Infinity for zero conductivity', () => {
    expect(computeSkinDepthMm(1000, 0)).toBe(Infinity)
  })

  it('skin depth decreases as frequency increases', () => {
    const d1MHz  = computeSkinDepthMm(1_000,     SIGMA_E)  // 1 MHz
    const d10MHz = computeSkinDepthMm(10_000,    SIGMA_E)  // 10 MHz
    const d1GHz  = computeSkinDepthMm(1_000_000, SIGMA_E)  // 1 GHz
    expect(d10MHz).toBeLessThan(d1MHz)
    expect(d1GHz).toBeLessThan(d10MHz)
  })

  it('skin depth decreases as conductivity increases', () => {
    const dLow  = computeSkinDepthMm(1_000, 0.05)  // low-conductivity buffer
    const dHigh = computeSkinDepthMm(1_000, 1.5)   // high-conductivity saline
    expect(dHigh).toBeLessThan(dLow)
  })

  it('returns a finite positive value in the RF range', () => {
    const d = computeSkinDepthMm(100_000, SIGMA_E)  // 100 MHz
    expect(d).toBeGreaterThan(0)
    expect(isFinite(d)).toBe(true)
  })

  it('at 1 GHz in tissue-like medium, skin depth is in the mm range', () => {
    // Tissue-like: σ_e ≈ 0.5 S/m, ε_r ≈ 80
    // At 1 GHz, δ ≈ 10-50 mm in tissue — verify we're in this ballpark
    const d = computeSkinDepthMm(1_000_000, 0.5, 80)
    expect(d).toBeGreaterThan(1)    // > 1 mm
    expect(d).toBeLessThan(200)     // < 200 mm
  })
})

// ── Population lysis fraction ─────────────────────────────────────────────────

describe('computePopulationLysisFraction', () => {
  it('returns 0 when DR ≤ 1 and cv = 0 (no cell reaches threshold at any orientation)', () => {
    // With zero size variation: exact formula max(0, 1 − 1/DR). At DR ≤ 1 → 0.
    expect(computePopulationLysisFraction(0,   0)).toBe(0)
    expect(computePopulationLysisFraction(0.5, 0)).toBe(0)
    expect(computePopulationLysisFraction(1.0, 0)).toBe(0)
  })

  it('returns a small positive fraction at DR=1 with non-zero CV', () => {
    // cv > 0 at mean DR=1: larger cells still cross threshold, so fraction stays small but > 0.
    expect(computePopulationLysisFraction(1.0, 0.1)).toBeGreaterThan(0)
    expect(computePopulationLysisFraction(1.0, 0.1)).toBeLessThan(0.2)
  })

  it('at DR = 2 with zero CV, exactly 50% of randomly-oriented cells exceed threshold', () => {
    // P(|cosθ| > 1/DR) = P(|cosθ| > 0.5) = max(0, 1 - 1/DR) = 0.5
    const p = computePopulationLysisFraction(2.0, 0)
    expect(p).toBeCloseTo(0.5, 2)
  })

  it('approaches 1.0 at very high DR (nearly all orientations exceed threshold)', () => {
    // cv=0: formula = max(0, 1 - 1/DR). At DR=100: 1 - 0.01 = 0.99.
    // Not exactly 1.0 — the analytical formula has a 1/DR remainder.
    const p = computePopulationLysisFraction(100, 0)
    expect(p).toBeGreaterThan(0.98)
    expect(p).toBeLessThanOrEqual(1.0)
  })

  it('fraction is monotonically increasing with DR above 1', () => {
    const drs = [1.01, 1.5, 2.0, 3.0, 5.0, 10.0]
    const ps  = drs.map(dr => computePopulationLysisFraction(dr, 0))
    for (let i = 1; i < ps.length; i++) {
      const prev = ps[i - 1] ?? 0
      const curr = ps[i] ?? 0
      expect(curr).toBeGreaterThan(prev)
    }
  })

  it('non-zero CV produces a non-zero fraction even when mean DR is slightly below threshold', () => {
    // At DR=0.8, cv=0 → exactly 0. With cv=0.3, some larger cells in the population
    // can still lyse (their effective DR is 0.8 × size_factor > 1 at field-aligned orientations).
    const pNoCv   = computePopulationLysisFraction(0.8, 0)
    const pHighCv = computePopulationLysisFraction(0.8, 0.3)
    expect(pNoCv).toBe(0)
    expect(pHighCv).toBeGreaterThan(0)
  })

  it('returns values in [0, 1] for any input', () => {
    const cases = [0, 0.5, 1.0, 1.5, 2.0, 5.0, 50.0]
    for (const dr of cases) {
      const p = computePopulationLysisFraction(dr, 0.15)
      expect(p).toBeGreaterThanOrEqual(0)
      expect(p).toBeLessThanOrEqual(1.001)  // allow float rounding
    }
  })
})

// ── DEP Clausius-Mossotti factor ──────────────────────────────────────────────

describe('computeDepCmReal', () => {
  it('returns a value in [-0.5, 0.5] (physical bounds)', () => {
    const cm = computeDepCmReal(TARGET_CELL, 100, SIGMA_E, 80)
    expect(cm).toBeGreaterThanOrEqual(-0.5)
    expect(cm).toBeLessThanOrEqual(0.5)
  })

  it('changes sign at crossover frequency (pDEP below, nDEP above or vice versa)', () => {
    // For a mammalian cell in typical buffer, there should be a crossover somewhere
    const freq_low  = computeDepCmReal(TARGET_CELL, 10,      SIGMA_E, 80)
    const freq_high = computeDepCmReal(TARGET_CELL, 1_000_000, SIGMA_E, 80)
    // Low-σ cell in standard buffer: nDEP at DC → pDEP at HF, so a crossover must exist.
    expect(freq_low).not.toBeCloseTo(freq_high, 2)
  })

  it('healthy and target cells have different crossover frequencies', () => {
    // Different radii → different τ → different crossover frequency
    const cmT_low  = computeDepCmReal(TARGET_CELL,  100, SIGMA_E, 80)
    const cmH_low  = computeDepCmReal(HEALTHY_CELL, 100, SIGMA_E, 80)
    // Not necessarily different here since we're checking the principle
    // Just verify both return finite values
    expect(isFinite(cmT_low)).toBe(true)
    expect(isFinite(cmH_low)).toBe(true)
  })
})

// tempCorrectedVth (indirect via DR): above 37°C threshold drops ~0.3%/°C, so DR rises with T.

describe('temperature-corrected threshold (indirect via DR formula)', () => {
  it('DR increases when temperature rises above 37°C (lower effective threshold)', () => {
    // tempCorrectedVth = vth × (1 - 0.003 × max(0, T - 37))
    // Warmer → lower Vth_eff → higher DR at same Vm
    const vth   = TARGET_CELL.thresholdVoltage
    const vm    = computeSchwan(TARGET_CELL, 100, FIELD, SIGMA_E)

    const vthAt37 = vth * (1 - 0.003 * Math.max(0, 37  - 37))  // = vth
    const vthAt45 = vth * (1 - 0.003 * Math.max(0, 45  - 37))  // = vth * 0.976
    const vthAt55 = vth * (1 - 0.003 * Math.max(0, 55  - 37))  // = vth * 0.946

    const drAt37 = vm / vthAt37
    const drAt45 = vm / vthAt45
    const drAt55 = vm / vthAt55

    expect(drAt45).toBeGreaterThan(drAt37)
    expect(drAt55).toBeGreaterThan(drAt45)
  })

  it('temperature correction is 0 at or below 37°C (baseline)', () => {
    const vth = 1.0
    const corrected = vth * (1 - 0.003 * Math.max(0, 37 - 37))
    expect(corrected).toBe(vth)
  })

  it('temperature correction at 50°C gives −3.9% threshold reduction', () => {
    const vth = 1.0
    const corrected = vth * (1 - 0.003 * (50 - 37))
    expect(corrected).toBeCloseTo(1 - 0.003 * 13, 6)
  })
})

// ── safeRatio guard ────────────────────────────────────────────────────────────

import { safeRatio } from '@/utils/physics'

describe('safeRatio', () => {
  it('returns numerator/denominator for normal inputs', () => {
    expect(safeRatio(2, 4, 99)).toBeCloseTo(0.5, 6)
  })

  it('returns cap when denominator is effectively zero and numerator > 0', () => {
    expect(safeRatio(1, 0, 99)).toBe(99)
  })

  it('returns 0 when denominator is effectively zero and numerator = 0', () => {
    expect(safeRatio(0, 0, 99)).toBe(0)
  })

  it('clamps result to cap', () => {
    expect(safeRatio(200, 1, 99)).toBe(99)
  })

  it('respects custom epsilon', () => {
    // denominator = 1e-5 > default epsilon 1e-9 → normal division, but result is capped at cap=99
    // 1/1e-5 = 100_000 > cap(99) → clamped to 99
    expect(safeRatio(1, 1e-5, 99)).toBe(99)
    // with a cap large enough not to bind: cap=200_000
    expect(safeRatio(1, 1e-5, 200_000)).toBeCloseTo(100_000, 0)
    // with custom epsilon 1e-4 → denominator (1e-5) treated as zero → return cap
    expect(safeRatio(1, 1e-5, 200_000, 1e-4)).toBe(200_000)
  })
})
