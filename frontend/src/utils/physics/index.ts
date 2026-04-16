// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// Biophysics utilities - Schwan single-shell model, SAR, nsEP, acoustic resonance, EM skin depth
import { SCHWAN_SPHERE_FACTOR, WF_CW, EPSILON_R_CYTOPLASM, SIGMA_MEMBRANE_SI, TWO_PI, POP_LYSIS_GAUSS_N, POP_LYSIS_GAUSS_Z_MAX, BODY_TEMP_C, TEMP_EP_COEFF, TEMP_EP_CLAMP_MIN, ELECTROSENSITIZATION_EXPONENT, ELECTROSENSITIZATION_CLAMP_MIN, EPSILON_0, MU_0, MIN_COS_THETA, LYSIS_FIELD_SENTINEL, MIN_PULSE_ENVELOPE, THRESHOLDS, NEWTON_COOLING_LAMBDA, PENNES_BLOOD_COEFF } from '@/constants/physics'

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
  const f = freqKHz * KHZ_TO_HZ  // MU_0 imported from constants/physics
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
// Optional second mode: DR_total = DR_mode1 + alpha2 × DR_mode2, where alpha2 = resonantMode2Amplitude.
// Models viruses with experimentally confirmed multiple dipolar modes (e.g. SARS-CoV-2 at 4 + 7.5 GHz).
export function computeResonantDisruption(
  resonantFreqGHz: number,
  Q: number,
  thresholdVcm: number,
  freqHz: number,
  fieldVcm: number,
  resonantFreqGHz2?: number,
  capsidQ2?: number,
  resonantMode2Amplitude?: number,
): number {
  if (thresholdVcm <= 0) return 0
  const dr1 = (fieldVcm / thresholdVcm) * computeResonantLineshape(resonantFreqGHz, Q, freqHz)
  if (!resonantFreqGHz2) return dr1
  const alpha2 = resonantMode2Amplitude ?? 0.5
  const q2     = capsidQ2 ?? Q
  const dr2 = alpha2 * (fieldVcm / thresholdVcm) * computeResonantLineshape(resonantFreqGHz2, q2, freqHz)
  return dr1 + dr2
}

