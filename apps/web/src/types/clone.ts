// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Clone screening types — Module 2a/2b. Early screening data per candidate clone,
// used to rank clones and predict long-term production performance.

export const GENETIC_STABILITY = {
  STABLE:    'stable',
  MODERATE:  'moderate',
  UNSTABLE:  'unstable',
} as const

export type GeneticStability = typeof GENETIC_STABILITY[keyof typeof GENETIC_STABILITY]

export interface CloneScreeningData {
  id:               string
  label:            string
  titerDay3GL:      number     // early titer, g/L
  titerDay7GL:      number
  titerDay14GL:     number     // harvest-day titer, g/L
  peakVcdE6:        number     // peak viable cell density, x10^6/mL
  viabilityPct:     number     // viability at harvest, %
  geneticStability: GeneticStability
  aggregatePct:     number     // % high-molecular-weight aggregate (quality, lower is better)
}

export const STABILITY_RISK = {
  LOW:    'low',
  MEDIUM: 'medium',
  HIGH:   'high',
} as const

export type StabilityRisk = typeof STABILITY_RISK[keyof typeof STABILITY_RISK]

export interface CloneScore {
  cloneId:                 string
  composite:               number          // 0-1 overall rank score
  productivityScore:       number          // 0-1
  stabilityScore:          number          // 0-1
  growthScore:             number          // 0-1
  qualityScore:            number          // 0-1
  predictedLongTermTiterGL: number         // projected titer at scale / late passage
  stabilityRisk:           StabilityRisk
  reasons:                 string[]        // human-readable rank rationale (max 3)
}
