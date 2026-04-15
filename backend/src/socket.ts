// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
import { Server } from 'socket.io'
import type { Server as HttpServer } from 'http'
import { verifyToken } from '@clerk/express'
import type {
  StatePacket, LogEntry, HardwareImpedancePacket,
  OutcomeEntry, AiOptimizeRequest, AiOptimizeResult,
} from './types/socket'
import { insertOutcome } from './db'

// Domain constants
const MEDIUM = {
  SALINE: 'saline', BLOOD: 'blood', TISSUE: 'tissue', WATER: 'water',
  DMEM: 'dmem', PBS: 'pbs', RPMI: 'rpmi', MHB: 'mhb', EPBUFFER: 'epbuffer',
} as const

const WAVEFORM = {
  CW: 'cw', PULSED: 'pulsed', H_FIRE: 'hfire',
} as const

const CHART_MODE = {
  SCHWAN: 'schwan', RESONANCE: 'resonance',
} as const

const EVENT = {
  MANUAL: 'manual', LYSIS: 'lysis', OUTCOME: 'outcome',
} as const

const VALID_MEDIA    = new Set(Object.values(MEDIUM))
const VALID_WAVEFORM = new Set(Object.values(WAVEFORM))
const VALID_MODE     = new Set(Object.values(CHART_MODE))
const VALID_EVENT    = new Set(Object.values(EVENT))

const BOUNDS = {
  FREQ_MIN_KHZ:        10,
  FREQ_MAX_KHZ:        50_000_000,
  FIELD_MIN_VCM:       0,
  FIELD_MAX_VCM:       100_000,
  DC_MIN:              1e-6,
  DC_MAX:              1,
  PW_MIN_NS:           1,
  PW_MAX_NS:           100_000,
  ORI_MIN_DEG:         0,
  ORI_MAX_DEG:         90,
  PULSES_MIN:          1,
  PULSES_MAX:          1_000,
  PERF_MIN:            0,
  PERF_MAX:            10,
  PHI_MIN:             0,
  PHI_MAX:             0.9,
  SESSION_MAX_LEN:     80,
  REQUEST_ID_MAX_LEN:  64,
  TAU_MIN_NS:          0.01,
  TAU_MAX_NS:          1_000_000,
  FC_MIN_KHZ:          0.001,
  FC_MAX_KHZ:          50_000_000,
  RADIUS_MIN_UM:       0.001,
  RADIUS_MAX_UM:       100,
  RATING_MIN:          1,
  RATING_MAX:          5,
} as const

const IMPEDANCE_BOUNDS = {
  Z_MIN:     0.01,
  Z_MAX:     1e6,
  FREQ_MIN:  1,
  FREQ_MAX:  1e9,
  SIGMA_MIN: 0,
  SIGMA_MAX: 100,
} as const

const AI_RATE_LIMIT_PER_SESSION    = 10
const AI_SERVICE_TIMEOUT_MS        = 8_000
const AI_BASELINE_CONFIDENCE_SCORE = 0.5
const DEFAULT_ROOM                 = 'session:default'

const SOCKET_EVENTS = {
  STATE_SYNC:          'stateSync',
  STATE_UPDATE:        'stateUpdate',
  LOG_ENTRY:           'logEntry',
  NEW_LOG_ENTRY:       'newLogEntry',
  IMPEDANCE_READING:   'impedanceReading',
  IMPEDANCE_BROADCAST: 'impedanceBroadcast',
  LOG_OUTCOME:         'logOutcome',
  NEW_OUTCOME:         'newOutcome',
  AI_OPTIMIZE_REQUEST: 'aiOptimizeRequest',
  AI_OPTIMIZE_RESULT:  'aiOptimizeResult',
  DISCONNECT:          'disconnect',
} as const

// Session room state
const lastStateByRoom = new Map<string, StatePacket>()
const socketToRoom    = new Map<string, string>()
const aiRequestCounts = new Map<string, number>()

