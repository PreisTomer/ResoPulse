// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

import { useImpedanceStore } from './impedanceStore'
import { useCellStore }      from './cellStore'
import { IMPEDANCE_HISTORY_MAX, CONDUCTIVITY_SAMPLE_MAX } from '@/constants/cuvette'
import type { HardwareImpedancePacket } from './impedanceStore'

function freshStores() {
  setActivePinia(createPinia())
  return { imp: useImpedanceStore(), cell: useCellStore() }
}

function makePacket(overrides: Partial<HardwareImpedancePacket> = {}): HardwareImpedancePacket {
  return {
    zReal:     150,
    zImag:     -20,
    freqHz:    1000,
    timestamp: Date.now(),
    ...overrides,
  }
}

// ── toggleHardwareMode ────────────────────────────────────────────────────────

describe('toggleHardwareMode', () => {
  it('flips hardwareModeEnabled', () => {
    const { imp } = freshStores()
    expect(imp.hardwareModeEnabled).toBe(false)
    imp.toggleHardwareMode()
    expect(imp.hardwareModeEnabled).toBe(true)
    imp.toggleHardwareMode()
    expect(imp.hardwareModeEnabled).toBe(false)
  })
})

// ── handleHardwareImpedancePacket ─────────────────────────────────────────────

describe('handleHardwareImpedancePacket', () => {
  it('stores the latest hardware reading', () => {
    const { imp } = freshStores()
    const ts = Date.now()
    imp.handleHardwareImpedancePacket(makePacket({ zReal: 200, zImag: -30, freqHz: 5000, timestamp: ts }))
    expect(imp.hardwareZReal).toBe(200)
    expect(imp.hardwareZImag).toBe(-30)
    expect(imp.hardwareFreqHz).toBe(5000)
    expect(imp.hardwareReadingTs).toBe(ts)
  })

  it('stores null conductivity when packet omits the field', () => {
    const { imp } = freshStores()
    imp.handleHardwareImpedancePacket(makePacket())
    expect(imp.hardwareConductivity).toBeNull()
  })

  it('stores conductivity when packet includes it', () => {
    const { imp } = freshStores()
    imp.handleHardwareImpedancePacket(makePacket({ conductivity: 0.14 }))
    expect(imp.hardwareConductivity).toBe(0.14)
  })

  it('appends a point to impedanceHistory', () => {
    const { imp } = freshStores()
    imp.handleHardwareImpedancePacket(makePacket())
    expect(imp.impedanceHistory).toHaveLength(1)
  })

  it(`caps impedanceHistory at IMPEDANCE_HISTORY_MAX (${IMPEDANCE_HISTORY_MAX}) points`, () => {
    const { imp } = freshStores()
    const extra = 10
    for (let i = 0; i < IMPEDANCE_HISTORY_MAX + extra; i++) {
      imp.handleHardwareImpedancePacket(makePacket({ timestamp: Date.now() + i }))
    }
    expect(imp.impedanceHistory).toHaveLength(IMPEDANCE_HISTORY_MAX)
  })

  it('oldest point is evicted when buffer is full', () => {
    const { imp } = freshStores()
    for (let i = 0; i < IMPEDANCE_HISTORY_MAX; i++) {
      imp.handleHardwareImpedancePacket(makePacket({ zReal: i + 1, timestamp: Date.now() + i }))
    }
    const firstBeforeEviction = imp.impedanceHistory[0]!.zOhm   // should be 1
    imp.handleHardwareImpedancePacket(makePacket({ zReal: 9999, timestamp: Date.now() + 9999 }))
    expect(imp.impedanceHistory[0]!.zOhm).toBeGreaterThan(firstBeforeEviction)   // 1 was evicted
    expect(imp.impedanceHistory[imp.impedanceHistory.length - 1]!.zOhm).toBe(9999)
  })
})

// ── setCuvettePreset ──────────────────────────────────────────────────────────

describe('setCuvettePreset', () => {
  it('applies a known preset geometry', () => {
    const { imp } = freshStores()
    // Default is btx_2mm (2 mm gap) — switch to btx_4mm (4 mm) to confirm the gap changes
    const gapBefore = imp.cuvetteGapMm
    imp.setCuvettePreset('btx_4mm')
    expect(imp.cuvetteGapMm).not.toBe(gapBefore)
    expect(imp.cuvetteGapMm).toBe(4)
  })

  it('ignores an unknown preset id', () => {
    const { imp } = freshStores()
    const gapBefore = imp.cuvetteGapMm
    imp.setCuvettePreset('does-not-exist')
    expect(imp.cuvetteGapMm).toBe(gapBefore)
  })
})

// ── setCuvetteGapMm ───────────────────────────────────────────────────────────

describe('setCuvetteGapMm', () => {
  it('clamps below 0.5', () => {
    const { imp } = freshStores()
    imp.setCuvetteGapMm(0.01)
    expect(imp.cuvetteGapMm).toBe(0.5)
  })

  it('clamps above 10', () => {
    const { imp } = freshStores()
    imp.setCuvetteGapMm(999)
    expect(imp.cuvetteGapMm).toBe(10)
  })

  it('sets cuvettePresetId to custom', () => {
    const { imp } = freshStores()
    imp.setCuvetteGapMm(3)
    expect(imp.cuvettePresetId).toBe('custom')
  })
})

// ── addConductivitySample ─────────────────────────────────────────────────────

describe('addConductivitySample', () => {
  it('appends a sample with current sigmaE, zOhm, and driftPct', () => {
    const { imp } = freshStores()
    imp.addConductivitySample()
    expect(imp.conductivitySamples).toHaveLength(1)
    const s = imp.conductivitySamples[0]!
    expect(s.sigmaE).toBeGreaterThan(0)
    expect(s.zOhm).toBeGreaterThan(0)
  })

  it(`caps conductivitySamples at CONDUCTIVITY_SAMPLE_MAX (${CONDUCTIVITY_SAMPLE_MAX}) points`, () => {
    const { imp } = freshStores()
    for (let i = 0; i < CONDUCTIVITY_SAMPLE_MAX + 5; i++) {
      imp.addConductivitySample()
    }
    expect(imp.conductivitySamples).toHaveLength(CONDUCTIVITY_SAMPLE_MAX)
  })

  it('clearConductivitySamples empties the buffer', () => {
    const { imp } = freshStores()
    imp.addConductivitySample()
    imp.addConductivitySample()
    imp.clearConductivitySamples()
    expect(imp.conductivitySamples).toHaveLength(0)
  })
})

// ── impedanceDriftPct ─────────────────────────────────────────────────────────

describe('impedanceDriftPct', () => {
  it('is 0 when hardware mode is off (simulated = nominal)', () => {
    const { imp } = freshStores()
    expect(imp.impedanceDriftPct).toBe(0)
  })

  it('reflects hardware Z deviation from nominal in hardware mode', () => {
    const { imp } = freshStores()
    imp.toggleHardwareMode()
    const nominal = imp.nominalImpedanceOhm
    // Inject a reading at 2× the nominal impedance → drift ≈ +100%
    imp.handleHardwareImpedancePacket(makePacket({ zReal: nominal * 2, zImag: 0 }))
    expect(imp.impedanceDriftPct).toBeCloseTo(100, 0)
  })
})

// ── loadState ─────────────────────────────────────────────────────────────────

describe('loadState getter', () => {
  it('returns NOMINAL when drift < 5%', () => {
    const { imp } = freshStores()
    expect(imp.loadState).toBe('nominal')
  })
})
