// Copyright © 2026 Tomer Preis. All rights reserved.
// Unauthorized copying or distribution is prohibited.

/**
 * Impedance feedback physics utilities.
 *
 * Models medium conductivity change as cells lyse (ion release, Maxwell-Garnett
 * mixing rule) and computes the corrected field intensity needed to maintain
 * constant transmembrane voltage despite the cuvette impedance drift
 * (voltage-divider effect).  Also provides frequency-dependent complex
 * impedance, VSWR/reflection coefficient for RF matching, and medium Joule
 * heating.
 *
 * References:
 *  - Maxwell-Garnett (1904) — effective medium theory for spherical inclusions
 *  - Kotnik & Miklavcic (2000) — Schwan time constant
 *  - Weaver & Chizmadzhev (1996) — electroporation membrane model
 *  - Neumann et al. (1989) — electroporation in dense cell suspensions
 *  - Hasted (1973) — permittivity of aqueous electrolytes
 */

import { MEDIUM_RELATIVE_PERMITTIVITY, MEDIUM_DENSITY_KG_M3, MEDIUM_SPECIFIC_HEAT_J_KG_K } from '@/constants/cuvette'

const EPSILON_0 = 8.854187817e-12  // F/m — vacuum permittivity

// ── Lysis fraction ─────────────────────────────────────────────────────────────

/**
 * Fraction of target cells lysed based on their disruption ratio [0–1].
 *
 * Smooth linear ramp:
 *   DR ≤ 0.85 → 0 (no lysis)
 *   DR ≥ 1.00 → 1 (fully lysed)
 */
export function lysedFractionFromDR(disruptionRatio: number): number {
  return Math.max(0, Math.min(1, (disruptionRatio - 0.85) / 0.15))
}

// ── Cell volume fraction ───────────────────────────────────────────────────────

/**
 * Cell volume fraction φ [dimensionless] from seeding density and cell radius.
 *
 * φ = N [cells/mL] × (4/3)π × (R [µm] × 1e-6)³ [m³/cell] / (1 mL = 1e-6 m³)
 *
 * Example: 1×10⁶ cells/mL, R = 10 µm → φ ≈ 0.0042 (0.42 %)
 */
export function computeCellVolumeFraction(cellDensityPerMl: number, radiusUm: number): number {
  const r_m = radiusUm * 1e-6
  return cellDensityPerMl * (4 / 3) * Math.PI * r_m ** 3 / 1e-6
}

// ── Maxwell-Garnett ion-release conductivity model ────────────────────────────

/**
 * Effective medium conductivity after lysis using the Maxwell-Garnett mixing rule [S/m].
 *
 * Intact cells are modelled as insulating spherical inclusions (membrane σ ≈ 0).
 * On lysis, the membrane ruptures and the cell volume (σ = σ_i) equilibrates with
 * the surrounding medium.  The lysed-cell volume fraction φ_lys = φ × f_lysed is
 * treated as a conducting inclusion in the Maxwell-Garnett formula:
 *
 *   σ_eff = σ_m × [σ_i + 2σ_m + 2φ_lys(σ_i − σ_m)]
 *                / [σ_i + 2σ_m −  φ_lys(σ_i − σ_m)]
 *
 * Handles both directions of drift:
 *   σ_i > σ_m → lysis raises σ_eff (low-σ media, e.g. PBS or sucrose)
 *   σ_i < σ_m → lysis lowers σ_eff (high-σ media, e.g. saline)
 *
 * At φ_lys → 0 the formula reduces to σ_m (no change), as expected.
 * Clamps φ_lys to [0, 0.74] (sphere close-packing limit).
 *
 * @param sigmaMedium          Base medium conductivity σ_m [S/m]
 * @param sigmaIntracellular   Target cell cytoplasm conductivity σ_i [S/m]
 * @param cellVolumeFraction   φ = N × (4/3)π R³ [dimensionless]
 * @param lysedFraction        Fraction of cells fully lysed [0–1]
 * @returns Effective medium conductivity σ_eff [S/m]
 */
