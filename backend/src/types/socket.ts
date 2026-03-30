// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

export interface StatePacket {
  freqKHz:             number
  fieldVcm:            number
  medium:              string
  dutyCycle:           number
  pulseWidthNs:        number
  waveform:            'cw' | 'pulsed' | 'hfire'
  orientationDeg:      number
  lysisNPulses:        number
  chartMode:           'schwan' | 'resonance'
  doubleShellEnabled:  boolean
  perfusionRate:       number
  cellPackingFraction: number
  targetPresetId:      string
  healthyPresetId:     string
  sessionName:         string
}

export interface HardwareImpedancePacket {
  zReal:         number   // Real part of impedance [Ohm]
  zImag:         number   // Imaginary part [Ohm], negative = capacitive
  freqHz:        number   // Measurement frequency [Hz]
  conductivity?: number   // Medium conductivity [S/m], optional
  timestamp:     number   // Unix timestamp [ms]
}

export interface LogEntry {
  id:            number
  timestamp:     string
  freqKHz:       number
  fieldVcm:      number
  medium:        string
  targetPreset:  string
  healthyVm:     number
  targetVm:      number
  selectivity:   number
  healthyRatio:  number
  targetRatio:   number
  healthyTemp:   number
  targetTemp:    number
  event:         string
  sessionName?:  string
}

// AI Optimizer types

export interface CellBiophysics {
  id:               string
  label:            string
  radiusUm:         number   // [um]
  memThicknessNm:   number   // [nm]
  dielectricConst:  number
  conductivitySi:   number   // sigma_i [S/m]
  thresholdV:       number   // [V]
  resonantFreqGhz?: number   // Resonance fields, virus/bacteria only
  capsidQ?:         number
}

export interface AiPhysicsFeatures {
  targetTauNs:          number   // tau_target [ns]
  healthyTauNs:         number   // tau_healthy [ns]
  targetFcKhz:          number   // corner frequency [kHz]
  healthyFcKhz:         number   // corner frequency [kHz]
  sigmaE:               number   // effective medium conductivity [S/m]
  optimalFreqKhz:       number   // physics-optimal frequency from frontend grid scan
  selectivityAtOptimal: number   // Vm_T / Vm_H at optimalFreqKhz
}

export interface AiPhysicsBaseline {
  suggestion: {
    freqKHz:      number
    fieldVcm:     number
    dutyCycle:    number
    pulseWidthNs: number
    waveform:     'cw' | 'pulsed' | 'hfire'
  }
  predictedTargetDr:  number
  predictedHealthyDr: number
  predictedTi:        number
}

export interface AiOptimizeRequest {
  requestId:       string
  sessionState:    StatePacket
  healthyCell:     CellBiophysics
  targetCell:      CellBiophysics
  features:        AiPhysicsFeatures
  physicsBaseline: AiPhysicsBaseline
}

export interface AiParamSuggestion {
  freqKHz:      number
  fieldVcm:     number
  dutyCycle:    number
  pulseWidthNs: number
  waveform:     'cw' | 'pulsed' | 'hfire'
}

export interface AiOptimizeResult {
  requestId:          string
  suggestion:         AiParamSuggestion | null
  predictedTargetDr:  number
  predictedHealthyDr: number
  predictedTi:        number
  confidenceScore:    number   // 0-1; below 0.4 = insufficient training examples
  explanation:        string
  featureImportance:  Record<string, number>
  isPhysicsBaseline:  boolean   // true when ML fell back to physics-only optimisation
}

// Anonymized, only collected when aiConsentGiven = true, never contains PII.
export interface OutcomeEntry {
  sessionName:         string
  timestamp:           string
  freqKHz:             number
  fieldVcm:            number
  medium:              string
  targetPreset:        string
  waveform:            string
  dutyCycle:           number
  pulseWidthNs:        number
  orientationDeg:      number
  lysisNPulses:        number
  targetRatio:         number
  healthyRatio:        number
  selectivity:         number
  targetTemp:          number
  healthyTemp:         number
  rating:              number   // 1=failed, 2=poor, 3=acceptable, 4=good, 5=excellent
  aiSuggestionApplied: boolean
  targetTauNs:         number   // tau_target [ns]
  healthyTauNs:        number   // tau_healthy [ns]
  targetFcKhz:         number   // fc_target [kHz]
  healthyFcKhz:        number   // fc_healthy [kHz]
  targetRadiusUm:      number   // [um]
  sigmaE:              number   // effective medium conductivity [S/m]
}
