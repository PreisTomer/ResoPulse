// Copyright © 2026 Tomer Preis. All rights reserved.
// Unauthorized copying or distribution is prohibited.

/**
 * Scientifically appropriate field/frequency defaults per target cell category.
 * Applied automatically when any cell preset is switched, mimicking a fresh experiment setup.
 *
 * All defaults are chosen so BOTH cells start in STABLE state (DR < 8%) at the
 * default orientation (θ = 60°, cosθ = 0.5). Researchers slide UP from this
 * zero-effect baseline to find the therapeutic window.
 *
 * Mammalian: 10 V/cm at 417 kHz, pulsed dc=1e-4, pw=100 µs.
 *   At 10 V/cm both hepatocyte and adenocarcinoma have DR < 2%, clearly STABLE.
 *   Verified safe (reference calculation at 10 V/cm):
 *   α = 3σ_e/(2σ_e+σ_i) = 1.286  (hepatocyte, saline)
 *   SAR_eff = σ_i·α²·E²·wf·dc/ρ ≈ 0.0079 W/kg  ·  T_ss ≈ 37.00°C ✓
 *
 * Bacteria: nsEP regime — pulse width ≪ τ (τ_ecoli ≈ 14 ns, τ_mrsa ≈ 3.2 ns).
 *   1000 V/cm at 500 MHz: ωτ ≫ 1 rolls off Vm to < 1 mV → DR ≈ 0 (STABLE).
 *   SAR_eff ≈ 5.1 W/kg (dc=1e-6)  ·  T_ss ≈ 37.06°C ✓
 *   Researcher slides field to ≥10 kV/cm to approach disruption.
 *
 * Virus: Resonance mode; capsid disruption via acoustic resonance.
 *   400 V/cm at f_res (≥12 GHz): Schwan Vm → 0 at GHz; DR ≈ 0 (STABLE).
 *   SAR_eff ≈ 0.014 W/kg  ·  T_ss ≈ 37.000°C ✓
 *   Auto-tuned to preset's resonantFreqGHz in applyTargetDefaults.
 */
// Re-exported from physics.ts - single source of truth for waveform factors
export { WF_CW as CW_WAVEFORM_FACTOR, WF_PULSED as PULSED_WAVEFORM_FACTOR } from '@/constants/physics'

/**
 * Initial field as a fraction of a preset's resonant threshold (applied when loading resonant presets).
 * Set to 5% so that at f = f_res (Lorentzian peak, L=1.0):
 *   DR = (0.05 × E_thr) / E_thr × 1.0 = 0.05  →  well below the 8% STABLE threshold.
 * Researchers slide UP from this zero-effect baseline.
 */
export const INITIAL_RESONANT_FIELD_FRACTION = 0.05

/** Duration [ms] for the snap-to-window confirmation button state before auto-reset */
export const SNAP_CONFIRM_MS = 3000

/** Default lysis N-pulses value applied on cell reset */
export const DEFAULT_LYSIS_N_PULSES = 10

/**
 * Default cell-field orientation angle θ [degrees] for random suspension experiments.
 * At θ = 60°, cosθ = 0.5, which equals the mean of |cosΩ| for a 3D isotropically
 * distributed suspension: <|cosΩ|> = ∫₀^π |cosΩ|·sinΩ/2 dΩ = 0.5.
 * Setting θ = 0° (maximum coupling) systematically overestimates Vm by 2× for
 * typical suspension experiments. Use 0° only for DEP-pre-aligned cell preparations.
 */
export const DEFAULT_ORIENTATION_DEG = 60

/** Sweep panel TI Y-axis display ceiling (separate from TI_DISPLAY_CAP in the store) */
export const SWEEP_TI_CAP = 5

export const CATEGORY_DEFAULTS = {
  mammalian: { fieldVcm: 10,   freqKHz: 417,      waveform: 'pulsed' as const, dutyCycle: 1e-4, pulseWidthNs: 100000, medium: 'saline' as const },
  bacteria:  { fieldVcm: 1000, freqKHz: 500000,   waveform: 'pulsed' as const, dutyCycle: 1e-6, pulseWidthNs: 10,     medium: 'saline' as const },
  // freqKHz is a last-resort fallback only. applyTargetDefaults() and sanitizeCategoryParams()
  // always override this with preset.resonantFreqGHz × 1e6 when the preset carries a resonant
  // frequency (all current virus presets do). If a future virus preset omits resonantFreqGHz,
  // the fallback of 12 GHz (= 12,000,000 kHz, Influenza f_res) puts the slider in the right
  // frequency decade rather than defaulting to a mammalian IRE value.
  virus:     { fieldVcm: 400,  freqKHz: 12000000, waveform: 'pulsed' as const, dutyCycle: 1e-6, pulseWidthNs: 10,     medium: 'saline' as const },
} as const
