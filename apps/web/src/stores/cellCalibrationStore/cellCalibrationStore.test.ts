// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
// @vitest-environment jsdom

import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

import { useCellCalibrationStore } from './index'

beforeEach(() => {
  setActivePinia(createPinia())
})

describe('statusFor — error-delta suppression invariant', () => {
  it('returns rmseBefore=0 and rmseAfter=0 for the unknown-preset branch', () => {
    const store = useCellCalibrationStore()
    const s     = store.statusFor('preset-without-data')
    expect(s.state).toBe('unknown')
    expect(s.rmseBefore).toBe(0)
    expect(s.rmseAfter).toBe(0)
  })

  it('returns rmseBefore=0 and rmseAfter=0 when only a persisted DB row exists', () => {
    const store = useCellCalibrationStore()
    store.receive({
      id:              'cal-1',
      orgId:           'org-1',
      cellPresetId:    'mcf-7',
      sigmaMultiplier: 1.12,
      uncertaintyStd:  0.04,
      nSamples:        8,
      updatedAt:       '2026-04-25T10:00:00Z',
    })
    const s = store.statusFor('mcf-7')
    expect(s.state).toBe('calibrated')
    expect(s.sigmaMultiplier).toBeCloseTo(1.12, 5)
    expect(s.rmseBefore).toBe(0)
    expect(s.rmseAfter).toBe(0)
  })

  it('returns the live rmseBefore/rmseAfter from a recent compute even when a persisted row also exists', () => {
    const store = useCellCalibrationStore()
    store.receive({
      id:              'cal-1',
      orgId:           'org-1',
      cellPresetId:    'mcf-7',
      sigmaMultiplier: 1.0,
      uncertaintyStd:  0.0,
      nSamples:        0,
      updatedAt:       '2026-04-25T10:00:00Z',
    })
    store.recentComputes['mcf-7'] = {
      sigmaMultiplier: 1.18,
      uncertaintyStd:  0.05,
      nSamples:        12,
      collecting:      false,
      clamped:         false,
      outliersRemoved: 1,
      rmseBefore:      0.06,
      rmseAfter:       0.02,
      cellPresetId:    'mcf-7',
    }
    const s = store.statusFor('mcf-7')
    expect(s.state).toBe('calibrated')
    expect(s.rmseBefore).toBeCloseTo(0.06, 5)
    expect(s.rmseAfter).toBeCloseTo(0.02, 5)
  })

  it('flags the clamped state when the recent compute reports clamped=true', () => {
    const store = useCellCalibrationStore()
    store.recentComputes['preset-x'] = {
      sigmaMultiplier: 2.5,
      uncertaintyStd:  0.10,
      nSamples:        7,
      collecting:      false,
      clamped:         true,
      outliersRemoved: 0,
      rmseBefore:      0.08,
      rmseAfter:       0.07,
      cellPresetId:    'preset-x',
    }
    const s = store.statusFor('preset-x')
    expect(s.state).toBe('clamped')
  })

  it('flags the collecting state when the recent compute reports collecting=true', () => {
    const store = useCellCalibrationStore()
    store.recentComputes['preset-y'] = {
      sigmaMultiplier: 1.0,
      uncertaintyStd:  0,
      nSamples:        2,
      collecting:      true,
      clamped:         false,
      outliersRemoved: 0,
      rmseBefore:      0,
      rmseAfter:       0,
      cellPresetId:    'preset-y',
    }
    const s = store.statusFor('preset-y')
    expect(s.state).toBe('collecting')
    expect(s.nSamples).toBe(2)
  })
})
