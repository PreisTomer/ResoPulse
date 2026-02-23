/**
 * Socket service — connects to the BioResonance backend.
 * Falls back to local mode (field params applied directly to the Pinia store) if
 * the backend is unreachable. The store's reactive getters keep the UI
 * fully functional in either mode.
 */
import { ref } from 'vue'
import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import { useCellStore } from '../stores/cellStore'
import type { FieldPacket } from '../stores/cellStore'
import type { MediumKey } from '../mockData'

// Set VITE_BACKEND_URL in Vercel environment variables once Railway is deployed.
// Falls back to localhost for local development.
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001'

let socket: Socket | null = null

/** Reactive connection flag — import directly in Vue components/templates */
export const socketConnected = ref(false)

export function connectSocket(): void {
  socket = io(BACKEND_URL, {
    transports: ['websocket'],
    timeout: 3000,
    reconnectionAttempts: 3,
  })

  socket.on('connect', () => {
    socketConnected.value = true
    console.info('[Socket] Connected to BioResonance backend')
  })

  socket.on('disconnect', () => {
    socketConnected.value = false
  })

  socket.on('resonanceUpdate', (packet: FieldPacket) => {
    const store = useCellStore()
    store.handleResonancePacket(packet)
  })

  socket.on('connect_error', () => {
    if (socketConnected.value) {
      socketConnected.value = false
      console.info('[Socket] Backend unavailable — running in local mode')
    }
  })
}

/**
 * Broadcast field parameters.
 * If connected: forwards to backend which echoes back a FieldPacket to all clients.
 * If in local mode: updates the store directly (no round-trip needed).
 */
export function broadcastFieldParams(freqKHz: number, fieldVcm: number, medium: MediumKey): void {
  if (socket?.connected) {
    socket.emit('setFieldParams', { freqKHz, fieldVcm, medium })
  } else {
    const store = useCellStore()
    store.setBroadcastFreqKHz(freqKHz)
    store.setFieldIntensity(fieldVcm)
    store.setMedium(medium)
  }
}

export function disconnectSocket(): void {
  socket?.disconnect()
  socket = null
}
