// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import type { CellConfig } from '@/types/cell'
import { computeSchwan, computeNuclearVm, computeDepCmReal } from '@/utils/physics'
import { UNIT } from '@/constants/units'

// ── Chart geometry constants ──────────────────────────────────────────────────

export const F_MIN_HZ         = 10_000
export const F_MAX_HZ         = 500_000_000
export const F_CURSOR_MAX_KHZ = 10_000    // 10 MHz, covers bacteria fc range
export const N_POINTS         = 200
export const MARGIN            = { top: 22, right: 130, bottom: 52, left: 54 }

// ── Frequency grid ────────────────────────────────────────────────────────────

/**
 * N logarithmically-spaced points between min and max.
 * @param min - lower bound (same units as max)
 * @param max - upper bound
 * @param n   - number of points
 * @returns array of n values evenly spaced in log10
 */
export function logspace(min: number, max: number, n: number): number[] {
  const step = (Math.log10(max) - Math.log10(min)) / (n - 1)
  return Array.from({ length: n }, (_, i) => Math.pow(10, Math.log10(min) + i * step))
}

/** Pre-computed frequency points [Hz] used for all Schwan-mode curves. */
export const F_POINTS_HZ: number[] = logspace(F_MIN_HZ, F_MAX_HZ, N_POINTS)

// ── Frequency label formatters ────────────────────────────────────────────────

/**
 * Short tick-axis label: "500M", "10k".
 * @param hz - frequency in Hz
 * @returns compact string without unit space
 */
export function formatHz(hz: number): string {
  if (hz >= 1e6) return `${hz / 1e6}M`
  return `${hz / 1e3}k`
}

/**
 * Verbose tooltip frequency label: "12.345 MHz", "750.0 kHz".
 * @param hz - frequency in Hz
 * @returns human-readable string with SI unit suffix
 */
export function formatTooltipFreq(hz: number): string {
  if (hz >= 1e9) return `${(hz / 1e9).toFixed(3)} ${UNIT.GHZ}`
  if (hz >= 1e6) return `${(hz / 1e6).toFixed(3)} ${UNIT.MHZ}`
  return `${(hz / 1e3).toFixed(1)} ${UNIT.KHZ}`
}

// ── Uncertainty ───────────────────────────────────────────────────────────────

/**
 * σ_i uncertainty percentage by cell category.
 * Virus (R < 0.1 µm): 45% — lipid bilayer σ_i highly variable.
 * Bacteria (R < 2 µm): 35% — complex wall composition.
 * Mammalian: 20% — well-characterised reference ranges.
 * @param radius - cell radius in µm
 * @returns uncertainty percentage (0–100)
 */
export function sigmaUncPct(radius: number): number {
  if (radius < 0.1) return 45
  if (radius < 2.0) return 35
  return 20
}

// ── Curve computers ───────────────────────────────────────────────────────────

/**
 * Vm [mV] Schwan curve for one cell over F_POINTS_HZ.
 * @param cell     - cell biophysical configuration
 * @param field    - applied field [V/cm]
 * @param sigma_e  - effective external conductivity [S/m]
 * @param cosTheta - field-axis orientation factor (|cos θ|), default 1.0
 * @returns array of { hz, vm } pairs (vm in mV)
 */
export function computeVmCurve(
  cell: CellConfig,
  field: number,
  sigma_e: number,
  cosTheta = 1.0,
): { hz: number; vm: number }[] {
  return F_POINTS_HZ.map((hz) => ({
    hz,
    vm: computeSchwan(cell, hz / 1000, field, sigma_e, cosTheta) * 1000,
  }))
}

/**
 * Nuclear Vm [mV] curve (Kotnik & Miklavcic 2006 double-shell) over F_POINTS_HZ.
 * Returns zero for cells without a nuclearRadius (anucleate / prokaryotes).
 * @param cell     - cell biophysical configuration
 * @param field    - applied field [V/cm]
 * @param sigma_e  - effective external conductivity [S/m]
 * @param cosTheta - field-axis orientation factor, default 1.0
 * @returns array of { hz, vm } pairs (vm in mV)
 */
export function computeNuclearVmCurve(
  cell: CellConfig,
  field: number,
  sigma_e: number,
  cosTheta = 1.0,
): { hz: number; vm: number }[] {
  return F_POINTS_HZ.map((hz) => ({
    hz,
    vm: computeNuclearVm(cell, hz / 1000, field, sigma_e, cosTheta) * 1000,
  }))
}

