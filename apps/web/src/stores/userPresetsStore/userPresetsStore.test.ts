// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

import { useUserPresetsStore } from '@/stores/userPresetsStore'

const STORAGE_KEY = 'resopulse_user_presets_v2'

// Narrow accessor for optional acoustic-resonance fields on CellConfig
interface ResonanceFields {
  resonantFreqGHz?:      number
  capsidQ?:              number
  resonantThresholdVcm?: number
}

const BASE_PRESET = {
  role:                 'target' as const,
  cellType:             'mammalian' as const,
  label:                'Test Cell',
  shortLabel:           'TC',
  notes:                'Lab-created HEK293',
  parameterConfidence:  'literature' as const,
  radius:               8,
  membraneThickness:    7,
  dielectricConstant:   10,
  conductivity:         0.35,
  thresholdVoltage:     0.9,
  density:              1050,
  specificHeatCapacity: 3500,
}

const HEALTHY_PRESET = {
  ...BASE_PRESET,
  role:      'healthy' as const,
  label:     'Control Cell',
  shortLabel: 'CC',
}

// fetchAll() with no Clerk session detects guest context and loads from localStorage.
// All tests use this path: freshStore() creates the store and initialises it as a guest.
async function freshStore() {
  localStorage.clear()
  setActivePinia(createPinia())
  const store = useUserPresetsStore()
  await store.fetchAll()   // sets isGuest=true, loads localStorage (empty)
  return store
}

// ── add ───────────────────────────────────────────────────────────────────────

describe('add', () => {
  it('appends a preset with auto-generated id and createdAt', async () => {
    const store = await freshStore()
    await store.add(BASE_PRESET)
    expect(store.presets).toHaveLength(1)
    const p = store.presets[0]!
    expect(p.id).toMatch(/^user_\d+$/)
    expect(p.createdAt).toBeGreaterThan(0)
    expect(p.label).toBe('Test Cell')
  })

  it('stores role and cellType on the added preset', async () => {
    const store = await freshStore()
    await store.add(BASE_PRESET)
    const p = store.presets[0]!
    expect(p.role).toBe('target')
    expect(p.cellType).toBe('mammalian')
  })

  it('ids are unique across multiple adds', async () => {
    const store = await freshStore()
    await store.add(BASE_PRESET)
    await new Promise(r => setTimeout(r, 2))
    await store.add({ ...BASE_PRESET, label: 'Second' })
    const ids = store.presets.map(p => p.id)
    expect(new Set(ids).size).toBe(2)
  })

  it('persists to localStorage immediately', async () => {
    const store = await freshStore()
    await store.add(BASE_PRESET)
    const raw = localStorage.getItem(STORAGE_KEY)
    expect(raw).not.toBeNull()
    const saved = JSON.parse(raw!) as unknown[]
    expect(saved).toHaveLength(1)
  })
})

// ── remove ────────────────────────────────────────────────────────────────────

describe('remove', () => {
  it('deletes the preset with the given id', async () => {
    const store = await freshStore()
    await store.add(BASE_PRESET)
    await new Promise(r => setTimeout(r, 2))
    await store.add({ ...BASE_PRESET, label: 'Second' })
    const idToRemove = store.presets[0]!.id
    await store.remove(idToRemove)
    expect(store.presets).toHaveLength(1)
    expect(store.presets[0]!.label).toBe('Second')
  })

  it('updates localStorage after removal', async () => {
    const store = await freshStore()
    await store.add(BASE_PRESET)
    const id = store.presets[0]!.id
    await store.remove(id)
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as unknown[]
    expect(saved).toHaveLength(0)
  })

  it('is a no-op for an unknown id', async () => {
    const store = await freshStore()
    await store.add(BASE_PRESET)
    await store.remove('does-not-exist')
    expect(store.presets).toHaveLength(1)
  })
})

// ── update ────────────────────────────────────────────────────────────────────

