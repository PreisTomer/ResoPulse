// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Regression locks for in-app validation workflows in locales/validate.en.json — drift here is a credibility-grade regression. Anand 2019 (DOI 10.1039/C9RA07428G) MCF-7 vs MCF-10A E_lys 589 vs 667 V/cm, TI 1.13. CCMV resonance scenario: f_res=7.7 GHz from Dykeman & Sankey 2010 atomistic model (DOI 10.1103/PhysRevE.81.021918); the Schwan Vm collapse at GHz for mammalian cells is the rigorous selectivity claim.

import { describe, it, expect } from 'vitest'

import { BODY_TEMP_C } from '@/constants/physics'
import { CELL_PRESETS } from '@/constants/cellLibrary'

import {
  computeLysisField,
  computeResonantDisruption,
  computeSchwan,
  computeFc,
  tempCorrectedVth,
} from '@/utils/physics'

import type { CellConfig } from '@/types/cell'

const findPreset = (presetId: string): CellConfig => {
  const p = CELL_PRESETS.find(c => c.presetId === presetId)
  if (!p) throw new Error(`Preset not found: ${presetId}`)
  return p
}

// Bare-Schwan reproduction conditions from validate.en.json: EP buffer 0.14 S/m, 10 kHz quasi-DC, cosθ=1, single pulse, 37°C, full RC charge, no H-FIRE.
const ANAND_SIGMA_E   = 0.14
const ANAND_FREQ_KHZ  = 10
const ANAND_COS_THETA = 1.0
const ANAND_PEF       = 1.0
const ANAND_HFIRE     = 1.0
const ANAND_N_PULSES  = 1

describe('Anand 2019 — MCF-7 vs MCF-10A lysis-field selectivity (regression lock)', () => {
  const mcf7  = findPreset('mcf7-anand2019')
  const mcf10 = findPreset('mcf10a')

  const eLysMcf7 = computeLysisField(
    mcf7, ANAND_FREQ_KHZ, ANAND_SIGMA_E, ANAND_COS_THETA,
    ANAND_PEF, ANAND_HFIRE, BODY_TEMP_C, ANAND_N_PULSES,
  )
  const eLysMcf10 = computeLysisField(
    mcf10, ANAND_FREQ_KHZ, ANAND_SIGMA_E, ANAND_COS_THETA,
    ANAND_PEF, ANAND_HFIRE, BODY_TEMP_C, ANAND_N_PULSES,
  )

  it('preset MCF-7 (Anand 2019) carries Anand Table 1 σ_i, R, Vth verbatim', () => {
    expect(mcf7.conductivity).toBe(0.23)
    expect(mcf7.radius).toBe(8.15)
    expect(mcf7.thresholdVoltage).toBe(0.72)
  })

  it('preset MCF-10A carries Anand Table 1 σ_i, R, Vth verbatim', () => {
    expect(mcf10.conductivity).toBe(0.30)
    expect(mcf10.radius).toBe(10)
    expect(mcf10.thresholdVoltage).toBe(1.0)
  })

  it('predicts MCF-7 E_lys = 589 V/cm (Anand 2019, ±2 V/cm)', () => {
    expect(eLysMcf7).toBeGreaterThan(587)
    expect(eLysMcf7).toBeLessThan(591)
  })

  it('predicts MCF-10A E_lys = 667 V/cm (Anand 2019, ±2 V/cm)', () => {
    expect(eLysMcf10).toBeGreaterThan(665)
    expect(eLysMcf10).toBeLessThan(669)
  })

  it('predicts TI = 1.13 (Anand 2019 selectivity window, ±0.01)', () => {
    const ti = eLysMcf10 / eLysMcf7
    expect(ti).toBeGreaterThan(1.12)
    expect(ti).toBeLessThan(1.14)
  })

  it('places 620 V/cm operating point inside the selectivity window (MCF-7 lyses, MCF-10A intact)', () => {
    const operatingPoint = 620
    expect(operatingPoint).toBeGreaterThan(eLysMcf7)
    expect(operatingPoint).toBeLessThan(eLysMcf10)
  })

  it('selectivity window width is +78 V/cm (Anand 2019 reported, ±5 V/cm)', () => {
    const window = eLysMcf10 - eLysMcf7
    expect(window).toBeGreaterThan(73)
    expect(window).toBeLessThan(83)
  })
})

