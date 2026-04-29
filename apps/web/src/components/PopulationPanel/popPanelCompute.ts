// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Pure computation utilities for PopulationPanel. No Vue/store imports.

export const MARGIN = { top: 14, right: 16, bottom: 40, left: 50 }
export const N_BINS = 20

export const CHART_HEIGHT               = 196   // SVG chart height [px] — matches CSS min-height
export const POP_DEFAULT_N_CELLS        = 300   // default Monte-Carlo sample count
export const POP_DEFAULT_R_VARIANCE_PCT = 10    // default radius CV [%] (Tzur et al. 2009)
export const POP_DEFAULT_VTH_VARIANCE_PCT = 20  // default V_th CV [%] (Weaver & Chizmadzhev 1996)
export const POP_CHART_DR_X_MIN         = 1.6   // minimum chart X extent [DR units]
export const POP_LEGEND_ITEM_WIDTH      = 160   // horizontal spacing between legend items [px]
export const POP_LIVE_RESAMPLE_INTERVAL_MS = 2000  // live-update interval when panel is open [ms]
export const POP_RESAMPLE_DEBOUNCE_MS   = 150   // debounce delay for watcher-triggered resample [ms]

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
