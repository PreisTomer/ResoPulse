// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Clerk webhook endpoint — syncs identity events to the application database.
// Clerk delivers signed webhook payloads via svix; we verify the signature before persisting.
//
// Supported events:
//   user.created / user.updated / user.deleted
//   organization.created / organization.updated / organization.deleted
//   organizationMembership.created / organizationMembership.updated / organizationMembership.deleted

import { Router, type Request, type Response } from 'express'
import { Webhook } from 'svix'
import { prisma } from '../../prisma'

const router = Router()

const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET ?? ''

// Raw body is required for svix signature verification — do NOT apply express.json() before this route.

router.post('/', async (req: Request, res: Response) => {
  if (!WEBHOOK_SECRET) {
    console.error('[Webhook] CLERK_WEBHOOK_SECRET is not set — rejecting all webhook calls.')
    res.status(500).json({ error: 'Webhook secret not configured.' })
    return
  }

  const payload = req.body as Buffer

  if (!Buffer.isBuffer(payload) || payload.length === 0) {
    res.status(400).json({ error: 'Empty or non-raw request body.' })
    return
  }

  let event: ClerkWebhookEvent
  try {
    const wh = new Webhook(WEBHOOK_SECRET)
    event    = wh.verify(payload, req.headers as Record<string, string>) as ClerkWebhookEvent
  } catch (err) {
    console.error('[Webhook] Verification failed:', err)
    res.status(400).json({ error: 'Invalid webhook signature.' })
    return
  }

  try {
    await routeWebhookEvent(event)
    res.json({ received: true })
  } catch (err) {
    console.error('[Webhook] Handler error:', err)
    res.status(500).json({ error: 'Webhook processing failed.' })
  }
})

// ── Event router ─────────────────────────────────────────────────────────────

async function routeWebhookEvent(event: ClerkWebhookEvent): Promise<void> {
  const { type, data } = event
  console.info(`[Webhook] ${type}`)

  switch (type) {
    case 'user.created':
    case 'user.updated':
      await upsertUser(data as ClerkUserData)
      break
    case 'user.deleted':
      await deleteUser((data as { id: string }).id)
      break
    case 'organization.created':
    case 'organization.updated':
      await upsertOrganization(data as ClerkOrgData)
      break
    case 'organization.deleted':
      await deleteOrganization((data as { id: string }).id)
      break
    case 'organizationMembership.created':
    case 'organizationMembership.updated':
      await upsertMembership(data as ClerkMembershipData)
      break
    case 'organizationMembership.deleted':
      await deleteMembership(data as ClerkMembershipData)
      break
    default:
      // Unhandled event — no-op, Clerk will not retry 2xx.
      break
  }
}

// ── User handlers ─────────────────────────────────────────────────────────────

async function upsertUser(data: ClerkUserData): Promise<void> {
  const primaryEmail = data.email_addresses.find(e => e.id === data.primary_email_address_id)?.email_address ?? ''
  if (!primaryEmail) console.warn('[webhook] upsertUser: no primary email found for user', data.id)
  await prisma.user.upsert({
    where:  { id: data.id },
    update: { email: primaryEmail, name: buildDisplayName(data) },
    create: { id: data.id, email: primaryEmail, name: buildDisplayName(data) },
  })
}

async function deleteUser(userId: string): Promise<void> {
  await prisma.membership.deleteMany({ where: { userId } })
  await prisma.user.delete({ where: { id: userId } }).catch((err: unknown) => {
    // Idempotent: user may already be gone from a prior event. Log unexpected errors.
    const code = (err as { code?: string }).code
    if (code !== 'P2025') console.warn('[webhook] deleteUser: unexpected error for', userId, err)
  })
}

// ── Organization handlers ─────────────────────────────────────────────────────

async function upsertOrganization(data: ClerkOrgData): Promise<void> {
  await prisma.organization.upsert({
    where:  { id: data.id },
    update: { name: data.name, slug: data.slug ?? null },
    create: { id: data.id,  name: data.name, slug: data.slug ?? null },
  })
}

async function deleteOrganization(orgId: string): Promise<void> {
  await prisma.membership.deleteMany({ where: { orgId } })
  await prisma.organization.delete({ where: { id: orgId } }).catch((err: unknown) => {
    console.warn('[webhook] deleteOrganization: org already gone or delete failed', orgId, err)
  })
}

// ── Membership handlers ───────────────────────────────────────────────────────

async function upsertMembership(data: ClerkMembershipData): Promise<void> {
  const userId = data.public_user_data.user_id
  const orgId  = data.organization.id
  await prisma.membership.upsert({
    where:  { userId_orgId: { userId, orgId } },
    update: { role: data.role },
    create: { userId, orgId, role: data.role },
  })
}

async function deleteMembership(data: ClerkMembershipData): Promise<void> {
  const userId = data.public_user_data.user_id
  const orgId  = data.organization.id
  await prisma.membership.deleteMany({ where: { userId, orgId } })
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildDisplayName(data: ClerkUserData): string {
  if (data.first_name || data.last_name) {
    return [data.first_name, data.last_name].filter(Boolean).join(' ')
  }
  return data.username ?? ''
}

// ── Types ─────────────────────────────────────────────────────────────────────

type ClerkEventData = ClerkUserData | ClerkOrgData | ClerkMembershipData | { id: string }

interface ClerkWebhookEvent {
  type: string
  data: ClerkEventData
}

interface ClerkUserData {
  id:                         string
  first_name:                 string | null
  last_name:                  string | null
  username:                   string | null
  primary_email_address_id:   string | null
  email_addresses: { id: string; email_address: string }[]
}

interface ClerkOrgData {
  id:   string
  name: string
  slug: string | null
}

interface ClerkMembershipData {
  role:             string
  organization:     { id: string }
  public_user_data: { user_id: string }
}

export default router
