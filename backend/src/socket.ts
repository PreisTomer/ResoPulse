import { Server } from 'socket.io'
import type { Server as HttpServer } from 'http'

interface ResonancePacket {
  timestamp: number
  activeFrequency: number
  cells: {
    healthy: { stress: number }
    target: { stress: number }
  }
}

// Lorentzian resonance: same formula as the frontend store
function calcStress(naturalFreq: number, tolerance: number, broadcastFreq: number): number {
  const delta = Math.abs(naturalFreq - broadcastFreq)
  return 1 / ((delta / tolerance) ** 2 + 1)
}

export function setupSocketServer(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
      methods: ['GET', 'POST'],
    },
  })

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`)

    socket.on('setFrequency', (rawFreq: unknown) => {
      const freq = Number(rawFreq)
      if (isNaN(freq) || freq < 0 || freq > 20000) return

      const packet: ResonancePacket = {
        timestamp: Date.now(),
        activeFrequency: Math.round(freq),
        cells: {
          healthy: { stress: calcStress(528, 10, freq) },
          target:  { stress: calcStress(417, 5,  freq) },
        },
      }

      // Broadcast to all connected clients so every tab/device stays in sync
      io.emit('resonanceUpdate', packet)
    })

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`)
    })
  })

  return io
}
