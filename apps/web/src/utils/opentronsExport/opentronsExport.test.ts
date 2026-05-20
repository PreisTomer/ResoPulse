// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

import { describe, it, expect } from 'vitest'

import {
  buildOpentronsScript,
  opentronsFilename,
  type OpentronsExportInput,
  type OpentronsCalibrationRow,
} from './index'

import { CELL_TYPE } from '@/constants/strings'
import type { CellConfig } from '@/types/cell'

const HEALTHY: CellConfig = {
  id: 'mcf10a', type: CELL_TYPE.HEALTHY, label: 'MCF-10A',
  radius: 9, membraneThickness: 5, naturalFrequency: 0.4, dielectricConstant: 5.0,
  conductivity: 0.5, density: 1050, thresholdVoltage: 1.0, specificHeatCapacity: 3600, amplitude: 0.7,
}
const TARGET: CellConfig = {
  id: 'mcf7', type: CELL_TYPE.TARGET, label: 'MCF-7',
  radius: 11, membraneThickness: 5, naturalFrequency: 0.5, dielectricConstant: 6.0,
  conductivity: 0.45, density: 1050, thresholdVoltage: 0.9, specificHeatCapacity: 3600, amplitude: 0.8,
}

function input(over: Partial<OpentronsExportInput> = {}): OpentronsExportInput {
  return {
    cellPair: { healthy: HEALTHY, target: TARGET },
    protocol: {
      freqKHz: 500, fieldVcm: 1200, waveform: 'pulsed',
      dutyCycle: 0.001, pulseWidthNs: 100, lysisNPulses: 8,
      medium: 'saline', effectiveSigmaE: 1.5, chartMode: 'schwan',
      predictedTargetDr: 0.65, predictedHealthyDr: 0.30, predictedTi: 2.17,
    },
    wetLab: {
      robotType: 'OT-2', pipetteMount: 'right',
      pipetteName: 'p300_single_gen2',
      tipRackLoadName: 'opentrons_96_tiprack_300ul',
      sourceLoadName:  'opentrons_24_aluminumblock_nest_2ml_screwcap',
      destLoadName:    'nest_96_wellplate_200ul_flat',
      tipRackSlot: '1', sourceSlot: '2', destSlot: '3', sourceWell: 'A1',
      cellDensityCellsPerMl: 1e6,
      volumeUlPerWell: 100,
      replicateCount: 8,
    },
    calibrations: [],
    generatedAt: '2026-04-26T12:00:00Z',
    ...over,
  }
}

