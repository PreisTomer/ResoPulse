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
/** All disruption ratio and temperature thresholds used by the cell state machine */
export const THRESHOLDS = {
  DISRUPTION_WARN:     0.85,  // disruptionRatio above which lysis arms
  HEALTHY_CRITICAL:    0.85,  // healthy cell: electroporation pore-formation imminent
  HEALTHY_APPROACHING: 0.50,  // healthy cell: membrane stress / ion channel perturbation onset
  NOURISHING:          0.45,  // healthy-cell nourishing state onset
  VIBRATING_MIN:       0.08,  // healthy-cell low-vibration onset
  TEMP_WARN:           42,    // °C — temperature above which meta turns orange
  TEMP_DENATURING:     60,    // °C — protein denaturation onset (collagen ~60°C, albumin ~68°C)
  TEMP_VAPORIZING:     100,   // °C — water boiling / rapid steam-driven cell lysis
  TEMP_CAP:            150,   // °C — simulation display ceiling
} as const

export type ThresholdKey = keyof typeof THRESHOLDS

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

// ── Editable biophysical parameter definitions ────────────────────────────────
export interface EditableParamDef {
  label: string
  key: string
  step: number
  min: number
  unit: string
}

export const EDITABLE_PARAMS: EditableParamDef[] = [
  { label: 'Radius R',         key: 'radius',            step: 0.001, min: 0.001, unit: 'µm'  },
  { label: 'Eff. membrane ε_r', key: 'dielectricConstant', step: 0.1, min: 1,     unit: ''    },
  { label: 'Conductivity σ_i', key: 'conductivity',      step: 0.01, min: 0.001, unit: 'S/m' },
  { label: 'Threshold Vm',     key: 'thresholdVoltage',  step: 0.05, min: 0.1,   unit: 'V'   },
]
