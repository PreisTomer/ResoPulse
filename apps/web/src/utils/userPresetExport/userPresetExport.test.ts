// Copyright © 2026 Tomer Preis. Licensed under the MIT License.
import { describe, it, expect } from 'vitest'

import { userPresetsToCsv, userPresetsToJson } from './index'
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
  createdAt:            1700000000000,
}

describe('userPresetsToCsv', () => {
  it('emits a header row matching the public column schema', () => {
    const csv = userPresetsToCsv([])
    const header = csv.split('\n')[0] ?? ''
    expect(header.startsWith('id,role,cellType,label,shortLabel,notes,parameterConfidence')).toBe(true)
    expect(header).toContain('sigmaUncertaintyPct,sigmaSource,sigmaCitation')
    expect(header.endsWith('createdAt')).toBe(true)
  })

  it('escapes commas, quotes, and newlines per RFC 4180', () => {
    const csv = userPresetsToCsv([{
      ...BASE,
      notes:         'Smith, J. "Paper", 2020',
      sigmaCitation: 'line1\nline2',
    }])
    const row = csv.split('\n')[1]
    expect(row).toContain('"Smith, J. ""Paper"", 2020"')
    expect(csv).toContain('"line1\nline2"')
  })

  it('renders null or undefined optional fields as empty cells', () => {
    const csv  = userPresetsToCsv([BASE])
    const lines = csv.split('\n')
    const row  = (lines[1] ?? '').split(',')
    const cols = (lines[0] ?? '').split(',')
    const idx  = cols.indexOf('sigmaUncertaintyPct')
    expect(row[idx]).toBe('')
  })

  it('preserves numeric precision without scientific notation for typical values', () => {
    const csv = userPresetsToCsv([{ ...BASE, conductivity: 0.5, radius: 10 }])
    expect(csv).toContain(',0.5,')
    expect(csv).toContain(',10,')
  })

  it('emits sigma provenance fields when set', () => {
    const csv = userPresetsToCsv([{
      ...BASE,
      sigmaUncertaintyPct: 25,
      sigmaSource:         'electrorotation',
      sigmaCitation:       'Gascoyne 2002',
    }])
    expect(csv).toContain(',25,')
    expect(csv).toContain(',electrorotation,')
    expect(csv).toContain(',Gascoyne 2002,')
  })
})

describe('userPresetsToJson', () => {
  it('wraps presets in a schema-versioned envelope', () => {
    const parsed = JSON.parse(userPresetsToJson([BASE])) as { schema: string; presets: UserCellPreset[] }
    expect(parsed.schema).toBe('simbiotix-user-presets@1')
    expect(parsed.presets).toHaveLength(1)
    expect(parsed.presets[0]?.id).toBe('p-1')
  })

  it('round-trips optional fields that are omitted', () => {
    const parsed = JSON.parse(userPresetsToJson([BASE])) as { presets: UserCellPreset[] }
    expect(parsed.presets[0]?.sigmaUncertaintyPct).toBeUndefined()
    expect(parsed.presets[0]?.resonantFreqGHz).toBeUndefined()
  })
})
