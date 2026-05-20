// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Calibration store — derives correction factors from completed lab runs and exposes them
// so prediction surfaces can show calibrated estimates. Reactive over the lab runs store.

import { defineStore } from 'pinia'

import { fitCalibration, applyCalibration, type CalibrationResult, type PredictedActualPair } from '@/utils/calibration/calibration'

import { useLabRunsStore } from '@/stores/labRunsStore'

export const useCalibrationStore = defineStore('calibration', {
  getters: {
    titerCalibration(): CalibrationResult {
      const pairs = collectPairs('titer')
      return fitCalibration(pairs)
    },

    yieldCalibration(): CalibrationResult {
      const pairs = collectPairs('yield')
      return fitCalibration(pairs)
    },
  },

  actions: {
    calibrateTiter(prediction: number): number {
      return applyCalibration(prediction, this.titerCalibration)
    },

    calibrateYield(prediction: number): number {
      return applyCalibration(prediction, this.yieldCalibration)
    },
  },
})

function collectPairs(metric: 'titer' | 'yield'): PredictedActualPair[] {
  const labRuns = useLabRunsStore()
  const pairs: PredictedActualPair[] = []
  for (const run of labRuns.runs) {
    const o = run.outcomes
    if (metric === 'titer' && o.predictedTiterGL !== null && o.actualTiterGL !== null) {
      pairs.push({ predicted: o.predictedTiterGL, actual: o.actualTiterGL })
    }
    if (metric === 'yield' && o.predictedDownstreamYieldPct !== null && o.actualDownstreamYieldPct !== null) {
      pairs.push({ predicted: o.predictedDownstreamYieldPct, actual: o.actualDownstreamYieldPct })
    }
  }
  return pairs
}
