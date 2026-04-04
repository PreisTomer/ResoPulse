// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// Biophysics utilities - Schwan single-shell model, SAR, nsEP, acoustic resonance, EM skin depth
import { SCHWAN_SPHERE_FACTOR, WF_CW, EPSILON_R_CYTOPLASM, SIGMA_MEMBRANE_SI, TWO_PI, POP_LYSIS_GAUSS_N, POP_LYSIS_GAUSS_Z_MAX, BODY_TEMP_C, TEMP_EP_COEFF, TEMP_EP_CLAMP_MIN, EPSILON_0 } from '@/constants/physics'

import type { CellConfig } from '@/types/cell'

// numerator/denominator capped at cap; returns 0 or cap when denominator < epsilon.
export function safeRatio(numerator: number, denominator: number, cap: number, epsilon = 1e-9): number {
  if (denominator < epsilon) return numerator > 0 ? cap : 0
  return Math.min(cap, numerator / denominator)
}

// ── Unit conversions ──────────────────────────────────────────────────────────
const UM_TO_M  = 1e-6   // µm → m
const NM_TO_M  = 1e-9   // nm → m
const KHZ_TO_HZ = 1e3   // kHz → Hz
const VCM_TO_VM = 100   // V/cm → V/m
const NS_TO_S   = 1e-9  // ns → s

// Cm = ε_r·ε₀/d  [F/m²]
export function membraneCm(cell: CellConfig): number {
  return (cell.dielectricConstant * EPSILON_0) / (cell.membraneThickness * NM_TO_M)
}

// τ = R·Cm·(2σ_out+σ_in)/(2σ_out·σ_in) [s]
function tauRC(R: number, Cm: number, sigmaOut: number, sigmaIn: number): number {
  return R * Cm * (2 * sigmaOut + sigmaIn) / (2 * sigmaOut * sigmaIn)
}

// τ = R·Cm·(2σ_e+σ_i)/(2σ_e·σ_i) [s] - Kotnik & Miklavcic 2000
export function computeTau(cell: CellConfig, sigma_e: number): number {
  return tauRC(cell.radius * UM_TO_M, membraneCm(cell), sigma_e, cell.conductivity)
}

// Vm = 1.5·E·R·cosθ / √(1+(ωτ)²) [V] — peak CW; pulse step response applied downstream.
export function computeSchwan(
  cell: CellConfig,
  freqKHz: number,
  fieldVcm: number,
  sigma_e: number,
  cosTheta = 1.0,
): number {
  const omega = TWO_PI * freqKHz * KHZ_TO_HZ
  const tau   = computeTau(cell, sigma_e)
  return (SCHWAN_SPHERE_FACTOR * fieldVcm * VCM_TO_VM * cell.radius * UM_TO_M * cosTheta) /
    Math.sqrt(1 + (omega * tau) ** 2)
}

// SAR = σ_i·α²·E²·wf/ρ [W/kg], α = 3σ_e/(2σ_e+σ_i). wf: 0.5=CW, 1.0=pulsed. Schwan 1957.
export function computeSAR(
  cell: CellConfig,
  fieldVcm: number,
  sigma_e: number,
  waveformFactor = WF_CW,
): number {
  if (cell.conductivity <= 0 || cell.density <= 0) return 0
  const E_si  = fieldVcm * VCM_TO_VM
  const alpha = (3 * sigma_e) / (2 * sigma_e + cell.conductivity)
  return (cell.conductivity * alpha ** 2 * E_si ** 2 * waveformFactor) / cell.density
}

// ── Dielectrophoresis - Clausius-Mossotti factor (single-shell model) ────────

