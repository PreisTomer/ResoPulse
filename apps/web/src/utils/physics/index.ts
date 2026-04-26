// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// Biophysics utilities - Schwan single-shell model, SAR, nsEP, acoustic resonance, EM skin depth
import { SCHWAN_SPHERE_FACTOR, WF_CW, EPSILON_R_CYTOPLASM, SIGMA_MEMBRANE_SI, TWO_PI, POP_LYSIS_GAUSS_N, POP_LYSIS_GAUSS_Z_MAX, BODY_TEMP_C, TEMP_EP_COEFF, TEMP_EP_CLAMP_MIN, ELECTROSENSITIZATION_EXPONENT, ELECTROSENSITIZATION_CLAMP_MIN, EPSILON_0, MU_0, MIN_COS_THETA, LYSIS_FIELD_SENTINEL, MIN_PULSE_ENVELOPE, THRESHOLDS, NEWTON_COOLING_LAMBDA, PENNES_BLOOD_COEFF, DEBYE_TAU_AQUEOUS_S, EPS_INF_AQUEOUS, H_FIRE_THRESHOLD_MULTIPLIER } from '@/constants/physics'
import { WAVEFORM, CELL_CATEGORY } from '@/constants/strings'

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

// GHz SAR: membrane transparent (α→1), σ_eff = σ_i + ω·ε₀·ε″(ω); peaks near 1/(2πτ_D) ≈ 20 GHz.
export function computeIntracellularDebyeSAR(
  cell: CellConfig,
  fieldVcm: number,
  freqKHz: number,
  waveformFactor = WF_CW,
): number {
  if (cell.density <= 0) return 0
  const E_si    = fieldVcm * VCM_TO_VM
  const omega   = TWO_PI * freqKHz * KHZ_TO_HZ
  const wt      = omega * DEBYE_TAU_AQUEOUS_S
  const epsLoss = (EPSILON_R_CYTOPLASM - EPS_INF_AQUEOUS) * wt / (1 + wt * wt)
  const sigmaEff = cell.conductivity + omega * EPSILON_0 * epsLoss
  return (sigmaEff * E_si ** 2 * waveformFactor) / cell.density
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

// Re[K(ω)] — Clausius-Mossotti single-shell (Gascoyne 2002). Medium uses Debye τ_D ≈ 8.3 ps so >1 GHz crossover is physical.
export function computeDepCmReal(
  cell: CellConfig,
  freqKHz: number,
  sigma_e: number,
  epsilon_r_medium: number,
): number {
  const omega = TWO_PI * freqKHz * KHZ_TO_HZ

  // Debye dispersion of the aqueous medium (Gabriel 1996; Debye 1929). ωτ_D ≪ 1 at kHz.
  const wt          = omega * DEBYE_TAU_AQUEOUS_S
  const debyeDenom  = 1 + wt * wt
  const epsMedReal  = EPS_INF_AQUEOUS + (epsilon_r_medium - EPS_INF_AQUEOUS) / debyeDenom
  const epsMedLoss  = (epsilon_r_medium - EPS_INF_AQUEOUS) * wt / debyeDenom
  const sigmaMedEff = sigma_e + omega * EPSILON_0 * epsMedLoss

  // Complex permittivities: ε*(ω) = ε_r·ε₀ − j·σ_eff/ω
  const epsCyto: Cpx = [EPSILON_R_CYTOPLASM  * EPSILON_0, -cell.conductivity / omega]
  const sigma_mem = cell.membraneConductivity ?? SIGMA_MEMBRANE_SI
  const epsMem:  Cpx = [cell.dielectricConstant * EPSILON_0, -sigma_mem / omega]
  const epsMed:  Cpx = [epsMedReal * EPSILON_0, -sigmaMedEff / omega]

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

// DEP crossover log-scan [10 Hz, 10 GHz]: bracket sign changes, bisect. Pethig 2010. Catches dual crossovers in low-σ_e media.
const DEP_SCAN_LO_KHZ = 0.01
const DEP_SCAN_HI_KHZ = 10_000_000
const DEP_SCAN_POINTS = 100
const DEP_BISECT_ITERS = 40

function scanDepCrossoversKHz(
  cell: CellConfig,
  sigma_e: number,
  epsilon_r_medium: number,
): number[] {
  const crossovers: number[] = []
  const logLo = Math.log10(DEP_SCAN_LO_KHZ)
  const logHi = Math.log10(DEP_SCAN_HI_KHZ)
  let prevF = DEP_SCAN_LO_KHZ
  let prevK = computeDepCmReal(cell, prevF, sigma_e, epsilon_r_medium)
  for (let i = 1; i <= DEP_SCAN_POINTS; i++) {
    const f = Math.pow(10, logLo + (logHi - logLo) * i / DEP_SCAN_POINTS)
    const k = computeDepCmReal(cell, f, sigma_e, epsilon_r_medium)
    if (prevK * k < 0) {
      let lo = prevF, hi = f, kLo = prevK
      for (let j = 0; j < DEP_BISECT_ITERS; j++) {
        const mid  = Math.sqrt(lo * hi)
        const kMid = computeDepCmReal(cell, mid, sigma_e, epsilon_r_medium)
        if (Math.abs(kMid) < 1e-12) { lo = hi = mid; break }
        if (kLo * kMid < 0) { hi = mid } else { lo = mid; kLo = kMid }
      }
      crossovers.push(Math.sqrt(lo * hi))
    }
    prevF = f
    prevK = k
  }
  return crossovers
}

// First DEP crossover [kHz] — coarse log-scan 1 kHz to 10 GHz; 0 if none found.
export function computeDepCrossoverKHz(
  cell: CellConfig,
  sigma_e: number,
  epsilon_r_medium: number,
): number {
  return scanDepCrossoversKHz(cell, sigma_e, epsilon_r_medium)[0] ?? 0
}

// Second DEP crossover [kHz] — Re[K] sign change above f_cross1; 0 if none. Pethig 2010.
export function computeDepSecondCrossoverKHz(
  cell: CellConfig,
  sigma_e: number,
  epsilon_r_medium: number,
): number {
  return scanDepCrossoversKHz(cell, sigma_e, epsilon_r_medium)[1] ?? 0
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

// Pulse envelope factor with MIN_PULSE_ENVELOPE floor; 1.0 for CW and resonance.
export function pulseEnvelopeClamped(tau_s: number, pulseWidthNs: number, isPulsed: boolean): number {
  if (!isPulsed) return 1.0
  return Math.max(MIN_PULSE_ENVELOPE, computePulseStepResponse(tau_s, pulseWidthNs))
}

// H-FIRE bipolar charge cancellation raises EP threshold; Schwan path only, not acoustic.
export function getHFireMultiplier(waveform: string): number {
  return waveform === WAVEFORM.H_FIRE ? H_FIRE_THRESHOLD_MULTIPLIER : 1.0
}

// True when mode+category+resonant params all agree on the acoustic-resonance path.
export function isResonanceTargetActive(
  isResonanceMode: boolean,
  category: 'mammalian' | 'bacteria' | 'virus',
  target: CellConfig,
): boolean {
  if (!isResonanceMode) return false
  if (category !== CELL_CATEGORY.VIRUS && category !== CELL_CATEGORY.BACTERIA) return false
  const t = target as CellConfig & { resonantFreqGHz?: number; resonantThresholdVcm?: number }
  return !!t.resonantFreqGHz && !!t.resonantThresholdVcm
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

// EM skin depth [mm]: δ=1/α, α=ω√(με/2)·√(√(1+(σ_eff/ωε')²)−1) (Gabriel 1996). Debye loss needed or >1 GHz reads unphysical.
export function computeSkinDepthMm(freqKHz: number, sigma_e: number, epsilon_r = 80): number {
  const f = freqKHz * KHZ_TO_HZ
  if (f <= 0 || sigma_e <= 0) return Infinity
  const omega = TWO_PI * f
  // Debye dispersion of aqueous medium (treats epsilon_r as static ε_s; ε_∞ and τ_D are
  // aqueous-literature values independent of buffer salt content).
  const wt       = omega * DEBYE_TAU_AQUEOUS_S
  const denom    = 1 + wt * wt
  const epsReal  = EPS_INF_AQUEOUS + (epsilon_r - EPS_INF_AQUEOUS) / denom
  const epsLoss  = (epsilon_r - EPS_INF_AQUEOUS) * wt / denom
  const sigmaEff = sigma_e + omega * EPSILON_0 * epsLoss
  const epsilon  = epsReal * EPSILON_0
  // Exact lossy-dielectric attenuation constant (Cheng 1989; Jackson 1999)
  const lossTangent = sigmaEff / (omega * epsilon)
  const alpha       = omega * Math.sqrt(MU_0 * epsilon / 2) *
    Math.sqrt(Math.sqrt(1 + lossTangent ** 2) - 1)
  if (alpha <= 0) return Infinity
  return (1 / alpha) * 1000  // m → mm
}

// Resonant DR = (E/E_thr)·L(f,f_res,Q); optional second mode added with alpha2 weight (e.g. SARS-CoV-2 4 + 7.5 GHz).
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

// Vth_eff = Vth·N^(−α)·clamp(1−0.003·(T−37), 0.70, ∞). Arrhenius bilayer fluidity (Weaver & Chizmadzhev 1996)
// + pulse-conditioning sub-threshold pores (Pakhomov 2010). EP path only — never for acoustic resonance.
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

// Steady-state temperature [°C] via lumped 0-D thermal balance with Pennes-style perfusion sink. Honest scope: this is a 0-D well-mixed-cuvette approximation, not the full Pennes PDE. sar [W/kg], dc [0-1], specificHeat [J/(kg·K)], perfusionRate [mL/(g·min)].
export function computeSteadyStateTemp(
  sar:              number,
  dc:               number,
  specificHeat:     number,
  perfusionRate:    number,
  ambientC:         number = BODY_TEMP_C,
): number {
  const sarEff     = sar * dc
  const lambdaPerf = perfusionRate * PENNES_BLOOD_COEFF / specificHeat
  return Math.min(
    ambientC + sarEff / ((NEWTON_COOLING_LAMBDA + lambdaPerf) * specificHeat),
    THRESHOLDS.TEMP_CAP,
  )
}

// Cuvette wall cooling rate λ [1/s] derived from geometry and overall heat-transfer coefficient. Lets the user override the built-in NEWTON_COOLING_LAMBDA when their cuvette differs from the BTX 1mm default. Energy balance: ρ·V·cp·dT/dt = SAR_eff·ρ·V − U·A·(T − T_amb), so λ = U·A / (ρ·V·cp).
export function newtonCoolingLambda(
  wallAreaCm2:    number,
  cuvetteVolumeMl: number,
  wallU_W_m2K:    number,
  density_kg_m3:  number,
  cp_J_kgK:       number,
): number {
  const A = wallAreaCm2 * 1e-4         // cm² → m²
  const V = cuvetteVolumeMl * 1e-6     // mL → m³
  const denom = density_kg_m3 * V * cp_J_kgK
  if (denom <= 0 || A <= 0) return NEWTON_COOLING_LAMBDA
  return (wallU_W_m2K * A) / denom
}

// Transient temperature ramp T(t) [°C]. Closed-form solution to the lumped energy balance under constant time-averaged SAR_eff = SAR·dc: T(t) = T_amb + (T_ss − T_amb)·(1 − e^(−λ·t)) + (T₀ − T_amb)·e^(−λ·t). Returns sampled (t [s], T [°C]) over [0, durationS]. Honest scope: pulse-train micro-structure averaged out; valid as a thermal envelope, not for sub-pulse resolution.
export interface ThermalRampPoint { t: number; tempC: number }

export function computeTemperatureRamp(
  sar:               number,
  dc:                number,
  specificHeat:      number,
  perfusionRate:     number,
  durationS:         number,
  initialTempC:      number = BODY_TEMP_C,
  ambientC:          number = BODY_TEMP_C,
  nSamples:          number = 100,
  customLambda:      number | null = null,
): ThermalRampPoint[] {
  const sarEff     = sar * dc
  const lambdaPerf = perfusionRate * PENNES_BLOOD_COEFF / specificHeat
  const lambda     = (customLambda ?? NEWTON_COOLING_LAMBDA) + lambdaPerf
  const tSs        = ambientC + sarEff / (lambda * specificHeat)
  const tSsCapped  = Math.min(tSs, THRESHOLDS.TEMP_CAP)
  const out: ThermalRampPoint[] = []
  for (let i = 0; i <= nSamples; i++) {
    const t = (durationS * i) / nSamples
    const decay = Math.exp(-lambda * t)
    const tempC = Math.min(THRESHOLDS.TEMP_CAP, ambientC + (tSsCapped - ambientC) * (1 - decay) + (initialTempC - ambientC) * decay)
    out.push({ t, tempC })
  }
  return out
}

// ── Forward DR + Jacobian propagation (closed-loop uncertainty) ─────────────

export interface ForwardDrInput {
  cell:                 CellConfig
  freqKHz:              number
  fieldVcm:             number
  sigma_e:              number
  cosTheta:             number
  tempC:                number
  pulseWidthNs:         number
  isPulsed:             boolean
  hfireMult:            number
  effectivePulseCount:  number
}

// Schwan/IRE forward DR. Reads σ_i from cell.conductivity and V_th from cell.thresholdVoltage so a multiplier-perturbed CellConfig flows through cleanly.
export function computeSchwanDR(i: ForwardDrInput): number {
  const tau    = computeTau(i.cell, i.sigma_e)
  const vm     = computeSchwan(i.cell, i.freqKHz, i.fieldVcm, i.sigma_e, i.cosTheta)
  const pef    = pulseEnvelopeClamped(tau, i.pulseWidthNs, i.isPulsed)
  const vthEff = tempCorrectedVth(i.cell.thresholdVoltage, i.tempC, i.effectivePulseCount)
  if (vthEff <= 0 || i.hfireMult <= 0) return 0
  return (vm * pef) / (vthEff * i.hfireMult)
}

// Resonance forward DR. Reads Q from cell.capsidQ and V_thr from cell.resonantThresholdVcm; H-FIRE / electrosensitization do not apply (acoustic disruption is mechanical).
export function computeResonantDR(i: ForwardDrInput): number {
  const t = i.cell as CellConfig & { resonantFreqGHz?: number; capsidQ?: number; resonantThresholdVcm?: number; resonantFreqGHz2?: number; capsidQ2?: number; resonantMode2Amplitude?: number }
  if (!t.resonantFreqGHz || !t.capsidQ || !t.resonantThresholdVcm) return 0
  const effThr = tempCorrectedVth(t.resonantThresholdVcm, i.tempC)
  return computeResonantDisruption(t.resonantFreqGHz, t.capsidQ, effThr,
    i.freqKHz * KHZ_TO_HZ, i.fieldVcm,
    t.resonantFreqGHz2, t.capsidQ2, t.resonantMode2Amplitude)
}

// 2-element Jacobian on the multiplier scale. p1 = ∂DR/∂(σ_i_mult or Q_mult); p2 = ∂DR/∂(V_th_mult or V_thr_res_mult). Cell is the *calibrated* cell (multipliers already applied) — we perturb its baseline parameters by a relative step and back out d/d(mult) via the chain rule.
export interface JacobianTwoParam { p1: number; p2: number }

const JAC_REL_STEP = 1e-3

function _perturbedCell(cell: CellConfig, sigmaScale: number, vthScale: number): CellConfig {
  return { ...cell, conductivity: cell.conductivity * sigmaScale, thresholdVoltage: cell.thresholdVoltage * vthScale }
}

function _perturbedResonantCell(cell: CellConfig, qScale: number, vthrScale: number): CellConfig {
  const t = cell as CellConfig & { capsidQ?: number; resonantThresholdVcm?: number }
  const out: CellConfig & { capsidQ?: number; resonantThresholdVcm?: number } = { ...cell }
  if (typeof t.capsidQ === 'number')              out.capsidQ              = t.capsidQ              * qScale
  if (typeof t.resonantThresholdVcm === 'number') out.resonantThresholdVcm = t.resonantThresholdVcm * vthrScale
  return out
}

// Schwan: numerical ∂DR/∂(σ_i_mult, V_th_mult) via central differences. The cell already has the calibrated multipliers baked in, so perturbing by (1±h) about 1.0 gives the local sensitivity at the operating point.
export function jacobianSchwanDR(i: ForwardDrInput): JacobianTwoParam {
  const h = JAC_REL_STEP
  const drSp = computeSchwanDR({ ...i, cell: _perturbedCell(i.cell, 1 + h, 1) })
  const drSm = computeSchwanDR({ ...i, cell: _perturbedCell(i.cell, 1 - h, 1) })
  const drVp = computeSchwanDR({ ...i, cell: _perturbedCell(i.cell, 1, 1 + h) })
  const drVm = computeSchwanDR({ ...i, cell: _perturbedCell(i.cell, 1, 1 - h) })
  return { p1: (drSp - drSm) / (2 * h), p2: (drVp - drVm) / (2 * h) }
}

// Resonance: numerical ∂DR/∂(Q_mult, V_thr_mult). Same recipe with the resonance-side perturbation of the cell.
export function jacobianResonantDR(i: ForwardDrInput): JacobianTwoParam {
  const h = JAC_REL_STEP
  const drQp = computeResonantDR({ ...i, cell: _perturbedResonantCell(i.cell, 1 + h, 1) })
  const drQm = computeResonantDR({ ...i, cell: _perturbedResonantCell(i.cell, 1 - h, 1) })
  const drVp = computeResonantDR({ ...i, cell: _perturbedResonantCell(i.cell, 1, 1 + h) })
  const drVm = computeResonantDR({ ...i, cell: _perturbedResonantCell(i.cell, 1, 1 - h) })
  return { p1: (drQp - drQm) / (2 * h), p2: (drVp - drVm) / (2 * h) }
}

// Vm depends only on σ_i (Schwan path), so ∂Vm/∂V_th = 0. Returns the 2-element Jacobian shape for compositional symmetry with the DR variants.
export function jacobianSchwanVm(cell: CellConfig, freqKHz: number, fieldVcm: number, sigma_e: number, cosTheta: number): JacobianTwoParam {
  const h = JAC_REL_STEP
  const vmP = computeSchwan(_perturbedCell(cell, 1 + h, 1), freqKHz, fieldVcm, sigma_e, cosTheta)
  const vmM = computeSchwan(_perturbedCell(cell, 1 - h, 1), freqKHz, fieldVcm, sigma_e, cosTheta)
  return { p1: (vmP - vmM) / (2 * h), p2: 0 }
}

export interface CalibrationCovariance { cov11: number; cov12: number; cov22: number }

// σ²Y = J·Σ·Jᵀ for a scalar quantity Y with a 2-element Jacobian against (param1_mult, param2_mult). Standard first-order error propagation.
export function propagateScalarVariance(j: JacobianTwoParam, cov: CalibrationCovariance): number {
  const variance = j.p1 * j.p1 * cov.cov11
                 + 2 * j.p1 * j.p2 * cov.cov12
                 + j.p2 * j.p2 * cov.cov22
  return Math.max(0, variance)
}

// σ²TI = (J_T/DR_H)·Σ_T·(J_T/DR_H)ᵀ + (-DR_T/DR_H²·J_H)·Σ_H·(-DR_T/DR_H²·J_H)ᵀ. Healthy and target are independent fits so the full 4-parameter covariance is block-diagonal — the formula reduces to a sum of two 2-element propagations.
export function propagatedTiVariance(
  drT: number, drH: number,
  jacDrT: JacobianTwoParam, jacDrH: JacobianTwoParam,
  covT: CalibrationCovariance, covH: CalibrationCovariance,
): number {
  if (drH <= 0) return 0
  const inv = 1 / drH
  const jt: JacobianTwoParam = { p1: jacDrT.p1 * inv, p2: jacDrT.p2 * inv }
  const dh = -drT / (drH * drH)
  const jh: JacobianTwoParam = { p1: jacDrH.p1 * dh, p2: jacDrH.p2 * dh }
  return propagateScalarVariance(jt, covT) + propagateScalarVariance(jh, covH)
}

// Lysis-threshold field [V/cm] from flat cell params (for AI payload builder); clamped to [10, 100 000] V/cm.
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
  const isPulsed = waveform === WAVEFORM.PULSED || waveform === WAVEFORM.H_FIRE
  const pef   = pulseEnvelopeClamped(tau, pulseWidthNs, isPulsed)
  if (cosTheta < 1e-6) return 100_000
  const omega = TWO_PI * freqKhz * KHZ_TO_HZ
  const E_vm  = thresholdV * hfireMult * Math.sqrt(1 + (omega * tau) ** 2) /
                (SCHWAN_SPHERE_FACTOR * radiusUm * UM_TO_M * cosTheta * pef)
  return Math.min(Math.max(E_vm / VCM_TO_VM, 10), 100_000)
}
