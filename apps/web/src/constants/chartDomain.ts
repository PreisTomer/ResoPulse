// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Shared log-spaced domain for Schwan-mode charts. Acoustic ResonanceChart (GHz) keeps its own.

import { logspace } from '@/utils/math'

export const F_MIN_HZ = 10_000        // 10 kHz lower bound
export const F_MAX_HZ = 500_000_000   // 500 MHz upper bound
export const N_POINTS = 200

export const F_POINTS_HZ: number[] = logspace(F_MIN_HZ, F_MAX_HZ, N_POINTS)
