// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
import { describe, it, expect, vi, beforeEach } from 'vitest'

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

beforeEach(() => {
  vi.clearAllMocks()
})

function mockAiServiceResponse(body: Record<string, unknown>): void {
  mockFetch.mockResolvedValue({
    ok:   true,
    json: async () => body,
  } as Response)
}

describe('computeCalibration', () => {
  it('loads only same-org rows with measured target lysis populated', async () => {
    mockPrisma.outcome.findMany.mockResolvedValue([])
    mockAiServiceResponse({
      sigmaMultiplier: 1.0,
      uncertaintyStd:  0,
      nSamples:        0,
      collecting:      true,
      clamped:         false,
      outliersRemoved: 0,
      rmseBefore:      0,
      rmseAfter:       0,
    })

    await computeCalibration(ORG_ID, PRESET)

    const findArgs = mockPrisma.outcome.findMany.mock.calls[0]![0]
    expect(findArgs.where).toEqual({
      orgId:                  ORG_ID,
      targetPreset:           PRESET,
      measuredTargetLysisPct: { not: null },
    })
  })

  it('does not persist a calibration row when the AI service reports collecting', async () => {
    mockPrisma.outcome.findMany.mockResolvedValue([
      { targetRatio: 0.4, measuredTargetLysisPct: 42 },
      { targetRatio: 0.5, measuredTargetLysisPct: 51 },
    ])
    mockAiServiceResponse({
      sigmaMultiplier: 1.0,
      uncertaintyStd:  0,
      nSamples:        2,
      collecting:      true,
      clamped:         false,
      outliersRemoved: 0,
      rmseBefore:      0,
      rmseAfter:       0,
    })

    await computeCalibration(ORG_ID, PRESET)

    expect(mockPrisma.cellCalibration.upsert).not.toHaveBeenCalled()
  })

  it('upserts the calibration row when the AI service returns a real fit', async () => {
    mockPrisma.outcome.findMany.mockResolvedValue(new Array(8).fill({
      targetRatio: 0.5, measuredTargetLysisPct: 55,
    }))
    mockAiServiceResponse({
      sigmaMultiplier: 1.12,
      uncertaintyStd:  0.04,
      nSamples:        8,
      collecting:      false,
      clamped:         false,
      outliersRemoved: 0,
      rmseBefore:      0.06,
      rmseAfter:       0.02,
    })
    mockPrisma.cellCalibration.upsert.mockResolvedValue({})

    const result = await computeCalibration(ORG_ID, PRESET)

    expect(mockPrisma.cellCalibration.upsert).toHaveBeenCalledTimes(1)
    const upsertArgs = mockPrisma.cellCalibration.upsert.mock.calls[0]![0]
    expect(upsertArgs.where).toEqual({ orgId_cellPresetId: { orgId: ORG_ID, cellPresetId: PRESET } })
    expect(upsertArgs.create.sigmaMultiplier).toBe(1.12)
    expect(upsertArgs.update.sigmaMultiplier).toBe(1.12)
    expect(result.cellPresetId).toBe(PRESET)
  })

  it('throws when the AI service returns a non-2xx response', async () => {
    mockPrisma.outcome.findMany.mockResolvedValue([])
    mockFetch.mockResolvedValue({ ok: false, status: 503, json: async () => ({}) } as Response)

    await expect(computeCalibration(ORG_ID, PRESET)).rejects.toThrow(/503/)
    expect(mockPrisma.cellCalibration.upsert).not.toHaveBeenCalled()
  })

  it('drops samples with non-finite predicted ratios', async () => {
    mockPrisma.outcome.findMany.mockResolvedValue([
      { targetRatio: 0.5,        measuredTargetLysisPct: 50 },
      { targetRatio: Number.NaN, measuredTargetLysisPct: 50 },
      { targetRatio: 0.7,        measuredTargetLysisPct: 70 },
    ])
    mockAiServiceResponse({
      sigmaMultiplier: 1.0, uncertaintyStd: 0, nSamples: 0,
      collecting: true, clamped: false, outliersRemoved: 0, rmseBefore: 0, rmseAfter: 0,
    })

    await computeCalibration(ORG_ID, PRESET)

    const fetchBody = JSON.parse((mockFetch.mock.calls[0]![1] as RequestInit).body as string)
    expect(fetchBody.samples).toHaveLength(2)
    expect(fetchBody.samples).toEqual([
      { predictedRatio: 0.5, measuredRatio: 0.5 },
      { predictedRatio: 0.7, measuredRatio: 0.7 },
    ])
  })
})

describe('listCalibrations', () => {
  it('scopes the listing to the caller orgId', async () => {
    mockPrisma.cellCalibration.findMany.mockResolvedValue([])
    await listCalibrations(ORG_ID)
    const args = mockPrisma.cellCalibration.findMany.mock.calls[0]![0]
    expect(args.where).toEqual({ orgId: ORG_ID })
  })
})
