// Biophysics utilities — Schwan single-shell model, SAR, nsEP, acoustic resonance, EM skin depth
import type { CellConfig } from '@/types/cell'

export const EPSILON_0 = 8.854187817e-12 // F/m

/** Cm = ε_r·ε₀/d  [F/m²] */
export function membraneCm(cell: CellConfig): number {
  return (cell.dielectricConstant * EPSILON_0) / (cell.membraneThickness * 1e-9)
}

/** τ = R·Cm·(2σ_e+σ_i)/(2σ_e·σ_i)  [s]  — Kotnik & Miklavcic 2000 */
export function computeTau(cell: CellConfig, sigma_e: number): number {
  const R  = cell.radius * 1e-6
  const Cm = membraneCm(cell)
  return (R * Cm) * (2 * sigma_e + cell.conductivity) / (2 * sigma_e * cell.conductivity)
}

/** Vm = 1.5·E·R·cosθ / √(1+(ωτ)²)  [V]
 *  cosTheta = |cos θ| field-cell axis alignment; cancels in Vm_T/Vm_H ratio.
 *  Pulsed mode uses E_peak directly (H-FIRE convention) — Vm is a lower-bound estimate. */
export function computeSchwan(
  cell: CellConfig,
  freqKHz: number,
  fieldVcm: number,
  sigma_e: number,
  cosTheta = 1.0,
): number {
  const E     = fieldVcm * 100
  const R     = cell.radius * 1e-6
  const tau   = computeTau(cell, sigma_e)
  const omega = 2 * Math.PI * freqKHz * 1e3
  return (1.5 * E * R * cosTheta) / Math.sqrt(1 + (omega * tau) ** 2)
}

/** SAR = σ_i·α²·E²·wf/ρ  [W/kg],  α = 3σ_e/(2σ_e+σ_i)  (internal field factor, DC limit)
 *  waveformFactor: 0.5 = CW sinusoidal, 1.0 = pulsed square wave.
 *  Uses DC-limit α — upper-bound estimate at f < fc.  Schwan 1957; Foster & Schwan 1989. */
export function computeSAR(
  cell: CellConfig,
  fieldVcm: number,
  sigma_e: number,
  waveformFactor = 0.5,
): number {
  const E     = fieldVcm * 100
  const alpha = (3 * sigma_e) / (2 * sigma_e + cell.conductivity)
  return (cell.conductivity * alpha * alpha * E * E * waveformFactor) / cell.density
}

/** fc = 1/(2πτ)  [kHz] */
export function computeFc(cell: CellConfig, sigma_e: number): number {
  return 1 / (2 * Math.PI * computeTau(cell, sigma_e) * 1e3)
}

// ── Double-shell nuclear envelope (Kotnik & Miklavcic 2006) ──────────────────

/** τ_ne = R_nuc·Cm_ne·(2σ_i+σ_np)/(2σ_i·σ_np)  [s]  — cytoplasm is the outer medium here */
export function computeNuclearTau(cell: CellConfig, _sigma_e: number): number {
  if (!cell.nuclearRadius) return 0
  const R_nuc    = cell.nuclearRadius * 1e-6
  const d_ne     = (cell.nuclearMembraneThickness ?? 15) * 1e-9
  const eps_ne   = cell.nuclearMembraneEps ?? 10
  const sigma_i  = cell.conductivity
  const sigma_np = cell.nucleoplasmConductivity ?? 0.9
  const Cm_ne    = (eps_ne * EPSILON_0) / d_ne
  return (R_nuc * Cm_ne) * (2 * sigma_i + sigma_np) / (2 * sigma_i * sigma_np)
}

/** Vm_nuc = 1.5·E·R_nuc·cosθ·(ωτ_out) / √((1+(ωτ_out)²)·(1+(ωτ_ne)²))  [V]
 *  Bandpass: zero at DC and HF, peak at f = 1/(2π√(τ_out·τ_ne)). */
export function computeNuclearVm(
  cell: CellConfig,
  freqKHz: number,
  fieldVcm: number,
  sigma_e: number,
  cosTheta = 1.0,
): number {
  if (!cell.nuclearRadius) return 0
  const E       = fieldVcm * 100
  const R_nuc   = cell.nuclearRadius * 1e-6
  const omega   = 2 * Math.PI * freqKHz * 1e3
  const tau_out = computeTau(cell, sigma_e)
  const tau_ne  = computeNuclearTau(cell, sigma_e)
  if (tau_ne === 0) return 0
  const wt_out  = omega * tau_out
  const wt_ne   = omega * tau_ne
  return (1.5 * E * R_nuc * cosTheta * wt_out) /
    Math.sqrt((1 + wt_out ** 2) * (1 + wt_ne ** 2))
}

// ── nsEP pulse step response ─────────────────────────────────────────────────

/** Membrane charging fraction per pulse: 1−exp(−t_p/τ).
 *  Short pulses (t_p≪τ) leave the membrane partially charged → higher field needed for lysis.
 *  Not applied in resonance mode (acoustic coupling, not RC charging). */
export function computePulseStepResponse(tau_s: number, pulseWidthNs: number): number {
  return 1 - Math.exp(-(pulseWidthNs * 1e-9) / tau_s)
}

// ── Acoustic resonance (virus/bacteria) ─────────────────────────────────────

/** Lorentzian lineshape: 1/√(1+(Q·(f/f₀−f₀/f))²). Returns 1.0 at f=f_res.
 *  f_res ≈ v_shell/(2R): Influenza 12 GHz, E. coli 0.5 GHz, MRSA 1.5 GHz.
 *  Ref: Tsen et al. 2007; Dykeman & Sankey 2010. */
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

/** δ = √(1/(π·f·μ₀·σ_e))  [mm].  Good-conductor approximation; valid in saline to ~1 GHz.
 *  Saline (1.5 S/m): 100 MHz→41 mm · 1 GHz→13 mm · 5 GHz→5.8 mm · 12 GHz→3.8 mm.
 *  Ref: Gabriel et al. 1996. */
export function computeSkinDepthMm(freqKHz: number, sigma_e: number): number {
  const MU_0 = 4 * Math.PI * 1e-7
  const f    = freqKHz * 1e3
  if (f <= 0 || sigma_e <= 0) return Infinity
  return 1000 * Math.sqrt(1 / (Math.PI * f * MU_0 * sigma_e))
}

/** Resonant disruption ratio: (E/E_thr)·L(f, f_res, Q).  ≥1.0 → threshold exceeded. */
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
