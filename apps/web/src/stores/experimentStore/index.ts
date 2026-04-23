// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { defineStore } from 'pinia'

import { useCellStore } from '@/stores/cellStore'

import { downloadText, buildEntryMethodsText, buildCsvText } from '@/utils/experimentExport'

import { nowHMS, round } from '@/utils/format'
import { loadFromStorage } from '@/utils/storageClient'

import { CHART_MODE, DEFAULT_SESSION_NAME } from '@/constants/strings'
import { MEDIA } from '@/constants/media'
import { SIGMA_MEMBRANE_SI, THRESHOLDS } from '@/constants/physics'
import { STORAGE_KEY } from '@/constants/storageKeys'

import type { MediumKey } from '@/types/media'

// Re-export types so existing importers (e.g. socket.ts) don't need to change
export type { CellParamSnapshot, LogEntry, MeasuredOutcome } from '@/types/experiment'
import type { CellParamSnapshot, LogEntry, MeasuredOutcome } from '@/types/experiment'

// Calibration tier — shared UI label for "how well does the simulator match this lab's bench data".
export type CalibrationTier = 'none' | 'drift' | 'moderate' | 'strong'

// Snapshot of the current session's calibration state — exposed by store getter for UI consumption.
export interface CalibrationSummary {
  tier:                  CalibrationTier
  sampleCount:           number
  worstResidualPct:      number | null   // max(|meanTargetΔ|, |meanHealthyΔ|); null when no data
  meanTargetResidualPct: number | null
  meanHealthyResidualPct: number | null
  meanFieldResidualVcm:  number | null
}

// Per-entry residual — computed by joining measured to predicted. Used for the
// details panel bar chart and cell-card overlays.
export interface EntryResidual {
  entryId:               number
  timestamp:             string
  sessionName:           string | undefined
  targetResidualPct:     number | null
  healthyResidualPct:    number | null
  fieldResidualVcm:      number | null
}

// Most-recent measured-vs-predicted pairing for one cell type — powers the
// cell-card "predicted → measured" overlay bar.
export interface MeasuredVsPredicted {
  entryId:       number
  timestamp:     string
  predictedPct:  number   // 0-100, simulator prediction
  measuredPct:   number   // 0-100, bench measurement
  deltaPct:      number   // measured - predicted, signed
}

// ── Internal state types ───────────────────────────────────────────────────

interface ExperimentState {
  entries: LogEntry[]
  nextId: number
  sessionName: string
  sampleDescription: string   // e.g. "HepG2 passage 12, 80% confluency, PBS buffer"
  sessionNotes: string        // free-form lab notes baked into exports
  cumulativeDoseJkg: number   // J/kg, cumulative specific energy absorbed this session
  sessionStartMs: number      // Unix ms, when the current session started
  aiConsentGiven: boolean  // user opted in to anonymized outcome logging for AI training
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
  perfusionRate: number
  cellPackingFraction: number
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
  healthyBiomodScore: number
  healthy: {
    label: string; radius: number; membraneThickness: number
    dielectricConstant: number; conductivity: number; thresholdVoltage: number
    density: number; specificHeatCapacity: number; membraneConductivity?: number
    nuclearRadius?: number; nuclearMembraneThickness?: number
    nuclearMembraneEps?: number; nucleoplasmConductivity?: number
  }
  target: {
    id: string; label: string; radius: number; membraneThickness: number
    dielectricConstant: number; conductivity: number; thresholdVoltage: number
    density: number; specificHeatCapacity: number; membraneConductivity?: number
    nuclearRadius?: number; nuclearMembraneThickness?: number
    nuclearMembraneEps?: number; nucleoplasmConductivity?: number
    resonantFreqGHz?: number; capsidQ?: number; capsidQMin?: number
    capsidQMax?: number; resonantThresholdVcm?: number
    resonantFreqUncertaintyPct?: number; experimentalBasis?: string
  }
}

// ── Local helpers ──────────────────────────────────────────────────────────

