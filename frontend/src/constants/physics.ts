// Copyright © 2026 Tomer Preis. All rights reserved.
// Unauthorized copying or distribution is prohibited.

/**
 * Shared physics and thermal constants for the ResoPulse simulation engine.
 *
 * All values are sourced from peer-reviewed biophysics literature and are
 * the single source of truth used by cellStore, physics utils, and SweepPanel.
 */

/** Schwan single-shell sphere geometric factor: 3/2 (exact for a sphere, see Schwan 1957) */
export const SCHWAN_SPHERE_FACTOR = 1.5

/** Normal human body temperature [°C] (ISO 80601-2-56; used as thermal baseline T₀) */
export const BODY_TEMP_C = 37

/** Newton surface cooling rate λ [1/s] - tissue cooling between pulses (empirical, ~0.02 s⁻¹) */
export const NEWTON_COOLING_LAMBDA = 0.02

/**
 * Pennes blood perfusion energy coefficient [J / (mL · °C)] used to convert
 * ω_b [mL/(g·min)] to [1/s] effective cooling: λ_perf = ω_b × PENNES_BLOOD_COEFF / cp.
 * Derived from ρ_blood(1060 kg/m³) × c_blood(3617 J/(kg·K)) / 60 s/min ≈ 63.9;
 * the value 63.9 is the literature-rounded figure used in Pennes (1948) re-analyses.
 */
export const PENNES_BLOOD_COEFF = 63.9

/** SAR waveform factor for CW sinusoidal field: E²_rms = E²_peak / 2 (Schwan 1957) */
export const WF_CW = 0.5

/** 2π - used in ω = 2πf and fc = 1/(2πτ) throughout the Schwan model */
export const TWO_PI = 2 * Math.PI

/** Epsilon for near-zero disruption-ratio (dimensionless 0-1 scale) zero-checks */
export const NEAR_ZERO_DR = 1e-9

/** Epsilon for near-zero transmembrane voltage [mV scale] zero-checks */
export const NEAR_ZERO_VM = 1e-12

/** SAR waveform factor for pulsed bipolar square wave: E²_rms = E²_peak (H-FIRE convention) */
export const WF_PULSED = 1.0

/**
 * Effective lysis-threshold multiplier for H-FIRE (bipolar) vs monopolar pulsed delivery.
 * Bipolar charge cancellation per reversal raises the effective pore-nucleation threshold
 * by 1.5-2.0× (midpoint 1.75 used here).
 * Ref: Sano et al. (2018) Sci Rep; Dong et al. (2018) IEEE Trans Biomed Eng
 */
export const H_FIRE_THRESHOLD_MULTIPLIER = 1.75

/** Mild thermal activation (MA) peak temperature [°C] - bell peak in the 37-42°C biomodulation window */
export const THERMAL_MA_PEAK_C = 41

/** Temperature update timer interval [ms] in the Newton-cooling session loop */
export const TEMP_UPDATE_INTERVAL_MS = 100

/** Guard: |cos θ| below this value is treated as near-perpendicular → lysis field is undefined. */
export const MIN_COS_THETA = 0.01

/** Sentinel value returned by lysisField() when θ → 90° (perpendicular orientation).
 *  Any display code must detect this and render 'N/A' rather than a raw kV/cm string. */
export const LYSIS_FIELD_SENTINEL = 1e6

/** Guard: minimum pulse envelope factor to prevent division artefacts (t_p → 0 limit) */
export const MIN_PULSE_ENVELOPE = 1e-4

/**
 * Electroporation threshold temperature coefficient [1/°C].
 * Vth decreases with temperature (linear first-order approximation to pore-nucleation kinetics):
 * Vth_eff = Vth × max(TEMP_EP_CLAMP_MIN, 1 − TEMP_EP_COEFF × (T − 37))
 * Empirical: ~−0.3%/°C above 37°C. Ref: Weaver & Chizmadzhev (1996);
 * DeBruin & Krassowska (1999) — KATP channel activation model.
 */
export const TEMP_EP_COEFF = 0.003

/** Lower clamp for Vth correction to prevent unphysical zero/negative threshold at high T. */
export const TEMP_EP_CLAMP_MIN = 0.70

