// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Calibration — fits a per-metric correction factor from (predicted, actual) lab-run pairs.
// This is the closed-loop "learns from your data": logged outcomes shift future predictions.

export interface CalibrationResult {
  factor:      number    // multiply a fresh prediction by this; 1.0 = no data / no correction
  sampleCount: number
  confidence:  number    // 0-1, grows with sample count
}

export interface PredictedActualPair {
  predicted: number
  actual:    number
}

// Keep corrections within a plausible band so a couple of odd data points cannot wildly skew predictions.
const FACTOR_MIN = 0.5
const FACTOR_MAX = 2.0
// Confidence saturates around this many samples.
const CONFIDENCE_SATURATION = 8

export function fitCalibration(pairs: PredictedActualPair[]): CalibrationResult {
  const valid = pairs.filter(p => p.predicted > 0 && p.actual >= 0)
  if (valid.length === 0) {
    return { factor: 1, sampleCount: 0, confidence: 0 }
  }

  // Mean of per-pair ratios (robust to scale differences across campaigns).
  const meanRatio = valid.reduce((sum, p) => sum + p.actual / p.predicted, 0) / valid.length
  const factor = clamp(meanRatio, FACTOR_MIN, FACTOR_MAX)
  const confidence = clamp(valid.length / CONFIDENCE_SATURATION, 0, 1)

  return { factor: round(factor, 3), sampleCount: valid.length, confidence: round(confidence, 2) }
}

export function applyCalibration(prediction: number, calibration: CalibrationResult): number {
  if (calibration.sampleCount === 0) return prediction
  return prediction * calibration.factor
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x))
}

function round(x: number, dp: number): number {
  const f = Math.pow(10, dp)
  return Math.round(x * f) / f
}
