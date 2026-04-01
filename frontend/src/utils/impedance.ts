// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// Impedance feedback: conductivity change on lysis (Maxwell-Garnett), cuvette impedance,
// VSWR/RF matching, Joule heating, and corrected-field voltage-divider compensation.

import { MEDIUM_RELATIVE_PERMITTIVITY, MEDIUM_DENSITY_KG_M3, MEDIUM_SPECIFIC_HEAT_J_KG_K } from '@/constants/cuvette'
import { EPSILON_0 } from '@/constants/physics'

// ── Lysis fraction ─────────────────────────────────────────────────────────────

// Linear ramp: DR ≤ 0.85 → 0, DR ≥ 1.0 → 1.
export function lysedFractionFromDR(disruptionRatio: number): number {
  return Math.max(0, Math.min(1, (disruptionRatio - 0.85) / 0.15))
}

// ── Cell volume fraction ───────────────────────────────────────────────────────

// φ = N × (4/3)π R³ [dimensionless]
export function computeCellVolumeFraction(cellDensityPerMl: number, radiusUm: number): number {
  const r_m = radiusUm * 1e-6
  return cellDensityPerMl * (4 / 3) * Math.PI * r_m ** 3 / 1e-6
}

// ── Maxwell-Garnett ion-release conductivity model ────────────────────────────

// Maxwell-Garnett: σ_eff = σ_m×(σ_i+2σ_m+2φ(σ_i−σ_m))/(σ_i+2σ_m−φ(σ_i−σ_m)), φ≤0.74
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

// Z = d/(σ·A) [Ω], valid for f ≪ f_relax
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

// |Z(f)| = (d/A)/√(σ_e²+(ωε)²) [Ω], parallel R-C; −3 dB at f_relax
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

// f_relax = σ_e/(2π ε_r ε₀) [Hz]; DC impedance model inaccurate above this
export function computeRelaxationFreqHz(
  sigmaEffective: number,
  epsilonR: number = MEDIUM_RELATIVE_PERMITTIVITY,
): number {
  return sigmaEffective / (2 * Math.PI * epsilonR * EPSILON_0)
}

// ── VSWR / RF reflection ───────────────────────────────────────────────────────

// Γ = |Z_L−Z₀|/|Z_L+Z₀| [0-1]; 0=matched, 1=total reflection
export function computeReflectionCoeff(zLoadOhm: number, z0Ohm: number): number {
  if (zLoadOhm <= 0 || z0Ohm <= 0) return 1
  return Math.abs((zLoadOhm - z0Ohm) / (zLoadOhm + z0Ohm))
}

// VSWR = (1+Γ)/(1−Γ) [≥1]
export function computeVSWR(zLoadOhm: number, z0Ohm: number): number {
  const gamma = computeReflectionCoeff(zLoadOhm, z0Ohm)
  if (gamma >= 1) return Infinity
  return (1 + gamma) / (1 - gamma)
}

// η = 1−Γ² [0-1], fraction of power delivered to cuvette
export function computePowerDeliveryEfficiency(zLoadOhm: number, z0Ohm: number): number {
  const gamma = computeReflectionCoeff(zLoadOhm, z0Ohm)
  return 1 - gamma ** 2
}

// ── Medium Joule heating ───────────────────────────────────────────────────────

// P = E²·σ_e·V [W], total Joule heating in cuvette medium
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

// dT/dt = E²·σ_e/(ρ·c_p) [°C/s], adiabatic worst-case
export function computeMediumTempRiseRatePerSec(
  fieldVcm: number,
  sigmaE:   number,
): number {
  const E_SI = fieldVcm * 100                              // V/cm → V/m
  return E_SI ** 2 * sigmaE / (MEDIUM_DENSITY_KG_M3 * MEDIUM_SPECIFIC_HEAT_J_KG_K)
}

// ── Field distortion at high cell density ─────────────────────────────────────

// f = (1+φ/2)/(1−φ) — Maxwell-Garnett insulating sphere; E_actual = E_applied × f
export function computeFieldDistortionFactor(cellVolumeFraction: number): number {
  const phi = Math.min(Math.max(0, cellVolumeFraction), 0.74)
  return (1 + phi / 2) / (1 - phi)
}

// ── Cuvette RC bandwidth ───────────────────────────────────────────────────────

// τ_RC = ε_r·ε₀/σ_e [ns]; pulses shorter than τ_RC see attenuated field delivery
export function computeCuvetteRCTimeConstantNs(
  sigmaE:   number,
  epsilonR: number = MEDIUM_RELATIVE_PERMITTIVITY,
): number {
  if (sigmaE <= 0) return Infinity
  return (epsilonR * EPSILON_0 / sigmaE) * 1e9  // s → ns
}

// ── Corrected field ───────────────────────────────────────────────────────────

// E_applied = E_target × (1 + R_src/Z_cuv) — voltage-divider correction
export function computeCorrectedFieldVcm(
  eTargetVcm: number,
  cuvetteOhm: number,
  sourceOhm:  number,
): number {
  if (cuvetteOhm <= 0) return eTargetVcm
  return eTargetVcm * (1 + sourceOhm / cuvetteOhm)
}

// ── Hardware back-derivation ──────────────────────────────────────────────────

// σ = d/(Z_real·A) [S/m]
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
