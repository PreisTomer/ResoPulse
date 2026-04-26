// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// Two strategies, picked by the caller depending on calibration state:
//   1. Space-filling (maximin distance) — geometry-only, used when no calibration covariance exists. Honest "explore" mode for the uncalibrated case.
//   2. D-optimal expected information gain — physics-driven, used when a fit's covariance is available. Picks the (f, E, dc) that most reduces parameter uncertainty by the change in log det of the Fisher information.

import { computeSchwanDR, computeResonantDR, jacobianSchwanDR, jacobianResonantDR, type ForwardDrInput, type JacobianTwoParam } from '@/utils/physics'

import type { LogEntry } from '@/types/experiment'
import type { SliderRange } from '@/constants/sliderBounds'
import type { CellConfig } from '@/types/cell'

export type SuggestionStrategy = 'cold-start' | 'space-filling' | 'd-optimal'

export interface SuggestedProtocol {
  freqKHz:        number
  fieldVcm:       number
  dutyCycle:      number
  strategy:       SuggestionStrategy
  measuredCount:  number
  // D-optimal only: the relative information-gain score (log det Δ). Larger = more informative for the active calibration. Omitted for space-filling / cold-start.
  infoGainScore?: number
}

// Forward-physics context for D-optimal scoring. Caller supplies this only when a calibration covariance exists; otherwise the suggester falls back to space-filling.
export interface PhysicsContext {
  mode:                'schwan' | 'resonance'
  cell:                CellConfig          // the calibrated effectiveTarget (or effectiveHealthy)
  sigma_e:             number
  cosTheta:            number
  tempC:               number
  pulseWidthNs:        number
  hfireMult:           number
  effectivePulseCount: number
  waveform:            'cw' | 'pulsed' | 'hfire'
}

const FREQ_GRID_STEPS  = 5
const FIELD_GRID_STEPS = 5
const DUTY_GRID_STEPS  = 3
const DUTY_MIN         = 0.005
const DUTY_MAX         = 0.05
const DEFAULT_DUTY     = 0.01
const TOP_N            = 3
const EPS_FREQ_LOG  = 0.1
const EPS_FIELD_LOG = 0.05

// Identity-prior on the Fisher information so an empty F doesn't make log det = -∞ on the first pick. Small enough that even one informative measurement dominates.
const FISHER_PRIOR_EPS = 1e-9

// ── Public entry points ─────────────────────────────────────────────────────

export function suggestNextProtocol(entries: LogEntry[], bounds: SliderRange, physics?: PhysicsContext): SuggestedProtocol {
  return suggestNextProtocols(entries, bounds, 1, physics)[0]!
}

export function suggestNextProtocols(entries: LogEntry[], bounds: SliderRange, n = TOP_N, physics?: PhysicsContext): SuggestedProtocol[] {
  const measured = entries.filter(e => e.measured !== undefined)
  const count    = Math.max(1, n)

  if (measured.length === 0) {
    return [coldStart(bounds)]
  }

  if (physics) {
    return suggestDOptimal(measured, bounds, count, physics)
  }

  return suggestSpaceFilling(measured, bounds, count)
}

// ── Strategy: cold-start (no measurements yet) ─────────────────────────────

function coldStart(bounds: SliderRange): SuggestedProtocol {
  return {
    freqKHz:       Math.round(geometricMean(bounds.freqMin, bounds.freqMax)),
    fieldVcm:      Math.round(geometricMean(bounds.fieldMin, bounds.fieldMax)),
    dutyCycle:     DEFAULT_DUTY,
    strategy:      'cold-start',
    measuredCount: 0,
  }
}

function geometricMean(a: number, b: number): number {
  return Math.sqrt(Math.max(a, 0) * Math.max(b, 0))
}

// ── Strategy: space-filling (maximin distance, geometry-only) ──────────────

function suggestSpaceFilling(measured: LogEntry[], bounds: SliderRange, count: number): SuggestedProtocol[] {
  const candidates = generateLogGrid(bounds)
  const ranked     = rankByFarthestMinDistance(candidates, measured, bounds)
  const picks      = pickWithEpsilonExclusion(ranked, count, bounds)
  return picks.map(c => ({
    freqKHz:       c.freqKHz,
    fieldVcm:      c.fieldVcm,
    dutyCycle:     c.dutyCycle,
    strategy:      'space-filling',
    measuredCount: measured.length,
  }))
}

interface Candidate {
  freqKHz:   number
  fieldVcm:  number
  dutyCycle: number
  freqLog:   number
  fieldLog:  number
}

