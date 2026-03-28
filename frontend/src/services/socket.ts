// Copyright © 2026 Tomer Preis. All rights reserved.
// Unauthorized copying or distribution is prohibited.

/**
 * Socket service - connects to the ResoPulse backend.
 * Falls back to local mode (state applied directly to Pinia stores) if the
 * backend is unreachable. All reactive getters remain fully functional either way.
 */
import { ref } from 'vue'
import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import { useCellStore } from '@/stores/cellStore'
import type { StatePacket } from '@/stores/cellStore'
import { useExperimentStore } from '@/stores/experimentStore'
import type { LogEntry } from '@/stores/experimentStore'
import { useImpedanceStore } from '@/stores/impedanceStore'
import type { HardwareImpedancePacket } from '@/stores/impedanceStore'
import { computeTau, computeSchwan, computePulseStepResponse } from '@/utils/physics'
import { SCHWAN_SPHERE_FACTOR, TWO_PI, MIN_PULSE_ENVELOPE } from '@/constants/physics'
import { useAiStore } from '@/stores/aiStore'

// Priority order for backend URL resolution:
//   1. ?backend=<url> query param  — set at runtime for ngrok demo sessions
//   2. VITE_BACKEND_URL env var    — baked in at Vercel build time
//   3. localhost:3001              — local development fallback
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
  AI_OPTIMIZE_REQUEST:  'aiOptimizeRequest',
  AI_OPTIMIZE_RESULT:   'aiOptimizeResult',
  CONNECT:              'connect',
  DISCONNECT:           'disconnect',
  CONNECT_ERROR:        'connect_error',
} as const

let socket: Socket | null = null

/** Reactive connection flag - import directly in Vue components/templates */
export const socketConnected = ref(false)

// Render free-tier instances sleep after 15 minutes of inactivity.
// A plain HTTP ping to /health wakes the container before the WebSocket
// handshake — otherwise the socket times out during the cold-start (~30 s).
async function wakeBackend(): Promise<void> {
  try {
    await fetch(`${BACKEND_URL}/health`, { signal: AbortSignal.timeout(35_000) })
  } catch {
    // unreachable — fall through to socket connect which will handle it gracefully
  }
}

