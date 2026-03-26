// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { defineStore } from 'pinia'
import { useCellStore } from '@/stores/cellStore'
import { CHART_MODE, DEFAULT_SESSION_NAME } from '@/constants/strings'
import { downloadText, buildEntryMethodsText, buildCsvText } from '@/utils/experimentExport'

// Re-export types so existing importers (e.g. socket.ts) don't need to change
export type { CellParamSnapshot, LogEntry } from '@/types/experiment'
import type { CellParamSnapshot, LogEntry } from '@/types/experiment'

// ── Internal state types ───────────────────────────────────────────────────

interface ExperimentState {
  entries: LogEntry[]
  nextId: number
  sessionName: string
  sampleDescription: string   // e.g. "HepG2 passage 12, 80% confluency, PBS buffer"
  sessionNotes: string        // free-form lab notes baked into exports
  cumulativeDoseJkg: number   // J/kg, cumulative specific energy absorbed this session
  sessionStartMs: number      // Unix ms, when the current session started
  /** User opted in to anonymized outcome logging for AI protocol training */
  aiConsentGiven: boolean
}

// Extended snapshot pulled from cellStore - avoids circular import
interface CellSnapshot {
  currentBroadcastFrequency: number
  fieldIntensity: number
  medium: string
  chartMode: 'schwan' | 'resonance'
  waveform: string
  dutyCycle: number
  pulseWidthNs: number
  lysisNPulses: number
  orientationDeg: number
  doubleShellEnabled: boolean
  effectiveSigmaE: number
  healthyFc: number
  targetFc: number
  targetCellCategory: 'mammalian' | 'bacteria' | 'virus'
  healthyVm: number
  targetVm: number
  selectivityRatio: number
  healthyDisruptionRatio: number
  targetDisruptionRatio: number
  healthyTemp: number
  targetTemp: number
  healthyNuclearVm: number
  targetNuclearVm: number
  depHealthyCmReal: number
  depTargetCmReal: number
  depHealthyCrossoverKHz: number
  depTargetCrossoverKHz: number
  healthy: {
    label: string; radius: number; membraneThickness: number
    dielectricConstant: number; conductivity: number; thresholdVoltage: number
    nuclearRadius?: number; nuclearMembraneThickness?: number
    nuclearMembraneEps?: number; nucleoplasmConductivity?: number
  }
  target: {
    id: string; label: string; radius: number; membraneThickness: number
    dielectricConstant: number; conductivity: number; thresholdVoltage: number
    nuclearRadius?: number; nuclearMembraneThickness?: number
    nuclearMembraneEps?: number; nucleoplasmConductivity?: number
    resonantFreqGHz?: number; capsidQ?: number; capsidQMin?: number
    capsidQMax?: number; resonantThresholdVcm?: number
    resonantFreqUncertaintyPct?: number; experimentalBasis?: string
  }
}

// ── Local helpers ──────────────────────────────────────────────────────────

function nowHMS(): string {
  const d    = new Date()
  const date = d.toISOString().slice(0, 10)
  const time = d.toLocaleTimeString('en-GB', { hour12: false })
  return `${date} ${time}`
}

function round(value: number, decimals: number): number {
  return parseFloat(value.toFixed(decimals))
}

const LS_KEY = 'br-experiment'

function loadState(): ExperimentState {
  try {
    const saved = localStorage.getItem(LS_KEY)
    if (saved) {
      const parsed = JSON.parse(saved) as ExperimentState
      return {
        ...parsed,
        sampleDescription: parsed.sampleDescription ?? '',
        sessionNotes:      parsed.sessionNotes      ?? '',
        cumulativeDoseJkg: parsed.cumulativeDoseJkg ?? 0,
        sessionStartMs:    parsed.sessionStartMs    ?? Date.now(),
        aiConsentGiven:    parsed.aiConsentGiven    ?? false,
      }
    }
  } catch { /* ignore corrupt data */ }
  return {
    entries: [], nextId: 1, sessionName: DEFAULT_SESSION_NAME,
    sampleDescription: '', sessionNotes: '', cumulativeDoseJkg: 0,
    sessionStartMs: Date.now(), aiConsentGiven: false,
  }
}

// ── Store ──────────────────────────────────────────────────────────────────

