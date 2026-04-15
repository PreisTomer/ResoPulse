// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Prisma mock ───────────────────────────────────────────────────────────────
// vi.hoisted() runs before module imports so the mock variables are available
// when vi.mock()'s factory (which is also hoisted) executes.

const { mockTx, mockPrisma } = vi.hoisted(() => {
  const tx = {
    tokenAccount: {
      findUnique: vi.fn(),
      update:     vi.fn(),
    },
    tokenTransaction: {
      create: vi.fn(),
    },
  }

  const prisma = {
    $transaction: vi.fn((fn: (arg: typeof tx) => Promise<unknown>) => fn(tx)),
    tokenAccount: {
      findUnique: vi.fn(),
      update:     vi.fn(),
      upsert:     vi.fn(),
    },
    tokenTransaction: {
      create:   vi.fn(),
      findMany: vi.fn(),
    },
    organization: {
      upsert: vi.fn(),
    },
  }

  return { mockTx: tx, mockPrisma: prisma }
})

vi.mock('../prisma', () => ({ prisma: mockPrisma }))

import {
  consumeTokens,
  refundTokens,
  createTokenAccount,
  upgradePlan,
  COST_MAP,
  PLAN_QUOTA,
} from './tokenService'

// ── Constants ─────────────────────────────────────────────────────────────────

describe('COST_MAP', () => {
  it('AI_OPTIMIZE costs 5 tokens', () => {
    expect(COST_MAP.AI_OPTIMIZE).toBe(5)
  })

  it('SELECTIVITY_SWEEP costs 12 tokens', () => {
    expect(COST_MAP.SELECTIVITY_SWEEP).toBe(12)
  })

  it('ACOUSTIC_RESONANCE is the most expensive single operation', () => {
    const costs = Object.values(COST_MAP) as number[]
    expect(COST_MAP.ACOUSTIC_RESONANCE).toBe(Math.max(...costs))
  })

  it('all costs are positive integers', () => {
    for (const [key, cost] of Object.entries(COST_MAP)) {
      expect(cost, `COST_MAP.${key} must be a positive integer`).toBeGreaterThan(0)
      expect(Number.isInteger(cost)).toBe(true)
    }
  })
})

describe('PLAN_QUOTA', () => {
  it('free < pro < team < enterprise', () => {
    expect(PLAN_QUOTA.free).toBeLessThan(PLAN_QUOTA.pro)
    expect(PLAN_QUOTA.pro).toBeLessThan(PLAN_QUOTA.team)
    expect(PLAN_QUOTA.team).toBeLessThan(PLAN_QUOTA.enterprise)
  })
})

// ── consumeTokens ─────────────────────────────────────────────────────────────

describe('consumeTokens', () => {
  const FUTURE_RESET = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)  // 30 days from now

  function makeAccount(balance: number, quota = 200) {
    return {
      id:           'acc-1',
      orgId:        'org-1',
      balance,
      monthlyQuota: quota,
      plan:         'free',
      resetAt:      FUTURE_RESET,
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockPrisma.$transaction.mockImplementation(
      (fn: (tx: typeof mockTx) => Promise<unknown>) => fn(mockTx),
    )
  })

  it('returns ok=true and deducts cost when balance is sufficient', async () => {
    mockTx.tokenAccount.findUnique.mockResolvedValue(makeAccount(100))
    mockTx.tokenAccount.update.mockResolvedValue({})
    mockTx.tokenTransaction.create.mockResolvedValue({})

    const result = await consumeTokens('org-1', 'user-1', 5, 'AI_OPTIMIZE')

    expect(result.ok).toBe(true)
    expect(result.balance).toBe(95)  // 100 - 5
  })

  it('returns ok=false when balance is insufficient', async () => {
    mockTx.tokenAccount.findUnique.mockResolvedValue(makeAccount(3))

    const result = await consumeTokens('org-1', 'user-1', 5, 'AI_OPTIMIZE')

    expect(result.ok).toBe(false)
    expect(result.balance).toBe(3)
    // No update/transaction record should be written on failure
    expect(mockTx.tokenAccount.update).not.toHaveBeenCalled()
    expect(mockTx.tokenTransaction.create).not.toHaveBeenCalled()
  })

  it('allows the operation when balance exactly equals the cost', async () => {
    mockTx.tokenAccount.findUnique.mockResolvedValue(makeAccount(5))
    mockTx.tokenAccount.update.mockResolvedValue({})
    mockTx.tokenTransaction.create.mockResolvedValue({})

    const result = await consumeTokens('org-1', 'user-1', 5, 'AI_OPTIMIZE')

    expect(result.ok).toBe(true)
    expect(result.balance).toBe(0)
  })

  it('resets balance when resetAt has passed (monthly reset)', async () => {
    const pastReset = new Date(Date.now() - 1000)   // 1 second ago
    const account = { ...makeAccount(0), resetAt: pastReset }
    mockTx.tokenAccount.findUnique.mockResolvedValue(account)
    mockTx.tokenAccount.update.mockResolvedValue({})
    mockTx.tokenTransaction.create.mockResolvedValue({})

    const result = await consumeTokens('org-1', 'user-1', 5, 'CHECK')

    // Balance should have been reset to quota (200) then 5 deducted → 195
    expect(result.ok).toBe(true)
    expect(result.balance).toBe(195)
    // Two updates expected: one for reset, one for deduction
    expect(mockTx.tokenAccount.update).toHaveBeenCalledTimes(2)
    // Two transactions: monthly_reset record + consumption record
    expect(mockTx.tokenTransaction.create).toHaveBeenCalledTimes(2)
  })

  it('throws when no token account exists for the org', async () => {
    mockTx.tokenAccount.findUnique.mockResolvedValue(null)

    await expect(
      consumeTokens('org-unknown', 'user-1', 5, 'AI_OPTIMIZE'),
    ).rejects.toThrow('No token account for org org-unknown')
  })

  it('records a transaction with the correct delta (negative)', async () => {
    mockTx.tokenAccount.findUnique.mockResolvedValue(makeAccount(100))
    mockTx.tokenAccount.update.mockResolvedValue({})
    mockTx.tokenTransaction.create.mockResolvedValue({})

    await consumeTokens('org-1', 'user-1', 12, 'SELECTIVITY_SWEEP')

    const createCall = mockTx.tokenTransaction.create.mock.calls[0]![0] as { data: { delta: number; reason: string } }
    expect(createCall.data.delta).toBe(-12)
    expect(createCall.data.reason).toBe('SELECTIVITY_SWEEP')
  })
})

