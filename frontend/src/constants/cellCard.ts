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
export const DISRUPTION_WARN_THRESHOLD    = 0.85  // disruptionRatio above which lysis arms
export const HEALTHY_CRITICAL_THRESHOLD   = 0.85  // healthy cell: electroporation pore-formation imminent
export const HEALTHY_APPROACHING_THRESHOLD = 0.50  // healthy cell: membrane stress / ion channel perturbation onset
export const NOURISHING_THRESHOLD         = 0.45   // healthy-cell nourishing state onset
export const VIBRATING_MIN_THRESHOLD      = 0.08   // healthy-cell low-vibration onset
export const TEMP_WARN_CELSIUS            = 42     // temperature above which meta turns orange
export const TEMP_DENATURING             = 60     // °C — protein denaturation onset (irreversible; collagen ~60°C, albumin ~68°C)
export const TEMP_VAPORIZING             = 100    // °C — water boiling / rapid steam-driven cell lysis
export const TEMP_SIMULATION_CAP         = 150    // °C — simulation display ceiling (cells destroyed well below this)

// ── Per-type colors (defined in theme/colors.ts — re-exported here for back-compat) ──
export { CELL_COLORS } from '../theme/colors'

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
