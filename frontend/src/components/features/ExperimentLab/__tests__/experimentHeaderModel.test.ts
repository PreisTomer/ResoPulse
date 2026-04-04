// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { describe, expect, it } from 'vitest'

import { buildExperimentCellBadgeTooltip, formatSnapLysisCellLabel } from '../lib/experimentHeaderModel'

describe('experimentHeaderModel helpers', () => {
  it('builds cell badge tooltip payloads with formatted fc', () => {
    const builder = (opts: { label: string; radius: number; membraneThickness: number; fcDisplay: string }) =>
      `${opts.label}|${opts.radius}|${opts.membraneThickness}|${opts.fcDisplay}`

    expect(
      buildExperimentCellBadgeTooltip(
        builder,
        { label: 'Healthy HEK', radius: 7.4, membraneThickness: 4.8 },
        123.456,
      ),
    ).toBe('Healthy HEK|7.4|4.8|123 kHz')
  })

  it('formats the snap-bar lysis warning label', () => {
    expect(formatSnapLysisCellLabel('A549', 2500)).toBe('A549 (~2.5s)')
  })
})