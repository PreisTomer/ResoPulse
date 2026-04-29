// Copyright © 2026 Tomer Preis. Licensed under the MIT License.
import { describe, it, expect } from 'vitest'

import { createRetrainCooldownGate, RETRAIN_COOLDOWN_MS } from './index'

describe('retrainCooldownGate', () => {
  it('allows the first attempt', () => {
    const gate = createRetrainCooldownGate()
    expect(gate.attempt(1_000).allowed).toBe(true)
  })

  it('blocks the second attempt inside the cooldown window with a Retry-After hint', () => {
    const gate = createRetrainCooldownGate()
    gate.attempt(1_000)
    const decision = gate.attempt(1_500)
    expect(decision.allowed).toBe(false)
    if (decision.allowed) return
    expect(decision.retryAfterSec).toBeGreaterThan(0)
    expect(decision.retryAfterSec).toBeLessThanOrEqual(Math.ceil(RETRAIN_COOLDOWN_MS / 1000))
  })

  it('allows another attempt once the cooldown has elapsed', () => {
    const gate = createRetrainCooldownGate()
    gate.attempt(1_000)
    expect(gate.attempt(1_000 + RETRAIN_COOLDOWN_MS).allowed).toBe(true)
  })

  it('does not advance the lockout when blocked attempts arrive in a flood', () => {
    const gate = createRetrainCooldownGate()
    gate.attempt(0)
    for (let t = 100; t < RETRAIN_COOLDOWN_MS; t += 100) gate.attempt(t)
    expect(gate.attempt(RETRAIN_COOLDOWN_MS).allowed).toBe(true)
  })

  it('honours a custom cooldown duration', () => {
    const gate = createRetrainCooldownGate(5_000)
    gate.attempt(0)
    expect(gate.attempt(4_000).allowed).toBe(false)
    expect(gate.attempt(5_000).allowed).toBe(true)
  })

  it('reset() re-arms the gate', () => {
    const gate = createRetrainCooldownGate()
    gate.attempt(1_000)
    expect(gate.attempt(1_500).allowed).toBe(false)
    gate.reset()
    expect(gate.attempt(1_500).allowed).toBe(true)
  })
})