export function computeLysedSigmaE(
  sigmaMedium:         number,
  sigmaIntracellular:  number,
  cellVolumeFraction:  number,
  lysedFraction:       number,
): number {
  const phi = Math.min(cellVolumeFraction * lysedFraction, 0.74)
  if (phi < 1e-6) return sigmaMedium
  const sc = sigmaIntracellular
  const sm = sigmaMedium
  const num = sc + 2 * sm + 2 * phi * (sc - sm)
  const den = sc + 2 * sm -     phi * (sc - sm)
  if (Math.abs(den) < 1e-15) return sigmaMedium
  return sm * (num / den)
}

// ── DC cuvette impedance ───────────────────────────────────────────────────────

/**
 * DC resistance of the cuvette [Ω].
 *
 * Z_DC = d / (σ × A)
 *
 * Valid for f ≪ σ_e / (2π ε_r ε₀) — the Maxwell relaxation frequency.
 * For saline (σ=1.5 S/m, εr=74) f_relax ≈ 365 MHz.
 *
 * @param gapMm           Electrode gap [mm]
 * @param areaCm2         Electrode cross-section [cm²]
 * @param sigmaEffective  Medium conductivity [S/m]
 */
export function computeCuvetteDCImpedance(
  gapMm:           number,
  areaCm2:         number,
  sigmaEffective:  number,
): number {
  if (sigmaEffective <= 0) return Infinity
  const d_m  = gapMm  * 1e-3
  const A_m2 = areaCm2 * 1e-4
  return d_m / (sigmaEffective * A_m2)
}

// ── Frequency-dependent complex impedance magnitude ────────────────────────────

/**
 * Magnitude of the complex cuvette impedance at a given frequency [Ω].
 *
 * The electrolyte medium is modelled as a parallel R-C:
 *   Z(f) = (d/A) × 1/(σ_e + jω ε_r ε₀)
 *   |Z(f)| = (d/A) / √[σ_e² + (ω ε_r ε₀)²]
 *
 * At f → 0 this reduces to the DC impedance Z_DC = d/(σ_e·A).
 * At f → f_relax = σ_e/(2π ε_r ε₀), |Z| is 1/√2 of Z_DC (−3 dB).
 *
 * @param gapMm           Electrode gap [mm]
 * @param areaCm2         Electrode cross-section [cm²]
 * @param sigmaEffective  Medium conductivity [S/m]
 * @param freqHz          Frequency [Hz]
 * @param epsilonR        Relative permittivity (default 74 for aqueous media at 37°C)
 */
export function computeCuvetteComplexImpedanceMag(
  gapMm:           number,
  areaCm2:         number,
  sigmaEffective:  number,
  freqHz:          number,
  epsilonR:        number = MEDIUM_RELATIVE_PERMITTIVITY,
): number {
  if (sigmaEffective <= 0) return Infinity
  const d_m  = gapMm  * 1e-3
  const A_m2 = areaCm2 * 1e-4
  const omega = 2 * Math.PI * freqHz
  const eps   = epsilonR * EPSILON_0
  return (d_m / A_m2) / Math.sqrt(sigmaEffective ** 2 + (omega * eps) ** 2)
}

/**
 * Maxwell relaxation frequency of the medium [Hz].
 *
 * Above this frequency the capacitive term ωεε₀ is no longer negligible
 * relative to σ_e, so the DC impedance formula becomes inaccurate.
 *
 * f_relax = σ_e / (2π ε_r ε₀)
 *
 * Example: saline σ=1.5 S/m, εr=74 → f_relax ≈ 365 MHz
 */
export function computeRelaxationFreqHz(
  sigmaEffective: number,
  epsilonR: number = MEDIUM_RELATIVE_PERMITTIVITY,
): number {
  return sigmaEffective / (2 * Math.PI * epsilonR * EPSILON_0)
}

// ── VSWR / RF reflection ───────────────────────────────────────────────────────

/**
 * Voltage reflection coefficient Γ between generator and cuvette load [dimensionless, 0–1].
 *
 * Γ = |Z_load − Z₀| / |Z_load + Z₀|
 *
 * Γ = 0 → perfect impedance match, maximum power transfer.
 * Γ = 1 → complete reflection (open or short circuit).
 *
 * @param zLoadOhm   Cuvette impedance [Ω]
 * @param z0Ohm      Source / reference impedance [Ω]
 */