// Inline complex arithmetic helpers  [real, imaginary]
type Cpx = [number, number]
function cadd(a: Cpx, b: Cpx): Cpx { return [a[0]+b[0], a[1]+b[1]] }
function csub(a: Cpx, b: Cpx): Cpx { return [a[0]-b[0], a[1]-b[1]] }
function cdiv(a: Cpx, b: Cpx): Cpx {
  const d = b[0]**2 + b[1]**2
  return [(a[0]*b[0] + a[1]*b[1])/d, (a[1]*b[0] - a[0]*b[1])/d]
}
function cscale(a: Cpx, s: number): Cpx { return [a[0]*s, a[1]*s] }
function cmul(a: Cpx, b: Cpx): Cpx {
  return [a[0]*b[0] - a[1]*b[1], a[0]*b[1] + a[1]*b[0]]
}

// Re[K(ω)] — Clausius-Mossotti, single-shell. K=(ε*_eff−ε*_m)/(ε*_eff+2ε*_m). Gascoyne 2002.
export function computeDepCmReal(
  cell: CellConfig,
  freqKHz: number,
  sigma_e: number,
  epsilon_r_medium: number,
): number {
  const omega = TWO_PI * freqKHz * KHZ_TO_HZ
  // DC limit: Re[K] = (σ_i − σ_e) / (σ_i + 2σ_e)
  if (omega < 1) return (cell.conductivity - sigma_e) / (cell.conductivity + 2 * sigma_e)

  // Complex permittivities: ε*(ω) = ε_r·ε₀ − j·σ/ω
  const epsCyto: Cpx = [EPSILON_R_CYTOPLASM  * EPSILON_0, -cell.conductivity / omega]
  const sigma_mem = cell.membraneConductivity ?? SIGMA_MEMBRANE_SI
  const epsMem:  Cpx = [cell.dielectricConstant * EPSILON_0, -sigma_mem / omega]
  const epsMed:  Cpx = [epsilon_r_medium * EPSILON_0, -sigma_e / omega]

  // Single-shell geometry: γ = (r_inner/R)³  [thin-shell: d ≪ R]
  const R     = cell.radius * UM_TO_M
  const d     = cell.membraneThickness * NM_TO_M
  const gamma = Math.max(0, ((R - d) / R) ** 3)

  // ε*_eff = ε*_mem × numerator / denominator  (Gascoyne & Vykoukal 2002)
  const sum  = cadd(epsCyto, cscale(epsMem, 2))   // ε*_c + 2ε*_mem
  const diff = csub(epsCyto, epsMem)               // ε*_c − ε*_mem
  const num  = cadd(cscale(sum, gamma), cscale(diff, 2))
  const den  = csub(cscale(sum, gamma), diff)
  const epsEff = cmul(epsMem, cdiv(num, den))

  // K = (ε*_eff − ε*_m) / (ε*_eff + 2ε*_m)
  const K = cdiv(csub(epsEff, epsMed), cadd(epsEff, cscale(epsMed, 2)))
  return Math.max(-0.5, Math.min(0.5, K[0]))
}

// First DEP crossover [kHz] — log-space bisection 1 kHz to 10 GHz; 0 if none found.
export function computeDepCrossoverKHz(
  cell: CellConfig,
  sigma_e: number,
  epsilon_r_medium: number,
): number {
  const fLo = 1, fHi = 10_000_000  // kHz: 1 kHz to 10 GHz
  const kLo = computeDepCmReal(cell, fLo, sigma_e, epsilon_r_medium)
  const kHi = computeDepCmReal(cell, fHi, sigma_e, epsilon_r_medium)
  if (kLo * kHi > 0) return 0  // no zero-crossing in range
  let lo = fLo, hi = fHi
  for (let i = 0; i < 52; i++) {
    const mid  = Math.sqrt(lo * hi)  // geometric midpoint (log-scale bisection)
    const kMid = computeDepCmReal(cell, mid, sigma_e, epsilon_r_medium)
    if (Math.abs(kMid) < 1e-12) return mid
    if (kLo * kMid < 0) { hi = mid } else { lo = mid }
  }
  return Math.sqrt(lo * hi)
}