export async function connectSocket(): Promise<void> {
  await wakeBackend()

  socket = io(BACKEND_URL, {
    transports: ['websocket'],
    timeout: 5000,
    reconnectionAttempts: 5,
  })

  socket.on(SOCKET_EVENTS.CONNECT, () => {
    socketConnected.value = true
    console.info('[Socket] Connected to ResoPulse backend')
  })

  socket.on(SOCKET_EVENTS.DISCONNECT, () => {
    socketConnected.value = false
  })

  // Another client changed experiment state - apply to local stores
  socket.on(SOCKET_EVENTS.STATE_UPDATE, (packet: StatePacket) => {
    const store    = useCellStore()
    const expStore = useExperimentStore()
    store.handleStatePacket(packet)
    if (packet.sessionName && expStore.sessionName !== packet.sessionName) {
      expStore.setSessionName(packet.sessionName)
    }
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

  socket.on(SOCKET_EVENTS.CONNECT_ERROR, () => {
    if (socketConnected.value) {
      socketConnected.value = false
      console.info('[Socket] Backend unavailable: running in local mode')
    }
  })
}

/**
 * Broadcast the full experiment state to all other connected clients.
 * Call this after any store mutation that should be visible to remote users.
 * In local mode this is a no-op - the store is already updated locally.
 */
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

/**
 * Broadcast a log entry (lysis / manual) to all other connected clients.
 * Call immediately after logReading() so remote users see the event.
 */
export function broadcastLogEntry(entry: LogEntry): void {
  if (!socket?.connected) return
  socket.emit(SOCKET_EVENTS.LOG_ENTRY, entry)
}

/**
 * Broadcast a rated outcome to all other connected clients.
 * Only call this when the user has aiConsentGiven = true — the server does not
 * check consent; that gate lives in the caller.
 *
 * Includes pre-computed cell biophysical features (τ, fc, radius) so the SQLite
 * training corpus carries enough context for the ML model to learn cell-type
 * specific patterns rather than just raw frequency/field correlations.
 */
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
    waveform:            entry.waveform ?? 'cw',
    dutyCycle:           entry.dutyCycle ?? 1,
    pulseWidthNs:        entry.pulseWidthNs ?? 100,
    orientationDeg:      entry.orientationDeg ?? 0,
    lysisNPulses:        entry.lysisNPulses ?? 1,
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

// ── AI Optimizer types (mirrored from backend/src/types/socket.ts) ──────────

export interface AiParamSuggestion {
  freqKHz:      number
  fieldVcm:     number
  dutyCycle:    number
  pulseWidthNs: number
  waveform:     'cw' | 'pulsed' | 'hfire'
}

export interface AiOptimizeResult {
  requestId:          string
  suggestion:         AiParamSuggestion | null
  predictedTargetDr:  number
  predictedHealthyDr: number
  predictedTi:        number
  confidenceScore:    number
  explanation:        string
  featureImportance:  Record<string, number>
  isPhysicsBaseline:  boolean
}

type AiResultCallback = (result: AiOptimizeResult) => void

// ── Physics baseline helpers (pure, no store dependency) ─────────────────────

/** Lysis-threshold field [V/cm] at a given frequency, accounting for pulse width. */
function lysisFieldAtFreq(
  radiusUm: number, memThicknessNm: number, dielectricConst: number,
  conductivitySi: number, thresholdV: number,
  freqKhz: number, sigmaE: number,
  waveform: string, pulseWidthNs: number,
): number {
  const tau   = computeTau(
    { radius: radiusUm, membraneThickness: memThicknessNm, dielectricConstant: dielectricConst, conductivity: conductivitySi } as Parameters<typeof computeTau>[0],
    sigmaE,
  )
  const pef   = (waveform === 'pulsed' || waveform === 'hfire') ? Math.max(MIN_PULSE_ENVELOPE, computePulseStepResponse(tau, pulseWidthNs)) : 1.0
  const omega = TWO_PI * freqKhz * 1e3
  const E_vm  = thresholdV * Math.sqrt(1 + (omega * tau) ** 2) /
                (SCHWAN_SPHERE_FACTOR * radiusUm * 1e-6 * pef)
  return Math.min(Math.max(E_vm / 100, 10), 100_000)   // V/m → V/cm, clamped
}

/**
 * Emit an AI optimisation request and register a one-time result callback.
 *
 * The frontend pre-computes all physics values (τ, fc, physics-optimal frequency,
 * physics baseline suggestion) so the Python service is pure ML — no Schwan
 * equations are reproduced in Python.
 *
 * The callback fires when the server responds with aiOptimizeResult for this
 * specific requestId, guarding against stale responses from previous requests.
 */
export function requestAiOptimization(requestId: string, onResult: AiResultCallback): void {
  if (!socket?.connected) return
  const store    = useCellStore()
  const expStore = useExperimentStore()

  const sigmaE      = store.effectiveSigmaE
  const waveform    = store.waveform
  const pulseWidthNs = store.pulseWidthNs
  const { khz: optFreqKhz, sel: selectivityAtOptimal } = store.optimalFreqResult

  const tauTargetS  = computeTau(store.target,  sigmaE)
  const tauHealthyS = computeTau(store.healthy, sigmaE)

  // Physics baseline: suggest field that brings DR_T to ~0.90 at optimal frequency
  const suggestedFieldVcm = lysisFieldAtFreq(
    store.target.radius, store.target.membraneThickness, store.target.dielectricConstant,
    store.target.conductivity, store.target.thresholdVoltage,
    optFreqKhz, sigmaE, waveform, pulseWidthNs,
  )

  // Predict DRs at the suggested parameters
  const isPulsedWaveform = waveform === 'pulsed' || waveform === 'hfire'
  const pefTarget  = isPulsedWaveform
    ? Math.max(MIN_PULSE_ENVELOPE, computePulseStepResponse(tauTargetS, pulseWidthNs))
    : 1.0
  const pefHealthy = isPulsedWaveform
    ? Math.max(MIN_PULSE_ENVELOPE, computePulseStepResponse(tauHealthyS, pulseWidthNs))
    : 1.0

  const vmTarget  = computeSchwan(store.target,  optFreqKhz, suggestedFieldVcm, sigmaE) * pefTarget
  const vmHealthy = computeSchwan(store.healthy, optFreqKhz, suggestedFieldVcm, sigmaE) * pefHealthy
  const predDrT   = vmTarget  / store.target.thresholdVoltage
  const predDrH   = vmHealthy / store.healthy.thresholdVoltage
  const predTi    = predDrH > 1e-6 ? predDrT / predDrH : predDrT

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
