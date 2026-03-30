// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { computeSchwan, computeResonantDisruption } from '@/utils/physics'
import type { CellConfig } from '@/types/cell'
import { UNIT } from '@/constants/units'

// ── Chart domain constants ──────────────────────────────────────────────────

export const F_MIN_HZ      = 10_000
export const F_MAX_HZ      = 500_000_000
export const N_POINTS      = 200
// Y axis always reaches at least 110% so both threshold lines (50% Rev-EP, 85% Lysis)
// remain inside the visible chart area regardless of how low the current DR curves are.
export const Y_MIN_MAX         = 110
export const DR_HEADROOM       = 1.25
// Zoom mode: data-fit Y axis, minimum 20% so the axis is never uselessly compressed.
export const Y_ZOOM_MIN        = 20
// When peakDR stays below this value in full-scale mode, the chart is informationally
// flat — show a contextual disclaimer instead of a silent near-zero curve.
export const DR_DISCLAIMER_PCT = 5
export const MARGIN        = { top: 18, right: 16, bottom: 48, left: 54 }

// One label per decade
export const X_TICK_VALUES = [1e4, 1e5, 1e6, 1e7, 1e8]

// Horizontal threshold lines
export const DR_REV_EP = 50   // reversible EP boundary
export const DR_LYSIS  = 85   // lysis boundary

// ── Types ───────────────────────────────────────────────────────────────────

export type CurvePoint = { hz: number; hDR: number; tDR: number }

// ── Frequency point generation ──────────────────────────────────────────────

// N logarithmically-spaced points between min and max
export function logspace(min: number, max: number, n: number): number[] {
  const step = (Math.log10(max) - Math.log10(min)) / (n - 1)
  return Array.from({ length: n }, (_, i) => Math.pow(10, Math.log10(min) + i * step))
}

export const F_POINTS_HZ: number[] = logspace(F_MIN_HZ, F_MAX_HZ, N_POINTS)

// ── Axis formatting ─────────────────────────────────────────────────────────

// Format frequency [Hz] → "500 MHz" / "10 kHz"
export function formatHz(hz: number): string {
  if (hz >= 1e9) return `${(hz / 1e9).toFixed(0)} ${UNIT.GHZ}`
  if (hz >= 1e6) return `${(hz / 1e6).toFixed(1)} ${UNIT.MHZ}`
  if (hz >= 1e3) return `${(hz / 1e3).toFixed(0)} ${UNIT.KHZ}`
  return `${hz.toFixed(0)} ${UNIT.HZ}`
}

// ── DR computation ──────────────────────────────────────────────────────────

// Disruption ratio for one cell at one frequency. Pure — no store access.
export function computeDR(
  cell: CellConfig,
  hz: number,
  field: number,
  sigma_e: number,
  cosTheta: number,
  pef: number,
  isResonanceMode: boolean,
  isResonanceTarget: boolean,
): number {
  const isAcoustic = isResonanceMode
    && isResonanceTarget
    && (cell as CellConfig & { resonantFreqGHz?: number }).resonantFreqGHz != null

  if (isAcoustic) {
    const t = cell as CellConfig & { resonantFreqGHz: number; capsidQ?: number; resonantThresholdVcm?: number }
    return computeResonantDisruption(
      t.resonantFreqGHz,
      t.capsidQ ?? 10,
      t.resonantThresholdVcm ?? cell.thresholdVoltage * 1000,
      hz,
      field,
    ) * pef
  }

  const vm = computeSchwan(cell, hz / 1000, field, sigma_e, cosTheta)
  return (vm / cell.thresholdVoltage) * pef
}

// DR curve [%] for both cells over F_POINTS_HZ
export function computeCurves(
  healthy: CellConfig,
  target: CellConfig,
  field: number,
  sigma_e: number,
  cosTheta: number,
  pefH: number,
  pefT: number,
  isResonanceMode: boolean,
  isResonanceTarget: boolean,
): CurvePoint[] {
  return F_POINTS_HZ.map((hz) => ({
    hz,
    hDR: computeDR(healthy, hz, field, sigma_e, cosTheta, pefH, isResonanceMode, isResonanceTarget) * 100,
    tDR: computeDR(target,  hz, field, sigma_e, cosTheta, pefT, isResonanceMode, isResonanceTarget) * 100,
  }))
}
