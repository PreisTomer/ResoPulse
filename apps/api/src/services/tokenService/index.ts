// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Token consumption service — all balance mutations go through this module.
// consumeTokens() is the sole write path and runs inside a Prisma $transaction
// to guarantee atomic check-and-deduct semantics under concurrent requests.

import { Prisma } from '@prisma/client'

import { prisma } from '../../prisma'

// ── Plan quotas (tokens per calendar month) ───────────────────────────────────

export const PLAN_QUOTA: Record<string, number> = {
  free:       200,
  pro:        2_500,
  team:       10_000,
  enterprise: 999_999,
}

// ── Operation cost map ────────────────────────────────────────────────────────
// Every expensive operation is listed here. Use COST_MAP keys as the `reason`
// argument to consumeTokens(). Add new entries without touching consuming code.

export const COST_MAP = {
  CELL_CARD_UPDATE:   1,   // quick single-point Schwan Vm / CellCard refresh
  SELECTIVITY_SWEEP:  12,  // full selectivity sweep (~100 frequency points)
  IMPEDANCE_SESSION:  25,  // live impedance session + Maxwell-Garnett + drift
  EXPERIMENT_REPORT:  15,  // full report + CSV + Materials and Methods export
  MANUSCRIPT_BUNDLE:  15,  // paper-ready bundle (Markdown + JSON + residuals CSV); one debit unlocks all three formats for a (session, scope) tuple
  OPENTRONS_EXPORT:   15,  // executable Python protocol for OT-2 / Flex (wet-lab pipetting + manual EP pause); one debit per (session, snapshot) tuple
  ACOUSTIC_RESONANCE: 40,  // acoustic resonance full scan (virus/bacteria mode)
  HEATMAP_LYSIS:      8,   // therapeutic heatmap / population lysis fraction
  AI_OPTIMIZE:        5,   // AI optimizer request
  AI_RETRAIN:         3,   // apply suggestion / trigger retrain — lenient op (never blocked client-side)
  AI_SUGGEST:         2,   // active-learning next-experiment batch (top-3 exploration picks)
  LOG_OUTCOME:        1,   // log a rated experiment outcome
  SAVE_EXPERIMENT:    2,   // persist experiment snapshot
} as const

export type CostKey = keyof typeof COST_MAP

// ── Result types ──────────────────────────────────────────────────────────────

export interface ConsumeResult {
  ok:      boolean
  balance: number
  quota:   number
  plan:    string
}

export interface BalanceResult {
  balance:  number
  quota:    number
  plan:     string
  resetAt:  Date
  usedThisPeriod: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Returns the first day of the next calendar month at midnight UTC.
 */
function nextMonthResetDate(from: Date): Date {
  const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() + 1, 1))
  return d
}

// ── Core service functions ────────────────────────────────────────────────────

/**
 * Atomically deducts `cost` tokens from the org's account.
 * Handles monthly reset when `resetAt` has passed.
 * Returns ok=false (with current balance) if funds are insufficient.
 *
 * @param orgId  - Clerk orgId
 * @param userId - Clerk userId of the actor (for audit log)
 * @param cost   - Number of tokens to deduct (must be positive)
 * @param reason - COST_MAP key or custom reason string
 * @param meta   - Optional JSON context attached to the transaction record
 */
export async function consumeTokens(
  orgId:  string,
  userId: string,
  cost:   number,
  reason: string,
  meta?:  Prisma.InputJsonObject,
): Promise<ConsumeResult> {
  const now = new Date()

  return prisma.$transaction(async (tx) => {
    const account = await tx.tokenAccount.findUnique({ where: { orgId } })
    if (!account) {
      throw new Error(`[TokenService] No token account for org ${orgId}`)
    }

    // ── Monthly reset check ───────────────────────────────────────────────
    let balance = account.balance
    let resetAt = account.resetAt

    if (now >= resetAt) {
      const prevBalance = balance
      balance           = account.monthlyQuota
      resetAt           = nextMonthResetDate(now)

      await tx.tokenAccount.update({
        where: { orgId },
        data:  { balance, resetAt },
      })

      await tx.tokenTransaction.create({
        data: {
          accountId: account.id,
          userId,
          delta:  balance - prevBalance,
          reason: 'monthly_reset',
          meta:   { previousBalance: prevBalance, newQuota: account.monthlyQuota } as Prisma.InputJsonValue,
        },
      })
    }

    // ── Balance check ─────────────────────────────────────────────────────
    if (balance < cost) {
      return { ok: false, balance, quota: account.monthlyQuota, plan: account.plan }
    }

    const newBalance = balance - cost

    await tx.tokenAccount.update({
      where: { orgId },
      data:  { balance: newBalance, updatedAt: now },
    })

    await tx.tokenTransaction.create({
      data: {
        accountId: account.id,
        userId,
        delta:  -cost,
        reason,
        meta:   meta !== undefined ? meta : Prisma.DbNull,
      },
    })

    return { ok: true, balance: newBalance, quota: account.monthlyQuota, plan: account.plan }
  })
}

/**
 * Credits tokens back to an org (e.g. after a failed operation).
 * Creates a positive transaction record for the audit log.
 */
