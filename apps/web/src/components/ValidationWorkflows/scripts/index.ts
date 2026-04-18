// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// Central registry of all validation workflow script factories.
// Adding a new workflow: create a ScriptFactory in its own file, import here, add to the array.

import { createMCF7BreastScript } from './MCF7Breast'
import { createCCMVTsen2007Script } from './CCMVTsen2007'

import type { ScriptFactory } from '@/types/replay'

export interface WorkflowMeta {
  /** Matches the ReplayScript.id produced by the factory. */
  id: string
  factory: ScriptFactory
  /** CSS modifier for per-card accent color: 'cancer' | 'bacteria' | 'resonance'. */
  mod: string
  /** i18n key for the category badge on the card. */
  categoryKey: string
  /** i18n key for the short card title shown on the home page. */
  titleKey: string
  /** i18n key for authors + journal + year. */
  authorsKey: string
  /** i18n key for the one-sentence summary shown on the card (not the full modal description). */
  cardSummaryKey: string
  /** i18n key for the short metric badge shown on the card (e.g. "TI = 1.13"). */
  metricKey: string
  /** i18n key for the full published result description shown in the modal. */
  publishedResultKey: string
  /** i18n key for the DOI string shown in the modal. */
  doiKey: string
  /** i18n key for the full parameter list shown in the modal. */
  paramsKey: string
}

/**
 * Ordered list of all available validation workflows.
 * The home-page ValidateSection renders one card per entry.
 */
export const VALIDATION_WORKFLOWS: WorkflowMeta[] = [
  {
    id:                 'mcf7-breast-anand2019',
    factory:            createMCF7BreastScript,
    mod:                'cancer',
    categoryKey:        'validate.mcf7.category',
    titleKey:           'validate.mcf7.title',
    authorsKey:         'validate.mcf7.authors',
    cardSummaryKey:     'validate.mcf7.cardSummary',
    metricKey:          'validate.mcf7.cardMetric',
    publishedResultKey: 'validate.mcf7.publishedResult',
    doiKey:             'validate.mcf7.doi',
    paramsKey:          'validate.mcf7.modalParamTable',
  },
  {
    id:                 'ccmv-tsen2007',
    factory:            createCCMVTsen2007Script,
    mod:                'resonance',
    categoryKey:        'validate.ccmv.category',
    titleKey:           'validate.ccmv.title',
    authorsKey:         'validate.ccmv.authors',
    cardSummaryKey:     'validate.ccmv.cardSummary',
    metricKey:          'validate.ccmv.cardMetric',
    publishedResultKey: 'validate.ccmv.publishedResult',
    doiKey:             'validate.ccmv.doi',
    paramsKey:          'validate.ccmv.modalParamTable',
  },
]
