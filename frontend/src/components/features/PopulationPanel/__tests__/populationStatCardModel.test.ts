// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { describe, expect, it } from 'vitest'

import { createPopulationStatCardTooltips } from '../lib/populationStatCardModel'
import type { PopStats } from '../lib/popPanelCompute'

describe('populationStatCardModel', () => {
  const t = (key: string, params?: Record<string, unknown>) => `${key}:${JSON.stringify(params ?? {})}`
  const stats = {
    pctLysed: 12,
    seLysed: 3,
    pctRevEp: 22,
    seRevEp: 4,
    pctNour: 44,
    seNour: 5,
    meanDr: 0.4567,
    stdDr: 0.1234,
  } as PopStats

  it('builds side-aware card and outcome tooltips', () => {
    const tooltips = createPopulationStatCardTooltips(t)

    expect(tooltips.card('target', 'A549', 8)).toBe('population.tipTargetCard:{"label":"A549","uncPct":8}')
    expect(tooltips.card('healthy', 'HEK', 5)).toBe('population.tipHealthyCard:{"label":"HEK","uncPct":5}')
    expect(tooltips.lysed('target', stats)).toBe('population.tipLysedTarget:{"pct":12,"se":3}')
    expect(tooltips.revEp('healthy', stats)).toBe('population.tipRevEpHealthy:{"pct":22,"se":4}')
    expect(tooltips.nourishing('target', stats)).toBe('population.tipNourTarget:{"pct":44,"se":5}')
  })

  it('builds the shared mean DR tooltip payload', () => {
    const tooltips = createPopulationStatCardTooltips(t)

    expect(tooltips.meanDr(stats, 7)).toBe('population.tipMeanDr:{"mean":"0.457","std":"0.123","uncPct":7}')
  })
})