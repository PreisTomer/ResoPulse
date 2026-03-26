// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { defineStore } from 'pinia'
import { useCellStore } from '@/stores/cellStore'
import type { AiOptimizeResult, AiParamSuggestion } from '@/services/socket'

// ── State type ────────────────────────────────────────────────────────────────

interface AiState {
  /** True while waiting for the backend + Python service to respond */
  isLoading: boolean
  /** requestId of the in-flight request, used to match the server response */
  pendingRequestId: string | null
  /** Most recent result from the optimizer (null = never requested) */
  result: AiOptimizeResult | null
  /** True after the user clicked "Apply Suggestion" this session */
  suggestionApplied: boolean
  /** Whether the "Why this?" feature importance panel is expanded */
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
    /** True when a valid (non-null suggestion) result is available */
    hasResult(): boolean {
      return this.result !== null
    },

    /** Confidence score 0-1, or 0 if no result */
    confidence(): number {
      return this.result?.confidenceScore ?? 0
    },

    /** Whether the current result is from the physics baseline (no ML data yet) */
    isPhysicsBaseline(): boolean {
      return this.result?.isPhysicsBaseline ?? true
    },

    /** Human-readable confidence label */
    confidenceLabel(): string {
      const c = this.confidence
      if (c >= 0.8)  return 'High'
      if (c >= 0.6)  return 'Medium'
      if (c >= 0.4)  return 'Low'
      return 'Physics'
    },
  },

  actions: {
    /**
     * Kick off a new optimization request.
     * Returns the generated requestId so the caller can pass it to requestAiOptimization().
     */
    startRequest(): string {
      const id           = generateRequestId()
      this.pendingRequestId = id
      this.isLoading     = true
      this.result        = null
      this.suggestionApplied = false
      return id
    },

    /**
     * Called by the socket listener when aiOptimizeResult arrives.
     * Only accepts responses matching the pending requestId.
     */
    receiveResult(result: AiOptimizeResult): void {
      if (result.requestId !== this.pendingRequestId) return
      this.isLoading        = false
      this.pendingRequestId = null
      this.result           = result
    },

    /** Called when the socket or timer cancels the in-flight request. */
    cancelRequest(): void {
      this.isLoading        = false
      this.pendingRequestId = null
    },

    /** Clear the result panel (e.g. when cell preset changes). */
    clearResult(): void {
      this.isLoading         = false
      this.pendingRequestId  = null
      this.result            = null
      this.suggestionApplied = false
    },

    /**
     * Apply the AI suggestion to the cell store sliders.
     * Broadcasts state sync so collaborators see the change.
     */
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
