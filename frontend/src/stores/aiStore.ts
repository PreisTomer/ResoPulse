// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { defineStore } from 'pinia'
import { useCellStore } from '@/stores/cellStore'
import type { AiOptimizeResult, AiParamSuggestion } from '@/services/socket'

// ── State type ────────────────────────────────────────────────────────────────

interface AiState {
  isLoading: boolean
  pendingRequestId: string | null  // in-flight requestId for response matching
  result: AiOptimizeResult | null
  suggestionApplied: boolean
  importanceExpanded: boolean
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateRequestId(): string {
  return `ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useAiStore = defineStore('ai', {
  state: (): AiState => ({
    isLoading:         false,
    pendingRequestId:  null,
    result:            null,
    suggestionApplied: false,
    importanceExpanded: false,
  }),

  getters: {
    hasResult(): boolean {
      return this.result !== null
    },

    confidence(): number {
      return this.result?.confidenceScore ?? 0
    },

    isPhysicsBaseline(): boolean {
      return this.result?.isPhysicsBaseline ?? true
    },

    confidenceLabel(): string {
      const c = this.confidence
      if (c >= 0.8)  return 'High'
      if (c >= 0.6)  return 'Medium'
      if (c >= 0.4)  return 'Low'
      return 'Physics'
    },
  },

  actions: {
    startRequest(): string {
      const id           = generateRequestId()
      this.pendingRequestId = id
      this.isLoading     = true
      this.result        = null
      this.suggestionApplied = false
      return id
    },

    receiveResult(result: AiOptimizeResult): void {
      if (result.requestId !== this.pendingRequestId) return
      this.isLoading        = false
      this.pendingRequestId = null
      this.result           = result
    },

    cancelRequest(): void {
      this.isLoading        = false
      this.pendingRequestId = null
    },

    clearResult(): void {
      this.isLoading         = false
      this.pendingRequestId  = null
      this.result            = null
      this.suggestionApplied = false
    },

    applySuggestion(): void {
      if (!this.result?.suggestion) return
      const s: AiParamSuggestion = this.result.suggestion
      const cell = useCellStore()

      cell.setBroadcastFreqKHz(s.freqKHz)
      cell.setFieldIntensity(s.fieldVcm)
      cell.setDutyCycle(s.dutyCycle)
      cell.setPulseWidthNs(s.pulseWidthNs)
      cell.setWaveform(s.waveform)

      this.suggestionApplied = true
    },

    toggleImportance(): void {
      this.importanceExpanded = !this.importanceExpanded
    },
  },
})
