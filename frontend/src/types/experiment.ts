// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import type { LogEventType } from '@/constants/strings'

// ── Parameter snapshot captured at log time ────────────────────────────────
export interface CellParamSnapshot {
  label: string
  category: string           // 'mammalian' | 'bacteria' | 'virus'
  radius: number             // µm
  membraneThickness: number  // nm
  dielectricConstant: number
  conductivity: number       // S/m
  thresholdVoltage: number   // V
  fc: number                 // kHz — corner frequency at log-time medium
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
  healthyNuclearVm?: number      // mV
  targetNuclearVm?: number       // mV
  depHealthyK?: number           // Re[K] at log-time frequency
  depTargetK?: number            // Re[K] at log-time frequency
  depHealthyCrossoverKHz?: number
  depTargetCrossoverKHz?: number
  healthySnap?: CellParamSnapshot
  targetSnap?: CellParamSnapshot
}
