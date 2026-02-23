import { defineStore } from 'pinia'

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
  event: 'manual' | 'lysis'
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

export const useExperimentStore = defineStore('experiment', {
  state: (): ExperimentState => ({
    entries: [],
    nextId: 1,
    sessionName: 'Session 001',
  }),

  actions: {
    logReading(snap: CellSnapshot, event: LogEntry['event']) {
      this.entries.push({
        id: this.nextId++,
        timestamp: nowHMS(),
        freqKHz: snap.currentBroadcastFrequency,
        fieldVcm: snap.fieldIntensity,
        medium: snap.medium,
        targetPreset: snap.target.id,
        healthyVm: parseFloat((snap.healthyVm * 1000).toFixed(3)),
        targetVm: parseFloat((snap.targetVm * 1000).toFixed(3)),
        selectivity: parseFloat(snap.selectivityRatio.toFixed(3)),
        healthyRatio: parseFloat(snap.healthyDisruptionRatio.toFixed(4)),
        targetRatio: parseFloat(snap.targetDisruptionRatio.toFixed(4)),
        healthyTemp: parseFloat(snap.healthyTemp.toFixed(1)),
        targetTemp: parseFloat(snap.targetTemp.toFixed(1)),
        event,
      })
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