describe('update', () => {
  it('updates fields on the matching preset in-place', async () => {
    const store = await freshStore()
    await store.add(BASE_PRESET)
    const id = store.presets[0]!.id
    const success = await store.update(id, { label: 'Updated Name', radius: 12 })
    expect(success).toBe(true)
    expect(store.presets[0]!.label).toBe('Updated Name')
    expect(store.presets[0]!.radius).toBe(12)
  })

  it('leaves untouched fields unchanged', async () => {
    const store = await freshStore()
    await store.add(BASE_PRESET)
    const id = store.presets[0]!.id
    await store.update(id, { label: 'New Name' })
    expect(store.presets[0]!.conductivity).toBe(0.35)
    expect(store.presets[0]!.role).toBe('target')
  })

  it('returns false for an unknown id', async () => {
    const store = await freshStore()
    const success = await store.update('no-such-id', { label: 'X' })
    expect(success).toBe(false)
  })

  it('persists the updated preset to localStorage', async () => {
    const store = await freshStore()
    await store.add(BASE_PRESET)
    const id = store.presets[0]!.id
    await store.update(id, { shortLabel: 'XX' })
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as { shortLabel: string }[]
    expect(saved[0]!.shortLabel).toBe('XX')
  })

  it('does not change the number of presets', async () => {
    const store = await freshStore()
    await store.add(BASE_PRESET)
    await store.add({ ...BASE_PRESET, label: 'Second' })
    const id = store.presets[0]!.id
    await store.update(id, { label: 'Modified' })
    expect(store.presets).toHaveLength(2)
  })
})

// ── hasPresets ────────────────────────────────────────────────────────────────

describe('hasPresets', () => {
  it('is false when empty', async () => {
    expect((await freshStore()).hasPresets).toBe(false)
  })

  it('is true after adding a target preset', async () => {
    const store = await freshStore()
    await store.add(BASE_PRESET)
    expect(store.hasPresets).toBe(true)
  })

  it('is true after adding a healthy preset', async () => {
    const store = await freshStore()
    await store.add(HEALTHY_PRESET)
    expect(store.hasPresets).toBe(true)
  })
})

// ── targetPresets / healthyPresets ────────────────────────────────────────────

describe('targetPresets', () => {
  it('is empty when no presets exist', async () => {
    expect((await freshStore()).targetPresets).toHaveLength(0)
  })

  it('returns only presets with role=target', async () => {
    const store = await freshStore()
    await store.add(BASE_PRESET)           // target
    await store.add(HEALTHY_PRESET)        // healthy
    expect(store.targetPresets).toHaveLength(1)
    expect(store.targetPresets[0]!.role).toBe('target')
  })

  it('returns all target presets when there are no healthy ones', async () => {
    const store = await freshStore()
    await store.add(BASE_PRESET)
    await new Promise(r => setTimeout(r, 2))
    await store.add({ ...BASE_PRESET, label: 'Second Target' })
    expect(store.targetPresets).toHaveLength(2)
  })

  it('returns empty array when all presets are healthy', async () => {
    const store = await freshStore()
    await store.add(HEALTHY_PRESET)
    expect(store.targetPresets).toHaveLength(0)
  })
})

describe('healthyPresets', () => {
  it('is empty when no presets exist', async () => {
    expect((await freshStore()).healthyPresets).toHaveLength(0)
  })

  it('returns only presets with role=healthy', async () => {
    const store = await freshStore()
    await store.add(BASE_PRESET)           // target
    await store.add(HEALTHY_PRESET)        // healthy
    expect(store.healthyPresets).toHaveLength(1)
    expect(store.healthyPresets[0]!.role).toBe('healthy')
  })

  it('returns empty array when all presets are target', async () => {
    const store = await freshStore()
    await store.add(BASE_PRESET)
    expect(store.healthyPresets).toHaveLength(0)
  })

  it('targetPresets + healthyPresets covers all presets when roles are distinct', async () => {
    const store = await freshStore()
    await store.add(BASE_PRESET)
    await store.add(HEALTHY_PRESET)
    expect(store.targetPresets.length + store.healthyPresets.length).toBe(store.presets.length)
  })
})

