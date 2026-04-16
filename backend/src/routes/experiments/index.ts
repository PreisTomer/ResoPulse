// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// Experiment session REST API.
// All routes except GET /experiments/share/:token require auth + an active org.
// Token consumption (SAVE_EXPERIMENT) is applied on create and version-save.

import { Router } from 'express'
import type { Request, Response } from 'express'

import { Prisma } from '@prisma/client'

import { requireAuth, requireOrg, getRequestAuth } from '../../middleware/clerkAuth'
import {
  listExperiments,
  getExperiment,
  getExperimentByShareToken,
  createExperiment,
  updateExperiment,
  saveNewVersion,
  forkExperiment,
  deleteExperiment,
  enableSharing,
  disableSharing,
  getVersionHistory,
} from '../../services/experimentService'
import { consumeTokens, refundTokens, createTokenAccount, COST_MAP } from '../../services/tokenService'

const router = Router()

// ── List experiments for current org ─────────────────────────────────────────
// GET /experiments?page=1&limit=20&search=&sortBy=updatedAt&sortDir=desc

router.get('/', requireAuth, requireOrg, async (req: Request, res: Response) => {
  const { orgId } = getRequestAuth(req)

  // Auto-provision a free-tier account for orgs that predate this feature launch.
  await createTokenAccount(orgId!)

  const page    = Math.max(1, parseInt((req.query.page    as string) ?? '1',  10))
  const limit   = Math.min(100, Math.max(1, parseInt((req.query.limit as string) ?? '20', 10)))
  const search  = typeof req.query.search  === 'string' ? req.query.search.slice(0, 120)    : ''
  const sortBy  = typeof req.query.sortBy  === 'string' ? req.query.sortBy                   : 'updatedAt'
  const sortDir = req.query.sortDir === 'asc' ? 'asc' : 'desc'

  const result = await listExperiments(orgId!, {
    page, limit, search,
    sortBy:  sortBy as 'updatedAt' | 'createdAt' | 'title',
    sortDir,
  })
  res.json(result)
})

// ── Public share link (no auth required) ─────────────────────────────────────
// GET /experiments/share/:shareToken

router.get('/share/:shareToken', async (req: Request, res: Response) => {
  const { shareToken } = req.params
  if (!shareToken || typeof shareToken !== 'string') {
    res.status(400).json({ error: 'Invalid share token.' })
    return
  }

  const experiment = await getExperimentByShareToken(shareToken)
  if (!experiment) {
    res.status(404).json({ error: 'Experiment not found or link has been revoked.' })
    return
  }

  // Return full snapshot for both "view" and "edit" share modes.
  // The frontend enforces edit restrictions client-side; sensitive org data is not included.
  res.json({
    id:          experiment.id,
    title:       experiment.title,
    description: experiment.description,
    version:     experiment.version,
    shareMode:   experiment.shareMode,
    snapshot:    experiment.snapshot,
    createdAt:   experiment.createdAt,
    updatedAt:   experiment.updatedAt,
  })
})

// ── Get single experiment ─────────────────────────────────────────────────────
// GET /experiments/:id

router.get('/:id', requireAuth, requireOrg, async (req: Request, res: Response) => {
  const { orgId } = getRequestAuth(req)
  const experiment = await getExperiment(req.params.id, orgId!)
  if (!experiment) {
    res.status(404).json({ error: 'Experiment not found.' })
    return
  }
  res.json(experiment)
})

// ── Create experiment ─────────────────────────────────────────────────────────
// POST /experiments
// Body: { title, description?, snapshot }
// Costs SAVE_EXPERIMENT tokens.

router.post('/', requireAuth, requireOrg, async (req: Request, res: Response) => {
  const { orgId, userId } = getRequestAuth(req)
  const { title, description, snapshot } = req.body as {
    title:        string
    description?: string | null
    snapshot:     Prisma.InputJsonValue
  }

  if (!title || typeof title !== 'string') {
    res.status(400).json({ error: 'title is required.' })
    return
  }
  if (snapshot === undefined) {
    res.status(400).json({ error: 'snapshot is required.' })
    return
  }

  const tokenResult = await consumeTokens(orgId!, userId, COST_MAP.SAVE_EXPERIMENT, 'SAVE_EXPERIMENT')
  if (!tokenResult.ok) {
    res.status(402).json({
      error:   'Insufficient tokens.',
      balance: tokenResult.balance,
      quota:   tokenResult.quota,
      plan:    tokenResult.plan,
    })
    return
  }

  try {
    const experiment = await createExperiment(orgId!, userId, title, description ?? null, snapshot)
    res.status(201).json({ experiment, tokenBalance: tokenResult.balance })
  } catch (err) {
    await refundTokens(orgId!, userId, COST_MAP.SAVE_EXPERIMENT, 'SAVE_EXPERIMENT_REFUND', { reason: 'db_error' })
    throw err
  }
})

