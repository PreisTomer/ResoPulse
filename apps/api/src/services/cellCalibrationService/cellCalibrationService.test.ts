// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
import { describe, it, expect, vi, beforeEach } from 'vitest'

import type { AiCalibrationCellParams } from '@resopulse/shared-types'

const mockPrisma = vi.hoisted(() => ({
  outcome: {
    findMany: vi.fn(),
  },
  cellCalibration: {
    upsert:   vi.fn(),
    findMany: vi.fn(),
  },
}))

const mockFetch = vi.hoisted(() => vi.fn())

vi.mock('../../prisma', () => ({ prisma: mockPrisma }))
vi.stubGlobal('fetch', mockFetch)

import { computeCalibration, listCalibrations } from './index'

const ORG_ID  = 'org-1'
const PRESET  = 'mcf-7'

const SCHWAN_CELL_PARAMS: AiCalibrationCellParams = {
  radiusUm:       7.5,
  memThicknessNm: 5.0,
  dielectricConst: 5.0,
  sigmaIBaseline: 0.5,
  vthBaseline:    1.0,
}

const RESONANCE_CELL_PARAMS: AiCalibrationCellParams = {
  ...SCHWAN_CELL_PARAMS,
  radiusUm:                     0.05,
  resonantFreqGhz:              8.0,
  capsidQBaseline:              5.0,
  resonantThresholdVcmBaseline: 100.0,
}

beforeEach(() => {
  vi.clearAllMocks()
})

interface AiBody {
  mode:                 string
  param1Mult:           number
  param2Mult:           number
  cov11:                number
  cov12:                number
  cov22:                number
  residualStd:          number
  nSamples:             number
  collecting:           boolean
  clampedParam1:        boolean
  clampedParam2:        boolean
  param1Unidentifiable: boolean
  param2Unidentifiable: boolean
  outliersRemoved:      number
  rmseBefore:           number
  rmseAfter:            number
}

function mockAiServiceResponse(body: AiBody): void {
  mockFetch.mockResolvedValue({
    ok:   true,
    json: async () => body,
  } as Response)
}

function aiOk(overrides: Partial<AiBody> = {}): AiBody {
  return {
    mode:                 'schwan',
    param1Mult:           1.0,
    param2Mult:           1.0,
    cov11:                0.0,
    cov12:                0.0,
    cov22:                0.0,
    residualStd:          0.0,
    nSamples:             0,
    collecting:           true,
    clampedParam1:        false,
    clampedParam2:        false,
    param1Unidentifiable: false,
    param2Unidentifiable: false,
    outliersRemoved:      0,
    rmseBefore:           0.0,
    rmseAfter:            0.0,
    ...overrides,
  }
}

interface UpsertArgs {
  where:  { orgId_cellPresetId_mode: { orgId: string, cellPresetId: string, mode: string } }
  create: Record<string, number | string | boolean>
  update: Record<string, number | string | boolean>
}

interface FindArgs {
  where: Record<string, string | { not: null }>
}

interface FetchedRequest {
  samples: Array<{ measuredRatio: number, protocol: { freqKhz: number, fieldVcm: number, sigmaE: number, tempC: number, nPulses: number, pulseWidthNs: number, dutyCycle: number, waveform: string, orientationDeg: number } }>
}