// ── reload ────────────────────────────────────────────────────────────────────

describe('reload', () => {
  it('reads presets back from localStorage in guest context', async () => {
    const store = await freshStore()
    await store.add(BASE_PRESET)
    // Simulate another store instance picking up the persisted data
    setActivePinia(createPinia())
    const store2 = useUserPresetsStore()
    await store2.fetchAll()              // detects guest, loads localStorage
    expect(store2.presets).toHaveLength(1)
    expect(store2.presets[0]!.label).toBe('Test Cell')
  })
})

// ── toCellConfig ──────────────────────────────────────────────────────────────

describe('toCellConfig', () => {
  it('maps required Schwan fields correctly', async () => {
    const store = await freshStore()
    await store.add(BASE_PRESET)
    const preset = store.presets[0]!
    const config = store.toCellConfig(preset)

    expect(config.id).toBe(preset.id)
    expect(config.label).toBe('Test Cell')
    expect(config.radius).toBe(8)
    expect(config.membraneThickness).toBe(7)
    expect(config.conductivity).toBe(0.35)
    expect(config.thresholdVoltage).toBe(0.9)
    expect(config.type).toBe('target')
  })

  it('derives type from preset.role when no override is given', async () => {
    const store = await freshStore()
    await store.add({ ...BASE_PRESET, role: 'target' as const })
    const config = store.toCellConfig(store.presets[0]!)
    expect(config.type).toBe('target')
  })

  it('derives type=healthy from preset.role', async () => {
    const store = await freshStore()
    await store.add({ ...BASE_PRESET, role: 'healthy' as const })
    const config = store.toCellConfig(store.presets[0]!)
    expect(config.type).toBe('healthy')
  })

  it('omits optional resonance fields when not present', async () => {
    const store = await freshStore()
    await store.add(BASE_PRESET)
    const config = store.toCellConfig(store.presets[0]!) as ResonanceFields
    expect(config.resonantFreqGHz).toBeUndefined()
    expect(config.capsidQ).toBeUndefined()
    expect(config.resonantThresholdVcm).toBeUndefined()
  })

  it('includes optional resonance fields when present', async () => {
    const store = await freshStore()
    await store.add({ ...BASE_PRESET, cellType: 'virus' as const, resonantFreqGHz: 0.5, capsidQ: 3.5, resonantThresholdVcm: 1200 })
    const config = store.toCellConfig(store.presets[0]!) as ResonanceFields
    expect(config.resonantFreqGHz).toBe(0.5)
    expect(config.capsidQ).toBe(3.5)
    expect(config.resonantThresholdVcm).toBe(1200)
  })
})

// ── localStorage persistence round-trip ───────────────────────────────────────

describe('localStorage persistence', () => {
  it('returns an empty array when localStorage is empty', async () => {
    expect((await freshStore()).presets).toHaveLength(0)
  })

  it('restores presets on cold-start via fetchAll (guest path)', async () => {
    // Write directly to localStorage as if a previous session saved it
    const saved = [{ ...BASE_PRESET, role: 'target', cellType: 'mammalian', id: 'user_111', createdAt: 1000000 }]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
    setActivePinia(createPinia())
    const store = useUserPresetsStore()
    await store.fetchAll()              // guest path: loads localStorage
    expect(store.presets).toHaveLength(1)
    expect(store.presets[0]!.label).toBe('Test Cell')
  })

  it('returns empty array when localStorage contains corrupt JSON', async () => {
    localStorage.setItem(STORAGE_KEY, '{{corrupt')
    setActivePinia(createPinia())
    const store = useUserPresetsStore()
    await store.fetchAll()
    expect(store.presets).toHaveLength(0)
  })

  it('sets isGuest=true when no Clerk session is present', async () => {
    const store = await freshStore()
    expect(store.isGuest).toBe(true)
  })
})

