// Copyright © 2026 Tomer Preis. All rights reserved.
// Unauthorized copying or distribution is prohibited.

// Heatmap grid constants, zone definitions, and colour palette.
// 2D sweep: RF frequency (X, log-scale) × field intensity (Y, linear).

import { C } from '@/theme/colors'

// ── Grid resolution ────────────────────────────────────────────────────────────

export const HMAP_FREQ_STEPS  = 220  // 220 cols × 110 rows = 24 200 physics evaluations per sweep
export const HMAP_FIELD_STEPS = 110

// ── Frequency axis bounds ─────────────────────────────────────────────────────

export const HMAP_FREQ_MIN_KHZ = 10  // minimum X-axis frequency [kHz]

// ── Canvas geometry ────────────────────────────────────────────────────────────

export const HMAP_CANVAS_W = 640
export const HMAP_CANVAS_H = 340

// Y-axis headroom: extends axis to this multiple of the highest lysis field
export const HMAP_YAXIS_HEADROOM = 2.0

// DR display cap: values beyond this are clamped before percentage formatting
export const HMAP_DR_DISPLAY_CAP = 9.99

// Selectivity display cap: values at or above this show ∞ instead of a number
export const HMAP_SEL_INFINITY_CAP = 99

// Skin-depth quality thresholds [mm] for RF/microwave regime colour coding
export const HMAP_SKIN_DEPTH_OK_MM   = 20
export const HMAP_SKIN_DEPTH_WARN_MM = 5

// Debounce delay for physics grid recompute after slider changes [ms]
export const HMAP_RECOMPUTE_DEBOUNCE_MS = 250

// Canvas font strings (CSS variables are not evaluated in canvas contexts)
export const HMAP_CANVAS_FONT_AXIS = '9px monospace'  // axis ticks, line labels
export const HMAP_CANVAS_FONT_TINY = '8px monospace'  // fc corner-freq labels

// Canvas line label text constants (locale-neutral abbreviations)
export const HMAP_LABEL_OPT  = 'opt'    // optimal-frequency marker label
export const HMAP_LABEL_FRES = 'f_res'  // resonant-frequency marker label

export const HMAP_MARGIN = {
  LEFT:   68,   // field-axis labels + ticks
  RIGHT:  18,
  TOP:    14,
  BOTTOM: 48,   // frequency-axis labels + ticks
} as const

// ── Treatment zone thresholds ──────────────────────────────────────────────────

export const HMAP_LYSIS_DR     = 0.85  // target DR ≥ this → lysis threshold
export const HMAP_APPROACH_DR  = 0.50  // target DR ≥ this → approaching Rev-EP
export const HMAP_WARN_DR      = 0.50  // healthy DR ≥ this → stress onset
export const HMAP_THERM_WARN_C = 40.0  // hyperthermic warning [°C]
export const HMAP_THERM_CRIT_C = 42.0  // protein denaturing danger [°C]

// ── Zone identifiers (priority: THERMAL > ABLATIVE > MARGINAL > THERAPEUTIC > APPROACHING > SUB) ──
export const HMAP_ZONE = {
  SUB:         0,  // sub-threshold, no membrane effect
  APPROACHING: 1,  // target in Rev-EP window (50-85% DR)
  THERAPEUTIC: 2,  // target at lysis, healthy safely below Rev-EP
  MARGINAL:    3,  // target at lysis, healthy in Rev-EP stress zone or T > 40°C
  ABLATIVE:    4,  // healthy cell also at lysis, non-selective
  THERMAL:     5,  // healthy tissue temperature > 42°C, thermal damage
} as const

export type HmapZone = typeof HMAP_ZONE[keyof typeof HMAP_ZONE]

export const HMAP_ZONE_COLOR: Record<HmapZone, string> = {
  [HMAP_ZONE.SUB]:         C.bg,
  [HMAP_ZONE.APPROACHING]: C.primaryFill,
  [HMAP_ZONE.THERAPEUTIC]: C.limeFill,
  [HMAP_ZONE.MARGINAL]:    C.amberFill,
  [HMAP_ZONE.ABLATIVE]:    C.dangerFill,
  [HMAP_ZONE.THERMAL]:     C.heatFill,
}

export const HMAP_ZONE_KEY: Record<HmapZone, string> = {  // i18n key suffix: used as heatmap.zone<suffix>
  [HMAP_ZONE.SUB]:         'Sub',
  [HMAP_ZONE.APPROACHING]: 'Approaching',
  [HMAP_ZONE.THERAPEUTIC]: 'Therapeutic',
  [HMAP_ZONE.MARGINAL]:    'Marginal',
  [HMAP_ZONE.ABLATIVE]:    'Ablative',
  [HMAP_ZONE.THERMAL]:     'Thermal',
}

export const HMAP_ZONE_CSS: Record<HmapZone, string> = {  // CSS text colour per zone (stats badges)
  [HMAP_ZONE.SUB]:         'var(--color-text-muted)',
  [HMAP_ZONE.APPROACHING]: 'var(--color-primary)',
  [HMAP_ZONE.THERAPEUTIC]: 'var(--color-lime)',
  [HMAP_ZONE.MARGINAL]:    'var(--color-amber)',
  [HMAP_ZONE.ABLATIVE]:    'var(--color-danger)',
  [HMAP_ZONE.THERMAL]:     'var(--color-vibrating)',
}
