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
export const Y_MIN_MAX     = 110
export const DR_HEADROOM   = 1.25
export const MARGIN        = { top: 18, right: 16, bottom: 48, left: 54 }

// One label per decade
export const X_TICK_VALUES = [1e4, 1e5, 1e6, 1e7, 1e8]

// Horizontal threshold lines
export const DR_REV_EP = 50   // reversible EP boundary
export const DR_LYSIS  = 85   // lysis boundary

// ── Types ───────────────────────────────────────────────────────────────────

export type CurvePoint = { hz: number; hDR: number; tDR: number }

// ── Frequency point generation ──────────────────────────────────────────────

/**
 * Returns N logarithmically-spaced points between min and max.
 * @param min  Lower bound (inclusive)
 * @param max  Upper bound (inclusive)
 * @param n    Number of points
 * @returns    Array of n values spanning [min, max] on a log scale
 */
export function logspace(min: number, max: number, n: number): number[] {
  const step = (Math.log10(max) - Math.log10(min)) / (n - 1)
  return Array.from({ length: n }, (_, i) => Math.pow(10, Math.log10(min) + i * step))
}

/** Pre-computed frequency points [Hz] spanning the chart domain */
export const F_POINTS_HZ: number[] = logspace(F_MIN_HZ, F_MAX_HZ, N_POINTS)

// ── Axis formatting ─────────────────────────────────────────────────────────

/**
 * Formats a frequency in Hz as a human-readable string with SI prefix.
 * @param hz  Frequency in Hz
 * @returns   Verbose label such as "500 MHz" or "10 kHz"
 */
export function formatHz(hz: number): string {
  if (hz >= 1e9) return `${(hz / 1e9).toFixed(0)} ${UNIT.GHZ}`
  if (hz >= 1e6) return `${(hz / 1e6).toFixed(1)} ${UNIT.MHZ}`
  if (hz >= 1e3) return `${(hz / 1e3).toFixed(0)} ${UNIT.KHZ}`
  return `${hz.toFixed(0)} ${UNIT.HZ}`
}

// ── DR computation ──────────────────────────────────────────────────────────

/**
 * Disruption ratio for one cell at one frequency.
 * Pure — caller passes all needed values; no store access.
 * @param cell              CellConfig of the cell
 * @param hz                Frequency in Hz
 * @param field             Field intensity [V/cm]
 * @param sigma_e           Effective medium conductivity [S/m]
 * @param cosTheta          cos(orientation angle)
 * @param pef               Pulse envelope factor (1.0 for CW)
 * @param isResonanceMode   True when chartMode === CHART_MODE.RESONANCE
 * @param isResonanceTarget True when targetCellCategory is BACTERIA or VIRUS
 * @returns                 Disruption ratio in [0, ∞) (multiply by 100 for percent)
 */
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

/**
 * Full DR curve for both healthy and target over F_POINTS_HZ.
 * @param healthy           Healthy cell configuration
 * @param target            Target cell configuration
 * @param field             Field intensity [V/cm]
 * @param sigma_e           Effective medium conductivity [S/m]
 * @param cosTheta          cos(orientation angle)
 * @param pefH              Pulse envelope factor for healthy cell
 * @param pefT              Pulse envelope factor for target cell
 * @param isResonanceMode   True when chartMode === CHART_MODE.RESONANCE
 * @param isResonanceTarget True when targetCellCategory is BACTERIA or VIRUS
 * @returns                 Array of CurvePoint with hz, hDR, and tDR in percent
 */
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
