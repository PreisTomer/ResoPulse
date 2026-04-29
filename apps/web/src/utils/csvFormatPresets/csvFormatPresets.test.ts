// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

import { describe, it, expect } from 'vitest'

import { CSV_FORMAT_PRESETS, getPresetById, detectFormat, DEFAULT_PRESET_ID } from './index'

describe('CSV_FORMAT_PRESETS registry', () => {
  it('exposes resopulse, plate-reader-long, plate-reader-wide presets', () => {
    const ids = CSV_FORMAT_PRESETS.map(p => p.id)
    expect(ids).toContain('resopulse')
    expect(ids).toContain('plate-reader-long')
    expect(ids).toContain('plate-reader-wide')
  })

  it('every preset has a non-empty label and description', () => {
    for (const p of CSV_FORMAT_PRESETS) {
      expect(p.label.length).toBeGreaterThan(0)
      expect(p.description.length).toBeGreaterThan(0)
    }
  })

  it('every preset stores its own id in the mapping prefill', () => {
    for (const p of CSV_FORMAT_PRESETS) {
      expect(p.mapping.formatPresetId).toBe(p.id)
    }
  })

  it('default preset is resopulse', () => {
    expect(DEFAULT_PRESET_ID).toBe('resopulse')
  })
})

describe('getPresetById', () => {
  it('returns the preset by id', () => {
    expect(getPresetById('resopulse')?.id).toBe('resopulse')
    expect(getPresetById('plate-reader-long')?.id).toBe('plate-reader-long')
  })

  it('returns undefined for unknown ids', () => {
    expect(getPresetById('nope')).toBeUndefined()
    expect(getPresetById(undefined)).toBeUndefined()
  })
})

describe('detectFormat', () => {
  it('detects ResoPulse-native exports by the # / T-Lysis header signature', () => {
    const text = '#,Time,T-Lysis measured (%),H-Lysis measured (%)\n3,10:00,57,32\n'
    const det = detectFormat(text)
    expect(det.preset.id).toBe('resopulse')
    expect(det.confidence).toBeGreaterThan(0.5)
  })

  it('detects plate-reader long format by Sample / Well / Value headers', () => {
    const text = [
      'Plate ID: P-1',
      'Sample,Well,Value,Absorbance',
      'Run #3,A1,57,0.42',
      'Run #5,B1,82,0.61',
    ].join('\n')
    const det = detectFormat(text)
    expect(det.preset.id).toBe('plate-reader-long')
    expect(det.confidence).toBeGreaterThanOrEqual(0.30)
  })

  it('detects plate-reader wide format from a metadata block', () => {
    const text = [
      'Plate ID: P-2026-04-26',
      'Date: 2026-04-26',
      'Test Name: Lysis Quant',
      'Instrument: CLARIOstar Plus',
      'Reading mode: Absorbance',
      'Reader Serial: 1234-5678',
      '',
      'Sample ID,Well,Raw Data',
      'Run #1,A1,0.42',
    ].join('\n')
    const det = detectFormat(text)
    expect(det.preset.id).toBe('plate-reader-wide')
    expect(det.confidence).toBeGreaterThanOrEqual(0.30)
  })

  it('returns the resopulse preset with low confidence on unrecognisable input', () => {
    const det = detectFormat('foo,bar\n1,2\n')
    expect(det.confidence).toBeLessThan(0.30)
  })

  it('emits the full score table so the UI can show alternatives', () => {
    const det = detectFormat('#,T-Lysis measured (%)\n3,57\n')
    expect(det.scores.length).toBe(CSV_FORMAT_PRESETS.length)
    // Best preset comes first.
    expect(det.scores[0]!.preset.id).toBe(det.preset.id)
  })
})
