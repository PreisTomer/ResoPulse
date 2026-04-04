// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { describe, expect, it } from 'vitest'

import {
  computePulseStepResponse,
  computeResonantDisruption,
  computeSchwan,
  computeTau,
} from '@/utils/physics'
import {
  effectiveElectroporationThreshold,
  effectiveResonanceThreshold,
} from '@/utils/cellModel'

import { DEFAULT_CAPSID_Q } from '@/constants/physics'

import type { CellConfig } from '@/types/cell'

import { computeConfiguredDisruptionRatio } from './disruptionModel'

describe('computeConfiguredDisruptionRatio', () => {
  const cell = {
    id: 'test-cell',
    type: 'healthy',
    label: 'Test',
    radius: 8,
    membraneThickness: 5,
    naturalFrequency: 1,
    thresholdVoltage: 1,
    dielectricConstant: 5,
    conductivity: 0.5,
    density: 1000,
    specificHeatCapacity: 4200,
    amplitude: 0.5,
  } as CellConfig

  it('matches the Schwan-mode disruption formula', () => {
    const sigmaE = 1.2
    const cosTheta = 1
    const waveform = 'pulsed'
    const pulseWidthNs = 150
    const freqKHz = 250
    const fieldVcm = 80
    const cellTempC = 39

    const tau = computeTau(cell, sigmaE)
    const pef = computePulseStepResponse(tau, pulseWidthNs)
    const vm = computeSchwan(cell, freqKHz, fieldVcm, sigmaE, cosTheta)
    const thresholdEff = effectiveElectroporationThreshold(cell.thresholdVoltage, cellTempC, waveform)

    expect(computeConfiguredDisruptionRatio({
      cell,
      sigmaE,
      cosTheta,
      waveform,
      pulseWidthNs,
      freqKHz,
      fieldVcm,
      cellTempC,
    })).toBeCloseTo((vm * pef) / thresholdEff, 12)
  })

  it('matches the resonance-mode disruption formula', () => {
    const cellTempC = 41
    const thresholdEff = effectiveResonanceThreshold(65, cellTempC)
    const expected = computeResonantDisruption(0.18, DEFAULT_CAPSID_Q, thresholdEff, 180000, 45)

    expect(computeConfiguredDisruptionRatio({
      cell,
      sigmaE: 1.2,
      cosTheta: 1,
      waveform: 'hfire',
      pulseWidthNs: 100,
      freqKHz: 180,
      fieldVcm: 45,
      cellTempC,
      resonanceTarget: {
        resonantFreqGHz: 0.18,
        resonantThresholdVcm: 65,
      },
    })).toBeCloseTo(expected, 12)
  })
})