// ── Electroporation threshold correction (temperature + electrosensitization) ─
//
// Full formula: Vth_eff = Vth × N^(−α) × clamp(1 − 0.003×(T−37), 0.70, ∞)
//
// Temperature term: Arrhenius pore-nucleation energy decreases with bilayer fluidity.
//   Weaver & Chizmadzhev 1996 Bioelectrochemistry 41:135.
//
// Electrosensitization term: repeated pulses condition membrane pore populations, reducing
//   the field required for irreversible disruption on subsequent pulses. Each delivered pulse
//   leaves a population of sub-threshold pores that lower the nucleation barrier for the next.
//   Pakhomov et al. 2010 Biochim. Biophys. Acta 1798:2260; Weaver 1996 ibid.
//   α = ELECTROSENSITIZATION_EXPONENT (0.20 default). Clamped so threshold never falls below
//   35% of nominal regardless of pulse count.
//
// pulseCount applies only to EP thresholds (thresholdVoltage, nuclearThresholdVoltage).
// Do NOT pass pulseCount for acoustic resonance thresholds (resonantThresholdVcm) — mechanical
// capsid disruption has no pulse-conditioning equivalent in the current model.
export function tempCorrectedVth(
  nominalVth: number,
  tempC: number,
  pulseCount = 1,
  alpha = ELECTROSENSITIZATION_EXPONENT,
): number {
  const tempFactor = Math.max(TEMP_EP_CLAMP_MIN, 1 - TEMP_EP_COEFF * Math.max(0, tempC - BODY_TEMP_C))
  const nFactor    = pulseCount > 1
    ? Math.max(ELECTROSENSITIZATION_CLAMP_MIN, Math.pow(pulseCount, -alpha))
    : 1.0
  return nominalVth * tempFactor * nFactor
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

// ── cellStore physics helpers ─────────────────────────────────────────────────

// Pulse envelope: fraction of RC charge reached in pulse width t_p. Returns 1.0 for CW.
export function computePulseEnvelope(cell: CellConfig, pulseWidthNs: number, sigma_e: number): number {
  return computePulseStepResponse(computeTau(cell, sigma_e), pulseWidthNs)
}

// Lysis field [V/cm]: E that drives DR=1 at freqKHz with current waveform and thresholds.
// Returns LYSIS_FIELD_SENTINEL when cosTheta < MIN_COS_THETA (θ→90°, Vm→0).
export function computeLysisField(
  cell:       CellConfig,
  freqKHz:    number,
  sigma_e:    number,
  cosTheta:   number,
  pef:        number,
  hfireMult:  number,
  tempC:      number,
  nPulses:    number,
): number {
  if (cosTheta < MIN_COS_THETA) return LYSIS_FIELD_SENTINEL
  const omega  = TWO_PI * freqKHz * KHZ_TO_HZ
  const tau    = computeTau(cell, sigma_e)
  const vthEff = tempCorrectedVth(cell.thresholdVoltage, tempC, nPulses)
  return (vthEff * hfireMult * Math.sqrt(1 + (omega * tau) ** 2)) /
    (SCHWAN_SPHERE_FACTOR * cell.radius * UM_TO_M * cosTheta * VCM_TO_VM * Math.max(MIN_PULSE_ENVELOPE, pef))
}

// σ_i uncertainty factor by cell category: virus 45%, bacteria 35%, mammalian 20%.
export function computeSigmaUncertaintyFactor(radius: number): number {
  if (radius < THRESHOLDS.RADIUS_VIRUS_MAX)    return THRESHOLDS.UNCERTAINTY_VIRUS
  if (radius < THRESHOLDS.RADIUS_BACTERIA_MAX) return THRESHOLDS.UNCERTAINTY_BACTERIA
  return THRESHOLDS.UNCERTAINTY_MAMMALIAN
}

// Steady-state temperature [°C] via Newton cooling + Pennes perfusion. Pennes 1948.
// sar [W/kg], dc [0-1], specificHeat [J/(kg·K)], perfusionRate [mL/(g·min)].
export function computeSteadyStateTemp(
  sar:              number,
  dc:               number,
  specificHeat:     number,
  perfusionRate:    number,
): number {
  const sarEff     = sar * dc
  const lambdaPerf = perfusionRate * PENNES_BLOOD_COEFF / specificHeat
  return Math.min(
    BODY_TEMP_C + sarEff / ((NEWTON_COOLING_LAMBDA + lambdaPerf) * specificHeat),
    THRESHOLDS.TEMP_CAP,
  )
}

// Lysis-threshold field [V/cm] from flat cell parameters. Used by the AI optimisation
// payload builder in socket.ts where a full CellConfig is not available.
// Returns a value clamped to [10, 100 000] V/cm — prevents sentinel values in the payload.
export function computeLysisFieldFromParams(
  radiusUm:      number,
  memThicknessNm: number,
  dielectricConst: number,
  conductivitySi: number,
  thresholdV:    number,    // already temperature + electrosensitization corrected
  freqKhz:       number,
  sigmaE:        number,
  waveform:      string,
  pulseWidthNs:  number,
  cosTheta:      number,
  hfireMult:     number,
): number {
  const cell = { radius: radiusUm, membraneThickness: memThicknessNm, dielectricConstant: dielectricConst, conductivity: conductivitySi } as CellConfig
  const tau   = computeTau(cell, sigmaE)
  const pef   = (waveform === 'pulsed' || waveform === 'hfire')
    ? Math.max(MIN_PULSE_ENVELOPE, computePulseStepResponse(tau, pulseWidthNs))
    : 1.0
  if (cosTheta < 1e-6) return 100_000
  const omega = TWO_PI * freqKhz * KHZ_TO_HZ
  const E_vm  = thresholdV * hfireMult * Math.sqrt(1 + (omega * tau) ** 2) /
                (SCHWAN_SPHERE_FACTOR * radiusUm * UM_TO_M * cosTheta * pef)
  return Math.min(Math.max(E_vm / VCM_TO_VM, 10), 100_000)
}
