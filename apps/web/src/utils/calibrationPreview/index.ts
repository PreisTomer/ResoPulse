// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

/**
 * Predicted healthy/target DR and TI for a given pair of σ_i calibration multipliers,
 * holding the rest of the protocol state fixed. Used by ApplyCalibrationModal to render
 * a base (m=1,1) vs corrected diff. EP / Schwan path only — acoustic resonance DR is
 * independent of σ_i so the modal is hidden for resonance targets.
 */

import {
  computeSchwan,
  computePulseEnvelope,
  getHFireMultiplier,
  safeRatio,
  tempCorrectedVth,
} from '@/utils/physics'

import { WAVEFORM } from '@/constants/strings'
import { NEAR_ZERO_DR, THRESHOLDS } from '@/constants/physics'

import type { CellConfig } from '@/types/cell'

export interface CalibrationPreviewInput {
  healthy:             CellConfig
  target:              CellConfig
  sigmaE:              number
  cosThetaFactor:      number
  freqKHz:             number
  fieldVcm:            number
  healthyTemp:         number
  targetTemp:          number
  waveform:            string
  pulseWidthNs:        number
  effectivePulseCount: number
  healthyMultiplier:   number
  targetMultiplier:    number
}

export interface CalibrationPreviewOutput {
  healthyDr: number
  targetDr:  number
  ti:        number
}

export function computeCalibrationPreview(input: CalibrationPreviewInput): CalibrationPreviewOutput {
  const healthy = { ...input.healthy, conductivity: input.healthy.conductivity * input.healthyMultiplier }
  const target  = { ...input.target,  conductivity: input.target.conductivity  * input.targetMultiplier  }

  const vmHealthy = computeSchwan(healthy, input.freqKHz, input.fieldVcm, input.sigmaE, input.cosThetaFactor)
  const vmTarget  = computeSchwan(target,  input.freqKHz, input.fieldVcm, input.sigmaE, input.cosThetaFactor)

  const isPulsed = input.waveform === WAVEFORM.PULSED || input.waveform === WAVEFORM.H_FIRE
  const pefHealthy = isPulsed ? computePulseEnvelope(healthy, input.pulseWidthNs, input.sigmaE) : 1.0
  const pefTarget  = isPulsed ? computePulseEnvelope(target,  input.pulseWidthNs, input.sigmaE) : 1.0

  const hfireMult  = getHFireMultiplier(input.waveform)
  const vthHealthy = tempCorrectedVth(input.healthy.thresholdVoltage, input.healthyTemp, input.effectivePulseCount)
  const vthTarget  = tempCorrectedVth(input.target.thresholdVoltage,  input.targetTemp,  input.effectivePulseCount)

  const healthyDr = (vmHealthy * pefHealthy) / (vthHealthy * hfireMult)
  const targetDr  = (vmTarget  * pefTarget)  / (vthTarget  * hfireMult)
  const ti        = safeRatio(targetDr, healthyDr, THRESHOLDS.TI_DISPLAY_CAP, NEAR_ZERO_DR)

  return { healthyDr, targetDr, ti }
}
