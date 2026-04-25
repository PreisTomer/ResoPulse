// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import type { LogEntry } from '@/types/experiment'
import type { SliderRange } from '@/constants/sliderBounds'

export type SuggestionStrategy = 'cold-start' | 'explore'

export interface SuggestedProtocol {
  freqKHz:   number
  fieldVcm:  number
  dutyCycle: number
  rationale: string
  strategy:  SuggestionStrategy
}

const FREQ_GRID_STEPS  = 5
const FIELD_GRID_STEPS = 5
const DUTY_GRID_STEPS  = 3
const DUTY_MIN         = 0.005
const DUTY_MAX         = 0.05
const DEFAULT_DUTY     = 0.01
const TOP_N            = 3

// Epsilon exclusion keeps picked suggestions from collapsing on the same region.
const EPS_FREQ_LOG  = 0.1
const EPS_FIELD_LOG = 0.05

export function suggestNextProtocol(entries: LogEntry[], bounds: SliderRange): SuggestedProtocol {
  return suggestNextProtocols(entries, bounds, 1)[0]!
}

export function suggestNextProtocols(entries: LogEntry[], bounds: SliderRange, n = TOP_N): SuggestedProtocol[] {
  const measured = entries.filter(e => e.measured !== undefined)
  const count    = Math.max(1, n)

  if (measured.length === 0) {
    return [coldStart(bounds)]
  }

  const candidates = generateLogGrid(bounds)
  const ranked     = rankByFarthestMinDistance(candidates, measured, bounds)
  const picks      = pickWithEpsilonExclusion(ranked, count, bounds)

  return picks.map(c => ({
    freqKHz:   c.freqKHz,
    fieldVcm:  c.fieldVcm,
    dutyCycle: c.dutyCycle,
    rationale: `exploration: covers the (f, E, duty) region farthest from your ${measured.length} measured ${measured.length === 1 ? 'entry' : 'entries'}.`,
    strategy:  'explore',
  }))
}

function coldStart(bounds: SliderRange): SuggestedProtocol {
  return {
    freqKHz:   Math.round(geometricMean(bounds.freqMin, bounds.freqMax)),
    fieldVcm:  Math.round(geometricMean(bounds.fieldMin, bounds.fieldMax)),
    dutyCycle: DEFAULT_DUTY,
    rationale: 'cold-start: no measured outcomes yet. Start at the geometric midpoint of the slider bounds to anchor the parameter sweep.',
    strategy:  'cold-start',
  }
}

function geometricMean(a: number, b: number): number {
  return Math.sqrt(Math.max(a, 0) * Math.max(b, 0))
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
