// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Prisma mock ───────────────────────────────────────────────────────────────

const mockPrisma = vi.hoisted(() => ({
  userCellPreset: {
    findMany:  vi.fn(),
    findFirst: vi.fn(),
    create:    vi.fn(),
    update:    vi.fn(),
    delete:    vi.fn(),
  },
}))

vi.mock('../../prisma', () => ({ prisma: mockPrisma }))

import {
  listCellPresets,
  getCellPreset,
  createCellPreset,
  updateCellPreset,
  deleteCellPreset,
} from './index'
import type { CellPresetInput } from './index'

// ── Fixtures ──────────────────────────────────────────────────────────────────

const ORG_ID     = 'org-abc'
const CREATED_BY = 'user-xyz'
const PRESET_ID  = 'preset-1'
const NOW        = new Date()

const BASE_INPUT: CellPresetInput = {
  role:                 'target',
  cellType:             'mammalian',
  label:                'HeLa Cell',
  shortLabel:           'HeLa',
  notes:                'Standard cervical cancer line',
  parameterConfidence:  'literature',
  radius:               10,
  membraneThickness:    7,
  dielectricConstant:   10,
  conductivity:         0.5,
  thresholdVoltage:     0.8,
  density:              1050,
  specificHeatCapacity: 3500,
}

const DB_ROW = {
  id:                   PRESET_ID,
  orgId:                ORG_ID,
  createdBy:            CREATED_BY,
  ...BASE_INPUT,
  resonantFreqGHz:      null,
  capsidQ:              null,
  resonantThresholdVcm: null,
  createdAt:            NOW,
  updatedAt:            NOW,
}

beforeEach(() => vi.clearAllMocks())

// ── listCellPresets ───────────────────────────────────────────────────────────

describe('listCellPresets', () => {
  it('returns all presets for an org ordered by createdAt asc', async () => {
    mockPrisma.userCellPreset.findMany.mockResolvedValue([DB_ROW])
    const result = await listCellPresets(ORG_ID)
    expect(result).toEqual([DB_ROW])
    expect(mockPrisma.userCellPreset.findMany).toHaveBeenCalledWith({
      where:   { orgId: ORG_ID },
      orderBy: { createdAt: 'asc' },
    })
  })

  it('returns empty array when org has no presets', async () => {
    mockPrisma.userCellPreset.findMany.mockResolvedValue([])
    expect(await listCellPresets(ORG_ID)).toEqual([])
  })
})

// ── getCellPreset ─────────────────────────────────────────────────────────────

describe('getCellPreset', () => {
  it('returns the matching preset when found', async () => {
    mockPrisma.userCellPreset.findFirst.mockResolvedValue(DB_ROW)
    const result = await getCellPreset(PRESET_ID, ORG_ID)
    expect(result).toEqual(DB_ROW)
    expect(mockPrisma.userCellPreset.findFirst).toHaveBeenCalledWith({
      where: { id: PRESET_ID, orgId: ORG_ID },
    })
  })

  it('returns null when preset does not belong to org', async () => {
    mockPrisma.userCellPreset.findFirst.mockResolvedValue(null)
    expect(await getCellPreset(PRESET_ID, 'other-org')).toBeNull()
  })
})

// ── createCellPreset ──────────────────────────────────────────────────────────

