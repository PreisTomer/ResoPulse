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
 *   Vm(f) = (1.5 × E × R × cosTheta) / √(1 + (ωτ)²)
 *   E [V/m] = fieldVcm × 100
 *
 * cosTheta = |cos(θ)| where θ is the angle between the applied field vector and the
 * cell's axis of symmetry. For a spherical cell in a uniform field:
 *   θ = 0° (field-aligned): cosTheta = 1 → maximum Vm
 *   θ = 90° (perpendicular): cosTheta = 0 → no net transmembrane drive
 * In a random suspension the orientation is uniformly distributed; this parameter
 * lets the user model a specific cell orientation or an oriented monolayer.
 * Default cosTheta = 1.0 preserves backward compatibility.
 */
export function computeSchwan(
  cell: CellConfig,
  freqKHz: number,
  fieldVcm: number,
  sigma_e: number,
  cosTheta = 1.0,   // |cos(θ)| — field-to-cell-axis coupling factor [0–1]
): number {
  const E = fieldVcm * 100          // V/cm → V/m
  const R = cell.radius * 1e-6      // µm → m
  const tau = computeTau(cell, sigma_e)
  const omega = 2 * Math.PI * freqKHz * 1e3
  return (1.5 * E * R * cosTheta) / Math.sqrt(1 + (omega * tau) ** 2)
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

// ── Double-shell nuclear envelope model (Kotnik & Miklavcic 2006) ─────────────

/**
 * Nuclear envelope membrane time constant τ_ne [s]:
 *   τ_ne = R_nuc × Cm_ne × (σ_i + σ_np) / (σ_i × σ_np)
 *   Cm_ne = ε_ne × ε₀ / d_ne
 *
 * This is analogous to the plasma-membrane time constant computeTau(), but for
 * the inner shell (nuclear envelope + nucleoplasm) of the two-shell model.
 * Returns 0 if the cell has no nuclearRadius (safe no-op for single-shell cells).
 */
export function computeNuclearTau(cell: CellConfig, _sigma_e: number): number {
  if (!cell.nuclearRadius) return 0
  const R_nuc   = cell.nuclearRadius * 1e-6                        // µm → m
  const d_ne    = (cell.nuclearMembraneThickness ?? 15) * 1e-9     // nm → m
  const eps_ne  = cell.nuclearMembraneEps ?? 10
  const sigma_i = cell.conductivity                                  // cytoplasm
  const sigma_np = cell.nucleoplasmConductivity ?? 0.9
  const Cm_ne   = (eps_ne * EPSILON_0) / d_ne                      // F/m²
  return (R_nuc * Cm_ne) * (sigma_i + sigma_np) / (sigma_i * sigma_np)
}

/**
 * Nuclear membrane transmembrane potential [V] — two-pole bandpass transfer function.
 *
 * In the thin-shell double-shell approximation (Kotnik & Miklavcic 2006, Biophys J 90:480):
 *
 *   Vm_nuc(ω) = (1.5 × E × R_nuc × cosTheta × ω × τ_out) /
 *               √[ (1 + (ωτ_out)²) × (1 + (ωτ_ne)²) ]
 *
 * Physical behaviour:
 *   ω → 0  (DC):   Vm_nuc → 0 (DC blocked by insulating membrane; NPC shunts are finite σ_ne)
 *   ω → ∞  (HF):   Vm_nuc → 0 (capacitive short-circuit of both membranes)
 *   ω_peak = 1/√(τ_out × τ_ne) → bandpass peak
 *   Peak gain = τ_out / (τ_out + τ_ne)
 *
 * For typical mammalian cells at 150 V/cm, saline:
 *   Hepatocyte    (R=10µm, R_nuc=5µm):  f_peak ≈ 1.37 MHz, Vm_nuc(417kHz) ≈ 40 mV
 *   Adenocarcinoma(R=15µm, R_nuc=8µm):  f_peak ≈ 0.74 MHz, Vm_nuc(417kHz) ≈ 110 mV
 *
 * Returns 0 if the cell has no nuclearRadius.
 *
 * @param cosTheta |cos(θ)| field-cell alignment factor (same as Schwan; cancels in selectivity ratio)
 */
export function computeNuclearVm(
  cell: CellConfig,
  freqKHz: number,
  fieldVcm: number,
  sigma_e: number,
  cosTheta = 1.0,
): number {
  if (!cell.nuclearRadius) return 0
  const E     = fieldVcm * 100                // V/cm → V/m
  const R_nuc = cell.nuclearRadius * 1e-6     // µm → m
  const omega = 2 * Math.PI * freqKHz * 1e3  // rad/s

  const tau_out = computeTau(cell, sigma_e)         // outer (plasma) membrane τ
  const tau_ne  = computeNuclearTau(cell, sigma_e)  // nuclear envelope τ
  if (tau_ne === 0) return 0

  const wt_out = omega * tau_out
  const wt_ne  = omega * tau_ne
  return (1.5 * E * R_nuc * cosTheta * wt_out) /
    Math.sqrt((1 + wt_out ** 2) * (1 + wt_ne ** 2))
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
 * Ref: Tsen et al. (2007–2012) [10] — acoustic resonance inactivation of viruses;
 *      Dykeman & Sankey (2010) [11] — capsid normal-mode calculations.
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
