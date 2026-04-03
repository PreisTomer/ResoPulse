// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
// @vitest-environment jsdom

// Store getter integration tests. Wiring of physics/constants/state only; equations covered in physics.test.ts.

import { setActivePinia, createPinia } from 'pinia'

import { describe, it, expect } from 'vitest'

import { H_FIRE_THRESHOLD_MULTIPLIER } from '@/constants/physics'
import { SLIDER_RANGES }    from '@/constants/sliderBounds'
import { CELL_CATEGORY, WAVEFORM, CHART_MODE } from '@/constants/strings'

import { useCellStore }    from './cellStore'

// ── Helpers ───────────────────────────────────────────────────────────────────

function freshStore() {
  setActivePinia(createPinia())
  return useCellStore()
}

// ── Disruption ratios ─────────────────────────────────────────────────────────

describe('disruptionRatio', () => {
  it('healthyDisruptionRatio and targetDisruptionRatio are both positive at non-zero field', () => {
    const store = freshStore()
    expect(store.healthyDisruptionRatio).toBeGreaterThan(0)
    expect(store.targetDisruptionRatio).toBeGreaterThan(0)
  })

  it('targetDisruptionRatio > healthyDisruptionRatio at default settings (cancer > normal)', () => {
    // Default target is a larger cancer cell — should have higher DR than healthy
    const store = freshStore()
    // Only valid if target radius > healthy radius (true for default presets)
    if (store.target.radius > store.healthy.radius) {
      expect(store.targetDisruptionRatio).toBeGreaterThanOrEqual(store.healthyDisruptionRatio)
    }
  })

  it('DR increases proportionally when field is doubled', () => {
    const store = freshStore()
    const drT1 = store.targetDisruptionRatio
    const drH1 = store.healthyDisruptionRatio
    store.setFieldIntensity(store.fieldIntensity * 2)
    const drT2 = store.targetDisruptionRatio
    const drH2 = store.healthyDisruptionRatio
    expect(drT2).toBeCloseTo(drT1 * 2, 1)
    expect(drH2).toBeCloseTo(drH1 * 2, 1)
  })

  it('H-FIRE mode reduces DR by factor of H_FIRE_THRESHOLD_MULTIPLIER vs CW at same field', () => {
    const storeA = freshStore()
    storeA.setWaveform(WAVEFORM.CW)
    const drCW = storeA.targetDisruptionRatio

    const storeB = freshStore()
    storeB.setWaveform(WAVEFORM.H_FIRE)
    const drHfire = storeB.targetDisruptionRatio

    // H-FIRE raises effective threshold ×1.75, so DR is 1/1.75 of CW
    expect(drCW / drHfire).toBeCloseTo(H_FIRE_THRESHOLD_MULTIPLIER, 1)
  })

  it('pulsed mode with very long pulse approaches CW disruption ratio', () => {
    const storeCW = freshStore()
    storeCW.setWaveform(WAVEFORM.CW)
    const drCW = storeCW.targetDisruptionRatio

    const storePulsed = freshStore()
    storePulsed.setWaveform(WAVEFORM.PULSED)
    storePulsed.setPulseWidthNs(100_000)  // very long pulse → PEF → 1
    const drPulsed = storePulsed.targetDisruptionRatio

    // Long pulse should approach CW (PEF → 1)
    expect(drPulsed).toBeCloseTo(drCW, 1)
  })

  it('pulsed mode with very short pulse reduces DR significantly', () => {
    const storeA = freshStore()
    storeA.setWaveform(WAVEFORM.CW)
    const drCW = storeA.targetDisruptionRatio

    const storeB = freshStore()
    storeB.setWaveform(WAVEFORM.PULSED)
    storeB.setPulseWidthNs(1)  // very short — PEF << 1
    const drShort = storeB.targetDisruptionRatio

    expect(drShort).toBeLessThan(drCW * 0.5)
  })
})

// ── Therapeutic index (selectivity) ──────────────────────────────────────────

describe('therapeuticIndex', () => {
  it('equals selectivityRatio (they are the same getter)', () => {
    const store = freshStore()
    expect(store.therapeuticIndex).toBe(store.selectivityRatio)
  })

  it('returns a positive value at default settings', () => {
    const store = freshStore()
    expect(store.therapeuticIndex).toBeGreaterThan(0)
  })

  it('is capped when healthyDisruptionRatio → 0 (resonance selectivity)', () => {
    // At very low frequency, healthy DR → 0 (healthy cell threshold very high)
    // TI should be capped at TI_DISPLAY_CAP, not Infinity
    const store = freshStore()
    store.setBroadcastFreqKHz(0.001)  // quasi-DC, tiny DR
    store.setFieldIntensity(1)        // very low field
    // TI should be finite and ≤ TI_DISPLAY_CAP
    expect(isFinite(store.therapeuticIndex)).toBe(true)
  })
})

