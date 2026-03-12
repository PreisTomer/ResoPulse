/**
 * Impedance feedback physics utilities.
 *
 * Models medium conductivity change as cells lyse (ion release) and computes
 * the corrected field intensity needed to maintain constant transmembrane
 * voltage despite the cuvette impedance drift (voltage-divider effect).
 *
 * References:
 *  - Kotnik & Miklavcic (2000) — Schwan time constant
 *  - Weaver & Chizmadzhev (1996) — electroporation membrane model
 *  - Neumann et al. (1989) — electroporation in dense cell suspensions
 */

import { ION_RELEASE_EFFICIENCY } from '@/constants/cuvette'

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

// ── Ion-release conductivity model ────────────────────────────────────────────

/**
 * Medium conductivity corrected for ion release from lysed cells [S/m].
 *
 * Δσ_e = φ_cells × f_lysed × (σ_i − σ_medium) × ION_RELEASE_EFFICIENCY
 *
 * Physical basis: lysed cells release intracellular K⁺, Na⁺, Cl⁻ ions
 * into the medium, raising its bulk conductivity proportionally to
 * the lysed volume fraction and the intracellular–extracellular σ contrast.
 *
 * @param sigmaMedium          Base medium conductivity [S/m]
 * @param sigmaIntracellular   Target cell cytoplasm conductivity [S/m]
 * @param cellVolumeFraction   φ = N × (4/3)π R³ [dimensionless]
 * @param lysedFraction        Fraction of cells fully lysed [0–1]
 */
export function computeLysedSigmaE(
  sigmaMedium:         number,
  sigmaIntracellular:  number,
  cellVolumeFraction:  number,
  lysedFraction:       number,
): number {
  const delta = cellVolumeFraction * lysedFraction * (sigmaIntracellular - sigmaMedium) * ION_RELEASE_EFFICIENCY
  return sigmaMedium + delta
}

// ── Cuvette impedance ─────────────────────────────────────────────────────────

/**
 * DC resistance of the cuvette [Ω].
 *
 * Z = d / (σ × A)
 *
 * Valid for frequencies where capacitive reactance of the medium is
 * negligible (f ≪ σ_e / (2π ε_r ε₀) ≈ 340 MHz for saline).
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
 * @param cuvetteOhm    Current cuvette DC impedance [Ω]
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
