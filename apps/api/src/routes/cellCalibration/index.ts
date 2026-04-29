// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// REST API for two-parameter physics-inversion calibration. GET / lists all calibrations for the caller's org; POST /compute runs the fit for one (cellPresetId, mode) and upserts the result.

import { Router } from 'express'
import type { Request, Response } from 'express'

import type { AiCalibrationCellParams, CalibrationMode, CellCategory } from '@resopulse/shared-types'

import { requireAuth, requireOrg, getRequestAuth } from '../../middleware/clerkAuth'
import { computeCalibration, listCalibrations } from '../../services/cellCalibrationService'

const router = Router()

router.get('/', requireAuth, requireOrg, async (req: Request, res: Response) => {
  const { orgId } = getRequestAuth(req)
  const calibrations = await listCalibrations(orgId!)
  res.json({ calibrations })
})

const MODES = new Set<CalibrationMode>(['schwan', 'resonance'])
const CATEGORIES = new Set<CellCategory>(['mammalian', 'bacteria', 'virus'])

function isCellParams(value: Record<string, number | undefined>): value is Record<string, number> & AiCalibrationCellParams {
  return typeof value.radiusUm === 'number' && value.radiusUm > 0
    && typeof value.memThicknessNm === 'number' && value.memThicknessNm > 0
    && typeof value.dielectricConst === 'number' && value.dielectricConst > 0
    && typeof value.sigmaIBaseline === 'number' && value.sigmaIBaseline > 0
    && typeof value.vthBaseline === 'number' && value.vthBaseline > 0
}

router.post('/compute', requireAuth, requireOrg, async (req: Request, res: Response) => {
  const { orgId } = getRequestAuth(req)
  const body = req.body as Record<string, string | Record<string, number | undefined>>
  const cellPresetId = typeof body.cellPresetId === 'string' ? body.cellPresetId.trim() : ''
  const mode         = typeof body.mode === 'string' && MODES.has(body.mode as CalibrationMode) ? body.mode as CalibrationMode : 'schwan'
  const category     = typeof body.category === 'string' && CATEGORIES.has(body.category as CellCategory) ? body.category as CellCategory : 'mammalian'
  const cellParams   = body.cellParams as Record<string, number | undefined> | undefined

  if (!cellPresetId) {
    res.status(400).json({ error: 'cellPresetId is required' })
    return
  }
  if (!cellParams || !isCellParams(cellParams)) {
    res.status(400).json({ error: 'cellParams (radiusUm, memThicknessNm, dielectricConst, sigmaIBaseline, vthBaseline) is required' })
    return
  }
  if (mode === 'resonance' && (!cellParams.resonantFreqGhz || !cellParams.capsidQBaseline || !cellParams.resonantThresholdVcmBaseline)) {
    res.status(400).json({ error: 'Resonance mode requires cellParams.resonantFreqGhz, capsidQBaseline, resonantThresholdVcmBaseline' })
    return
  }

  try {
    const result = await computeCalibration({ orgId: orgId!, cellPresetId, mode, category, cellParams })
    res.json({ calibration: result })
  } catch (err) {
    console.error('[cell-calibration] compute failed:', err)
    res.status(503).json({ error: 'Calibration service unavailable' })
  }
})

export default router
