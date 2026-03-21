// Copyright © 2026 Tomer Preis. All rights reserved.
// Unauthorized copying or distribution is prohibited.

/**
 * Therapeutic Window Heatmap - grid constants, zone definitions, and colour palette.
 *
 * The 2D heatmap sweeps RF frequency (X, log-scale) × field intensity (Y, linear)
 * and colour-codes each cell by the treatment zone, giving scientists a complete
 * decision map before activating hardware.
 */

import { C } from '@/theme/colors'

// ── Grid resolution ────────────────────────────────────────────────────────────

/** Number of frequency steps (X-axis columns).  220 cols × 110 rows = 24 200 physics evaluations per sweep. */
export const HMAP_FREQ_STEPS  = 220

/** Number of field-intensity steps (Y-axis rows). */
export const HMAP_FIELD_STEPS = 110

// ── Canvas geometry ────────────────────────────────────────────────────────────

/** Canvas internal CSS-pixel width (used for all coordinate calculations). */
export const HMAP_CANVAS_W = 640

/** Canvas internal CSS-pixel height. */
export const HMAP_CANVAS_H = 340

/** Plot margins [px] around the active grid area. */
export const HMAP_MARGIN = {
  LEFT:   68,   // field-axis labels + ticks
  RIGHT:  18,
  TOP:    14,
  BOTTOM: 48,   // frequency-axis labels + ticks
} as const

// ── Treatment zone thresholds ──────────────────────────────────────────────────

/** Target DR ≥ this → lysis threshold reached (matches DISRUPTION_WARN_THRESHOLD in cellCard.ts). */
export const HMAP_LYSIS_DR     = 0.85

/** Target DR ≥ this → approaching Rev-EP window (onset of reversible membrane permeabilisation). */
export const HMAP_APPROACH_DR  = 0.50

/** Healthy DR ≥ this → healthy cell under stress (Rev-EP onset). */
export const HMAP_WARN_DR      = 0.50

/** Healthy steady-state temperature above this → hyperthermic warning [°C]. */
export const HMAP_THERM_WARN_C = 40.0

/** Healthy steady-state temperature above this → protein denaturing danger [°C]. */
export const HMAP_THERM_CRIT_C = 42.0

// ── Zone identifiers ───────────────────────────────────────────────────────────

/**
 * Treatment zone classification (lower = safer, higher = more dangerous).
 * Priority order: THERMAL > ABLATIVE > MARGINAL > THERAPEUTIC > APPROACHING > SUB
 */
export const HMAP_ZONE = {
  SUB:         0,  // sub-threshold, no membrane effect
  APPROACHING: 1,  // target in Rev-EP window (50-85% DR)
  THERAPEUTIC: 2,  // target at lysis, healthy safely below Rev-EP
  MARGINAL:    3,  // target at lysis, healthy in Rev-EP stress zone or T > 40°C
  ABLATIVE:    4,  // healthy cell also at lysis, non-selective
  THERMAL:     5,  // healthy tissue temperature > 42°C, thermal damage
} as const

export type HmapZone = typeof HMAP_ZONE[keyof typeof HMAP_ZONE]

/** Canvas fillStyle colour per zone (dark-theme palette). */
export const HMAP_ZONE_COLOR: Record<HmapZone, string> = {
  [HMAP_ZONE.SUB]:         C.bg,
  [HMAP_ZONE.APPROACHING]: C.primaryFill,
  [HMAP_ZONE.THERAPEUTIC]: C.limeFill,
  [HMAP_ZONE.MARGINAL]:    C.amberFill,
  [HMAP_ZONE.ABLATIVE]:    C.dangerFill,
  [HMAP_ZONE.THERMAL]:     C.heatFill,
}

/** i18n key suffix per zone - used as `heatmap.zone<suffix>`. */
export const HMAP_ZONE_KEY: Record<HmapZone, string> = {
  [HMAP_ZONE.SUB]:         'Sub',
  [HMAP_ZONE.APPROACHING]: 'Approaching',
  [HMAP_ZONE.THERAPEUTIC]: 'Therapeutic',
  [HMAP_ZONE.MARGINAL]:    'Marginal',
  [HMAP_ZONE.ABLATIVE]:    'Ablative',
  [HMAP_ZONE.THERMAL]:     'Thermal',
}

/** CSS text colour per zone (for stats badges). */
export const HMAP_ZONE_CSS: Record<HmapZone, string> = {
  [HMAP_ZONE.SUB]:         'var(--color-text-muted)',
  [HMAP_ZONE.APPROACHING]: 'var(--color-primary)',
  [HMAP_ZONE.THERAPEUTIC]: 'var(--color-lime)',
  [HMAP_ZONE.MARGINAL]:    'var(--color-amber)',
  [HMAP_ZONE.ABLATIVE]:    'var(--color-danger)',
  [HMAP_ZONE.THERMAL]:     '#ff8c00',
}