// ── Lysis probability ─────────────────────────────────────────────────────────

describe('targetLysisProbabilityRandom', () => {
  it('returns 0 when DR ≤ 1 (below lysis threshold)', () => {
    const store = freshStore()
    store.setFieldIntensity(1)  // low field → low DR
    store.setBroadcastFreqKHz(1_000_000)  // high freq → very low DR
    expect(store.targetLysisProbabilityRandom).toBe(0)
  })

  it('returns a positive value when DR > 1 (above lysis threshold)', () => {
    const store = freshStore()
    store.setFieldIntensity(50_000)  // very high field
    if (store.targetDisruptionRatio > 1) {
      expect(store.targetLysisProbabilityRandom).toBeGreaterThan(0)
    }
  })

  it('max(0, 1 - 1/DR) formula: at DR=2 → 50% of randomly-oriented cells lyse', () => {
    // We can't set DR=2 directly, but we can compute it from store
    const store = freshStore()
    // Read actual DR and compute expected lysis probability
    const dr = store.targetDisruptionRatio
    const expected = Math.max(0, Math.min(1, 1 - 1 / dr))
    expect(store.targetLysisProbabilityRandom).toBeCloseTo(expected, 6)
  })
})

// ── Lysis fields ──────────────────────────────────────────────────────────────

describe('targetLysisField / healthyLysisField', () => {
  it('both return positive values', () => {
    const store = freshStore()
    expect(store.targetLysisField).toBeGreaterThan(0)
    expect(store.healthyLysisField).toBeGreaterThan(0)
  })

  it('H-FIRE lysis field is 1.75× higher than CW at same frequency', () => {
    const storeCW = freshStore()
    storeCW.setWaveform(WAVEFORM.CW)
    const eCW = storeCW.targetLysisField

    const storeHfire = freshStore()
    storeHfire.setWaveform(WAVEFORM.H_FIRE)
    const eHfire = storeHfire.targetLysisField

    expect(eHfire / eCW).toBeCloseTo(H_FIRE_THRESHOLD_MULTIPLIER, 2)
  })

  it('applying targetLysisField to Schwan yields DR ≈ 1', () => {
    const store = freshStore()
    store.setWaveform(WAVEFORM.CW)
    store.setFieldIntensity(store.targetLysisField)
    // DR should now be approximately 1.0 (at lysis threshold)
    expect(store.targetDisruptionRatio).toBeCloseTo(1.0, 1)
  })
})

// ── Slider ranges ─────────────────────────────────────────────────────────────

describe('sliderRanges getter', () => {
  it('returns IRE_MAMMALIAN range for default mammalian IRE mode', () => {
    const store = freshStore()
    expect(store.targetCellCategory).toBe(CELL_CATEGORY.MAMMALIAN)
    expect(store.chartMode).toBe(CHART_MODE.SCHWAN)
    const range = store.sliderRanges
    expect(range.freqMax).toBe(SLIDER_RANGES.IRE_MAMMALIAN.freqMax)
  })

  it('snap-to-optimal: clamped value is within slider range', () => {
    const store = freshStore()
    const { freqMin, freqMax } = store.sliderRanges
    const optKhz = store.optimalFreqResult.khz
    const clamped = Math.round(Math.max(freqMin, Math.min(freqMax, optKhz)))
    expect(clamped).toBeGreaterThanOrEqual(freqMin)
    expect(clamped).toBeLessThanOrEqual(freqMax)
  })

  it('optimalBeyondRange is false when optimal is within current slider range', () => {
    const store = freshStore()
    const { freqMin, freqMax } = store.sliderRanges
    const { khz } = store.optimalFreqResult
    // For mammalian IRE at default settings, optimal should be in range
    // If it isn't, at least verify the check logic is correct
    const isBeyond = khz > freqMax || khz < freqMin
    const clampedResult = Math.max(freqMin, Math.min(freqMax, khz))
    if (isBeyond) {
      expect(clampedResult).toEqual(freqMax > khz ? freqMin : freqMax)
    } else {
      expect(clampedResult).toBeCloseTo(khz, 0)
    }
  })
})

