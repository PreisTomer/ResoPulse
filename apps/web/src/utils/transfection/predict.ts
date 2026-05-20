// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Transfection prediction — Schwan equation applied to bioproduction (Module 1c).

import { EPSILON_0 } from '@/constants/physics'

export interface TransfectionInputs {
  cellRadiusUm:        number
  membraneThicknessNm: number
  dielectricConstant:  number
  cytoplasmConductivity: number
  bufferConductivity:  number
  thresholdVoltage:    number
  voltage:             number   // V/cm
  pulseWidthUs:        number
  numPulses:           number
}

export interface TransfectionPrediction {
  vm:                   number
  disruptionRatio:      number
  transfectionEfficiency: number
  viability:            number
  windowState:          'below' | 'optimal' | 'above'
  fieldStrength:        number
}

const TRANSFECTION_WINDOW = { lower: 0.50, upper: 0.85 } as const
const VIABILITY_DECAY_START = 0.85
const VIABILITY_DECAY_END   = 1.10
const ELECTROSENSITIZATION_EXPONENT = -0.20

export function predictTransfection(inputs: TransfectionInputs): TransfectionPrediction {
  const radiusM = inputs.cellRadiusUm * 1e-6
  const dMem    = inputs.membraneThicknessNm * 1e-9
  const epsilonR = inputs.dielectricConstant
  const sigmaI  = inputs.cytoplasmConductivity
  const sigmaE  = inputs.bufferConductivity
  const vth     = inputs.thresholdVoltage
  const voltagePerM = inputs.voltage * 100      // V/cm to V/m

  const Cm = (epsilonR * EPSILON_0) / dMem
  const tau = radiusM * Cm * (2 * sigmaE + sigmaI) / (2 * sigmaE * sigmaI)

  const pulseSec = inputs.pulseWidthUs * 1e-6
  const pulseEnvelopeFactor = 1 - Math.exp(-pulseSec / tau)

  const vmSteady = 1.5 * voltagePerM * radiusM
  const vm = vmSteady * pulseEnvelopeFactor

  const N = Math.max(1, inputs.numPulses)
  const effectiveThreshold = vth * Math.pow(N, ELECTROSENSITIZATION_EXPONENT)

  const disruptionRatio = vm / effectiveThreshold
  const transfectionEfficiency = computeEfficiency(disruptionRatio)
  const viability = computeViability(disruptionRatio)

  const windowState: TransfectionPrediction['windowState'] =
    disruptionRatio < TRANSFECTION_WINDOW.lower ? 'below' :
    disruptionRatio > TRANSFECTION_WINDOW.upper ? 'above' : 'optimal'

  const fieldStrength = clamp01(disruptionRatio / TRANSFECTION_WINDOW.upper)

  return { vm, disruptionRatio, transfectionEfficiency, viability, windowState, fieldStrength }
}

function computeEfficiency(dr: number): number {
  if (dr <= 0)                              return 0
  if (dr < TRANSFECTION_WINDOW.lower)       return (dr / TRANSFECTION_WINDOW.lower) * 0.2
  if (dr <= TRANSFECTION_WINDOW.upper) {
    const mid   = (TRANSFECTION_WINDOW.lower + TRANSFECTION_WINDOW.upper) / 2
    const half  = (TRANSFECTION_WINDOW.upper - TRANSFECTION_WINDOW.lower) / 2
    const x     = (dr - mid) / half
    return 0.6 + 0.35 * Math.exp(-Math.pow(x * 1.4, 2))
  }
  const decayed = Math.max(0, 1 - (dr - TRANSFECTION_WINDOW.upper) * 3)
  return 0.6 * decayed
}

function computeViability(dr: number): number {
  if (dr < VIABILITY_DECAY_START) return 1
  if (dr > VIABILITY_DECAY_END)   return 0
  return 1 - (dr - VIABILITY_DECAY_START) / (VIABILITY_DECAY_END - VIABILITY_DECAY_START)
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x))
}

export const TRANSFECTION_WINDOW_BOUNDS = TRANSFECTION_WINDOW
