// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

import { describe, it, expect } from 'vitest'

import { MOLECULE_TYPE } from '@/constants/moleculeTypes'
import { getStepById } from '@/constants/processStepCatalog'

import { adviseCampaign, ADVICE_SEVERITY, type AdvisorContext } from './campaignAdvisor'
import { predictDownstream } from '@/utils/downstream/yieldPrediction'

import { CAMPAIGN_STATUS, MODULE_ID, MODULE_STATUS, type Campaign } from '@/types/campaign'
import type { ProcessStepInstance } from '@/types/downstream'

function makeCampaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: 'c1',
    name: 'Test',
    moleculeType: MOLECULE_TYPE.MAB,
    status: CAMPAIGN_STATUS.DRAFT,
    modules: {
      [MODULE_ID.CELL_ENGINEERING]: { status: MODULE_STATUS.NOT_STARTED },
      [MODULE_ID.CLONE_UPSTREAM]:   { status: MODULE_STATUS.NOT_STARTED },
      [MODULE_ID.DOWNSTREAM]:       { status: MODULE_STATUS.NOT_STARTED },
    },
    notes: [],
    selectedCellLineId: null,
    startingTiterGperL: 5,
    createdAt: 0,
    modifiedAt: 0,
    ...overrides,
  }
}

function instances(types: string[]): ProcessStepInstance[] {
  return types.map((stepType, i) => {
    const entry = getStepById(stepType)
    const paramValues: Record<string, number> = {}
    if (entry) for (const p of entry.parameters) paramValues[p.key] = p.defaultValue
    return { id: `s${i}`, stepType, paramValues }
  })
}

function ctx(campaign: Campaign, steps: ProcessStepInstance[], labRunCount = 0): AdvisorContext {
  return { campaign, downstreamSteps: steps, downstreamPrediction: predictDownstream(steps, 50), labRunCount }
}

describe('adviseCampaign', () => {
  it('flags a critical issue when no cell line is selected', () => {
    const advice = adviseCampaign(ctx(makeCampaign(), []))
    expect(advice.some(a => a.id === 'no-cell-line' && a.severity === ADVICE_SEVERITY.CRITICAL)).toBe(true)
  })

  it('warns when a bacterial host is chosen for a mAb (no glycosylation)', () => {
    const advice = adviseCampaign(ctx(makeCampaign({ selectedCellLineId: 'bl21-de3' }), []))
    expect(advice.some(a => a.id === 'glyco-mismatch-none')).toBe(true)
  })

  it('warns when an antibody process has no viral inactivation step', () => {
    const steps = instances(['depth-filtration', 'protein-a-capture', 'uf-concentration'])
    const advice = adviseCampaign(ctx(makeCampaign({ selectedCellLineId: 'cho-k1' }), steps))
    expect(advice.some(a => a.id === 'no-viral-inact')).toBe(true)
  })

  it('suggests building a downstream process when none exists', () => {
    const advice = adviseCampaign(ctx(makeCampaign({ selectedCellLineId: 'cho-k1' }), []))
    expect(advice.some(a => a.id === 'no-downstream')).toBe(true)
  })

  it('suggests logging a lab run when none are recorded', () => {
    const advice = adviseCampaign(ctx(makeCampaign({ selectedCellLineId: 'cho-k1' }), [], 0))
    expect(advice.some(a => a.id === 'no-lab-runs')).toBe(true)
  })

  it('orders critical advice before suggestions', () => {
    const advice = adviseCampaign(ctx(makeCampaign(), []))
    const firstSeverity = advice[0]!.severity
    expect(firstSeverity).toBe(ADVICE_SEVERITY.CRITICAL)
  })

  it('returns a positive all-clear for a well-configured antibody campaign', () => {
    const steps = instances(['depth-filtration', 'protein-a-capture', 'low-ph-viral-inactivation', 'aex-polish-flowthrough', 'uf-concentration', 'df-buffer-exchange', 'sterile-filtration-fill'])
    const advice = adviseCampaign(ctx(makeCampaign({ selectedCellLineId: 'cho-k1' }), steps, 2))
    expect(advice.some(a => a.severity === ADVICE_SEVERITY.POSITIVE)).toBe(true)
  })
})
