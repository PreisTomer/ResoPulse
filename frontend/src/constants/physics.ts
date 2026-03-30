// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// Physics and thermal constants. Single source of truth for cellStore, physics utils, and SweepPanel.

// Schwan single-shell sphere geometric factor: 3/2 (Schwan 1957)
export const SCHWAN_SPHERE_FACTOR = 1.5

// Thermal baseline T₀ [°C]
export const BODY_TEMP_C = 37

// Newton surface cooling rate λ [1/s] (empirical, ~0.02 s⁻¹)
export const NEWTON_COOLING_LAMBDA = 0.02

// Pennes blood perfusion coefficient [J/(mL·°C)]: ρ_blood×c_blood/60000 = 1060×3617/60000 = 63.9
export const PENNES_BLOOD_COEFF = 63.9

// SAR waveform factor for CW sinusoidal field: E²_rms = E²_peak/2 (Schwan 1957)
export const WF_CW = 0.5

export const TWO_PI = 2 * Math.PI

// Epsilon for near-zero disruption-ratio zero-checks
export const NEAR_ZERO_DR = 1e-9

// Epsilon for near-zero transmembrane voltage [mV scale] zero-checks
export const NEAR_ZERO_VM = 1e-12

// SAR waveform factor for pulsed bipolar square wave: E²_rms = E²_peak
export const WF_PULSED = 1.0

// H-FIRE lysis threshold multiplier: bipolar charge cancellation raises threshold ~1.75×. Arena 2011; Sano 2015.
export const H_FIRE_THRESHOLD_MULTIPLIER = 1.75

// Mild thermal activation peak temperature [°C] — bell peak in 37-42°C biomodulation window
export const THERMAL_MA_PEAK_C = 41

// Temperature update interval [ms] in Newton-cooling session loop
export const TEMP_UPDATE_INTERVAL_MS = 100

// |cos θ| below this is treated as near-perpendicular → lysis field undefined
export const MIN_COS_THETA = 0.01

// Sentinel returned by lysisField() when θ→90°. Callers must render 'N/A' for this value.
export const LYSIS_FIELD_SENTINEL = 1e6

// Minimum pulse envelope factor to prevent division artefacts (t_p→0 limit)
export const MIN_PULSE_ENVELOPE = 1e-4

// EP threshold temperature coefficient [1/°C]: Vth_eff = Vth×max(CLAMP_MIN, 1−coeff×(T−37)). ~−0.3%/°C.
export const TEMP_EP_COEFF = 0.003

// Lower clamp for Vth temperature correction — prevents unphysical zero/negative threshold.
export const TEMP_EP_CLAMP_MIN = 0.70

// Upper limit of direct-electrode (electrolytic) coupling regime [kHz] = 300 MHz. Foster & Schwan 1989.
export const FREQ_ELECTROLYTIC_LIMIT_KHZ = 300_000

// Upper limit of near-field RF regime [kHz] = 1 GHz. Above this, waveguide required. Gabriel 1996.
export const FREQ_NEARFIELD_RF_LIMIT_KHZ = 1_000_000

// ── DEP Clausius-Mossotti model ───────────────────────────────────────────────

// Relative permittivity of aqueous medium for DEP. Physical ~74 at 37°C; 80 per bioEM convention. Gabriel 1996.
export const EPSILON_R_MEDIUM_WATER = 80

// Effective cytoplasm relative permittivity: lower than bulk water (macromolecular crowding). Pethig 2010.
export const EPSILON_R_CYTOPLASM = 60

// Intact membrane conductivity [S/m]: lipid bilayer nearly insulating at RF. Gascoyne 2002.
export const SIGMA_MEMBRANE_SI = 1e-7

// ── Biophysical model thresholds ─────────────────────────────────────────────

