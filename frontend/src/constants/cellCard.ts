// Copyright © 2026 Tomer Preis. All rights reserved.
// Unauthorized copying or distribution is prohibited.

// ── Canvas geometry ───────────────────────────────────────────────────────────
export const CANVAS_W   = 280
export const CANVAS_H   = 194    // must be ≥ 2×(BASE_R+40)=190 to contain aura rings
export const OSC_W      = 280
export const OSC_H      = 37     // ~15 % shorter than original 44

// ── Blob cell ─────────────────────────────────────────────────────────────────
export const BASE_R       = 55    // blob base radius (SVG px), ~15 % smaller than 65
export const BLOB_POINTS  = 16    // number of perimeter control points

// ── Lysis / shatter timing (ms) ───────────────────────────────────────────────
// LYSIS_DELAY_MS removed - replaced by store.lysisDelayMs (N_pulses × pulse_period, physically grounded)
export const LYSIS_DURATION_MS = 2800   // shatter animation length
export const FRAGMENT_INTERVAL_MS = 80  // ms between spawned fragments

// ── Physics model thresholds (canonical home: constants/physics.ts) ───────────
// Re-exported here so CellCard-domain files keep a single local import.
export { THRESHOLDS, DEFAULT_CAPSID_Q } from '@/constants/physics'
export type { ThresholdKey } from '@/constants/physics'

// ── Per-type colors (defined in theme/colors.ts - re-exported here for back-compat) ──
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
