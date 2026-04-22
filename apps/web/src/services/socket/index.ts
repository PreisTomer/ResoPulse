// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// Socket service — connects to ResoPulse backend. Falls back to local store state when unreachable.
import { ref } from 'vue'

import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'

import type {
  StatePacket,
  HardwareImpedancePacket,
  AiParamSuggestion,
  AiOptimizeResult,
  MeasuredOutcome,
  MeasuredOutcomeEntry,
} from '@resopulse/shared-types'

import { useCellStore } from '@/stores/cellStore'
import { useExperimentStore } from '@/stores/experimentStore'
import type { LogEntry } from '@/stores/experimentStore'
import { useImpedanceStore } from '@/stores/impedanceStore'
import { useAiStore } from '@/stores/aiStore'

import { computeTau, computeSchwan, pulseEnvelopeClamped, computeResonantDisruption, computeLysisFieldFromParams, tempCorrectedVth } from '@/utils/physics'

import { DEFAULT_CAPSID_Q, THRESHOLDS } from '@/constants/physics'
import { STORAGE_KEY } from '@/constants/storageKeys'

// URL priority: ?backend=<url> → VITE_BACKEND_URL → localhost:3001
function resolveBackendUrl(): string {
  const params = new URLSearchParams(window.location.search)
  const fromQuery = params.get('backend')
  if (fromQuery) return fromQuery.replace(/\/$/, '')
  return import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001'
}

const BACKEND_URL = resolveBackendUrl()

const SOCKET_EVENTS = {
  STATE_SYNC:           'stateSync',
  STATE_UPDATE:         'stateUpdate',
  LOG_ENTRY:            'logEntry',
  NEW_LOG_ENTRY:        'newLogEntry',
  IMPEDANCE_BROADCAST:  'impedanceBroadcast',
  LOG_OUTCOME:          'logOutcome',
  NEW_OUTCOME:          'newOutcome',
  LOG_MEASURED_OUTCOME: 'logMeasuredOutcome',
  NEW_MEASURED_OUTCOME: 'newMeasuredOutcome',
  AI_OPTIMIZE_REQUEST:  'aiOptimizeRequest',
  AI_OPTIMIZE_RESULT:   'aiOptimizeResult',
  CONNECT:              'connect',
  DISCONNECT:           'disconnect',
  CONNECT_ERROR:        'connect_error',
} as const

let socket: Socket | null = null

export const socketConnected = ref(false)

// Render free-tier containers sleep after 15 min. HTTP ping wakes them before socket connect (~30s cold start).
async function wakeBackend(): Promise<void> {
  try {
    await fetch(`${BACKEND_URL}/health`, { signal: AbortSignal.timeout(35_000) })
  } catch { /* fall through to socket connect */ }
}

// Guest session: browser-generated `guest_*` token in sessionStorage (tab-scoped); backend accepts it without Clerk.

/**
 * Reactive flag: true once a guest session token exists for this tab.
 * Initialised from sessionStorage so it survives a page refresh on /experiment.
 * Components that gate guest-only UI (e.g. NavGuestArea) should read this ref.
 */
export const guestSessionActive = ref(sessionStorage.getItem(STORAGE_KEY.GUEST_ID) !== null)

function getOrCreateGuestToken(): string {
  const existing = sessionStorage.getItem(STORAGE_KEY.GUEST_ID)
  if (existing) {
    guestSessionActive.value = true
    return existing
  }
  const id = `guest_${crypto.randomUUID()}`
  sessionStorage.setItem(STORAGE_KEY.GUEST_ID, id)
  guestSessionActive.value = true
  return id
}

/** Returns true if the current session has an active guest token in sessionStorage. */
export function hasGuestSession(): boolean {
  return sessionStorage.getItem(STORAGE_KEY.GUEST_ID) !== null
}

