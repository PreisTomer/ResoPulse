// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

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

export type CsvColumnMapping = Partial<Record<CsvMappingField, string>>

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
    hasMapping(): boolean {
      return Object.keys(this.mapping).length > 0
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
