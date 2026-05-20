// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Yield prediction engine — Module 3. Computes per-step and cumulative recovery for a downstream train.

import { getStepById, type ProcessStepEntry } from '@/constants/processStepCatalog'

import type { ProcessStepInstance, StepYieldResult, DownstreamPrediction } from '@/types/downstream'

const BOTTLENECK_MARGIN = 0.0001

/**
 * Predict the full downstream train outcome from a starting mass and an ordered list of step instances.
 */
export function predictDownstream(
  steps:         ProcessStepInstance[],
  startingMassG: number,
): DownstreamPrediction {
  let runningMass = startingMassG
  let cumulativeYieldFraction = 1
  let totalHcp = 0
  let totalDna = 0

  const results: StepYieldResult[] = []

  for (const instance of steps) {
    const entry = getStepById(instance.stepType)
    if (!entry) continue

    const yieldPct = predictStepYield(entry, instance.paramValues)
    const yieldFraction = yieldPct / 100
    const inputMass = runningMass
    const outputMass = inputMass * yieldFraction
    runningMass = outputMass
    cumulativeYieldFraction *= yieldFraction
    totalHcp += midpoint(entry.hcpLogReduction)
    totalDna += midpoint(entry.dnaLogReduction)

    results.push({
      instanceId:         instance.id,
      stepType:           instance.stepType,
      inputMassG:         inputMass,
      outputMassG:        outputMass,
      yieldPct,
      uncertaintyPct:     entry.yieldRangePct,
      cumulativeYieldPct: cumulativeYieldFraction * 100,
      hcpLogReduction:    midpoint(entry.hcpLogReduction),
      dnaLogReduction:    midpoint(entry.dnaLogReduction),
    })
  }

  return {
    steps:                results,
    startingMassG,
    finalMassG:           runningMass,
    cumulativeYieldPct:   cumulativeYieldFraction * 100,
    totalHcpLogReduction: totalHcp,
    totalDnaLogReduction: totalDna,
    bottleneckInstanceId: findBottleneck(results),
  }
}

/**
 * Predict a single step's recovery (%), starting from the catalog range midpoint and
 * adjusting for parameter values that push the step away from its optimum.
 */
export function predictStepYield(entry: ProcessStepEntry, paramValues: Record<string, number>): number {
  const [low, high] = entry.yieldRangePct
  const baseYield = (low + high) / 2

  // Parameter penalties: each yield-affecting parameter that sits far from the middle of its
  // range costs a fraction of the available headroom. Keeps the prediction inside the catalog band.
  let penalty = 0
  for (const param of entry.parameters) {
    if (!param.affectsYield) continue
    const value = paramValues[param.key] ?? param.defaultValue
    const span = param.max - param.min
    if (span <= 0) continue
    const mid = (param.max + param.min) / 2
    const normalizedDeviation = Math.abs(value - mid) / (span / 2)   // 0 at centre, 1 at edge
    penalty += Math.max(0, normalizedDeviation - 0.5) * 0.5          // only deviations past half-range cost yield
  }

  const headroom = baseYield - low
  const predicted = baseYield - penalty * headroom
  return clamp(predicted, low * 0.9, high)
}

function findBottleneck(results: StepYieldResult[]): string | null {
  if (results.length === 0) return null
  let worst = results[0]!
  for (const r of results) {
    if (r.yieldPct < worst.yieldPct - BOTTLENECK_MARGIN) worst = r
  }
  // Only flag a bottleneck when it is meaningfully below the process average.
  const avg = results.reduce((s, r) => s + r.yieldPct, 0) / results.length
  return worst.yieldPct < avg - 5 ? worst.instanceId : null
}

function midpoint(range: [number, number]): number {
  return (range[0] + range[1]) / 2
}

function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x))
}
