// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { LOG_EVENT, NULL_DISPLAY } from '@/constants/strings'

// 'danger' for lysis events, 'primary' for all others
export function eventVariant(event: string): string {
  return event === LOG_EVENT.LYSIS ? 'danger' : 'primary'
}

// Re[K(f)] → fixed-3 string, or NULL_DISPLAY when absent
export function depKDisplay(k: number | undefined): string {
  return k != null ? k.toFixed(3) : NULL_DISPLAY
}

// Re[K(f)] → fixed-4 string for tooltip precision, or NULL_DISPLAY when absent
export function depKDisplayFull(k: number | undefined): string {
  return k != null ? k.toFixed(4) : NULL_DISPLAY
}