export async function connectSocket(): Promise<void> {
  await wakeBackend()

  // Auth callback fires on every (re)connect so Clerk token is fresh; falls back to guest token for unauth users.
  socket = io(BACKEND_URL, {
    transports:           ['websocket'],
    timeout:              5000,
    reconnectionAttempts: 5,
    auth: (cb: (data: { token: string }) => void) => {
      if (!window.Clerk?.session) {
        cb({ token: getOrCreateGuestToken() })
        return
      }
      window.Clerk.session.getToken()
        .then(token  => cb({ token: token ?? getOrCreateGuestToken() }))
        .catch(()    => cb({ token: getOrCreateGuestToken() }))
    },
  })

  socket.on(SOCKET_EVENTS.CONNECT, () => {
    socketConnected.value = true
    console.info('[Socket] Connected to ResoPulse backend')
  })

  socket.on(SOCKET_EVENTS.DISCONNECT, () => {
    socketConnected.value = false
  })

  // Another client changed experiment state — handleStatePacket applies all fields
  // including sessionName (delegated internally to experimentStore)
  socket.on(SOCKET_EVENTS.STATE_UPDATE, (packet: StatePacket) => {
    useCellStore().handleStatePacket(packet)
  })

  // Another client logged an entry - append locally without re-broadcasting
  socket.on(SOCKET_EVENTS.NEW_LOG_ENTRY, (entry: LogEntry) => {
    useExperimentStore().receiveEntry(entry)
  })

  // Hardware impedance reading from lab instrument bridge
  socket.on(SOCKET_EVENTS.IMPEDANCE_BROADCAST, (packet: HardwareImpedancePacket) => {
    useImpedanceStore().handleHardwareImpedancePacket(packet)
  })

  // AI optimizer result — received by all clients in the room; aiStore filters by requestId
  socket.on(SOCKET_EVENTS.AI_OPTIMIZE_RESULT, (result: AiOptimizeResult) => {
    useAiStore().receiveResult(result)
  })

  // Peer attached measured outcomes to a prior entry — apply locally without rebroadcast.
  socket.on(SOCKET_EVENTS.NEW_MEASURED_OUTCOME, (entry: MeasuredOutcomeEntry) => {
    useExperimentStore().receiveMeasuredOutcome(entry.sessionName, entry.timestamp, entry.measured)
  })

  socket.on(SOCKET_EVENTS.CONNECT_ERROR, () => {
    if (socketConnected.value) {
      socketConnected.value = false
      console.info('[Socket] Backend unavailable: running in local mode')
    }
  })
}

export function broadcastStateSync(): void {
  if (!socket?.connected) return
  const store    = useCellStore()
  const expStore = useExperimentStore()
  const packet: StatePacket = {
    freqKHz:             store.currentBroadcastFrequency,
    fieldVcm:            store.fieldIntensity,
    medium:              store.medium,
    dutyCycle:           store.dutyCycle,
    pulseWidthNs:        store.pulseWidthNs,
    waveform:            store.waveform,
    orientationDeg:      store.orientationDeg,
    lysisNPulses:        store.lysisNPulses,
    chartMode:           store.chartMode,
    doubleShellEnabled:  store.doubleShellEnabled,
    perfusionRate:       store.perfusionRate,
    cellPackingFraction: store.cellPackingFraction,
    targetPresetId:      store.target.id,
    healthyPresetId:     store.healthy.id,
    sessionName:         expStore.sessionName,
  }
  socket.emit(SOCKET_EVENTS.STATE_SYNC, packet)
}

export function broadcastLogEntry(entry: LogEntry): void {
  if (!socket?.connected) return
  socket.emit(SOCKET_EVENTS.LOG_ENTRY, entry)
}

