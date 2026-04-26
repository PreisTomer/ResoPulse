// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
// @vitest-environment jsdom

import { describe, it, expect, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

import { useCellCalibrationStore } from './index'

beforeEach(() => {
  setActivePinia(createPinia())
})

interface BackendRowShape {
  id:            string
  orgId:         string
  cellPresetId:  string
  mode:          'schwan' | 'resonance'
  category:      'mammalian' | 'bacteria' | 'virus'
  param1Mult:    number
  param2Mult:    number
  cov11:         number
  cov12:         number
  cov22:         number
  residualStd:   number
  param1Clamped: boolean
  param2Clamped: boolean
  param1Unident: boolean
  param2Unident: boolean
  nSamples:      number
  updatedAt:     string
}

function backendRow(overrides: Partial<BackendRowShape> = {}): BackendRowShape {
  return {
    id:            'cal-1',
    orgId:         'org-1',
    cellPresetId:  'mcf-7',
    mode:          'schwan',
    category:      'mammalian',
    param1Mult:    1.0,
    param2Mult:    1.0,
    cov11:         0.0,
    cov12:         0.0,
    cov22:         0.0,
    residualStd:   0.0,
    param1Clamped: false,
    param2Clamped: false,
    param1Unident: false,
    param2Unident: false,
    nSamples:      0,
    updatedAt:     '2026-04-26T10:00:00Z',
    ...overrides,
  }
}

describe('statusFor — error-delta suppression invariant', () => {
  it('returns rmseBefore=0 and rmseAfter=0 for the unknown branch', () => {
    const store = useCellCalibrationStore()
    const s     = store.statusFor('preset-without-data', 'schwan')
    expect(s.state).toBe('unknown')
    expect(s.rmseBefore).toBe(0)
    expect(s.rmseAfter).toBe(0)
  })

  it('returns rmseBefore=0 and rmseAfter=0 when only a persisted DB row exists', () => {
    const store = useCellCalibrationStore()
    store.receive(backendRow({ param1Mult: 1.12, param2Mult: 0.93, residualStd: 0.04, nSamples: 8 }))
    const s = store.statusFor('mcf-7', 'schwan')
    expect(s.state).toBe('calibrated')
    expect(s.param1Mult).toBeCloseTo(1.12, 5)
    expect(s.param2Mult).toBeCloseTo(0.93, 5)
    expect(s.rmseBefore).toBe(0)
    expect(s.rmseAfter).toBe(0)
  })

  it('returns the live rmseBefore/rmseAfter from a recent compute even when a persisted row also exists', () => {
    const store = useCellCalibrationStore()
    store.receive(backendRow())
    store.recentComputes['mcf-7::schwan'] = {
      mode:                 'schwan',
      param1Mult:           1.18,
      param2Mult:           0.95,
      cov11:                0.005,
      cov12:                0.0,
      cov22:                0.003,
      residualStd:          0.05,
      nSamples:             12,
      collecting:           false,
      clampedParam1:        false,
      clampedParam2:        false,
      param1Unidentifiable: false,
      param2Unidentifiable: false,
      outliersRemoved:      1,
      rmseBefore:           0.06,
      rmseAfter:            0.02,
      cellPresetId:         'mcf-7',
    }
    const s = store.statusFor('mcf-7', 'schwan')
    expect(s.state).toBe('calibrated')
    expect(s.rmseBefore).toBeCloseTo(0.06, 5)
    expect(s.rmseAfter).toBeCloseTo(0.02, 5)
  })

  it('flags clamped state when a recent compute reports clamped on either parameter', () => {
    const store = useCellCalibrationStore()
    store.recentComputes['preset-x::schwan'] = {
      mode:                 'schwan',
      param1Mult:           2.0,
      param2Mult:           1.0,
      cov11:                0.0,
      cov12:                0.0,
      cov22:                0.0,
      residualStd:          0.10,
      nSamples:             7,
      collecting:           false,
      clampedParam1:        true,
      clampedParam2:        false,
      param1Unidentifiable: false,
      param2Unidentifiable: false,
      outliersRemoved:      0,
      rmseBefore:           0.08,
      rmseAfter:            0.07,
      cellPresetId:         'preset-x',
    }
    const s = store.statusFor('preset-x', 'schwan')
    expect(s.state).toBe('clamped')
  })

  it('flags unidentifiable state when one parameter was pinned at 1.0 by the fit', () => {
    const store = useCellCalibrationStore()
    store.recentComputes['preset-x::schwan'] = {
      mode:                 'schwan',
      param1Mult:           1.0,
      param2Mult:           0.85,
      cov11:                0.0,
      cov12:                0.0,
      cov22:                0.005,
      residualStd:          0.04,
      nSamples:             6,
      collecting:           false,
      clampedParam1:        false,
      clampedParam2:        false,
      param1Unidentifiable: true,
      param2Unidentifiable: false,
      outliersRemoved:      0,
      rmseBefore:           0.06,
      rmseAfter:            0.04,
      cellPresetId:         'preset-x',
    }
    const s = store.statusFor('preset-x', 'schwan')
    expect(s.state).toBe('unidentifiable')
  })

  it('flags collecting when n < min and persists no row', () => {
    const store = useCellCalibrationStore()
    store.recentComputes['preset-y::schwan'] = {
      mode:                 'schwan',
      param1Mult:           1.0,
      param2Mult:           1.0,
      cov11:                0.0,
      cov12:                0.0,
      cov22:                0.0,
      residualStd:          0,
      nSamples:             2,
      collecting:           true,
      clampedParam1:        false,
      clampedParam2:        false,
      param1Unidentifiable: false,
      param2Unidentifiable: false,
      outliersRemoved:      0,
      rmseBefore:           0,
      rmseAfter:            0,
      cellPresetId:         'preset-y',
    }
    const s = store.statusFor('preset-y', 'schwan')
    expect(s.state).toBe('collecting')
    expect(s.nSamples).toBe(2)
  })
})

describe('per-mode lookup', () => {
  it('keeps Schwan and Resonance fits for the same preset separate', () => {
    const store = useCellCalibrationStore()
    store.receive(backendRow({ mode: 'schwan',    param1Mult: 1.2, nSamples: 8 }))
    store.receive(backendRow({ mode: 'resonance', param1Mult: 0.8, nSamples: 6, id: 'cal-2' }))
    expect(store.param1MultiplierFor('mcf-7', 'schwan')).toBeCloseTo(1.2, 5)
    expect(store.param1MultiplierFor('mcf-7', 'resonance')).toBeCloseTo(0.8, 5)
  })

  it('returns 1.0 multipliers and zero covariance when no record exists', () => {
    const store = useCellCalibrationStore()
    expect(store.param1MultiplierFor('missing', 'schwan')).toBe(1.0)
    expect(store.param2MultiplierFor('missing', 'schwan')).toBe(1.0)
    expect(store.covarianceFor('missing', 'schwan')).toEqual({ cov11: 0, cov12: 0, cov22: 0 })
  })
})
