// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import type { StatePacket } from './socket'

export interface CellBiophysics {
  id:               string
  label:            string
  radiusUm:         number
  memThicknessNm:   number
  dielectricConst:  number
  conductivitySi:   number
  thresholdV:       number
  resonantFreqGhz?: number
  capsidQ?:         number
}

export interface AiPhysicsFeatures {
  targetTauNs:          number
  healthyTauNs:         number
  targetFcKhz:          number
  healthyFcKhz:         number
  sigmaE:               number
  optimalFreqKhz:       number
  selectivityAtOptimal: number
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
  confidenceScore:    number
  explanation:        string
  featureImportance:  Record<string, number>
  isPhysicsBaseline:  boolean
}

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
  rating:              number
  aiSuggestionApplied: boolean
  targetTauNs:         number
  healthyTauNs:        number
  targetFcKhz:         number
  healthyFcKhz:        number
  targetRadiusUm:      number
  sigmaE:              number
}
