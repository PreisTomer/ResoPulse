// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { describe, expect, it } from 'vitest'

import { buildNoSweepWindowTooltip, buildSweepWindowTooltip, createSweepKeyPointTooltips } from '../lib/sweepTooltipModel'

describe('sweepTooltipModel helpers', () => {
  it('creates key point tooltip bindings for the active sweep parameter', () => {
    const tooltips = createSweepKeyPointTooltips('field')

    expect(tooltips.thresholdHeader).toContain('Key field value')
    expect(tooltips.label({ label: '85%', drH: 0.2, drT: 0.9, ti: 4.5, tT: 39 })).toContain('85%')
    expect(tooltips.drTarget({ label: '85%', drH: 0.2, drT: 0.9, ti: 4.5, tT: 39 })).toContain('Target DR = 0.900')
    expect(tooltips.drHealthy({ label: '85%', drH: 0.2, drT: 0.9, ti: 4.5, tT: 39 })).toContain('Healthy DR = 0.200')
    expect(tooltips.ti({ label: '85%', drH: 0.2, drT: 0.9, ti: 4.5, tT: 39 })).toContain('TI = 4.500')
    expect(tooltips.temp({ label: '85%', drH: 0.2, drT: 0.9, ti: 4.5, tT: 39 })).toContain('T_ss (target) = 39.0')
  })

  it('builds the active selectivity-window tooltip', () => {
    const tooltip = buildSweepWindowTooltip({ lo: 12.4, hi: 18.6 }, 'field')

    expect(tooltip).toContain('Lo: 12 V/cm')
    expect(tooltip).toContain('Center: <span class="tip-val">16 V/cm</span>')
  })

  it('builds the no-window tooltip for the active parameter', () => {
    expect(buildNoSweepWindowTooltip('freq')).toContain('No frequency range found')
  })
})