// Broadcast rated outcome — caller must verify aiConsentGiven before calling.
export function broadcastLogOutcome(entry: LogEntry, rating: number, aiSuggestionApplied: boolean): void {
  if (!socket?.connected) return
  const store   = useCellStore()
  const sigmaE  = store.effectiveSigmaE
  const tauTargetS  = computeTau(store.target,  sigmaE)
  const tauHealthyS = computeTau(store.healthy, sigmaE)

  socket.emit(SOCKET_EVENTS.LOG_OUTCOME, {
    sessionName:         entry.sessionName ?? '',
    timestamp:           entry.timestamp,
    freqKHz:             entry.freqKHz,
    fieldVcm:            entry.fieldVcm,
    medium:              entry.medium,
    targetPreset:        entry.targetPreset,
    waveform:            entry.waveform       ?? store.waveform,
    dutyCycle:           entry.dutyCycle      ?? store.dutyCycle,
    pulseWidthNs:        entry.pulseWidthNs   ?? store.pulseWidthNs,
    orientationDeg:      entry.orientationDeg ?? store.orientationDeg,
    lysisNPulses:        entry.lysisNPulses   ?? store.lysisNPulses,
    targetRatio:         entry.targetRatio,
    healthyRatio:        entry.healthyRatio,
    selectivity:         entry.selectivity,
    targetTemp:          entry.targetTemp,
    healthyTemp:         entry.healthyTemp,
    rating,
    aiSuggestionApplied,
    targetTauNs:         tauTargetS  * 1e9,
    healthyTauNs:        tauHealthyS * 1e9,
    targetFcKhz:         store.targetFc,
    healthyFcKhz:        store.healthyFc,
    targetRadiusUm:      store.target.radius,
    sigmaE,
  })
}

// Broadcast measured-outcome patch for a prior entry. Caller must verify aiConsentGiven.
// Matched on (sessionName, timestamp) — no stable id crosses sessions.
export function broadcastLogMeasuredOutcome(sessionName: string, timestamp: string, measured: MeasuredOutcome): void {
  if (!socket?.connected) return
  socket.emit(SOCKET_EVENTS.LOG_MEASURED_OUTCOME, { sessionName, timestamp, measured })
}

// AI Optimizer wire types live in @resopulse/shared-types — re-exported for callers.
export type { AiParamSuggestion, AiOptimizeResult }

type AiResultCallback = (result: AiOptimizeResult) => void


