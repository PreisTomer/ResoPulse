// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { defineStore } from 'pinia'

/**
 * UI transient state that does not belong in domain stores (cellStore, experimentStore).
 * Currently used to communicate a pending element-highlight from ProtocolView to
 * ExperimentView / InstrumentView after a cross-route navigation.
 */

interface UiState {
  /** ID of a DOM element to scroll-and-highlight after the next route transition. */
  pendingHighlight: string | null
}

export const useUiStore = defineStore('ui', {
  state: (): UiState => ({
    pendingHighlight: null,
  }),

  actions: {
    /** Queue an element highlight for after the next route mount. */
    setPendingHighlight(targetId: string) {
      this.pendingHighlight = targetId
    },

    /** Consume and clear the pending highlight. */
    clearPendingHighlight() {
      this.pendingHighlight = null
    },
  },
})