/**
 * Upper frequency limit of the electrolytic (direct electrode contact) coupling regime [kHz].
 * Above this, the medium transitions from purely resistive to capacitive/reactive behaviour:
 * f_complex = σ / (2π ε₀ εᵣ) ≈ 338 MHz for saline (σ=1.5 S/m, εᵣ=80).
 * Standard cuvette wiring is replaced by near-field RF applicators or coaxial probes.
 * Ref: Foster & Schwan (1989) - Dielectric properties of tissues.
 */
export const FREQ_ELECTROLYTIC_LIMIT_KHZ = 300_000  // 300 MHz

/**
 * Upper frequency limit of the near-field RF coupling regime [kHz].
 * Above this, the in-medium wavelength (λ_water ≈ 3 cm at 1 GHz) approaches typical
 * electrode gaps and lumped-element circuit models fail entirely.
 * Waveguide, resonant cavity, or horn-antenna coupling is required.
 * Ref: Gabriel et al. (1996) - RF tissue dielectric data.
 */
export const FREQ_NEARFIELD_RF_LIMIT_KHZ = 1_000_000  // 1 GHz

// ── Dielectrophoresis (DEP) - Clausius-Mossotti model ────────────────────────

/**
 * Relative permittivity of aqueous medium (water / physiological saline) at 37°C.
 * Used in the DEP Clausius-Mossotti factor as the medium dielectric constant.
 * Ref: Gabriel et al. (1996) - frequency-dependent permittivity of biological tissues.
 */
export const EPSILON_R_MEDIUM_WATER = 80

/**
 * Effective cytoplasm relative permittivity - lower than bulk water due to macromolecular
 * crowding and reduced free-water fraction; literature range 50-80, nominal 60.
 * Ref: Pethig (2010) - Dielectrophoresis: Status of the theory, technology, and applications.
 */
export const EPSILON_R_CYTOPLASM = 60

/**
 * Intact cell membrane conductivity [S/m] - the lipid bilayer is nearly insulating at RF.
 * Literature range 10⁻⁸ - 10⁻⁶ S/m; nominal 10⁻⁷ S/m used here (Gascoyne & Vykoukal 2002).
 */
export const SIGMA_MEMBRANE_SI = 1e-7

// ── Biophysical model thresholds ─────────────────────────────────────────────

/**
 * All disruption ratio, temperature, selectivity, uncertainty, and classification
 * thresholds used across the Schwan model, TI analysis, charts, tooltips, and reports.
 * Single source of truth - imported directly by any domain that needs these values.
 */
