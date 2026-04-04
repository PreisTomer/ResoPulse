// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { effectiveElectroporationThreshold } from '@/utils/cellModel'

import type { CellConfig } from '@/types/cell'

type WaveformValue = 'cw' | 'pulsed' | 'hfire'

type SliderTargetTooltipCell = Pick<
  CellConfig,
  'label' | 'thresholdVoltage' | 'resonantFreqGHz' | 'capsidQ' | 'resonantThresholdVcm'
>

type SliderHealthyTooltipCell = Pick<CellConfig, 'thresholdVoltage'>

export function buildFieldTooltipParams(input: {
  isResonanceMode: boolean
  target: SliderTargetTooltipCell
  fieldDisplay: string
  targetDisruption: number
  targetCellCategory: string
  targetLysisField: number
  healthyLysisField: number
}): {
  isResonanceMode: boolean
  target: SliderTargetTooltipCell
  fieldDisplay: string
  targetDisruption: number
  targetCellCategory: string
  targetLysisField: number
  healthyLysisField: number
} {
  return input
}

export function buildTargetBadgeTooltipParams(input: {
  isResonanceMode: boolean
  target: SliderTargetTooltipCell
  targetTemp: number
  waveform: WaveformValue
  targetDisruptPercent: string
  targetDisruption: number
  targetVm: number
  lysisDelayMs: number
}): {
  isResonanceMode: boolean
  target: SliderTargetTooltipCell & { effThresholdMv: number }
  targetDisruptPercent: string
  targetDisruption: number
  targetVmMv: number
  lysisDelayMs: number
} {
  const effThresholdMv = effectiveElectroporationThreshold(
    input.target.thresholdVoltage,
    input.targetTemp,
    input.waveform,
  ) * 1000

  return {
    isResonanceMode: input.isResonanceMode,
    target: {
      ...input.target,
      effThresholdMv,
    },
    targetDisruptPercent: input.targetDisruptPercent,
    targetDisruption: input.targetDisruption,
    targetVmMv: input.targetVm * 1000,
    lysisDelayMs: input.lysisDelayMs,
  }
}

export function buildHealthyBadgeTooltipParams(input: {
  isResonanceMode: boolean
  healthy: SliderHealthyTooltipCell
  healthyTemp: number
  waveform: WaveformValue
  healthyDisruptPercent: string
  healthyDisruption: number
  healthyVm: number
}): {
  isResonanceMode: boolean
  healthyDisruptPercent: string
  healthyDisruption: number
  healthyVmMv: number
  thresholdVoltage: number
  effThresholdMv: number
} {
  return {
    isResonanceMode: input.isResonanceMode,
    healthyDisruptPercent: input.healthyDisruptPercent,
    healthyDisruption: input.healthyDisruption,
    healthyVmMv: input.healthyVm * 1000,
    thresholdVoltage: input.healthy.thresholdVoltage,
    effThresholdMv: effectiveElectroporationThreshold(
      input.healthy.thresholdVoltage,
      input.healthyTemp,
      input.waveform,
    ) * 1000,
  }
}