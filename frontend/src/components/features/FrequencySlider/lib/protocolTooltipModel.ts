// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { formatLysisTime } from '@/utils/format'

import { UNIT } from '@/constants/units'

type ThermalDangerLevel = 'safe' | 'hyperthermic' | 'denaturing' | 'vaporizing'

export function formatDutyCycleDisplay(dutyCycle: number): string {
  const pct = dutyCycle * 100
  if (pct < 0.001) return `${(pct * 1000).toFixed(1)} µ%`
  return `${pct.toFixed(2)}%`
}

export function formatPulseWidthDisplay(pulseWidthNs: number): string {
  if (pulseWidthNs >= 1000) return `${(pulseWidthNs / 1000).toFixed(pulseWidthNs >= 10000 ? 0 : 1)} ${UNIT.US}`
  return `${pulseWidthNs.toFixed(0)} ${UNIT.NS}`
}

export function formatMinPulseDisplay(minPulseWidthNs: number): string {
  if (minPulseWidthNs <= 0) return ''
  if (minPulseWidthNs >= 1000) return `3τ_T ≥ ${(minPulseWidthNs / 1000).toFixed(1)} ${UNIT.US}`
  return `3τ_T ≥ ${minPulseWidthNs.toFixed(0)} ${UNIT.NS}`
}

export function buildDutyCycleTooltipParams(input: {
  effectiveDutyCycle: number
  targetSAR: number
  healthySAR: number
  maxSteadyTemp: number
  thermalDangerLevel: ThermalDangerLevel
  dutyCycle: number
}): {
  effectiveDutyCycle: number
  targetSAR: number
  healthySAR: number
  maxSteadyTemp: number
  thermalDangerLevel: ThermalDangerLevel
  dutyCycleDisplay: string
} {
  return {
    effectiveDutyCycle: input.effectiveDutyCycle,
    targetSAR: input.targetSAR,
    healthySAR: input.healthySAR,
    maxSteadyTemp: input.maxSteadyTemp,
    thermalDangerLevel: input.thermalDangerLevel,
    dutyCycleDisplay: formatDutyCycleDisplay(input.dutyCycle),
  }
}

export function buildPulseWidthTooltipParams(input: {
  targetFc: number
  healthyFc: number
  pulseWidthNs: number
  lysisDelayMs: number
  lysisNPulses: number
  dutyCycle: number
}): {
  targetFc: number
  healthyFc: number
  pulseWidthDisplay: string
  lysisDelayMs: number
  lysisNPulses: number
  dutyCycle: number
} {
  return {
    targetFc: input.targetFc,
    healthyFc: input.healthyFc,
    pulseWidthDisplay: formatPulseWidthDisplay(input.pulseWidthNs),
    lysisDelayMs: input.lysisDelayMs,
    lysisNPulses: input.lysisNPulses,
    dutyCycle: input.dutyCycle,
  }
}

export function buildLysisTimeDisplay(lysisDelayMs: number): string {
  return formatLysisTime(lysisDelayMs)
}