export function computeReflectionCoeff(zLoadOhm: number, z0Ohm: number): number {
  if (zLoadOhm <= 0 || z0Ohm <= 0) return 1
  return Math.abs((zLoadOhm - z0Ohm) / (zLoadOhm + z0Ohm))
}

/**
 * Voltage Standing Wave Ratio (VSWR) between generator and cuvette [dimensionless, ≥ 1].
 *
 * VSWR = (1 + |Γ|) / (1 − |Γ|)
 *
 * VSWR = 1.0 → perfect match.
 * VSWR = ∞  → complete mismatch (short or open).
 * Practically acceptable: VSWR < 2 (return loss > 9.5 dB, η > 88.9 %).
 *
 * @param zLoadOhm   Cuvette impedance [Ω]
 * @param z0Ohm      Source / reference impedance [Ω]
 */
export function computeVSWR(zLoadOhm: number, z0Ohm: number): number {
  const gamma = computeReflectionCoeff(zLoadOhm, z0Ohm)
  if (gamma >= 1) return Infinity
  return (1 + gamma) / (1 - gamma)
}

/**
 * Power delivery efficiency: fraction of available power delivered to the cuvette.
 *
 * η = 1 − |Γ|²
 *
 * η = 1.0 → all power delivered (matched load).
 * η = 0.0 → all power reflected (total mismatch).
 *
 * @param zLoadOhm   Cuvette impedance [Ω]
 * @param z0Ohm      Source / reference impedance [Ω]
 */
export function computePowerDeliveryEfficiency(zLoadOhm: number, z0Ohm: number): number {
  const gamma = computeReflectionCoeff(zLoadOhm, z0Ohm)
  return 1 - gamma ** 2
}

// ── Medium Joule heating ───────────────────────────────────────────────────────

/**
 * Instantaneous Joule heating power deposited in the cuvette medium [W].
 *
 * P = |E|² × σ_e × V_cuvette
 *
 * where V_cuvette = gap × cross-section is the volume of medium between electrodes.
 * This is the total dissipated power (cell + medium), dominated by the medium for
 * typical cell volume fractions φ ≪ 1.
 *
 * @param fieldVcm    Applied electric field [V/cm]
 * @param sigmaE      Medium conductivity [S/m]
 * @param gapMm       Electrode gap [mm]
 * @param areaCm2     Electrode cross-section [cm²]
 */
export function computeMediumJouleHeatingWatts(
  fieldVcm: number,
  sigmaE:   number,
  gapMm:    number,
  areaCm2:  number,
): number {
  const E_SI    = fieldVcm * 100               // V/cm → V/m
  const V_m3    = gapMm * 1e-3 * areaCm2 * 1e-4  // m³
  return E_SI ** 2 * sigmaE * V_m3
}

/**
 * Estimated medium temperature rise rate [°C/s] from Joule heating.
 *
 * dT/dt = P / (ρ × c_p × V) = |E|² × σ_e / (ρ × c_p)
 *
 * Note: volume cancels, so the rate depends only on field and conductivity,
 * not cuvette size.  Assumes no heat loss to surroundings (adiabatic, worst case).
 *
 * @param fieldVcm  Applied electric field [V/cm]
 * @param sigmaE    Medium conductivity [S/m]
 */
export function computeMediumTempRiseRatePerSec(
  fieldVcm: number,
  sigmaE:   number,
): number {
  const E_SI = fieldVcm * 100                              // V/cm → V/m
  return E_SI ** 2 * sigmaE / (MEDIUM_DENSITY_KG_M3 * MEDIUM_SPECIFIC_HEAT_J_KG_K)
}

// ── Field distortion at high cell density ─────────────────────────────────────

