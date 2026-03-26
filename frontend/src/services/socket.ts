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
  STATE_SYNC:          'stateSync',
  STATE_UPDATE:        'stateUpdate',
  LOG_ENTRY:           'logEntry',
  NEW_LOG_ENTRY:       'newLogEntry',
  IMPEDANCE_BROADCAST: 'impedanceBroadcast',
  LOG_OUTCOME:         'logOutcome',
  NEW_OUTCOME:         'newOutcome',
  CONNECT:             'connect',
  DISCONNECT:          'disconnect',
  CONNECT_ERROR:       'connect_error',
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
 */
export function broadcastLogOutcome(entry: LogEntry, rating: number, aiSuggestionApplied: boolean): void {
  if (!socket?.connected) return
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
  })
}

export function disconnectSocket(): void {
  socket?.disconnect()
  socket = null
}