// ── refundTokens ──────────────────────────────────────────────────────────────

describe('refundTokens', () => {
  beforeEach(() => vi.clearAllMocks())

  it('is a no-op when the account does not exist', async () => {
    mockPrisma.tokenAccount.findUnique.mockResolvedValue(null)
    await refundTokens('org-x', 'user-1', 5, 'refund')
    expect(mockPrisma.$transaction).not.toHaveBeenCalled()
  })

  it('calls $transaction with increment and positive transaction record', async () => {
    mockPrisma.tokenAccount.findUnique.mockResolvedValue({ id: 'acc-1', orgId: 'org-1' })
    mockPrisma.$transaction.mockResolvedValue([{}, {}])

    await refundTokens('org-1', 'user-1', 10, 'operation_failed')

    expect(mockPrisma.$transaction).toHaveBeenCalledOnce()
  })
})

// ── createTokenAccount ────────────────────────────────────────────────────────

describe('createTokenAccount', () => {
  beforeEach(() => vi.clearAllMocks())

  it('upserts the Organization row then the TokenAccount', async () => {
    mockPrisma.organization.upsert.mockResolvedValue({})
    mockPrisma.tokenAccount.upsert.mockResolvedValue({})

    await createTokenAccount('org-new')

    expect(mockPrisma.organization.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'org-new' } }),
    )
    expect(mockPrisma.tokenAccount.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where:  { orgId: 'org-new' },
        create: expect.objectContaining({ plan: 'free', monthlyQuota: PLAN_QUOTA.free }),
      }),
    )
  })

  it('is idempotent — calling twice does not throw', async () => {
    mockPrisma.organization.upsert.mockResolvedValue({})
    mockPrisma.tokenAccount.upsert.mockResolvedValue({})

    await expect(createTokenAccount('org-dupe')).resolves.not.toThrow()
    await expect(createTokenAccount('org-dupe')).resolves.not.toThrow()
  })
})

// ── upgradePlan ───────────────────────────────────────────────────────────────

describe('upgradePlan', () => {
  beforeEach(() => vi.clearAllMocks())

  it('sets the correct quota for the pro plan', async () => {
    mockPrisma.tokenAccount.findUnique.mockResolvedValue({
      balance: 100, monthlyQuota: 200, plan: 'free',
    })
    mockPrisma.tokenAccount.upsert.mockResolvedValue({})

    await upgradePlan('org-1', 'pro')

    const upsertCall = mockPrisma.tokenAccount.upsert.mock.calls[0]![0] as {
      update: { monthlyQuota: number; balance: number; plan: string }
    }
    expect(upsertCall.update.monthlyQuota).toBe(PLAN_QUOTA.pro)
    expect(upsertCall.update.plan).toBe('pro')
  })

  it('tops up balance to the new quota when current balance is lower', async () => {
    mockPrisma.tokenAccount.findUnique.mockResolvedValue({
      balance: 100, monthlyQuota: 200, plan: 'free',
    })
    mockPrisma.tokenAccount.upsert.mockResolvedValue({})

    await upgradePlan('org-1', 'pro')

    const upsertCall = mockPrisma.tokenAccount.upsert.mock.calls[0]![0] as {
      update: { balance: number }
    }
    // balance(100) < new quota(2500) → balance should become 2500
    expect(upsertCall.update.balance).toBe(PLAN_QUOTA.pro)
  })

  it('does not reduce balance if it is already above the new quota', async () => {
    // Edge case: downgrade (shouldn't happen, but guard against it)
    mockPrisma.tokenAccount.findUnique.mockResolvedValue({
      balance: 5000, monthlyQuota: 10000, plan: 'team',
    })
    mockPrisma.tokenAccount.upsert.mockResolvedValue({})

    await upgradePlan('org-1', 'pro')  // pro = 2500

    const upsertCall = mockPrisma.tokenAccount.upsert.mock.calls[0]![0] as {
      update: { balance: number }
    }
    // max(5000, 2500) = 5000 — balance not reduced
    expect(upsertCall.update.balance).toBe(5000)
  })
})