/**
 * Electric field enhancement factor in the extracellular medium at high cell
 * packing density [dimensionless, ≥ 1].
 *
 * At low φ the applied macroscopic field equals the local field at each cell
 * surface.  At high φ, intact cells (insulating membranes) force current
 * around them, concentrating the field in the narrowing extracellular channels.
 * The Maxwell-Garnett local-field correction for insulating spheres (σ_c → 0):
 *
 *   σ_eff_intact = σ_m × (1 − φ) / (1 + φ/2)
 *   f_field      = σ_m / σ_eff_intact = (1 + φ/2) / (1 − φ)
 *
 * The actual field at the cell membrane = E_applied × f_field.
 * At φ = 0.01: f ≈ 1.015 (negligible).
 * At φ = 0.10: f ≈ 1.17  (17% — significant).
 * At φ = 0.30: f ≈ 1.64  (64% — major; Schwan Vm is underestimated without this).
 *
 * @param cellVolumeFraction  φ = N × (4/3)π R³ [dimensionless]
 * @returns Field enhancement factor (≥ 1)
 */
export function computeFieldDistortionFactor(cellVolumeFraction: number): number {
  const phi = Math.min(Math.max(0, cellVolumeFraction), 0.74)
  return (1 + phi / 2) / (1 - phi)
}

// ── Cuvette RC bandwidth ───────────────────────────────────────────────────────

/**
 * Cuvette RC time constant [ns].
 *
 * The medium between the electrodes acts as a parallel R–C network.
 * The geometry cancels and the time constant depends only on material properties:
 *
 *   τ_RC = ε_r × ε₀ / σ_e   (same as the Maxwell relaxation time)
 *
 * Physically: if the applied voltage pulse is shorter than τ_RC, the medium
 * cannot redistribute charge fast enough and the delivered field is attenuated.
 * For saline (σ=1.5 S/m, εr=74): τ_RC ≈ 0.44 ns.
 * For PBS   (σ=0.1 S/m, εr=74): τ_RC ≈ 6.5 ns.
 *
 * @param sigmaE    Medium conductivity [S/m]
 * @param epsilonR  Relative permittivity (default 74 for aqueous at 37°C)
 * @returns RC time constant [ns]
 */
export function computeCuvetteRCTimeConstantNs(
  sigmaE:   number,
  epsilonR: number = MEDIUM_RELATIVE_PERMITTIVITY,
): number {
  if (sigmaE <= 0) return Infinity
  return (epsilonR * EPSILON_0 / sigmaE) * 1e9  // s → ns
}

// ── Corrected field ───────────────────────────────────────────────────────────

/**
 * Electric field that must be set on the generator to deliver `eTargetVcm`
 * inside the cuvette, accounting for the voltage divider formed by the
 * generator's source impedance R_source and the cuvette impedance Z_cuvette.
 *
 * Derivation:
 *   V_cuvette = V_applied × Z_cuvette / (Z_cuvette + R_source)
 *   E_delivered = V_cuvette / d = E_applied × Z_cuvette / (Z_cuvette + R_source)
 *   → E_applied = E_target × (1 + R_source / Z_cuvette)
 *
 * @param eTargetVcm    Desired field inside the cuvette [V/cm]
 * @param cuvetteOhm    Current cuvette impedance [Ω]
 * @param sourceOhm     Generator source impedance [Ω]
 */
export function computeCorrectedFieldVcm(
  eTargetVcm: number,
  cuvetteOhm: number,
  sourceOhm:  number,
): number {
  if (cuvetteOhm <= 0) return eTargetVcm
  return eTargetVcm * (1 + sourceOhm / cuvetteOhm)
}

// ── Hardware back-derivation ──────────────────────────────────────────────────

/**
 * Derive medium conductivity from a measured cuvette impedance [S/m].
 *
 * σ = d / (Z_real × A)
 *
 * Used when a lab impedance analyser or LCR meter provides Z_real directly,
 * so the app can replace the simulation σ_e with the instrument reading.
 *
 * @param gapMm     Electrode gap [mm]
 * @param areaCm2   Electrode cross-section [cm²]
 * @param zRealOhm  Measured real part of impedance [Ω]
 */
export function computeSigmaEFromImpedance(
  gapMm:     number,
  areaCm2:   number,
  zRealOhm:  number,
): number {
  if (zRealOhm <= 0) return 0
  const d_m  = gapMm  * 1e-3
  const A_m2 = areaCm2 * 1e-4
  return d_m / (zRealOhm * A_m2)
}
