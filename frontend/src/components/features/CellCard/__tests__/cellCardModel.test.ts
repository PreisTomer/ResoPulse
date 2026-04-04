// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { describe, expect, it } from 'vitest'

import { H_FIRE_THRESHOLD_MULTIPLIER } from '@/constants/physics'

import {
  buildStateTooltip,
  buildTempDisplay,
  buildTempTooltip,
  buildVmDisplay,
  buildVmTooltip,
  cellByType,
  effectiveThresholdByCellType,
  getTempFlags,
  isAcousticTargetCell,
  pulseEnvelopeFactorByCellType,
} from '../lib/cellCardModel'

describe('cellCardModel helpers', () => {
  const healthyCell = {
    id: 'healthy-cell',
    thresholdVoltage: 1,
    conductivity: 0.5,
  } as unknown as import('@/types/cell').CellConfig

  const targetCell = {
    id: 'target-cell',
    thresholdVoltage: 2,
    conductivity: 1.5,
  } as unknown as import('@/types/cell').CellConfig

  it('selects the correct cell config by type', () => {
    expect(cellByType('healthy', healthyCell, targetCell)).toBe(healthyCell)
    expect(cellByType('target', healthyCell, targetCell)).toBe(targetCell)
  })

  it('selects the pulse-envelope factor by type', () => {
    expect(pulseEnvelopeFactorByCellType('healthy', 0.8, 0.6)).toBe(0.8)
    expect(pulseEnvelopeFactorByCellType('target', 0.8, 0.6)).toBe(0.6)
  })

  it('uses waveform-aware effective thresholds for the selected cell', () => {
    expect(effectiveThresholdByCellType('healthy', healthyCell, targetCell, 37, 42, 'cw')).toBeCloseTo(1, 6)
    expect(effectiveThresholdByCellType('target', healthyCell, targetCell, 37, 37, 'hfire')).toBeCloseTo(2 * H_FIRE_THRESHOLD_MULTIPLIER, 6)
  })

  it('detects acoustic targets only for resonant bacteria or virus presets', () => {
    expect(isAcousticTargetCell('healthy', 'bacteria', { resonantFreqGHz: 1 } as typeof targetCell)).toBe(false)
    expect(isAcousticTargetCell('target', 'mammalian', { resonantFreqGHz: 1 } as typeof targetCell)).toBe(false)
    expect(isAcousticTargetCell('target', 'virus', { resonantFreqGHz: 1 } as typeof targetCell)).toBe(true)
  })

  it('builds shared Vm and temperature display strings and flags', () => {
    expect(buildVmDisplay(true, 0.45, 120)).toBe('DR 45%')
    expect(buildVmDisplay(false, 0.45, 120)).toBe('120.0 mV')
    expect(buildTempDisplay(41.23)).toBe('41.2 °C')
    expect(getTempFlags(41)).toEqual({ tempWarning: false, tempDenaturing: false, tempVaporizing: false })
    expect(getTempFlags(65)).toEqual({ tempWarning: true, tempDenaturing: true, tempVaporizing: false })
  })

  it('builds shared Vm, temperature, and state tooltips', () => {
    const acousticTarget = {
      resonantFreqGHz: 0.25,
      capsidQ: 2,
      experimentalBasis: 'rf_extrapolated',
    } as unknown as import('@/types/cell').CellConfig

    expect(buildVmTooltip({
      isAcousticTarget: true,
      targetCell: acousticTarget,
      disruptionRatio: 0.4,
      freqKHz: 250000,
      fieldVcm: 80,
      vmDisplay: 'ignored',
      thresholdVoltage: 1,
      waveform: 'cw',
    })).toContain('Acoustic Disruption Ratio')

    expect(buildVmTooltip({
      isAcousticTarget: false,
      targetCell: targetCell,
      disruptionRatio: 0.4,
      freqKHz: 100,
      fieldVcm: 30,
      vmDisplay: '100.0 mV',
      thresholdVoltage: 1,
      waveform: 'cw',
    })).toContain('Transmembrane Potential')

    expect(buildTempTooltip('42.0 °C', getTempFlags(42))).toContain('Cell Temperature')
    expect(buildStateTooltip('stable', false, 'healthy', 2500)).toContain('Cell State')
  })
})