/**
 * User-defined cell presets — persisted to localStorage.
 * Allows scientists to import biophysical parameters from their own literature
 * or experimental measurements and use them alongside the built-in library.
 */
import { defineStore } from 'pinia'
import type { CellConfig } from '@/types/cell'
import { CELL_TYPE } from '@/constants/strings'

// ── Types ──────────────────────────────────────────────────────────────────────

export interface UserCellPreset {
  id:                   string
  label:                string
  shortLabel:           string
  notes:                string           // e.g. citation or lab context
  // Required Schwan parameters
  radius:               number           // µm
  membraneThickness:    number           // nm
  dielectricConstant:   number           // membrane ε_r (effective, typically 5–15)
  conductivity:         number           // intracellular σ_i [S/m]
  thresholdVoltage:     number           // Vm lysis threshold [V]
  // Thermal
  density:              number           // kg/m³ (default 1000)
  specificHeatCapacity: number           // J/(kg·K) (default 3500)
  // Acoustic / mechanical resonance (bacteria / virus only)
  resonantFreqGHz?:       number         // Capsid or cell-wall fundamental resonant frequency [GHz]
  capsidQ?:               number         // Mechanical quality factor
  resonantThresholdVcm?:  number         // Field amplitude at resonance for disruption [V/cm]
  createdAt:            number           // Unix ms
}

// ── Persistence helpers ────────────────────────────────────────────────────────

const STORAGE_KEY = 'resopulse_user_presets_v1'

function load(): UserCellPreset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as UserCellPreset[]) : []
  } catch {
    return []
  }
}

function save(presets: UserCellPreset[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets))
  } catch { /* quota exceeded — fail silently */ }
}

// ── Store ──────────────────────────────────────────────────────────────────────

export const useUserPresetsStore = defineStore('userPresets', {
  state: () => ({
    presets: load() as UserCellPreset[],
  }),

  getters: {
    hasPresets(): boolean { return this.presets.length > 0 },
  },

  actions: {
    /** Add a new user preset and persist. */
    add(preset: Omit<UserCellPreset, 'id' | 'createdAt'>) {
      const entry: UserCellPreset = {
        ...preset,
        id:        `user_${Date.now()}`,
        createdAt: Date.now(),
      }
      this.presets.push(entry)
      save(this.presets)
    },

    /** Remove a preset by ID and persist. */
    remove(id: string) {
      this.presets = this.presets.filter(p => p.id !== id)
      save(this.presets)
    },

    /**
     * Convert a UserCellPreset to a full CellConfig that can be loaded
     * into cellStore via `store.loadPreset(cellType, config)`.
     */
    toCellConfig(preset: UserCellPreset, type: 'healthy' | 'target' = 'target'): CellConfig {
      return {
        id:                   preset.id,
        type:                 type === CELL_TYPE.HEALTHY ? CELL_TYPE.HEALTHY : CELL_TYPE.TARGET,
        label:                preset.label,
        radius:               preset.radius,
        membraneThickness:    preset.membraneThickness,
        naturalFrequency:     0,              // animation only; not a physics parameter
        thresholdVoltage:     preset.thresholdVoltage,
        dielectricConstant:   preset.dielectricConstant,
        conductivity:         preset.conductivity,
        density:              preset.density,
        specificHeatCapacity: preset.specificHeatCapacity,
        amplitude:            0.5,
        // Optional resonance fields (bacteria / virus only) — omit if undefined
        ...(preset.resonantFreqGHz       != null && { resonantFreqGHz:      preset.resonantFreqGHz }),
        ...(preset.capsidQ               != null && { capsidQ:              preset.capsidQ }),
        ...(preset.resonantThresholdVcm  != null && { resonantThresholdVcm: preset.resonantThresholdVcm }),
      }
    },

    /** Re-load from localStorage (called on app init if needed). */
    reload() {
      this.presets = load()
    },
  },
})
