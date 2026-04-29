// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Design tokens for TS/D3/canvas; CSS mirrors in style.css (--fs-*, --op-*), SCSS in _tokens.scss. Import via `@/theme` barrel.

// Font-size scale: six UI tiers (xxs=0.65rem min). D3/canvas sizes live in utils/cellAnimation.ts.
export const FS = {
  xxs: '0.65rem',   // section titles, formula annotations, orient labels
  xs:  '0.70rem',   // secondary mono data, stat sub-labels
  sm:  '0.75rem',   // primary mono labels, key data values
  md:  '0.82rem',   // readable data / body labels
  lg:  '0.875rem',  // standard body text
  xl:  '0.90rem',   // significant labels, readout sub-text
} as const

export type FontSizeToken = keyof typeof FS

// ── Opacity scale ─────────────────────────────────────────────────────────────
export const OPACITY = {
  ghost:   0.35,   // near-invisible decorations, disabled states
  muted:   0.55,   // secondary text overlays, placeholder hints
  dim:     0.70,   // tertiary badges, background labels
  partial: 0.80,   // inactive elements, faded highlights
  strong:  0.90,   // near-opaque elements, strong overlays
} as const

export type OpacityToken = keyof typeof OPACITY

// ── Letter-spacing scale ──────────────────────────────────────────────────────
export const LETTER_SPACING = {
  tight:  '0.02em',   // compact mono readouts, tightly-set values
  normal: '0.06em',   // standard mono labels, section names
  wide:   '0.10em',   // uppercase section headers, accordion labels
  wider:  '0.12em',   // chart axis labels, decorative caps
} as const

export type LetterSpacingToken = keyof typeof LETTER_SPACING

// ── Transition scale ──────────────────────────────────────────────────────────
export const TRANSITION = {
  fast:   '0.15s ease',   // micro-interactions: thumb glow, icon swap
  normal: '0.20s ease',   // hover states, badge colour shifts
  slow:   '0.30s ease',   // panel open/close, accordion expand
} as const

export type TransitionToken = keyof typeof TRANSITION