function generateLogGrid(b: SliderRange): Candidate[] {
  const fLogMin = Math.log10(Math.max(b.freqMin, 1))
  const fLogMax = Math.log10(Math.max(b.freqMax, b.freqMin + 1))
  const eLogMin = Math.log10(Math.max(b.fieldMin, 1))
  const eLogMax = Math.log10(Math.max(b.fieldMax, b.fieldMin + 1))
  const out: Candidate[] = []
  for (let i = 0; i < FREQ_GRID_STEPS; i++) {
    for (let j = 0; j < FIELD_GRID_STEPS; j++) {
      for (let k = 0; k < DUTY_GRID_STEPS; k++) {
        const fi = fLogMin + (fLogMax - fLogMin) * (i / (FREQ_GRID_STEPS - 1))
        const ej = eLogMin + (eLogMax - eLogMin) * (j / (FIELD_GRID_STEPS - 1))
        const dk = DUTY_MIN + (DUTY_MAX - DUTY_MIN) * (k / (DUTY_GRID_STEPS - 1))
        out.push({
          freqKHz:   Math.round(Math.pow(10, fi)),
          fieldVcm:  Math.round(Math.pow(10, ej)),
          dutyCycle: Math.round(dk * 10000) / 10000,
          freqLog:   fi,
          fieldLog:  ej,
        })
      }
    }
  }
  return out
}

interface Ranked extends Candidate { score: number }

function rankByFarthestMinDistance(candidates: Candidate[], measured: LogEntry[], b: SliderRange): Ranked[] {
  const fRange = Math.log10(Math.max(b.freqMax, 1))  - Math.log10(Math.max(b.freqMin, 1))  || 1
  const eRange = Math.log10(Math.max(b.fieldMax, 1)) - Math.log10(Math.max(b.fieldMin, 1)) || 1
  const scored: Ranked[] = candidates.map(c => {
    let minDist = Infinity
    for (const m of measured) {
      const df = (c.freqLog  - Math.log10(Math.max(m.freqKHz,  1))) / fRange
      const de = (c.fieldLog - Math.log10(Math.max(m.fieldVcm, 1))) / eRange
      const d  = Math.sqrt(df * df + de * de)
      if (d < minDist) minDist = d
    }
    return { ...c, score: minDist }
  })
  scored.sort((a, b2) => b2.score - a.score)
  return scored
}

function pickWithEpsilonExclusion(ranked: Ranked[], count: number, b: SliderRange): Candidate[] {
  const fRange = Math.log10(Math.max(b.freqMax, 1))  - Math.log10(Math.max(b.freqMin, 1))  || 1
  const eRange = Math.log10(Math.max(b.fieldMax, 1)) - Math.log10(Math.max(b.fieldMin, 1)) || 1
  const picks  = new Set<Ranked>()
  for (const c of ranked) {
    const tooClose = [...picks].some(p => {
      const df = Math.abs(c.freqLog  - p.freqLog)  / fRange
      const de = Math.abs(c.fieldLog - p.fieldLog) / eRange
      return df < EPS_FREQ_LOG && de < EPS_FIELD_LOG
    })
    if (!tooClose) picks.add(c)
    if (picks.size >= count) break
  }
  if (picks.size < count) {
    for (const c of ranked) {
      if (!picks.has(c)) picks.add(c)
      if (picks.size >= count) break
    }
  }
  return [...picks]
}

// ── Strategy: D-optimal expected information gain ──────────────────────────

interface SymMatrix2x2 { a: number; b: number; d: number }   // [[a, b], [b, d]]

function det2(m: SymMatrix2x2): number { return m.a * m.d - m.b * m.b }

function logDet2(m: SymMatrix2x2): number {
  const det = det2(m)
  return det > 0 ? Math.log(det) : -Infinity
}

function fisherFromJacobianRow(j: JacobianTwoParam): SymMatrix2x2 {
  return { a: j.p1 * j.p1, b: j.p1 * j.p2, d: j.p2 * j.p2 }
}

function addSymMatrix(m1: SymMatrix2x2, m2: SymMatrix2x2): SymMatrix2x2 {
  return { a: m1.a + m2.a, b: m1.b + m2.b, d: m1.d + m2.d }
}

function buildPriorFisher(): SymMatrix2x2 {
  return { a: FISHER_PRIOR_EPS, b: 0, d: FISHER_PRIOR_EPS }
}

// Build a ForwardDrInput from a logged measurement, falling back to the live physics context for fields the log doesn't carry (cosTheta is encoded as orientationDeg on the row).
function inputFromMeasurement(entry: LogEntry, ctx: PhysicsContext): ForwardDrInput {
  const orientationDeg = entry.orientationDeg ?? 0
  const cosTheta       = Math.abs(Math.cos(orientationDeg * Math.PI / 180))
  const waveform       = (entry.waveform as 'cw' | 'pulsed' | 'hfire') ?? ctx.waveform
  const isPulsed       = waveform !== 'cw'
  const hfireMult      = waveform === 'hfire' ? 1.75 : 1.0
  const nPulses        = waveform === 'cw' ? 1 : (entry.lysisNPulses ?? ctx.effectivePulseCount)
  return {
    cell:                ctx.cell,
    freqKHz:             entry.freqKHz,
    fieldVcm:            entry.fieldVcm,
    sigma_e:             entry.sigmaE ?? ctx.sigma_e,
    cosTheta,
    tempC:               (entry.targetTemp ?? ctx.tempC),
    pulseWidthNs:        entry.pulseWidthNs ?? ctx.pulseWidthNs,
    isPulsed,
    hfireMult,
    effectivePulseCount: nPulses,
  }
}

