// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { describe, expect, it } from 'vitest'

import { THRESHOLDS } from '@/constants/physics'

import type { CellConfig } from '@/types/cell'

import { buildSweepPoint, isSweepPointInSelectiveWindow } from '../lib/sweepModel'

describe('sweepModel helpers', () => {
  const healthy = {
    id: 'healthy',
    type: 'healthy',
    label: 'Healthy',
    radius: 8,
    membraneThickness: 5,
    thresholdVoltage: 1,
    dielectricConstant: 6,
    conductivity: 0.7,
    density: 1000,
    specificHeatCapacity: 4200,
    amplitude: 1,
    naturalFrequency: 1,
  } as CellConfig

  const target = {
    ...healthy,
    id: 'target',
    type: 'target',
    label: 'Target',
    radius: 10,
    conductivity: 0.9,
  } as CellConfig

  it('maps field sweeps onto varying field with fixed frequency', () => {
    const point = buildSweepPoint({
      sweepParam: 'field',
      sweepValue: 120,
      fixedFieldVcm: 40,
      fixedFreqKHz: 250,
      healthy,
      target,
      sigmaE: 1.2,
      cosTheta: 1,
      waveform: 'pulsed',
      dutyCycle: 0.01,
      pulseWidthNs: 200,
      perfusionRate: 0,
    })

    expect(point.x).toBe(120)
    expect(point.drH).toBeGreaterThan(0)
    expect(point.drT).toBeGreaterThan(0)
    expect(point.tH).toBeGreaterThanOrEqual(37)
    expect(point.tT).toBeGreaterThanOrEqual(37)
  })

  it('recognizes selective-window sweep points', () => {
    expect(isSweepPointInSelectiveWindow({
      x: 100,
      drH: THRESHOLDS.HEALTHY_APPROACHING - 0.01,
      drT: THRESHOLDS.DISRUPTION_WARN,
      ti: 2,
      tH: THRESHOLDS.TEMP_DENATURING - 1,
      tT: THRESHOLDS.TEMP_DENATURING - 1,
    })).toBe(true)

    expect(isSweepPointInSelectiveWindow({
      x: 100,
      drH: THRESHOLDS.HEALTHY_APPROACHING,
      drT: THRESHOLDS.DISRUPTION_WARN,
      ti: 2,
      tH: THRESHOLDS.TEMP_DENATURING - 1,
      tT: THRESHOLDS.TEMP_DENATURING - 1,
    })).toBe(false)
  })
})