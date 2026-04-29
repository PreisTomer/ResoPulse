// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Experiment session persistence service.
// All database access for ExperimentSession goes through this module.
// Every query is scoped to the caller's orgId — cross-org access is structurally impossible.

import { randomBytes } from 'crypto'

import { Prisma } from '@prisma/client'

import { prisma } from '../../prisma'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ExperimentListItem {
  id:          string
  title:       string
  description: string | null
  version:     number
  createdBy:   string
  parentId:    string | null
  shareMode:   string | null
  createdAt:   Date
  updatedAt:   Date
}

export interface ExperimentDetail extends ExperimentListItem {
  snapshot:   Prisma.JsonValue // opaque JSONB — frontend owns the shape
  orgId:      string
  shareToken: string | null
}

export interface ListOptions {
  page:    number
  limit:   number
  search:  string
  sortBy:  'updatedAt' | 'createdAt' | 'title'
  sortDir: 'asc' | 'desc'
}

export interface ListResult {
  experiments: ExperimentListItem[]
  total:       number
  page:        number
  limit:       number
}

// ── Share token helpers ───────────────────────────────────────────────────────

function generateShareToken(): string {
  return randomBytes(24).toString('hex')
}

function isValidShareMode(mode: string): mode is 'view' | 'edit' {
  return mode === 'view' || mode === 'edit'
}

// ── Allowed sort columns guard ────────────────────────────────────────────────

const ALLOWED_SORT_COLS = new Set(['updatedAt', 'createdAt', 'title'])

function safeSortBy(raw: string): 'updatedAt' | 'createdAt' | 'title' {
  return ALLOWED_SORT_COLS.has(raw)
    ? (raw as 'updatedAt' | 'createdAt' | 'title')
    : 'updatedAt'
}

// ── CRUD ──────────────────────────────────────────────────────────────────────

/**
 * Returns a paginated list of non-deleted experiments for an org.
 */
export async function listExperiments(orgId: string, opts: ListOptions): Promise<ListResult> {
  const { page, limit, search, sortBy, sortDir } = opts
  const skip = (page - 1) * limit
  const col  = safeSortBy(sortBy)

  const where = {
    orgId,
    deletedAt: null,
    ...(search ? { title: { contains: search, mode: 'insensitive' as const } } : {}),
  }

  const [experiments, total] = await Promise.all([
    prisma.experimentSession.findMany({
      where,
      skip,
      take:    limit,
      orderBy: { [col]: sortDir },
      select: {
        id:          true,
        title:       true,
        description: true,
        version:     true,
        createdBy:   true,
        parentId:    true,
        shareMode:   true,
        createdAt:   true,
        updatedAt:   true,
      },
    }),
    prisma.experimentSession.count({ where }),
  ])

  return { experiments, total, page, limit }
}

/**
 * Returns a single experiment. Returns null if not found, deleted, or belongs to a different org.
 */
export async function getExperiment(id: string, orgId: string): Promise<ExperimentDetail | null> {
  const row = await prisma.experimentSession.findFirst({
    where: { id, orgId, deletedAt: null },
  })
  return row ?? null
}

/**
 * Returns an experiment by its public share token (no org check — share tokens are public).
 * Returns null if the token is invalid or the experiment has been deleted.
 */
export async function getExperimentByShareToken(shareToken: string): Promise<ExperimentDetail | null> {
  const row = await prisma.experimentSession.findFirst({
    where: { shareToken, deletedAt: null },
  })
  return row ?? null
}

/**
 * Creates a new experiment session.
 */
export async function createExperiment(
  orgId:       string,
  userId:      string,
  title:       string,
  description: string | null,
  snapshot:    Prisma.InputJsonValue,
): Promise<ExperimentDetail> {
  return prisma.experimentSession.create({
    data: {
      orgId,
      createdBy:   userId,
      title:       title.slice(0, 120),
      description: description ? description.slice(0, 500) : null,
      snapshot,
      version:     1,
    },
  })
}

/**
 * Updates the title, description, and/or snapshot of an experiment.
 * Only the owning org may update.
 */
