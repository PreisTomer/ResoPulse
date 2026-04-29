// Copyright © 2026 Tomer Preis. Licensed under the MIT License.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockPrisma = vi.hoisted(() => ({
  outcome: {
    create:     vi.fn(),
    updateMany: vi.fn(),
  },
}))

vi.mock('./prisma', () => ({ prisma: mockPrisma }))

import { attachMeasuredOutcome } from './db'
import type { MeasuredOutcomeEntry } from './types/socket'

const ENTRY: MeasuredOutcomeEntry = {
  sessionName: 'session-A',
  timestamp:   '2026-04-25T10:00:00.000Z',
  measured: {
    measuredAt:      '2026-04-25T10:30:00.000Z',
    targetLysisPct:  62,
    healthyLysisPct: 18,
    viabilityPct:    80,
    tempC:           37,
  },
}

beforeEach(() => vi.clearAllMocks())

describe('attachMeasuredOutcome', () => {
  it('scopes the update to the caller orgId', async () => {
    mockPrisma.outcome.updateMany.mockResolvedValue({ count: 1 })
    await attachMeasuredOutcome(ENTRY, 'org-A')
    const args = mockPrisma.outcome.updateMany.mock.calls[0]![0]
    expect(args.where).toEqual({
      orgId:       'org-A',
      sessionName: ENTRY.sessionName,
      timestamp:   ENTRY.timestamp,
    })
  })

  it('passes orgId=null for guest sessions and only matches null-orgId rows', async () => {
    mockPrisma.outcome.updateMany.mockResolvedValue({ count: 1 })
    await attachMeasuredOutcome(ENTRY, null)
    const args = mockPrisma.outcome.updateMany.mock.calls[0]![0]
    expect(args.where.orgId).toBeNull()
  })

  it('does not update rows belonging to a different org', async () => {
    // Simulating Prisma's behaviour: zero rows match when the orgId filter
    // excludes a foreign-org row that happens to share (sessionName, timestamp).
    mockPrisma.outcome.updateMany.mockResolvedValue({ count: 0 })
    const updated = await attachMeasuredOutcome(ENTRY, 'org-attacker')
    expect(updated).toBe(0)
  })

  it('returns the count of updated rows on success', async () => {
    mockPrisma.outcome.updateMany.mockResolvedValue({ count: 2 })
    const updated = await attachMeasuredOutcome(ENTRY, 'org-A')
    expect(updated).toBe(2)
  })

  it('returns 0 and does not throw when the DB call fails', async () => {
    mockPrisma.outcome.updateMany.mockRejectedValue(new Error('connection lost'))
    const updated = await attachMeasuredOutcome(ENTRY, 'org-A')
    expect(updated).toBe(0)
  })
})
