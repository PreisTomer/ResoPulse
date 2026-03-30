// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { UNIT } from '@/constants/units'
import { LYSIS_FIELD_SENTINEL } from '@/constants/physics'

const KHZ_PER_GHZ  = 1_000_000
const KHZ_PER_MHZ  = 1_000
const VCM_PER_KVCM = 1_000
export const FIELD_KV_THRESHOLD = 10_000 // V/cm above which kV/cm display is used

// Format frequency [kHz] → human-readable string with unit suffix
export function formatFreqKHz(khz: number, decimals = 2): string {
  if (khz >= KHZ_PER_GHZ) return `${(khz / KHZ_PER_GHZ).toFixed(decimals)} ${UNIT.GHZ}`
  if (khz >= KHZ_PER_MHZ) return `${(khz / KHZ_PER_MHZ).toFixed(decimals)} ${UNIT.MHZ}`
  return `${Math.round(khz)} ${UNIT.KHZ}`
}

// Split frequency [kHz] into { value, unit } for two-column layout
export function splitFreqKHz(khz: number, decimals = 2): { value: string; unit: string } {
  if (khz >= KHZ_PER_GHZ) return { value: (khz / KHZ_PER_GHZ).toFixed(decimals), unit: UNIT.GHZ }
  if (khz >= KHZ_PER_MHZ) return { value: (khz / KHZ_PER_MHZ).toFixed(decimals), unit: UNIT.MHZ }
  return { value: Math.round(khz).toString(), unit: UNIT.KHZ }
}

// Format field intensity [V/cm]; ≥10 kV/cm displays as kV/cm
export function formatFieldVcm(vcm: number): string {
  return vcm >= FIELD_KV_THRESHOLD
    ? `${(vcm / VCM_PER_KVCM).toFixed(1)} ${UNIT.KV_PER_CM}`
    : `${Math.round(vcm)} ${UNIT.V_PER_CM}`
}

// Format lysis field; returns 'N/A' for sentinel value (θ→90°)
export function formatLysisFieldVcm(vcm: number): string {
  if (vcm >= LYSIS_FIELD_SENTINEL) return 'N/A'
  return formatFieldVcm(vcm)
}

// Format [min, max] range; returns single value when min === max
export function formatRange(values: number[], fmt: (v: number) => string): string {
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  return lo === hi ? fmt(lo) : `${fmt(lo)} - ${fmt(hi)}`
}

// Format lysis delay [ms]: "500ms" or "2.5s"
export function formatLysisTime(ms: number): string {
  return ms < 1000 ? `${ms}${UNIT.MS}` : `${(ms / 1000).toFixed(1)}${UNIT.S}`
}

// Format fraction (0–1) as a percentage string: 0.735 → "74%"
export function formatPct(value: number, decimals = 0): string {
  return `${(value * 100).toFixed(decimals)}%`
}
