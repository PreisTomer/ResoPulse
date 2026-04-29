// Copyright © 2026 Tomer Preis. Licensed under the MIT License.
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Prisma mock ───────────────────────────────────────────────────────────────

const mockPrisma = vi.hoisted(() => ({
  experimentSession: {
    findMany:  vi.fn(),
    findFirst: vi.fn(),
    count:     vi.fn(),
    create:    vi.fn(),
    update:    vi.fn(),
  },
}))

vi.mock('../../prisma', () => ({ prisma: mockPrisma }))

import {
  getExperiment,
  getExperimentByShareToken,
  createExperiment,
  updateExperiment,
  saveNewVersion,
  forkExperiment,
  deleteExperiment,
  enableSharing,
  disableSharing,
  listExperiments,
} from './index'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const NOW   = new Date()
const ROW   = {
  id: 'exp-1', orgId: 'org-1', title: 'Lab Run', description: 'Notes',
  snapshot: { freq: 500 }, version: 1, createdBy: 'user-1', parentId: null,
  shareMode: null, shareToken: null, deletedAt: null,
  createdAt: NOW, updatedAt: NOW,
}

const DEFAULT_LIST_OPTS = {
  page: 1, limit: 20, search: '', sortBy: 'updatedAt' as const, sortDir: 'desc' as const,
}

beforeEach(() => vi.clearAllMocks())

// ── getExperiment ─────────────────────────────────────────────────────────────

describe('getExperiment', () => {
  it('returns the experiment when orgId matches', async () => {
    mockPrisma.experimentSession.findFirst.mockResolvedValue(ROW)
    const result = await getExperiment('exp-1', 'org-1')
    expect(result).not.toBeNull()
    expect(result!.id).toBe('exp-1')
  })

  it('returns null when the experiment belongs to a different org', async () => {
    // Prisma returns null when the where clause (orgId filter) has no match
    mockPrisma.experimentSession.findFirst.mockResolvedValue(null)
    const result = await getExperiment('exp-1', 'org-other')
    expect(result).toBeNull()
  })

  it('passes orgId in the where clause (cross-org access structurally impossible)', async () => {
    mockPrisma.experimentSession.findFirst.mockResolvedValue(null)
    await getExperiment('exp-1', 'org-attacker')
    const whereArg = mockPrisma.experimentSession.findFirst.mock.calls[0]![0].where
    expect(whereArg.orgId).toBe('org-attacker')
    expect(whereArg.id).toBe('exp-1')
    expect(whereArg.deletedAt).toBeNull()
  })
})

// ── getExperimentByShareToken ─────────────────────────────────────────────────

describe('getExperimentByShareToken', () => {
  it('returns an experiment for a valid token without org check', async () => {
    mockPrisma.experimentSession.findFirst.mockResolvedValue(ROW)
    const result = await getExperimentByShareToken('abc123')
    expect(result).not.toBeNull()
  })

  it('returns null for an invalid token', async () => {
    mockPrisma.experimentSession.findFirst.mockResolvedValue(null)
    const result = await getExperimentByShareToken('bad-token')
    expect(result).toBeNull()
  })
})

// ── createExperiment ──────────────────────────────────────────────────────────

describe('createExperiment', () => {
  it('creates with version=1 and the supplied orgId', async () => {
    mockPrisma.experimentSession.create.mockResolvedValue({ ...ROW, version: 1 })
    await createExperiment('org-1', 'user-1', 'New Session', null, { freq: 500 })
    const data = mockPrisma.experimentSession.create.mock.calls[0]![0].data
    expect(data.orgId).toBe('org-1')
    expect(data.version).toBe(1)
    expect(data.createdBy).toBe('user-1')
  })

  it('truncates title to 120 characters', async () => {
    mockPrisma.experimentSession.create.mockResolvedValue(ROW)
    const longTitle = 'A'.repeat(200)
    await createExperiment('org-1', 'user-1', longTitle, null, {})
    const data = mockPrisma.experimentSession.create.mock.calls[0]![0].data
    expect(data.title.length).toBe(120)
  })

  it('truncates description to 500 characters', async () => {
    mockPrisma.experimentSession.create.mockResolvedValue(ROW)
    const longDesc = 'D'.repeat(600)
    await createExperiment('org-1', 'user-1', 'Title', longDesc, {})
    const data = mockPrisma.experimentSession.create.mock.calls[0]![0].data
    expect(data.description!.length).toBe(500)
  })
})

