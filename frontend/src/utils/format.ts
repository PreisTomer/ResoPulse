// Copyright © 2026 Tomer Preis. All rights reserved.
// Unauthorized copying or distribution is prohibited.

/**
 * Shared display formatters used across FrequencySlider, CellCard, SelectivityPanel, etc.
 */

import { UNIT } from '@/constants/units'

const KHZ_PER_GHZ  = 1_000_000
const KHZ_PER_MHZ  = 1_000
const VCM_PER_KVCM = 1_000
export const FIELD_KV_THRESHOLD = 10_000 // V/cm above which kV/cm display is used

/** Format a frequency [kHz] to a human-readable string.
 *  kHz: rounded integer · MHz/GHz: fixed to `decimals` places (default 2). */
export function formatFreqKHz(khz: number, decimals = 2): string {
  if (khz >= KHZ_PER_GHZ) return `${(khz / KHZ_PER_GHZ).toFixed(decimals)} ${UNIT.GHZ}`
  if (khz >= KHZ_PER_MHZ) return `${(khz / KHZ_PER_MHZ).toFixed(decimals)} ${UNIT.MHZ}`
  return `${Math.round(khz)} ${UNIT.KHZ}`
}

/** Format a field intensity [V/cm] to a human-readable string.
 *  Values ≥ 10 kV/cm are displayed as kV/cm (1 decimal place). */
export function formatFieldVcm(vcm: number): string {
  return vcm >= FIELD_KV_THRESHOLD
    ? `${(vcm / VCM_PER_KVCM).toFixed(1)} ${UNIT.KV_PER_CM}`
    : `${vcm} ${UNIT.V_PER_CM}`
}

/**
 * Format a numeric range from an array of values using a provided formatter.
 * Returns a single formatted value when min === max, otherwise "min - max".
 * @param values - Array of raw numeric values
 * @param fmt    - Formatter function applied to each bound
 */
export function formatRange(values: number[], fmt: (v: number) => string): string {
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  return lo === hi ? fmt(lo) : `${fmt(lo)} - ${fmt(hi)}`
}
