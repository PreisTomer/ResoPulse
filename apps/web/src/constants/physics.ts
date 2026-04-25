// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// Physics and thermal constants. Single source of truth for cellStore, physics utils, and SweepPanel.

// Schwan single-shell sphere geometric factor: 3/2 (Schwan 1957)
export const SCHWAN_SPHERE_FACTOR = 1.5

// Thermal baseline T₀ [°C]
export const BODY_TEMP_C = 37

// Newton surface cooling rate λ [1/s] (empirical, ~0.02 s⁻¹)
export const NEWTON_COOLING_LAMBDA = 0.02

// Blood density [kg/m³] — Pennes 1948
export const BLOOD_DENSITY_KG_M3 = 1060
// Blood specific heat [J/(kg·K)] — Pennes 1948
export const BLOOD_SPECIFIC_HEAT_J_KGK = 3617
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

// H-FIRE bipolar charge cancellation raises Vth ~1.5-2× vs unipolar IRE (Arena 2011, Sano 2015); 1.75 = midpoint.
export const H_FIRE_THRESHOLD_MULTIPLIER = 1.75

// Mild thermal activation peak temperature [°C] — bell peak in 37-42°C biomodulation window
export const THERMAL_MA_PEAK_C = 41

// Lower boundary of the "nourishing" thermal zone [°C] — above this, mild thermal activation kicks in
export const THERM_NOURISH_ENTER_C = 38.5

// Temperature update interval [ms] in Newton-cooling session loop
export const TEMP_UPDATE_INTERVAL_MS = 100

// |cos θ| below this is treated as near-perpendicular → lysis field undefined
export const MIN_COS_THETA = 0.01

// Sentinel returned by lysisField() when θ→90°. Callers must render 'N/A' for this value.
export const LYSIS_FIELD_SENTINEL = 1e6

// Minimum pulse envelope factor to prevent division artefacts (t_p→0 limit)
export const MIN_PULSE_ENVELOPE = 1e-4

// EP Vth temp coeff [1/°C], ~−0.3%/°C — linearised Q₁₀≈1.3 pore nucleation (Weaver & Chizmadzhev 1996) over 37-60°C.
export const TEMP_EP_COEFF = 0.003

// Lower clamp for Vth temperature correction — prevents unphysical zero/negative threshold.
export const TEMP_EP_CLAMP_MIN = 0.70

// Electrosensitization exponent: Vth_eff = Vth·N^(−α) (EP only; Weaver 1996, Pakhomov 2010). α=0.20 ±0.05 cell-dependent.
export const ELECTROSENSITIZATION_EXPONENT = 0.20

// Minimum threshold factor from electrosensitization — prevents unphysical sub-physiological threshold.
// At N=100 and α=0.20 the raw factor is 0.40, so the clamp only engages for very large N.
export const ELECTROSENSITIZATION_CLAMP_MIN = 0.35

// Smallest N at which N^(−α) reaches the floor; beyond this, additional pulses do not further
// reduce the lysis threshold. Derived from clamp = N^(−α) → N = clamp^(−1/α).
export const ELECTROSENSITIZATION_FLOOR_N = Math.ceil(Math.pow(ELECTROSENSITIZATION_CLAMP_MIN, -1 / ELECTROSENSITIZATION_EXPONENT))

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

// R/d < 50 → thin-shell γ deviates >6%; triggers UI caveat for viruses (Kotnik & Miklavcic 2000).
export const THIN_SHELL_RATIO_WARN = 50

// ── Debye dielectric relaxation of aqueous media (Kaatze 1989; Debye 1929) ─── f_D ≈ 19 GHz @ 37 °C.

// Water infinite-frequency (optical) relative permittivity — Kaatze 1989.
export const EPS_INF_AQUEOUS = 5

