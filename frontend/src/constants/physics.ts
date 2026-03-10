/**
 * Shared physics and thermal constants for the BioResonance simulation engine.
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
