/**
 * Scientifically appropriate field/frequency defaults per target cell category.
 * Applied automatically when the target cell type is switched,
 * mimicking a "new experiment" context.
 *
 * Values are chosen so T_ss < 38°C for the healthy reference cell (hepatocyte)
 * at every default — researcher can slide UP from a safe starting point.
 *
 * Mammalian: standard IRE sub-threshold exploration.
 *   150 V/cm pulsed (bipolar sq-wave) dc=0.01%:
 *   α = 3σ_e/(2σ_e+σ_i) = 1.286  (hepatocyte, saline)
 *   SAR_peak = σ_i·α²·E²·wf/ρ ≈ 177 kW/kg  ·  SAR_eff = SAR_peak×dc ≈ 17.7 W/kg
 *   T_ss = 37 + 17.7/(λ·cp) = 37 + 17.7/70 ≈ 37.25°C ✓  (λ=0.02 s⁻¹, cp=3500 J/kg·K)
 *
 * Bacteria: nsEP regime — pulse width ≪ τ (τ_ecoli ≈ 14 ns, τ_mrsa ≈ 3.2 ns).
 *   1000 V/cm pulsed dc=1e-6:
 *   α ≈ 1.36  (E. coli, saline)  ·  SAR_eff ≈ 5.1 W/kg  ·  T_ss ≈ 37.06°C ✓
 *   Researcher slides field to ≥10 kV/cm to approach lysis — thermal warnings appear.
 *
 * Virus: Resonance mode (IRE inapplicable); capsid disruption via acoustic resonance.
 *   400 V/cm pulsed dc=1e-6 @ f_res (influenza 12 GHz):
 *   σ_i ≈ 0.005 S/m (lipid envelope)  ·  SAR_eff ≈ 0.014 W/kg  ·  T_ss ≈ 37.000°C ✓
 *   Auto-tuned to preset's resonantFreqGHz in applyTargetDefaults.
 */
/** Waveform factors for SAR display (wf in SAR = σ_i·α²·E²·wf/ρ) */
export const CW_WAVEFORM_FACTOR     = 0.5
export const PULSED_WAVEFORM_FACTOR = 1.0

/** Initial field as a fraction of a preset's resonant threshold (applied when loading resonant presets) */
export const INITIAL_RESONANT_FIELD_FRACTION = 0.5

/** Duration [ms] for the snap-to-window confirmation button state before auto-reset */
export const SNAP_CONFIRM_MS = 3000

/** Default lysis N-pulses value applied on cell reset */
export const DEFAULT_LYSIS_N_PULSES = 10

/** Sweep panel TI Y-axis display ceiling (separate from TI_DISPLAY_CAP in the store) */
export const SWEEP_TI_CAP = 5

export const CATEGORY_DEFAULTS = {
  mammalian: { fieldVcm: 150,  freqKHz: 417,       waveform: 'pulsed' as const, dutyCycle: 1e-4, pulseWidthNs: 100000, medium: 'saline' as const },
  bacteria:  { fieldVcm: 1000, freqKHz: 500000,    waveform: 'pulsed' as const, dutyCycle: 1e-6, pulseWidthNs: 10,     medium: 'saline' as const },
  virus:     { fieldVcm: 400,  freqKHz: 12000000,  waveform: 'pulsed' as const, dutyCycle: 1e-6, pulseWidthNs: 10,     medium: 'saline' as const },
} as const
