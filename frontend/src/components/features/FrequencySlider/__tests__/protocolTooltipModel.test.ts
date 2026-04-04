// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { describe, expect, it } from 'vitest'

import {
  buildDutyCycleTooltipParams,
  buildLysisTimeDisplay,
  buildPulseWidthTooltipParams,
  formatDutyCycleDisplay,
  formatMinPulseDisplay,
  formatPulseWidthDisplay,
} from '../lib/protocolTooltipModel'

describe('protocolTooltipModel helpers', () => {
  it('formats duty cycle display across small and normal ranges', () => {
    expect(formatDutyCycleDisplay(0.0000005)).toBe('0.0 µ%')
    expect(formatDutyCycleDisplay(0.01234)).toBe('1.23%')
  })

  it('formats pulse width and minimum pulse displays', () => {
    expect(formatPulseWidthDisplay(500)).toBe('500 ns')
    expect(formatPulseWidthDisplay(2500)).toBe('2.5 µs')
    expect(formatMinPulseDisplay(0)).toBe('')
    expect(formatMinPulseDisplay(2500)).toBe('3τ_T ≥ 2.5 µs')
  })

  it('builds protocol tooltip payloads with formatted display values', () => {
    expect(buildDutyCycleTooltipParams({
      effectiveDutyCycle: 0.01,
      targetSAR: 4,
      healthySAR: 2,
      maxSteadyTemp: 43,
      thermalDangerLevel: 'hyperthermic',
      dutyCycle: 0.01,
    }).dutyCycleDisplay).toBe('1.00%')

    expect(buildPulseWidthTooltipParams({
      targetFc: 10,
      healthyFc: 12,
      pulseWidthNs: 1500,
      lysisDelayMs: 25,
      lysisNPulses: 20,
      dutyCycle: 0.1,
    }).pulseWidthDisplay).toBe('1.5 µs')

    expect(buildLysisTimeDisplay(1500)).toBe('1.5s')
  })
})