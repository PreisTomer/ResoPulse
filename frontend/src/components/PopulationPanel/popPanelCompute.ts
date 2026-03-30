// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// Pure computation utilities for PopulationPanel. No Vue/store imports.

export const MARGIN = { top: 14, right: 16, bottom: 40, left: 50 }
export const N_BINS = 20

export interface PopStats {
  pctLysed:  number
  pctRevEp:  number
  pctNour:   number
  pctStable: number
  meanDr:    number
  stdDr:     number
  seLysed: number  // binomial SE on pctLysed (percentage points)
  seRevEp: number  // binomial SE on pctRevEp
  seNour:  number  // binomial SE on pctNour
}

// Box-Muller Gaussian sample clamped to [min, max] by rejection
export function sampleGaussian(mean: number, stddev: number, min: number, max: number): number {
  let z: number
  do {
    const u1 = Math.max(1e-10, Math.random())
    const u2 = Math.random()
    z = mean + stddev * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  } while (z < min || z > max)
  return z
}

// SE(p) = √(p(1−p)/n) × 100 [percentage points]
export function binomialSE(count: number, n: number): number {
  const p = count / n
  return +(Math.sqrt(p * (1 - p) / n) * 100).toFixed(1)
}
