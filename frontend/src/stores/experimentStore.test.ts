// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

import { useExperimentStore } from './experimentStore'

// ── Minimal CellSnapshot (matches the internal interface shape) ───────────────

const SNAP = {
  currentBroadcastFrequency: 500,
  fieldIntensity:            100,
  medium:                    'saline',
  chartMode:                 'schwan' as const,
  waveform:                  'cw',
  dutyCycle:                 0.5,
  pulseWidthNs:              100,
  lysisNPulses:              1,
  orientationDeg:            0,
  doubleShellEnabled:        false,
  effectiveSigmaE:           0.14,
  perfusionRate:             0,
  cellPackingFraction:       0.1,
  healthyFc:                 200,
  targetFc:                  150,
  targetCellCategory:        'mammalian' as const,
  healthyVm:                 0.0008,   // V (→ 0.800 mV after ×1000)
  targetVm:                  0.001,    // V (→ 1.000 mV)
  selectivityRatio:          1.25,
  healthyDisruptionRatio:    0.8,
  targetDisruptionRatio:     1.0,
  healthyTemp:               37.0,
  targetTemp:                37.1,
  healthyNuclearVm:          0,
  targetNuclearVm:           0,
  depHealthyCmReal:          0.1,
  depTargetCmReal:           -0.2,
  depHealthyCrossoverKHz:    1000,
  depTargetCrossoverKHz:     800,
  healthyBiomodScore:        0.3,
  healthy: {
    label: 'Normal', radius: 6, membraneThickness: 7,
    dielectricConstant: 10, conductivity: 0.4, thresholdVoltage: 1.0,
    density: 1050, specificHeatCapacity: 3600,
  },
  target: {
    id: 'test-target', label: 'HeLa', radius: 10, membraneThickness: 7,
    dielectricConstant: 10, conductivity: 0.4, thresholdVoltage: 1.0,
    density: 1050, specificHeatCapacity: 3600,
  },
}

function freshStore() {
  localStorage.clear()
  setActivePinia(createPinia())
  return useExperimentStore()
}

// ── logReading ────────────────────────────────────────────────────────────────

describe('logReading', () => {
  it('appends one entry with auto-incremented id', () => {
    const store = freshStore()
    store.logReading(SNAP, 'manual')
    expect(store.entries).toHaveLength(1)
    expect(store.entries[0]!.id).toBe(1)
    store.logReading(SNAP, 'manual')
    expect(store.entries[1]!.id).toBe(2)
  })

  it('rounds Vm values to 3 decimal places in mV', () => {
    const store = freshStore()
    store.logReading(SNAP, 'manual')
    const e = store.entries[0]!
    expect(e.healthyVm).toBe(0.8)   // 0.0008 V × 1000 = 0.8 mV
    expect(e.targetVm).toBe(1.0)
  })

  it('stores temperature rounded to 1 decimal', () => {
    const store = freshStore()
    store.logReading({ ...SNAP, healthyTemp: 37.123, targetTemp: 38.456 }, 'manual')
    const e = store.entries[0]!
    expect(e.healthyTemp).toBe(37.1)
    expect(e.targetTemp).toBe(38.5)
  })

  it('stores the event type', () => {
    const store = freshStore()
    store.logReading(SNAP, 'lysis')
    expect(store.entries[0]!.event).toBe('lysis')
  })

  it('stores the current sessionName on the entry', () => {
    const store = freshStore()
    store.setSessionName('EP Buffer Run 3')
    store.logReading(SNAP, 'manual')
    expect(store.entries[0]!.sessionName).toBe('EP Buffer Run 3')
  })

  it('omits DEP fields in resonance chart mode', () => {
    const store = freshStore()
    store.logReading({ ...SNAP, chartMode: 'resonance' }, 'manual')
    const e = store.entries[0]!
    expect(e.depHealthyK).toBeUndefined()
    expect(e.depTargetK).toBeUndefined()
    expect(e.depHealthyCrossoverKHz).toBeUndefined()
    expect(e.depTargetCrossoverKHz).toBeUndefined()
    expect(e.healthyBiomodScore).toBeUndefined()
  })

  it('includes DEP fields in schwan chart mode', () => {
    const store = freshStore()
    store.logReading(SNAP, 'manual')
    const e = store.entries[0]!
    expect(e.depHealthyK).toBeDefined()
    expect(e.depTargetK).toBeDefined()
  })
})

// ── receiveEntry ──────────────────────────────────────────────────────────────