function defaultState(): ExperimentState {
  return {
    entries: [], nextId: 1, sessionName: DEFAULT_SESSION_NAME,
    sampleDescription: '', sessionNotes: '', cumulativeDoseJkg: 0,
    sessionStartMs: Date.now(), aiConsentGiven: false,
  }
}

function loadState(): ExperimentState {
  return loadFromStorage(STORAGE_KEY.EXPERIMENT_SESSION, defaultState(), raw => {
    const parsed = JSON.parse(raw) as ExperimentState
    return {
      ...parsed,
      sampleDescription: parsed.sampleDescription ?? '',
      sessionNotes:      parsed.sessionNotes      ?? '',
      cumulativeDoseJkg: parsed.cumulativeDoseJkg ?? 0,
      sessionStartMs:    parsed.sessionStartMs    ?? Date.now(),
      aiConsentGiven:    parsed.aiConsentGiven    ?? false,
    }
  })
}

// ── Store ──────────────────────────────────────────────────────────────────

// ── Local helpers for calibration getters ─────────────────────────────────────

function mean(values: number[]): number | null {
  if (values.length === 0) return null
  return values.reduce((acc, v) => acc + v, 0) / values.length
}

function pickTier(count: number, worst: number | null): CalibrationTier {
  if (count < THRESHOLDS.CALIB_MIN_SAMPLES || worst === null) return 'none'
  if (worst > THRESHOLDS.CALIB_DRIFT_PP)                      return 'drift'
  if (count >= THRESHOLDS.CALIB_STRONG_SAMPLES
      && worst < THRESHOLDS.CALIB_STRONG_PP)                  return 'strong'
  return 'moderate'
}

function entryResidualOf(entry: LogEntry): EntryResidual {
  const m = entry.measured
  return {
    entryId:            entry.id,
    timestamp:          entry.timestamp,
    sessionName:        entry.sessionName,
    targetResidualPct:  m?.targetLysisPct  !== undefined ? m.targetLysisPct  - entry.targetRatio  * 100 : null,
    healthyResidualPct: m?.healthyLysisPct !== undefined ? m.healthyLysisPct - entry.healthyRatio * 100 : null,
    fieldResidualVcm:   m?.actualFieldVcm  !== undefined ? m.actualFieldVcm  - entry.fieldVcm          : null,
  }
}

// ── Store ──────────────────────────────────────────────────────────────────

