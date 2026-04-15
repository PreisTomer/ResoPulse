// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// Token balance store — tracks the current org's token account.
// Fetches from GET /tokens/balance on sign-in and refreshes periodically.
// Exposes low-balance and exhausted computed flags for conditional UI.

import { defineStore } from 'pinia'

import type { TokenBalance, TokenPlan } from '@/types/token'

import { hasGuestSession } from '@/services/socket'

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string ?? 'http://localhost:3001').replace(/\/$/, '')

// Refresh interval in ms — balance is polled every 5 minutes while the tab is active.
const POLL_INTERVAL_MS = 5 * 60 * 1_000

// Low-balance threshold: warn when balance is below this fraction of the monthly quota.
const LOW_BALANCE_FRACTION = 0.20

// ── State ──────────────────────────────────────────────────────────────────────

interface TokenStoreState {
  balance:        number
  quota:          number
  plan:           TokenPlan
  resetAt:        string | null
  usedThisPeriod: number
  isLoaded:       boolean
  isLoading:      boolean
  error:          string | null
  pendingUpgrade:     boolean  // set to true when an operation is blocked by insufficient tokens
  pendingGuestSignUp: boolean  // set to true when a guest tries a premium operation
  _pollTimer:     ReturnType<typeof setInterval> | null
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useTokenStore = defineStore('token', {
  state: (): TokenStoreState => ({
    balance:        0,
    quota:          200,
    plan:           'free',
    resetAt:        null,
    usedThisPeriod: 0,
    isLoaded:       false,
    isLoading:      false,
    error:          null,
    pendingUpgrade:     false,
    pendingGuestSignUp: false,
    _pollTimer:         null,
  }),

  getters: {
    /** True when the balance is below 20% of the monthly quota. */
    isLowBalance(): boolean {
      if (!this.isLoaded || this.quota === 0) return false
      return this.balance / this.quota < LOW_BALANCE_FRACTION
    },

    /** True when the balance is zero — no operations can be performed. */
    isExhausted(): boolean {
      return this.isLoaded && this.balance <= 0
    },

    /** Balance as a percentage of the quota (0–100, clamped). */
    balancePct(): number {
      if (this.quota === 0) return 0
      return Math.min(100, Math.round((this.balance / this.quota) * 100))
    },

    /** Human-readable reset date. */
    resetDateLabel(): string {
      if (!this.resetAt) return ''
      return new Date(this.resetAt).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
    },
  },

  actions: {
    /**
     * Fetches the latest balance from the backend.
     * Silently no-ops if not signed in (no token = no Authorization header).
     */
    async fetchBalance(): Promise<void> {
      if (this.isLoading) return
      this.isLoading = true
      this.error     = null

      try {
        const token = await window.Clerk?.session?.getToken()
        if (!token) {
          this.isLoaded  = false
          this.isLoading = false
          return
        }

        const res = await fetch(`${BACKEND_URL}/tokens/balance`, {
          headers: { Authorization: `Bearer ${token}` },
        })

        if (!res.ok) {
          if (res.status === 404) {
            // No token account yet — org may have been created before the webhook was live.
            this.isLoaded  = true
            this.isLoading = false
            return
          }
          throw new Error(`HTTP ${res.status}`)
        }

        const data = await res.json() as TokenBalance
        this.applyBalance(data)
      } catch (err) {
        this.error = (err as Error).message
        console.error('[TokenStore] Failed to fetch balance:', err)
      } finally {
        this.isLoading = false
      }
    },

    /**
     * Applies a TokenBalance payload from the API (also used after token consumption responses).
     */
    applyBalance(data: TokenBalance): void {
      this.balance        = data.balance
      this.quota          = data.quota
      this.plan           = data.plan as TokenPlan
      this.resetAt        = data.resetAt
      this.usedThisPeriod = data.usedThisPeriod
      this.isLoaded       = true
    },

    /**
     * Optimistically deducts tokens from the local balance.
     * Call this after a successful backend consumption response.
     */
    deductLocal(amount: number): void {
      this.balance        = Math.max(0, this.balance - amount)
      this.usedThisPeriod = this.usedThisPeriod + amount
    },

    /**
     * Starts the background polling interval.
     * Should be called once after sign-in / initial load.
     */
    startPolling(): void {
      if (this._pollTimer !== null) return
      this._pollTimer = setInterval(() => {
        this.fetchBalance()
      }, POLL_INTERVAL_MS)
    },

    /**
     * Stops background polling (called on sign-out).
     */
    stopPolling(): void {
      if (this._pollTimer !== null) {
        clearInterval(this._pollTimer)
        this._pollTimer = null
      }
    },

    /**
     * Deducts tokens for a named lab operation.
     * Returns true if the operation may proceed, false if tokens are insufficient.
     * On failure, sets pendingUpgrade=true so the NavBar can open the upgrade modal.
     * Never throws — network errors are treated as non-blocking to avoid disrupting the lab UX.
     *
     * @param reason - A key from COST_MAP (e.g. 'AI_OPTIMIZE', 'SELECTIVITY_SWEEP')
     */
    async consumeOperation(reason: string): Promise<boolean> {
      try {
        const token = await window.Clerk?.session?.getToken()
        if (!token) {
          // Guest session: block the operation and prompt sign-up.
          // If there is no guest session either (e.g. Clerk still initialising), let it pass.
          if (hasGuestSession()) {
            this.pendingGuestSignUp = true
            return false
          }
          return true
        }

        const res = await fetch(`${BACKEND_URL}/tokens/consume`, {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ reason }),
        })

        if (res.status === 402) {
          const data = await res.json() as { balance: number; quota: number }
          this.balance = data.balance
          this.pendingUpgrade = true
          return false
        }

        if (!res.ok) {
          // Server error — let the action proceed rather than silently blocking the user
          console.error(`[TokenStore] consumeOperation(${reason}) failed: HTTP ${res.status}`)
          return true
        }

        const data = await res.json() as { balance: number; quota: number }
        this.balance = data.balance
        return true
      } catch {
        // Network error — don't block lab operations
        return true
      }
    },

    /** Resets state to defaults (call on sign-out). */
    reset(): void {
      this.stopPolling()
      this.balance            = 0
      this.quota              = 200
      this.plan               = 'free'
      this.resetAt            = null
      this.usedThisPeriod     = 0
      this.isLoaded           = false
      this.error              = null
      this.pendingGuestSignUp = false
    },
  },
})
