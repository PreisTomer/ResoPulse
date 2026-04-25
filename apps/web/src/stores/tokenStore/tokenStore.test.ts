// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
// @vitest-environment jsdom

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

import { useTokenStore } from '@/stores/tokenStore'
import { STORAGE_KEY } from '@/constants/storageKeys'
import type { TokenBalance } from '@/types/token'

function freshStore() {
  setActivePinia(createPinia())
  return useTokenStore()
}

const BALANCE_RESPONSE: TokenBalance = {
  balance:        150,
  quota:          200,
  plan:           'free',
  resetAt:        '2026-05-01T00:00:00.000Z',
  usedThisPeriod: 50,
}

// ── applyBalance ──────────────────────────────────────────────────────────────

describe('applyBalance', () => {
  it('updates all balance fields and sets isLoaded=true', () => {
    const store = freshStore()
    store.applyBalance(BALANCE_RESPONSE)
    expect(store.balance).toBe(150)
    expect(store.quota).toBe(200)
    expect(store.plan).toBe('free')
    expect(store.resetAt).toBe('2026-05-01T00:00:00.000Z')
    expect(store.usedThisPeriod).toBe(50)
    expect(store.isLoaded).toBe(true)
  })
})

// ── deductLocal ───────────────────────────────────────────────────────────────

describe('deductLocal', () => {
  it('reduces balance and increases usedThisPeriod', () => {
    const store = freshStore()
    store.applyBalance(BALANCE_RESPONSE)
    store.deductLocal(10)
    expect(store.balance).toBe(140)
    expect(store.usedThisPeriod).toBe(60)
  })

  it('does not allow balance below zero', () => {
    const store = freshStore()
    store.applyBalance({ ...BALANCE_RESPONSE, balance: 3 })
    store.deductLocal(10)
    expect(store.balance).toBe(0)
  })
})

// ── isLowBalance ──────────────────────────────────────────────────────────────

describe('isLowBalance', () => {
  it('is false before balance is loaded', () => {
    const store = freshStore()
    expect(store.isLowBalance).toBe(false)
  })

  it('is false at exactly 20% of quota', () => {
    const store = freshStore()
    store.applyBalance({ ...BALANCE_RESPONSE, balance: 40, quota: 200 })  // exactly 20%
    expect(store.isLowBalance).toBe(false)
  })

  it('is true below 20% of quota', () => {
    const store = freshStore()
    store.applyBalance({ ...BALANCE_RESPONSE, balance: 39, quota: 200 })  // 19.5% < 20%
    expect(store.isLowBalance).toBe(true)
  })

  it('is false when quota is zero (avoids div-by-zero)', () => {
    const store = freshStore()
    store.applyBalance({ ...BALANCE_RESPONSE, balance: 0, quota: 0 })
    expect(store.isLowBalance).toBe(false)
  })
})

// ── isExhausted ───────────────────────────────────────────────────────────────

describe('isExhausted', () => {
  it('is false before balance is loaded', () => {
    const store = freshStore()
    expect(store.isExhausted).toBe(false)
  })

  it('is true when balance is exactly zero', () => {
    const store = freshStore()
    store.applyBalance({ ...BALANCE_RESPONSE, balance: 0 })
    expect(store.isExhausted).toBe(true)
  })

  it('is false when balance is 1', () => {
    const store = freshStore()
    store.applyBalance({ ...BALANCE_RESPONSE, balance: 1 })
    expect(store.isExhausted).toBe(false)
  })
})

// ── balancePct ────────────────────────────────────────────────────────────────

describe('balancePct', () => {
  it('returns 0 when quota is 0', () => {
    const store = freshStore()
    store.applyBalance({ ...BALANCE_RESPONSE, balance: 0, quota: 0 })
    expect(store.balancePct).toBe(0)
  })

  it('returns 75 for 150/200', () => {
    const store = freshStore()
    store.applyBalance({ ...BALANCE_RESPONSE, balance: 150, quota: 200 })
    expect(store.balancePct).toBe(75)
  })

  it('is capped at 100 when balance exceeds quota', () => {
    const store = freshStore()
    store.applyBalance({ ...BALANCE_RESPONSE, balance: 300, quota: 200 })
    expect(store.balancePct).toBe(100)
  })
})

// ── polling lifecycle ─────────────────────────────────────────────────────────

describe('polling lifecycle', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('startPolling sets a timer; calling it again is a no-op', () => {
    const store = freshStore()
    store.startPolling()
    const t1 = store._pollTimer
    store.startPolling()   // should not replace
    expect(store._pollTimer).toBe(t1)
  })

  it('stopPolling clears the timer and sets it to null', () => {
    const store = freshStore()
    store.startPolling()
    expect(store._pollTimer).not.toBeNull()
    store.stopPolling()
    expect(store._pollTimer).toBeNull()
  })
})

