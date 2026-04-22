// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
import { defineStore } from 'pinia'

import { apiFetch, getAuthToken } from '@/services/apiClient'

/**
 * Per-lab scalar sigma_i correction per cell preset. cellPresetId matches
 * either a built-in cellLibrary id or a UserCellPreset.id; multiplier=1.0
 * with nSamples=0 is the fall-through when no record exists.
 */
export interface CellCalibration {
  cellPresetId:    string
  sigmaMultiplier: number
  uncertaintyStd:  number
  nSamples:        number
  updatedAt:       number   // epoch ms
}

interface BackendCalibration {
  id:              string
  orgId:           string
  cellPresetId:    string
  sigmaMultiplier: number
  uncertaintyStd:  number
  nSamples:        number
  updatedAt:       string
}

function fromBackend(c: BackendCalibration): CellCalibration {
  return {
    cellPresetId:    c.cellPresetId,
    sigmaMultiplier: c.sigmaMultiplier,
    uncertaintyStd:  c.uncertaintyStd,
    nSamples:        c.nSamples,
    updatedAt:       new Date(c.updatedAt).getTime(),
  }
}

interface ComputeResult {
  sigmaMultiplier: number
  uncertaintyStd:  number
  nSamples:        number
  collecting:      boolean
  clamped:         boolean
  outliersRemoved: number
  rmseBefore:      number
  rmseAfter:       number
  cellPresetId:    string
}

export type CalibrationStatusState = 'unknown' | 'collecting' | 'clamped' | 'calibrated'

/** rmseBefore/rmseAfter come only from a transient compute (DB stores the multiplier, not residuals); the persisted branch of statusFor returns 0 and the UI suppresses the error-delta line when either is 0. */
export interface CalibrationStatus {
  state:           CalibrationStatusState
  nSamples:        number
  sigmaMultiplier: number
  uncertaintyStd:  number
  rmseBefore:      number
  rmseAfter:       number
}

export const useCellCalibrationStore = defineStore('cellCalibration', {
  state: () => ({
    calibrations:   [] as CellCalibration[],
    loading:        false,
    computing:      null as string | null,
    recentComputes: {} as Record<string, ComputeResult>,
  }),

  getters: {
    byPresetId(): (id: string) => CellCalibration | undefined {
      return (id: string) => this.calibrations.find(c => c.cellPresetId === id)
    },

    /** Scalar multiplier used at sim time as sigma_i_corrected = sigma_i_base * multiplier. */
    multiplierFor(): (id: string) => number {
      return (id: string) => this.byPresetId(id)?.sigmaMultiplier ?? 1.0
    },

    /** Residual-std band half-width; 0 fall-through leaves the static literature band intact. */
    uncertaintyFor(): (id: string) => number {
      return (id: string) => this.byPresetId(id)?.uncertaintyStd ?? 0
    },

    /**
     * Combined view of persisted record + transient recent compute. A recent
     * compute for the same id wins (carries collecting/clamped flags that the
     * persisted row does not). Falls back to the persisted row (always
     * 'calibrated' when it exists), then 'unknown'.
     */
    statusFor(state): (id: string) => CalibrationStatus {
      return (id: string): CalibrationStatus => {
        const recent = state.recentComputes[id]
        if (recent) {
          let status: CalibrationStatusState = 'calibrated'
          if (recent.collecting) status = 'collecting'
          else if (recent.clamped) status = 'clamped'
          return {
            state:           status,
            nSamples:        recent.nSamples,
            sigmaMultiplier: recent.sigmaMultiplier,
            uncertaintyStd:  recent.uncertaintyStd,
            rmseBefore:      recent.rmseBefore,
            rmseAfter:       recent.rmseAfter,
          }
        }
        const persisted = this.byPresetId(id)
        if (persisted) {
          return {
            state:           'calibrated',
            nSamples:        persisted.nSamples,
            sigmaMultiplier: persisted.sigmaMultiplier,
            uncertaintyStd:  persisted.uncertaintyStd,
            rmseBefore:      0,
            rmseAfter:       0,
          }
        }
        return { state: 'unknown', nSamples: 0, sigmaMultiplier: 1.0, uncertaintyStd: 0, rmseBefore: 0, rmseAfter: 0 }
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

    /**
     * Kick off a fit for one preset. When the service returns collecting=true
     * (below the min-samples gate) no row is persisted server-side, so we
     * skip the follow-up fetchAll and leave the local record untouched.
     */
    async compute(cellPresetId: string): Promise<ComputeResult | null> {
      this.computing = cellPresetId
      try {
        const data = await apiFetch<{ calibration: ComputeResult }>('/cell-calibration/compute', {
          method: 'POST',
          body:   JSON.stringify({ cellPresetId }),
        })
        this.recentComputes[cellPresetId] = data.calibration
        if (!data.calibration.collecting) await this.fetchAll()
        return data.calibration
      } catch (err) {
        console.error('[cellCalibrationStore] compute failed:', err)
        return null
      } finally {
        this.computing = null
      }
    },

    /** Peer-sync hook for future socket broadcast on model promotion. */
    receive(record: BackendCalibration): void {
      const entry = fromBackend(record)
      const idx = this.calibrations.findIndex(c => c.cellPresetId === entry.cellPresetId)
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
