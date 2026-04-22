// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// Cell preset REST API.
// All routes require auth + an active org.
// Presets are scoped to the org so the whole lab shares a cell library.

import { Router } from 'express'
import type { Request, Response } from 'express'

import { requireAuth, requireOrg, getRequestAuth } from '../../middleware/clerkAuth'
import {
  listCellPresets,
  createCellPreset,
  updateCellPreset,
  deleteCellPreset,
} from '../../services/cellPresetsService'
import type { CellPresetInput } from '../../services/cellPresetsService'

const router = Router()

const VALID_ROLES         = new Set(['target', 'healthy'])
const VALID_CELL_TYPES    = new Set(['mammalian', 'bacteria', 'virus'])
const VALID_CONFIDENCES   = new Set(['literature', 'measured', 'estimated'])
const VALID_SIGMA_SOURCES = new Set(['literature', 'measured', 'electrorotation', 'impedance', 'estimated'])

function validateInput(body: Record<string, unknown>): { errors: string[]; input: CellPresetInput | null } {
  const errors: string[] = []

  if (!body.role || !VALID_ROLES.has(body.role as string))
    errors.push('role must be "target" or "healthy"')
  if (!body.cellType || !VALID_CELL_TYPES.has(body.cellType as string))
    errors.push('cellType must be "mammalian", "bacteria", or "virus"')
  if (!body.label || typeof body.label !== 'string' || !(body.label as string).trim())
    errors.push('label is required')
  if (!body.shortLabel || typeof body.shortLabel !== 'string' || !(body.shortLabel as string).trim())
    errors.push('shortLabel is required')

  const numFields: string[] = [
    'radius', 'membraneThickness', 'dielectricConstant',
    'conductivity', 'thresholdVoltage', 'density', 'specificHeatCapacity',
  ]
  for (const field of numFields) {
    const v = Number(body[field])
    if (!isFinite(v) || v <= 0) errors.push(`${field} must be a positive number`)
  }

  if (body.sigmaUncertaintyPct != null) {
    const v = Number(body.sigmaUncertaintyPct)
    if (!isFinite(v) || v < 0 || v > 100) errors.push('sigmaUncertaintyPct must be between 0 and 100')
  }
  if (body.sigmaSource != null && body.sigmaSource !== '' && !VALID_SIGMA_SOURCES.has(body.sigmaSource as string))
    errors.push(`sigmaSource must be one of: ${Array.from(VALID_SIGMA_SOURCES).join(', ')}`)

  if (errors.length > 0) return { errors, input: null }

  return {
    errors: [],
    input: {
      role:                 body.role as string,
      cellType:             body.cellType as string,
      label:                body.label as string,
      shortLabel:           body.shortLabel as string,
      notes:                typeof body.notes === 'string' ? body.notes : undefined,
      parameterConfidence:  (typeof body.parameterConfidence === 'string' && VALID_CONFIDENCES.has(body.parameterConfidence))
                              ? body.parameterConfidence
                              : 'literature',
      radius:               Number(body.radius),
      membraneThickness:    Number(body.membraneThickness),
      dielectricConstant:   Number(body.dielectricConstant),
      conductivity:         Number(body.conductivity),
      thresholdVoltage:     Number(body.thresholdVoltage),
      density:              Number(body.density),
      specificHeatCapacity: Number(body.specificHeatCapacity),
      sigmaUncertaintyPct:  body.sigmaUncertaintyPct  != null ? Number(body.sigmaUncertaintyPct)  : null,
      sigmaSource:          typeof body.sigmaSource   === 'string' && body.sigmaSource !== ''
                              ? (body.sigmaSource as string)
                              : null,
      sigmaCitation:        typeof body.sigmaCitation === 'string' ? (body.sigmaCitation as string) : null,
      resonantFreqGHz:      body.resonantFreqGHz      != null ? Number(body.resonantFreqGHz)      : null,
      capsidQ:              body.capsidQ               != null ? Number(body.capsidQ)               : null,
      resonantThresholdVcm: body.resonantThresholdVcm  != null ? Number(body.resonantThresholdVcm)  : null,
    },
  }
}

// ── GET /cell-presets ─────────────────────────────────────────────────────────

router.get('/', requireAuth, requireOrg, async (req: Request, res: Response) => {
  const { orgId } = getRequestAuth(req)
  const presets = await listCellPresets(orgId!)
  res.json({ presets })
})

// ── POST /cell-presets ────────────────────────────────────────────────────────

router.post('/', requireAuth, requireOrg, async (req: Request, res: Response) => {
  const { orgId, userId } = getRequestAuth(req)
  const { errors, input } = validateInput(req.body as Record<string, unknown>)

  if (errors.length > 0) {
    res.status(400).json({ error: 'Validation failed', details: errors })
    return
  }

  const preset = await createCellPreset(orgId!, userId!, input!)
  res.status(201).json({ preset })
})

// ── PUT /cell-presets/:id ─────────────────────────────────────────────────────

router.put('/:id', requireAuth, requireOrg, async (req: Request, res: Response) => {
  const { orgId } = getRequestAuth(req)
  const { id }    = req.params

  const { errors, input } = validateInput(req.body as Record<string, unknown>)
  if (errors.length > 0) {
    res.status(400).json({ error: 'Validation failed', details: errors })
    return
  }

  const updated = await updateCellPreset(id, orgId!, input!)
  if (!updated) {
    res.status(404).json({ error: 'Preset not found' })
    return
  }

  res.json({ preset: updated })
})

// ── DELETE /cell-presets/:id ──────────────────────────────────────────────────

router.delete('/:id', requireAuth, requireOrg, async (req: Request, res: Response) => {
  const { orgId } = getRequestAuth(req)
  const { id }    = req.params

  const deleted = await deleteCellPreset(id, orgId!)
  if (!deleted) {
    res.status(404).json({ error: 'Preset not found' })
    return
  }

  res.status(204).send()
})

export default router
