// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import type { MeasuredOutcome } from '@resopulse/shared-types'

import type { LogEventType } from '@/constants/strings'

export type { MeasuredOutcome }

export type AppliedAiSuggestionSource = 'optimizer' | 'space-filling'

export interface AppliedAiSuggestion {
  source:    AppliedAiSuggestionSource
  freqKHz:   number
  fieldVcm:  number
  dutyCycle: number
}

// ── Parameter snapshot captured at log time ────────────────────────────────
export interface CellParamSnapshot {
  label: string
  category: string           // 'mammalian' | 'bacteria' | 'virus'
  radius: number             // µm
  membraneThickness: number  // nm
  dielectricConstant: number
  conductivity: number       // S/m  (cytoplasm)
  membraneConductivity: number  // S/m (lipid bilayer leakage; default 1e-7)
  density: number            // kg/m³
  specificHeatCapacity: number // J/(kg·K)
  thresholdVoltage: number   // V
  fc: number                 // kHz, corner frequency at log-time medium
  // Resonance fields (virus / bacteria in resonance mode)
  resonantFreqGHz?: number
  capsidQ?: number
  capsidQMin?: number
  capsidQMax?: number
  resonantThresholdVcm?: number
  resonantFreqUncertaintyPct?: number
  experimentalBasis?: string
  // Nuclear envelope (double-shell model)
  nuclearRadius?: number
  nuclearMembraneThickness?: number
  nuclearMembraneEps?: number
  nucleoplasmConductivity?: number
}

export interface LogEntry {
  id: number
  sessionName?: string    // snapshot of session name at log time
  timestamp: string       // HH:mm:ss
  freqKHz: number
  fieldVcm: number
  medium: string
  targetPreset: string    // e.g. 'adenocarcinoma'
  healthyVm: number       // mV
  targetVm: number        // mV
  selectivity: number     // ratio
  healthyRatio: number    // fraction (0-n)
  targetRatio: number
  healthyTemp: number     // °C
  targetTemp: number
  event: LogEventType
  // ── Full parameter snapshot (captured at log time) ──────────────────────
  chartMode?: 'schwan' | 'resonance'
  waveform?: string
  dutyCycle?: number
  pulseWidthNs?: number
  lysisNPulses?: number
  orientationDeg?: number
  doubleShellEnabled?: boolean
  sigmaE?: number                // effective σe at log time [S/m]
  mediumBaseS?: number           // base σe,0 at reference T [S/m]
  mediumTempCoeff?: number       // temperature coefficient [1/°C]
  mediumPermittivity?: number    // ε_r of medium (for DEP)
  perfusionRate?: number         // ω_b [mL/(g·min)]; 0 = in vitro
  cellPackingFraction?: number   // φ Maxwell-Garnett correction
  sampleDescription?: string     // user-provided sample context
  healthyNuclearVm?: number      // mV
  targetNuclearVm?: number       // mV
  depHealthyK?: number           // Re[K] at log-time frequency
  depTargetK?: number            // Re[K] at log-time frequency
  depHealthyCrossoverKHz?: number
  depTargetCrossoverKHz?: number
  healthySnap?: CellParamSnapshot
  targetSnap?: CellParamSnapshot
  // ── Biomodulation score (healthy cell; only meaningful when DR_H < 50%) ──
  healthyBiomodScore?: number    // 0–1 weighted SI/MTE/MA composite
  // ── AI training fields (populated via Log Outcome action) ────────────────
  outcomeRating?: number         // 1=failed 2=poor 3=acceptable 4=good 5=excellent
  aiSuggestionApplied?: boolean  // true when this protocol was AI-suggested before the run
  // Snapshot of the AI/space-filling suggestion that was active at log time. Lets the CSV/Reports
  // surface "AI proposed X, lab actually ran X'" delta after the user modified sliders before running.
  appliedAiSuggestion?: AppliedAiSuggestion
  // ── Measured outcome (populated via Log Measured action) ─────────────────
  measured?: MeasuredOutcome
  // When true, the entry's residuals are excluded from calibrationSummary even
  // if a measured outcome is attached (e.g. the user flagged this run as a
  // bench outlier after a pump failure or a cross-contamination incident).
  excludedFromCalibration?: boolean
}