// CCMV resonance scenario conditions from validate.en.json: resonance chart mode, 7.7 GHz (Dykeman & Sankey 2010 model), 500 V/cm, CCMV target, hepatocyte reference, 37°C, single pulse.
const TSEN_FREQ_GHZ          = 7.7
const TSEN_FIELD_VCM         = 500
const TSEN_FREQ_HZ           = TSEN_FREQ_GHZ * 1e9
const TSEN_FREQ_KHZ          = TSEN_FREQ_GHZ * 1e6
const TSEN_HEPATOCYTE_SIGMA  = 0.14

describe('CCMV resonance at 7.7 GHz — Dykeman & Sankey 2010 model (regression lock)', () => {
  const ccmv       = findPreset('ccmv')
  const hepatocyte = findPreset('hepatocyte')

  it('CCMV preset carries Dykeman 2010 model params and Speir 1995 geometry verbatim', () => {
    expect(ccmv.radius).toBe(0.014)
    expect(ccmv.resonantFreqGHz).toBe(7.7)
    expect(ccmv.capsidQ).toBe(12)
    expect(ccmv.resonantThresholdVcm).toBe(500)
  })

  it('predicts DR = 1.0 at f = f_res, E = E_thr (Lorentzian peak; no temp correction at 37°C)', () => {
    const effThr = tempCorrectedVth(ccmv.resonantThresholdVcm!, BODY_TEMP_C)
    expect(effThr).toBeCloseTo(500, 6)

    const dr = computeResonantDisruption(
      ccmv.resonantFreqGHz!, ccmv.capsidQ!, effThr,
      TSEN_FREQ_HZ, TSEN_FIELD_VCM,
    )
    expect(dr).toBeCloseTo(1.0, 3)
  })

  it('Lorentzian DR is linear in field amplitude at exact resonance', () => {
    const drAtThr  = computeResonantDisruption(7.7, 12, 500, TSEN_FREQ_HZ, 500)
    const drAt2x   = computeResonantDisruption(7.7, 12, 500, TSEN_FREQ_HZ, 1000)
    const drAt0p5x = computeResonantDisruption(7.7, 12, 500, TSEN_FREQ_HZ, 250)
    expect(drAt2x).toBeCloseTo(2 * drAtThr, 6)
    expect(drAt0p5x).toBeCloseTo(0.5 * drAtThr, 6)
  })

  it('Lorentzian collapses far off-resonance (Q = 12 sharp peak)', () => {
    const drOnRes  = computeResonantDisruption(7.7, 12, 500, TSEN_FREQ_HZ, 500)
    const drFarOff = computeResonantDisruption(7.7, 12, 500, 1.0e9, 500)
    expect(drFarOff / drOnRes).toBeLessThan(0.02)
  })

  it('hepatocyte Schwan Vm collapses at 7.7 GHz (mammalian charge-up cannot follow)', () => {
    const vm = computeSchwan(hepatocyte, TSEN_FREQ_KHZ, TSEN_FIELD_VCM, TSEN_HEPATOCYTE_SIGMA, 1.0)
    expect(vm).toBeLessThan(hepatocyte.thresholdVoltage / 1000)
  })

  it('hepatocyte fc ≪ 7.7 GHz so f / fc > 10000 (Schwan collapse is the rigorous selectivity claim)', () => {
    const fcKhz = computeFc(hepatocyte, TSEN_HEPATOCYTE_SIGMA)
    const ratio = TSEN_FREQ_KHZ / fcKhz
    expect(ratio).toBeGreaterThan(10000)
  })

  it('selectivity at 7.7 GHz: CCMV DR ≈ 1, hepatocyte EP DR ≈ 0 (TI in the thousands)', () => {
    const drCcmv = computeResonantDisruption(
      ccmv.resonantFreqGHz!, ccmv.capsidQ!, ccmv.resonantThresholdVcm!,
      TSEN_FREQ_HZ, TSEN_FIELD_VCM,
    )
    const vmHep = computeSchwan(hepatocyte, TSEN_FREQ_KHZ, TSEN_FIELD_VCM, TSEN_HEPATOCYTE_SIGMA, 1.0)
    const drHepEp = vmHep / hepatocyte.thresholdVoltage
    const ti = drCcmv / Math.max(drHepEp, 1e-9)
    expect(ti).toBeGreaterThan(1000)
  })
})
