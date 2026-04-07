// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// Shared utilities for validation replay scripts.

const ANIMATE_STEPS = 40  // number of increments for smooth visual sweep

/**
 * Animates a numeric store setter from its current value to a target value
 * over the given duration. Fires the setter ~40 times so the UI slider visibly
 * sweeps rather than jumping. Calls setter(target) exactly at the end to
 * guarantee the final value is precisely correct.
 *
 * @param getter   - returns the current value (read from store)
 * @param setter   - store action that accepts the new value
 * @param target   - final value to reach
 * @param durationMs - total animation time in milliseconds (use the step delayMs)
 */
export function animateTo(
  getter: () => number,
  setter: (v: number) => void,
  target: number,
  durationMs: number,
): void {
  const from     = getter()
  const stepMs   = durationMs / ANIMATE_STEPS
  const delta    = (target - from) / ANIMATE_STEPS
  let   i        = 0

  const tick = () => {
    i++
    if (i >= ANIMATE_STEPS) {
      setter(target)
      return
    }
    setter(from + delta * i)
    setTimeout(tick, stepMs)
  }

  setTimeout(tick, stepMs)
}
