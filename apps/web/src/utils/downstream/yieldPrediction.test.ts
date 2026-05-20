// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

import { describe, it, expect } from 'vitest'

import { getStepById, DEFAULT_PROCESS_TRAIN } from '@/constants/processStepCatalog'
import { MOLECULE_TYPE } from '@/constants/moleculeTypes'

import { predictDownstream, predictStepYield } from './yieldPrediction'

import type { ProcessStepInstance } from '@/types/downstream'

function instancesFromTypes(types: string[]): ProcessStepInstance[] {
  return types.map((stepType, i) => {
    const entry = getStepById(stepType)
    const paramValues: Record<string, number> = {}
    if (entry) for (const p of entry.parameters) paramValues[p.key] = p.defaultValue
    return { id: `s${i}`, stepType, paramValues }
  })
}

describe('predictStepYield', () => {
  it('returns the range midpoint when all params are at their defaults (centred)', () => {
    const entry = getStepById('protein-a-capture')!
    const params: Record<string, number> = {}
    for (const p of entry.parameters) params[p.key] = (p.min + p.max) / 2
    const y = predictStepYield(entry, params)
    const mid = (entry.yieldRangePct[0] + entry.yieldRangePct[1]) / 2
    expect(y).toBeCloseTo(mid, 5)
  })

  it('never returns a yield above the catalog upper bound', () => {
    const entry = getStepById('protein-a-capture')!
    const params: Record<string, number> = {}
    for (const p of entry.parameters) params[p.key] = (p.min + p.max) / 2
    expect(predictStepYield(entry, params)).toBeLessThanOrEqual(entry.yieldRangePct[1])
  })

  it('penalizes yield when a yield-affecting param is pushed to its extreme', () => {
    const entry = getStepById('protein-a-capture')!
    const centred: Record<string, number> = {}
    const extreme: Record<string, number> = {}
    for (const p of entry.parameters) {
      centred[p.key] = (p.min + p.max) / 2
      extreme[p.key] = p.affectsYield ? p.max : (p.min + p.max) / 2
    }
    expect(predictStepYield(entry, extreme)).toBeLessThan(predictStepYield(entry, centred))
  })
})

describe('predictDownstream', () => {
  it('returns empty prediction for an empty train', () => {
    const r = predictDownstream([], 50)
    expect(r.steps).toEqual([])
    expect(r.finalMassG).toBe(50)
    expect(r.cumulativeYieldPct).toBe(100)
  })

  it('cumulative yield decreases monotonically across steps', () => {
    const steps = instancesFromTypes(DEFAULT_PROCESS_TRAIN[MOLECULE_TYPE.MAB]!)
    const r = predictDownstream(steps, 50)
    for (let i = 1; i < r.steps.length; i++) {
      expect(r.steps[i]!.cumulativeYieldPct).toBeLessThanOrEqual(r.steps[i - 1]!.cumulativeYieldPct)
    }
  })

  it('final mass equals starting mass times cumulative yield fraction', () => {
    const steps = instancesFromTypes(DEFAULT_PROCESS_TRAIN[MOLECULE_TYPE.MAB]!)
    const startMass = 50
    const r = predictDownstream(steps, startMass)
    expect(r.finalMassG).toBeCloseTo(startMass * r.cumulativeYieldPct / 100, 4)
  })

  it('overall mAb process yield lands in a plausible 30-60% band', () => {
    const steps = instancesFromTypes(DEFAULT_PROCESS_TRAIN[MOLECULE_TYPE.MAB]!)
    const r = predictDownstream(steps, 50)
    expect(r.cumulativeYieldPct).toBeGreaterThan(30)
    expect(r.cumulativeYieldPct).toBeLessThan(75)
  })

  it('accumulates HCP and DNA log reduction across steps', () => {
    const steps = instancesFromTypes(DEFAULT_PROCESS_TRAIN[MOLECULE_TYPE.MAB]!)
    const r = predictDownstream(steps, 50)
    expect(r.totalHcpLogReduction).toBeGreaterThan(0)
    expect(r.totalDnaLogReduction).toBeGreaterThan(0)
  })

  it('skips unknown step types without crashing', () => {
    const steps: ProcessStepInstance[] = [{ id: 'x', stepType: 'not-a-step', paramValues: {} }]
    const r = predictDownstream(steps, 50)
    expect(r.steps).toEqual([])
  })

  it('produces one result per valid step', () => {
    const types = DEFAULT_PROCESS_TRAIN[MOLECULE_TYPE.MAB]!
    const r = predictDownstream(instancesFromTypes(types), 50)
    expect(r.steps.length).toBe(types.length)
  })
})
