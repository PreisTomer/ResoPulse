/**
 * Socket service — connects to the BioResonance backend.
 * Falls back to local mode (frequency math computed in the Pinia store) if
 * the backend is unreachable.  The store's reactive getters keep the UI
 * fully functional in either mode.
 */
import { io } from 'socket.io-client'
import type { Socket } from 'socket.io-client'
import { useCellStore } from '../stores/cellStore'
import type { ResonancePacket } from '../stores/cellStore'

// Set VITE_BACKEND_URL in Vercel environment variables once Railway is deployed.
// Falls back to localhost for local development.
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:3001'

let socket: Socket | null = null
let localMode = false

export function connectSocket(): void {
  socket = io(BACKEND_URL, {
    transports: ['websocket'],
    timeout: 3000,
    reconnectionAttempts: 3,
  })

  socket.on('connect', () => {
    localMode = false
    console.info('[Socket] Connected to BioResonance backend')
  })

  socket.on('resonanceUpdate', (packet: ResonancePacket) => {
    const store = useCellStore()
    store.handleResonancePacket(packet)
  })

  socket.on('connect_error', () => {
    if (!localMode) {
      localMode = true
      console.info('[Socket] Backend unavailable — running in local mode')
    }
  })
}

/**
 * Broadcast a frequency.
 * If connected: forwards to the backend which echoes back a resonance packet.
 * If in local mode: updates the store directly (same math, no round-trip).
 */
export function broadcastFrequency(freq: number): void {
  if (socket?.connected) {
    socket.emit('setFrequency', freq)
  } else {
    const store = useCellStore()
    store.setBroadcastFrequency(freq)
  }
}

export function disconnectSocket(): void {
  socket?.disconnect()
  socket = null
}
