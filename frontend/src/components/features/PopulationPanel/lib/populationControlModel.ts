// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

type TFn = (key: string) => string

export function buildPopulationSizeTooltip(t: TFn, n: number): string {
  if (n === 100) return t('population.tipNPill100')
  if (n === 300) return t('population.tipNPill300')
  return t('population.tipNPill1000')
}