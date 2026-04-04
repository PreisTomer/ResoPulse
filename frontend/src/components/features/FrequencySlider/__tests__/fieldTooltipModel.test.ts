// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { describe, expect, it } from 'vitest'

import { H_FIRE_THRESHOLD_MULTIPLIER } from '@/constants/physics'

import {
  buildFieldTooltipParams,
  buildHealthyBadgeTooltipParams,
  buildTargetBadgeTooltipParams,
} from '../lib/fieldTooltipModel'

describe('fieldTooltipModel helpers', () => {
  const target = {
    label: 'Target',
    thresholdVoltage: 1.2,
    resonantFreqGHz: 0.9,
    capsidQ: 4,
    resonantThresholdVcm: 700,
  }

  it('passes through field tooltip params unchanged', () => {
    expect(buildFieldTooltipParams({
      isResonanceMode: true,
      target,
      fieldDisplay: '1.4 kV/cm',
      targetDisruption: 0.84,
      targetCellCategory: 'virus',
      targetLysisField: 1200,
      healthyLysisField: 2400,
    })).toEqual({
      isResonanceMode: true,
      target,
      fieldDisplay: '1.4 kV/cm',
      targetDisruption: 0.84,
      targetCellCategory: 'virus',
      targetLysisField: 1200,
      healthyLysisField: 2400,
    })
  })

  it('builds target badge params with an effective threshold in mV', () => {
    expect(buildTargetBadgeTooltipParams({
      isResonanceMode: false,
      target,
      targetTemp: 37,
      waveform: 'hfire',
      targetDisruptPercent: '83',
      targetDisruption: 0.83,
      targetVm: 0.0014,
      lysisDelayMs: 25,
    })).toEqual({
      isResonanceMode: false,
      target: {
        ...target,
        effThresholdMv: 1200 * H_FIRE_THRESHOLD_MULTIPLIER,
      },
      targetDisruptPercent: '83',
      targetDisruption: 0.83,
      targetVmMv: 1.4,
      lysisDelayMs: 25,
    })
  })

  it('builds healthy badge params with waveform-aware threshold formatting input', () => {
    expect(buildHealthyBadgeTooltipParams({
      isResonanceMode: false,
      healthy: { thresholdVoltage: 1 },
      healthyTemp: 37,
      waveform: 'cw',
      healthyDisruptPercent: '24',
      healthyDisruption: 0.24,
      healthyVm: 0.0008,
    })).toEqual({
      isResonanceMode: false,
      healthyDisruptPercent: '24',
      healthyDisruption: 0.24,
      healthyVmMv: 0.8,
      thresholdVoltage: 1,
      effThresholdMv: 1000,
    })
  })
})