describe('computeCalibration', () => {
  it('loads only same-org rows with measured target lysis populated', async () => {
    mockPrisma.outcome.findMany.mockResolvedValue([])
    mockAiServiceResponse(aiOk())

    await computeCalibration({
      orgId: ORG_ID, cellPresetId: PRESET, mode: 'schwan',
      category: 'mammalian', cellParams: SCHWAN_CELL_PARAMS,
    })

    const findArgs = mockPrisma.outcome.findMany.mock.calls[0]![0] as FindArgs
    expect(findArgs.where).toEqual({
      orgId:                  ORG_ID,
      targetPreset:           PRESET,
      measuredTargetLysisPct: { not: null },
    })
  })

  it('does not persist a calibration row when the AI service reports collecting', async () => {
    mockPrisma.outcome.findMany.mockResolvedValue([
      {
        freqKhz: 100, fieldVcm: 1000, sigmaE: 1.5, targetTemp: 37, lysisNPulses: 8,
        pulseWidthNs: 100, dutyCycle: 0.001, waveform: 'pulsed', orientationDeg: 0,
        measuredTargetLysisPct: 42, measuredFieldVcm: null,
      },
    ])
    mockAiServiceResponse(aiOk({ nSamples: 1, collecting: true }))

    await computeCalibration({
      orgId: ORG_ID, cellPresetId: PRESET, mode: 'schwan',
      category: 'mammalian', cellParams: SCHWAN_CELL_PARAMS,
    })

    expect(mockPrisma.cellCalibration.upsert).not.toHaveBeenCalled()
  })

  it('upserts with mode in the unique key when the AI service returns a real fit', async () => {
    mockPrisma.outcome.findMany.mockResolvedValue(new Array(8).fill({
      freqKhz: 1000, fieldVcm: 800, sigmaE: 1.5, targetTemp: 37, lysisNPulses: 8,
      pulseWidthNs: 100, dutyCycle: 0.001, waveform: 'pulsed', orientationDeg: 0,
      measuredTargetLysisPct: 55, measuredFieldVcm: null,
    }))
    mockAiServiceResponse(aiOk({
      nSamples: 8, collecting: false,
      param1Mult: 1.12, param2Mult: 0.93,
      cov11: 0.01, cov12: 0.001, cov22: 0.005,
      residualStd: 0.04,
    }))
    mockPrisma.cellCalibration.upsert.mockResolvedValue({})

    const result = await computeCalibration({
      orgId: ORG_ID, cellPresetId: PRESET, mode: 'schwan',
      category: 'mammalian', cellParams: SCHWAN_CELL_PARAMS,
    })

    expect(mockPrisma.cellCalibration.upsert).toHaveBeenCalledTimes(1)
    const upsertArgs = mockPrisma.cellCalibration.upsert.mock.calls[0]![0] as UpsertArgs
    expect(upsertArgs.where).toEqual({ orgId_cellPresetId_mode: { orgId: ORG_ID, cellPresetId: PRESET, mode: 'schwan' } })
    expect(upsertArgs.create.param1Mult).toBe(1.12)
    expect(upsertArgs.create.param2Mult).toBe(0.93)
    expect(upsertArgs.create.cov11).toBe(0.01)
    // Schwan: legacy sigmaMultiplier mirrors param1Mult so old read paths still see the σ_i correction.
    expect(upsertArgs.create.sigmaMultiplier).toBe(1.12)
    expect(result.cellPresetId).toBe(PRESET)
  })

  it('upserts with mode=resonance and pins legacy sigmaMultiplier=1.0 on the resonance path', async () => {
    mockPrisma.outcome.findMany.mockResolvedValue(new Array(6).fill({
      freqKhz: 8_000_000, fieldVcm: 50, sigmaE: 1.5, targetTemp: 37, lysisNPulses: 8,
      pulseWidthNs: 100, dutyCycle: 0.001, waveform: 'pulsed', orientationDeg: 0,
      measuredTargetLysisPct: 60, measuredFieldVcm: null,
    }))
    mockAiServiceResponse(aiOk({
      mode: 'resonance', nSamples: 6, collecting: false,
      param1Mult: 1.4, param2Mult: 0.85,
    }))
    mockPrisma.cellCalibration.upsert.mockResolvedValue({})

    await computeCalibration({
      orgId: ORG_ID, cellPresetId: PRESET, mode: 'resonance',
      category: 'virus', cellParams: RESONANCE_CELL_PARAMS,
    })

    const upsertArgs = mockPrisma.cellCalibration.upsert.mock.calls[0]![0] as UpsertArgs
    expect(upsertArgs.where).toEqual({ orgId_cellPresetId_mode: { orgId: ORG_ID, cellPresetId: PRESET, mode: 'resonance' } })
    expect(upsertArgs.create.mode).toBe('resonance')
    expect(upsertArgs.create.param1Mult).toBe(1.4)
    expect(upsertArgs.create.sigmaMultiplier).toBe(1.0)
  })

  it('forwards measuredFieldVcm when present so voltage-divider losses are in the fit', async () => {
    mockPrisma.outcome.findMany.mockResolvedValue([
      {
        freqKhz: 1000, fieldVcm: 1000, sigmaE: 1.5, targetTemp: 37, lysisNPulses: 8,
        pulseWidthNs: 100, dutyCycle: 0.001, waveform: 'pulsed', orientationDeg: 0,
        measuredTargetLysisPct: 50, measuredFieldVcm: 870,
      },
    ])
    mockAiServiceResponse(aiOk())

    await computeCalibration({
      orgId: ORG_ID, cellPresetId: PRESET, mode: 'schwan',
      category: 'mammalian', cellParams: SCHWAN_CELL_PARAMS,
    })

    const fetchBody = JSON.parse((mockFetch.mock.calls[0]![1] as RequestInit).body as string) as FetchedRequest
    expect(fetchBody.samples[0]!.protocol.fieldVcm).toBe(870)
  })

  it('throws when the AI service returns a non-2xx response', async () => {
    mockPrisma.outcome.findMany.mockResolvedValue([])
    mockFetch.mockResolvedValue({ ok: false, status: 503, json: async () => ({}) } as Response)

    await expect(computeCalibration({
      orgId: ORG_ID, cellPresetId: PRESET, mode: 'schwan',
      category: 'mammalian', cellParams: SCHWAN_CELL_PARAMS,
    })).rejects.toThrow(/503/)
    expect(mockPrisma.cellCalibration.upsert).not.toHaveBeenCalled()
  })

  it('drops samples with non-finite or zero protocol fields', async () => {
    mockPrisma.outcome.findMany.mockResolvedValue([
      {
        freqKhz: 100, fieldVcm: 1000, sigmaE: 1.5, targetTemp: 37, lysisNPulses: 8,
        pulseWidthNs: 100, dutyCycle: 0.001, waveform: 'pulsed', orientationDeg: 0,
        measuredTargetLysisPct: 50, measuredFieldVcm: null,
      },
      {
        freqKhz: 100, fieldVcm: 0, sigmaE: 1.5, targetTemp: 37, lysisNPulses: 8,
        pulseWidthNs: 100, dutyCycle: 0.001, waveform: 'pulsed', orientationDeg: 0,
        measuredTargetLysisPct: 50, measuredFieldVcm: null,
      },
    ])
    mockAiServiceResponse(aiOk())

    await computeCalibration({
      orgId: ORG_ID, cellPresetId: PRESET, mode: 'schwan',
      category: 'mammalian', cellParams: SCHWAN_CELL_PARAMS,
    })

    const fetchBody = JSON.parse((mockFetch.mock.calls[0]![1] as RequestInit).body as string) as FetchedRequest
    expect(fetchBody.samples).toHaveLength(1)
  })
})

describe('listCalibrations', () => {
  it('scopes the listing to the caller orgId', async () => {
    mockPrisma.cellCalibration.findMany.mockResolvedValue([])
    await listCalibrations(ORG_ID)
    const args = mockPrisma.cellCalibration.findMany.mock.calls[0]![0] as FindArgs
    expect(args.where).toEqual({ orgId: ORG_ID })
  })
})
