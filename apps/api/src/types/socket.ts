// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Re-export wire types from the shared package so both web and api stay in sync.
// Add only backend-specific types (e.g. the validated LogEntry below) in this file.

export type {
  StatePacket,
  HardwareImpedancePacket,
  CellBiophysics,
  AiPhysicsFeatures,
  AiPhysicsBaseline,
  AiOptimizeRequest,
  AiParamSuggestion,
  AiOptimizeResult,
  OutcomeEntry,
  MeasuredOutcome,
  MeasuredOutcomeEntry,
} from '@resopulse/shared-types'

// Backend-specific: validated wire form of a log entry. The frontend's LogEntry
// is a richer UI-facing superset; these are intentionally different shapes.
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