export const useExperimentStore = defineStore('experiment', {
  state: (): ExperimentState => loadState(),

  actions: {
    logReading(snap: CellSnapshot, event: LogEntry['event']) {
      const h = snap.healthy
      const t = snap.target
      this.entries.push({
        id:           this.nextId++,
        sessionName:  this.sessionName,
        timestamp:    nowHMS(),
        freqKHz:      snap.currentBroadcastFrequency,
        fieldVcm:     snap.fieldIntensity,
        medium:       snap.medium,
        targetPreset: t.id,
        healthyVm:    round(snap.healthyVm * 1000,        3),
        targetVm:     round(snap.targetVm  * 1000,        3),
        selectivity:  round(snap.selectivityRatio,        3),
        healthyRatio: round(snap.healthyDisruptionRatio,  4),
        targetRatio:  round(snap.targetDisruptionRatio,   4),
        healthyTemp:  round(snap.healthyTemp,             1),
        targetTemp:   round(snap.targetTemp,              1),
        event,
        chartMode:          snap.chartMode,
        waveform:           snap.waveform,
        dutyCycle:          snap.dutyCycle,
        pulseWidthNs:       snap.pulseWidthNs,
        lysisNPulses:       snap.lysisNPulses,
        orientationDeg:     snap.orientationDeg,
        doubleShellEnabled: snap.doubleShellEnabled,
        sigmaE:             round(snap.effectiveSigmaE, 4),
        healthyNuclearVm:   round(snap.healthyNuclearVm * 1000, 3),
        targetNuclearVm:    round(snap.targetNuclearVm  * 1000, 3),
        depHealthyK:            snap.chartMode !== CHART_MODE.RESONANCE ? round(snap.depHealthyCmReal, 4) : undefined,
        depTargetK:             snap.chartMode !== CHART_MODE.RESONANCE ? round(snap.depTargetCmReal,  4) : undefined,
        depHealthyCrossoverKHz: snap.chartMode !== CHART_MODE.RESONANCE ? round(snap.depHealthyCrossoverKHz, 1) : undefined,
        depTargetCrossoverKHz:  snap.chartMode !== CHART_MODE.RESONANCE ? round(snap.depTargetCrossoverKHz,  1) : undefined,
        healthySnap: {
          label: h.label, category: 'mammalian',
          radius: h.radius, membraneThickness: h.membraneThickness,
          dielectricConstant: h.dielectricConstant, conductivity: h.conductivity,
          thresholdVoltage: h.thresholdVoltage, fc: snap.healthyFc,
          nuclearRadius: h.nuclearRadius, nuclearMembraneThickness: h.nuclearMembraneThickness,
          nuclearMembraneEps: h.nuclearMembraneEps, nucleoplasmConductivity: h.nucleoplasmConductivity,
        } satisfies CellParamSnapshot,
        targetSnap: {
          label: t.label, category: snap.targetCellCategory,
          radius: t.radius, membraneThickness: t.membraneThickness,
          dielectricConstant: t.dielectricConstant, conductivity: t.conductivity,
          thresholdVoltage: t.thresholdVoltage, fc: snap.targetFc,
          nuclearRadius: t.nuclearRadius, nuclearMembraneThickness: t.nuclearMembraneThickness,
          nuclearMembraneEps: t.nuclearMembraneEps, nucleoplasmConductivity: t.nucleoplasmConductivity,
          resonantFreqGHz: t.resonantFreqGHz, capsidQ: t.capsidQ,
          capsidQMin: t.capsidQMin, capsidQMax: t.capsidQMax,
          resonantThresholdVcm: t.resonantThresholdVcm,
          resonantFreqUncertaintyPct: t.resonantFreqUncertaintyPct,
          experimentalBasis: t.experimentalBasis,
        } satisfies CellParamSnapshot,
      })
    },

    /** Receive a log entry broadcast from another client - append without re-broadcasting. */
    receiveEntry(entry: LogEntry) {
      if (this.entries.some(e => e.id === entry.id)) return
      this.entries.push(entry)
      this.nextId = Math.max(this.nextId, entry.id + 1)
    },

    setSessionName(name: string)          { this.sessionName        = name  },
    setSampleDescription(desc: string)    { this.sampleDescription  = desc  },
    setSessionNotes(notes: string)        { this.sessionNotes        = notes },
    setAiConsent(value: boolean)          { this.aiConsentGiven     = value },

    /**
     * Attach a user outcome rating to an existing log entry.
     * @param entryId - id of the LogEntry to rate
     * @param rating - 1 (failed) to 5 (excellent)
     * @param aiSuggestionApplied - whether this protocol came from the AI optimizer
     * @returns the updated entry, or null if not found
     */
    logOutcome(entryId: number, rating: number, aiSuggestionApplied: boolean): LogEntry | null {
      const entry = this.entries.find(e => e.id === entryId)
      if (!entry) return null
      entry.outcomeRating       = Math.max(1, Math.min(5, Math.round(rating)))
      entry.aiSuggestionApplied = aiSuggestionApplied
      return entry
    },

    clearLog() {
      this.entries           = []
      this.nextId            = 1
      this.cumulativeDoseJkg = 0
      this.sessionStartMs    = Date.now()
    },

    /**
     * Accumulate dosimetry: SAR_target × dt_s × dutyCycle.
     * Called on a periodic timer in ExperimentView.
     * @param sarWkg - instantaneous SAR [W/kg] for the target cell
     * @param dutyCycle - duty cycle (0-1)
     * @param dtMs - elapsed time since last sample [ms]
     */
    addDoseSample(sarWkg: number, dutyCycle: number, dtMs: number) {
      this.cumulativeDoseJkg += sarWkg * dutyCycle * (dtMs * 1e-3)
    },

    /** Generate a publication-ready methods .txt file for a single log entry. */
    exportEntryMethods(entry: LogEntry) {
      const { text, filename } = buildEntryMethodsText(entry, this.sessionName)
      downloadText(text, filename)
    },

    exportCSV() {
      const cell = useCellStore()
      const { text, filename } = buildCsvText(
        this.entries,
        this.sessionName,
        this.sampleDescription,
        this.sessionNotes,
        {
          healthyLabel:              cell.healthy.label,
          healthyRadius:             cell.healthy.radius,
          healthyFc:                 cell.healthyFc,
          targetLabel:               cell.target.label,
          targetRadius:              cell.target.radius,
          targetFc:                  cell.targetFc,
          medium:                    cell.medium,
          effectiveSigmaE:           cell.effectiveSigmaE,
          currentBroadcastFrequency: cell.currentBroadcastFrequency,
          fieldIntensity:            cell.fieldIntensity,
          waveform:                  cell.waveform,
          dutyCycle:                 cell.dutyCycle,
          pulseWidthNs:              cell.pulseWidthNs,
        },
      )
      downloadText(text, filename, 'text/csv')
    },
  },
})
