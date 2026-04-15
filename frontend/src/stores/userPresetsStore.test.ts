// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

import { useUserPresetsStore } from './userPresetsStore'

const STORAGE_KEY = 'resopulse_user_presets_v1'

// Narrow accessor for optional acoustic-resonance fields on CellConfig
interface ResonanceFields {
  resonantFreqGHz?:      number
  capsidQ?:              number
  resonantThresholdVcm?: number
}

const BASE_PRESET = {
  label:                'Test Cell',
  shortLabel:           'TC',
  notes:                'Lab-created HEK293',
  radius:               8,
  membraneThickness:    7,
  dielectricConstant:   10,
  conductivity:         0.35,
  thresholdVoltage:     0.9,
  density:              1050,
  specificHeatCapacity: 3500,
}

function freshStore() {
  localStorage.clear()
  setActivePinia(createPinia())
  return useUserPresetsStore()
}

// ── add ───────────────────────────────────────────────────────────────────────

describe('add', () => {
  it('appends a preset with auto-generated id and createdAt', () => {
    const store = freshStore()
    store.add(BASE_PRESET)
    expect(store.presets).toHaveLength(1)
    const p = store.presets[0]!
    expect(p.id).toMatch(/^user_\d+$/)
    expect(p.createdAt).toBeGreaterThan(0)
    expect(p.label).toBe('Test Cell')
  })

  it('ids are unique across multiple adds', async () => {
    const store = freshStore()
    store.add(BASE_PRESET)
    // Guarantee a different Date.now() timestamp — ids are `user_${Date.now()}`
    await new Promise(r => setTimeout(r, 2))
    store.add({ ...BASE_PRESET, label: 'Second' })
    const ids = store.presets.map(p => p.id)
    expect(new Set(ids).size).toBe(2)
  })

  it('persists to localStorage immediately', () => {
    const store = freshStore()
    store.add(BASE_PRESET)
    const raw = localStorage.getItem(STORAGE_KEY)
    expect(raw).not.toBeNull()
    const saved = JSON.parse(raw!) as unknown[]
    expect(saved).toHaveLength(1)
  })
})

// ── remove ────────────────────────────────────────────────────────────────────

describe('remove', () => {
  it('deletes the preset with the given id', async () => {
    const store = freshStore()
    store.add(BASE_PRESET)
    await new Promise(r => setTimeout(r, 2))
    store.add({ ...BASE_PRESET, label: 'Second' })
    const idToRemove = store.presets[0]!.id
    store.remove(idToRemove)
    expect(store.presets).toHaveLength(1)
    expect(store.presets[0]!.label).toBe('Second')
  })

  it('updates localStorage after removal', () => {
    const store = freshStore()
    store.add(BASE_PRESET)
    const id = store.presets[0]!.id
    store.remove(id)
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as unknown[]
    expect(saved).toHaveLength(0)
  })

  it('is a no-op for an unknown id', () => {
    const store = freshStore()
    store.add(BASE_PRESET)
    store.remove('does-not-exist')
    expect(store.presets).toHaveLength(1)
  })
})

// ── hasPresets ────────────────────────────────────────────────────────────────

describe('hasPresets', () => {
  it('is false when empty', () => {
    expect(freshStore().hasPresets).toBe(false)
  })

  it('is true after adding a preset', () => {
    const store = freshStore()
    store.add(BASE_PRESET)
    expect(store.hasPresets).toBe(true)
  })
})

// ── reload ────────────────────────────────────────────────────────────────────

describe('reload', () => {
  it('reads presets back from localStorage', () => {
    const store = freshStore()
    store.add(BASE_PRESET)
    // Simulate another store instance reading the persisted data
    setActivePinia(createPinia())
    const store2 = useUserPresetsStore()
    store2.reload()
    expect(store2.presets).toHaveLength(1)
    expect(store2.presets[0]!.label).toBe('Test Cell')
  })
})

// ── toCellConfig ──────────────────────────────────────────────────────────────

describe('toCellConfig', () => {
  it('maps required Schwan fields correctly', () => {
    const store = freshStore()
    store.add(BASE_PRESET)
    const preset = store.presets[0]!
    const config = store.toCellConfig(preset, 'target')

    expect(config.id).toBe(preset.id)
    expect(config.label).toBe('Test Cell')
    expect(config.radius).toBe(8)
    expect(config.membraneThickness).toBe(7)
    expect(config.conductivity).toBe(0.35)
    expect(config.thresholdVoltage).toBe(0.9)
    expect(config.type).toBe('target')
  })

  it('defaults to target type when type arg is omitted', () => {
    const store = freshStore()
    store.add(BASE_PRESET)
    const config = store.toCellConfig(store.presets[0]!)
    expect(config.type).toBe('target')
  })

  it('maps type=healthy correctly', () => {
    const store = freshStore()
    store.add(BASE_PRESET)
    const config = store.toCellConfig(store.presets[0]!, 'healthy')
    expect(config.type).toBe('healthy')
  })

  it('omits optional resonance fields when not present', () => {
    const store = freshStore()
    store.add(BASE_PRESET)
    const config = store.toCellConfig(store.presets[0]!) as ResonanceFields
    expect(config.resonantFreqGHz).toBeUndefined()
    expect(config.capsidQ).toBeUndefined()
    expect(config.resonantThresholdVcm).toBeUndefined()
  })

  it('includes optional resonance fields when present', () => {
    const store = freshStore()
    store.add({ ...BASE_PRESET, resonantFreqGHz: 0.5, capsidQ: 3.5, resonantThresholdVcm: 1200 })
    const config = store.toCellConfig(store.presets[0]!) as ResonanceFields
    expect(config.resonantFreqGHz).toBe(0.5)
    expect(config.capsidQ).toBe(3.5)
    expect(config.resonantThresholdVcm).toBe(1200)
  })
})

// ── localStorage persistence round-trip ───────────────────────────────────────

describe('localStorage persistence', () => {
  it('returns an empty array when localStorage is empty', () => {
    expect(freshStore().presets).toHaveLength(0)
  })

  it('restores presets on cold-start (new store from existing localStorage)', () => {
    // Write directly to localStorage as if a previous session saved it
    const saved = [{ ...BASE_PRESET, id: 'user_111', createdAt: 1000000 }]
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved))
    setActivePinia(createPinia())
    const store = useUserPresetsStore()
    expect(store.presets).toHaveLength(1)
    expect(store.presets[0]!.label).toBe('Test Cell')
  })

  it('returns empty array when localStorage contains corrupt JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{{corrupt')
    setActivePinia(createPinia())
    const store = useUserPresetsStore()
    expect(store.presets).toHaveLength(0)
  })
})