// ── updateExperiment ──────────────────────────────────────────────────────────

describe('updateExperiment', () => {
  it('returns null when experiment not found or wrong org', async () => {
    mockPrisma.experimentSession.findFirst.mockResolvedValue(null)
    const result = await updateExperiment('exp-1', 'org-wrong', { title: 'New' })
    expect(result).toBeNull()
    expect(mockPrisma.experimentSession.update).not.toHaveBeenCalled()
  })

  it('updates only the supplied fields', async () => {
    mockPrisma.experimentSession.findFirst.mockResolvedValue(ROW)
    mockPrisma.experimentSession.update.mockResolvedValue({ ...ROW, title: 'Updated' })
    await updateExperiment('exp-1', 'org-1', { title: 'Updated' })
    const updateData = mockPrisma.experimentSession.update.mock.calls[0]![0].data
    expect(updateData.title).toBe('Updated')
    expect(updateData.snapshot).toBeUndefined()
  })
})

// ── saveNewVersion ────────────────────────────────────────────────────────────

describe('saveNewVersion', () => {
  it('returns null when parent not found', async () => {
    mockPrisma.experimentSession.findFirst.mockResolvedValue(null)
    expect(await saveNewVersion('parent-x', 'org-1', 'user-1', 'v2', {})).toBeNull()
  })

  it('creates a new record with version = parent.version + 1 and parentId set', async () => {
    const parent = { ...ROW, version: 2 }
    mockPrisma.experimentSession.findFirst.mockResolvedValue(parent)
    mockPrisma.experimentSession.create.mockResolvedValue({ ...ROW, version: 3 })

    await saveNewVersion('exp-1', 'org-1', 'user-1', 'v3 snapshot', { freq: 600 })

    const data = mockPrisma.experimentSession.create.mock.calls[0]![0].data
    expect(data.version).toBe(3)
    expect(data.parentId).toBe('exp-1')
  })
})

// ── forkExperiment ────────────────────────────────────────────────────────────

describe('forkExperiment', () => {
  it('creates an independent experiment (version=1, no parentId)', async () => {
    mockPrisma.experimentSession.findFirst.mockResolvedValue(ROW)
    mockPrisma.experimentSession.create.mockResolvedValue({ ...ROW, version: 1, parentId: null })

    await forkExperiment('exp-1', 'org-1', 'user-2', 'Forked Lab')

    const data = mockPrisma.experimentSession.create.mock.calls[0]![0].data
    expect(data.version).toBe(1)
    expect(data.parentId).toBeUndefined()
    expect(data.title).toBe('Forked Lab')
  })

  it('returns null when source not found or wrong org', async () => {
    mockPrisma.experimentSession.findFirst.mockResolvedValue(null)
    expect(await forkExperiment('exp-x', 'org-wrong', 'user-1', 'Fork')).toBeNull()
  })
})

// ── deleteExperiment ──────────────────────────────────────────────────────────

describe('deleteExperiment', () => {
  it('soft-deletes by setting deletedAt, returns true', async () => {
    mockPrisma.experimentSession.findFirst.mockResolvedValue(ROW)
    mockPrisma.experimentSession.update.mockResolvedValue({})
    const ok = await deleteExperiment('exp-1', 'org-1')
    expect(ok).toBe(true)
    const data = mockPrisma.experimentSession.update.mock.calls[0]![0].data
    expect(data.deletedAt).toBeInstanceOf(Date)
  })

  it('returns false and does not update when experiment not found', async () => {
    mockPrisma.experimentSession.findFirst.mockResolvedValue(null)
    const ok = await deleteExperiment('exp-x', 'org-1')
    expect(ok).toBe(false)
    expect(mockPrisma.experimentSession.update).not.toHaveBeenCalled()
  })
})