// AI service URL: set AI_SERVICE_URL env var to point at the Python FastAPI service.
const AI_SERVICE_URL = (process.env.AI_SERVICE_URL ?? 'http://localhost:8000').replace(/\/$/, '')

// Validation helpers
const inBounds = (v: number, min: number, max: number): boolean =>
  !isNaN(v) && v >= min && v <= max

const getString = (v: unknown, fallback: string): string =>
  typeof v === 'string' ? v : fallback

const getNum = (v: unknown, fallback: number): number => {
  const n = Number(v)
  return isNaN(n) ? fallback : n
}

// Validators
function validateStatePacket(raw: Record<string, unknown>): StatePacket | null {
  const fKHz = Number(raw.freqKHz), fVcm = Number(raw.fieldVcm)
  const dc   = Number(raw.dutyCycle), pw  = Number(raw.pulseWidthNs)
  const ori  = Number(raw.orientationDeg), np = Number(raw.lysisNPulses)
  const prf  = Number(raw.perfusionRate),  phi = Number(raw.cellPackingFraction)

  if (!inBounds(fKHz, BOUNDS.FREQ_MIN_KHZ,  BOUNDS.FREQ_MAX_KHZ))  return null
  if (!inBounds(fVcm, BOUNDS.FIELD_MIN_VCM, BOUNDS.FIELD_MAX_VCM)) return null
  if (!inBounds(dc,   BOUNDS.DC_MIN,        BOUNDS.DC_MAX))         return null
  if (!inBounds(pw,   BOUNDS.PW_MIN_NS,     BOUNDS.PW_MAX_NS))      return null
  if (!inBounds(ori,  BOUNDS.ORI_MIN_DEG,   BOUNDS.ORI_MAX_DEG))    return null
  if (!inBounds(np,   BOUNDS.PULSES_MIN,    BOUNDS.PULSES_MAX))     return null
  if (!inBounds(prf,  BOUNDS.PERF_MIN,      BOUNDS.PERF_MAX))       return null
  if (!inBounds(phi,  BOUNDS.PHI_MIN,       BOUNDS.PHI_MAX))        return null

  const med       = getString(raw.medium,         MEDIUM.SALINE)
  const waveform  = getString(raw.waveform,        WAVEFORM.CW)
  const mode      = getString(raw.chartMode,       CHART_MODE.SCHWAN)
  const targetId  = getString(raw.targetPresetId,  '')
  const healthyId = getString(raw.healthyPresetId, '')
  const session   = getString(raw.sessionName,     '').slice(0, BOUNDS.SESSION_MAX_LEN)

  if (!VALID_MEDIA.has(med as typeof MEDIUM[keyof typeof MEDIUM]))             return null
  if (!VALID_WAVEFORM.has(waveform as typeof WAVEFORM[keyof typeof WAVEFORM])) return null
  if (!VALID_MODE.has(mode as typeof CHART_MODE[keyof typeof CHART_MODE]))     return null

  return {
    freqKHz:             Math.round(fKHz),
    fieldVcm:            Math.round(fVcm),
    medium:              med,
    dutyCycle:           dc,
    pulseWidthNs:        Math.round(pw),
    waveform:            waveform as 'cw' | 'pulsed' | 'hfire',
    orientationDeg:      Math.round(ori),
    lysisNPulses:        Math.round(np),
    chartMode:           mode as 'schwan' | 'resonance',
    doubleShellEnabled:  !!raw.doubleShellEnabled,
    perfusionRate:       prf,
    cellPackingFraction: phi,
    targetPresetId:      targetId,
    healthyPresetId:     healthyId,
    sessionName:         session,
  }
}

