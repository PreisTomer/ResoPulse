// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// Global cooldown for /ai/retrain — the endpoint is unauthenticated by design and this gate prevents floods.

export const RETRAIN_COOLDOWN_MS = 60_000

export interface CooldownGate {
  attempt(now: number): { allowed: true } | { allowed: false; retryAfterSec: number }
  reset(): void
}

export function createRetrainCooldownGate(cooldownMs: number = RETRAIN_COOLDOWN_MS): CooldownGate {
  // Negative infinity: the first attempt at any t passes the elapsed check.
  let lastStartedAt = Number.NEGATIVE_INFINITY
  return {
    attempt(now: number) {
      const elapsed = now - lastStartedAt
      if (elapsed < cooldownMs) {
        return { allowed: false, retryAfterSec: Math.ceil((cooldownMs - elapsed) / 1000) }
      }
      lastStartedAt = now
      return { allowed: true }
    },
    reset() { lastStartedAt = Number.NEGATIVE_INFINITY },
  }
}