// ── Update experiment ─────────────────────────────────────────────────────────
// PUT /experiments/:id
// Body: { title?, description?, snapshot? }

router.put('/:id', requireAuth, requireOrg, async (req: Request, res: Response) => {
  const { orgId } = getRequestAuth(req)
  const { title, description, snapshot } = req.body as {
    title?:       string
    description?: string | null
    snapshot?:    Prisma.InputJsonValue
  }

  const updated = await updateExperiment(req.params.id, orgId!, { title, description, snapshot })
  if (!updated) {
    res.status(404).json({ error: 'Experiment not found.' })
    return
  }
  res.json(updated)
})

// ── Save as new version ───────────────────────────────────────────────────────
// POST /experiments/:id/versions
// Body: { title, snapshot }
// Costs SAVE_EXPERIMENT tokens.

router.post('/:id/versions', requireAuth, requireOrg, async (req: Request, res: Response) => {
  const { orgId, userId } = getRequestAuth(req)
  const { title, snapshot } = req.body as { title: string; snapshot: Prisma.InputJsonValue }

  if (!title || typeof title !== 'string') {
    res.status(400).json({ error: 'title is required.' })
    return
  }
  if (snapshot === undefined) {
    res.status(400).json({ error: 'snapshot is required.' })
    return
  }

  const tokenResult = await consumeTokens(orgId!, userId, COST_MAP.SAVE_EXPERIMENT, 'SAVE_EXPERIMENT', {
    action:   'new_version',
    parentId: req.params.id,
  })
  if (!tokenResult.ok) {
    res.status(402).json({
      error:   'Insufficient tokens.',
      balance: tokenResult.balance,
      quota:   tokenResult.quota,
      plan:    tokenResult.plan,
    })
    return
  }

  try {
    const version = await saveNewVersion(req.params.id, orgId!, userId, title, snapshot)
    if (!version) {
      await refundTokens(orgId!, userId, COST_MAP.SAVE_EXPERIMENT, 'SAVE_EXPERIMENT_REFUND', { reason: 'parent_not_found' })
      res.status(404).json({ error: 'Parent experiment not found.' })
      return
    }
    res.status(201).json({ experiment: version, tokenBalance: tokenResult.balance })
  } catch (err) {
    await refundTokens(orgId!, userId, COST_MAP.SAVE_EXPERIMENT, 'SAVE_EXPERIMENT_REFUND', { reason: 'db_error' })
    throw err
  }
})

// ── Version history ───────────────────────────────────────────────────────────
// GET /experiments/:id/versions

router.get('/:id/versions', requireAuth, requireOrg, async (req: Request, res: Response) => {
  const { orgId } = getRequestAuth(req)
  const versions = await getVersionHistory(req.params.id, orgId!)
  res.json(versions)
})

// ── Fork / duplicate experiment ───────────────────────────────────────────────
// POST /experiments/:id/fork
// Body: { title }

router.post('/:id/fork', requireAuth, requireOrg, async (req: Request, res: Response) => {
  const { orgId, userId } = getRequestAuth(req)
  const { title } = req.body as { title?: string }
  const resolvedTitle = (title?.slice(0, 120)) || 'Copy of experiment'

  const forked = await forkExperiment(req.params.id, orgId!, userId, resolvedTitle)
  if (!forked) {
    res.status(404).json({ error: 'Source experiment not found.' })
    return
  }
  res.status(201).json(forked)
})

// ── Sharing ───────────────────────────────────────────────────────────────────
// POST /experiments/:id/share
// Body: { shareMode: "view" | "edit" }  → enable / rotate token
// DELETE /experiments/:id/share         → revoke (make private)

router.post('/:id/share', requireAuth, requireOrg, async (req: Request, res: Response) => {
  const { orgId } = getRequestAuth(req)
  const { shareMode } = req.body as { shareMode?: string }

  if (shareMode !== 'view' && shareMode !== 'edit') {
    res.status(400).json({ error: 'shareMode must be "view" or "edit".' })
    return
  }

  const shareToken = await enableSharing(req.params.id, orgId!, shareMode)
  if (!shareToken) {
    res.status(404).json({ error: 'Experiment not found.' })
    return
  }
  res.json({ shareToken, shareMode })
})

router.delete('/:id/share', requireAuth, requireOrg, async (req: Request, res: Response) => {
  const { orgId } = getRequestAuth(req)
  const ok = await disableSharing(req.params.id, orgId!)
  if (!ok) {
    res.status(404).json({ error: 'Experiment not found.' })
    return
  }
  res.json({ ok: true })
})

// ── Soft delete ───────────────────────────────────────────────────────────────
// DELETE /experiments/:id

router.delete('/:id', requireAuth, requireOrg, async (req: Request, res: Response) => {
  const { orgId } = getRequestAuth(req)
  const ok = await deleteExperiment(req.params.id, orgId!)
  if (!ok) {
    res.status(404).json({ error: 'Experiment not found.' })
    return
  }
  res.json({ ok: true })
})

export default router
