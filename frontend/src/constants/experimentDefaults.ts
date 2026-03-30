// Copyright © 2026 Tomer Preis. All rights reserved.
// Unauthorized copying or distribution is prohibited.

// Category defaults: chosen so both cells start in STABLE state (DR < 8%) at θ = 60°.
// Researchers slide UP from this zero-effect baseline to find the therapeutic window.
// Re-exported from physics.ts - single source of truth for waveform factors
export { WF_CW as CW_WAVEFORM_FACTOR, WF_PULSED as PULSED_WAVEFORM_FACTOR } from '@/constants/physics'

// Initial field = 5% of resonant threshold so DR=0.05 at f_res (well below 8% STABLE threshold)
export const INITIAL_RESONANT_FIELD_FRACTION = 0.05

export const SNAP_CONFIRM_MS     = 3000  // snap-to-window button confirmation duration [ms]
export const DEFAULT_LYSIS_N_PULSES = 10

// θ=60° → cosθ=0.5 = mean of |cosΩ| for 3D isotropic suspension; avoids 2× overestimate at θ=0°
export const DEFAULT_ORIENTATION_DEG = 60

export const SWEEP_TI_CAP = 5  // sweep panel TI Y-axis display ceiling

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
