// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
import { defineStore } from 'pinia'

import { CELL_TYPE } from '@/constants/strings'
import type { CellType } from '@/constants/strings'

import type { CellConfig } from '@/types/cell'

// ── Types ──────────────────────────────────────────────────────────────────────

export type CellRole            = 'target' | 'healthy'
export type CellFormType        = 'mammalian' | 'bacteria' | 'virus'
export type ParameterConfidence = 'literature' | 'measured' | 'estimated'

export interface UserCellPreset {
  id:                   string
  role:                 CellRole
  cellType:             CellFormType
  label:                string
  shortLabel:           string
  notes:                string
  parameterConfidence:  ParameterConfidence
  // Required Schwan parameters
  radius:               number
  membraneThickness:    number
  dielectricConstant:   number
  conductivity:         number
  thresholdVoltage:     number
  // Thermal
  density:              number
  specificHeatCapacity: number
  // Acoustic / mechanical resonance (bacteria / virus only)
  resonantFreqGHz?:       number
  capsidQ?:               number
  resonantThresholdVcm?:  number
  createdAt:            number
}

export type UserCellPresetInput = Omit<UserCellPreset, 'id' | 'createdAt'>

// ── API helpers ────────────────────────────────────────────────────────────────

const BACKEND_URL    = (import.meta.env.VITE_BACKEND_URL as string ?? 'http://localhost:3001').replace(/\/$/, '')
const LOCAL_KEY      = 'resopulse_user_presets_v2'

async function authHeaders(): Promise<Record<string, string> | null> {
  const token = await window.Clerk?.session?.getToken()
  if (!token) return null
  return { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
}

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = await authHeaders()
  if (!headers) throw new Error('Not authenticated')
  const res = await fetch(`${BACKEND_URL}${path}`, { ...init, headers: { ...headers, ...(init.headers ?? {}) } })
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  if (res.status === 204 || res.headers.get('content-length') === '0') return undefined as T
  return res.json() as Promise<T>
}

// ── Local-storage fallback (guests only) ──────────────────────────────────────

function loadLocal(): UserCellPreset[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as UserCellPreset[]
    // Apply fallback for fields missing in presets saved before schema migration
    return parsed.map(p => ({
      ...p,
      parameterConfidence: p.parameterConfidence ?? 'literature',
    }))
  } catch { return [] }
}

function saveLocal(presets: UserCellPreset[]): void {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(presets)) } catch { /* quota */ }
}

// ── Backend DTO → UserCellPreset ───────────────────────────────────────────────

interface BackendPreset {
  id: string; role: string; cellType: string; label: string; shortLabel: string
  notes: string | null; parameterConfidence: string; radius: number; membraneThickness: number
  dielectricConstant: number; conductivity: number; thresholdVoltage: number
  density: number; specificHeatCapacity: number
  resonantFreqGHz: number | null; capsidQ: number | null; resonantThresholdVcm: number | null
  createdAt: string
}

function fromBackend(p: BackendPreset): UserCellPreset {
  return {
    id:                   p.id,
    role:                 p.role as CellRole,
    cellType:             p.cellType as CellFormType,
    label:                p.label,
    shortLabel:           p.shortLabel,
    notes:                p.notes ?? '',
    parameterConfidence:  (p.parameterConfidence as ParameterConfidence) ?? 'literature',
    radius:               p.radius,
    membraneThickness:    p.membraneThickness,
    dielectricConstant:   p.dielectricConstant,
    conductivity:         p.conductivity,
    thresholdVoltage:     p.thresholdVoltage,
    density:              p.density,
    specificHeatCapacity: p.specificHeatCapacity,
    ...(p.resonantFreqGHz      != null && { resonantFreqGHz:      p.resonantFreqGHz }),
    ...(p.capsidQ               != null && { capsidQ:              p.capsidQ }),
    ...(p.resonantThresholdVcm  != null && { resonantThresholdVcm: p.resonantThresholdVcm }),
    createdAt: new Date(p.createdAt).getTime(),
  }
}

// ── Store ──────────────────────────────────────────────────────────────────────

