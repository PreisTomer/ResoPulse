// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Media & feed model — Module 2c. Projects how basal richness and feed strategy shift
// integral viable cell density (the main titer driver) and final titer.

export interface MediaInputs {
  basalRichness:   number   // relative nutrient density, 1 = standard
  feedStartDay:    number
  feedRatePct:     number   // daily feed as % of culture volume
  glucoseSetpoint: number   // g/L
  durationDays:    number
  baseQpPgCellDay: number   // specific productivity baseline
}

export interface MediaPrediction {
  projectedPeakVcdE6: number
  projectedTiterGL:   number
  integralVcd:        number   // 10^6 cell-days/mL
}

const BASE_MAX_VCD_E6 = 16
const PG_PER_ML_TO_G_PER_L = 1e-9
// Feed raises integral VCD with diminishing returns (lactate accumulation above ~optimum).
const FEED_OPTIMUM_PCT = 12

export function predictMedia(inputs: MediaInputs): MediaPrediction {
  // Basal richness scales carrying capacity (more nutrients support higher density).
  const maxVcd = BASE_MAX_VCD_E6 * clamp(inputs.basalRichness, 0.5, 2.2)

  // Glucose setpoint: too low starves growth, a broad optimum near 4-6 g/L.
  const glucoseFactor = 1 - Math.min(1, Math.abs(inputs.glucoseSetpoint - 5) / 8)

  // Peak VCD blends carrying capacity with glucose adequacy.
  const projectedPeakVcdE6 = round(maxVcd * (0.7 + 0.3 * glucoseFactor), 2)

  // Feed contribution to integral VCD: extends production phase, diminishing past optimum.
  const feedDays = Math.max(0, inputs.durationDays - inputs.feedStartDay)
  const feedEfficiency = inputs.feedRatePct <= FEED_OPTIMUM_PCT
    ? inputs.feedRatePct / FEED_OPTIMUM_PCT
    : 1 - (inputs.feedRatePct - FEED_OPTIMUM_PCT) / 30      // over-feed penalty
  const feedBoost = 1 + clamp(feedEfficiency, 0, 1) * (feedDays / inputs.durationDays) * 0.8

  // Integral VCD ~ peak VCD x duration x phase-fullness x feed boost (rough trapezoid).
  const integralVcd = round(projectedPeakVcdE6 * inputs.durationDays * 0.55 * feedBoost, 1)

  // Titer = qP x integral VCD, unit-converted. qP also lifts modestly with feed.
  const qP = inputs.baseQpPgCellDay * (1 + 0.2 * clamp(feedEfficiency, 0, 1))
  const titerPgPerMl = qP * integralVcd * 1e6
  const projectedTiterGL = round(titerPgPerMl * PG_PER_ML_TO_G_PER_L, 2)

  return { projectedPeakVcdE6, projectedTiterGL, integralVcd }
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x))
}

function round(x: number, dp: number): number {
  const f = Math.pow(10, dp)
  return Math.round(x * f) / f
}
