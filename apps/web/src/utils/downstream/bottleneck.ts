// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Bottleneck suggestions — explains why a step limits yield and proposes parameter improvements.

import { getStepById, type StepParameter } from '@/constants/processStepCatalog'

import { predictStepYield } from './yieldPrediction'

export interface BottleneckSuggestion {
  paramLabel:      string
  currentValue:    number
  suggestedValue:  number
  unit:            string
  predictedGainPct: number      // estimated yield gain if applied
}

export interface BottleneckAnalysis {
  stepName:        string
  stepDescription: string
  currentYieldPct: number
  suggestions:     BottleneckSuggestion[]
}

/**
 * Analyze a bottleneck step: for each yield-affecting parameter sitting away from its optimum,
 * suggest moving it toward the centre of its range and estimate the yield gain.
 */
export function analyzeBottleneck(stepType: string, paramValues: Record<string, number>): BottleneckAnalysis | null {
  const entry = getStepById(stepType)
  if (!entry) return null

  const currentYield = predictStepYield(entry, paramValues)
  const suggestions: BottleneckSuggestion[] = []

  for (const param of entry.parameters) {
    if (!param.affectsYield) continue
    const current = paramValues[param.key] ?? param.defaultValue
    const mid = (param.max + param.min) / 2
    const span = param.max - param.min
    if (span <= 0) continue

    const normalizedDeviation = Math.abs(current - mid) / (span / 2)
    if (normalizedDeviation <= 0.5) continue   // already near optimum

    const improved = { ...paramValues, [param.key]: mid }
    const improvedYield = predictStepYield(entry, improved)
    const gain = improvedYield - currentYield
    if (gain <= 0.1) continue

    suggestions.push({
      paramLabel:      param.label,
      currentValue:    round(current, param),
      suggestedValue:  round(mid, param),
      unit:            param.unit,
      predictedGainPct: gain,
    })
  }

  suggestions.sort((a, b) => b.predictedGainPct - a.predictedGainPct)

  return {
    stepName:        entry.name,
    stepDescription: entry.description,
    currentYieldPct: currentYield,
    suggestions:     suggestions.slice(0, 3),
  }
}

function round(value: number, param: StepParameter): number {
  const span = param.max - param.min
  const decimals = span <= 2 ? 2 : span <= 20 ? 1 : 0
  return Number(value.toFixed(decimals))
}