export const useExperimentStore = defineStore('experiment', {
  state: (): ExperimentState => loadState(),

  getters: {
    /** Entries that have a measured-outcome blob attached. */
    measuredEntries(state): LogEntry[] {
      return state.entries.filter(e => e.measured !== undefined)
    },

    /** Per-entry residuals for every measured entry, newest first. */
    measuredResiduals(): EntryResidual[] {
      return (this.measuredEntries as LogEntry[])
        .map(entryResidualOf)
        .reverse()
    },

    /** Newest measured-vs-predicted pair per cell type (null when none logged). */
    latestMeasuredOutcomes(): { healthy: MeasuredVsPredicted | null; target: MeasuredVsPredicted | null } {
      const entries = (this.measuredEntries as LogEntry[])
      const newestTarget  = [...entries].reverse().find(e => e.measured?.targetLysisPct  !== undefined)
      const newestHealthy = [...entries].reverse().find(e => e.measured?.healthyLysisPct !== undefined)

      const pair = (entry: LogEntry | undefined, ratioKey: 'targetRatio' | 'healthyRatio', measuredKey: 'targetLysisPct' | 'healthyLysisPct'): MeasuredVsPredicted | null => {
        if (!entry || !entry.measured) return null
        const measured = entry.measured[measuredKey]
        if (measured === undefined) return null
        const predicted = entry[ratioKey] * 100
        return {
          entryId:      entry.id,
          timestamp:    entry.timestamp,
          predictedPct: predicted,
          measuredPct:  measured,
          deltaPct:     measured - predicted,
        }
      }

      return {
        healthy: pair(newestHealthy, 'healthyRatio', 'healthyLysisPct'),
        target:  pair(newestTarget,  'targetRatio',  'targetLysisPct'),
      }
    },

    /** Newest measured qPCR fold-change + transcript, or null when none logged. */
    latestMeasuredQpcr(): { foldChange: number; transcript: string | null; entryId: number } | null {
      const entries = (this.measuredEntries as LogEntry[])
      const newest  = [...entries].reverse().find(e => e.measured?.qpcrFoldChange !== undefined)
      if (!newest || !newest.measured || newest.measured.qpcrFoldChange === undefined) return null
      return {
        foldChange: newest.measured.qpcrFoldChange,
        transcript: newest.measured.qpcrTarget ?? null,
        entryId:    newest.id,
      }
    },

    /** Aggregated calibration summary across all sessions — the AI tab indicator. */
    calibrationSummary(): CalibrationSummary {
      const residuals = this.measuredResiduals as EntryResidual[]
      const count     = residuals.length
      const meanT     = mean(residuals.map(r => r.targetResidualPct ).filter((v): v is number => v !== null))
      const meanH     = mean(residuals.map(r => r.healthyResidualPct).filter((v): v is number => v !== null))
      const meanF     = mean(residuals.map(r => r.fieldResidualVcm  ).filter((v): v is number => v !== null))
      const worst     = (meanT === null && meanH === null)
        ? null
        : Math.max(Math.abs(meanT ?? 0), Math.abs(meanH ?? 0))
      return {
        tier:                   pickTier(count, worst),
        sampleCount:            count,
        worstResidualPct:       worst,
        meanTargetResidualPct:  meanT,
        meanHealthyResidualPct: meanH,
        meanFieldResidualVcm:   meanF,
      }
    },
  },

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
        sigmaE:              round(snap.effectiveSigmaE, 4),
        mediumBaseS:         MEDIA[snap.medium as MediumKey]?.conductivity,
        mediumTempCoeff:     MEDIA[snap.medium as MediumKey]?.tempCoeff,
        mediumPermittivity:  MEDIA[snap.medium as MediumKey]?.permittivity,
        perfusionRate:       snap.perfusionRate,
        cellPackingFraction: snap.cellPackingFraction,
        healthyNuclearVm:    round(snap.healthyNuclearVm * 1000, 3),
        targetNuclearVm:     round(snap.targetNuclearVm  * 1000, 3),
        depHealthyK:            snap.chartMode !== CHART_MODE.RESONANCE ? round(snap.depHealthyCmReal, 4) : undefined,
        depTargetK:             snap.chartMode !== CHART_MODE.RESONANCE ? round(snap.depTargetCmReal,  4) : undefined,
        depHealthyCrossoverKHz: snap.chartMode !== CHART_MODE.RESONANCE ? round(snap.depHealthyCrossoverKHz, 1) : undefined,
        depTargetCrossoverKHz:  snap.chartMode !== CHART_MODE.RESONANCE ? round(snap.depTargetCrossoverKHz,  1) : undefined,
        healthyBiomodScore:     snap.chartMode !== CHART_MODE.RESONANCE ? round(snap.healthyBiomodScore, 3) : undefined,
        healthySnap: {
          label: h.label, category: 'mammalian',
          radius: h.radius, membraneThickness: h.membraneThickness,
          dielectricConstant: h.dielectricConstant, conductivity: h.conductivity,
          membraneConductivity: h.membraneConductivity ?? SIGMA_MEMBRANE_SI,
          density: h.density, specificHeatCapacity: h.specificHeatCapacity,
          thresholdVoltage: h.thresholdVoltage, fc: snap.healthyFc,
          nuclearRadius: h.nuclearRadius, nuclearMembraneThickness: h.nuclearMembraneThickness,
          nuclearMembraneEps: h.nuclearMembraneEps, nucleoplasmConductivity: h.nucleoplasmConductivity,
        } satisfies CellParamSnapshot,
        targetSnap: {
          label: t.label, category: snap.targetCellCategory,
          radius: t.radius, membraneThickness: t.membraneThickness,
          dielectricConstant: t.dielectricConstant, conductivity: t.conductivity,
          membraneConductivity: t.membraneConductivity ?? SIGMA_MEMBRANE_SI,
          density: t.density, specificHeatCapacity: t.specificHeatCapacity,
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

    receiveEntry(entry: LogEntry) {
      if (this.entries.some(e => e.id === entry.id)) return
      this.entries.push(entry)
      this.nextId = Math.max(this.nextId, entry.id + 1)
    },

    setSessionName(name: string)          { this.sessionName        = name  },
    setSampleDescription(desc: string)    { this.sampleDescription  = desc  },
    setSessionNotes(notes: string)        { this.sessionNotes        = notes },
    setAiConsent(value: boolean)          { this.aiConsentGiven     = value },

    logOutcome(entryId: number, rating: number, aiSuggestionApplied: boolean): LogEntry | null {
      const entry = this.entries.find(e => e.id === entryId)
      if (!entry) return null
      entry.outcomeRating       = Math.max(1, Math.min(5, Math.round(rating)))
      entry.aiSuggestionApplied = aiSuggestionApplied
      return entry
    },

    logMeasuredOutcome(entryId: number, measured: Omit<MeasuredOutcome, 'measuredAt'> & { measuredAt?: string }): LogEntry | null {
      const entry = this.entries.find(e => e.id === entryId)
      if (!entry) return null
      const clampPct = (v: number | undefined) =>
        v === undefined || Number.isNaN(v) ? undefined : Math.max(0, Math.min(100, v))
      const roundOrU = (v: number | undefined, digits: number) =>
        v === undefined || Number.isNaN(v) ? undefined : round(v, digits)
      const nonNeg = (v: number | undefined) =>
        v === undefined || Number.isNaN(v) ? undefined : Math.max(0, v)
      entry.measured = {
        measuredAt:           measured.measuredAt ?? new Date().toISOString(),
        targetLysisPct:       clampPct(measured.targetLysisPct),
        healthyLysisPct:      clampPct(measured.healthyLysisPct),
        viabilityPct:         clampPct(measured.viabilityPct),
        permeabilizedPct:     clampPct(measured.permeabilizedPct),
        transfectionPct:      clampPct(measured.transfectionPct),
        viabilityAssay:       measured.viabilityAssay,
        assayTimepointH:      roundOrU(nonNeg(measured.assayTimepointH),      2),
        qpcrTarget:           measured.qpcrTarget?.trim() || undefined,
        qpcrFoldChange:       roundOrU(nonNeg(measured.qpcrFoldChange),       3),
        tempC:                roundOrU(measured.tempC,                        1),
        actualFieldVcm:       roundOrU(nonNeg(measured.actualFieldVcm),       1),
        observedLysisDelayMs: roundOrU(nonNeg(measured.observedLysisDelayMs), 0),
        notes:                measured.notes?.trim() || undefined,
      }
      return entry
    },

    // Applies peer measured-outcome patch; match key (sessionName, timestamp) is the only cross-session identifier. No re-broadcast.
    receiveMeasuredOutcome(sessionName: string, timestamp: string, measured: MeasuredOutcome): boolean {
      const entry = this.entries.find(e => e.sessionName === sessionName && e.timestamp === timestamp)
      if (!entry) return false
      entry.measured = { ...measured }
      return true
    },

    clearLog() {
      this.entries           = []
      this.nextId            = 1
      this.cumulativeDoseJkg = 0
      this.sessionStartMs    = Date.now()
    },

    deleteEntry(entryId: number): boolean {
      const idx = this.entries.findIndex(e => e.id === entryId)
      if (idx === -1) return false
      this.entries.splice(idx, 1)
      return true
    },

    addDoseSample(sarWkg: number, dutyCycle: number, dtMs: number) {
      this.cumulativeDoseJkg += sarWkg * dutyCycle * (dtMs * 1e-3)
    },

    exportEntryMethods(entry: LogEntry) {
      const { text, filename } = buildEntryMethodsText(entry, this.sessionName, this.sampleDescription)
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
