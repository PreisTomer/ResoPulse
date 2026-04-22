// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// Cell calibration service.
// Collects measured-vs-predicted rows for one (org, cellPresetId), proxies to
// the Python AI service for the scalar sigma_i multiplier fit, and upserts
// the result into the cell_calibrations table.
//
// cellPresetId is a plain string — it matches either a built-in cellLibrary id
// (e.g. "adenocarcinoma") or a UserCellPreset.id. Calibration is uniform
// across preset sources because the physics model is uniform.

import type { AiCalibrationRequest, AiCalibrationResult, AiCalibrationSample } from '@resopulse/shared-types'

import { prisma } from '../../prisma'

const AI_SERVICE_URL      = (process.env.AI_SERVICE_URL ?? 'http://localhost:8000').replace(/\/$/, '')
const AI_SERVICE_TIMEOUT  = 10_000

// ── Data collection ──────────────────────────────────────────────────────────
// The predicted ratio is the simulator's targetRatio at the time of the run;
// the measured ratio is bench-measured target lysis pct / 100. We only use
// rows where both columns are populated — pure-prediction rows are ignored.

async function loadCalibrationSamples(orgId: string, cellPresetId: string): Promise<AiCalibrationSample[]> {
  const rows = await prisma.outcome.findMany({
    where: {
      orgId,
      targetPreset:           cellPresetId,
      measuredTargetLysisPct: { not: null },
    },
    select: {
      targetRatio:            true,
      measuredTargetLysisPct: true,
    },
  })
  return rows
    .map(r => ({
      predictedRatio: r.targetRatio,
      measuredRatio:  (r.measuredTargetLysisPct ?? 0) / 100,
    }))
    .filter(s => Number.isFinite(s.predictedRatio) && Number.isFinite(s.measuredRatio))
}

// ── AI service proxy ─────────────────────────────────────────────────────────

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

// ── Public API ───────────────────────────────────────────────────────────────

export interface CalibrationComputeResult {
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

export async function computeCalibration(orgId: string, cellPresetId: string): Promise<CalibrationComputeResult> {
  const samples = await loadCalibrationSamples(orgId, cellPresetId)
  const fit     = await callAiCalibrate({ orgId, cellPresetId, samples })

  // Upsert — don't persist a placeholder 1.0 multiplier in the "collecting"
  // state; instead keep the DB empty until we have a real fit. The frontend
  // falls back to multiplier=1.0 when no record exists.
  if (!fit.collecting) {
    await prisma.cellCalibration.upsert({
      where:  { orgId_cellPresetId: { orgId, cellPresetId } },
      create: {
        orgId,
        cellPresetId,
        sigmaMultiplier: fit.sigmaMultiplier,
        uncertaintyStd:  fit.uncertaintyStd,
        nSamples:        fit.nSamples,
      },
      update: {
        sigmaMultiplier: fit.sigmaMultiplier,
        uncertaintyStd:  fit.uncertaintyStd,
        nSamples:        fit.nSamples,
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
