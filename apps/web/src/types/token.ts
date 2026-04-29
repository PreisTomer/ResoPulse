// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Types for the token / usage system.

export interface TokenBalance {
  balance:        number
  quota:          number
  plan:           TokenPlan
  resetAt:        string  // ISO date string
  usedThisPeriod: number
}

export type TokenPlan = 'free' | 'pro' | 'team' | 'enterprise'

export type TokenTransactionMeta = Record<string, string | number | boolean | null>

export interface TokenTransaction {
  id:        string
  delta:     number
  reason:    string
  createdAt: string
  meta:      TokenTransactionMeta
}

export interface CostMap {
  CELL_CARD_UPDATE:   number
  SELECTIVITY_SWEEP:  number
  IMPEDANCE_SESSION:  number
  EXPERIMENT_REPORT:  number
  MANUSCRIPT_BUNDLE:  number
  OPENTRONS_EXPORT:   number
  ACOUSTIC_RESONANCE: number
  HEATMAP_LYSIS:      number
  AI_OPTIMIZE:        number
  AI_RETRAIN:         number
  LOG_OUTCOME:        number
  SAVE_EXPERIMENT:    number
}

export const PLAN_LABEL: Record<TokenPlan, string> = {
  free:       'Free',
  pro:        'Pro',
  team:       'Team',
  enterprise: 'Enterprise',
}

export const PLAN_MONTHLY_PRICE: Record<TokenPlan, string> = {
  free:       '$0',
  pro:        '$39',
  team:       '$149',
  enterprise: 'Custom',
}

export const PLAN_QUOTA_DISPLAY: Record<TokenPlan, string> = {
  free:       '200',
  pro:        '2,500',
  team:       '10,000',
  enterprise: 'Unlimited',
}
