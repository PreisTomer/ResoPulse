// Copyright © 2026 Tomer Preis. Licensed under the MIT License.
// @vitest-environment jsdom

import { describe, it, expect } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

import { useAiStore }   from '@/stores/aiStore'
import { useCellStore } from '@/stores/cellStore'
import type { AiOptimizeResult } from '@/services/socket'
import type { TrainingCompletePayload } from '@simbiotix/shared-types'

function freshStores() {
  setActivePinia(createPinia())
  return { ai: useAiStore(), cell: useCellStore() }
}

function makeResult(overrides: Partial<AiOptimizeResult> = {}): AiOptimizeResult {
  return {
    requestId:          'ai-1234-abc',
    suggestion:         { freqKHz: 2000, fieldVcm: 300, dutyCycle: 0.8, pulseWidthNs: 50, waveform: 'cw' },
    predictedTargetDr:  0.92,
    predictedHealthyDr: 0.35,
    predictedTi:        2.6,
    confidenceScore:    0.75,
    explanation:        'XGBoost prediction',
    featureImportance:  { targetTauNs: 0.4, sigmaE: 0.3 },
    isPhysicsBaseline:  false,
    ...overrides,
  }
}

// ── startRequest ──────────────────────────────────────────────────────────────

describe('startRequest', () => {
  it('sets isLoading, clears result, returns a unique requestId', () => {
    const { ai } = freshStores()
    const id1 = ai.startRequest()
    const id2 = ai.startRequest()
    expect(id1).not.toBe(id2)
    expect(ai.isLoading).toBe(true)
    expect(ai.result).toBeNull()
    expect(ai.pendingRequestId).toBe(id2)
  })
})

// ── receiveResult ─────────────────────────────────────────────────────────────

describe('receiveResult', () => {
  it('stores result and clears loading when requestId matches', () => {
    const { ai } = freshStores()
    const id = ai.startRequest()
    ai.receiveResult(makeResult({ requestId: id }))
    expect(ai.isLoading).toBe(false)
    expect(ai.result).not.toBeNull()
    expect(ai.pendingRequestId).toBeNull()
  })

  it('ignores a result whose requestId does not match (stale response)', () => {
    const { ai } = freshStores()
    ai.startRequest()
    ai.receiveResult(makeResult({ requestId: 'stale-id-xyz' }))
    expect(ai.isLoading).toBe(true)   // still loading
    expect(ai.result).toBeNull()
  })
})

// ── cancelRequest ─────────────────────────────────────────────────────────────

describe('cancelRequest', () => {
  it('clears loading and pending id without setting a result', () => {
    const { ai } = freshStores()
    ai.startRequest()
    ai.cancelRequest()
    expect(ai.isLoading).toBe(false)
    expect(ai.pendingRequestId).toBeNull()
    expect(ai.result).toBeNull()
  })
})

// ── clearResult ───────────────────────────────────────────────────────────────

describe('clearResult', () => {
  it('resets all state to initial', () => {
    const { ai } = freshStores()
    const id = ai.startRequest()
    ai.receiveResult(makeResult({ requestId: id }))
    ai.clearResult()
    expect(ai.result).toBeNull()
    expect(ai.isLoading).toBe(false)
    expect(ai.suggestionApplied).toBe(false)
  })
})

// ── getters ───────────────────────────────────────────────────────────────────

describe('getters', () => {
  it('hasResult is false initially', () => {
    const { ai } = freshStores()
    expect(ai.hasResult).toBe(false)
  })

  it('hasResult is true after receiving a valid result', () => {
    const { ai } = freshStores()
    const id = ai.startRequest()
    ai.receiveResult(makeResult({ requestId: id }))
    expect(ai.hasResult).toBe(true)
  })

  it('confidence returns 0 with no result', () => {
    const { ai } = freshStores()
    expect(ai.confidence).toBe(0)
  })

  it('isPhysicsBaseline is true with no result', () => {
    const { ai } = freshStores()
    expect(ai.isPhysicsBaseline).toBe(true)
  })

  it('isPhysicsBaseline reflects result.isPhysicsBaseline', () => {
    const { ai } = freshStores()
    const id = ai.startRequest()
    ai.receiveResult(makeResult({ requestId: id, isPhysicsBaseline: false }))
    expect(ai.isPhysicsBaseline).toBe(false)
  })

  it.each([
    [0.9,  'High'],
    [0.8,  'High'],
    [0.75, 'Medium'],
    [0.6,  'Medium'],
    [0.5,  'Low'],
    [0.4,  'Low'],
    [0.2,  'Physics'],
    [0.0,  'Physics'],
  ])('confidenceLabel for score %s is %s', (score, label) => {
    const { ai } = freshStores()
    const id = ai.startRequest()
    ai.receiveResult(makeResult({ requestId: id, confidenceScore: score }))
    expect(ai.confidenceLabel).toBe(label)
  })
})