describe('receiveEntry', () => {
  it('appends a remote entry and advances nextId', () => {
    const store = freshStore()
    const remote = { ...SNAP, id: 5, timestamp: '2026-01-01 10:00:00', event: 'manual' as const }
    store.receiveEntry(remote as never)
    expect(store.entries).toHaveLength(1)
    expect(store.nextId).toBe(6)
  })

  it('deduplicates by id — same entry received twice is stored once', () => {
    const store = freshStore()
    const remote = { id: 3, timestamp: '2026-01-01 10:00:00', event: 'manual' as const,
      freqKHz: 500, fieldVcm: 100, medium: 'saline', targetPreset: 't',
      healthyVm: 0, targetVm: 0, selectivity: 0, healthyRatio: 0, targetRatio: 0,
      healthyTemp: 37, targetTemp: 37 }
    store.receiveEntry(remote as never)
    store.receiveEntry(remote as never)
    expect(store.entries).toHaveLength(1)
  })
})

// ── logOutcome ────────────────────────────────────────────────────────────────

describe('logOutcome', () => {
  it('attaches rating and aiSuggestionApplied to the matching entry', () => {
    const store = freshStore()
    store.logReading(SNAP, 'manual')
    const id = store.entries[0]!.id
    const updated = store.logOutcome(id, 4, true)
    expect(updated?.outcomeRating).toBe(4)
    expect(updated?.aiSuggestionApplied).toBe(true)
  })

  it('clamps rating to 1–5', () => {
    const store = freshStore()
    store.logReading(SNAP, 'manual')
    const id = store.entries[0]!.id
    expect(store.logOutcome(id, 0, false)?.outcomeRating).toBe(1)
    expect(store.logOutcome(id, 99, false)?.outcomeRating).toBe(5)
  })

  it('returns null for unknown entry id', () => {
    const store = freshStore()
    expect(store.logOutcome(999, 3, false)).toBeNull()
  })
})

// ── clearLog ──────────────────────────────────────────────────────────────────

describe('clearLog', () => {
  it('resets entries, nextId, and cumulative dose', () => {
    const store = freshStore()
    store.logReading(SNAP, 'manual')
    store.logReading(SNAP, 'manual')
    store.addDoseSample(100, 0.5, 1000)
    store.clearLog()
    expect(store.entries).toHaveLength(0)
    expect(store.nextId).toBe(1)
    expect(store.cumulativeDoseJkg).toBe(0)
  })
})

// ── addDoseSample ─────────────────────────────────────────────────────────────

describe('addDoseSample', () => {
  it('accumulates correctly: dose = SAR × DC × dt_s', () => {
    const store = freshStore()
    // SAR=100 W/kg, DC=0.5, dt=2000ms → dose = 100 × 0.5 × 2 = 100 J/kg
    store.addDoseSample(100, 0.5, 2000)
    expect(store.cumulativeDoseJkg).toBeCloseTo(100, 5)
  })

  it('accumulates across multiple calls', () => {
    const store = freshStore()
    store.addDoseSample(50, 1.0, 1000)   // 50 J/kg
    store.addDoseSample(50, 1.0, 1000)   // 50 J/kg
    expect(store.cumulativeDoseJkg).toBeCloseTo(100, 5)
  })
})

// ── setters ───────────────────────────────────────────────────────────────────

describe('setters', () => {
  it('setSessionName updates sessionName', () => {
    const store = freshStore()
    store.setSessionName('Protocol A')
    expect(store.sessionName).toBe('Protocol A')
  })

  it('setAiConsent updates aiConsentGiven', () => {
    const store = freshStore()
    expect(store.aiConsentGiven).toBe(false)
    store.setAiConsent(true)
    expect(store.aiConsentGiven).toBe(true)
  })
})

// ── localStorage persistence ──────────────────────────────────────────────────

describe('localStorage persistence', () => {
  it('restores sessionName after re-initialising the store', () => {
    // First session
    const store1 = freshStore()
    store1.setSessionName('Persistent Name')

    // Manually write state (simulating what $subscribe / persistedstate would do)
    localStorage.setItem('br-experiment', JSON.stringify({
      entries: [], nextId: 1, sessionName: 'Persistent Name',
      sampleDescription: '', sessionNotes: '', cumulativeDoseJkg: 0,
      sessionStartMs: Date.now(), aiConsentGiven: false,
    }))

    // Second session reads it back
    setActivePinia(createPinia())
    const store2 = useExperimentStore()
    expect(store2.sessionName).toBe('Persistent Name')
  })

  it('returns default state when localStorage is empty', () => {
    const store = freshStore()
    expect(store.entries).toHaveLength(0)
    expect(store.nextId).toBe(1)
    expect(store.aiConsentGiven).toBe(false)
  })

  it('returns default state when localStorage contains corrupt JSON', () => {
    localStorage.setItem('br-experiment', 'NOT JSON {{{{')
    setActivePinia(createPinia())
    const store = useExperimentStore()
    expect(store.entries).toHaveLength(0)
  })
})