// ── reset ─────────────────────────────────────────────────────────────────────

describe('reset', () => {
  it('clears all state and stops polling', () => {
    const store = freshStore()
    store.applyBalance(BALANCE_RESPONSE)
    store.startPolling()
    store.reset()
    expect(store.balance).toBe(0)
    expect(store.quota).toBe(200)
    expect(store.plan).toBe('free')
    expect(store.isLoaded).toBe(false)
    expect(store._pollTimer).toBeNull()
  })
})

// ── consumeOperation ──────────────────────────────────────────────────────────

describe('consumeOperation', () => {
  beforeEach(() => {
    vi.stubGlobal('Clerk', { session: { getToken: vi.fn().mockResolvedValue('mock-jwt') } })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('returns true and updates balance on success (200)', async () => {
    const store = freshStore()
    store.applyBalance(BALANCE_RESPONSE)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok:     true,
      status: 200,
      json:   async () => ({ balance: 145, quota: 200 }),
    }))

    const ok = await store.consumeOperation('AI_OPTIMIZE')
    expect(ok).toBe(true)
    expect(store.balance).toBe(145)
  })

  it('returns false and sets pendingUpgrade on 402', async () => {
    const store = freshStore()
    store.applyBalance(BALANCE_RESPONSE)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok:     false,
      status: 402,
      json:   async () => ({ balance: 0, quota: 200 }),
    }))

    const ok = await store.consumeOperation('AI_OPTIMIZE')
    expect(ok).toBe(false)
    expect(store.pendingUpgrade).toBe(true)
    expect(store.balance).toBe(0)
  })

  it('returns true (non-blocking) on network error', async () => {
    const store = freshStore()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')))
    const ok = await store.consumeOperation('AI_OPTIMIZE')
    expect(ok).toBe(true)
  })

  it('returns true immediately when no Clerk session (unauthenticated)', async () => {
    vi.stubGlobal('Clerk', undefined)
    const store = freshStore()
    const ok = await store.consumeOperation('AI_OPTIMIZE')
    expect(ok).toBe(true)
  })

  it('blocks and sets pendingGuestSignUp when a guest session is active', async () => {
    vi.stubGlobal('Clerk', undefined)
    sessionStorage.setItem(STORAGE_KEY.GUEST_ID, 'guest_test')
    try {
      const store = freshStore()
      const ok = await store.consumeOperation('AI_OPTIMIZE')
      expect(ok).toBe(false)
      expect(store.pendingGuestSignUp).toBe(true)
    } finally {
      sessionStorage.removeItem(STORAGE_KEY.GUEST_ID)
    }
  })

  it('allowGuest:true lets a guest session proceed without prompting sign-up', async () => {
    vi.stubGlobal('Clerk', undefined)
    sessionStorage.setItem(STORAGE_KEY.GUEST_ID, 'guest_test')
    try {
      const store = freshStore()
      const ok = await store.consumeOperation('AI_OPTIMIZE', { allowGuest: true })
      expect(ok).toBe(true)
      expect(store.pendingGuestSignUp).toBe(false)
    } finally {
      sessionStorage.removeItem(STORAGE_KEY.GUEST_ID)
    }
  })
})

// ── consumeOperationLenient ──────────────────────────────────────────────────

describe('consumeOperationLenient', () => {
  beforeEach(() => {
    vi.stubGlobal('Clerk', { session: { getToken: vi.fn().mockResolvedValue('mock-jwt') } })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('updates balance on success (200) — records usage', async () => {
    const store = freshStore()
    store.applyBalance(BALANCE_RESPONSE)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok:     true,
      status: 200,
      json:   async () => ({ balance: 147, quota: 200 }),
    }))

    await store.consumeOperationLenient('AI_RETRAIN')
    expect(store.balance).toBe(147)
    expect(store.pendingUpgrade).toBe(false)
  })

  it('does not set pendingUpgrade on 402 — silently proceeds', async () => {
    const store = freshStore()
    store.applyBalance({ ...BALANCE_RESPONSE, balance: 0 })

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok:     false,
      status: 402,
      json:   async () => ({ balance: 0, quota: 200 }),
    }))

    await store.consumeOperationLenient('AI_RETRAIN')
    expect(store.pendingUpgrade).toBe(false)
  })

  it('does not set pendingGuestSignUp when unauthenticated', async () => {
    vi.stubGlobal('Clerk', undefined)
    const store = freshStore()
    await store.consumeOperationLenient('AI_RETRAIN')
    expect(store.pendingGuestSignUp).toBe(false)
  })

  it('swallows network errors without throwing', async () => {
    const store = freshStore()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Network failure')))
    await expect(store.consumeOperationLenient('AI_RETRAIN')).resolves.toBeUndefined()
  })
})
