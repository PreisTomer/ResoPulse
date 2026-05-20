// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

import { describe, it, expect } from 'vitest'

import { fitCalibration, applyCalibration } from './calibration'

describe('fitCalibration', () => {
  it('returns a neutral factor with no data', () => {
    const c = fitCalibration([])
    expect(c.factor).toBe(1)
    expect(c.sampleCount).toBe(0)
    expect(c.confidence).toBe(0)
  })

  it('fits a factor above 1 when actuals exceed predictions', () => {
    const c = fitCalibration([
      { predicted: 4, actual: 5 },
      { predicted: 4, actual: 5 },
    ])
    expect(c.factor).toBeCloseTo(1.25, 2)
    expect(c.sampleCount).toBe(2)
  })

  it('fits a factor below 1 when actuals fall short of predictions', () => {
    const c = fitCalibration([{ predicted: 10, actual: 6 }])
    expect(c.factor).toBeCloseTo(0.6, 2)
  })

  it('clamps the factor to the plausible band', () => {
    const high = fitCalibration([{ predicted: 1, actual: 100 }])
    expect(high.factor).toBeLessThanOrEqual(2.0)
    const low = fitCalibration([{ predicted: 100, actual: 1 }])
    expect(low.factor).toBeGreaterThanOrEqual(0.5)
  })

  it('confidence grows with sample count', () => {
    const few  = fitCalibration([{ predicted: 4, actual: 4 }])
    const many = fitCalibration(Array.from({ length: 8 }, () => ({ predicted: 4, actual: 4 })))
    expect(many.confidence).toBeGreaterThan(few.confidence)
  })

  it('ignores pairs with non-positive predictions', () => {
    const c = fitCalibration([{ predicted: 0, actual: 5 }, { predicted: 4, actual: 4 }])
    expect(c.sampleCount).toBe(1)
  })
})

describe('applyCalibration', () => {
  it('returns the raw prediction when there is no calibration data', () => {
    const c = fitCalibration([])
    expect(applyCalibration(50, c)).toBe(50)
  })

  it('scales the prediction by the fitted factor', () => {
    const c = fitCalibration([{ predicted: 4, actual: 5 }])
    expect(applyCalibration(40, c)).toBeCloseTo(50, 1)
  })
})
