// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

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
  // ── qPCR readout (optional) ───────────────────────────────────────────────
  qpcrFoldChange?:       number   // 2^(-ΔΔCt); <1 knockdown, >1 upregulation
  qpcrTarget?:           string   // transcript label (e.g. "GAPDH", "HSP70")
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

// ── Calibration (Stage D: per-lab two-parameter physics-inversion fit) ──────
// Two modes:
//   Schwan / IRE   — fits (σ_i_mult, V_th_mult) by inverting the Schwan + RC
//                    pulse envelope + temperature/electrosensitization model.
//   Resonance      — fits (Q_mult, V_thr_res_mult) by inverting the Lorentzian
//                    capsid response. Applies only to virus / bacteria targets
//                    in chartMode='resonance' with capsid params populated.
//
// One active calibration row per (orgId, cellPresetId, mode). The covariance
// (cov11, cov12, cov22) is on the multiplier scale and feeds the frontend's
// Jacobian-propagated uncertainty bands.

export type CalibrationMode = 'schwan' | 'resonance'
export type CellCategory    = 'mammalian' | 'bacteria' | 'virus'

export interface AiCalibrationCellParams {
  radiusUm:                     number
  memThicknessNm:               number
  dielectricConst:              number
  sigmaIBaseline:               number
  vthBaseline:                  number
  resonantFreqGhz?:             number
  capsidQBaseline?:             number
  resonantThresholdVcmBaseline?: number
  resonantFreqGhz2?:            number
  capsidQ2?:                    number
  resonantMode2Amp?:            number
}

export interface AiCalibrationProtocol {
  freqKhz:        number
  fieldVcm:       number
  sigmaE:         number
  tempC:          number
  nPulses:        number
  pulseWidthNs:   number
  dutyCycle:      number
  waveform:       'cw' | 'pulsed' | 'hfire'
  orientationDeg: number
}

export interface AiCalibrationSample {
  measuredRatio: number    // 0-1, bench-measured lysis fraction
  protocol:      AiCalibrationProtocol
}

export interface AiCalibrationRequest {
  orgId:        string
  cellPresetId: string
  mode:         CalibrationMode
  category:     CellCategory
  cellParams:   AiCalibrationCellParams
  samples:      AiCalibrationSample[]
}

export interface AiCalibrationResult {
  mode:                CalibrationMode
  param1Mult:          number      // Schwan: σ_i; Resonance: Q
  param2Mult:          number      // Schwan: V_th; Resonance: V_thr_res
  cov11:               number      // Var(param1Mult) on multiplier scale
  cov12:               number      // Cov(param1Mult, param2Mult)
  cov22:               number      // Var(param2Mult) on multiplier scale
  residualStd:         number      // σ of residuals on DR scale (informational)
  nSamples:            number
  collecting:          boolean     // n < CALIBRATION_MIN_SAMPLES
  clampedParam1:       boolean     // hit physiological bound
  clampedParam2:       boolean
  param1Unidentifiable: boolean    // pinned at 1.0; data does not constrain
  param2Unidentifiable: boolean
  outliersRemoved:     number
  rmseBefore:          number      // baseline RMSE (no correction) on DR scale
  rmseAfter:           number      // post-fit RMSE on DR scale
}

export interface CellCalibrationRecord {
  orgId:           string
  cellPresetId:    string
  mode:            CalibrationMode
  category:        CellCategory
  param1Mult:      number
  param2Mult:      number
  cov11:           number
  cov12:           number
  cov22:           number
  residualStd:     number
  param1Clamped:   boolean
  param2Clamped:   boolean
  param1Unident:   boolean
  param2Unident:   boolean
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

// ── Trainer metrics + retrain broadcast (Stage D promotion pipeline) ─────────
// Emitted by the API after every /ai/retrain upstream call. `promoted=true`
// means the new bundle beat the previous best holdout MAE and replaced the
// active model; `promoted=false` means the fit ran but the old bundle was
// retained. Clients refresh their aiStore snapshot either way so they see
// the updated training-sample count and "best-model-so-far" metrics.

export interface TrainerOutcomeMetrics {
  rmse: number
  mae:  number
}

export interface TrainingCompletePayload {
  samplesUsed:       number
  modelReady:        boolean
  at:                string               // ISO timestamp of retrain completion
  modelVersion:      string | null        // promoted or staged version; null when fit was skipped
  promoted:          boolean              // true only when the active model was replaced
  holdoutMaeOverall: number | null        // mean of (target_dr, healthy_dr, rating) MAE
  previousBestMae:   number | null        // MAE the new fit had to beat; null on first run
  targetDr:          TrainerOutcomeMetrics | null
  healthyDr:         TrainerOutcomeMetrics | null
  rating:            TrainerOutcomeMetrics | null
}
