// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { describe, expect, it } from 'vitest'

import { computeWindowScore, getWindowScoreTier } from './windowScore'

describe('windowScore helpers', () => {
  it('computes the shared window score from target and healthy lysis probabilities', () => {
    expect(computeWindowScore(0.8, 0.1)).toBeCloseTo(0.72, 12)
    expect(computeWindowScore(0, 0.4)).toBe(0)
    expect(computeWindowScore(1, 1)).toBe(0)
  })

  it('maps scores onto the shared quality tiers', () => {
    expect(getWindowScoreTier(0.65)).toBe('good')
    expect(getWindowScoreTier(0.3)).toBe('marginal')
    expect(getWindowScoreTier(0.05)).toBe('poor')
  })
})