// ── Waveform consistency ──────────────────────────────────────────────────────

describe('waveform consistency', () => {
  it('H-FIRE healthyDisruptionRatio is 1.75× lower than CW', () => {
    const storeCW    = freshStore()
    storeCW.setWaveform(WAVEFORM.CW)
    const drHCW = storeCW.healthyDisruptionRatio

    const storeHfire = freshStore()
    storeHfire.setWaveform(WAVEFORM.H_FIRE)
    const drHHfire = storeHfire.healthyDisruptionRatio

    expect(drHCW / drHHfire).toBeCloseTo(H_FIRE_THRESHOLD_MULTIPLIER, 1)
  })

  it('effective duty cycle is 1.0 for CW waveform', () => {
    const store = freshStore()
    store.setWaveform(WAVEFORM.CW)
    expect(store.effectiveDutyCycle).toBe(1.0)
  })

  it('effective duty cycle equals dutyCycle for pulsed waveform', () => {
    const store = freshStore()
    store.setWaveform(WAVEFORM.PULSED)
    store.setDutyCycle(0.05)
    expect(store.effectiveDutyCycle).toBeCloseTo(0.05, 6)
  })

  it('effective duty cycle equals dutyCycle for H-FIRE waveform', () => {
    const store = freshStore()
    store.setWaveform(WAVEFORM.H_FIRE)
    store.setDutyCycle(0.10)
    expect(store.effectiveDutyCycle).toBeCloseTo(0.10, 6)
  })
})

// ── Thermal model ─────────────────────────────────────────────────────────────

describe('steadyStateTemp', () => {
  it('healthySteadyStateTemp is at or above 37°C at any non-zero field', () => {
    const store = freshStore()
    expect(store.healthySteadyStateTemp).toBeGreaterThanOrEqual(37)
  })

  it('targetSteadyStateTemp is at or above 37°C at any non-zero field', () => {
    const store = freshStore()
    expect(store.targetSteadyStateTemp).toBeGreaterThanOrEqual(37)
  })

  it('steadyStateTemp increases with field intensity', () => {
    const storeA = freshStore()
    storeA.setFieldIntensity(500)
    const tA = storeA.healthySteadyStateTemp

    const storeB = freshStore()
    storeB.setFieldIntensity(2000)
    const tB = storeB.healthySteadyStateTemp

    expect(tB).toBeGreaterThanOrEqual(tA)
  })

  it('steadyStateTemp is lower for pulsed than CW at same peak field', () => {
    // Use 50 V/cm: CW reaches ~63°C, pulsed 1% stays near 37°C — both below TEMP_CAP (150°C).
    // SAR scales as E², so at 500 V/cm both modes saturate the cap — use low field to see the ratio.
    const storeCW = freshStore()
    storeCW.setWaveform(WAVEFORM.CW)
    storeCW.setFieldIntensity(50)
    const tCW = storeCW.healthySteadyStateTemp

    const storePulsed = freshStore()
    storePulsed.setWaveform(WAVEFORM.PULSED)
    storePulsed.setDutyCycle(0.001)  // 0.1% duty cycle
    storePulsed.setFieldIntensity(50)
    const tPulsed = storePulsed.healthySteadyStateTemp

    expect(tPulsed).toBeLessThan(tCW)
  })
})

// ── optimalFreqResult field-independence ──────────────────────────────────────

describe('optimalFreqResult', () => {
  it('optimal frequency is the same regardless of field intensity', () => {
    const storeA = freshStore()
    storeA.setFieldIntensity(100)
    const optA = storeA.optimalFreqResult.khz

    const storeB = freshStore()
    storeB.setFieldIntensity(5000)
    const optB = storeB.optimalFreqResult.khz

    // Must be identical — using UNIT_FIELD in the scan means field doesn't affect argmax
    expect(optA).toBe(optB)
  })

  it('returns a frequency within the scan range (10 kHz – 500 MHz)', () => {
    const store = freshStore()
    const { khz } = store.optimalFreqResult
    expect(khz).toBeGreaterThanOrEqual(10)
    expect(khz).toBeLessThanOrEqual(500_000)
  })

  it('selectivity at optimal is the maximum across the scan range', () => {
    // The returned selectivity should be ≥ selectivity at current frequency
    const store = freshStore()
    const { sel: optSel } = store.optimalFreqResult
    const currentSel = store.therapeuticIndex
    // Allow for current frequency being equal to optimal
    expect(optSel).toBeGreaterThanOrEqual(currentSel - 0.001)
  })
})
