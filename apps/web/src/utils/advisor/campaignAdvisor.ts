// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Campaign advisor — synthesizes the full campaign state into prioritized cross-module recommendations.
// Deterministic rule core; structured so a future Claude API layer can augment or replace it.

import { getCellLineById, GLYCOSYLATION_TYPE } from '@/constants/cellLineCatalog'
import { getStepById, STEP_CATEGORY } from '@/constants/processStepCatalog'
import { MOLECULE_TYPE } from '@/constants/moleculeTypes'

import type { Campaign } from '@/types/campaign'
import type { DownstreamPrediction } from '@/types/downstream'
import type { ProcessStepInstance } from '@/types/downstream'

export const ADVICE_SEVERITY = {
  CRITICAL: 'critical',
  WARNING:  'warning',
  SUGGESTION: 'suggestion',
  POSITIVE: 'positive',
} as const

export type AdviceSeverity = typeof ADVICE_SEVERITY[keyof typeof ADVICE_SEVERITY]

export const ADVICE_MODULE = {
  CELL_ENGINEERING: 'cell-engineering',
  CLONE_UPSTREAM:   'clone-upstream',
  DOWNSTREAM:       'downstream',
  LAB_RUNS:         'lab-runs',
} as const

export type AdviceModule = typeof ADVICE_MODULE[keyof typeof ADVICE_MODULE]

export interface Advice {
  id:       string
  severity: AdviceSeverity
  module:   AdviceModule
  title:    string
  detail:   string
}

export interface AdvisorContext {
  campaign:           Campaign
  downstreamSteps:    ProcessStepInstance[]
  downstreamPrediction: DownstreamPrediction
  labRunCount:        number
}

const SEVERITY_ORDER: Record<AdviceSeverity, number> = {
  critical:   0,
  warning:    1,
  suggestion: 2,
  positive:   3,
}

const ANTIBODY_TYPES: string[] = [MOLECULE_TYPE.MAB, MOLECULE_TYPE.BISPECIFIC, MOLECULE_TYPE.FUSION_PROTEIN]

export function adviseCampaign(ctx: AdvisorContext): Advice[] {
  const out: Advice[] = []
  const { campaign, downstreamSteps, downstreamPrediction, labRunCount } = ctx
  const cellLine = campaign.selectedCellLineId ? getCellLineById(campaign.selectedCellLineId) : undefined

  // ── Module 1: cell line ──────────────────────────────────────────────
  if (!cellLine) {
    out.push({
      id: 'no-cell-line', severity: ADVICE_SEVERITY.CRITICAL, module: ADVICE_MODULE.CELL_ENGINEERING,
      title: 'Select a host cell line',
      detail: 'No cell line is selected. Cell line choice drives every downstream prediction. Start in Cell Engineering.',
    })
  } else {
    if (cellLine.glycosylation === GLYCOSYLATION_TYPE.NONE && ANTIBODY_TYPES.includes(campaign.moleculeType)) {
      out.push({
        id: 'glyco-mismatch-none', severity: ADVICE_SEVERITY.WARNING, module: ADVICE_MODULE.CELL_ENGINEERING,
        title: 'Host cannot glycosylate this molecule',
        detail: `${cellLine.shortLabel} does not glycosylate proteins, but your target requires it. Consider a mammalian host such as CHO-K1.`,
      })
    }
    if (cellLine.glycosylation === GLYCOSYLATION_TYPE.SIMPLE && ANTIBODY_TYPES.includes(campaign.moleculeType)) {
      out.push({
        id: 'glyco-mismatch-yeast', severity: ADVICE_SEVERITY.WARNING, module: ADVICE_MODULE.CELL_ENGINEERING,
        title: 'Yeast glycosylation may be immunogenic',
        detail: `${cellLine.shortLabel} produces high-mannose glycans that can be immunogenic for therapeutic antibodies. A mammalian host is the safer default.`,
      })
    }
  }

  // ── Module 3: downstream ─────────────────────────────────────────────
  if (downstreamSteps.length === 0) {
    out.push({
      id: 'no-downstream', severity: ADVICE_SEVERITY.SUGGESTION, module: ADVICE_MODULE.DOWNSTREAM,
      title: 'Build your downstream process',
      detail: 'No purification steps defined. Load the default train for your molecule type to get a yield prediction.',
    })
  } else {
    const categories = downstreamSteps.map(s => getStepById(s.stepType)?.category)
    if (!categories.includes(STEP_CATEGORY.CAPTURE)) {
      out.push({
        id: 'no-capture', severity: ADVICE_SEVERITY.WARNING, module: ADVICE_MODULE.DOWNSTREAM,
        title: 'No capture step in the train',
        detail: 'Your process has no capture step. A capture step (Protein A, IMAC, or IEX) is the primary purification workhorse.',
      })
    }
    if (ANTIBODY_TYPES.includes(campaign.moleculeType) && !categories.includes(STEP_CATEGORY.VIRAL_INACTIVATION)) {
      out.push({
        id: 'no-viral-inact', severity: ADVICE_SEVERITY.WARNING, module: ADVICE_MODULE.DOWNSTREAM,
        title: 'No viral inactivation step',
        detail: 'Antibody processes for human use require a viral inactivation step (low-pH hold). Add one after capture.',
      })
    }
    if (downstreamPrediction.bottleneckInstanceId) {
      const bn = downstreamSteps.find(s => s.id === downstreamPrediction.bottleneckInstanceId)
      const name = bn ? getStepById(bn.stepType)?.shortLabel ?? 'a step' : 'a step'
      out.push({
        id: 'bottleneck', severity: ADVICE_SEVERITY.SUGGESTION, module: ADVICE_MODULE.DOWNSTREAM,
        title: `Address the bottleneck at ${name}`,
        detail: `${name} is dragging your overall yield down. Open the bottleneck analysis for parameter suggestions.`,
      })
    }
    if (downstreamPrediction.cumulativeYieldPct < 30 && downstreamSteps.length > 0) {
      out.push({
        id: 'low-yield', severity: ADVICE_SEVERITY.SUGGESTION, module: ADVICE_MODULE.DOWNSTREAM,
        title: 'Overall yield is low',
        detail: `Projected overall recovery is ${downstreamPrediction.cumulativeYieldPct.toFixed(0)}%. Consider removing a polish step or tuning parameters toward their optima.`,
      })
    }
  }

  // ── Lab runs / calibration ───────────────────────────────────────────
  if (labRunCount === 0) {
    out.push({
      id: 'no-lab-runs', severity: ADVICE_SEVERITY.SUGGESTION, module: ADVICE_MODULE.LAB_RUNS,
      title: 'Log a lab run to calibrate',
      detail: 'No measured outcomes recorded yet. Logging real results lets the platform sharpen predictions for your lab.',
    })
  }

  // ── Positive confirmation when nothing is flagged ────────────────────
  if (out.length === 0) {
    out.push({
      id: 'all-clear', severity: ADVICE_SEVERITY.POSITIVE, module: ADVICE_MODULE.DOWNSTREAM,
      title: 'Campaign looks well-configured',
      detail: 'Cell line, downstream process, and viral safety all check out. No issues flagged across modules.',
    })
  }

  return out.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])
}
