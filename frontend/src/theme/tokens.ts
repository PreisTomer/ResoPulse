// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// =============================================================================
// src/theme/tokens.ts
//
// Design token constants for use in TypeScript / D3 / canvas contexts.
// CSS counterparts live in src/style.css as custom properties (--fs-*, --op-*, etc.).
// SCSS counterparts live in src/styles/_tokens.scss as variables ($fs-*, $op-*, etc.).
//
// Usage in TypeScript:
//   import { FS, OPACITY, TRANSITION } from '@/theme/tokens'
//   import { FS } from '@/theme'   // via barrel
// =============================================================================

// ── Font-size scale ───────────────────────────────────────────────────────────
// Six named tiers covering all UI text; minimum is xxs (0.65rem).
// D3 / canvas text sizes are managed independently in utils/cellAnimation.ts.
export const FS = {
  xxs: "0.65rem", // section titles, formula annotations, orient labels
  xs: "0.70rem", // secondary mono data, stat sub-labels
  sm: "0.75rem", // primary mono labels, key data values
  md: "0.82rem", // readable data / body labels
  lg: "0.875rem", // standard body text
  xl: "0.90rem", // significant labels, readout sub-text
} as const;

// ── Opacity scale ─────────────────────────────────────────────────────────────
export const OPACITY = {
  ghost: 0.35, // near-invisible decorations, disabled states
  muted: 0.55, // secondary text overlays, placeholder hints
  dim: 0.7, // tertiary badges, background labels
  partial: 0.8, // inactive elements, faded highlights
  strong: 0.9, // near-opaque elements, strong overlays
} as const;

// ── Letter-spacing scale ──────────────────────────────────────────────────────
export const LETTER_SPACING = {
  tight: "0.02em", // compact mono readouts, tightly-set values
  normal: "0.06em", // standard mono labels, section names
  wide: "0.10em", // uppercase section headers, accordion labels
  wider: "0.12em", // chart axis labels, decorative caps
} as const;

// ── Transition scale ──────────────────────────────────────────────────────────
export const TRANSITION = {
  fast: "0.15s ease", // micro-interactions: thumb glow, icon swap
  normal: "0.20s ease", // hover states, badge colour shifts
  slow: "0.30s ease", // panel open/close, accordion expand
} as const;
