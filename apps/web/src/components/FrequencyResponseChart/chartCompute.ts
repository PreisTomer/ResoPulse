// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

import { computeSchwan, computeNuclearVm, computeDepCmReal, computeSigmaUncertaintyFactor, jacobianSchwanVm, propagateScalarVariance, type CalibrationCovariance } from '@/utils/physics'

import { logspace } from '@/utils/math'

import { F_MIN_HZ, F_MAX_HZ, N_POINTS, F_POINTS_HZ } from '@/constants/chartDomain'
import { UNIT } from '@/constants/units'

import type { CellConfig } from '@/types/cell'

// ── Chart geometry constants ──────────────────────────────────────────────────

export const F_CURSOR_MAX_KHZ = 10_000    // 10 MHz, covers bacteria fc range
export const MARGIN           = { top: 22, right: 130, bottom: 52, left: 54 }

export { logspace, F_MIN_HZ, F_MAX_HZ, N_POINTS, F_POINTS_HZ }

// ── Frequency label formatters ────────────────────────────────────────────────

// Short tick-axis label: "500M", "10k"
export function formatHz(hz: number): string {
  if (hz >= 1e6) return `${hz / 1e6}M`
  return `${hz / 1e3}k`
}

// Verbose tooltip frequency label: "12.345 MHz", "750.0 kHz"
export function formatTooltipFreq(hz: number): string {
  if (hz >= 1e9) return `${(hz / 1e9).toFixed(3)} ${UNIT.GHZ}`
  if (hz >= 1e6) return `${(hz / 1e6).toFixed(3)} ${UNIT.MHZ}`
  return `${(hz / 1e3).toFixed(1)} ${UNIT.KHZ}`
}

// σ_i uncertainty [%] by category — wraps the canonical physics factor × 100.
export function sigmaUncPct(radius: number): number {
  return computeSigmaUncertaintyFactor(radius) * 100
}

// ── Curve computers ───────────────────────────────────────────────────────────

// Vm [mV] Schwan curve for one cell over F_POINTS_HZ
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

// Nuclear Vm [mV] curve (Kotnik & Miklavcic 2006 double-shell); zero for anucleate/prokaryotes
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

// DEP Re[K(f)] curve [−0.5, +0.5]; Schwan mode only (kHz–500 MHz)
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

// Vm_T/Vm_H selectivity ratio curve; cosθ cancels so not required
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

// Frequency [Hz] maximising Vm_T/Vm_H; 300-point log scan
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

// 68% Vm uncertainty band [mV]. Two paths:
//   - With a calibration covariance (post-fit Σ on the σ_i_multiplier scale): use first-order propagation σ_Vm² = (∂Vm/∂σ_i_mult)²·cov_11. Vm doesn't depend on V_th so cov_22 / cov_12 contribute nothing.
//   - Without a fit: fall back to the literature radius-based σ_i prior — same propagation with cov_11 = (computeSigmaUncertaintyFactor(R))².
export function computeUncBand(
  cell: CellConfig,
  field: number,
  sigma_e: number,
  cosTheta: number,
  cov: CalibrationCovariance | null,
): { hz: number; vmLow: number; vmHigh: number }[] {
  const effectiveCov: CalibrationCovariance = cov && cov.cov11 > 0
    ? cov
    : { cov11: computeSigmaUncertaintyFactor(cell.radius) ** 2, cov12: 0, cov22: 0 }
  return F_POINTS_HZ.map((hz) => {
    const khz   = hz / 1000
    const vm    = computeSchwan(cell, khz, field, sigma_e, cosTheta) * 1000
    const jac   = jacobianSchwanVm(cell, khz, field, sigma_e, cosTheta)
    const jacMv = { p1: jac.p1 * 1000, p2: jac.p2 * 1000 }
    const sigma = Math.sqrt(propagateScalarVariance(jacMv, effectiveCov))
    return { hz, vmLow: vm - sigma, vmHigh: vm + sigma }
  })
}

// ── Tooltip data shape ────────────────────────────────────────────────────────

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
  depHealthyK?: number  // Re[K_H] CM factor at cursor frequency (Schwan mode only)
  depTargetK?: number   // Re[K_T] CM factor at cursor frequency (Schwan mode only)
}
