/**
 * Scientifically appropriate field/frequency defaults per target cell category.
 * Applied automatically when the target cell type is switched,
 * mimicking a "new experiment" context.
 *
 * Values are chosen so T_ss < 38°C for the healthy reference cell (hepatocyte)
 * at every default — researcher can slide UP from a safe starting point.
 *
 * Mammalian: standard IRE sub-threshold exploration.
 *   150 V/cm pulsed dc=0.01%:  SAR_eff ≈ 1.1 W/kg → T_ss ≈ 37.02°C ✓
 *
 * Bacteria: nsEP regime — pulse width ≪ τ (τ_ecoli ≈ 14 ns, τ_mrsa ≈ 3 ns).
 *   1000 V/cm pulsed dc=1e-6: SAR_eff ≈ 0.079 W/kg → T_ss ≈ 37.001°C ✓
 *   Researcher slides field to ≥10 kV/cm to approach lysis — thermal warnings appear.
 *
 * Virus: Resonance mode (IRE inapplicable); capsid disruption via acoustic resonance.
 *   400 V/cm pulsed dc=1e-6 @ 12 GHz (influenza f_res): minimal thermal footprint.
 *   Auto-tuned to preset's resonantFreqGHz in applyTargetDefaults.
 */
export const CATEGORY_DEFAULTS = {
  mammalian: { fieldVcm: 150,  freqKHz: 417,       waveform: 'pulsed' as const, dutyCycle: 1e-4, pulseWidthNs: 100000, medium: 'saline' as const },
  bacteria:  { fieldVcm: 1000, freqKHz: 500000,    waveform: 'pulsed' as const, dutyCycle: 1e-6, pulseWidthNs: 10,     medium: 'saline' as const },
  virus:     { fieldVcm: 400,  freqKHz: 12000000,  waveform: 'pulsed' as const, dutyCycle: 1e-6, pulseWidthNs: 10,     medium: 'saline' as const },
} as const
