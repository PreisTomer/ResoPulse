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
import type { CellConfig } from '@/types/cell'

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
 *
 * Waveform note (pulsed / H-FIRE mode):
 *   fieldVcm is treated as the peak amplitude E_peak. For bipolar square-wave carriers
 *   (H-FIRE/IRE regime), the sinusoidal-equivalent fundamental is E_1 = (4/π)×E_peak ≈ 1.27×E_peak.
 *   Using E_peak directly (standard H-FIRE convention) underestimates Vm by ~21%.
 *   This factor cancels exactly in the Vm_T/Vm_H selectivity ratio and Therapeutic Index.
 *   Absolute Vm values in pulsed mode are lower-bound estimates.
 *   Ref: Arena et al. (2011) IEEE Trans. Biomed. Eng.; Dong et al. (2021) Bioelectrochemistry.
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
 *   1.0 — pulsed bipolar square wave / H-FIRE (E²_rms = E²_peak; no RMS halving during on-time)
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
 *   τ_ne = R_nuc × Cm_ne × (2σ_i + σ_np) / (2σ_i × σ_np)
 *   Cm_ne = ε_ne × ε₀ / d_ne
 *
 * By strict analogy with computeTau() for the outer (plasma) membrane, where σ_e acts
 * as the "external" medium:  τ_pm = R·Cm·(2σ_e + σ_i)/(2σ_e·σ_i).
 * Here cytoplasm (σ_i) is the "external" medium for the nucleus, and nucleoplasm (σ_np)
 * is the interior.  The factor of 2 on σ_i comes from the Clausius-Mossotti solution
 * of the Laplace equation for a sphere in a uniform field (Kotnik & Miklavcic 2006).
 *
 * Returns 0 if the cell has no nuclearRadius (safe no-op for single-shell cells).
 */
export function computeNuclearTau(cell: CellConfig, _sigma_e: number): number {
  if (!cell.nuclearRadius) return 0
  const R_nuc    = cell.nuclearRadius * 1e-6                        // µm → m
  const d_ne     = (cell.nuclearMembraneThickness ?? 15) * 1e-9    // nm → m
  const eps_ne   = cell.nuclearMembraneEps ?? 10
  const sigma_i  = cell.conductivity                                 // cytoplasm (external medium for nucleus)
  const sigma_np = cell.nucleoplasmConductivity ?? 0.9
  const Cm_ne    = (eps_ne * EPSILON_0) / d_ne                     // F/m²
  return (R_nuc * Cm_ne) * (2 * sigma_i + sigma_np) / (2 * sigma_i * sigma_np)
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
 * For typical mammalian cells at 150 V/cm, saline (corrected τ_ne with factor of 2):
 *   Hepatocyte    (R=10µm, R_nuc=5µm):  f_peak ≈ 1.66 MHz, Vm_nuc(417kHz) ≈ 40 mV
 *   Adenocarcinoma(R=15µm, R_nuc=8µm):  f_peak ≈ 0.87 MHz, Vm_nuc(417kHz) ≈ 113 mV
 *   GBM           (R=12µm, R_nuc=7µm):  f_peak ≈ 1.05 MHz, Vm_nuc(417kHz) ≈ 87 mV
 *   MCF-7         (R=11µm, R_nuc=6µm):  f_peak ≈ 1.28 MHz, Vm_nuc(417kHz) ≈ 64 mV
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
 * Pulse-envelope charging factor: fraction of steady-state Vm the membrane reaches
 * during a single pulse of width `pulseWidthNs` nanoseconds.
 *   factor = 1 − exp(−t_p / τ)
 * At t_p ≫ τ → factor ≈ 1 (full Schwan steady-state Vm per pulse).
 * At t_p ≪ τ (nsEP regime) → factor ≪ 1 → membrane barely charges per pulse →
 * more field required to reach lysis threshold.
 *
 * Applied in the live simulation to the disruption ratio (Schwan/IRE mode, pulsed
 * waveform): DR = (Vm_schwan × factor) / Vm_threshold.
 * This captures the pulse-width dependence of the electroporation threshold
 * documented by Weaver & Chizmadzhev (1996) — stochastic pore nucleation requires
 * the membrane to reach a minimum potential per pulse; shorter pulses require a
 * proportionally higher applied field.
 *
 * NOT applied in resonance mode — acoustic/mechanical disruption uses a different
 * coupling mechanism (Lorentzian field-to-mechanical-mode coupling, not RC charging).
 * Ref: Weaver & Chizmadzhev (1996); Stacey et al. (2003); Schoenbach et al. (2001).
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
 * @param Q                Mechanical quality factor.
 *                         Icosahedral protein-capsid viruses (Tsen/Dykeman validated): Q ≈ 20–50.
 *                         Enveloped viruses (lipid bilayer, highly damped): Q ≈ 1–5 (speculative).
 *                         Bacterial peptidoglycan walls (viscoelastic polymer mesh): Q ≈ 2–5
 *                           (substantially lower than rigid protein capsids; Dykeman & Sankey
 *                           (2010) was validated on icosahedral capsids, NOT bacterial walls).
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
// ── EM penetration depth ─────────────────────────────────────────────────────

/**
 * Electromagnetic skin (penetration) depth [mm] in a conductive medium.
 *   δ = √(1 / (π × f × μ₀ × σ_e))
 *
 * Validity: high-conductivity regime (σ_e >> 2πf × ε_r × ε₀), which holds for
 * physiological saline/tissue up to ~100 GHz.
 *
 * Reference values in saline (σ_e = 1.5 S/m):
 *   100 MHz: δ ≈ 23 mm  — penetrates through cm-scale tissue
 *     1 GHz: δ ≈  7 mm  — bacteria resonance range; surface layer accessible
 *     5 GHz: δ ≈  3 mm  — deep tissue delivery impractical
 *    12 GHz: δ ≈  2 mm  — influenza/CoV-2 capsid resonance; mm-depth only
 *
 * Clinical implication: resonance targeting at GHz requires near-field applicators
 * or intracavitary probes for cm-depth tissue (skin depth limits far-field delivery).
 *
 * Ref: Gabriel et al. (1996) Phys. Med. Biol. 41:2271; Griffiths §9.4.
 *
 * @param freqKHz  Applied frequency [kHz]
 * @param sigma_e  Extracellular medium conductivity [S/m]
 * @returns Skin depth in mm (returns Infinity if f or σ_e ≤ 0)
 */
export function computeSkinDepthMm(freqKHz: number, sigma_e: number): number {
  const MU_0 = 4 * Math.PI * 1e-7   // permeability of free space [H/m]
  const f    = freqKHz * 1e3         // kHz → Hz
  if (f <= 0 || sigma_e <= 0) return Infinity
  return 1000 * Math.sqrt(1 / (Math.PI * f * MU_0 * sigma_e)) // m → mm
}

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
