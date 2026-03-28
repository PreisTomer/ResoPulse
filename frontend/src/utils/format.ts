// Copyright © 2026 Tomer Preis. All rights reserved.
// Unauthorized copying or distribution is prohibited.

/**
 * Shared display formatters used across FrequencySlider, CellCard, SelectivityPanel, etc.
 */

import { UNIT } from '@/constants/units'
import { LYSIS_FIELD_SENTINEL } from '@/constants/physics'

const KHZ_PER_GHZ  = 1_000_000
const KHZ_PER_MHZ  = 1_000
const VCM_PER_KVCM = 1_000
export const FIELD_KV_THRESHOLD = 10_000 // V/cm above which kV/cm display is used

/**
 * Format a frequency to a human-readable string.
 * kHz: rounded integer. MHz/GHz: fixed to `decimals` places (default 2).
 * @param khz - frequency in kHz
 * @param decimals - decimal places for MHz/GHz display
 * @returns formatted string with unit suffix
 */
export function formatFreqKHz(khz: number, decimals = 2): string {
  if (khz >= KHZ_PER_GHZ) return `${(khz / KHZ_PER_GHZ).toFixed(decimals)} ${UNIT.GHZ}`
  if (khz >= KHZ_PER_MHZ) return `${(khz / KHZ_PER_MHZ).toFixed(decimals)} ${UNIT.MHZ}`
  return `${Math.round(khz)} ${UNIT.KHZ}`
}

/**
 * Split a frequency into `{ value, unit }` for two-column layout.
 * @param khz - frequency in kHz
 * @param decimals - decimal places for MHz/GHz display
 * @returns `{ value, unit }` pair
 */
export function splitFreqKHz(khz: number, decimals = 2): { value: string; unit: string } {
  if (khz >= KHZ_PER_GHZ) return { value: (khz / KHZ_PER_GHZ).toFixed(decimals), unit: UNIT.GHZ }
  if (khz >= KHZ_PER_MHZ) return { value: (khz / KHZ_PER_MHZ).toFixed(decimals), unit: UNIT.MHZ }
  return { value: Math.round(khz).toString(), unit: UNIT.KHZ }
}

/**
 * Format a field intensity to a human-readable string.
 * V/cm: rounded integer. Values ≥ 10 kV/cm display as kV/cm (1 decimal).
 * @param vcm - field intensity in V/cm
 * @returns formatted string with unit suffix
 */
export function formatFieldVcm(vcm: number): string {
  return vcm >= FIELD_KV_THRESHOLD
    ? `${(vcm / VCM_PER_KVCM).toFixed(1)} ${UNIT.KV_PER_CM}`
    : `${Math.round(vcm)} ${UNIT.V_PER_CM}`
}

/**
 * Format a lysis field, returning 'N/A' when the sentinel value (θ → 90°) is detected.
 * @param vcm - lysis field in V/cm
 * @returns formatted string or 'N/A'
 */
export function formatLysisFieldVcm(vcm: number): string {
  if (vcm >= LYSIS_FIELD_SENTINEL) return 'N/A'
  return formatFieldVcm(vcm)
}

/**
 * Format the [min, max] range of `values` using `fmt`; returns a single value when min === max.
 * @param values - array of numeric values
 * @param fmt - formatter applied to each bound
 * @returns single formatted value or "lo - hi" range string
 */
export function formatRange(values: number[], fmt: (v: number) => string): string {
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  return lo === hi ? fmt(lo) : `${fmt(lo)} - ${fmt(hi)}`
}
