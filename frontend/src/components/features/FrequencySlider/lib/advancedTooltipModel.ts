// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { formatFieldVcm, formatFreqKHz, formatLysisTime } from '@/utils/format'

import { NEWTON_COOLING_LAMBDA, PENNES_BLOOD_COEFF } from '@/constants/physics'
import { UNIT } from '@/constants/units'

export function formatOrientationDisplay(orientationDeg: number, cosThetaFactor: number): string {
  return `${orientationDeg}° · cos ${(cosThetaFactor * 100).toFixed(0)}%`
}

export function formatLysisNDisplay(lysisNPulses: number, lysisDelayMs: number): string {
  return `×${lysisNPulses} · ~${formatLysisTime(lysisDelayMs)}`
}

export function buildLysisNTooltipParams(input: {
  lysisNPulses: number
  lysisDelayMs: number
  dutyCycle: number
  pulseWidthNs: number
}): {
  lysisNPulses: number
  lysisDelayMs: number
  dutyCycle: number
  pulseWidthNs: number
} {
  return input
}

export function buildDoubleShellTooltipParams(input: {
  targetLabel: string
  healthyLabel: string
  targetVmNucMv: number
  healthyVmNucMv: number
  targetFpeakKHz: number
  healthyFpeakKHz: number
  currentBroadcastFrequency: number
  fieldIntensity: number
  hasTargetNucleus: boolean
  hasHealthyNucleus: boolean
}): {
  targetLabel: string
  healthyLabel: string
  targetVmNucMv: number
  healthyVmNucMv: number
  targetFpeakKHz: number
  healthyFpeakKHz: number
  freqDisplay: string
  fieldDisplay: string
  hasTargetNucleus: boolean
  hasHealthyNucleus: boolean
} {
  return {
    targetLabel: input.targetLabel,
    healthyLabel: input.healthyLabel,
    targetVmNucMv: input.targetVmNucMv,
    healthyVmNucMv: input.healthyVmNucMv,
    targetFpeakKHz: input.targetFpeakKHz,
    healthyFpeakKHz: input.healthyFpeakKHz,
    freqDisplay: formatFreqKHz(input.currentBroadcastFrequency, 2),
    fieldDisplay: formatFieldVcm(input.fieldIntensity),
    hasTargetNucleus: input.hasTargetNucleus,
    hasHealthyNucleus: input.hasHealthyNucleus,
  }
}

export function buildPerfusionTooltipParams(input: {
  perfusionRate: number
  healthySpecificHeatCapacity: number
}): {
  perfusionRate: number
  effLambdaH: number
} {
  return {
    perfusionRate: input.perfusionRate,
    effLambdaH: NEWTON_COOLING_LAMBDA + input.perfusionRate * PENNES_BLOOD_COEFF / input.healthySpecificHeatCapacity,
  }
}

export function buildCellPackingTooltipParams(input: {
  cellPackingFraction: number
  sigmaE: number
  effectiveSigmaE: number
}): {
  phi: number
  sigmaE0: number
  sigmaEff: number
} {
  return {
    phi: input.cellPackingFraction,
    sigmaE0: input.sigmaE,
    sigmaEff: input.effectiveSigmaE,
  }
}

export function formatPerfusionDisplay(perfusionRate: number, inVitroLabel: string): string {
  return perfusionRate === 0 ? inVitroLabel : `${perfusionRate.toFixed(2)} ${UNIT.ML_PER_G_MIN}`
}

export function formatCellPackingDisplay(cellPackingFraction: number, isolatedLabel: string): string {
  return cellPackingFraction === 0 ? isolatedLabel : `${(cellPackingFraction * 100).toFixed(0)}${UNIT.PERCENT}`
}