function validateLogEntry(raw: Record<string, unknown>): LogEntry | null {
  if (typeof raw.timestamp !== 'string') return null
  const event = typeof raw.event === 'string' && VALID_EVENT.has(raw.event as typeof EVENT[keyof typeof EVENT])
    ? raw.event : EVENT.MANUAL
  return {
    id:           getNum(raw.id,           0),
    timestamp:    raw.timestamp,
    freqKHz:      getNum(raw.freqKHz,      0),
    fieldVcm:     getNum(raw.fieldVcm,     0),
    medium:       getString(raw.medium,    MEDIUM.SALINE),
    targetPreset: getString(raw.targetPreset, ''),
    healthyVm:    getNum(raw.healthyVm,    0),
    targetVm:     getNum(raw.targetVm,     0),
    selectivity:  getNum(raw.selectivity,  0),
    healthyRatio: getNum(raw.healthyRatio, 0),
    targetRatio:  getNum(raw.targetRatio,  0),
    healthyTemp:  getNum(raw.healthyTemp,  37),
    targetTemp:   getNum(raw.targetTemp,   37),
    event,
    sessionName: typeof raw.sessionName === 'string'
      ? raw.sessionName.slice(0, BOUNDS.SESSION_MAX_LEN)
      : undefined,
  }
}

function validateImpedancePacket(raw: Record<string, unknown>): HardwareImpedancePacket | null {
  const zReal  = Number(raw.zReal)
  const zImag  = Number(raw.zImag)
  const freqHz = Number(raw.freqHz)
  const ts     = Number(raw.timestamp)

  if (!inBounds(zReal,  IMPEDANCE_BOUNDS.Z_MIN,    IMPEDANCE_BOUNDS.Z_MAX))   return null
  if (isNaN(zImag))                                                             return null
  if (!inBounds(freqHz, IMPEDANCE_BOUNDS.FREQ_MIN, IMPEDANCE_BOUNDS.FREQ_MAX)) return null
  if (isNaN(ts) || ts <= 0)                                                     return null

  const result: HardwareImpedancePacket = { zReal, zImag, freqHz, timestamp: ts }
  const sigma = Number(raw.conductivity)
  if (!isNaN(sigma) && inBounds(sigma, IMPEDANCE_BOUNDS.SIGMA_MIN, IMPEDANCE_BOUNDS.SIGMA_MAX)) {
    result.conductivity = sigma
  }
  return result
}

