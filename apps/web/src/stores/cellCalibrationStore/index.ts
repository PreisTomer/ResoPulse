// Copyright © 2026 Tomer Preis. Licensed under the MIT License.
import { defineStore } from 'pinia'

import type { CalibrationMode, CellCategory, AiCalibrationCellParams } from '@simbiotix/shared-types'

import { apiFetch, getAuthToken } from '@/services/apiClient'

// Per-lab two-parameter physics-inversion calibration per (cellPresetId, mode). Schwan: param1=σ_i_mult, param2=V_th_mult; Resonance: param1=Q_mult, param2=V_thr_res_mult. covMatrix is the post-fit 2x2 on the multiplier scale; (1.0, 1.0) with cov=zeros is the no-record fall-through.
export interface CellCalibration {
  cellPresetId:    string
  mode:            CalibrationMode
  category:        CellCategory
  param1Mult:      number
  param2Mult:      number
  cov11:           number
  cov12:           number
  cov22:           number
  residualStd:     number
  param1Clamped:   boolean
  param2Clamped:   boolean
  param1Unident:   boolean
  param2Unident:   boolean
  nSamples:        number
  updatedAt:       number
}

interface BackendCalibration extends Omit<CellCalibration, 'updatedAt'> {
  id:        string
  orgId:     string
  updatedAt: string
}

function fromBackend(c: BackendCalibration): CellCalibration {
  return {
    cellPresetId:  c.cellPresetId,
    mode:          c.mode,
    category:      c.category,
    param1Mult:    c.param1Mult,
    param2Mult:    c.param2Mult,
    cov11:         c.cov11,
    cov12:         c.cov12,
    cov22:         c.cov22,
    residualStd:   c.residualStd,
    param1Clamped: c.param1Clamped,
    param2Clamped: c.param2Clamped,
    param1Unident: c.param1Unident,
    param2Unident: c.param2Unident,
    nSamples:      c.nSamples,
    updatedAt:     new Date(c.updatedAt).getTime(),
  }
}

interface ComputeResult {
  mode:                 CalibrationMode
  param1Mult:           number
  param2Mult:           number
  cov11:                number
  cov12:                number
  cov22:                number
  residualStd:          number
  nSamples:             number
  collecting:           boolean
  clampedParam1:        boolean
  clampedParam2:        boolean
  param1Unidentifiable: boolean
  param2Unidentifiable: boolean
  outliersRemoved:      number
  rmseBefore:           number
  rmseAfter:            number
  cellPresetId:         string
}

export type CalibrationStatusState = 'unknown' | 'collecting' | 'clamped' | 'unidentifiable' | 'calibrated'

export interface CalibrationStatus {
  state:        CalibrationStatusState
  nSamples:     number
  param1Mult:   number
  param2Mult:   number
  residualStd:  number
  rmseBefore:   number
  rmseAfter:    number
}

// 2x2 covariance on the multiplier scale; consumers use it with the analogous numerical Jacobian to propagate uncertainty into TI / Vm / population bands. All zeros means "no calibration record exists" — fall back to the literature radius-based prior.
export interface CalibrationCovariance {
  cov11: number
  cov12: number
  cov22: number
}

const ZERO_COV: CalibrationCovariance = { cov11: 0, cov12: 0, cov22: 0 }

