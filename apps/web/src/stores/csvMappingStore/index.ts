// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

import { defineStore } from 'pinia'

import { STORAGE_KEY } from '@/constants/storageKeys'

export type CsvMappingField =
  | 'targetLysisPct'
  | 'healthyLysisPct'
  | 'viabilityPct'
  | 'permeabilizedPct'
  | 'transfectionPct'
  | 'assayTimepointH'
  | 'qpcrFoldChange'
  | 'tempC'
  | 'actualFieldVcm'
  | 'observedLysisDelayMs'
  | 'viabilityAssay'
  | 'qpcrTarget'
  | 'notes'
  | 'measuredAt'

// Plate-reader extensions on top of the per-field column-name mapping. Stored on the same persisted record so a single "Save mapping" gesture covers everything.
//   idColumn      — explicit column name carrying the entry id (overrides the built-in `id`/`#`/`entry` heuristics; useful when the reader names the column `Sample`).
//   idRegex       — regex applied to each idColumn cell to extract a numeric id. First capture group wins; if no group, the full match is parsed. Lets samples named "Run #3 MCF-7" map back to entry 3.
//   headerSkip    — number of leading lines to drop before searching for the header row. Plate readers often emit 5-20 lines of "Plate ID: …", "Date: …" metadata before the actual table.
//   formatPresetId — UI memory only: which preset (csvFormatPresets) the user picked last. Doesn't change parser behaviour directly.
export interface CsvMappingExtras {
  idColumn?:      string
  idRegex?:       string
  headerSkip?:    number
  formatPresetId?: string
}

export type CsvColumnMapping = Partial<Record<CsvMappingField, string>> & CsvMappingExtras

const EXTRA_KEYS: ReadonlyArray<keyof CsvMappingExtras> = ['idColumn', 'idRegex', 'headerSkip', 'formatPresetId']
function isExtraKey(k: string): k is keyof CsvMappingExtras { return (EXTRA_KEYS as ReadonlyArray<string>).includes(k) }

interface CsvMappingState {
  mapping: CsvColumnMapping
}

function loadFromStorage(): CsvColumnMapping {
  try {
    const raw = localStorage.getItem(STORAGE_KEY.CSV_COLUMN_MAPPING)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as CsvColumnMapping
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function persist(mapping: CsvColumnMapping): void {
  try {
    localStorage.setItem(STORAGE_KEY.CSV_COLUMN_MAPPING, JSON.stringify(mapping))
  } catch {
    // storage may be full or blocked — fail silently, user will just re-enter next time
  }
}

export const useCsvMappingStore = defineStore('csvMapping', {
  state: (): CsvMappingState => ({
    mapping: loadFromStorage(),
  }),

  getters: {
    // True when the user has set ANY mapping value — column name, ID rule, or plate-reader extra.
    hasMapping(): boolean {
      return Object.keys(this.mapping).filter(k => k !== 'formatPresetId').length > 0
    },
  },

  actions: {
    setField(field: CsvMappingField, header: string): void {
      const trimmed = header.trim()
      if (trimmed.length === 0) {
        delete this.mapping[field]
      } else {
        this.mapping[field] = trimmed
      }
      persist(this.mapping)
    },

    // Plate-reader extras — separate setter to keep CsvMappingField narrow.
    setExtra<K extends keyof CsvMappingExtras>(key: K, value: CsvMappingExtras[K] | undefined): void {
      if (!isExtraKey(key)) return
      if (value === undefined || value === null || value === '') {
        delete this.mapping[key]
      } else if (typeof value === 'string') {
        this.mapping[key] = value.trim() as CsvMappingExtras[K]
      } else {
        this.mapping[key] = value
      }
      persist(this.mapping)
    },

    setAll(next: CsvColumnMapping): void {
      this.mapping = { ...next }
      persist(this.mapping)
    },

    clear(): void {
      this.mapping = {}
      persist(this.mapping)
    },
  },
})
