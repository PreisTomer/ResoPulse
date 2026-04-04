// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { describe, expect, it } from 'vitest'

import { H_FIRE_THRESHOLD_MULTIPLIER } from '@/constants/physics'

import { buildHealthyBarTooltipParams, buildTargetBarTooltipParams } from '../lib/disruptionBarModel'

describe('disruptionBarModel helpers', () => {
  it('builds target bar tooltip params with formatted membrane metrics', () => {
    expect(buildTargetBarTooltipParams({
      ratio: 0.842,
      vm: 0.001234,
      tempC: 37,
      waveform: 'cw',
      lysisTime: '12 ms',
      isResonanceTarget: true,
      target: {
        thresholdVoltage: 1.1,
        resonantFreqGHz: 0.9,
        resonantThresholdVcm: 700,
      },
    })).toEqual({
      pct: '84',
      isResonanceTarget: true,
      resonantThresholdVcm: 700,
      resonantFreqGHz: 0.9,
      targetVmMv: '1.23',
      thresholdMv: '1100',
      lysisTime: '12 ms',
      targetRatio: 0.842,
    })
  })

  it('caps displayed percentage at 100 for target bars', () => {
    expect(buildTargetBarTooltipParams({
      ratio: 1.6,
      vm: 0.002,
      tempC: 37,
      waveform: 'cw',
      lysisTime: '5 ms',
      isResonanceTarget: false,
      target: {
        thresholdVoltage: 1,
      },
    }).pct).toBe('100')
  })

  it('builds healthy bar tooltip params with waveform-aware threshold formatting', () => {
    expect(buildHealthyBarTooltipParams({
      ratio: 0.25,
      vm: 0.0008,
      tempC: 37,
      waveform: 'hfire',
      isResonanceTarget: false,
      healthy: {
        thresholdVoltage: 1,
      },
    })).toEqual({
      pct: '25',
      isResonanceTarget: false,
      healthyVmMv: '0.80',
      thresholdMv: (1000 * H_FIRE_THRESHOLD_MULTIPLIER).toFixed(0),
      healthyRatio: 0.25,
    })
  })
})