function validateOutcomeEntry(raw: Record<string, unknown>): OutcomeEntry | null {
  const freqKHz        = Number(raw.freqKHz)
  const fieldVcm       = Number(raw.fieldVcm)
  const dutyCycle      = Number(raw.dutyCycle)
  const pulseWidthNs   = Number(raw.pulseWidthNs)
  const oriDeg         = Number(raw.orientationDeg)
  const nPulses        = Number(raw.lysisNPulses)
  const targetRatio    = Number(raw.targetRatio)
  const healthyRatio   = Number(raw.healthyRatio)
  const selectivity    = Number(raw.selectivity)
  const targetTemp     = Number(raw.targetTemp)
  const healthyTemp    = Number(raw.healthyTemp)
  const rating         = Number(raw.rating)
  const targetTauNs    = Number(raw.targetTauNs)
  const healthyTauNs   = Number(raw.healthyTauNs)
  const targetFcKhz    = Number(raw.targetFcKhz)
  const healthyFcKhz   = Number(raw.healthyFcKhz)
  const targetRadiusUm = Number(raw.targetRadiusUm)
  const sigmaE         = Number(raw.sigmaE)

  if (!inBounds(freqKHz,        BOUNDS.FREQ_MIN_KHZ,  BOUNDS.FREQ_MAX_KHZ))  return null
  if (!inBounds(fieldVcm,       BOUNDS.FIELD_MIN_VCM, BOUNDS.FIELD_MAX_VCM)) return null
  if (!inBounds(dutyCycle,      BOUNDS.DC_MIN,         BOUNDS.DC_MAX))        return null
  if (!inBounds(pulseWidthNs,   BOUNDS.PW_MIN_NS,      BOUNDS.PW_MAX_NS))     return null
  if (!inBounds(oriDeg,         BOUNDS.ORI_MIN_DEG,    BOUNDS.ORI_MAX_DEG))   return null
  if (!inBounds(nPulses,        BOUNDS.PULSES_MIN,     BOUNDS.PULSES_MAX))    return null
  if (isNaN(targetRatio) || isNaN(healthyRatio) || isNaN(selectivity))        return null
  if (isNaN(targetTemp)  || isNaN(healthyTemp))                                return null
  if (!inBounds(rating,         BOUNDS.RATING_MIN,     BOUNDS.RATING_MAX))    return null
  if (!inBounds(targetTauNs,    BOUNDS.TAU_MIN_NS,     BOUNDS.TAU_MAX_NS))    return null
  if (!inBounds(healthyTauNs,   BOUNDS.TAU_MIN_NS,     BOUNDS.TAU_MAX_NS))    return null
  if (!inBounds(targetFcKhz,    BOUNDS.FC_MIN_KHZ,     BOUNDS.FC_MAX_KHZ))   return null
  if (!inBounds(healthyFcKhz,   BOUNDS.FC_MIN_KHZ,     BOUNDS.FC_MAX_KHZ))   return null
  if (!inBounds(targetRadiusUm, BOUNDS.RADIUS_MIN_UM,  BOUNDS.RADIUS_MAX_UM)) return null
  if (isNaN(sigmaE) || sigmaE <= 0)                                            return null

  const med      = getString(raw.medium,       MEDIUM.SALINE)
  const waveform = getString(raw.waveform,     WAVEFORM.CW)
  const session  = getString(raw.sessionName,  '').slice(0, BOUNDS.SESSION_MAX_LEN)
  const preset   = getString(raw.targetPreset, '')

  if (!VALID_MEDIA.has(med as typeof MEDIUM[keyof typeof MEDIUM]))             return null
  if (!VALID_WAVEFORM.has(waveform as typeof WAVEFORM[keyof typeof WAVEFORM])) return null

  return {
    sessionName:         session,
    timestamp:           typeof raw.timestamp === 'string' ? raw.timestamp : new Date().toISOString(),
    freqKHz:             Math.round(freqKHz),
    fieldVcm:            Math.round(fieldVcm),
    medium:              med,
    targetPreset:        preset,
    waveform,
    dutyCycle,
    pulseWidthNs:        Math.round(pulseWidthNs),
    orientationDeg:      Math.round(oriDeg),
    lysisNPulses:        Math.round(nPulses),
    targetRatio,
    healthyRatio,
    selectivity,
    targetTemp,
    healthyTemp,
    rating:              Math.round(rating),
    aiSuggestionApplied: !!raw.aiSuggestionApplied,
    targetTauNs,
    healthyTauNs,
    targetFcKhz,
    healthyFcKhz,
    targetRadiusUm,
    sigmaE,
  }
}

function validateAiOptimizeRequest(raw: Record<string, unknown>): AiOptimizeRequest | null {
  if (typeof raw.requestId !== 'string' || raw.requestId.length === 0) return null
  if (!raw.sessionState    || typeof raw.sessionState    !== 'object') return null
  if (!raw.features        || typeof raw.features        !== 'object') return null
  if (!raw.physicsBaseline || typeof raw.physicsBaseline !== 'object') return null
  if (!raw.targetCell      || typeof raw.targetCell      !== 'object') return null
  if (!raw.healthyCell     || typeof raw.healthyCell     !== 'object') return null

  const state = validateStatePacket(raw.sessionState as Record<string, unknown>)
  if (!state) return null

  return {
    requestId:       raw.requestId.slice(0, BOUNDS.REQUEST_ID_MAX_LEN),
    sessionState:    state,
    features:        raw.features        as AiOptimizeRequest['features'],
    physicsBaseline: raw.physicsBaseline as AiOptimizeRequest['physicsBaseline'],
    targetCell:      raw.targetCell      as AiOptimizeRequest['targetCell'],
    healthyCell:     raw.healthyCell     as AiOptimizeRequest['healthyCell'],
  }
}