/**
 * DEP Clausius-Mossotti Re[K(f)] curve over F_POINTS_HZ.
 * Valid for Schwan mode (kHz–500 MHz). Not drawn in resonance mode.
 * @param cell    - cell biophysical configuration
 * @param sigma_e - effective external conductivity [S/m]
 * @param eps_r   - relative permittivity of the medium
 * @returns array of { hz, k } pairs (k in [-0.5, 0.5])
 */
export function computeDepCurve(
  cell: CellConfig,
  sigma_e: number,
  eps_r: number,
): { hz: number; k: number }[] {
  return F_POINTS_HZ.map((hz) => ({
    hz,
    k: computeDepCmReal(cell, hz / 1000, sigma_e, eps_r),
  }))
}

/**
 * Vm selectivity ratio Vm_T/Vm_H curve over F_POINTS_HZ.
 * cos θ cancels in the ratio so it is not required as a parameter.
 * @param healthy  - healthy cell configuration
 * @param target   - target cell configuration
 * @param field    - applied field [V/cm]
 * @param sigma_e  - effective external conductivity [S/m]
 * @returns array of { hz, ratio } pairs
 */
export function computeSelCurve(
  healthy: CellConfig,
  target: CellConfig,
  field: number,
  sigma_e: number,
): { hz: number; ratio: number }[] {
  return F_POINTS_HZ.map((hz) => {
    const vmH = computeSchwan(healthy, hz / 1000, field, sigma_e)
    const vmT = computeSchwan(target,  hz / 1000, field, sigma_e)
    return { hz, ratio: vmH < 1e-12 ? 0 : vmT / vmH }
  })
}

/**
 * Optimal frequency [Hz] that maximises Vm_T/Vm_H selectivity ratio.
 * Uses a 300-point logarithmic scan over [F_MIN_HZ, F_MAX_HZ].
 * @param healthy  - healthy cell configuration
 * @param target   - target cell configuration
 * @param field    - applied field [V/cm]
 * @param sigma_e  - effective external conductivity [S/m]
 * @returns frequency in Hz at which Vm_T/Vm_H is maximised
 */
export function computeOptimalFreqHz(
  healthy: CellConfig,
  target: CellConfig,
  field: number,
  sigma_e: number,
): number {
  let maxSel = -Infinity
  let optHz  = F_MIN_HZ
  const logMin = Math.log10(F_MIN_HZ)
  const logMax  = Math.log10(F_MAX_HZ)
  for (let i = 0; i < 300; i++) {
    const hz  = Math.pow(10, logMin + (logMax - logMin) * i / 299)
    const khz = hz / 1000
    const hVm = computeSchwan(healthy, khz, field, sigma_e)
    const tVm = computeSchwan(target,  khz, field, sigma_e)
    const sel = hVm > 0 ? tVm / hVm : 0
    if (sel > maxSel) { maxSel = sel; optHz = hz }
  }
  return optHz
}

/**
 * σ_i uncertainty band for one cell [mV] over F_POINTS_HZ.
 * Varies σ_i by ±pct% to produce vmLow and vmHigh bounds.
 * @param cell     - cell biophysical configuration
 * @param field    - applied field [V/cm]
 * @param sigma_e  - effective external conductivity [S/m]
 * @param cosTheta - field-axis orientation factor, default 1.0
 * @param pct      - fractional uncertainty percentage (0–100)
 * @returns array of { hz, vmLow, vmHigh } triples (voltages in mV)
 */
export function computeUncBand(
  cell: CellConfig,
  field: number,
  sigma_e: number,
  cosTheta: number,
  pct: number,
): { hz: number; vmLow: number; vmHigh: number }[] {
  const sigma_i = cell.conductivity
  return F_POINTS_HZ.map((hz) => {
    const khz   = hz / 1000
    const vmLow = computeSchwan(
      { ...cell, conductivity: sigma_i * (1 - pct / 100) },
      khz, field, sigma_e, cosTheta,
    ) * 1000
    const vmHigh = computeSchwan(
      { ...cell, conductivity: sigma_i * (1 + pct / 100) },
      khz, field, sigma_e, cosTheta,
    ) * 1000
    return { hz, vmLow, vmHigh }
  })
}

// ── Tooltip data shape ────────────────────────────────────────────────────────

/** All data needed to render the hover tooltip overlay. */
export interface TooltipData {
  x: number
  freqHz: number
  mode: 'schwan' | 'resonance'
  healthyVm: number
  targetVm: number
  targetDR: number
  healthyDRPct: number
  targetDRPct: number
  selRatio: number
  inWindow: boolean
  flipLeft: boolean
}
