// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// Shared log-spaced frequency domain for the Schwan-mode charts
// (FrequencyResponseChart and DisruptionChart). Acoustic ResonanceChart
// operates in the GHz range and keeps its own domain.

import { logspace } from '@/utils/math'

export const F_MIN_HZ = 10_000        // 10 kHz lower bound
export const F_MAX_HZ = 500_000_000   // 500 MHz upper bound
export const N_POINTS = 200

export const F_POINTS_HZ: number[] = logspace(F_MIN_HZ, F_MAX_HZ, N_POINTS)
