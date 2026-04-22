// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// Cell calibration REST API.
// GET  /cell-calibration                — list all calibrations for the caller's org
// POST /cell-calibration/compute        — run the fit for one cellPresetId; upsert

import { Router } from 'express'
import type { Request, Response } from 'express'

import { requireAuth, requireOrg, getRequestAuth } from '../../middleware/clerkAuth'
import { computeCalibration, listCalibrations } from '../../services/cellCalibrationService'

const router = Router()

// ── GET /cell-calibration ────────────────────────────────────────────────────
router.get('/', requireAuth, requireOrg, async (req: Request, res: Response) => {
  const { orgId } = getRequestAuth(req)
  const calibrations = await listCalibrations(orgId!)
  res.json({ calibrations })
})

// ── POST /cell-calibration/compute ───────────────────────────────────────────
router.post('/compute', requireAuth, requireOrg, async (req: Request, res: Response) => {
  const { orgId } = getRequestAuth(req)
  const body = req.body as Record<string, unknown>
  const cellPresetId = typeof body.cellPresetId === 'string' ? body.cellPresetId.trim() : ''

  if (!cellPresetId) {
    res.status(400).json({ error: 'cellPresetId is required' })
    return
  }

  try {
    const result = await computeCalibration(orgId!, cellPresetId)
    res.json({ calibration: result })
  } catch (err) {
    console.error('[cell-calibration] compute failed:', err)
    res.status(503).json({ error: 'Calibration service unavailable' })
  }
})

export default router
