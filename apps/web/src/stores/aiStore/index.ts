// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { defineStore } from 'pinia'

import { useCellStore } from '@/stores/cellStore'

import type { AiOptimizeResult, AiParamSuggestion, TrainingCompletePayload } from '@/services/socket'
import type { TrainerOutcomeMetrics } from '@resopulse/shared-types'
interface AiState {
  isLoading: boolean
  pendingRequestId: string | null  // in-flight requestId for response matching
  result: AiOptimizeResult | null
  suggestionApplied: boolean
  importanceExpanded: boolean
  modelTrainingSamples: number
  modelReady: boolean
  lastTrainingAt: string | null
  retrainJustCompleted: boolean
  lastModelVersion: string | null
  lastPromoted: boolean
  lastHoldoutMae: number | null
  lastPreviousBestMae: number | null
  lastTargetDr: TrainerOutcomeMetrics | null
  lastHealthyDr: TrainerOutcomeMetrics | null
  lastRating: TrainerOutcomeMetrics | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function generateRequestId(): string {
  return `ai-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useAiStore = defineStore('ai', {
  state: (): AiState => ({
    isLoading:             false,
    pendingRequestId:      null,
    result:                null,
    suggestionApplied:     false,
    importanceExpanded:    false,
    modelTrainingSamples:  0,
    modelReady:            false,
    lastTrainingAt:        null,
    retrainJustCompleted:  false,
    lastModelVersion:      null,
    lastPromoted:          false,
    lastHoldoutMae:        null,
    lastPreviousBestMae:   null,
    lastTargetDr:          null,
    lastHealthyDr:         null,
    lastRating:            null,
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

    receiveTrainingComplete(payload: TrainingCompletePayload): void {
      this.modelTrainingSamples = payload.samplesUsed
      this.modelReady           = payload.modelReady
      this.lastTrainingAt       = payload.at
      this.retrainJustCompleted = true
      this.lastModelVersion     = payload.modelVersion
      this.lastPromoted         = payload.promoted
      this.lastHoldoutMae       = payload.holdoutMaeOverall
      this.lastPreviousBestMae  = payload.previousBestMae
      this.lastTargetDr         = payload.targetDr
      this.lastHealthyDr        = payload.healthyDr
      this.lastRating           = payload.rating
    },

    setHealthSnapshot(snapshot: { trainingSamples: number; modelReady: boolean }): void {
      this.modelTrainingSamples = snapshot.trainingSamples
      this.modelReady           = snapshot.modelReady
    },

    acknowledgeRetrain(): void {
      this.retrainJustCompleted = false
    },
  },
})