export async function updateExperiment(
  id:      string,
  orgId:   string,
  updates: { title?: string; description?: string | null; snapshot?: Prisma.InputJsonValue },
): Promise<ExperimentDetail | null> {
  const existing = await prisma.experimentSession.findFirst({
    where: { id, orgId, deletedAt: null },
  })
  if (!existing) return null

  return prisma.experimentSession.update({
    where: { id },
    data:  {
      ...(updates.title       !== undefined ? { title:       updates.title.slice(0, 120)                              } : {}),
      ...(updates.description !== undefined ? { description: updates.description?.slice(0, 500) ?? null              } : {}),
      ...(updates.snapshot    !== undefined ? { snapshot:    updates.snapshot                                      } : {}),
    },
  })
}

/**
 * Saves the current state as a new version linked to a parent experiment.
 * Returns the new version record.
 */
export async function saveNewVersion(
  parentId: string,
  orgId:    string,
  userId:   string,
  title:    string,
  snapshot: Prisma.InputJsonValue,
): Promise<ExperimentDetail | null> {
  const parent = await prisma.experimentSession.findFirst({
    where: { id: parentId, orgId, deletedAt: null },
  })
  if (!parent) return null

  return prisma.experimentSession.create({
    data: {
      orgId,
      createdBy:   userId,
      title:       title.slice(0, 120),
      description: parent.description,
      snapshot,
      version:     parent.version + 1,
      parentId:    parent.id,
    },
  })
}

/**
 * Forks (duplicates) an experiment as a new root-level experiment.
 * The fork has no parentId and version=1 — it is fully independent.
 */
export async function forkExperiment(
  sourceId:    string,
  orgId:       string,
  userId:      string,
  newTitle:    string,
): Promise<ExperimentDetail | null> {
  const source = await prisma.experimentSession.findFirst({
    where: { id: sourceId, orgId, deletedAt: null },
  })
  if (!source) return null

  return prisma.experimentSession.create({
    data: {
      orgId,
      createdBy:   userId,
      title:       newTitle.slice(0, 120),
      description: source.description,
      snapshot:    source.snapshot as Prisma.InputJsonValue,
      version:     1,
    },
  })
}

/**
 * Soft-deletes an experiment. The row is retained for audit purposes.
 */
export async function deleteExperiment(id: string, orgId: string): Promise<boolean> {
  const existing = await prisma.experimentSession.findFirst({
    where: { id, orgId, deletedAt: null },
  })
  if (!existing) return false

  await prisma.experimentSession.update({
    where: { id },
    data:  { deletedAt: new Date() },
  })
  return true
}

/**
 * Generates (or rotates) a share token for an experiment.
 * shareMode must be "view" or "edit".
 * Returns the new share URL token string.
 */
export async function enableSharing(
  id:        string,
  orgId:     string,
  shareMode: string,
): Promise<string | null> {
  if (!isValidShareMode(shareMode)) return null

  const existing = await prisma.experimentSession.findFirst({
    where: { id, orgId, deletedAt: null },
  })
  if (!existing) return null

  const shareToken = generateShareToken()
  await prisma.experimentSession.update({
    where: { id },
    data:  { shareToken, shareMode },
  })
  return shareToken
}

/**
 * Revokes the share token for an experiment (makes it private again).
 */
export async function disableSharing(id: string, orgId: string): Promise<boolean> {
  const existing = await prisma.experimentSession.findFirst({
    where: { id, orgId, deletedAt: null },
  })
  if (!existing) return false

  await prisma.experimentSession.update({
    where: { id },
    data:  { shareToken: null, shareMode: null },
  })
  return true
}

/**
 * Returns the version history chain for a root experiment (sorted oldest first).
 */
export async function getVersionHistory(rootId: string, orgId: string): Promise<ExperimentListItem[]> {
  return prisma.experimentSession.findMany({
    where: {
      orgId,
      deletedAt: null,
      OR: [{ id: rootId }, { parentId: rootId }],
    },
    orderBy: { version: 'asc' },
    select: {
      id:          true,
      title:       true,
      description: true,
      version:     true,
      createdBy:   true,
      parentId:    true,
      shareMode:   true,
      createdAt:   true,
      updatedAt:   true,
    },
  })
}
