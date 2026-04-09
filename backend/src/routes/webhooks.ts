// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// Clerk webhook endpoint — syncs identity events to the application database.
// Clerk delivers signed webhook payloads via svix; we verify the signature before persisting.
//
// Supported events:
//   user.created / user.updated / user.deleted
//   organization.created / organization.updated / organization.deleted
//   organizationMembership.created / organizationMembership.updated / organizationMembership.deleted

import { Router, type Request, type Response } from 'express'
import { Webhook } from 'svix'
import { prisma } from '../prisma'

const router = Router()

const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET ?? ''

// Raw body is required for svix signature verification — do NOT apply express.json() before this route.

router.post('/webhooks/clerk', async (req: Request, res: Response) => {
  if (!WEBHOOK_SECRET) {
    console.error('[Webhook] CLERK_WEBHOOK_SECRET is not set — rejecting all webhook calls.')
    res.status(500).json({ error: 'Webhook secret not configured.' })
    return
  }

  const svixId        = req.headers['svix-id']        as string | undefined
  const svixTimestamp = req.headers['svix-timestamp']  as string | undefined
  const svixSignature = req.headers['svix-signature']  as string | undefined

  if (!svixId || !svixTimestamp || !svixSignature) {
    res.status(400).json({ error: 'Missing svix headers.' })
    return
  }

  // req.body is a Buffer when express.raw() is used for this route.
  const payload = req.body as Buffer
  const body    = payload.toString('utf8')

  let event: ClerkWebhookEvent
  try {
    const wh = new Webhook(WEBHOOK_SECRET)
    event    = wh.verify(body, { 'svix-id': svixId, 'svix-timestamp': svixTimestamp, 'svix-signature': svixSignature }) as ClerkWebhookEvent
  } catch (err) {
    console.error('[Webhook] Signature verification failed:', err)
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
  await prisma.user.upsert({
    where:  { id: data.id },
    update: { email: primaryEmail, name: buildDisplayName(data) },
    create: { id: data.id, email: primaryEmail, name: buildDisplayName(data) },
  })
}

async function deleteUser(userId: string): Promise<void> {
  // Soft approach: remove memberships first, then the user record.
  await prisma.membership.deleteMany({ where: { userId } })
  await prisma.user.delete({ where: { id: userId } }).catch(() => {
    // User may already be gone if a previous delete event was processed.
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
  await prisma.organization.delete({ where: { id: orgId } }).catch(() => {})
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

interface ClerkWebhookEvent {
  type: string
  data: Record<string, unknown>
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
