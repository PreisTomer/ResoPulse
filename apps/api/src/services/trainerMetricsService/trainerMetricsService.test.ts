// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  trainerMetrics: {
    create:   vi.fn(),
    findMany: vi.fn(),
  },
}))

vi.mock('../../prisma', () => ({ prisma: mockPrisma }))

import { persistTrainerMetrics, listRecentTrainerMetrics, type RetrainUpstreamResponse } from './index'

const FULL_BODY: RetrainUpstreamResponse = {
  status:            'ok',
  samplesUsed:       42,
  modelReady:        true,
  modelVersion:      '20260425T120000Z',
  promoted:          true,
  holdoutSamples:    9,
  holdoutMaeOverall: 0.07,
  previousBestMae:   0.10,
  targetDr:          { rmse: 0.08, mae: 0.06 },
  healthyDr:         { rmse: 0.05, mae: 0.04 },
  rating:            { rmse: 0.30, mae: 0.20 },
}

beforeEach(() => vi.clearAllMocks())

describe('persistTrainerMetrics', () => {
  it('writes a row when the upstream response carries version + all outcome blocks', async () => {
    mockPrisma.trainerMetrics.create.mockResolvedValue({})
    await persistTrainerMetrics(FULL_BODY)
    expect(mockPrisma.trainerMetrics.create).toHaveBeenCalledTimes(1)
    const data = mockPrisma.trainerMetrics.create.mock.calls[0]![0].data
    expect(data.modelVersion).toBe(FULL_BODY.modelVersion)
    expect(data.promoted).toBe(true)
    expect(data.holdoutMaeOverall).toBe(0.07)
    expect(data.previousBestMae).toBe(0.10)
    expect(data.maeTargetDr).toBe(0.06)
  })

  it('skips persistence when modelVersion is missing', async () => {
    await persistTrainerMetrics({ ...FULL_BODY, modelVersion: null })
    expect(mockPrisma.trainerMetrics.create).not.toHaveBeenCalled()
  })

  it('skips persistence when any outcome block is missing', async () => {
    await persistTrainerMetrics({ ...FULL_BODY, targetDr: null })
    await persistTrainerMetrics({ ...FULL_BODY, healthyDr: null })
    await persistTrainerMetrics({ ...FULL_BODY, rating: null })
    expect(mockPrisma.trainerMetrics.create).not.toHaveBeenCalled()
  })

  it('persists a row with promoted=false when the gate rejected the new bundle', async () => {
    mockPrisma.trainerMetrics.create.mockResolvedValue({})
    await persistTrainerMetrics({ ...FULL_BODY, promoted: false })
    expect(mockPrisma.trainerMetrics.create).toHaveBeenCalledTimes(1)
    const data = mockPrisma.trainerMetrics.create.mock.calls[0]![0].data
    expect(data.promoted).toBe(false)
  })

  it('does not throw when the DB write fails', async () => {
    mockPrisma.trainerMetrics.create.mockRejectedValue(new Error('connection lost'))
    await expect(persistTrainerMetrics(FULL_BODY)).resolves.toBeUndefined()
  })
})

describe('listRecentTrainerMetrics', () => {
  it('asks Prisma for the most recent N rows ordered by trainedAt desc', async () => {
    mockPrisma.trainerMetrics.findMany.mockResolvedValue([])
    await listRecentTrainerMetrics(5)
    const args = mockPrisma.trainerMetrics.findMany.mock.calls[0]![0]
    expect(args.orderBy).toEqual({ trainedAt: 'desc' })
    expect(args.take).toBe(5)
  })
})