// ── parameterConfidence ───────────────────────────────────────────────────────

describe('parameterConfidence', () => {
  it('stores literature confidence and retrieves it', async () => {
    const store = await freshStore()
    await store.add({ ...BASE_PRESET, parameterConfidence: 'literature' as const })
    expect(store.presets[0]!.parameterConfidence).toBe('literature')
  })

  it('stores measured confidence and retrieves it', async () => {
    const store = await freshStore()
    await store.add({ ...BASE_PRESET, parameterConfidence: 'measured' as const })
    expect(store.presets[0]!.parameterConfidence).toBe('measured')
  })

  it('stores estimated confidence and retrieves it', async () => {
    const store = await freshStore()
    await store.add({ ...BASE_PRESET, parameterConfidence: 'estimated' as const })
    expect(store.presets[0]!.parameterConfidence).toBe('estimated')
  })

  it('persists confidence to localStorage', async () => {
    const store = await freshStore()
    await store.add({ ...BASE_PRESET, parameterConfidence: 'measured' as const })
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as { parameterConfidence: string }[]
    expect(saved[0]!.parameterConfidence).toBe('measured')
  })

  it('round-trips all three confidence values through localStorage', async () => {
    const store = await freshStore()
    await store.add({ ...BASE_PRESET, parameterConfidence: 'literature' as const, label: 'Lit' })
    await new Promise(r => setTimeout(r, 2))
    await store.add({ ...BASE_PRESET, parameterConfidence: 'measured'   as const, label: 'Meas' })
    await new Promise(r => setTimeout(r, 2))
    await store.add({ ...BASE_PRESET, parameterConfidence: 'estimated'  as const, label: 'Est' })

    setActivePinia(createPinia())
    const store2 = useUserPresetsStore()
    await store2.fetchAll()

    const confidences = store2.presets.map(p => p.parameterConfidence)
    expect(confidences).toContain('literature')
    expect(confidences).toContain('measured')
    expect(confidences).toContain('estimated')
  })

  it('falls back to literature when parameterConfidence is absent (old preset format)', async () => {
    // Simulate a preset saved before the parameterConfidence field was introduced
    const { parameterConfidence: _omit, ...withoutConfidence } = {
      ...BASE_PRESET,
      role:      'target',
      cellType:  'mammalian',
      id:        'user_old',
      createdAt: 1000000,
      parameterConfidence: 'literature',   // present in type but stripped below
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify([withoutConfidence]))

    setActivePinia(createPinia())
    const store = useUserPresetsStore()
    await store.fetchAll()
    expect(store.presets[0]!.parameterConfidence).toBe('literature')
  })

  it('confidence is preserved when other fields are updated', async () => {
    const store = await freshStore()
    await store.add({ ...BASE_PRESET, parameterConfidence: 'estimated' as const })
    const id = store.presets[0]!.id
    await store.update(id, { label: 'Updated Label' })
    expect(store.presets[0]!.parameterConfidence).toBe('estimated')
  })

  it('toCellConfig does not include parameterConfidence', async () => {
    const store = await freshStore()
    await store.add({ ...BASE_PRESET, parameterConfidence: 'estimated' as const })
    const config = store.toCellConfig(store.presets[0]!) as object as Record<string, unknown>
    expect('parameterConfidence' in config).toBe(false)
  })

  it('confidence can be changed via update', async () => {
    const store = await freshStore()
    await store.add({ ...BASE_PRESET, parameterConfidence: 'literature' as const })
    const id = store.presets[0]!.id
    await store.update(id, { parameterConfidence: 'measured' as const })
    expect(store.presets[0]!.parameterConfidence).toBe('measured')
  })
})
