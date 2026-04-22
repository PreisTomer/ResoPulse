// Copyright © 2026 Tomer Preis. All rights reserved.
// Unauthorized copying or distribution is prohibited.

// Design-token color constants; CSS mirrors live in style.css as --color-*. Import via `@/theme` barrel.

// ── Core palette (1:1 with --color-* vars in style.css) ───────────────────────
export const C = {
  // Backgrounds & surfaces
  bg:          '#080e1a',   // --color-bg
  surface:     '#0d1826',   // --color-surface
  surface2:    '#132035',   // --color-surface-2
  border:      '#1e3a5f',   // --color-border

  // Primary / accent / danger
  primary:     '#00d4ff',                    // --color-primary     (cyan)
  primaryDim:  'rgba(0, 212, 255, 0.15)',    // --color-primary-dim
  accent:      '#00ff9d',                    // --color-accent      (bright green)
  accentDim:   'rgba(0, 255, 157, 0.12)',    // --color-accent-dim
  danger:      '#ff4d6d',                    // --color-danger      (red)
  dangerDim:   'rgba(255, 77, 109, 0.12)',   // --color-danger-dim

  // Typography
  text:        '#c8d8e8',   // --color-text
  textMuted:   '#5a7a9a',   // --color-text-muted
  textHeading: '#e8f4ff',   // --color-text-heading

  // Extended palette (match new CSS vars added to style.css)
  lime:        '#39ff14',                   // --color-lime        (safe / stable / therapeutic)
  limeDim:     'rgba(57, 255, 20, 0.08)',   // --color-lime-dim
  amber:       '#fbbf24',                   // --color-amber       (warning / bacteria)
  amberDim:    'rgba(251, 191, 36, 0.08)',  // --color-amber-dim
  orange:      '#fb923c',                   // --color-orange      (thermal denaturing)
  orangeDim:   'rgba(251, 130, 20, 0.10)',  // --color-orange-dim
  purple:      '#a78bfa',                   // --color-purple      (virus group)
  purpleLight: '#c4b5fd',                   // --color-purple-light

  // Canvas/D3 rgba strings — canvas API cannot evaluate CSS vars; rgba must be literal.
  // Centralised here so the RGB values stay as a single source of truth.
  limeFill:        'rgba(57, 255, 20, 0.82)',    // therapeutic zone heatmap canvas fill
  primaryFill:     'rgba(0, 212, 255, 0.22)',   // approaching zone heatmap canvas fill
  primaryStroke55: 'rgba(0, 212, 255, 0.55)',   // heatmap optimal-freq cursor stroke
  primaryFill60:   'rgba(0, 212, 255, 0.60)',   // heatmap optimal-freq label fill
  amberFill:    'rgba(251, 191, 36, 0.68)',   // marginal zone heatmap canvas fill
  amberChart:   'rgba(251, 191, 36, 0.7)',    // D3 threshold reference line color
  dangerFill:   'rgba(255, 77, 109, 0.78)',   // ablative zone heatmap canvas fill
  heatFill:     'rgba(255, 140, 0, 0.72)',    // thermal zone heatmap canvas fill

  // Semantic one-offs (no CSS var; used only in script/canvas/D3 contexts)
  navWarning:    '#ffb800',   // nav status warning dot, warm amber   --color-amber-warm
  lysed:         '#882233',   // dead-cell state color                --color-lysed
  vibrating:     '#ff8c00',   // lysis-armed dark orange              --color-vibrating
  targetInterp:  '#4d79ff',   // D3 gradient start for target cell interpolation
  nucleusOrange: '#ff8c00',   // nucleus rung color for target cell canvas
  dep:           '#ff9900',   // DEP force indicator orange
  btnDark:       '#060e1a',   // dark text on primary-colored buttons
  ok:            '#4ade80',   // --color-ok           (ok / success, soft green)
  okFill10:      'rgba(74, 222, 128, 0.10)',   // D3 ok window fill (10%)
  okStroke35:    'rgba(74, 222, 128, 0.35)',   // D3 ok window stroke (35%)
  dangerLight:   '#f87171',   // --color-danger-light (soft danger readout)
  white:         '#ffffff',   // canvas axis labels, tick marks
  rayInterp1:    '#4a9eff',   // field-ray frequency gradient: mid blue (cyan→violet scale)
  rayInterp2:    '#7c6cff',   // field-ray frequency gradient: mid violet

  // D3/canvas semi-transparent whites: canvas ctx cannot evaluate CSS vars — use color-mix() in <style> blocks.
  w85: 'rgba(255,255,255,0.85)',  // strong: cursor tick labels, cursor line stroke
  w75: 'rgba(255,255,255,0.75)',  // secondary cursor labels
  w70: 'rgba(255,255,255,0.70)',  // bright canvas text
  w65: 'rgba(255,255,255,0.65)',  // canvas label text
  w55: 'rgba(255,255,255,0.55)',  // primary axis tick text
  w50: 'rgba(255,255,255,0.50)',  // general chart annotation text
  w45: 'rgba(255,255,255,0.45)',  // canvas strokes
  w40: 'rgba(255,255,255,0.40)',  // axis label overlay / canvas fill text
  w38: 'rgba(255,255,255,0.38)',  // secondary axis text (log axis)
  w35: 'rgba(255,255,255,0.35)',  // caption / dim chart text
  w30: 'rgba(255,255,255,0.30)',  // medium grid line stroke
  w28: 'rgba(255,255,255,0.28)',  // faint annotation / dim label
  w22: 'rgba(255,255,255,0.22)',  // canvas grid lines
  w20: 'rgba(255,255,255,0.20)',  // axis major grid lines
  w15: 'rgba(255,255,255,0.15)',  // axis domain / spine stroke
  w12: 'rgba(255,255,255,0.12)',  // faint reference lines
  w10: 'rgba(255,255,255,0.10)',  // near-invisible reference
  w06: 'rgba(255,255,255,0.06)',  // ghost grid lines
} as const

export type SystemColor = keyof typeof C

// ── Cell group colors (used in D3 charts and library preset dots) ─────────────
export const GROUP_COLORS = {
  reference: C.primary,
  cancer:    C.danger,
  bacteria:  C.amber,
  virus:     C.purple,
} as const

// ── Per-type cell appearance (canvas / D3 drawing code) ───────────────────────
export const CELL_COLORS = {
  healthy: {
    accent:     C.primary,
    rung:       C.lime,
    interpFrom: C.primary,   // gradient start (cellColor interpolation)
    interpTo:   C.lime,      // gradient end
  },
  target: {
    accent:     C.danger,
    rung:       C.nucleusOrange,
    interpFrom: C.targetInterp,
    interpTo:   C.danger,
  },
} as const

// ── Selectivity colors ────────────────────────────────────────────────────────
export const SELECTIVITY_COLORS = {
  strong:   C.lime,    // selectivity ≥ 1.5
  marginal: C.amber,   // selectivity ≥ 1.0
  weak:     C.danger,  // selectivity < 1.0
} as const
