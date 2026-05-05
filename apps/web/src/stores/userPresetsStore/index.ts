// Copyright © 2026 Tomer Preis. Licensed under the MIT License.
import { defineStore } from 'pinia'

import { getAuthToken, apiFetch } from '@/services/apiClient'

import { loadFromStorage, saveToStorage } from '@/utils/storageClient'

import { CELL_TYPE } from '@/constants/strings'
import type { CellType } from '@/constants/strings'
import { STORAGE_KEY } from '@/constants/storageKeys'

import type { CellConfig } from '@/types/cell'

// ── Types ──────────────────────────────────────────────────────────────────────

export type CellRole            = 'target' | 'healthy'
export type CellFormType        = 'mammalian' | 'bacteria' | 'virus'
export type ParameterConfidence = 'literature' | 'measured' | 'estimated'
export type SigmaSource         = 'literature' | 'measured' | 'electrorotation' | 'impedance' | 'estimated'

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
  // σ_mem for DEP CM model (optional — falls back to 10⁻⁷ S/m mammalian bilayer)
  membraneConductivity?: number
  // σ_i provenance — ±% uncertainty, measurement source, citation (most uncertain Schwan parameter)
  sigmaUncertaintyPct?: number
  sigmaSource?:         SigmaSource
  sigmaCitation?:       string
  // σ_i measurement conditions — used for temperature correction and medium mismatch detection
  conductivityMeasurementTempC?:  number  // °C at which σ_i was measured; absent → assume 37°C
  conductivityMeasurementSigmaE?: number  // medium σ_e [S/m] during σ_i measurement; absent → no mismatch check
  // Nuclear envelope (mammalian only; Kotnik & Miklavcic 2006)
  nuclearRadius?:              number
  nuclearMembraneThickness?:   number
  nuclearMembraneEps?:         number
  nucleoplasmConductivity?:    number
  nuclearThresholdVoltage?:    number
  // Acoustic / mechanical resonance (bacteria / virus only)
  resonantFreqGHz?:             number
  capsidQ?:                     number
  resonantThresholdVcm?:        number
  // Resonance uncertainty bands & secondary mode
  resonantFreqUncertaintyPct?:  number
  capsidQMin?:                  number
  capsidQMax?:                  number
  resonantFreqGHz2?:            number
  capsidQ2?:                    number
  resonantMode2Amplitude?:      number
  createdAt:            number
}

export type UserCellPresetInput = Omit<UserCellPreset, 'id' | 'createdAt'>

// ── Local-storage fallback (guests only) ──────────────────────────────────────

function loadLocal(): UserCellPreset[] {
  return loadFromStorage<UserCellPreset[]>(STORAGE_KEY.USER_PRESETS, [], raw => {
    const parsed = JSON.parse(raw) as UserCellPreset[]
    // Apply fallback for fields missing in presets saved before schema migration
    return parsed.map(p => ({
      ...p,
      parameterConfidence: p.parameterConfidence ?? 'literature',
    }))
  })
}

function saveLocal(presets: UserCellPreset[]): void {
  saveToStorage(STORAGE_KEY.USER_PRESETS, JSON.stringify(presets))
}

// ── Backend DTO → UserCellPreset ───────────────────────────────────────────────