// ── applySuggestion ───────────────────────────────────────────────────────────

describe('applySuggestion', () => {
  it('applies all 5 suggestion fields to cellStore', () => {
    const { ai, cell } = freshStores()
    const id = ai.startRequest()
    const suggestion = { freqKHz: 3000, fieldVcm: 500, dutyCycle: 0.9, pulseWidthNs: 75, waveform: 'pulsed' as const }
    ai.receiveResult(makeResult({ requestId: id, suggestion }))
    ai.applySuggestion()

    expect(cell.currentBroadcastFrequency).toBe(3000)
    expect(cell.fieldIntensity).toBe(500)
    expect(cell.dutyCycle).toBe(0.9)
    expect(cell.pulseWidthNs).toBe(75)
    expect(cell.waveform).toBe('pulsed')
    expect(ai.suggestionApplied).toBe(true)
  })

  it('is a no-op when result has no suggestion', () => {
    const { ai, cell } = freshStores()
    const freqBefore = cell.currentBroadcastFrequency
    const id = ai.startRequest()
    ai.receiveResult(makeResult({ requestId: id, suggestion: null }))
    ai.applySuggestion()
    expect(ai.suggestionApplied).toBe(false)
    expect(cell.currentBroadcastFrequency).toBe(freqBefore)
  })

  it('is a no-op when there is no result at all', () => {
    const { ai } = freshStores()
    ai.applySuggestion()   // must not throw
    expect(ai.suggestionApplied).toBe(false)
  })
})

// ── toggleImportance ──────────────────────────────────────────────────────────

describe('toggleImportance', () => {
  it('flips importanceExpanded on each call', () => {
    const { ai } = freshStores()
    expect(ai.importanceExpanded).toBe(false)
    ai.toggleImportance()
    expect(ai.importanceExpanded).toBe(true)
    ai.toggleImportance()
    expect(ai.importanceExpanded).toBe(false)
  })
})

// ── training snapshot + retrain broadcast ────────────────────────────────────

function makeTrainPayload(overrides: Partial<TrainingCompletePayload> = {}): TrainingCompletePayload {
  return {
    samplesUsed:       42,
    modelReady:        true,
    at:                '2026-04-22T12:00:00.000Z',
    modelVersion:      'v20260422-120000',
    promoted:          true,
    holdoutMaeOverall: 0.08,
    previousBestMae:   null,
    targetDr:          null,
    healthyDr:         null,
    rating:            null,
    ...overrides,
  }
}

describe('receiveTrainingComplete', () => {
  it('updates sample count, model-ready flag and timestamp from socket broadcast', () => {
    const { ai } = freshStores()
    ai.receiveTrainingComplete(makeTrainPayload({ samplesUsed: 42 }))
    expect(ai.modelTrainingSamples).toBe(42)
    expect(ai.modelReady).toBe(true)
    expect(ai.lastTrainingAt).toBe('2026-04-22T12:00:00.000Z')
    expect(ai.retrainJustCompleted).toBe(true)
  })

  it('acknowledgeRetrain clears the just-completed flag without resetting sample count', () => {
    const { ai } = freshStores()
    ai.receiveTrainingComplete(makeTrainPayload({ samplesUsed: 30 }))
    ai.acknowledgeRetrain()
    expect(ai.retrainJustCompleted).toBe(false)
    expect(ai.modelTrainingSamples).toBe(30)
  })

  it('stores enriched promotion metadata from the broadcast payload', () => {
    const { ai } = freshStores()
    ai.receiveTrainingComplete(makeTrainPayload({
      modelVersion:      'v20260422-120000',
      promoted:          true,
      holdoutMaeOverall: 0.08,
      previousBestMae:   0.12,
    }))
    expect(ai.lastModelVersion).toBe('v20260422-120000')
    expect(ai.lastPromoted).toBe(true)
    expect(ai.lastHoldoutMae).toBe(0.08)
    expect(ai.lastPreviousBestMae).toBe(0.12)
  })
})

describe('setHealthSnapshot', () => {
  it('stores trainingSamples and modelReady from /ai/health poll', () => {
    const { ai } = freshStores()
    ai.setHealthSnapshot({ trainingSamples: 15, modelReady: false })
    expect(ai.modelTrainingSamples).toBe(15)
    expect(ai.modelReady).toBe(false)
    expect(ai.retrainJustCompleted).toBe(false)   // health poll does NOT set the modal trigger
  })
})