/**
 * Compute the room key for a given session.
 *
 * Rooms are always scoped to the team (org) or, for solo users, to the
 * individual user. This ensures that two different orgs — or two solo users —
 * who happen to use the same session name never share a room.
 *
 *   org members  → "org:{orgId}:session:{name}"
 *   solo users   → "user:{userId}:session:{name}"
 */
export function sessionRoom(name: string, orgId: string | null, userId: string): string {
  const safeName  = (name || 'default')
    .replace(/[^a-zA-Z0-9_\-.]/g, '_')
    .slice(0, BOUNDS.SESSION_MAX_LEN)
  const scopePrefix = orgId ? `org:${orgId}` : `user:${userId}`
  return `${scopePrefix}:session:${safeName}`
}

async function callPythonOptimizer(request: AiOptimizeRequest): Promise<AiOptimizeResult | null> {
  try {
    const response = await fetch(`${AI_SERVICE_URL}/ai/optimize`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(request),
      signal:  AbortSignal.timeout(AI_SERVICE_TIMEOUT_MS),
    })
    if (!response.ok) {
      console.warn(`[AI] Python service returned ${response.status}`)
      return null
    }
    return await response.json() as AiOptimizeResult
  } catch (err) {
    console.warn('[AI] Python service unavailable, using physics baseline:', (err as Error).message)
    return null
  }
}

