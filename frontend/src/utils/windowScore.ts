// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { THRESHOLDS } from '@/constants/physics'

export type WindowScoreTier = 'good' | 'marginal' | 'poor'

export function computeWindowScore(targetLysisProbability: number, healthyLysisProbability: number): number {
  return targetLysisProbability * (1 - healthyLysisProbability)
}

export function getWindowScoreTier(score: number): WindowScoreTier {
  if (score >= THRESHOLDS.WINDOW_SCORE_GOOD) return 'good'
  if (score >= THRESHOLDS.WINDOW_SCORE_MARGINAL) return 'marginal'
  return 'poor'
}