export const useUserPresetsStore = defineStore('userPresets', {
  state: () => ({
    presets:  [] as UserCellPreset[],
    loading:  false,
    isGuest:  false,
  }),

  getters: {
    hasPresets():      boolean        { return this.presets.length > 0 },
    targetPresets():   UserCellPreset[] { return this.presets.filter(p => p.role === 'target') },
    healthyPresets():  UserCellPreset[] { return this.presets.filter(p => p.role === 'healthy') },
  },

  actions: {
    async fetchAll(): Promise<void> {
      const headers = await authHeaders()
      if (!headers) {
        // Guest: use localStorage
        this.isGuest = true
        this.presets = loadLocal()
        return
      }
      this.isGuest = false
      this.loading = true
      try {
        const data = await apiFetch<{ presets: BackendPreset[] }>('/cell-presets')
        this.presets = data.presets.map(fromBackend)
      } catch (err) {
        console.error('[userPresetsStore] fetchAll failed:', err)
      } finally {
        this.loading = false
      }
    },

    async add(input: UserCellPresetInput): Promise<UserCellPreset | null> {
      if (this.isGuest) {
        const entry: UserCellPreset = { ...input, id: `user_${Date.now()}`, createdAt: Date.now() }
        this.presets.push(entry)
        saveLocal(this.presets)
        return entry
      }
      try {
        const data = await apiFetch<{ preset: BackendPreset }>('/cell-presets', {
          method: 'POST',
          body:   JSON.stringify(input),
        })
        const entry = fromBackend(data.preset)
        this.presets.push(entry)
        return entry
      } catch (err) {
        console.error('[userPresetsStore] add failed:', err)
        return null
      }
    },

    async update(id: string, changes: Partial<UserCellPresetInput>): Promise<boolean> {
      if (this.isGuest) {
        const idx = this.presets.findIndex(p => p.id === id)
        if (idx === -1) return false
        this.presets[idx] = { ...this.presets[idx]!, ...changes }
        saveLocal(this.presets)
        return true
      }
      try {
        const data = await apiFetch<{ preset: BackendPreset }>(`/cell-presets/${id}`, {
          method: 'PUT',
          body:   JSON.stringify(changes),
        })
        const idx = this.presets.findIndex(p => p.id === id)
        if (idx !== -1) this.presets[idx] = fromBackend(data.preset)
        return true
      } catch (err) {
        console.error('[userPresetsStore] update failed:', err)
        return false
      }
    },

    async remove(id: string): Promise<void> {
      if (this.isGuest) {
        this.presets = this.presets.filter(p => p.id !== id)
        saveLocal(this.presets)
        return
      }
      try {
        await apiFetch<void>(`/cell-presets/${id}`, { method: 'DELETE' })
        this.presets = this.presets.filter(p => p.id !== id)
      } catch (err) {
        console.error('[userPresetsStore] remove failed:', err)
      }
    },

    toCellConfig(preset: UserCellPreset, typeOverride?: CellType): CellConfig {
      const type = typeOverride ?? (preset.role === 'healthy' ? CELL_TYPE.HEALTHY : CELL_TYPE.TARGET)
      return {
        id:                   preset.id,
        type,
        label:                preset.label,
        description:          preset.notes || undefined,
        radius:               preset.radius,
        membraneThickness:    preset.membraneThickness,
        naturalFrequency:     0,
        thresholdVoltage:     preset.thresholdVoltage,
        dielectricConstant:   preset.dielectricConstant,
        conductivity:         preset.conductivity,
        density:              preset.density,
        specificHeatCapacity: preset.specificHeatCapacity,
        amplitude:            0.5,
        ...(preset.resonantFreqGHz      != null && { resonantFreqGHz:      preset.resonantFreqGHz }),
        ...(preset.capsidQ              != null && { capsidQ:              preset.capsidQ }),
        ...(preset.resonantThresholdVcm != null && { resonantThresholdVcm: preset.resonantThresholdVcm }),
      }
    },

    // Legacy — kept for guest compatibility; callers should use fetchAll() instead
    reload(): void {
      if (this.isGuest) this.presets = loadLocal()
    },
  },
})