// Emit AI optimisation request. Frontend pre-computes all physics; Python service is pure ML.
export function requestAiOptimization(requestId: string, onResult: AiResultCallback): void {
  if (!socket?.connected) return
  const store    = useCellStore()
  const expStore = useExperimentStore()

  const sigmaE       = store.effectiveSigmaE
  const cosT         = store.cosThetaFactor
  const waveform     = store.waveform
  const pulseWidthNs = store.pulseWidthNs
  const hfireMult    = store.hFireMultiplier
  const { khz: optFreqKhz, sel: selectivityAtOptimal } = store.optimalFreqResult

  const tauTargetS  = computeTau(store.target,  sigmaE)
  const tauHealthyS = computeTau(store.healthy, sigmaE)

  const isPulsedWaveform   = waveform === 'pulsed' || waveform === 'hfire'
  const pefHealthy         = pulseEnvelopeClamped(tauHealthyS, pulseWidthNs, isPulsedWaveform)
  const isResonanceTarget  = store.isResonanceTarget

  // Physics baseline: suggest field that brings DR_T ≈ 0.9 at the optimal frequency.
  let suggestedFieldVcm: number
  let predDrT: number

  if (isResonanceTarget) {
    const tr = store.target as { resonantFreqGHz: number; capsidQ?: number; resonantThresholdVcm: number; resonantFreqGHz2?: number; capsidQ2?: number; resonantMode2Amplitude?: number }
    // hfireMult does NOT apply to acoustic resonance — mechanical disruption, not EP membrane charging.
    const tVthEff = tempCorrectedVth(tr.resonantThresholdVcm, store.targetTemp)
    // At exact resonance the Lorentzian lineshape = 1, so DR = E / tVthEff.
    suggestedFieldVcm = 0.9 * tVthEff
    predDrT = computeResonantDisruption(tr.resonantFreqGHz, tr.capsidQ ?? DEFAULT_CAPSID_Q, tVthEff, optFreqKhz * 1e3, suggestedFieldVcm, tr.resonantFreqGHz2, tr.capsidQ2, tr.resonantMode2Amplitude)
  } else {
    // Schwan path: invert the equation to find the lysis field, then predict DR.
    suggestedFieldVcm = computeLysisFieldFromParams(
      store.target.radius, store.target.membraneThickness, store.target.dielectricConstant,
      store.target.conductivity, tempCorrectedVth(store.target.thresholdVoltage, store.targetTemp, store.effectivePulseCount),
      optFreqKhz, sigmaE, waveform, pulseWidthNs, cosT, hfireMult,
    )
    const pefTarget = pulseEnvelopeClamped(tauTargetS, pulseWidthNs, isPulsedWaveform)
    const vmTarget = computeSchwan(store.target, optFreqKhz, suggestedFieldVcm, sigmaE, cosT) * pefTarget
    predDrT = vmTarget / (tempCorrectedVth(store.target.thresholdVoltage, store.targetTemp, store.effectivePulseCount) * hfireMult)
  }

  const vmHealthy = computeSchwan(store.healthy, optFreqKhz, suggestedFieldVcm, sigmaE, cosT) * pefHealthy
  const predDrH   = vmHealthy / (tempCorrectedVth(store.healthy.thresholdVoltage, store.healthyTemp, store.effectivePulseCount) * hfireMult)
  const predTi    = predDrH > 1e-6 ? Math.min(THRESHOLDS.TI_DISPLAY_CAP, predDrT / predDrH) : THRESHOLDS.TI_DISPLAY_CAP

  const sessionState: StatePacket = {
    freqKHz:             store.currentBroadcastFrequency,
    fieldVcm:            store.fieldIntensity,
    medium:              store.medium,
    dutyCycle:           store.dutyCycle,
    pulseWidthNs,
    waveform,
    orientationDeg:      store.orientationDeg,
    lysisNPulses:        store.lysisNPulses,
    chartMode:           store.chartMode,
    doubleShellEnabled:  store.doubleShellEnabled,
    perfusionRate:       store.perfusionRate,
    cellPackingFraction: store.cellPackingFraction,
    targetPresetId:      store.target.id,
    healthyPresetId:     store.healthy.id,
    sessionName:         expStore.sessionName,
  }

  const payload = {
    requestId,
    sessionState,
    healthyCell: {
      id:              store.healthy.id,
      label:           store.healthy.label,
      radiusUm:        store.healthy.radius,
      memThicknessNm:  store.healthy.membraneThickness,
      dielectricConst: store.healthy.dielectricConstant,
      conductivitySi:  store.healthy.conductivity,
      thresholdV:      store.healthy.thresholdVoltage,
    },
    targetCell: {
      id:               store.target.id,
      label:            store.target.label,
      radiusUm:         store.target.radius,
      memThicknessNm:   store.target.membraneThickness,
      dielectricConst:  store.target.dielectricConstant,
      conductivitySi:   store.target.conductivity,
      thresholdV:       store.target.thresholdVoltage,
      resonantFreqGhz:  (store.target as { resonantFreqGHz?: number }).resonantFreqGHz,
      capsidQ:          (store.target as { capsidQ?: number }).capsidQ,
    },
    features: {
      targetTauNs:          tauTargetS  * 1e9,
      healthyTauNs:         tauHealthyS * 1e9,
      targetFcKhz:          store.targetFc,
      healthyFcKhz:         store.healthyFc,
      sigmaE,
      optimalFreqKhz:       optFreqKhz,
      selectivityAtOptimal,
    },
    physicsBaseline: {
      suggestion: {
        freqKHz:      Math.round(optFreqKhz),
        fieldVcm:     Math.round(suggestedFieldVcm),
        dutyCycle:    store.dutyCycle,
        pulseWidthNs: Math.round(pulseWidthNs),
        waveform,
      },
      predictedTargetDr:  Math.round(predDrT  * 1000) / 1000,
      predictedHealthyDr: Math.round(predDrH  * 1000) / 1000,
      predictedTi:        Math.round(predTi   * 1000) / 1000,
    },
  }

  // One-time listener scoped to this requestId — ignores stale server responses
  const handler = (result: AiOptimizeResult) => {
    if (result.requestId !== requestId) return
    socket!.off(SOCKET_EVENTS.AI_OPTIMIZE_RESULT, handler)
    onResult(result)
  }
  socket.on(SOCKET_EVENTS.AI_OPTIMIZE_RESULT, handler)
  socket.emit(SOCKET_EVENTS.AI_OPTIMIZE_REQUEST, payload)
}

export function disconnectSocket(): void {
  socket?.disconnect()
  socket = null
}
