// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { describe, expect, it } from 'vitest'

import { LOG_EVENT } from '@/constants/strings'

import {
  createExperimentLogTooltips,
  formatDoseBadge,
  formatOptionalRatioPct,
} from '../lib/experimentLogModel'

describe('experimentLogModel helpers', () => {
  const t = (key: string, params?: Record<string, unknown>) => `${key}:${JSON.stringify(params ?? {})}`

  it('formats cumulative dose badges by scale', () => {
    expect(formatDoseBadge(1500)).toBe('1.50 kJ/kg')
    expect(formatDoseBadge(12.3)).toBe('12.3 J/kg')
    expect(formatDoseBadge(0.012)).toBe('12 mJ/kg')
  })

  it('formats optional ratio percentages for display and tooltip params', () => {
    expect(formatOptionalRatioPct(undefined)).toBe('—')
    expect(formatOptionalRatioPct(0.4567)).toBe('45.7%')
  })

  it('creates bound experiment log tooltip handlers', () => {
    const tooltips = createExperimentLogTooltips(t)
    expect(tooltips.targetRatio({ targetRatio: 0.875 })).toBe('log.tipCellTRatio:{"ratio":"87.5"}')
    expect(tooltips.healthyRatio({ healthyRatio: 0.125 })).toBe('log.tipCellHRatio:{"ratio":"12.5"}')
    expect(tooltips.event({ event: LOG_EVENT.LYSIS })).toBe('log.tipCellLysis:{}')
    expect(tooltips.event({ event: LOG_EVENT.MANUAL })).toBe('log.tipCellManual:{}')
  })
})