export const THRESHOLDS = {
  // ── Disruption ratio (DR = Vm × f_pulse / V_threshold) ──────────────────────
  DISRUPTION_WARN:     0.85,  // DR above which lysis countdown arms (IRE onset)
  HEALTHY_CRITICAL:    0.85,  // healthy cell: electroporation pore-formation imminent
  HEALTHY_APPROACHING: 0.50,  // healthy cell: membrane stress / ion channel perturbation onset
  NOURISHING:          0.45,  // healthy-cell nourishing state onset (sub-threshold biomodulation)
  VIBRATING_MIN:       0.08,  // healthy-cell low-vibration onset
  // ── Temperature (°C) ────────────────────────────────────────────────────────
  TEMP_WARN:           42,    // hyperthermic safety limit (IAHT standard)
  TEMP_DENATURING:     60,    // protein denaturation onset (collagen ~60°C, albumin ~68°C)
  TEMP_VAPORIZING:     100,   // water boiling / rapid steam-driven cell lysis
  TEMP_CAP:            150,   // simulation display ceiling
  // ── Therapeutic Index TI = DR_T / DR_H  (sweep analysis) ───────────────────
  TI_STRONG:           2.0,   // TI above which the sweep window is therapeutically strong
  TI_MARGINAL:         1.2,   // TI above which the window is marginal (below = poor selectivity)
  // ── Vm selectivity Sel = Vm_T / Vm_H  (panel badges & reports) ─────────────
  SEL_STRONG:          1.5,   // Sel above which selectivity badge is green
  SEL_MARGINAL:        1.0,   // Sel above which badge is amber (below = non-selective)
  // ── Lysis probability sigmoid  P = 1 / (1 + exp(−(DR − center) / slope)) ───
  LYSIS_PROB_CENTER:   1.0,   // DR at which P(lysis) = 50%
  LYSIS_PROB_SLOPE:    0.05,  // sigmoid steepness, smaller = sharper transition
  // ── Cell category radius boundaries (µm) ───────────────────────────────────
  RADIUS_VIRUS_MAX:    0.1,   // R < 0.1 µm → VIRUS classification
  RADIUS_BACTERIA_MAX: 2.0,   // 0.1 ≤ R < 2.0 µm → BACTERIA; R ≥ 2.0 µm → MAMMALIAN
  // ── Display caps ─────────────────────────────────────────────────────────────
  TI_DISPLAY_CAP:      99.9,  // TI display ceiling when healthy DR → 0
  // ── Nuclear membrane model ───────────────────────────────────────────────────
  NUCLEAR_MEMBRANE_THICKNESS_NM: 15,   // Default nuclear envelope thickness [nm] (Bhatt et al. 2021)
  NUCLEAR_MEMBRANE_EPS:           10,   // Default nuclear envelope relative permittivity (Kotnik 2006)
  NUCLEOPLASM_CONDUCTIVITY:        0.9, // Default nucleoplasm conductivity [S/m] (Kotnik 2006)
  NUCLEAR_VM_DEFAULT:              0.5, // Default nuclear membrane threshold voltage [V] (Kotnik 2006)
  // ── σ_i uncertainty fractions per cell category (used in TI error bars) ─────
  UNCERTAINTY_VIRUS:    0.45, // ±45%, lipid envelope σ_i highly variable
  UNCERTAINTY_BACTERIA: 0.35, // ±35%, cytoplasm σ_i literature range
  UNCERTAINTY_MAMMALIAN: 0.20,// ±20%, well-characterised cytoplasm σ_i
  // ── BMS weighting coefficients (sum = 1.0) ───────────────────────────────────
  BMS_WEIGHT_SI:       0.55,  // sub-threshold stimulation index weight
  BMS_WEIGHT_MTE:      0.25,  // mechanical transduction efficiency weight
  BMS_WEIGHT_MA:       0.20,  // mild thermal activation weight
} as const

export type ThresholdKey = keyof typeof THRESHOLDS

// ── Population size distribution (log-normal cell radius CV) ─────────────────

/**
 * Coefficient of variation (CV = σ_R / R_mean) for cell radius in a real suspension.
 * Log-normal is the standard model for mammalian cell size distributions.
 * Ref: Tzur et al. (2009) Science 325:167 - single-cell size tracking;
 *      Altschuler & Wu (2010) Cell 141:559 - phenotypic variability review.
 */
/** Mammalian cell line radius CV (~20-30%; nominal 25%). */
export const POP_CV_MAMMALIAN = 0.25
/** Bacterial cell radius CV (~20-25%; nominal 22%). */
export const POP_CV_BACTERIA  = 0.22
/** Viral capsid radius CV (~5-10%; icosahedral uniformity; nominal 8%). */
export const POP_CV_VIRUS     = 0.08

// ── Reversible EP membrane resealing model ───────────────────────────────────

/**
 * Reference membrane resealing time [s] at T=37°C, DR=0.675 (mid rev-EP window), 1 pulse.
 * From fast-resealing component (~80% of pores); slow component is O(minutes).
 * Empirical: Rols & Teissie (1990) Biochim. Biophys. Acta 1025:123;
 * Weaver & Chizmadzhev (1996) Bioelectrochemistry 41:135.
 */
export const RESEAL_TIME_REF_S = 5.0

/** Reference DR for resealing time normalisation — midpoint of rev-EP window (50-85%). */
export const RESEAL_DR_REF = 0.675

/** Power-law exponent for DR scaling of resealing time — steeper near lysis threshold. */
export const RESEAL_DR_EXPONENT = 2.5

/**
 * Temperature acceleration coefficient for resealing [1/°C].
 * Arrhenius-like: τ_reseal × exp(−RESEAL_TEMP_COEFF × (T − 37)).
 * Faster resealing at elevated T, consistent with increased membrane fluidity.
 * Empirical: ~6%/°C above 37°C from Rols & Teissie (1990).
 */
