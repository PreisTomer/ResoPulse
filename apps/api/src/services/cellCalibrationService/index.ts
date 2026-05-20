// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Two-parameter physics-inversion calibration per (org, cellPresetId, mode). Schwan fits (σ_i, V_th); Resonance fits (Q, V_thr). Loads org-scoped outcomes for the target preset, builds per-row protocol context, proxies to /ai/calibrate, upserts (params, covariance, flags).

import type {
  AiCalibrationCellParams,
  AiCalibrationRequest,
  AiCalibrationResult,
  AiCalibrationSample,
  CalibrationMode,
  CellCategory,
} from '@simbiotix/shared-types'

import { prisma } from '../../prisma'

const AI_SERVICE_URL      = (process.env.AI_SERVICE_URL ?? 'http://localhost:8000').replace(/\/$/, '')
const AI_SERVICE_TIMEOUT  = 10_000

// AI service recomputes its own forward DR from per-row protocol — the simulator's pre-run targetRatio is no longer fed in, so the fit reaches the actual physics inverse rather than a derived ratio.
async function loadCalibrationSamples(orgId: string, cellPresetId: string): Promise<AiCalibrationSample[]> {
  const rows = await prisma.outcome.findMany({
    where: {
      orgId,
      targetPreset:           cellPresetId,
      measuredTargetLysisPct: { not: null },
    },
    select: {
      freqKhz:                true,
      fieldVcm:               true,
      sigmaE:                 true,
      targetTemp:             true,
      lysisNPulses:           true,
      pulseWidthNs:           true,
      dutyCycle:              true,
      waveform:               true,
      orientationDeg:         true,
      measuredTargetLysisPct: true,
      measuredFieldVcm:       true,
    },
  })

  return rows
    .map(r => {
      const measuredRatio = (r.measuredTargetLysisPct ?? 0) / 100
      // Prefer measuredFieldVcm: captures voltage-divider losses the slider value misses.
      const fieldVcm = (r.measuredFieldVcm && r.measuredFieldVcm > 0)
        ? r.measuredFieldVcm
        : r.fieldVcm
      const waveform = (r.waveform === 'cw' || r.waveform === 'pulsed' || r.waveform === 'hfire')
        ? r.waveform
        : 'pulsed'
      return {
        measuredRatio,
        protocol: {
          freqKhz:        r.freqKhz,
          fieldVcm,
          sigmaE:         r.sigmaE,
          tempC:          r.targetTemp,
          nPulses:        Math.max(1, r.lysisNPulses),
          pulseWidthNs:   r.pulseWidthNs,
          dutyCycle:      r.dutyCycle,
          waveform,
          orientationDeg: r.orientationDeg,
        },
      } satisfies AiCalibrationSample
    })
    .filter(s =>
      Number.isFinite(s.measuredRatio) &&
      Number.isFinite(s.protocol.freqKhz) &&
      Number.isFinite(s.protocol.fieldVcm) &&
      Number.isFinite(s.protocol.sigmaE) &&
      s.protocol.fieldVcm > 0 &&
      s.protocol.sigmaE > 0,
    )
}

async function callAiCalibrate(request: AiCalibrationRequest): Promise<AiCalibrationResult> {
  const upstream = await fetch(`${AI_SERVICE_URL}/ai/calibrate`, {
    method:  'POST',
    headers: { 'content-type': 'application/json' },
    body:    JSON.stringify(request),
    signal:  AbortSignal.timeout(AI_SERVICE_TIMEOUT),
  })
  if (!upstream.ok) {
    throw new Error(`AI service /ai/calibrate returned ${upstream.status}`)
  }
  return await upstream.json() as AiCalibrationResult
}

export interface CalibrationComputeResult extends AiCalibrationResult {
  cellPresetId: string
}

export interface ComputeCalibrationArgs {
  orgId:        string
  cellPresetId: string
  mode:         CalibrationMode
  category:     CellCategory
  cellParams:   AiCalibrationCellParams
}

export async function computeCalibration(args: ComputeCalibrationArgs): Promise<CalibrationComputeResult> {
  const { orgId, cellPresetId, mode, category, cellParams } = args
  const samples = await loadCalibrationSamples(orgId, cellPresetId)
  const fit = await callAiCalibrate({ orgId, cellPresetId, mode, category, cellParams, samples })

  // Skip persistence past the collecting gate: absence-of-row is the same state as a 1.0 placeholder.
  if (!fit.collecting) {
    await prisma.cellCalibration.upsert({
      where:  { orgId_cellPresetId_mode: { orgId, cellPresetId, mode } },
      create: {
        orgId,
        cellPresetId,
        mode,
        category,
        param1Mult:    fit.param1Mult,
        param2Mult:    fit.param2Mult,
        cov11:         fit.cov11,
        cov12:         fit.cov12,
        cov22:         fit.cov22,
        residualStd:   fit.residualStd,
        param1Clamped: fit.clampedParam1,
        param2Clamped: fit.clampedParam2,
        param1Unident: fit.param1Unidentifiable,
        param2Unident: fit.param2Unidentifiable,
        nSamples:      fit.nSamples,
        sigmaMultiplier: mode === 'schwan' ? fit.param1Mult : 1.0,
        uncertaintyStd:  fit.residualStd,
      },
      update: {
        category,
        param1Mult:    fit.param1Mult,
        param2Mult:    fit.param2Mult,
        cov11:         fit.cov11,
        cov12:         fit.cov12,
        cov22:         fit.cov22,
        residualStd:   fit.residualStd,
        param1Clamped: fit.clampedParam1,
        param2Clamped: fit.clampedParam2,
        param1Unident: fit.param1Unidentifiable,
        param2Unident: fit.param2Unidentifiable,
        nSamples:      fit.nSamples,
        sigmaMultiplier: mode === 'schwan' ? fit.param1Mult : 1.0,
        uncertaintyStd:  fit.residualStd,
      },
    })
  }

  return { ...fit, cellPresetId }
}

export async function listCalibrations(orgId: string) {
  return prisma.cellCalibration.findMany({
    where:   { orgId },
    orderBy: { updatedAt: 'desc' },
  })
}
