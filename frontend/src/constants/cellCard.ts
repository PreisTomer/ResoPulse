// ── Canvas geometry ───────────────────────────────────────────────────────────
export const CANVAS_W   = 280
export const CANVAS_H   = 210
export const OSC_W      = 280
export const OSC_H      = 44

// ── Blob cell ─────────────────────────────────────────────────────────────────
export const BASE_R       = 65    // blob base radius (SVG px)
export const BLOB_POINTS  = 16    // number of perimeter control points

// ── Nucleus (DNA double-helix) ────────────────────────────────────────────────
export const NUCLEUS_W    = 60    // helix x-span
export const NUCLEUS_H    = 28    // helix y-amplitude ×2
export const NUCLEUS_PTS  = 20    // sample points along helix
export const NUCLEUS_RUNGS = 8   // cross-rungs drawn per tick

// ── Lysis / shatter timing (ms) ───────────────────────────────────────────────
export const LYSIS_DELAY_MS    = 2500   // countdown before lysis triggers
export const LYSIS_DURATION_MS = 2800   // shatter animation length
export const FRAGMENT_INTERVAL_MS = 80  // ms between spawned fragments

// ── Threshold ratios & temperatures ──────────────────────────────────────────
export const DISRUPTION_WARN_THRESHOLD    = 0.85  // disruptionRatio above which lysis arms
export const HEALTHY_CRITICAL_THRESHOLD   = 0.85  // healthy cell: electroporation pore-formation imminent
export const HEALTHY_APPROACHING_THRESHOLD = 0.50  // healthy cell: membrane stress / ion channel perturbation onset
export const NOURISHING_THRESHOLD         = 0.45   // healthy-cell nourishing state onset
export const VIBRATING_MIN_THRESHOLD      = 0.08   // healthy-cell low-vibration onset
export const TEMP_WARN_CELSIUS            = 42     // temperature above which meta turns orange

// ── Per-type colors ───────────────────────────────────────────────────────────
export const CELL_COLORS = {
  healthy: {
    accent:     '#00d4ff',
    rung:       '#39ff14',
    interpFrom: '#00d4ff',  // cellColor gradient start
    interpTo:   '#39ff14',  // cellColor gradient end
  },
  target: {
    accent:     '#ff4d6d',
    rung:       '#ff8c00',
    interpFrom: '#4d79ff',
    interpTo:   '#ff4d6d',
  },
} as const

// ── Editable biophysical parameter definitions ────────────────────────────────
export interface EditableParamDef {
  label: string
  key: string
  step: number
  min: number
  unit: string
}

export const EDITABLE_PARAMS: EditableParamDef[] = [
  { label: 'Radius R',         key: 'radius',            step: 0.5,  min: 1,     unit: 'µm'  },
  { label: 'Membrane ε_r',     key: 'dielectricConstant', step: 0.1, min: 1,     unit: ''    },
  { label: 'Conductivity σ_i', key: 'conductivity',      step: 0.01, min: 0.001, unit: 'S/m' },
  { label: 'Threshold Vm',     key: 'thresholdVoltage',  step: 0.05, min: 0.1,   unit: 'V'   },
]