// Second DEP crossover [kHz] — Re[K] sign change above f_cross1; 0 if none. Pethig 2010.
export function computeDepSecondCrossoverKHz(
  cell: CellConfig,
  sigma_e: number,
  epsilon_r_medium: number,
): number {
  const fFirst = computeDepCrossoverKHz(cell, sigma_e, epsilon_r_medium)
  if (fFirst <= 0) return 0  // no first crossover, second is impossible
  const fLo = fFirst * 1.01
  const fHi = 10_000_000  // kHz: to 10 GHz
  if (fLo >= fHi) return 0
  const kLo = computeDepCmReal(cell, fLo, sigma_e, epsilon_r_medium)
  const kHi = computeDepCmReal(cell, fHi, sigma_e, epsilon_r_medium)
  if (kLo * kHi > 0) return 0  // same sign above first crossover, no second crossing
  let lo = fLo, hi = fHi
  for (let i = 0; i < 52; i++) {
    const mid  = Math.sqrt(lo * hi)
    const kMid = computeDepCmReal(cell, mid, sigma_e, epsilon_r_medium)
    if (Math.abs(kMid) < 1e-12) return mid
    if (kLo * kMid < 0) { hi = mid } else { lo = mid }
  }
  return Math.sqrt(lo * hi)
}

// fc = 1/(2πτ) [kHz]
export function computeFc(cell: CellConfig, sigma_e: number): number {
  return 1 / (TWO_PI * computeTau(cell, sigma_e) * 1e3)
}

// ── Double-shell nuclear envelope (Kotnik & Miklavcic 2006) ──────────────────

// τ_ne = R_nuc·Cm_ne·(2σ_i+σ_np)/(2σ_i·σ_np) [s] — cytoplasm is outer medium. Kotnik 2006.
export function computeNuclearTau(cell: CellConfig, _sigma_e: number): number {
  if (!cell.nuclearRadius) return 0
  const Cm_ne    = ((cell.nuclearMembraneEps ?? 10) * EPSILON_0) /
                   ((cell.nuclearMembraneThickness ?? 15) * NM_TO_M)
  const sigma_np = cell.nucleoplasmConductivity ?? 0.9
  return tauRC(cell.nuclearRadius * UM_TO_M, Cm_ne, cell.conductivity, sigma_np)
}

// Vm_nuc = 1.5·E·R_nuc·cosθ·(ωτ_out) / √((1+(ωτ_out)²)·(1+(ωτ_ne)²)) [V] — bandpass.
export function computeNuclearVm(
  cell: CellConfig,
  freqKHz: number,
  fieldVcm: number,
  sigma_e: number,
  cosTheta = 1.0,
): number {
  if (!cell.nuclearRadius) return 0
  const tau_ne = computeNuclearTau(cell, sigma_e)
  if (tau_ne === 0) return 0
  const omega  = TWO_PI * freqKHz * KHZ_TO_HZ
  const wt_out = omega * computeTau(cell, sigma_e)
  const wt_ne  = omega * tau_ne
  return (1.5 * fieldVcm * VCM_TO_VM * cell.nuclearRadius * UM_TO_M * cosTheta * wt_out) /
    Math.sqrt((1 + wt_out ** 2) * (1 + wt_ne ** 2))
}

// ── nsEP pulse step response ─────────────────────────────────────────────────

// Membrane charging fraction per pulse: 1−exp(−t_p/τ). Not applied in resonance mode.
export function computePulseStepResponse(tau_s: number, pulseWidthNs: number): number {
  return 1 - Math.exp(-(pulseWidthNs * NS_TO_S) / tau_s)
}

// ── Acoustic resonance (virus/bacteria) ─────────────────────────────────────

// Lorentzian: 1/√(1+(Q·(f/f₀−f₀/f))²), =1 at f=f_res. Tsen 2007; Dykeman 2010.
export function computeResonantLineshape(
  resonantFreqGHz: number,
  Q: number,
  freqHz: number,
): number {
  if (resonantFreqGHz <= 0) return 0
  const f = freqHz / 1e9
  const x = f / resonantFreqGHz - resonantFreqGHz / f
  return 1 / Math.sqrt(1 + (Q * x) ** 2)
}