export function setupSocketServer(httpServer: HttpServer): Server {
  const ALLOWED_ORIGINS: string[] | true = process.env.FRONTEND_URL
    ? [process.env.FRONTEND_URL, 'http://localhost:5173', 'http://127.0.0.1:5173']
    : true

  const io = new Server(httpServer, {
    cors: { origin: ALLOWED_ORIGINS, methods: ['GET', 'POST'] },
  })

  // Reject unauthenticated connections before any event handler runs.
  // In test mode the auth token may be a JSON-encoded identity stub so tests
  // can inject arbitrary userId/orgId without a real Clerk keypair.
  io.use(async (socket, next) => {
    const token = typeof socket.handshake.auth?.token === 'string'
      ? socket.handshake.auth.token
      : null

    if (!token) {
      next(new Error('Unauthorized'))
      return
    }

    if (process.env.NODE_ENV === 'test') {
      try {
        const stub = JSON.parse(token) as { userId: string; orgId?: string }
        if (typeof stub.userId !== 'string') throw new Error()
        socket.data.userId = stub.userId
        socket.data.orgId  = stub.orgId ?? null
        next()
        return
      } catch {
        next(new Error('Unauthorized'))
        return
      }
    }

    try {
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY ?? '',
      })
      socket.data.userId = payload.sub
      // org_id is present when the user's active session is org-scoped (Clerk standard claim).
      // Solo users (no active org) get undefined here — rooms fall back to user-scoped isolation.
      socket.data.orgId  = typeof payload.org_id === 'string' ? payload.org_id : null
      next()
    } catch {
      next(new Error('Unauthorized'))
    }
  })

  io.on('connection', (socket) => {
    // Start in the default room; moved to the correct session room on first stateSync.
    socket.join(DEFAULT_ROOM)
    socketToRoom.set(socket.id, DEFAULT_ROOM)
    console.log(`[Socket] Client connected: ${socket.id}`)

    socket.on(SOCKET_EVENTS.STATE_SYNC, (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return
      const packet = validateStatePacket(raw as Record<string, unknown>)
      if (!packet) return

      const targetRoom  = sessionRoom(packet.sessionName, socket.data.orgId as string | null, socket.data.userId as string)
      const currentRoom = socketToRoom.get(socket.id) ?? DEFAULT_ROOM

      if (targetRoom !== currentRoom) {
        socket.leave(currentRoom)
        socket.join(targetRoom)
        socketToRoom.set(socket.id, targetRoom)

        // Sync new joiner with the room's current state if peers are present.
        const roomPeers     = io.sockets.adapter.rooms.get(targetRoom)?.size ?? 0
        const roomLastState = lastStateByRoom.get(targetRoom)
        if (roomLastState && roomPeers > 1) {
          socket.emit(SOCKET_EVENTS.STATE_UPDATE, roomLastState)
        }
      }

      lastStateByRoom.set(targetRoom, packet)
      socket.to(targetRoom).emit(SOCKET_EVENTS.STATE_UPDATE, packet)
    })

    socket.on(SOCKET_EVENTS.LOG_ENTRY, (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return
      const entry = validateLogEntry(raw as Record<string, unknown>)
      if (!entry) return
      const room = socketToRoom.get(socket.id) ?? DEFAULT_ROOM
      socket.to(room).emit(SOCKET_EVENTS.NEW_LOG_ENTRY, entry)
    })

    socket.on(SOCKET_EVENTS.LOG_OUTCOME, async (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return
      const entry = validateOutcomeEntry(raw as Record<string, unknown>)
      if (!entry) return
      await insertOutcome(entry)
      const room = socketToRoom.get(socket.id) ?? DEFAULT_ROOM
      socket.to(room).emit(SOCKET_EVENTS.NEW_OUTCOME, entry)
    })

    socket.on(SOCKET_EVENTS.AI_OPTIMIZE_REQUEST, async (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return
      const request = validateAiOptimizeRequest(raw as Record<string, unknown>)
      if (!request) return

      const count = (aiRequestCounts.get(socket.id) ?? 0) + 1
      aiRequestCounts.set(socket.id, count)
      if (count > AI_RATE_LIMIT_PER_SESSION) {
        console.warn(`[AI] Rate limit exceeded for socket ${socket.id}`)
        const baseline = request.physicsBaseline
        socket.emit(SOCKET_EVENTS.AI_OPTIMIZE_RESULT, {
          requestId:          request.requestId,
          suggestion:         baseline.suggestion,
          predictedTargetDr:  baseline.predictedTargetDr,
          predictedHealthyDr: baseline.predictedHealthyDr,
          predictedTi:        baseline.predictedTi,
          confidenceScore:    AI_BASELINE_CONFIDENCE_SCORE,
          explanation:        'AI request limit reached for this session. Physics baseline applied.',
          featureImportance:  {},
          isPhysicsBaseline:  true,
        })
        return
      }

      const room     = socketToRoom.get(socket.id) ?? DEFAULT_ROOM
      const baseline = request.physicsBaseline
      const result   = await callPythonOptimizer(request)

      // Broadcast to all session room collaborators; fall back to physics baseline if ML unavailable.
      io.to(room).emit(SOCKET_EVENTS.AI_OPTIMIZE_RESULT, result ?? {
        requestId:          request.requestId,
        suggestion:         baseline.suggestion,
        predictedTargetDr:  baseline.predictedTargetDr,
        predictedHealthyDr: baseline.predictedHealthyDr,
        predictedTi:        baseline.predictedTi,
        confidenceScore:    AI_BASELINE_CONFIDENCE_SCORE,
        explanation:        'Physics baseline (Schwan model). AI service offline or not yet trained.',
        featureImportance:  {},
        isPhysicsBaseline:  true,
      })
    })

    // Instrument bridge readings are broadcast to all clients regardless of session.
    socket.on(SOCKET_EVENTS.IMPEDANCE_READING, (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return
      const packet = validateImpedancePacket(raw as Record<string, unknown>)
      if (!packet) return
      // Scope broadcast to the instrument's session room — never global.
      const currentRoom = socketToRoom.get(socket.id) ?? DEFAULT_ROOM
      socket.to(currentRoom).emit(SOCKET_EVENTS.IMPEDANCE_BROADCAST, packet)
    })

    socket.on(SOCKET_EVENTS.DISCONNECT, () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`)
      socketToRoom.delete(socket.id)
      aiRequestCounts.delete(socket.id)
    })
  })

  return io
}
