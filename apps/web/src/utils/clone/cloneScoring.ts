// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Clone scoring — Module 2a/2b. Ranks clones by composite production fitness and
// predicts long-term productivity from early screening data.

import {
  GENETIC_STABILITY, STABILITY_RISK,
  type CloneScreeningData, type CloneScore, type GeneticStability, type StabilityRisk,
} from '@/types/clone'

export const CLONE_WEIGHTS = {
  PRODUCTIVITY: 0.40,
  STABILITY:    0.30,
  GROWTH:       0.15,
  QUALITY:      0.15,
} as const

// Fraction of early titer retained at late passage / scale, by genetic stability tier.
const RETENTION_BY_STABILITY: Record<GeneticStability, number> = {
  [GENETIC_STABILITY.STABLE]:   0.95,
  [GENETIC_STABILITY.MODERATE]: 0.78,
  [GENETIC_STABILITY.UNSTABLE]: 0.50,
}

const STABILITY_BASE_SCORE: Record<GeneticStability, number> = {
  [GENETIC_STABILITY.STABLE]:   1.0,
  [GENETIC_STABILITY.MODERATE]: 0.65,
  [GENETIC_STABILITY.UNSTABLE]: 0.30,
}

/**
 * Rank a set of clones. Productivity is normalized within the screened set;
 * stability/growth/quality are absolute. Returns clones sorted by composite (desc).
 */
export function rankClones(clones: CloneScreeningData[]): CloneScore[] {
  if (clones.length === 0) return []

  const maxTiter = Math.max(...clones.map(c => c.titerDay14GL), 0.001)
  const maxVcd   = Math.max(...clones.map(c => c.peakVcdE6), 0.001)

  const scored: CloneScore[] = clones.map(clone => {
    const productivityScore = clamp01(clone.titerDay14GL / maxTiter)
    const stabilityScore    = stabilityScoreFor(clone)
    const growthScore       = clamp01((clone.peakVcdE6 / maxVcd) * 0.7 + (clone.viabilityPct / 100) * 0.3)
    const qualityScore      = clamp01(1 - clone.aggregatePct / 10)   // 10%+ aggregate scores 0

    const composite =
      CLONE_WEIGHTS.PRODUCTIVITY * productivityScore +
      CLONE_WEIGHTS.STABILITY    * stabilityScore +
      CLONE_WEIGHTS.GROWTH       * growthScore +
      CLONE_WEIGHTS.QUALITY      * qualityScore

    return {
      cloneId:                  clone.id,
      composite,
      productivityScore,
      stabilityScore,
      growthScore,
      qualityScore,
      predictedLongTermTiterGL: predictLongTermTiter(clone),
      stabilityRisk:            stabilityRiskFor(clone),
      reasons:                  buildReasons(clone, productivityScore, qualityScore),
    }
  })

  return scored.sort((a, b) => b.composite - a.composite)
}

/**
 * Project long-term / at-scale titer from early screening data.
 * Combines harvest titer with a retention factor (genetic stability) and a
 * titer-trajectory consistency adjustment (steady growth predicts better retention).
 */
export function predictLongTermTiter(clone: CloneScreeningData): number {
  const retention = RETENTION_BY_STABILITY[clone.geneticStability]
  const trajectory = trajectoryConsistency(clone)
  const projected = clone.titerDay14GL * retention * (0.85 + 0.15 * trajectory)
  return round(projected, 2)
}

function stabilityScoreFor(clone: CloneScreeningData): number {
  const base = STABILITY_BASE_SCORE[clone.geneticStability]
  return clamp01(base * (0.7 + 0.3 * trajectoryConsistency(clone)))
}

function stabilityRiskFor(clone: CloneScreeningData): StabilityRisk {
  if (clone.geneticStability === GENETIC_STABILITY.UNSTABLE) return STABILITY_RISK.HIGH
  if (clone.geneticStability === GENETIC_STABILITY.MODERATE) return STABILITY_RISK.MEDIUM
  return trajectoryConsistency(clone) < 0.5 ? STABILITY_RISK.MEDIUM : STABILITY_RISK.LOW
}

// 0-1: how steadily titer rises across day 3 -> 7 -> 14. Monotonic, accelerating growth = 1.
function trajectoryConsistency(clone: CloneScreeningData): number {
  const d1 = clone.titerDay7GL - clone.titerDay3GL
  const d2 = clone.titerDay14GL - clone.titerDay7GL
  if (clone.titerDay14GL <= 0) return 0
  if (d1 <= 0 && d2 <= 0) return 0.1
  if (d2 < 0) return 0.4                       // titer dropped late (stress / instability signal)
  const ratio = d1 > 0 ? Math.min(d2 / d1, 2) : 1
  return clamp01(0.5 + 0.25 * ratio)
}

function buildReasons(clone: CloneScreeningData, productivity: number, quality: number): string[] {
  const out: string[] = []
  if (productivity >= 0.85) out.push(`Top-tier harvest titer (${clone.titerDay14GL} g/L)`)
  if (clone.geneticStability === GENETIC_STABILITY.STABLE) out.push('Genetically stable, low passage-drift risk')
  if (clone.geneticStability === GENETIC_STABILITY.UNSTABLE) out.push('Genetic instability flagged, productivity may decline at passage')
  if (quality < 0.6) out.push(`High aggregate (${clone.aggregatePct}%), added polishing burden`)
  if (clone.viabilityPct >= 90) out.push(`Strong viability (${clone.viabilityPct}%)`)
  return out.slice(0, 3)
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x))
}

function round(x: number, dp: number): number {
  const f = Math.pow(10, dp)
  return Math.round(x * f) / f
}