describe('createCellPreset', () => {
  it('creates preset with trimmed label and shortLabel', async () => {
    mockPrisma.userCellPreset.create.mockResolvedValue(DB_ROW)
    const input = { ...BASE_INPUT, label: '  HeLa Cell  ', shortLabel: '  HeLa  ' }
    await createCellPreset(ORG_ID, CREATED_BY, input)
    const data = mockPrisma.userCellPreset.create.mock.calls[0][0].data
    expect(data.label).toBe('HeLa Cell')
    expect(data.shortLabel).toBe('HeLa')
  })

  it('defaults parameterConfidence to "literature" when omitted', async () => {
    mockPrisma.userCellPreset.create.mockResolvedValue(DB_ROW)
    const { parameterConfidence: _, ...inputWithout } = BASE_INPUT
    await createCellPreset(ORG_ID, CREATED_BY, inputWithout as CellPresetInput)
    const data = mockPrisma.userCellPreset.create.mock.calls[0][0].data
    expect(data.parameterConfidence).toBe('literature')
  })

  it('stores resonance fields when provided', async () => {
    const resonantRow = { ...DB_ROW, resonantFreqGHz: 8.2, capsidQ: 2.0, resonantThresholdVcm: 800 }
    mockPrisma.userCellPreset.create.mockResolvedValue(resonantRow)
    const input: CellPresetInput = { ...BASE_INPUT, resonantFreqGHz: 8.2, capsidQ: 2.0, resonantThresholdVcm: 800 }
    await createCellPreset(ORG_ID, CREATED_BY, input)
    const data = mockPrisma.userCellPreset.create.mock.calls[0][0].data
    expect(data.resonantFreqGHz).toBe(8.2)
    expect(data.capsidQ).toBe(2.0)
    expect(data.resonantThresholdVcm).toBe(800)
  })

  it('nulls optional resonance fields when not provided', async () => {
    mockPrisma.userCellPreset.create.mockResolvedValue(DB_ROW)
    await createCellPreset(ORG_ID, CREATED_BY, BASE_INPUT)
    const data = mockPrisma.userCellPreset.create.mock.calls[0][0].data
    expect(data.resonantFreqGHz).toBeNull()
    expect(data.capsidQ).toBeNull()
    expect(data.resonantThresholdVcm).toBeNull()
  })
})

// ── updateCellPreset ──────────────────────────────────────────────────────────

describe('updateCellPreset', () => {
  it('returns null when preset not found for that org (ownership check)', async () => {
    mockPrisma.userCellPreset.findFirst.mockResolvedValue(null)
    const result = await updateCellPreset(PRESET_ID, 'wrong-org', { label: 'New' })
    expect(result).toBeNull()
    expect(mockPrisma.userCellPreset.update).not.toHaveBeenCalled()
  })

  it('updates only supplied fields, trims label', async () => {
    mockPrisma.userCellPreset.findFirst.mockResolvedValue(DB_ROW)
    mockPrisma.userCellPreset.update.mockResolvedValue({ ...DB_ROW, label: 'Updated Label' })
    await updateCellPreset(PRESET_ID, ORG_ID, { label: '  Updated Label  ' })
    const data = mockPrisma.userCellPreset.update.mock.calls[0][0].data
    expect(data.label).toBe('Updated Label')
    expect(data.radius).toBeUndefined()
  })

  it('allows explicitly clearing resonance fields with null', async () => {
    mockPrisma.userCellPreset.findFirst.mockResolvedValue(DB_ROW)
    mockPrisma.userCellPreset.update.mockResolvedValue(DB_ROW)
    await updateCellPreset(PRESET_ID, ORG_ID, { resonantFreqGHz: null })
    const data = mockPrisma.userCellPreset.update.mock.calls[0][0].data
    expect(data.resonantFreqGHz).toBeNull()
  })
})

// ── deleteCellPreset ──────────────────────────────────────────────────────────

describe('deleteCellPreset', () => {
  it('returns true and deletes when preset exists for org', async () => {
    mockPrisma.userCellPreset.findFirst.mockResolvedValue(DB_ROW)
    mockPrisma.userCellPreset.delete.mockResolvedValue(DB_ROW)
    expect(await deleteCellPreset(PRESET_ID, ORG_ID)).toBe(true)
    expect(mockPrisma.userCellPreset.delete).toHaveBeenCalledWith({ where: { id: PRESET_ID } })
  })

  it('returns false and skips delete when preset not found', async () => {
    mockPrisma.userCellPreset.findFirst.mockResolvedValue(null)
    expect(await deleteCellPreset(PRESET_ID, ORG_ID)).toBe(false)
    expect(mockPrisma.userCellPreset.delete).not.toHaveBeenCalled()
  })
})
