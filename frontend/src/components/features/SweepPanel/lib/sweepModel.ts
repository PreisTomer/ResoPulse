// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { computeSAR } from '@/utils/physics'
import { computeConfiguredDisruptionRatio } from '@/utils/disruptionModel'

import {
  BODY_TEMP_C,
  NEWTON_COOLING_LAMBDA,
  NEAR_ZERO_DR,
  PENNES_BLOOD_COEFF,
  THRESHOLDS,
  WF_CW,
  WF_PULSED,
} from '@/constants/physics'
import { SWEEP_TI_CAP } from '@/constants/experimentDefaults'
import { WAVEFORM } from '@/constants/strings'

import type { CellConfig } from '@/types/cell'

export type SweepParam = 'field' | 'freq'
export type SweepWaveform = 'cw' | 'pulsed' | 'hfire'

export interface SweepPoint {
  x: number
  drH: number
  drT: number
  ti: number
  tH: number
  tT: number
}

type ResonanceTarget = {
  resonantFreqGHz: number
  capsidQ?: number
  resonantThresholdVcm: number
}

export function computeSweepTemperature(
  cell: CellConfig,
  fieldVcm: number,
  sigmaE: number,
  waveformFactor: number,
  dutyCycle: number,
  perfusionRate: number,
): number {
  const sar = computeSAR(cell, fieldVcm, sigmaE, waveformFactor)
  const sarEff = sar * dutyCycle
  const lambdaPerf = perfusionRate * PENNES_BLOOD_COEFF / cell.specificHeatCapacity
  return Math.min(
    BODY_TEMP_C + sarEff / ((NEWTON_COOLING_LAMBDA + lambdaPerf) * cell.specificHeatCapacity),
    THRESHOLDS.TEMP_CAP,
  )
}

export function buildSweepPoint(opts: {
  sweepParam: SweepParam
  sweepValue: number
  fixedFieldVcm: number
  fixedFreqKHz: number
  healthy: CellConfig
  target: CellConfig
  sigmaE: number
  cosTheta: number
  waveform: SweepWaveform
  dutyCycle: number
  pulseWidthNs: number
  perfusionRate: number
  resonanceTarget?: ResonanceTarget
}): SweepPoint {
  const {
    sweepParam,
    sweepValue,
    fixedFieldVcm,
    fixedFreqKHz,
    healthy,
    target,
    sigmaE,
    cosTheta,
    waveform,
    dutyCycle,
    pulseWidthNs,
    perfusionRate,
    resonanceTarget,
  } = opts

  const fieldVcm = sweepParam === 'field' ? sweepValue : fixedFieldVcm
  const freqKHz = sweepParam === 'freq' ? sweepValue : fixedFreqKHz
  const waveformFactor = waveform === WAVEFORM.CW ? WF_CW : WF_PULSED

  const tH = computeSweepTemperature(healthy, fieldVcm, sigmaE, waveformFactor, dutyCycle, perfusionRate)
  const tT = computeSweepTemperature(target, fieldVcm, sigmaE, waveformFactor, dutyCycle, perfusionRate)

  const drH = computeConfiguredDisruptionRatio({
    cell: healthy,
    sigmaE,
    cosTheta,
    waveform,
    pulseWidthNs,
    freqKHz,
    fieldVcm,
    cellTempC: tH,
  })
  const drT = computeConfiguredDisruptionRatio({
    cell: target,
    sigmaE,
    cosTheta,
    waveform,
    pulseWidthNs,
    freqKHz,
    fieldVcm,
    cellTempC: tT,
    resonanceTarget,
  })
  const ti = drH < NEAR_ZERO_DR ? (drT > 0 ? SWEEP_TI_CAP : 0) : Math.min(SWEEP_TI_CAP, drT / drH)

  return { x: sweepValue, drH, drT, ti, tH, tT }
}

export function isSweepPointInSelectiveWindow(point: SweepPoint): boolean {
  return (
    point.drT >= THRESHOLDS.DISRUPTION_WARN &&
    point.drH < THRESHOLDS.HEALTHY_APPROACHING &&
    point.tT < THRESHOLDS.TEMP_DENATURING &&
    point.tH < THRESHOLDS.TEMP_DENATURING
  )
}