interface BackendPreset {
  id: string; role: string; cellType: string; label: string; shortLabel: string
  notes: string | null; parameterConfidence: string; radius: number; membraneThickness: number
  dielectricConstant: number; conductivity: number; thresholdVoltage: number
  density: number; specificHeatCapacity: number
  membraneConductivity: number | null
  sigmaUncertaintyPct: number | null
  sigmaSource:         string | null
  sigmaCitation:       string | null
  conductivityMeasurementTempC:  number | null
  conductivityMeasurementSigmaE: number | null
  nuclearRadius: number | null
  nuclearMembraneThickness: number | null
  nuclearMembraneEps: number | null
  nucleoplasmConductivity: number | null
  nuclearThresholdVoltage: number | null
  resonantFreqGHz: number | null; capsidQ: number | null; resonantThresholdVcm: number | null
  resonantFreqUncertaintyPct: number | null
  capsidQMin: number | null
  capsidQMax: number | null
  resonantFreqGHz2: number | null
  capsidQ2: number | null
  resonantMode2Amplitude: number | null
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
    ...(p.membraneConductivity       != null && { membraneConductivity:       p.membraneConductivity }),
    ...(p.sigmaUncertaintyPct           != null && { sigmaUncertaintyPct:           p.sigmaUncertaintyPct }),
    ...(p.sigmaSource                   != null && p.sigmaSource !== '' && { sigmaSource: p.sigmaSource as SigmaSource }),
    ...(p.sigmaCitation                 != null && p.sigmaCitation !== '' && { sigmaCitation: p.sigmaCitation }),
    ...(p.conductivityMeasurementTempC  != null && { conductivityMeasurementTempC:  p.conductivityMeasurementTempC }),
    ...(p.conductivityMeasurementSigmaE != null && { conductivityMeasurementSigmaE: p.conductivityMeasurementSigmaE }),
    ...(p.nuclearRadius                 != null && { nuclearRadius:                 p.nuclearRadius }),
    ...(p.nuclearMembraneThickness   != null && { nuclearMembraneThickness:   p.nuclearMembraneThickness }),
    ...(p.nuclearMembraneEps         != null && { nuclearMembraneEps:         p.nuclearMembraneEps }),
    ...(p.nucleoplasmConductivity    != null && { nucleoplasmConductivity:    p.nucleoplasmConductivity }),
    ...(p.nuclearThresholdVoltage    != null && { nuclearThresholdVoltage:    p.nuclearThresholdVoltage }),
    ...(p.resonantFreqGHz            != null && { resonantFreqGHz:            p.resonantFreqGHz }),
    ...(p.capsidQ                    != null && { capsidQ:                    p.capsidQ }),
    ...(p.resonantThresholdVcm       != null && { resonantThresholdVcm:       p.resonantThresholdVcm }),
    ...(p.resonantFreqUncertaintyPct != null && { resonantFreqUncertaintyPct: p.resonantFreqUncertaintyPct }),
    ...(p.capsidQMin                 != null && { capsidQMin:                 p.capsidQMin }),
    ...(p.capsidQMax                 != null && { capsidQMax:                 p.capsidQMax }),
    ...(p.resonantFreqGHz2           != null && { resonantFreqGHz2:           p.resonantFreqGHz2 }),
    ...(p.capsidQ2                   != null && { capsidQ2:                   p.capsidQ2 }),
    ...(p.resonantMode2Amplitude     != null && { resonantMode2Amplitude:     p.resonantMode2Amplitude }),
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
      const token = await getAuthToken()
      if (!token) {
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
        ...(preset.membraneConductivity           != null && { membraneConductivity:           preset.membraneConductivity }),
        ...(preset.conductivityMeasurementTempC  != null && { conductivityMeasurementTempC:  preset.conductivityMeasurementTempC }),
        ...(preset.conductivityMeasurementSigmaE != null && { conductivityMeasurementSigmaE: preset.conductivityMeasurementSigmaE }),
        ...(preset.sigmaUncertaintyPct           != null && { sigmaUncertaintyPct:           preset.sigmaUncertaintyPct }),
        ...(preset.nuclearRadius                 != null && { nuclearRadius:                 preset.nuclearRadius }),
        ...(preset.nuclearMembraneThickness   != null && { nuclearMembraneThickness:   preset.nuclearMembraneThickness }),
        ...(preset.nuclearMembraneEps         != null && { nuclearMembraneEps:         preset.nuclearMembraneEps }),
        ...(preset.nucleoplasmConductivity    != null && { nucleoplasmConductivity:    preset.nucleoplasmConductivity }),
        ...(preset.nuclearThresholdVoltage    != null && { nuclearThresholdVoltage:    preset.nuclearThresholdVoltage }),
        ...(preset.resonantFreqGHz            != null && { resonantFreqGHz:            preset.resonantFreqGHz }),
        ...(preset.capsidQ                    != null && { capsidQ:                    preset.capsidQ }),
        ...(preset.resonantThresholdVcm       != null && { resonantThresholdVcm:       preset.resonantThresholdVcm }),
        ...(preset.resonantFreqUncertaintyPct != null && { resonantFreqUncertaintyPct: preset.resonantFreqUncertaintyPct }),
        ...(preset.capsidQMin                 != null && { capsidQMin:                 preset.capsidQMin }),
        ...(preset.capsidQMax                 != null && { capsidQMax:                 preset.capsidQMax }),
        ...(preset.resonantFreqGHz2           != null && { resonantFreqGHz2:           preset.resonantFreqGHz2 }),
        ...(preset.capsidQ2                   != null && { capsidQ2:                   preset.capsidQ2 }),
        ...(preset.resonantMode2Amplitude     != null && { resonantMode2Amplitude:     preset.resonantMode2Amplitude }),
      }
    },

    // Legacy — kept for guest compatibility; callers should use fetchAll() instead
    reload(): void {
      if (this.isGuest) this.presets = loadLocal()
    },
  },
})
