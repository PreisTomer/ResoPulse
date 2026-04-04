// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { describe, expect, it } from 'vitest'

import {
  buildCellPackingTooltipParams,
  buildDoubleShellTooltipParams,
  buildPerfusionTooltipParams,
  formatCellPackingDisplay,
  formatLysisNDisplay,
  formatOrientationDisplay,
  formatPerfusionDisplay,
} from '../lib/advancedTooltipModel'

describe('advancedTooltipModel helpers', () => {
  it('formats orientation and lysis displays', () => {
    expect(formatOrientationDisplay(60, 0.5)).toBe('60° · cos 50%')
    expect(formatLysisNDisplay(12, 2500)).toBe('×12 · ~2.5s')
  })

  it('builds formatted double-shell tooltip params', () => {
    expect(buildDoubleShellTooltipParams({
      targetLabel: 'Target',
      healthyLabel: 'Healthy',
      targetVmNucMv: 120,
      healthyVmNucMv: 45,
      targetFpeakKHz: 1250,
      healthyFpeakKHz: 900,
      currentBroadcastFrequency: 1250,
      fieldIntensity: 1400,
      hasTargetNucleus: true,
      hasHealthyNucleus: true,
    })).toMatchObject({
      freqDisplay: '1.25 MHz',
      fieldDisplay: '1400 V/cm',
    })
  })

  it('builds perfusion and cell-packing values', () => {
    expect(buildPerfusionTooltipParams({ perfusionRate: 1, healthySpecificHeatCapacity: 4000 }).effLambdaH).toBeGreaterThan(0)
    expect(buildCellPackingTooltipParams({ cellPackingFraction: 0.25, sigmaE: 1, effectiveSigmaE: 0.8 })).toEqual({
      phi: 0.25,
      sigmaE0: 1,
      sigmaEff: 0.8,
    })
    expect(formatPerfusionDisplay(0, 'in vitro')).toBe('in vitro')
    expect(formatCellPackingDisplay(0.25, 'isolated')).toBe('25%')
  })
})