function inputFromCandidate(c: Candidate, ctx: PhysicsContext): ForwardDrInput {
  const isPulsed  = ctx.waveform !== 'cw'
  return {
    cell:                ctx.cell,
    freqKHz:             c.freqKHz,
    fieldVcm:            c.fieldVcm,
    sigma_e:             ctx.sigma_e,
    cosTheta:            ctx.cosTheta,
    tempC:               ctx.tempC,
    pulseWidthNs:        ctx.pulseWidthNs,
    isPulsed,
    hfireMult:           ctx.hfireMult,
    effectivePulseCount: ctx.effectivePulseCount,
  }
}

function jacobianFor(mode: PhysicsContext['mode'], input: ForwardDrInput): JacobianTwoParam {
  return mode === 'resonance' ? jacobianResonantDR(input) : jacobianSchwanDR(input)
}

function forwardFor(mode: PhysicsContext['mode'], input: ForwardDrInput): number {
  return mode === 'resonance' ? computeResonantDR(input) : computeSchwanDR(input)
}

function suggestDOptimal(measured: LogEntry[], bounds: SliderRange, count: number, ctx: PhysicsContext): SuggestedProtocol[] {
  // Build the prior Fisher information from logged measurements. F = ε·I + Σ_i J_iᵀ J_i.
  let fisher = buildPriorFisher()
  for (const m of measured) {
    const fwdInput = inputFromMeasurement(m, ctx)
    const dr = forwardFor(ctx.mode, fwdInput)
    if (dr <= 0) continue
    const jac = jacobianFor(ctx.mode, fwdInput)
    if (!Number.isFinite(jac.p1) || !Number.isFinite(jac.p2)) continue
    fisher = addSymMatrix(fisher, fisherFromJacobianRow(jac))
  }
  const baselineLogDet = logDet2(fisher)

  // Score each candidate by the marginal increase in log det. Larger = more informative.
  const candidates = generateLogGrid(bounds)
  const scored = candidates.map(c => {
    const fwdInput = inputFromCandidate(c, ctx)
    const dr  = forwardFor(ctx.mode, fwdInput)
    if (dr <= 0) return { ...c, score: -Infinity }
    const jac = jacobianFor(ctx.mode, fwdInput)
    if (!Number.isFinite(jac.p1) || !Number.isFinite(jac.p2)) return { ...c, score: -Infinity }
    const updated = addSymMatrix(fisher, fisherFromJacobianRow(jac))
    return { ...c, score: logDet2(updated) - baselineLogDet }
  }) as Ranked[]
  scored.sort((a, b) => b.score - a.score)

  // Sequential pick: after each accepted candidate, fold its Jacobian into Fisher and rescore. Better than batch top-N because it captures the overlap between picks (two highly informative candidates near each other won't both be picked).
  const picks: Array<Ranked & { infoGainScore: number }> = []
  let runningFisher = fisher
  let runningLogDet = baselineLogDet

  for (let pickIdx = 0; pickIdx < count; pickIdx++) {
    let bestIdx   = -1
    let bestScore = -Infinity
    for (let i = 0; i < scored.length; i++) {
      const c = scored[i]!
      if (picks.some(p => Math.abs(c.freqLog - p.freqLog)  < EPS_FREQ_LOG &&
                          Math.abs(c.fieldLog - p.fieldLog) < EPS_FIELD_LOG)) continue
      const fwdInput = inputFromCandidate(c, ctx)
      const dr  = forwardFor(ctx.mode, fwdInput)
      if (dr <= 0) continue
      const jac = jacobianFor(ctx.mode, fwdInput)
      if (!Number.isFinite(jac.p1) || !Number.isFinite(jac.p2)) continue
      const updated = addSymMatrix(runningFisher, fisherFromJacobianRow(jac))
      const gain = logDet2(updated) - runningLogDet
      if (gain > bestScore) { bestScore = gain; bestIdx = i }
    }
    if (bestIdx === -1 || !Number.isFinite(bestScore)) break
    const winner = scored[bestIdx]!
    const fwdInput = inputFromCandidate(winner, ctx)
    runningFisher = addSymMatrix(runningFisher, fisherFromJacobianRow(jacobianFor(ctx.mode, fwdInput)))
    runningLogDet = logDet2(runningFisher)
    picks.push({ ...winner, infoGainScore: bestScore })
  }

  // Fall back to space-filling fill-in if D-optimal couldn't produce enough picks (e.g. all candidates evaluate to dr<=0 due to sub-threshold conditions).
  if (picks.length < count) {
    const filler = suggestSpaceFilling(measured, bounds, count - picks.length)
    return [
      ...picks.map(c => ({
        freqKHz: c.freqKHz, fieldVcm: c.fieldVcm, dutyCycle: c.dutyCycle,
        strategy: 'd-optimal' as const, measuredCount: measured.length, infoGainScore: c.infoGainScore,
      })),
      ...filler,
    ]
  }

  return picks.map(c => ({
    freqKHz: c.freqKHz, fieldVcm: c.fieldVcm, dutyCycle: c.dutyCycle,
    strategy: 'd-optimal' as const, measuredCount: measured.length, infoGainScore: c.infoGainScore,
  }))
}
