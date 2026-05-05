// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Regression locks for in-app validation workflows in locales/validate.en.json — drift here is a credibility-grade regression. Anand 2019 (DOI 10.1039/C9RA07428G) MCF-7 vs MCF-10A E_lys 589 vs 667 V/cm, TI 1.13. CCMV resonance scenario: f_res ≈ 21 GHz lowest H mode from Dykeman & Sankey 2010 Table V (DOI 10.1103/PhysRevE.81.021918); the Schwan Vm collapse at GHz for mammalian cells is the rigorous selectivity claim.

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

// CCMV resonance scenario conditions from validate.en.json: resonance chart mode, 21 GHz (Dykeman & Sankey 2010 lowest H mode), 500 V/cm, CCMV target, hepatocyte reference, 37°C, single pulse.
const CCMV_FRES_GHZ      = 21
const CCMV_FIELD_VCM     = 500
const CCMV_FRES_HZ       = CCMV_FRES_GHZ * 1e9
const CCMV_FRES_KHZ      = CCMV_FRES_GHZ * 1e6
const HEPATOCYTE_SIGMA_E = 0.14

describe('CCMV resonance at ≈ 21 GHz — Dykeman & Sankey 2010 lowest H mode (regression lock)', () => {
  const ccmv       = findPreset('ccmv')
  const hepatocyte = findPreset('hepatocyte')

  it('CCMV preset carries Dykeman 2010 atomistic-model params and Speir 1995 geometry verbatim', () => {
    expect(ccmv.radius).toBe(0.014)
    expect(ccmv.resonantFreqGHz).toBe(21)
    expect(ccmv.capsidQ).toBe(4)
    expect(ccmv.resonantThresholdVcm).toBe(500)
  })

  it('predicts DR = 1.0 at f = f_res, E = E_thr (Lorentzian peak; no temp correction at 37°C)', () => {
    const effThr = tempCorrectedVth(ccmv.resonantThresholdVcm!, BODY_TEMP_C)
    expect(effThr).toBeCloseTo(500, 6)

    const dr = computeResonantDisruption(
      ccmv.resonantFreqGHz!, ccmv.capsidQ!, effThr,
      CCMV_FRES_HZ, CCMV_FIELD_VCM,
    )
    expect(dr).toBeCloseTo(1.0, 3)
  })

  it('Lorentzian DR is linear in field amplitude at exact resonance', () => {
    const drAtThr  = computeResonantDisruption(21, 4, 500, CCMV_FRES_HZ, 500)
    const drAt2x   = computeResonantDisruption(21, 4, 500, CCMV_FRES_HZ, 1000)
    const drAt0p5x = computeResonantDisruption(21, 4, 500, CCMV_FRES_HZ, 250)
    expect(drAt2x).toBeCloseTo(2 * drAtThr, 6)
    expect(drAt0p5x).toBeCloseTo(0.5 * drAtThr, 6)
  })

  it('Lorentzian falls off significantly far from resonance (Q = 4 broader peak in solvent)', () => {
    const drOnRes  = computeResonantDisruption(21, 4, 500, CCMV_FRES_HZ, 500)
    const drFarOff = computeResonantDisruption(21, 4, 500, 1.0e9, 500)
    expect(drFarOff / drOnRes).toBeLessThan(0.02)
  })

  it('hepatocyte Schwan Vm collapses at 21 GHz (mammalian charge-up cannot follow)', () => {
    const vm = computeSchwan(hepatocyte, CCMV_FRES_KHZ, CCMV_FIELD_VCM, HEPATOCYTE_SIGMA_E, 1.0)
    expect(vm).toBeLessThan(hepatocyte.thresholdVoltage / 1000)
  })

  it('hepatocyte fc ≪ 21 GHz so f / fc > 30000 (Schwan collapse is the rigorous selectivity claim)', () => {
    const fcKhz = computeFc(hepatocyte, HEPATOCYTE_SIGMA_E)
    const ratio = CCMV_FRES_KHZ / fcKhz
    expect(ratio).toBeGreaterThan(30000)
  })

  it('selectivity at 21 GHz: CCMV DR ≈ 1, hepatocyte EP DR ≈ 0 (TI in the thousands)', () => {
    const drCcmv = computeResonantDisruption(
      ccmv.resonantFreqGHz!, ccmv.capsidQ!, ccmv.resonantThresholdVcm!,
      CCMV_FRES_HZ, CCMV_FIELD_VCM,
    )
    const vmHep = computeSchwan(hepatocyte, CCMV_FRES_KHZ, CCMV_FIELD_VCM, HEPATOCYTE_SIGMA_E, 1.0)
    const drHepEp = vmHep / hepatocyte.thresholdVoltage
    const ti = drCcmv / Math.max(drHepEp, 1e-9)
    expect(ti).toBeGreaterThan(1000)
  })
})