export const THRESHOLDS = {
  // Disruption ratio (DR = Vm × f_pulse / V_threshold)
  DISRUPTION_WARN:     0.85,  // lysis countdown arms
  HEALTHY_CRITICAL:    0.85,  // pore-formation imminent
  HEALTHY_APPROACHING: 0.50,  // membrane stress onset
  NOURISHING:          0.45,  // sub-threshold biomodulation onset
  VIBRATING_MIN:       0.08,  // low-vibration onset
  // Temperature (°C)
  TEMP_WARN:           42,    // hyperthermic safety limit
  TEMP_DENATURING:     60,    // protein denaturation onset
  TEMP_VAPORIZING:     100,   // water boiling / steam lysis
  TEMP_CAP:            150,   // display ceiling
  // TI = DR_T / DR_H
  TI_STRONG:           2.0,
  TI_MARGINAL:         1.2,
  // Selectivity Sel = Vm_T / Vm_H
  SEL_STRONG:          1.5,
  SEL_MARGINAL:        1.0,
  // Lysis probability sigmoid P = 1/(1+exp(−(DR−center)/slope))
  LYSIS_PROB_CENTER:   1.0,   // DR at P(lysis)=50%
  LYSIS_PROB_SLOPE:    0.05,
  // Cell category radius boundaries (µm)
  RADIUS_VIRUS_MAX:    0.1,   // R<0.1 → VIRUS
  RADIUS_BACTERIA_MAX: 2.0,   // 0.1≤R<2.0 → BACTERIA; R≥2.0 → MAMMALIAN
  TI_DISPLAY_CAP:      99.9,
  // Nuclear membrane defaults (Kotnik 2006; Bhatt et al. 2021)
  NUCLEAR_MEMBRANE_THICKNESS_NM: 15,
  NUCLEAR_MEMBRANE_EPS:           10,
  NUCLEOPLASM_CONDUCTIVITY:        0.9,
  NUCLEAR_VM_DEFAULT:              0.5,
  // σ_i uncertainty fractions per cell category
  UNCERTAINTY_VIRUS:    0.45,
  UNCERTAINTY_BACTERIA: 0.35,
  UNCERTAINTY_MAMMALIAN: 0.20,
  // BMS weighting coefficients (sum = 1.0)
  BMS_WEIGHT_SI:       0.55,
  BMS_WEIGHT_MTE:      0.25,
  BMS_WEIGHT_MA:       0.20,
} as const

export type ThresholdKey = keyof typeof THRESHOLDS

// ── Population size distribution (log-normal cell radius CV) ─────────────────
// Ref: Tzur et al. (2009) Science 325:167; Altschuler & Wu (2010) Cell 141:559

export const POP_CV_MAMMALIAN = 0.25  // radius CV ~20-30%; nominal 25%
export const POP_CV_BACTERIA  = 0.22  // radius CV ~20-25%; nominal 22%
export const POP_CV_VIRUS     = 0.08  // capsid radius CV ~5-10%; icosahedral; nominal 8%

// ── Reversible EP membrane resealing model ───────────────────────────────────

// Reference resealing time [s] at T=37°C, DR=0.675, 1 pulse. Rols & Teissie 1990; Weaver 1996.
export const RESEAL_TIME_REF_S = 5.0
export const RESEAL_DR_REF = 0.675        // midpoint of rev-EP window (50-85%)
export const RESEAL_DR_EXPONENT = 2.5     // power-law DR scaling exponent
// Temperature acceleration [1/°C]: τ_reseal × exp(−coeff×(T−37)). ~6%/°C. Rols & Teissie 1990.
export const RESEAL_TEMP_COEFF = 0.06
export const RESEAL_PULSE_EXPONENT = 0.3  // sublinear pulse-count scaling exponent
export const RESEAL_TIME_MIN_S = 0.5      // min resealing time display clamp [s]
export const RESEAL_TIME_MAX_S = 60.0     // max resealing time display clamp [s]

// Default acoustic Q when preset omits capsidQ. Rigid capsids Q~30; peptidoglycan Q~3-4.
export const DEFAULT_CAPSID_Q = 2

// ── Electromagnetic constants ─────────────────────────────────────────────────

// Vacuum permeability [H/m] — used in EM skin depth δ = √(1/(π·f·μ₀·σ)). CODATA 2018.
export const MU_0 = 4 * Math.PI * 1e-7

// ── Population lysis integration parameters ───────────────────────────────────

export const POP_LYSIS_GAUSS_N     = 60   // 61-point rectangle rule; <0.1% error
export const POP_LYSIS_GAUSS_Z_MAX = 4.5  // ±4.5σ covers >99.999% of log-normal distribution

// ── Unit conversion factors ───────────────────────────────────────────────────

export const V_CM_TO_V_M   = 100   // V/cm → V/m
export const KHZ_TO_HZ     = 1e3   // kHz → Hz
export const NS_TO_S        = 1e-9  // ns → s
export const NS_TO_MS       = 1e-6  // ns → ms
export const MS_TO_S        = 1e-3  // ms → s
export const J_M3_TO_MJ_CM3 = 1e-3  // J/m³ → mJ/cm³

// ── Medium and lysis timing constants ────────────────────────────────────────

export const RHO_AQUEOUS_KG_M3 = 1000  // density of aqueous media [kg/m³]. CRC Handbook.
export const LYSIS_DELAY_CW_MS = 2500   // CW lysis countdown — 2.5 s standard IRE window
export const LYSIS_DELAY_MAX_MS = 30_000 // max pulsed-mode lysis delay [ms]
// Below 50 kHz, electrode double-layer (Cdl) absorbs measurable voltage fraction. Foster 1989.
export const ELECTRODE_POLARIZATION_LIMIT_KHZ = 50
// GHz field warning: skin depth in saline at 1 GHz ~13 mm; cannot penetrate cuvette. Gabriel 1996.
export const GHZ_FIELD_WARNING_V_CM = 100
