// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { LOG_EVENT } from '@/constants/strings'
import { NULL_DISPLAY } from '@/constants/strings'

/**
 * Returns the badge variant for an experiment log event.
 * @param event - The log event type string
 * @returns 'danger' for lysis events, 'primary' for all others
 */
export function eventVariant(event: string): string {
  return event === LOG_EVENT.LYSIS ? 'danger' : 'primary'
}

/**
 * Format a DEP Clausius-Mossotti factor for display.
 * Returns NULL_DISPLAY when the value is absent (DEP mode not active).
 * @param k - Re[K(f)] value, or undefined if not computed
 * @returns Fixed-3 decimal string, or NULL_DISPLAY
 */
export function depKDisplay(k: number | undefined): string {
  return k != null ? k.toFixed(3) : NULL_DISPLAY
}

/**
 * Format a DEP factor for tooltip display at higher precision.
 * @param k - Re[K(f)] value, or undefined if not computed
 * @returns Fixed-4 decimal string, or NULL_DISPLAY
 */
export function depKDisplayFull(k: number | undefined): string {
  return k != null ? k.toFixed(4) : NULL_DISPLAY
}
