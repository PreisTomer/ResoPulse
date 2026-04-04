// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import type { PopStats } from './popPanelCompute'

type TFn = (key: string, params?: Record<string, unknown>) => string
type PopulationSide = 'target' | 'healthy'

export function createPopulationStatCardTooltips(t: TFn) {
  return {
    card(side: PopulationSide, label: string, uncPct: number): string {
      return t(side === 'target' ? 'population.tipTargetCard' : 'population.tipHealthyCard', {
        label,
        uncPct,
      })
    },

    lysed(side: PopulationSide, stats: PopStats): string {
      return t(side === 'target' ? 'population.tipLysedTarget' : 'population.tipLysedHealthy', {
        pct: stats.pctLysed,
        se: stats.seLysed,
      })
    },

    revEp(side: PopulationSide, stats: PopStats): string {
      return t(side === 'target' ? 'population.tipRevEpTarget' : 'population.tipRevEpHealthy', {
        pct: stats.pctRevEp,
        se: stats.seRevEp,
      })
    },

    nourishing(side: PopulationSide, stats: PopStats): string {
      return t(side === 'target' ? 'population.tipNourTarget' : 'population.tipNourHealthy', {
        pct: stats.pctNour,
        se: stats.seNour,
      })
    },

    meanDr(stats: Pick<PopStats, 'meanDr' | 'stdDr'>, uncPct: number): string {
      return t('population.tipMeanDr', {
        mean: stats.meanDr.toFixed(3),
        std: stats.stdDr.toFixed(3),
        uncPct,
      })
    },
  }
}