// Debye relaxation time of pure water at 37 °C [s] — Kaatze 1989 (τ_D ≈ 8.3 ps).
export const DEBYE_TAU_AQUEOUS_S = 8.3e-12

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
  // Window score = P_T × (1 − P_H); thresholds for colour coding
  WINDOW_SCORE_GOOD:     0.5,
  WINDOW_SCORE_MARGINAL: 0.2,
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
  BMS_NOURISHING:      0.55,  // minimum biomod score for nourishing cell state
  BMS_TAPER_LO:        0.40,  // start of smoothstep taper — biomod score begins rolling off
  BMS_TAPER_HI:        0.55,  // end of taper — biomod score reaches 0 as EP onset dominates
  // SI bell curve: SI = 4·r·(1−r), r = DR / NOURISHING; peak at r=0.5 → DR = NOURISHING/2 ≈ 22.5%
  BIOSTIM_DR_OPT_LOW_PCT:  5,   // lower bound of the optimal SI stimulation window (% of lysis thr)
  BIOSTIM_DR_OPT_HIGH_PCT: 40,  // upper bound of the optimal SI stimulation window (% of lysis thr)
  // MTE coupling: 1/√(1+(f/fc)²) ≥ MTE_COUPLING_THRESHOLD requires f ≤ fc × factor
  MTE_COUPLING_THRESHOLD_PCT: 70,  // minimum acceptable coupling efficiency (%)
  // Population panel success note: minimum target lysis fraction [%] to show the "success window" note
  POP_NOTE_TARGET_LYSIS_MIN: 50,
  // Model calibration tiers — compare simulator predictions with measured outcomes.
  // n=5 = FDA bioanalytical-validation floor and aligns with the σ_i fit gate (SIGMA_CALIB_MIN_SAMPLES).
  // n=10 = early-signal "strong" tier; full validation in the field is n≥20–30.
  // 15pp = half-prediction drift; 5pp = noise floor of well-run flow / PI-uptake assays.
  // Tier uses RMSE (combined bias+scatter) so a single outlier-free spread cannot read as "strong".
  CALIB_MIN_SAMPLES:     5,
  CALIB_STRONG_SAMPLES:  10,
  CALIB_DRIFT_PP:        15,
  CALIB_STRONG_PP:        5,
  // Per-cell σ_i fit gates — mirror apps/ai-service CALIBRATION_* constants
  SIGMA_CALIB_MIN_SAMPLES: 5,     // below this, fit is not persisted; UI shows "collecting data"
  SIGMA_CALIB_MULT_MIN:    0.3,   // biological plausibility lower bound on σ_i multiplier
  SIGMA_CALIB_MULT_MAX:    3.0,   // biological plausibility upper bound on σ_i multiplier
} as const

export type ThresholdKey = keyof typeof THRESHOLDS

// ── Population size distribution (log-normal cell radius CV) ─────────────────
// Ref: Tzur et al. (2009) Science 325:167; Altschuler & Wu (2010) Cell 141:559

export const POP_CV_MAMMALIAN = 0.25  // radius CV ~20-30%; nominal 25%
export const POP_CV_BACTERIA  = 0.12  // radius CV ~10-12% for log-phase cultures; nominal 12% (Tzur et al. 2009)
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

// Default capsid Q=3 (peptidoglycan lower bound; rigid virus capsids ~30). Every preset sets this explicitly.
export const DEFAULT_CAPSID_Q = 3

// ── Electromagnetic constants ─────────────────────────────────────────────────

// Vacuum permittivity [F/m]. CODATA 2018.
export const EPSILON_0 = 8.854187817e-12

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

// ── Impedance feedback display thresholds ────────────────────────────────────

// Impedance drift severity [%] — negative drift = σ_e rose from ion release
export const DRIFT_WARN_PCT   = 5    // warn at ≥5% drift
export const DRIFT_DANGER_PCT = 15   // danger at ≥15% drift
// Scale factor for the drift bar: bar width% = |drift%| × DRIFT_BAR_SCALE (caps at 100%)
export const DRIFT_BAR_SCALE = 3

// Field corrector: voltage-divider correction severity [%]
export const CORRECTION_PCT_OK     = 2   // negligible correction below 2%
export const CORRECTION_PCT_WARN   = 5   // factor row highlight above 5%
export const CORRECTION_PCT_NEEDED = 8   // correction actively needed above 8%

// VSWR thresholds for RF power delivery (standard coaxial matching criteria)
export const VSWR_OK   = 2   // VSWR ≤ 2:1 acceptable
export const VSWR_WARN = 5   // VSWR ≤ 5:1 marginal

// Power delivery efficiency thresholds (η = 1 − |Γ|²)
export const POWER_EFFICIENCY_OK   = 0.90  // ≥90% good
export const POWER_EFFICIENCY_WARN = 0.75  // ≥75% marginal; below → danger

// Conductivity delta threshold: |Δσ_e| above which lysis-induced rise is visible [S/m]
export const CONDUCTIVITY_DELTA_WARN_S_M = 0.001

// ── Sonification (auditory display) pitch mapping ────────────────────────────

// Auditory display pitch range [Hz]: impedance drift maps linearly to [MIN, MIN+RANGE]
export const SONIF_PITCH_MIN_HZ   = 220   // A3 — minimum pitch
export const SONIF_PITCH_RANGE_HZ = 1540  // spans A3 (220 Hz) to A6 (1760 Hz)

// ── Medium and lysis timing constants ────────────────────────────────────────

export const RHO_AQUEOUS_KG_M3 = 1000  // density of aqueous media [kg/m³]. CRC Handbook.
export const LYSIS_DELAY_CW_MS = 2500   // CW lysis countdown — 2.5 s standard IRE window
export const LYSIS_DELAY_MAX_MS = 30_000 // max pulsed-mode lysis delay [ms]
// Below 50 kHz, electrode double-layer (Cdl) absorbs measurable voltage fraction. Foster 1989.
export const ELECTRODE_POLARIZATION_LIMIT_KHZ = 50
// GHz field warning: skin depth in saline at 1 GHz ~13 mm; cannot penetrate cuvette. Gabriel 1996.
export const GHZ_FIELD_WARNING_V_CM = 100

// Schwan/IRE advisory ceiling [kHz]: above 100 MHz the single-shell RC model breaks for small microbes at GHz.
export const SCHWAN_ADVISORY_FREQ_KHZ = 100_000
