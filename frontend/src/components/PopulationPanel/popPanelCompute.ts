// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

/**
 * Pure computation utilities for PopulationPanel.
 * No Vue or store imports — all functions are side-effect-free.
 */

export const MARGIN = { top: 14, right: 16, bottom: 40, left: 50 }
export const N_BINS = 20

export interface PopStats {
  pctLysed:  number
  pctRevEp:  number
  pctNour:   number
  pctStable: number
  meanDr:    number
  stdDr:     number
  /** Binomial SE on pctLysed (percentage points) */
  seLysed: number
  /** Binomial SE on pctRevEp (percentage points) */
  seRevEp: number
  /** Binomial SE on pctNour (percentage points) */
  seNour:  number
}

/**
 * Box-Muller Gaussian sample, clamped to [min, max] by rejection.
 * @param mean   - Distribution mean
 * @param stddev - Standard deviation
 * @param min    - Lower bound (reject and retry if below)
 * @param max    - Upper bound (reject and retry if above)
 * @returns A sample drawn from the truncated Gaussian distribution
 */
export function sampleGaussian(mean: number, stddev: number, min: number, max: number): number {
  let z: number
  do {
    const u1 = Math.max(1e-10, Math.random())
    const u2 = Math.random()
    z = mean + stddev * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  } while (z < min || z > max)
  return z
}

/**
 * Binomial standard error as a percentage: SE(p) = √(p(1−p)/n) × 100.
 * @param count - Number of successes
 * @param n     - Total sample size
 * @returns SE in percentage points, rounded to one decimal
 */
export function binomialSE(count: number, n: number): number {
  const p = count / n
  return +(Math.sqrt(p * (1 - p) / n) * 100).toFixed(1)
}
