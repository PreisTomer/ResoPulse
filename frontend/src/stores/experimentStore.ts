import { defineStore } from 'pinia'
import type { LogEventType } from '@/constants/strings'

export interface LogEntry {
  id: number
  timestamp: string       // HH:mm:ss
  freqKHz: number
  fieldVcm: number
  medium: string
  targetPreset: string    // e.g. 'adenocarcinoma'
  healthyVm: number       // mV
  targetVm: number        // mV
  selectivity: number     // ratio
  healthyRatio: number    // fraction (0-n)
  targetRatio: number
  healthyTemp: number     // °C
  targetTemp: number
  event: LogEventType
}

interface ExperimentState {
  entries: LogEntry[]
  nextId: number
  sessionName: string
}

// Snapshot type pulled from cellStore — avoids circular import
interface CellSnapshot {
  currentBroadcastFrequency: number
  fieldIntensity: number
  medium: string
  target: { id: string }
  healthyVm: number
  targetVm: number
  selectivityRatio: number
  healthyDisruptionRatio: number
  targetDisruptionRatio: number
  healthyTemp: number
  targetTemp: number
}

function nowHMS(): string {
  return new Date().toLocaleTimeString('en-GB', { hour12: false })
}

/** Round a number to `decimals` significant decimal places, stripping trailing zeros. */
function round(value: number, decimals: number): number {
  return parseFloat(value.toFixed(decimals))
}

const LS_KEY = 'br-experiment'

function loadState(): ExperimentState {
  try {
    const saved = localStorage.getItem(LS_KEY)
    if (saved) return JSON.parse(saved) as ExperimentState
  } catch { /* ignore corrupt data */ }
  return { entries: [], nextId: 1, sessionName: 'Session 001' }
}

export const useExperimentStore = defineStore('experiment', {
  state: (): ExperimentState => loadState(),

  actions: {
    logReading(snap: CellSnapshot, event: LogEntry['event']) {
      this.entries.push({
        id: this.nextId++,
        timestamp: nowHMS(),
        freqKHz: snap.currentBroadcastFrequency,
        fieldVcm: snap.fieldIntensity,
        medium: snap.medium,
        targetPreset: snap.target.id,
        healthyVm:    round(snap.healthyVm * 1000,        3),
        targetVm:     round(snap.targetVm  * 1000,        3),
        selectivity:  round(snap.selectivityRatio,        3),
        healthyRatio: round(snap.healthyDisruptionRatio,  4),
        targetRatio:  round(snap.targetDisruptionRatio,   4),
        healthyTemp:  round(snap.healthyTemp,             1),
        targetTemp:   round(snap.targetTemp,              1),
        event,
      })
    },

    /** Receive a log entry broadcast from another client — append without re-broadcasting. */
    receiveEntry(entry: LogEntry) {
      // Avoid duplicates (same id already in log)
      if (this.entries.some(e => e.id === entry.id)) return
      this.entries.push(entry)
      this.nextId = Math.max(this.nextId, entry.id + 1)
    },

    setSessionName(name: string) {
      this.sessionName = name
    },

    clearLog() {
      this.entries = []
      this.nextId = 1
    },

    exportCSV() {
      const headers = [
        '#', 'Time', 'Session', 'Freq (kHz)', 'Field (V/cm)', 'Medium', 'Target',
        'H-Vm (mV)', 'T-Vm (mV)', 'Selectivity', 'H-Ratio', 'T-Ratio',
        'H-Temp (°C)', 'T-Temp (°C)', 'Event',
      ]
      const rows = this.entries.map((e) => [
        e.id, e.timestamp, this.sessionName, e.freqKHz, e.fieldVcm, e.medium, e.targetPreset,
        e.healthyVm, e.targetVm, e.selectivity,
        (e.healthyRatio * 100).toFixed(1) + '%', (e.targetRatio * 100).toFixed(1) + '%',
        e.healthyTemp, e.targetTemp, e.event,
      ])

      const csv = [headers, ...rows].map((row) => row.join(',')).join('\n')
      const blob = new Blob([csv], { type: 'text/csv' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${this.sessionName.replace(/\s+/g, '_')}_${Date.now()}.csv`
      a.click()
      URL.revokeObjectURL(url)
    },
  },
})
