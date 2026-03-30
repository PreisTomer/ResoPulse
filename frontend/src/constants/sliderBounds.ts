// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// Named slider range sets — one per cell-category × chart-mode. Single source of truth.

export interface SliderRange {
  freqMin: number; freqMax: number; freqStep: number
  fieldMin: number; fieldMax: number; fieldStep: number
  pwLogMin: number; pwLogMax: number
}

export const SLIDER_RANGES = {
  RESONANCE_VIRUS:     { freqMin: 1_000_000, freqMax: 50_000_000, freqStep: 100_000, fieldMin: 10, fieldMax:  5_000, fieldStep:  10, pwLogMin: 0, pwLogMax: 2 },
  RESONANCE_BACTERIA:  { freqMin:    10_000, freqMax: 10_000_000, freqStep:  10_000, fieldMin: 10, fieldMax: 10_000, fieldStep: 100, pwLogMin: 0, pwLogMax: 3 },
  // Extended to 100 MHz so the Schwan fc rolloff (typically 1-10 MHz for cancer cells) is fully visible
  RESONANCE_MAMMALIAN: { freqMin:        10, freqMax:    100_000, freqStep:      10, fieldMin: 10, fieldMax:  3_000, fieldStep:   1, pwLogMin: 0, pwLogMax: 5 },
  IRE_VIRUS:           { freqMin:         1, freqMax:  5_000_000, freqStep:   1_000, fieldMin: 10, fieldMax: 100_000, fieldStep:  10, pwLogMin: 0, pwLogMax: 2 },
  IRE_BACTERIA:        { freqMin:        10, freqMax:  1_000_000, freqStep:     100, fieldMin: 10, fieldMax: 100_000, fieldStep: 100, pwLogMin: 0, pwLogMax: 3 },
  // Extended to 100 MHz - Schwan relaxation frequency for mammalian cells is 1-10 MHz; full rolloff now visible
  IRE_MAMMALIAN:       { freqMin:        10, freqMax:    100_000, freqStep:      10, fieldMin: 10, fieldMax:   3_000, fieldStep:   1, pwLogMin: 0, pwLogMax: 5 },
}

// Duty-cycle log slider bounds (log10 scale: 10^-6 to 10^-1 = 0.0001% to 10%)
export const SLIDER_DC = {
  LOG_MIN:  -6,
  LOG_MAX:  -1,
  LOG_STEP:  0.05,
} as const

// Advanced-section slider attributes — orientation, pulse count, perfusion, cell packing
export const SLIDER_ADV = {
  ORI_MIN:           0,    ORI_MAX:           90,  ORI_STEP:    1,
  LYSIS_N_LOG_MIN:   0,    LYSIS_N_LOG_MAX:    3,  LYSIS_N_LOG_STEP: 0.05,  // 10⁰=1 … 10³=1000
  PERF_MIN:          0,    PERF_MAX:           5,  PERF_STEP:   0.05,
  PHI_MIN:           0,    PHI_MAX:          0.9,  PHI_STEP:    0.01,
} as const
