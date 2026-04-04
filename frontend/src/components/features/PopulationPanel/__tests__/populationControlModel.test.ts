// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { describe, expect, it } from 'vitest'

import { buildPopulationSizeTooltip } from '../lib/populationControlModel'

describe('populationControlModel', () => {
  const t = (key: string) => key

  it('maps supported population pill sizes to translation keys', () => {
    expect(buildPopulationSizeTooltip(t, 100)).toBe('population.tipNPill100')
    expect(buildPopulationSizeTooltip(t, 300)).toBe('population.tipNPill300')
    expect(buildPopulationSizeTooltip(t, 1000)).toBe('population.tipNPill1000')
  })
})