export const RESEAL_TEMP_COEFF = 0.06

/** Sublinear pulse-count scaling exponent for resealing time — cumulative pore burden. */
export const RESEAL_PULSE_EXPONENT = 0.3

/** Minimum clamp for resealing time display [s] — below this pores reseal transiently. */
export const RESEAL_TIME_MIN_S = 0.5

/** Maximum clamp for resealing time display [s] — above this pore damage is effectively permanent. */
export const RESEAL_TIME_MAX_S = 60.0

/** Default acoustic Q factor when a preset does not specify capsidQ.
 *  Set to 2 (maximally damped) - most conservative fallback for viscoelastic biological targets.
 *  Rigid protein capsids may reach Q~30; peptidoglycan walls typically Q~3-4. */
export const DEFAULT_CAPSID_Q = 2

// ── Electromagnetic constants ─────────────────────────────────────────────────

/**
 * Vacuum permeability [H/m] — used in EM skin depth formula δ = √(1/(π·f·μ₀·σ)).
 * Exact value (pre-2019 SI definition); post-2019 value differs by < 1 ppm.
 * Ref: CODATA 2018.
 */
export const MU_0 = 4 * Math.PI * 1e-7

// ── Population lysis integration parameters ───────────────────────────────────

/**
 * Number of trapezoid steps for log-normal population lysis fraction integration.
 * 61-point trapezoidal rule (i = 0..60) over ±POP_LYSIS_GAUSS_Z_MAX sigma.
 * Converges to < 0.1% error for smooth P(lysis) curves.
 */
export const POP_LYSIS_GAUSS_N = 60

/**
 * Half-width of the integration domain in standard deviations.
 * ±4.5σ covers > 99.999% of the log-normal distribution — truncation error negligible.
 */
export const POP_LYSIS_GAUSS_Z_MAX = 4.5

// ── Unit conversion factors ───────────────────────────────────────────────────

/** Converts field intensity from V/cm (display unit) to V/m (SI unit). */
export const V_CM_TO_V_M = 100

/** Converts frequency from kHz (store unit) to Hz (SI unit). */
export const KHZ_TO_HZ = 1e3

/** Converts nanoseconds to seconds. */
export const NS_TO_S = 1e-9

/** Converts nanoseconds to milliseconds (1 ms = 1e6 ns). */
export const NS_TO_MS = 1e-6

/** Converts milliseconds to seconds. */
export const MS_TO_S = 1e-3

/** Converts J/m³ to mJ/cm³ — standard IRE energy dose unit (1 J/m³ = 1e-3 mJ/cm³). */
export const J_M3_TO_MJ_CM3 = 1e-3

// ── Medium and lysis timing constants ────────────────────────────────────────

/** Density of aqueous media (saline, DMEM, PBS) [kg/m³]. Ref: CRC Handbook. */
export const RHO_AQUEOUS_KG_M3 = 1000

/** Lysis countdown for CW mode [ms] — 2.5 s is the standard IRE observation window. */
export const LYSIS_DELAY_CW_MS = 2500

/** Maximum pulsed-mode lysis delay [ms] — clamp ensures the countdown stays within 30 s. */
export const LYSIS_DELAY_MAX_MS = 30_000

/**
 * Frequency below which electrode double-layer polarization significantly distorts Vm estimates [kHz].
 * At sub-50 kHz, the electrode-solution interface Cdl (10-50 µF/cm²) absorbs a measurable voltage
 * fraction; displayed Vm and DR are overestimates without a Cdl-corrected equivalent circuit.
 * Ref: Foster and Schwan (1989); Schwan (1966) electrode polarization review.
 */
export const ELECTRODE_POLARIZATION_LIMIT_KHZ = 50

/**
 * Field intensity threshold above which GHz operation is flagged as physically inaccessible [V/cm].
 * Delivering > 100 V/cm at > 1 GHz requires RF waveguide coupling; skin depth in saline at 1 GHz
 * is ~13 mm, falling to ~0.8 mm at 12 GHz — the field cannot penetrate a standard cuvette.
 * Ref: Gabriel et al. (1996); Tsen et al. (2007).
 */
export const GHZ_FIELD_WARNING_V_CM = 100
