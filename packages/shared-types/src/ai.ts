// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import type { StatePacket } from './socket'

export interface CellBiophysics {
  id:               string
  label:            string
  radiusUm:         number
  memThicknessNm:   number
  dielectricConst:  number
  conductivitySi:   number
  thresholdV:       number
  resonantFreqGhz?: number
  capsidQ?:         number
}

export interface AiPhysicsFeatures {
  targetTauNs:          number
  healthyTauNs:         number
  targetFcKhz:          number
  healthyFcKhz:         number
  sigmaE:               number
  optimalFreqKhz:       number
  selectivityAtOptimal: number
}

export interface AiPhysicsBaseline {
  suggestion: {
    freqKHz:      number
    fieldVcm:     number
    dutyCycle:    number
    pulseWidthNs: number
    waveform:     'cw' | 'pulsed' | 'hfire'
  }
  predictedTargetDr:  number
  predictedHealthyDr: number
  predictedTi:        number
}

export interface AiOptimizeRequest {
  requestId:       string
  sessionState:    StatePacket
  healthyCell:     CellBiophysics
  targetCell:      CellBiophysics
  features:        AiPhysicsFeatures
  physicsBaseline: AiPhysicsBaseline
}

export interface AiParamSuggestion {
  freqKHz:      number
  fieldVcm:     number
  dutyCycle:    number
  pulseWidthNs: number
  waveform:     'cw' | 'pulsed' | 'hfire'
}

export interface AiOptimizeResult {
  requestId:          string
  suggestion:         AiParamSuggestion | null
  predictedTargetDr:  number
  predictedHealthyDr: number
  predictedTi:        number
  confidenceScore:    number
  explanation:        string
  featureImportance:  Record<string, number>
  isPhysicsBaseline:  boolean
}

// Viability assay method. Keeps the readout method explicit so that a measured
// viabilityPct can be interpreted correctly (trypan = membrane integrity only,
// MTT = metabolic activity, flowPi = membrane integrity via flow cytometry, etc.).
export type ViabilityAssay =
  | 'trypan'
  | 'mtt'
  | 'flowPi'
  | 'resazurin'
  | 'cellTiterGlo'
  | 'other'

export interface MeasuredOutcome {
  measuredAt:            string   // ISO timestamp when the scientist entered the result
  // ── Cell-population readouts (assay outcomes) ─────────────────────────────
  targetLysisPct?:       number   // 0-100, measured target lysis fraction
  healthyLysisPct?:      number   // 0-100, measured healthy lysis fraction
  viabilityPct?:         number   // 0-100, surviving-overall fraction
  permeabilizedPct?:     number   // 0-100, PI+ / YO-PRO+ / SYTOX+ fraction (permeabilisation)
  transfectionPct?:      number   // 0-100, cargo+ fraction (GFP+ / marker+ via flow)
  viabilityAssay?:       ViabilityAssay
  assayTimepointH?:      number   // hours post-pulse when the assay was read
  // ── Physical conditions observed on-bench ─────────────────────────────────
  tempC?:                number   // °C, measured post-run temperature (probe/IR)
  actualFieldVcm?:       number   // V/cm, measured applied field from pulse monitor
  observedLysisDelayMs?: number   // ms, observed time-to-lysis (compare to simulator)
  notes?:                string   // free-form lab note
}

export interface OutcomeEntry {
  sessionName:         string
  timestamp:           string
  freqKHz:             number
  fieldVcm:            number
  medium:              string
  targetPreset:        string
  waveform:            string
  dutyCycle:           number
  pulseWidthNs:        number
  orientationDeg:      number
  lysisNPulses:        number
  targetRatio:         number
  healthyRatio:        number
  selectivity:         number
  targetTemp:          number
  healthyTemp:         number
  rating:              number
  aiSuggestionApplied: boolean
  targetTauNs:         number
  healthyTauNs:        number
  targetFcKhz:         number
  healthyFcKhz:        number
  targetRadiusUm:      number
  sigmaE:              number
  measured?:           MeasuredOutcome
}

// ── Calibration (Stage D: per-lab sigma_i correction) ────────────────────────
// CalibrationSample carries one (predicted, measured) ratio pair feeding the
// scalar sigma_i multiplier fit. The Node API derives these from Outcome rows
// that have both a simulator prediction and a bench-measured lysis fraction.

export interface AiCalibrationSample {
  predictedRatio: number    // 0-1, simulator-predicted disruption ratio
  measuredRatio:  number    // 0-1, bench-measured lysis fraction (lysisPct / 100)
}

export interface AiCalibrationRequest {
  orgId:        string
  cellPresetId: string
  samples:      AiCalibrationSample[]
}

export interface AiCalibrationResult {
  sigmaMultiplier: number   // sigma_i_corrected = sigma_i_base * sigmaMultiplier
  uncertaintyStd:  number   // residual std after fit; drives sigma_i band half-width
  nSamples:        number   // rows used in fit (after outlier rejection)
  collecting:      boolean  // true when nSamples < CALIBRATION_MIN_SAMPLES
  clamped:         boolean  // true when fit hit [0.3, 3.0] biological-plausibility bounds
  outliersRemoved: number   // rows dropped by 3-sigma residual clipping pre-fit
  rmseBefore:      number   // DR-ratio RMSE with multiplier=1 (no correction)
  rmseAfter:       number   // DR-ratio RMSE with fitted multiplier applied
}

export interface CellCalibrationRecord {
  orgId:           string
  cellPresetId:    string
  sigmaMultiplier: number
  uncertaintyStd:  number
  nSamples:        number
  updatedAt:       string   // ISO timestamp
}

// ── logMeasuredOutcome socket payload (Stage C.2) ─────────────────────────────
// Carries the measured-outcome patch for a prior outcome row. Matched on
// the backend via (sessionName, timestamp) which together uniquely identify
// an entry inside a given session.

export interface MeasuredOutcomeEntry {
  sessionName: string
  timestamp:   string
  measured:    MeasuredOutcome
}
