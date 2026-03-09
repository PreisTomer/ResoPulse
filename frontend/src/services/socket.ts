/**
 * Socket service — connects to the BioResonance backend.
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

// Set VITE_BACKEND_URL in Vercel environment variables once Railway is deployed.
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001'

const SOCKET_EVENTS = {
  STATE_SYNC:    'stateSync',
  STATE_UPDATE:  'stateUpdate',
  LOG_ENTRY:     'logEntry',
  NEW_LOG_ENTRY: 'newLogEntry',
  CONNECT:       'connect',
  DISCONNECT:    'disconnect',
  CONNECT_ERROR: 'connect_error',
} as const

let socket: Socket | null = null

/** Reactive connection flag — import directly in Vue components/templates */
export const socketConnected = ref(false)

export function connectSocket(): void {
  socket = io(BACKEND_URL, {
    transports: ['websocket'],
    timeout: 3000,
    reconnectionAttempts: 3,
  })

  socket.on(SOCKET_EVENTS.CONNECT, () => {
    socketConnected.value = true
    console.info('[Socket] Connected to BioResonance backend')
  })

  socket.on(SOCKET_EVENTS.DISCONNECT, () => {
    socketConnected.value = false
  })

  // Another client changed experiment state — apply to local stores
  socket.on(SOCKET_EVENTS.STATE_UPDATE, (packet: StatePacket) => {
    const store    = useCellStore()
    const expStore = useExperimentStore()
    store.handleStatePacket(packet)
    if (packet.sessionName && expStore.sessionName !== packet.sessionName) {
      expStore.setSessionName(packet.sessionName)
    }
  })

  // Another client logged an entry — append locally without re-broadcasting
  socket.on(SOCKET_EVENTS.NEW_LOG_ENTRY, (entry: LogEntry) => {
    useExperimentStore().receiveEntry(entry)
  })

  socket.on(SOCKET_EVENTS.CONNECT_ERROR, () => {
    if (socketConnected.value) {
      socketConnected.value = false
      console.info('[Socket] Backend unavailable — running in local mode')
    }
  })
}

/**
 * Broadcast the full experiment state to all other connected clients.
 * Call this after any store mutation that should be visible to remote users.
 * In local mode this is a no-op — the store is already updated locally.
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
    safeMode:            store.safeMode,
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

export function disconnectSocket(): void {
  socket?.disconnect()
  socket = null
}
