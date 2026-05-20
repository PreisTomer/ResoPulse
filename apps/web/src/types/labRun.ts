// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Lab run types — actual experimental outcomes logged against a campaign's predictions.

export const LAB_RUN_STATUS = {
  PLANNED:    'planned',
  IN_PROGRESS:'in-progress',
  COMPLETE:   'complete',
} as const

export type LabRunStatus = typeof LAB_RUN_STATUS[keyof typeof LAB_RUN_STATUS]

export interface LabRunOutcomes {
  actualTransfectionEfficiencyPct: number | null
  actualViabilityPct:              number | null
  actualTiterGL:                   number | null
  actualDownstreamYieldPct:        number | null
  actualFinalProductG:             number | null
  // Prediction snapshots captured when the actual was logged — the (predicted, actual) pairs
  // that feed the calibration loop.
  predictedTiterGL:                number | null
  predictedDownstreamYieldPct:     number | null
  notes:                           string
}

export interface LabRun {
  id:           string
  campaignId:   string
  name:         string
  status:       LabRunStatus
  outcomes:     LabRunOutcomes
  createdAt:    number
  modifiedAt:   number
}

export function emptyOutcomes(): LabRunOutcomes {
  return {
    actualTransfectionEfficiencyPct: null,
    actualViabilityPct:              null,
    actualTiterGL:                   null,
    actualDownstreamYieldPct:        null,
    actualFinalProductG:             null,
    predictedTiterGL:                null,
    predictedDownstreamYieldPct:     null,
    notes:                           '',
  }
}
