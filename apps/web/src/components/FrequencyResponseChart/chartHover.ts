// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { computeSchwan, computeResonantDisruption, computeDepCmReal, tempCorrectedVth } from '@/utils/physics'

import { DEFAULT_CAPSID_Q, THRESHOLDS, H_FIRE_THRESHOLD_MULTIPLIER } from '@/constants/physics'
import { CELL_CATEGORY, WAVEFORM } from '@/constants/strings'
import { MEDIA } from '@/constants/media'

import type { MediumKey } from '@/types/media'

import type { CellConfig } from '@/types/cell'

import type { TooltipData } from './chartCompute'

export interface HoverParams {
  mx: number
  chartW: number
  hz: number
  healthy: CellConfig
  target: CellConfig
  fieldIntensity: number
  effectiveSigmaE: number
  cosThetaFactor: number
  medium: string
  waveform: string
  healthyTemp: number
  targetTemp: number
  pulseEnvelopeFactorHealthy: number
  pulseEnvelopeFactorTarget: number
  targetCellCategory: string
  isResonanceMode: boolean
  lysisNPulses: number
}

export function buildHoverTooltip(params: HoverParams): TooltipData | null {
  const {
    mx, chartW, hz,
    healthy, target,
    fieldIntensity, effectiveSigmaE, cosThetaFactor,
    medium, waveform, healthyTemp, targetTemp,
    pulseEnvelopeFactorHealthy, pulseEnvelopeFactorTarget,
    targetCellCategory, isResonanceMode, lysisNPulses,
  } = params

  const flipLeft = mx > chartW * 0.55
  const t = target as CellConfig & {
    resonantFreqGHz?: number
    capsidQ?: number
    resonantThresholdVcm?: number
    resonantFreqGHz2?: number
    capsidQ2?: number
    resonantMode2Amplitude?: number
  }

  if (
    isResonanceMode &&
    (targetCellCategory === CELL_CATEGORY.VIRUS || targetCellCategory === CELL_CATEGORY.BACTERIA) &&
    t.resonantFreqGHz && t.resonantThresholdVcm
  ) {
    // H-FIRE multiplier does not apply to acoustic resonance — mechanical disruption, not EP membrane charging
    const effThreshold = tempCorrectedVth(t.resonantThresholdVcm, targetTemp)
    const dr = computeResonantDisruption(
      t.resonantFreqGHz,
      t.capsidQ ?? DEFAULT_CAPSID_Q,
      effThreshold,
      hz,
      fieldIntensity,
      t.resonantFreqGHz2, t.capsidQ2, t.resonantMode2Amplitude,
    )
    return {
      x: mx, freqHz: hz, mode: 'resonance',
      healthyVm: 0, targetVm: 0, targetDR: dr,
      healthyDRPct: 0, targetDRPct: dr * 100, selRatio: 0,
      inWindow: false, flipLeft,
    }
  }

  const khz = hz / 1000
  const sigma_e = effectiveSigmaE
  const hfireMult = waveform === WAVEFORM.H_FIRE ? H_FIRE_THRESHOLD_MULTIPLIER : 1.0
  const hVm = computeSchwan(healthy, khz, fieldIntensity, sigma_e, cosThetaFactor) * 1000
  const tVm = computeSchwan(target,  khz, fieldIntensity, sigma_e, cosThetaFactor) * 1000
  const hVthEffMv = tempCorrectedVth(healthy.thresholdVoltage, healthyTemp, lysisNPulses) * hfireMult * 1000
  const tVthEffMv = tempCorrectedVth(target.thresholdVoltage,  targetTemp,  lysisNPulses) * hfireMult * 1000
  const hDRPct  = (hVm * pulseEnvelopeFactorHealthy / hVthEffMv) * 100
  const tDRPct  = (tVm * pulseEnvelopeFactorTarget  / tVthEffMv) * 100
  const selRatio = hVm > 0.01 ? tVm / hVm : 0
  const inWindow = tDRPct >= THRESHOLDS.DISRUPTION_WARN * 100 && hDRPct < THRESHOLDS.HEALTHY_APPROACHING * 100
  const eps_r = MEDIA[medium as MediumKey].permittivity
  const depHealthyK = computeDepCmReal(healthy, khz, sigma_e, eps_r)
  const depTargetK  = computeDepCmReal(target,  khz, sigma_e, eps_r)

  return {
    x: mx, freqHz: hz, mode: 'schwan',
    healthyVm: hVm, targetVm: tVm, targetDR: 0,
    healthyDRPct: hDRPct, targetDRPct: tDRPct,
    selRatio, inWindow, flipLeft,
    depHealthyK, depTargetK,
  }
}