describe('buildOpentronsScript', () => {
  it('emits a complete Python module with docstring, imports, metadata, requirements, run()', () => {
    const py = buildOpentronsScript(input())
    expect(py).toMatch(/^"""/)            // docstring opens at top
    expect(py).toContain('from opentrons import protocol_api')
    expect(py).toContain('metadata = {')
    expect(py).toContain('requirements = {')
    expect(py).toContain('def run(protocol: protocol_api.ProtocolContext):')
    expect(py.endsWith('\n')).toBe(true)
  })

  it('embeds the suggested EP protocol in the docstring', () => {
    const py = buildOpentronsScript(input())
    expect(py).toContain('500 kHz')
    expect(py).toContain('1200 V/cm')
    expect(py).toContain('PULSED')
    expect(py).toContain('N pulses:    8')
  })

  it('embeds the cell pair biophysics in the docstring', () => {
    const py = buildOpentronsScript(input())
    expect(py).toContain('Target:  MCF-7')
    expect(py).toContain('Healthy: MCF-10A')
  })

  it('reports calibration multipliers and identifiability flags when supplied', () => {
    const cal: OpentronsCalibrationRow = {
      cellPresetId: 'mcf7', cellLabel: 'MCF-7', mode: 'schwan',
      param1Mult: 1.18, param2Mult: 0.93,
      residualStd: 0.04, nSamples: 8,
      param1Unident: false, param2Unident: false,
    }
    const py = buildOpentronsScript(input({ calibrations: [cal] }))
    expect(py).toContain('MCF-7 (schwan): σ_i ×1.180 · V_th ×0.930')
    expect(py).toContain('n=8')
  })

  it('marks unidentifiable parameters in the docstring', () => {
    const cal: OpentronsCalibrationRow = {
      cellPresetId: 'mcf7', cellLabel: 'MCF-7', mode: 'schwan',
      param1Mult: 1.0, param2Mult: 0.85,
      residualStd: 0.04, nSamples: 6,
      param1Unident: true, param2Unident: false,
    }
    const py = buildOpentronsScript(input({ calibrations: [cal] }))
    expect(py).toContain('unidentifiable')
  })

  it('renders Resonance-mode calibration with Q / V_thr_res labels', () => {
    const cal: OpentronsCalibrationRow = {
      cellPresetId: 'sars2', cellLabel: 'SARS-CoV-2', mode: 'resonance',
      param1Mult: 1.4, param2Mult: 0.85,
      residualStd: 0.05, nSamples: 6,
      param1Unident: false, param2Unident: false,
    }
    const py = buildOpentronsScript(input({ calibrations: [cal] }))
    expect(py).toContain('SARS-CoV-2 (resonance): Q ×1.400 · V_thr_res ×0.850')
  })

  it('emits "no calibration applied" when the calibrations array is empty', () => {
    const py = buildOpentronsScript(input())
    expect(py).toContain('No calibration applied')
  })

  it('predicted DR / TI numbers appear in the docstring with sensible formatting', () => {
    const py = buildOpentronsScript(input())
    expect(py).toContain('Target DR:   65.0 %')
    expect(py).toContain('Healthy DR:  30.0 %')
    expect(py).toContain('TI (T/H):    2.17')
  })

  it('load_labware calls use the user-supplied load names + slots', () => {
    const py = buildOpentronsScript(input())
    expect(py).toContain('"opentrons_96_tiprack_300ul"')
    expect(py).toContain('"opentrons_24_aluminumblock_nest_2ml_screwcap"')
    expect(py).toContain('"nest_96_wellplate_200ul_flat"')
    expect(py).toMatch(/load_labware\("opentrons_96_tiprack_300ul",\s*"1"\)/)
  })

  it('load_instrument uses the user-supplied pipette name + mount', () => {
    const py = buildOpentronsScript(input())
    expect(py).toMatch(/load_instrument\("p300_single_gen2",\s*"right"/)
  })

  it('distribute uses the requested volume / replicate count / source well / mix-before', () => {
    const py = buildOpentronsScript(input({ wetLab: { ...input().wetLab, volumeUlPerWell: 75, replicateCount: 6, sourceWell: 'B2' } }))
    expect(py).toContain('dest_wells = cuvettes.wells()[: 6]')
    expect(py).toMatch(/pipette\.distribute\(\s*\n\s*75,/)
    expect(py).toMatch(/wells_by_name\(\)\["B2"\]/)
    expect(py).toMatch(/mix_before=\(3, \d+\)/)
  })

  it('protocol.pause() includes the suggested EP protocol when no override given', () => {
    const py = buildOpentronsScript(input())
    expect(py).toContain('protocol.pause(')
    expect(py).toContain('Apply EP pulse externally')
    expect(py).toContain('Frequency:   500 kHz')
  })

  it('protocol.pause() honors a user-supplied prompt override', () => {
    const py = buildOpentronsScript(input({ wetLab: { ...input().wetLab, pausePromptOverride: 'CUSTOM PAUSE NOTE' } }))
    expect(py).toContain('CUSTOM PAUSE NOTE')
    expect(py).not.toContain('Apply EP pulse externally')
  })

  it('emits requirements.robotType matching the user choice', () => {
    const ot2  = buildOpentronsScript(input({ wetLab: { ...input().wetLab, robotType: 'OT-2' } }))
    const flex = buildOpentronsScript(input({ wetLab: { ...input().wetLab, robotType: 'Flex' } }))
    expect(ot2).toMatch(/"robotType":\s*"OT-2"/)
    expect(flex).toMatch(/"robotType":\s*"Flex"/)
  })

  it('embeds Pennes-style and in-vitro caveats in the honesty block', () => {
    const py = buildOpentronsScript(input())
    expect(py).toContain('Pennes-style')
    expect(py).toContain('liquid handling')
    expect(py).toContain('manual pause step')
  })
})

describe('opentronsFilename', () => {
  it('embeds the target cell label and a timestamp', () => {
    const fn = opentronsFilename(input())
    expect(fn).toMatch(/^simbiotix_MCF-7_opentrons_/)
    expect(fn).toMatch(/\.py$/)
  })

  it('strips unsafe characters from the cell label', () => {
    const t = { ...TARGET, label: 'MCF-7 / strain A' }
    const fn = opentronsFilename(input({ cellPair: { healthy: HEALTHY, target: t } }))
    expect(fn).not.toContain('/')
    expect(fn).not.toMatch(/\s/)
  })
})
