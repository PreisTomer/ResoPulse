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

/** Split a frequency [kHz] into `{ value, unit }` for two-column layout. */
export function splitFreqKHz(khz: number, decimals = 2): { value: string; unit: string } {
  if (khz >= KHZ_PER_GHZ) return { value: (khz / KHZ_PER_GHZ).toFixed(decimals), unit: UNIT.GHZ }
  if (khz >= KHZ_PER_MHZ) return { value: (khz / KHZ_PER_MHZ).toFixed(decimals), unit: UNIT.MHZ }
  return { value: Math.round(khz).toString(), unit: UNIT.KHZ }
}

/** Format a field intensity [V/cm] to a human-readable string.
 *  V/cm: rounded to nearest integer (±1 V/cm is within biological variability).
 *  Values ≥ 10 kV/cm are displayed as kV/cm with 1 decimal place. */
export function formatFieldVcm(vcm: number): string {
  return vcm >= FIELD_KV_THRESHOLD
    ? `${(vcm / VCM_PER_KVCM).toFixed(1)} ${UNIT.KV_PER_CM}`
    : `${Math.round(vcm)} ${UNIT.V_PER_CM}`
}

/** Format [min, max] of `values` via `fmt`; single value when min === max. */
export function formatRange(values: number[], fmt: (v: number) => string): string {
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  return lo === hi ? fmt(lo) : `${fmt(lo)} - ${fmt(hi)}`
}
