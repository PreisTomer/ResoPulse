// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// Token account REST API.
// GET /tokens/balance    — current balance + plan metadata
// GET /tokens/history    — last N debit/credit transactions
// POST /tokens/stripe-webhook — Stripe billing webhook (placeholder)

import { Router } from 'express'
import type { Request, Response } from 'express'

import { requireAuth, requireOrg, getRequestAuth } from '../../middleware/clerkAuth'
import {
  getTokenBalance,
  getTransactionHistory,
  upgradePlan,
  createTokenAccount,
  consumeTokens,
  PLAN_QUOTA,
  COST_MAP,
} from '../../services/tokenService'

const router = Router()

// ── Balance endpoint ──────────────────────────────────────────────────────────
// GET /tokens/balance
// Returns the live token balance, quota, plan, and resetAt for the caller's org.

router.get('/balance', requireAuth, requireOrg, async (req: Request, res: Response) => {
  const { orgId, userId } = getRequestAuth(req)

  try {
    // Auto-provision a free-tier account for orgs that existed before this feature launched.
    // createTokenAccount() is idempotent (upsert), so calling it here is always safe.
    await createTokenAccount(orgId!)

    const result = await getTokenBalance(orgId!, userId)
    if (!result) {
      res.status(404).json({ error: 'No token account found for this organisation. Contact support.' })
      return
    }

    res.json(result)
  } catch (err) {
    console.error('[TokenRoute] GET /balance failed:', err)
    res.status(500).json({ error: 'Internal server error.' })
  }
})

// ── Transaction history ───────────────────────────────────────────────────────
// GET /tokens/history?limit=50
// Returns the last N token transactions for the org.

router.get('/history', requireAuth, requireOrg, async (req: Request, res: Response) => {
  const { orgId } = getRequestAuth(req)
  const limit = Math.min(200, Math.max(1, parseInt((req.query.limit as string) ?? '50', 10)))

  const transactions = await getTransactionHistory(orgId!, limit)
  res.json(transactions)
})

// ── Cost map ──────────────────────────────────────────────────────────────────
// GET /tokens/costs
// Returns the COST_MAP and PLAN_QUOTA for the frontend to display.

router.get('/costs', requireAuth, async (_req: Request, res: Response) => {
  res.json({ costs: COST_MAP, plans: PLAN_QUOTA })
})

// ── Stripe webhook (placeholder) ──────────────────────────────────────────────
// POST /tokens/stripe-webhook
//
// This endpoint is intentionally left as a placeholder stub.
// Wire it up when Stripe billing is active:
//   1. Install: npm install stripe
//   2. Set STRIPE_WEBHOOK_SECRET in .env
//   3. Replace the body below with real Stripe event handling.
//
// Expected Stripe events to handle:
//   customer.subscription.created  → upgradePlan(orgId, newPlan, customerId, subscriptionId)
//   customer.subscription.updated  → upgradePlan(orgId, newPlan, customerId, subscriptionId)
//   customer.subscription.deleted  → upgradePlan(orgId, 'free')
//   invoice.payment_succeeded       → optional: top-up tokens on renewal
//   invoice.payment_failed          → notify org (email / in-app)

router.post('/stripe-webhook', async (req: Request, res: Response) => {
  // TODO: implement Stripe webhook verification and event routing.
  // const sig = req.headers['stripe-signature']
  // const event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  //
  // Example upgrade handler:
  // if (event.type === 'customer.subscription.updated') {
  //   const sub = event.data.object
  //   const orgId = sub.metadata?.orgId
  //   const plan  = resolvePlanFromPriceId(sub.items.data[0].price.id)
  //   await upgradePlan(orgId, plan, sub.customer as string, sub.id)
  // }

  console.log('[Stripe] Webhook received (stub) — implement billing handler.')
  res.json({ received: true })
})

// ── Frontend operation consume ────────────────────────────────────────────────
// POST /tokens/consume
// Body: { reason: keyof typeof COST_MAP }
// Called by the frontend before running an expensive lab operation.
// Returns 402 with remaining balance if funds are insufficient.

router.post('/consume', requireAuth, requireOrg, async (req: Request, res: Response) => {
  const { orgId, userId } = getRequestAuth(req)
  const { reason } = req.body as { reason?: string }

  if (!reason || !Object.prototype.hasOwnProperty.call(COST_MAP, reason)) {
    res.status(400).json({ error: `Invalid reason. Valid values: ${Object.keys(COST_MAP).join(', ')}.` })
    return
  }

  // Guarantee account exists — covers the window between signup and webhook delivery.
  await createTokenAccount(orgId!)

  const cost   = COST_MAP[reason as keyof typeof COST_MAP]
  const result = await consumeTokens(orgId!, userId, cost, reason)

  if (!result.ok) {
    res.status(402).json({
      error:   'Insufficient tokens.',
      balance: result.balance,
      quota:   result.quota,
      plan:    result.plan,
    })
    return
  }

  res.json({ balance: result.balance, quota: result.quota, plan: result.plan })
})

// ── Internal plan upgrade (admin only) ───────────────────────────────────────
// POST /tokens/upgrade
// Body: { plan: "pro" | "team" | "enterprise" }
// Requires X-Admin-Secret header matching ADMIN_SECRET env var.
// In production, upgrades are triggered by the Stripe webhook above — not this endpoint.

router.post('/upgrade', requireAuth, requireOrg, async (req: Request, res: Response) => {
  const adminSecret = process.env.ADMIN_SECRET
  if (!adminSecret || req.headers['x-admin-secret'] !== adminSecret) {
    res.status(403).json({ error: 'Forbidden.' })
    return
  }

  const { orgId, userId } = getRequestAuth(req)
  const { plan } = req.body as { plan?: string }

  if (!plan || !Object.prototype.hasOwnProperty.call(PLAN_QUOTA, plan)) {
    res.status(400).json({ error: `Invalid plan. Valid values: ${Object.keys(PLAN_QUOTA).join(', ')}.` })
    return
  }

  await upgradePlan(orgId!, plan)
  const updated = await getTokenBalance(orgId!, userId)
  res.json(updated)
})

export default router