export const useCellCalibrationStore = defineStore('cellCalibration', {
  state: () => ({
    calibrations:   [] as CellCalibration[],
    loading:        false,
    computing:      null as string | null,
    recentComputes: {} as Record<string, ComputeResult>,
  }),

  getters: {
    findRecord(): (id: string, mode: CalibrationMode) => CellCalibration | undefined {
      return (id, mode) => this.calibrations.find(c => c.cellPresetId === id && c.mode === mode)
    },

    // Multiplier on σ_i (Schwan) or Q (Resonance). Defaults to 1.0 when no record exists.
    param1MultiplierFor(): (id: string, mode: CalibrationMode) => number {
      return (id, mode) => this.findRecord(id, mode)?.param1Mult ?? 1.0
    },

    // Multiplier on V_th (Schwan) or V_thr_res (Resonance). Defaults to 1.0 when no record exists.
    param2MultiplierFor(): (id: string, mode: CalibrationMode) => number {
      return (id, mode) => this.findRecord(id, mode)?.param2Mult ?? 1.0
    },

    // Post-fit 2x2 covariance on the multiplier scale (zeros when no record).
    covarianceFor(): (id: string, mode: CalibrationMode) => CalibrationCovariance {
      return (id, mode) => {
        const r = this.findRecord(id, mode)
        if (!r) return ZERO_COV
        return { cov11: r.cov11, cov12: r.cov12, cov22: r.cov22 }
      }
    },

    statusFor(state): (id: string, mode: CalibrationMode) => CalibrationStatus {
      return (id, mode) => {
        const recent = state.recentComputes[`${id}::${mode}`]
        if (recent) {
          let status: CalibrationStatusState = 'calibrated'
          if (recent.collecting) status = 'collecting'
          else if (recent.param1Unidentifiable || recent.param2Unidentifiable) status = 'unidentifiable'
          else if (recent.clampedParam1 || recent.clampedParam2) status = 'clamped'
          return {
            state:       status,
            nSamples:    recent.nSamples,
            param1Mult:  recent.param1Mult,
            param2Mult:  recent.param2Mult,
            residualStd: recent.residualStd,
            rmseBefore:  recent.rmseBefore,
            rmseAfter:   recent.rmseAfter,
          }
        }
        const persisted = this.findRecord(id, mode)
        if (persisted) {
          let status: CalibrationStatusState = 'calibrated'
          if (persisted.param1Unident || persisted.param2Unident) status = 'unidentifiable'
          else if (persisted.param1Clamped || persisted.param2Clamped) status = 'clamped'
          return {
            state:       status,
            nSamples:    persisted.nSamples,
            param1Mult:  persisted.param1Mult,
            param2Mult:  persisted.param2Mult,
            residualStd: persisted.residualStd,
            rmseBefore:  0,
            rmseAfter:   0,
          }
        }
        return { state: 'unknown', nSamples: 0, param1Mult: 1.0, param2Mult: 1.0, residualStd: 0, rmseBefore: 0, rmseAfter: 0 }
      }
    },
  },

  actions: {
    async fetchAll(): Promise<void> {
      const token = await getAuthToken()
      if (!token) {
        this.calibrations = []
        return
      }
      this.loading = true
      try {
        const data = await apiFetch<{ calibrations: BackendCalibration[] }>('/cell-calibration')
        this.calibrations = data.calibrations.map(fromBackend)
      } catch (err) {
        console.error('[cellCalibrationStore] fetchAll failed:', err)
      } finally {
        this.loading = false
      }
    },

    async compute(args: { cellPresetId: string, mode: CalibrationMode, category: CellCategory, cellParams: AiCalibrationCellParams }): Promise<ComputeResult | null> {
      const { cellPresetId, mode, category, cellParams } = args
      const cacheKey = `${cellPresetId}::${mode}`
      this.computing = cacheKey
      try {
        const data = await apiFetch<{ calibration: ComputeResult }>('/cell-calibration/compute', {
          method: 'POST',
          body:   JSON.stringify({ cellPresetId, mode, category, cellParams }),
        })
        this.recentComputes[cacheKey] = data.calibration
        if (!data.calibration.collecting) await this.fetchAll()
        return data.calibration
      } catch (err) {
        console.error('[cellCalibrationStore] compute failed:', err)
        return null
      } finally {
        this.computing = null
      }
    },

    receive(record: BackendCalibration): void {
      const entry = fromBackend(record)
      const idx = this.calibrations.findIndex(c => c.cellPresetId === entry.cellPresetId && c.mode === entry.mode)
      if (idx === -1) this.calibrations.push(entry)
      else this.calibrations[idx] = entry
    },

    reset(): void {
      this.calibrations   = []
      this.recentComputes = {}
      this.computing      = null
    },
  },
})
