// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { defineStore } from 'pinia'

// UI transient state: pending element-highlight after route navigation and replay panel control

interface UiState {
  pendingHighlight: string | null
  pendingValidateDrawer: boolean      // open the validate drawer when HomeView mounts
  replayExpandedCellParams: string[]  // 'healthy' | 'target' panels forced open during replay
  replayProtocolOpen: boolean         // ProtocolSection accordion forced open during replay
}

export const useUiStore = defineStore('ui', {
  state: (): UiState => ({
    pendingHighlight: null,
    pendingValidateDrawer: false,
    replayExpandedCellParams: [],
    replayProtocolOpen: false,
  }),

  actions: {
    setPendingHighlight(targetId: string) {
      this.pendingHighlight = targetId
    },

    clearPendingHighlight() {
      this.pendingHighlight = null
    },

    expandCellParamsPanel(cellType: 'healthy' | 'target') {
      if (!this.replayExpandedCellParams.includes(cellType)) {
        this.replayExpandedCellParams.push(cellType)
      }
    },

    openProtocolSection() {
      this.replayProtocolOpen = true
    },

    clearReplayExpandedPanels() {
      this.replayExpandedCellParams = []
      this.replayProtocolOpen = false
    },

    requestValidateDrawer() {
      this.pendingValidateDrawer = true
    },

    consumeValidateDrawer() {
      this.pendingValidateDrawer = false
    },
  },
})
