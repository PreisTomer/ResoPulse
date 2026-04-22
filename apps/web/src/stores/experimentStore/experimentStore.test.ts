// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

import { useExperimentStore } from '@/stores/experimentStore'
import { STORAGE_KEY } from '@/constants/storageKeys'

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

// ── logMeasuredOutcome ────────────────────────────────────────────────────────

describe('logMeasuredOutcome', () => {
  it('attaches measured values to the matching entry', () => {
    const store = freshStore()
    store.logReading(SNAP, 'manual')
    const id = store.entries[0]!.id
    const updated = store.logMeasuredOutcome(id, {
      targetLysisPct:  82.5,
      healthyLysisPct:  4.1,
      viabilityPct:    95.0,
      tempC:           39.2,
      notes:           '  Trypan blue, 10x  ',
    })
    expect(updated?.measured?.targetLysisPct).toBe(82.5)
    expect(updated?.measured?.healthyLysisPct).toBe(4.1)
    expect(updated?.measured?.viabilityPct).toBe(95.0)
    expect(updated?.measured?.tempC).toBe(39.2)
    expect(updated?.measured?.notes).toBe('Trypan blue, 10x')
    expect(typeof updated?.measured?.measuredAt).toBe('string')
  })

  it('clamps lysis and viability to 0–100', () => {
    const store = freshStore()
    store.logReading(SNAP, 'manual')
    const id = store.entries[0]!.id
    const updated = store.logMeasuredOutcome(id, {
      targetLysisPct:  120,   // → 100
      healthyLysisPct: -5,    // → 0
      viabilityPct:    150,   // → 100
    })
    expect(updated?.measured?.targetLysisPct).toBe(100)
    expect(updated?.measured?.healthyLysisPct).toBe(0)
    expect(updated?.measured?.viabilityPct).toBe(100)
  })

  it('rounds tempC to 1 decimal and leaves blank fields undefined', () => {
    const store = freshStore()
    store.logReading(SNAP, 'manual')
    const id = store.entries[0]!.id
    const updated = store.logMeasuredOutcome(id, {
      tempC: 38.456,
    })
    expect(updated?.measured?.tempC).toBe(38.5)
    expect(updated?.measured?.targetLysisPct).toBeUndefined()
    expect(updated?.measured?.viabilityPct).toBeUndefined()
    expect(updated?.measured?.notes).toBeUndefined()
  })

  it('returns null for unknown entry id', () => {
    const store = freshStore()
    expect(store.logMeasuredOutcome(999, { targetLysisPct: 50 })).toBeNull()
  })

  it('overwrites a previously-saved measured outcome on a second call', () => {
    const store = freshStore()
    store.logReading(SNAP, 'manual')
    const id = store.entries[0]!.id
    store.logMeasuredOutcome(id, { targetLysisPct: 70 })
    store.logMeasuredOutcome(id, { targetLysisPct: 85, notes: 'rerun' })
    expect(store.entries[0]!.measured?.targetLysisPct).toBe(85)
    expect(store.entries[0]!.measured?.notes).toBe('rerun')
  })

  it('clamps permeabilized and transfection percentages to 0–100', () => {
    const store = freshStore()
    store.logReading(SNAP, 'manual')
    const id = store.entries[0]!.id
    const updated = store.logMeasuredOutcome(id, {
      permeabilizedPct: 120,
      transfectionPct:  -4,
    })
    expect(updated?.measured?.permeabilizedPct).toBe(100)
    expect(updated?.measured?.transfectionPct).toBe(0)
  })

  it('stores viability assay method and rounds timepoint to 2 decimals', () => {
    const store = freshStore()
    store.logReading(SNAP, 'manual')
    const id = store.entries[0]!.id
    const updated = store.logMeasuredOutcome(id, {
      viabilityAssay:  'flowPi',
      assayTimepointH: 24.1234,
    })
    expect(updated?.measured?.viabilityAssay).toBe('flowPi')
    expect(updated?.measured?.assayTimepointH).toBe(24.12)
  })

  it('clamps negative physical-condition values to zero and rounds them', () => {
    const store = freshStore()
    store.logReading(SNAP, 'manual')
    const id = store.entries[0]!.id
    const updated = store.logMeasuredOutcome(id, {
      actualFieldVcm:       -50,
      observedLysisDelayMs: -1.7,
      assayTimepointH:      -2,
    })
    expect(updated?.measured?.actualFieldVcm).toBe(0)
    expect(updated?.measured?.observedLysisDelayMs).toBe(0)
    expect(updated?.measured?.assayTimepointH).toBe(0)
  })

  it('rounds actualFieldVcm to 1 decimal and observedLysisDelayMs to integer', () => {
    const store = freshStore()
    store.logReading(SNAP, 'manual')
    const id = store.entries[0]!.id
    const updated = store.logMeasuredOutcome(id, {
      actualFieldVcm:       1234.56,
      observedLysisDelayMs: 2500.6,
    })
    expect(updated?.measured?.actualFieldVcm).toBe(1234.6)
    expect(updated?.measured?.observedLysisDelayMs).toBe(2501)
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

// ── deleteEntry ───────────────────────────────────────────────────────────────

describe('deleteEntry', () => {
  it('removes the matching entry and leaves the rest in order', () => {
    const store = freshStore()
    store.logReading(SNAP, 'manual')
    store.logReading(SNAP, 'manual')
    store.logReading(SNAP, 'manual')
    const removed = store.deleteEntry(2)
    expect(removed).toBe(true)
    expect(store.entries).toHaveLength(2)
    expect(store.entries.map(e => e.id)).toEqual([1, 3])
  })

  it('returns false and leaves entries untouched when the id is unknown', () => {
    const store = freshStore()
    store.logReading(SNAP, 'manual')
    const removed = store.deleteEntry(999)
    expect(removed).toBe(false)
    expect(store.entries).toHaveLength(1)
  })

  it('does not reuse the deleted id for subsequent readings', () => {
    const store = freshStore()
    store.logReading(SNAP, 'manual')   // id 1
    store.logReading(SNAP, 'manual')   // id 2
    store.deleteEntry(2)
    store.logReading(SNAP, 'manual')   // expected id 3, not 2
    expect(store.entries.map(e => e.id)).toEqual([1, 3])
  })
})

// ── calibration getters ──────────────────────────────────────────────────────

describe('calibrationSummary / measuredResiduals / latestMeasuredOutcomes', () => {
  it('returns tier "none" when no entries are measured', () => {
    const store = freshStore()
    store.logReading(SNAP, 'manual')
    store.logReading(SNAP, 'manual')
    const summary = store.calibrationSummary
    expect(summary.tier).toBe('none')
    expect(summary.sampleCount).toBe(0)
    expect(summary.worstResidualPct).toBeNull()
    expect(summary.meanTargetResidualPct).toBeNull()
  })

  it('computes per-entry residual as measured - predicted (pp scale)', () => {
    const store = freshStore()
    store.logReading(SNAP, 'manual')
    // predicted targetRatio = 1.0 → 100 pp; measured = 92 → residual = -8 pp
    store.logMeasuredOutcome(1, { targetLysisPct: 92, healthyLysisPct: 75 })
    const residuals = store.measuredResiduals
    expect(residuals).toHaveLength(1)
    expect(residuals[0]!.targetResidualPct).toBeCloseTo(-8, 5)
    // predicted healthyRatio = 0.8 → 80 pp; measured = 75 → residual = -5 pp
    expect(residuals[0]!.healthyResidualPct).toBeCloseTo(-5, 5)
  })

  it('picks tier "drift" when mean residual exceeds CALIB_DRIFT_PP', () => {
    const store = freshStore()
    // 3 entries, each residual = 92 - 100 = -8 target (below drift threshold)
    // but healthy residual = 100 - 80 = +20 → triggers drift on healthy path
    for (let i = 0; i < 3; i++) {
      store.logReading(SNAP, 'manual')
      store.logMeasuredOutcome(i + 1, { targetLysisPct: 92, healthyLysisPct: 100 })
    }
    const summary = store.calibrationSummary
    expect(summary.sampleCount).toBe(3)
    expect(summary.tier).toBe('drift')
    expect(summary.meanHealthyResidualPct).toBeCloseTo(20, 5)
  })

  it('picks tier "strong" only when n >= CALIB_STRONG_SAMPLES AND worst < CALIB_STRONG_PP', () => {
    const store = freshStore()
    // 10 entries with residuals of ~0 pp (measured == predicted)
    for (let i = 0; i < 10; i++) {
      store.logReading(SNAP, 'manual')
      store.logMeasuredOutcome(i + 1, { targetLysisPct: 100, healthyLysisPct: 80 })
    }
    const summary = store.calibrationSummary
    expect(summary.sampleCount).toBe(10)
    expect(summary.tier).toBe('strong')
  })

  it('picks tier "moderate" when count >= min but residuals outside strong band', () => {
    const store = freshStore()
    for (let i = 0; i < 4; i++) {
      store.logReading(SNAP, 'manual')
      // +10 pp drift on target — above strong band (<5pp) but under drift (>15pp)
      store.logMeasuredOutcome(i + 1, { targetLysisPct: 110, healthyLysisPct: 80 })
    }
    expect(store.calibrationSummary.tier).toBe('moderate')
  })

  it('latestMeasuredOutcomes returns newest per-type pair with signed delta', () => {
    const store = freshStore()
    store.logReading(SNAP, 'manual')                            // id 1
    store.logMeasuredOutcome(1, { targetLysisPct: 90 })
    store.logReading(SNAP, 'manual')                            // id 2
    store.logMeasuredOutcome(2, { targetLysisPct: 85, healthyLysisPct: 70 })

    const { target, healthy } = store.latestMeasuredOutcomes
    expect(target).not.toBeNull()
    expect(target!.entryId).toBe(2)
    expect(target!.measuredPct).toBe(85)
    expect(target!.predictedPct).toBeCloseTo(100, 5)
    expect(target!.deltaPct).toBeCloseTo(-15, 5)

    expect(healthy).not.toBeNull()
    expect(healthy!.entryId).toBe(2)
    expect(healthy!.deltaPct).toBeCloseTo(-10, 5)
  })

  it('latestMeasuredOutcomes returns null for a type with no measured data', () => {
    const store = freshStore()
    store.logReading(SNAP, 'manual')
    store.logMeasuredOutcome(1, { targetLysisPct: 90 })        // target only
    const { target, healthy } = store.latestMeasuredOutcomes
    expect(target).not.toBeNull()
    expect(healthy).toBeNull()
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
    localStorage.setItem(STORAGE_KEY.EXPERIMENT_SESSION, JSON.stringify({
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
    localStorage.setItem(STORAGE_KEY.EXPERIMENT_SESSION, 'NOT JSON {{{{')
    setActivePinia(createPinia())
    const store = useExperimentStore()
    expect(store.entries).toHaveLength(0)
  })
})
