// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// Shared utilities for validation replay scripts.

const ANIMATE_STEPS = 40  // number of increments for smooth visual sweep

// Animates getter→target over durationMs in ~40 steps so sliders sweep; final setter(target) guarantees exact value.
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
