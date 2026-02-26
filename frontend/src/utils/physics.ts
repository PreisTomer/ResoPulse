/**
 * Biophysics utility functions for the BioResonance platform.
 *
 * Physics models:
 *  - Schwan single-shell transmembrane potential (Kotnik & Miklavcic 2000)
 *  - SAR / Newton-cooling thermal model (Foster & Schwan 1989)
 *  - Nanosecond pulse step-response for selective electroporation (nsEP)
 *  - Acoustic/mechanical resonance disruption for viral capsids and bacterial
 *    cell walls (Tsen et al. 2007; Dykeman & Sankey 2008)
 */
import type { CellConfig } from '../mockData'

// ── Physical constants ────────────────────────────────────────────────────────
export const EPSILON_0 = 8.854187817e-12 // permittivity of free space [F/m]

// ── Schwan model ──────────────────────────────────────────────────────────────

/** Membrane capacitance per unit area [F/m²]: Cm = ε_r × ε₀ / d */
export function membraneCm(cell: CellConfig): number {
  return (cell.dielectricConstant * EPSILON_0) / (cell.membraneThickness * 1e-9)
}

/**
 * Membrane time constant τ [s] — Kotnik & Miklavcic (2000) single-shell model:
 *   τ = R·Cm · (2σ_e + σ_i) / (2σ_e · σ_i)
 * Equivalently:  τ = R·Cm · (1/σ_i + 1/(2σ_e))
 * NOT the simpler but incorrect form τ = R·Cm / (σ_e + σ_i/2).
 */
export function computeTau(cell: CellConfig, sigma_e: number): number {
  const R = cell.radius * 1e-6     // µm → m
  const Cm = membraneCm(cell)      // F/m²
  return (R * Cm) * (2 * sigma_e + cell.conductivity) / (2 * sigma_e * cell.conductivity)
}

/**
 * Schwan transmembrane potential [V]:
 *   Vm(f) = (1.5 × E × R) / √(1 + (ωτ)²)
 *   E [V/m] = fieldVcm × 100
 */
export function computeSchwan(
  cell: CellConfig,
  freqKHz: number,
  fieldVcm: number,
  sigma_e: number,
): number {
  const E = fieldVcm * 100          // V/cm → V/m
  const R = cell.radius * 1e-6      // µm → m
  const tau = computeTau(cell, sigma_e)
  const omega = 2 * Math.PI * freqKHz * 1e3
  return (1.5 * E * R) / Math.sqrt(1 + (omega * tau) ** 2)
}

/**
 * Specific absorption rate [W/kg] — power deposited in cell interior:
 *   E_in = E × 3σ_e / (2σ_e + σ_i)   (internal field, DC limit for sphere in medium)
 *   SAR  = σ_i × E_in² × waveformFactor / ρ
 *        = σ_i × (3σ_e/(2σ_e+σ_i))² × E² × waveformFactor / ρ
 *
 * This is the physically correct cell-interior SAR from the Maxwell/Laplace solution
 * for a dielectric sphere in a uniform field (Schwitzer 1955; Foster & Schwan 1989).
 *
 * waveformFactor:
 *   0.5 — CW sinusoidal (E²_rms = E²_peak / 2)
 *   1.0 — pulsed DC / square wave (no RMS halving)
 */
export function computeSAR(
  cell: CellConfig,
  fieldVcm: number,
  sigma_e: number,
  waveformFactor = 0.5,
): number {
  const E = fieldVcm * 100          // V/cm → V/m
  // Internal field concentration factor α = 3σ_e / (2σ_e + σ_i)
  const alpha = (3 * sigma_e) / (2 * sigma_e + cell.conductivity)
  return (cell.conductivity * alpha * alpha * E * E * waveformFactor) / cell.density
}

/** Cell characteristic frequency fc [kHz]: fc = 1 / (2πτ) */
export function computeFc(cell: CellConfig, sigma_e: number): number {
  const tau = computeTau(cell, sigma_e)
  return 1 / (2 * Math.PI * tau * 1e3)
}

// ── Nanosecond pulsed electroporation ─────────────────────────────────────────

