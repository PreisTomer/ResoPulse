// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { effectiveElectroporationThreshold } from '@/utils/cellModel'

type WaveformValue = 'cw' | 'pulsed' | 'hfire'

interface DisruptionTooltipMetrics {
  pct: string
  ratio: number
  thresholdMv: string
  vmMv: string
}

interface TargetCellTooltipConfig {
  thresholdVoltage: number
  resonantFreqGHz?: number
  resonantThresholdVcm?: number
}

interface HealthyTooltipConfig {
  thresholdVoltage: number
}

interface TooltipMetricInput {
  ratio: number
  vm: number
  thresholdVoltage: number
  tempC: number
  waveform: WaveformValue
}

function buildDisruptionTooltipMetrics(input: TooltipMetricInput): DisruptionTooltipMetrics {
  const { ratio, vm, thresholdVoltage, tempC, waveform } = input
  const effectiveThreshold = effectiveElectroporationThreshold(thresholdVoltage, tempC, waveform)

  return {
    pct:         Math.min(100, ratio * 100).toFixed(0),
    ratio,
    thresholdMv: (effectiveThreshold * 1000).toFixed(0),
    vmMv:        (vm * 1000).toFixed(2),
  }
}

export function buildTargetBarTooltipParams(input: {
  ratio: number
  vm: number
  tempC: number
  waveform: WaveformValue
  lysisTime: string
  isResonanceTarget: boolean
  target: TargetCellTooltipConfig
}): {
  pct: string
  isResonanceTarget: boolean
  resonantThresholdVcm?: number
  resonantFreqGHz?: number
  targetVmMv: string
  thresholdMv: string
  lysisTime: string
  targetRatio: number
} {
  const { ratio, vm, tempC, waveform, lysisTime, isResonanceTarget, target } = input
  const metrics = buildDisruptionTooltipMetrics({
    ratio,
    vm,
    thresholdVoltage: target.thresholdVoltage,
    tempC,
    waveform,
  })

  return {
    pct:                  metrics.pct,
    isResonanceTarget,
    resonantThresholdVcm: target.resonantThresholdVcm,
    resonantFreqGHz:      target.resonantFreqGHz,
    targetVmMv:           metrics.vmMv,
    thresholdMv:          metrics.thresholdMv,
    lysisTime,
    targetRatio:          metrics.ratio,
  }
}

export function buildHealthyBarTooltipParams(input: {
  ratio: number
  vm: number
  tempC: number
  waveform: WaveformValue
  isResonanceTarget: boolean
  healthy: HealthyTooltipConfig
}): {
  pct: string
  isResonanceTarget: boolean
  healthyVmMv: string
  thresholdMv: string
  healthyRatio: number
} {
  const { ratio, vm, tempC, waveform, isResonanceTarget, healthy } = input
  const metrics = buildDisruptionTooltipMetrics({
    ratio,
    vm,
    thresholdVoltage: healthy.thresholdVoltage,
    tempC,
    waveform,
  })

  return {
    pct:               metrics.pct,
    isResonanceTarget,
    healthyVmMv:       metrics.vmMv,
    thresholdMv:       metrics.thresholdMv,
    healthyRatio:      metrics.ratio,
  }
}