export async function refundTokens(
  orgId:  string,
  userId: string,
  amount: number,
  reason: string,
  meta?:  Prisma.InputJsonObject,
): Promise<void> {
  const account = await prisma.tokenAccount.findUnique({ where: { orgId } })
  if (!account) return

  await prisma.$transaction([
    prisma.tokenAccount.update({
      where: { orgId },
      data:  { balance: { increment: amount } },
    }),
    prisma.tokenTransaction.create({
      data: {
        accountId: account.id,
        userId,
        delta:  amount,
        reason,
        meta:   meta !== undefined ? meta : Prisma.DbNull,
      },
    }),
  ])
}

/**
 * Fetches the current balance and plan metadata for an org.
 * Applies a monthly reset if resetAt has passed (read-and-correct pattern).
 */
export async function getTokenBalance(orgId: string, userId: string): Promise<BalanceResult | null> {
  const account = await prisma.tokenAccount.findUnique({ where: { orgId } })
  if (!account) return null

  const now = new Date()
  if (now >= account.resetAt) {
    // Reset the balance atomically — same logic as consumeTokens
    await consumeTokens(orgId, userId, 0, 'monthly_reset_check')
    const refreshed = await prisma.tokenAccount.findUnique({ where: { orgId } })
    if (!refreshed) return null

    const usedThisPeriod = refreshed.monthlyQuota - refreshed.balance
    return {
      balance:        refreshed.balance,
      quota:          refreshed.monthlyQuota,
      plan:           refreshed.plan,
      resetAt:        refreshed.resetAt,
      usedThisPeriod: Math.max(0, usedThisPeriod),
    }
  }

  const usedThisPeriod = account.monthlyQuota - account.balance
  return {
    balance:        account.balance,
    quota:          account.monthlyQuota,
    plan:           account.plan,
    resetAt:        account.resetAt,
    usedThisPeriod: Math.max(0, usedThisPeriod),
  }
}

/**
 * Creates a token account for a newly created organisation.
 * Safe to call multiple times — uses upsert so duplicate events are idempotent.
 *
 * Also ensures the Organization row exists in our DB before inserting the token account,
 * because the FK constraint requires it. For orgs created before the Clerk webhook was
 * live, the row may be missing — we create a placeholder row using the orgId as the name;
 * the webhook's upsertOrganization will overwrite it with the real name when it next fires.
 */
export async function createTokenAccount(orgId: string): Promise<void> {
  const resetAt = nextMonthResetDate(new Date())
  const quota   = PLAN_QUOTA.free

  // Guarantee the parent Organization row exists (no-op if it already does).
  await prisma.organization.upsert({
    where:  { id: orgId },
    update: {},
    create: { id: orgId, name: orgId },
  })

  await prisma.tokenAccount.upsert({
    where:  { orgId },
    update: {},
    create: {
      orgId,
      plan:         'free',
      monthlyQuota: quota,
      balance:      quota,
      resetAt,
    },
  })
}

/**
 * Updates an org's plan and monthly quota (called from Stripe webhook on subscription change).
 * Immediately tops up the balance to the new quota if the new quota exceeds the current balance.
 *
 * @param orgId              - Clerk orgId
 * @param plan               - New plan identifier
 * @param stripeCustomerId   - Stripe customer ID (optional)
 * @param stripeSubscriptionId - Stripe subscription ID (optional)
 */
export async function upgradePlan(
  orgId:                 string,
  plan:                  string,
  stripeCustomerId?:     string,
  stripeSubscriptionId?: string,
): Promise<void> {
  const newQuota  = PLAN_QUOTA[plan] ?? PLAN_QUOTA.free
  const account   = await prisma.tokenAccount.findUnique({ where: { orgId } })
  const newBalance = account ? Math.max(account.balance, newQuota) : newQuota
  const resetAt    = nextMonthResetDate(new Date())

  await prisma.tokenAccount.upsert({
    where:  { orgId },
    update: {
      plan,
      monthlyQuota: newQuota,
      balance:      newBalance,
      resetAt,
      ...(stripeCustomerId     ? { stripeCustomerId }     : {}),
      ...(stripeSubscriptionId ? { stripeSubscriptionId } : {}),
    },
    create: {
      orgId,
      plan,
      monthlyQuota: newQuota,
      balance:      newBalance,
      resetAt,
      stripeCustomerId:     stripeCustomerId     ?? null,
      stripeSubscriptionId: stripeSubscriptionId ?? null,
    },
  })
}

/**
 * Returns the last N token transactions for an org's account.
 */
export async function getTransactionHistory(
  orgId: string,
  limit = 50,
): Promise<Array<{ id: string; delta: number; reason: string; createdAt: Date; meta: Prisma.JsonValue }>> {
  const account = await prisma.tokenAccount.findUnique({ where: { orgId } })
  if (!account) return []

  return prisma.tokenTransaction.findMany({
    where:   { accountId: account.id },
    orderBy: { createdAt: 'desc' },
    take:    limit,
    select:  { id: true, delta: true, reason: true, createdAt: true, meta: true },
  })
}