// ── enableSharing ─────────────────────────────────────────────────────────────

describe('enableSharing', () => {
  it('returns null for an invalid shareMode', async () => {
    const result = await enableSharing('exp-1', 'org-1', 'public')
    expect(result).toBeNull()
    expect(mockPrisma.experimentSession.findFirst).not.toHaveBeenCalled()
  })

  it('accepts "view" and "edit" as valid share modes', async () => {
    mockPrisma.experimentSession.findFirst.mockResolvedValue(ROW)
    mockPrisma.experimentSession.update.mockResolvedValue({})

    const tokenView = await enableSharing('exp-1', 'org-1', 'view')
    const tokenEdit = await enableSharing('exp-1', 'org-1', 'edit')

    expect(tokenView).not.toBeNull()
    expect(tokenEdit).not.toBeNull()
  })

  it('returns a 48-char hex share token', async () => {
    mockPrisma.experimentSession.findFirst.mockResolvedValue(ROW)
    mockPrisma.experimentSession.update.mockResolvedValue({})

    const token = await enableSharing('exp-1', 'org-1', 'view')
    expect(token).toMatch(/^[0-9a-f]{48}$/)
  })

  it('generates a different token on each call (rotation)', async () => {
    mockPrisma.experimentSession.findFirst.mockResolvedValue(ROW)
    mockPrisma.experimentSession.update.mockResolvedValue({})

    const t1 = await enableSharing('exp-1', 'org-1', 'view')
    const t2 = await enableSharing('exp-1', 'org-1', 'view')
    expect(t1).not.toBe(t2)
  })

  it('returns null when experiment not found', async () => {
    mockPrisma.experimentSession.findFirst.mockResolvedValue(null)
    expect(await enableSharing('exp-x', 'org-1', 'view')).toBeNull()
  })
})

// ── disableSharing ────────────────────────────────────────────────────────────

describe('disableSharing', () => {
  it('sets shareToken and shareMode to null, returns true', async () => {
    mockPrisma.experimentSession.findFirst.mockResolvedValue(ROW)
    mockPrisma.experimentSession.update.mockResolvedValue({})
    const ok = await disableSharing('exp-1', 'org-1')
    expect(ok).toBe(true)
    const data = mockPrisma.experimentSession.update.mock.calls[0]![0].data
    expect(data.shareToken).toBeNull()
    expect(data.shareMode).toBeNull()
  })

  it('returns false when experiment not found', async () => {
    mockPrisma.experimentSession.findFirst.mockResolvedValue(null)
    expect(await disableSharing('exp-x', 'org-1')).toBe(false)
  })
})

// ── listExperiments — sort safety ─────────────────────────────────────────────

describe('listExperiments sortBy safety', () => {
  it.each([
    ['updatedAt', 'updatedAt'],
    ['createdAt', 'createdAt'],
    ['title',     'title'],
    ['injected; DROP TABLE--', 'updatedAt'],  // SQL injection → falls back to safe default
    ['__proto__', 'updatedAt'],
    ['',          'updatedAt'],
  ] as [string, string][])('sortBy=%s → column=%s', async (raw, expected) => {
    mockPrisma.experimentSession.findMany.mockResolvedValue([])
    mockPrisma.experimentSession.count.mockResolvedValue(0)

    await listExperiments('org-1', { ...DEFAULT_LIST_OPTS, sortBy: raw as 'updatedAt' })

    const orderBy = mockPrisma.experimentSession.findMany.mock.calls[0]![0].orderBy
    expect(Object.keys(orderBy)[0]).toBe(expected)
  })
})