// ── EM skin depth ────────────────────────────────────────────────────────────

// EM skin depth [mm]: δ=1/α, α=ω√(με/2)·√(√(1+(σ/ωε)²)−1). Gabriel 1996.
export function computeSkinDepthMm(freqKHz: number, sigma_e: number, epsilon_r = 80): number {
  const MU_0 = 4 * Math.PI * 1e-7  // H/m
  const f    = freqKHz * KHZ_TO_HZ
  if (f <= 0 || sigma_e <= 0) return Infinity
  const omega       = TWO_PI * f
  const epsilon     = epsilon_r * EPSILON_0
  // Exact lossy-dielectric attenuation constant (Cheng 1989; Jackson 1999)
  const lossTangent = sigma_e / (omega * epsilon)
  const alpha       = omega * Math.sqrt(MU_0 * epsilon / 2) *
    Math.sqrt(Math.sqrt(1 + lossTangent ** 2) - 1)
  if (alpha <= 0) return Infinity
  return (1 / alpha) * 1000  // m → mm
}

// Resonant disruption ratio: (E/E_thr)·L(f,f_res,Q). >=1.0 → threshold exceeded.
export function computeResonantDisruption(
  resonantFreqGHz: number,
  Q: number,
  thresholdVcm: number,
  freqHz: number,
  fieldVcm: number,
): number {
  if (thresholdVcm <= 0) return 0
  return (fieldVcm / thresholdVcm) * computeResonantLineshape(resonantFreqGHz, Q, freqHz)
}

// ── Electroporation threshold temperature correction ──────────────────────────

// Vth_eff = Vth × clamp(1 − 0.003×(T−37), 0.70, ∞). Weaver 1996; DeBruin 1999.
export function tempCorrectedVth(nominalVth: number, tempC: number): number {
  const correction = Math.max(TEMP_EP_CLAMP_MIN, 1 - TEMP_EP_COEFF * Math.max(0, tempC - BODY_TEMP_C))
  return nominalVth * correction
}

// ── Population lysis fraction (log-normal size distribution) ─────────────────

// Lysis fraction over log-normal size distribution (cv). Midpoint rectangle rule, N z-points.
// Midpoint rule halves the quadrature error vs left-endpoint at the same N. See Abramowitz §25.4.
export function computePopulationLysisFraction(dr: number, cv: number): number {
  if (dr <= 0) return 0
  if (cv <= 0) return Math.max(0, Math.min(1, 1 - 1 / dr))
  const sigmaLn = Math.sqrt(Math.log(1 + cv * cv))
  const muLn    = -0.5 * sigmaLn * sigmaLn  // ensures E[X] = 1 (mean-normalised)
  const zMin    = -POP_LYSIS_GAUSS_Z_MAX
  const zMax    =  POP_LYSIS_GAUSS_Z_MAX
  const dz      = (zMax - zMin) / POP_LYSIS_GAUSS_N  // N intervals, midpoint per interval
  let sum = 0
  for (let i = 0; i < POP_LYSIS_GAUSS_N; i++) {
    const z      = zMin + (i + 0.5) * dz               // midpoint of i-th interval
    const x      = Math.exp(sigmaLn * z + muLn)
    const pLysis = Math.max(0, 1 - 1 / (dr * x))  // cosθ orientation model at this radius
    const gauss  = Math.exp(-0.5 * z * z)
    sum += pLysis * gauss * dz
  }
  return Math.max(0, Math.min(1, sum / Math.sqrt(TWO_PI)))
}

// Sigmoid EP probability [0-100%]: P=1/(1+exp(−(dr−center)/slope)).
export function computeLysisProbability(dr: number, center: number, slope: number): number {
  return Math.round(100 / (1 + Math.exp(-(dr - center) / slope)))
}
