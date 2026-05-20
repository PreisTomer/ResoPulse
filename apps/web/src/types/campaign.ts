// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Production campaign — the top-level user unit. A campaign tracks one target molecule
// through cell engineering, clone/upstream, downstream, and lab run validation.

import type { MoleculeType } from '@/constants/moleculeTypes'

export const MODULE_ID = {
  CELL_ENGINEERING: 'cell-engineering',
  CLONE_UPSTREAM:   'clone-upstream',
  DOWNSTREAM:       'downstream',
} as const

export type ModuleId = typeof MODULE_ID[keyof typeof MODULE_ID]

export const CAMPAIGN_STATUS = {
  DRAFT:      'draft',       // newly created, no module work yet
  IN_PROGRESS:'in-progress', // at least one module touched
  COMPLETE:   'complete',    // all three modules done at least once
  ARCHIVED:   'archived',    // user-archived, hidden from default list
} as const

export type CampaignStatus = typeof CAMPAIGN_STATUS[keyof typeof CAMPAIGN_STATUS]

export const MODULE_STATUS = {
  NOT_STARTED: 'not-started',
  IN_PROGRESS: 'in-progress',
  COMPLETE:    'complete',
} as const

export type ModuleStatus = typeof MODULE_STATUS[keyof typeof MODULE_STATUS]

export interface CampaignNote {
  id:        string
  timestamp: number               // unix ms
  body:      string
  author?:   string               // user name or 'ai' for AI-generated notes
}

export interface CampaignModuleState {
  status:      ModuleStatus
  startedAt?:  number
  completedAt?:number
  predictedYieldPct?: number      // present once downstream module produced a prediction
  predictedTiterGperL?: number    // present once cell engineering / upstream produced a prediction
  // Measured bench actuals, captured when the campaign is finished. Compared against
  // the predictions above to calibrate per-org bioprocess models (prediction-vs-actual).
  measuredTiterGperL?:   number
  measuredYieldPct?:     number
  measuredViabilityPct?: number
  measuredAt?:           number
}

export interface Campaign {
  id:                 string                                  // uuid
  name:               string
  moleculeType:       MoleculeType
  status:             CampaignStatus
  modules: {
    [MODULE_ID.CELL_ENGINEERING]: CampaignModuleState
    [MODULE_ID.CLONE_UPSTREAM]:   CampaignModuleState
    [MODULE_ID.DOWNSTREAM]:       CampaignModuleState
  }
  notes:              CampaignNote[]
  selectedCellLineId: string | null     // links to cellLineCatalog
  startingTiterGperL: number | null     // user-entered, drives downstream waterfall
  createdAt:          number
  modifiedAt:         number
  finishedAt?:        number             // set by explicit finishCampaign, drives calibration ingest
}

export interface CampaignProgressStep {
  module:  string
  done:    boolean
  current: boolean
}
