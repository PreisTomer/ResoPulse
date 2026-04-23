// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
import { describe, it, expect } from 'vitest'

import { userPresetsToJson } from '../userPresetExport'
import { parseUserPresetsJson } from './index'
import type { UserCellPreset } from '@/stores/userPresetsStore'

const BASE: UserCellPreset = {
  id:                   'p-1',
  role:                 'target',
  cellType:             'mammalian',
  label:                'HeLa',
  shortLabel:           'HeLa',
  notes:                'Kotnik & Miklavcic (2000)',
  parameterConfidence:  'literature',
  radius:               10,
  membraneThickness:    7,
  dielectricConstant:   10,
  conductivity:         0.5,
  thresholdVoltage:     0.8,
  density:              1050,
  specificHeatCapacity: 3500,
  sigmaUncertaintyPct:  30,
  sigmaSource:          'literature',
  sigmaCitation:        'Foster & Schwan 1989',
  nuclearRadius:        4,
  resonantFreqGHz:      0,
  createdAt:            1700000000000,
}

describe('parseUserPresetsJson', () => {
  it('round-trips a full preset from userPresetsToJson', () => {
    const text   = userPresetsToJson([BASE])
    const report = parseUserPresetsJson(text)
    expect(report.ok).toBe(true)
    expect(report.schema).toBe('resopulse-user-presets@1')
    expect(report.accepted).toHaveLength(1)
    const p = report.accepted[0]!
    expect(p.role).toBe('target')
    expect(p.cellType).toBe('mammalian')
    expect(p.label).toBe('HeLa')
    expect(p.radius).toBe(10)
    expect(p.sigmaUncertaintyPct).toBe(30)
    expect(p.sigmaSource).toBe('literature')
    expect(p.sigmaCitation).toBe('Foster & Schwan 1989')
    expect(p.nuclearRadius).toBe(4)
    expect(p.resonantFreqGHz).toBe(0)
  })

  it('rejects payloads without the resopulse schema prefix', () => {
    const report = parseUserPresetsJson(JSON.stringify({ schema: 'other@1', presets: [] }))
    expect(report.ok).toBe(false)
    expect(report.error).toMatch(/schema/i)
  })

  it('rejects non-JSON input with a parse error', () => {
    const report = parseUserPresetsJson('not json at all')
    expect(report.ok).toBe(false)
    expect(report.error).toMatch(/parse/i)
  })

  it('rejects individual presets missing required numeric fields', () => {
    const { radius: _omit, ...withoutRadius } = BASE
    void _omit
    const text   = userPresetsToJson([withoutRadius as UserCellPreset])
    const report = parseUserPresetsJson(text)
    expect(report.accepted).toHaveLength(0)
    expect(report.rejected).toHaveLength(1)
    expect(report.rejected[0]!.reason).toMatch(/radius/)
  })

  it('rejects invalid role values', () => {
    const text   = userPresetsToJson([{ ...BASE, role: 'other' as never }])
    const report = parseUserPresetsJson(text)
    expect(report.accepted).toHaveLength(0)
    expect(report.rejected[0]!.reason).toMatch(/role/)
  })

  it('falls back to "literature" when parameterConfidence is missing or unknown', () => {
    const text   = userPresetsToJson([{ ...BASE, parameterConfidence: 'bogus' as never }])
    const report = parseUserPresetsJson(text)
    expect(report.accepted[0]!.parameterConfidence).toBe('literature')
  })

  it('drops non-finite optional numbers rather than rejecting the row', () => {
    const text   = JSON.stringify({
      schema:  'resopulse-user-presets@1',
      presets: [{ ...BASE, capsidQ: 'not a number' }],
    })
    const report = parseUserPresetsJson(text)
    expect(report.accepted).toHaveLength(1)
    expect(report.accepted[0]!.capsidQ).toBeUndefined()
  })
})
