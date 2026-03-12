import { Server } from 'socket.io'
import type { Server as HttpServer } from 'http'

interface FieldPacket {
  timestamp: number
  activeFrequencyKHz: number
  activeFieldIntensityVcm: number
  activeMedium: string
}

export function setupSocketServer(httpServer: HttpServer): Server {
  const ALLOWED_ORIGINS: string[] | true = process.env.FRONTEND_URL
    ? [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173']
    : true

  const io = new Server(httpServer, {
    cors: {
      origin: ALLOWED_ORIGINS,
      methods: ['GET', 'POST'],
    },
  })

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`)

    socket.on('setFieldParams', (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return

      const { freqKHz, fieldVcm, medium } = raw as Record<string, unknown>

      const fKHz = Number(freqKHz)
      const fVcm = Number(fieldVcm)
      const med  = typeof medium === 'string' ? medium : 'saline'

      if (isNaN(fKHz) || fKHz < 10 || fKHz > 700) return
      if (isNaN(fVcm) || fVcm < 0  || fVcm > 1000) return

      const packet: FieldPacket = {
        timestamp: Date.now(),
        activeFrequencyKHz: Math.round(fKHz),
        activeFieldIntensityVcm: Math.round(fVcm),
        activeMedium: med,
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
