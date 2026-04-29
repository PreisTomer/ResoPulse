// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

import { ref } from 'vue'

// 150 ms grace period prevents the bar from flashing on instantaneous route changes
// (already-cached chunks, same-file navigations). Only slow loads reach the user's eye.
const SHOW_DELAY_MS = 150

export const routeLoading = ref<boolean>(false)

let showTimer: ReturnType<typeof setTimeout> | null = null

export function startRouteLoading(): void {
  if (showTimer) return
  showTimer = setTimeout(() => {
    routeLoading.value = true
    showTimer = null
  }, SHOW_DELAY_MS)
}

export function stopRouteLoading(): void {
  if (showTimer) {
    clearTimeout(showTimer)
    showTimer = null
  }
  routeLoading.value = false
}
