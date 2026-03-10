import { Server } from 'socket.io'
import type { Server as HttpServer } from 'http'
import type { StatePacket, LogEntry } from './types/socket'

// ── Domain constants ──────────────────────────────────────────────────────────
const MEDIUM = {
  SALINE: 'saline',
  BLOOD:  'blood',
  TISSUE: 'tissue',
  WATER:  'water',
} as const

const WAVEFORM = {
  CW:     'cw',
  PULSED: 'pulsed',
} as const

const CHART_MODE = {
  SCHWAN:    'schwan',
  RESONANCE: 'resonance',
} as const

const EVENT = {
  MANUAL: 'manual',
  LYSIS:  'lysis',
} as const

const VALID_MEDIA    = new Set(Object.values(MEDIUM))
const VALID_WAVEFORM = new Set(Object.values(WAVEFORM))
const VALID_MODE     = new Set(Object.values(CHART_MODE))
const VALID_EVENT    = new Set(Object.values(EVENT))

// ── Validation bounds ─────────────────────────────────────────────────────────
const BOUNDS = {
  FREQ_MIN_KHZ:  10,
  FREQ_MAX_KHZ:  50_000_000,   // 50 GHz ceiling
  FIELD_MIN_VCM: 0,
  FIELD_MAX_VCM: 100_000,      // 100 kV/cm ceiling
  DC_MIN:        1e-6,
  DC_MAX:        1,
  PW_MIN_NS:     1,
  PW_MAX_NS:     100_000,
  ORI_MIN_DEG:   0,
  ORI_MAX_DEG:   90,
  PULSES_MIN:    1,
  PULSES_MAX:    1_000,
  PERF_MIN:      0,
  PERF_MAX:      10,
  PHI_MIN:       0,
  PHI_MAX:       0.9,
  SESSION_MAX_LEN: 80,
} as const

// ── In-memory last known state ────────────────────────────────────────────────
let lastState: StatePacket | null = null

// ── Validation helpers ────────────────────────────────────────────────────────
const inBounds = (v: number, min: number, max: number): boolean =>
  !isNaN(v) && v >= min && v <= max

const getString = (v: unknown, fallback: string): string =>
  typeof v === 'string' ? v : fallback

const getNum = (v: unknown, fallback: number): number => {
  const n = Number(v)
  return isNaN(n) ? fallback : n
}

// ── Validators ────────────────────────────────────────────────────────────────
function validateStatePacket(raw: Record<string, unknown>): StatePacket | null {
  const fKHz = Number(raw.freqKHz),  fVcm = Number(raw.fieldVcm)
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

  const med      = getString(raw.medium,          MEDIUM.SALINE)
  const waveform = getString(raw.waveform,         WAVEFORM.CW)
  const mode     = getString(raw.chartMode,        CHART_MODE.SCHWAN)
  const targetId = getString(raw.targetPresetId,   '')
  const healthyId= getString(raw.healthyPresetId,  '')
  const session  = getString(raw.sessionName,      '').slice(0, BOUNDS.SESSION_MAX_LEN)

  if (!VALID_MEDIA.has(med as typeof MEDIUM[keyof typeof MEDIUM]))               return null
  if (!VALID_WAVEFORM.has(waveform as typeof WAVEFORM[keyof typeof WAVEFORM]))   return null
  if (!VALID_MODE.has(mode as typeof CHART_MODE[keyof typeof CHART_MODE]))       return null

  return {
    freqKHz:             Math.round(fKHz),
    fieldVcm:            Math.round(fVcm),
    medium:              med,
    dutyCycle:           dc,
    pulseWidthNs:        Math.round(pw),
    waveform:            waveform as 'cw' | 'pulsed',
    orientationDeg:      Math.round(ori),
    lysisNPulses:        Math.round(np),
    chartMode:           mode as 'schwan' | 'resonance',
    safeMode:            !!raw.safeMode,
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
  }
}

// ── Socket server ─────────────────────────────────────────────────────────────
const SOCKET_EVENTS = {
  STATE_SYNC:    'stateSync',
  STATE_UPDATE:  'stateUpdate',
  LOG_ENTRY:     'logEntry',
  NEW_LOG_ENTRY: 'newLogEntry',
  DISCONNECT:    'disconnect',
} as const

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

    // Send current session state to newly connecting client
    if (lastState) {
      socket.emit(SOCKET_EVENTS.STATE_UPDATE, lastState)
    }

    // Full state sync — broadcast to all OTHER clients
    socket.on(SOCKET_EVENTS.STATE_SYNC, (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return
      const packet = validateStatePacket(raw as Record<string, unknown>)
      if (!packet) return
      lastState = packet
      socket.broadcast.emit(SOCKET_EVENTS.STATE_UPDATE, packet)
    })

    // Log entry (lysis / manual) — broadcast to all OTHER clients
    socket.on(SOCKET_EVENTS.LOG_ENTRY, (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return
      const entry = validateLogEntry(raw as Record<string, unknown>)
      if (!entry) return
      socket.broadcast.emit(SOCKET_EVENTS.NEW_LOG_ENTRY, entry)
    })

    socket.on(SOCKET_EVENTS.DISCONNECT, () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`)
    })
  })

  return io
}