/**
 * Pulse step-response charging factor: fraction of steady-state Vm reached after
 * a rectangular pulse of width `pulseWidthNs` nanoseconds.
 *   factor = 1 − exp(−t_p / τ)
 * At t_p ≫ τ → factor ≈ 1 (full DC Vm).
 * At short ns pulses, small cells (short τ) charge proportionally more than large
 * mammalian cells (long τ), enabling size-selective nanosecond electroporation.
 */
export function computePulseStepResponse(tau_s: number, pulseWidthNs: number): number {
  const t_p = pulseWidthNs * 1e-9
  return 1 - Math.exp(-t_p / tau_s)
}

// ── Acoustic/mechanical resonance (virus/bacteria capsid & cell-wall targeting) ──

/**
 * Lorentzian lineshape for mechanical resonance coupling.
 * Returns 1.0 at f = f_res (maximum energy absorption), falling off symmetrically
 * with quality factor Q away from resonance.
 *
 * Physical basis:
 *   Viral capsids and bacterial cell walls are elastic shells with characteristic
 *   normal-mode (breathing) frequencies in the MHz–GHz range. Excitation at f_res
 *   drives resonant energy accumulation until the shell ruptures.
 *
 *   f_res ≈ v_shell / (2R)     [first breathing mode, spherical shell]
 *   Influenza  (R=60 nm):  f_res ≈ 12 GHz  (v_protein ≈ 1440 m/s)
 *   E. coli    (R=1 µm):   f_res ≈ 0.5 GHz (v_wall    ≈ 1000 m/s)
 *   MRSA       (R=0.5 µm): f_res ≈ 1.5 GHz (v_wall    ≈ 1500 m/s, thick peptidoglycan)
 *
 * Mammalian cells lack the rigid protein/peptidoglycan shell required for this
 * resonance mechanism. Their Schwan Vm rolls off above fc ≈ 1 MHz (ωτ ≫ 1)
 * and approaches zero at GHz frequencies — leaving healthy tissue unperturbed
 * at the pathogen-targeting frequencies used here.
 *
 * Ref: Tsen et al. (2007, 2010) — acoustic resonance inactivation of viruses;
 *      Dykeman & Sankey (2008) — capsid normal-mode calculations.
 *
 * @param resonantFreqGHz  Fundamental resonant frequency (GHz)
 * @param Q                Mechanical quality factor (viral shells: 20–50; bacterial walls: 10–20)
 * @param freqHz           Applied field frequency (Hz)
 */
export function computeResonantLineshape(
  resonantFreqGHz: number,
  Q: number,
  freqHz: number,
): number {
  if (resonantFreqGHz <= 0) return 0
  const f  = freqHz / 1e9          // Hz → GHz
  const f0 = resonantFreqGHz
  const x  = f / f0 - f0 / f      // normalised detuning (antisymmetric about f0)
  return 1 / Math.sqrt(1 + (Q * x) ** 2)
}

/**
 * Resonant disruption ratio for a virus or bacterial cell:
 *   ratio = (fieldVcm / thresholdVcm) × L(f, f_res, Q)
 *
 * ratio ≥ 1.0 → capsid / cell-wall disruption threshold exceeded.
 *
 * Selectivity arises because mammalian cells have no sharp mechanical resonance
 * in the MHz–GHz range:  applying the field at f_res(target) leaves the healthy
 * cell largely unperturbed (effective ratio ≈ 0).
 *
 * @param resonantFreqGHz  Capsid/wall resonant frequency (GHz)
 * @param Q                Mechanical quality factor
 * @param thresholdVcm     Field amplitude at resonance required for disruption (V/cm)
 * @param freqHz           Applied frequency (Hz)
 * @param fieldVcm         Applied field intensity (V/cm)
 */
export function computeResonantDisruption(
  resonantFreqGHz: number,
  Q: number,
  thresholdVcm: number,
  freqHz: number,
  fieldVcm: number,
): number {
  if (thresholdVcm <= 0) return 0
  const lineshape = computeResonantLineshape(resonantFreqGHz, Q, freqHz)
  return (fieldVcm / thresholdVcm) * lineshape
}
