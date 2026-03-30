// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { defineStore } from 'pinia'

// UI transient state: pending element-highlight after route navigation

interface UiState {
  pendingHighlight: string | null  // DOM element ID to scroll-highlight after next route mount
}

export const useUiStore = defineStore('ui', {
  state: (): UiState => ({
    pendingHighlight: null,
  }),

  actions: {
    setPendingHighlight(targetId: string) {
      this.pendingHighlight = targetId
    },

    clearPendingHighlight() {
      this.pendingHighlight = null
    },
  },
})
