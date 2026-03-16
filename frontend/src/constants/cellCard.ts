// Copyright © 2026 Tomer Preis. All rights reserved.
// Unauthorized copying or distribution is prohibited.

// ── Canvas geometry ───────────────────────────────────────────────────────────
export const CANVAS_W   = 280
export const CANVAS_H   = 194    // must be ≥ 2×(BASE_R+40)=190 to contain aura rings
export const OSC_W      = 280
export const OSC_H      = 37     // ~15 % shorter than original 44

// ── Blob cell ─────────────────────────────────────────────────────────────────
export const BASE_R       = 55    // blob base radius (SVG px) — ~15 % smaller than 65
export const BLOB_POINTS  = 16    // number of perimeter control points

// ── Lysis / shatter timing (ms) ───────────────────────────────────────────────
// LYSIS_DELAY_MS removed — replaced by store.lysisDelayMs (N_pulses × pulse_period, physically grounded)
export const LYSIS_DURATION_MS = 2800   // shatter animation length
export const FRAGMENT_INTERVAL_MS = 80  // ms between spawned fragments

// ── Threshold ratios & temperatures ──────────────────────────────────────────
/** All disruption ratio, temperature, selectivity, and classification thresholds.
 *  Single source of truth — change a value here to propagate everywhere. */
export const THRESHOLDS = {
  // ── Disruption ratio (DR = Vm × f_pulse / V_threshold) ──────────────────────
  DISRUPTION_WARN:     0.85,  // DR above which lysis countdown arms (IRE onset)
  HEALTHY_CRITICAL:    0.85,  // healthy cell: electroporation pore-formation imminent
  HEALTHY_APPROACHING: 0.50,  // healthy cell: membrane stress / ion channel perturbation onset
  NOURISHING:          0.45,  // healthy-cell nourishing state onset (sub-threshold biomodulation)
  VIBRATING_MIN:       0.08,  // healthy-cell low-vibration onset
  // ── Temperature (°C) ────────────────────────────────────────────────────────
  TEMP_WARN:           42,    // hyperthermic safety limit (IAHT standard)
  TEMP_DENATURING:     60,    // protein denaturation onset (collagen ~60°C, albumin ~68°C)
  TEMP_VAPORIZING:     100,   // water boiling / rapid steam-driven cell lysis
  TEMP_CAP:            150,   // simulation display ceiling
  // ── Therapeutic Index TI = DR_T / DR_H  (sweep analysis) ───────────────────
  TI_STRONG:           2.0,   // TI above which the sweep window is therapeutically strong
  TI_MARGINAL:         1.2,   // TI above which the window is marginal (below = poor selectivity)
  // ── Vm selectivity Sel = Vm_T / Vm_H  (panel badges & reports) ─────────────
  SEL_STRONG:          1.5,   // Sel above which selectivity badge is green
  SEL_MARGINAL:        1.0,   // Sel above which badge is amber (below = non-selective)
  // ── Lysis probability sigmoid  P = 1 / (1 + exp(−(DR − center) / slope)) ───
  LYSIS_PROB_CENTER:   1.0,   // DR at which P(lysis) = 50%
  LYSIS_PROB_SLOPE:    0.05,  // sigmoid steepness — smaller = sharper transition
  // ── Cell category radius boundaries (µm) ───────────────────────────────────
  RADIUS_VIRUS_MAX:    0.1,   // R < 0.1 µm → VIRUS classification
  RADIUS_BACTERIA_MAX: 2.0,   // 0.1 ≤ R < 2.0 µm → BACTERIA; R ≥ 2.0 µm → MAMMALIAN
  // ── Display caps ─────────────────────────────────────────────────────────────
  TI_DISPLAY_CAP:      99.9,  // TI display ceiling when healthy DR → 0
  // ── Nuclear membrane model ───────────────────────────────────────────────────
  NUCLEAR_VM_DEFAULT:  0.5,   // Default nuclear membrane threshold voltage [V] (Kotnik 2006)
  // ── σ_i uncertainty fractions per cell category (used in TI error bars) ─────
  UNCERTAINTY_VIRUS:    0.45, // ±45% — lipid envelope σ_i highly variable
  UNCERTAINTY_BACTERIA: 0.35, // ±35% — cytoplasm σ_i literature range
  UNCERTAINTY_MAMMALIAN: 0.20,// ±20% — well-characterised cytoplasm σ_i
  // ── BMS weighting coefficients (sum = 1.0) ───────────────────────────────────
  BMS_WEIGHT_SI:       0.55,  // sub-threshold stimulation index weight
  BMS_WEIGHT_MTE:      0.25,  // mechanical transduction efficiency weight
  BMS_WEIGHT_MA:       0.20,  // mild thermal activation weight
} as const

export type ThresholdKey = keyof typeof THRESHOLDS

/** Default acoustic Q factor used when a preset does not specify capsidQ. */
export const DEFAULT_CAPSID_Q = 20

// Individual named exports — derived from THRESHOLDS for backward compatibility
export const DISRUPTION_WARN_THRESHOLD     = THRESHOLDS.DISRUPTION_WARN
export const HEALTHY_CRITICAL_THRESHOLD    = THRESHOLDS.HEALTHY_CRITICAL
export const HEALTHY_APPROACHING_THRESHOLD = THRESHOLDS.HEALTHY_APPROACHING
export const NOURISHING_THRESHOLD          = THRESHOLDS.NOURISHING
export const VIBRATING_MIN_THRESHOLD       = THRESHOLDS.VIBRATING_MIN
export const TEMP_WARN_CELSIUS             = THRESHOLDS.TEMP_WARN
export const TEMP_DENATURING               = THRESHOLDS.TEMP_DENATURING
export const TEMP_VAPORIZING               = THRESHOLDS.TEMP_VAPORIZING
export const TEMP_SIMULATION_CAP           = THRESHOLDS.TEMP_CAP

// ── Per-type colors (defined in theme/colors.ts — re-exported here for back-compat) ──
export { CELL_COLORS } from '@/theme/colors'

import { UNIT } from '@/constants/units'

// ── Editable biophysical parameter definitions ────────────────────────────────
export interface EditableParamDef {
  label: string
  key: string
  step: number
  min: number
  unit: string
}

export const EDITABLE_PARAMS: EditableParamDef[] = [
  { label: 'Radius R',          key: 'radius',            step: 0.001, min: 0.001, unit: UNIT.UM      },
  { label: 'Eff. membrane ε_r', key: 'dielectricConstant', step: 0.1,  min: 1,     unit: ''           },
  { label: 'Conductivity σ_i',  key: 'conductivity',      step: 0.01,  min: 0.001, unit: UNIT.S_PER_M },
  { label: 'Threshold Vm',      key: 'thresholdVoltage',  step: 0.05,  min: 0.1,   unit: UNIT.V       },
]
