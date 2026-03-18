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

/** Newton surface cooling rate λ [1/s] — tissue cooling between pulses (empirical, ~0.02 s⁻¹) */
export const NEWTON_COOLING_LAMBDA = 0.02

/**
 * Pennes blood perfusion energy coefficient [J / (mL · °C)] used to convert
 * ω_b [mL/(g·min)] to [1/s] effective cooling: λ_perf = ω_b × PENNES_BLOOD_COEFF / cp.
 * Derived from ρ_blood(1050 kg/m³) × c_blood(3617 J/(kg·K)) / 60 s/min ≈ 63.3;
 * the value 63.9 is the literature-rounded figure used in Pennes (1948) re-analyses.
 */
export const PENNES_BLOOD_COEFF = 63.9

/** SAR waveform factor for CW sinusoidal field: E²_rms = E²_peak / 2 (Schwan 1957) */
export const WF_CW = 0.5

/** 2π — used in ω = 2πf and fc = 1/(2πτ) throughout the Schwan model */
export const TWO_PI = 2 * Math.PI

/** Epsilon for near-zero disruption-ratio (dimensionless 0–1 scale) zero-checks */
export const NEAR_ZERO_DR = 1e-9

/** Epsilon for near-zero transmembrane voltage [mV scale] zero-checks */
export const NEAR_ZERO_VM = 1e-12

/** SAR waveform factor for pulsed bipolar square wave: E²_rms = E²_peak (H-FIRE convention) */
export const WF_PULSED = 1.0

/** Mild thermal activation (MA) peak temperature [°C] — bell peak in the 37–42°C biomodulation window */
export const THERMAL_MA_PEAK_C = 41

/** Temperature update timer interval [ms] in the Newton-cooling session loop */
export const TEMP_UPDATE_INTERVAL_MS = 100

/** Guard: |cos θ| below this value is treated as near-perpendicular → return sentinel lysis field 1e6 V/cm */
export const MIN_COS_THETA = 0.01

/** Guard: minimum pulse envelope factor to prevent division artefacts (t_p → 0 limit) */
export const MIN_PULSE_ENVELOPE = 1e-4

/**
 * Upper frequency limit of the electrolytic (direct electrode contact) coupling regime [kHz].
 * Above this, the medium transitions from purely resistive to capacitive/reactive behaviour:
 * f_complex = σ / (2π ε₀ εᵣ) ≈ 338 MHz for saline (σ=1.5 S/m, εᵣ=80).
 * Standard cuvette wiring is replaced by near-field RF applicators or coaxial probes.
 * Ref: Foster & Schwan (1989) — Dielectric properties of tissues.
 */
export const FREQ_ELECTROLYTIC_LIMIT_KHZ = 300_000  // 300 MHz

/**
 * Upper frequency limit of the near-field RF coupling regime [kHz].
 * Above this, the in-medium wavelength (λ_water ≈ 3 cm at 1 GHz) approaches typical
 * electrode gaps and lumped-element circuit models fail entirely.
 * Waveguide, resonant cavity, or horn-antenna coupling is required.
 * Ref: Gabriel et al. (1996) — RF tissue dielectric data.
 */
export const FREQ_NEARFIELD_RF_LIMIT_KHZ = 1_000_000  // 1 GHz

// ── Dielectrophoresis (DEP) — Clausius-Mossotti model ────────────────────────

/**
 * Relative permittivity of aqueous medium (water / physiological saline) at 37°C.
 * Used in the DEP Clausius-Mossotti factor as the medium dielectric constant.
 * Ref: Gabriel et al. (1996) — frequency-dependent permittivity of biological tissues.
 */
export const EPSILON_R_MEDIUM_WATER = 80

/**
 * Effective cytoplasm relative permittivity — lower than bulk water due to macromolecular
 * crowding and reduced free-water fraction; literature range 50–80, nominal 60.
 * Ref: Pethig (2010) — Dielectrophoresis: Status of the theory, technology, and applications.
 */
export const EPSILON_R_CYTOPLASM = 60

/**
 * Intact cell membrane conductivity [S/m] — the lipid bilayer is nearly insulating at RF.
 * Literature range 10⁻⁸–10⁻⁶ S/m; nominal 10⁻⁷ S/m used here (Gascoyne & Vykoukal 2002).
 */
export const SIGMA_MEMBRANE_SI = 1e-7

// ── Biophysical model thresholds ─────────────────────────────────────────────

/**
 * All disruption ratio, temperature, selectivity, uncertainty, and classification
 * thresholds used across the Schwan model, TI analysis, charts, tooltips, and reports.
 * Single source of truth — imported directly by any domain that needs these values.
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
  LYSIS_PROB_SLOPE:    0.05,  // sigmoid steepness — smaller = sharper transition
  // ── Cell category radius boundaries (µm) ───────────────────────────────────
  RADIUS_VIRUS_MAX:    0.1,   // R < 0.1 µm → VIRUS classification
  RADIUS_BACTERIA_MAX: 2.0,   // 0.1 ≤ R < 2.0 µm → BACTERIA; R ≥ 2.0 µm → MAMMALIAN
  // ── Display caps ─────────────────────────────────────────────────────────────
  TI_DISPLAY_CAP:      99.9,  // TI display ceiling when healthy DR → 0
  // ── Nuclear membrane model ───────────────────────────────────────────────────
  NUCLEAR_VM_DEFAULT:  0.5,   // Default nuclear membrane threshold voltage [V] (Kotnik 2006)
  // ── σ_i uncertainty fractions per cell category (used in TI error bars) ─────
  UNCERTAINTY_VIRUS:    0.45, // ±45% — lipid envelope σ_i highly variable
  UNCERTAINTY_BACTERIA: 0.35, // ±35% — cytoplasm σ_i literature range
  UNCERTAINTY_MAMMALIAN: 0.20,// ±20% — well-characterised cytoplasm σ_i
  // ── BMS weighting coefficients (sum = 1.0) ───────────────────────────────────
  BMS_WEIGHT_SI:       0.55,  // sub-threshold stimulation index weight
  BMS_WEIGHT_MTE:      0.25,  // mechanical transduction efficiency weight
  BMS_WEIGHT_MA:       0.20,  // mild thermal activation weight
} as const

export type ThresholdKey = keyof typeof THRESHOLDS

/** Default acoustic Q factor when a preset does not specify capsidQ.
 *  Set to 2 (maximally damped) — most conservative fallback for viscoelastic biological targets.
 *  Rigid protein capsids may reach Q~30; peptidoglycan walls typically Q~3–4. */
export const DEFAULT_CAPSID_Q = 2
