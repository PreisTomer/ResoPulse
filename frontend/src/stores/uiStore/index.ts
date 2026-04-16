// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { defineStore } from 'pinia'

// UI transient state: pending element-highlight after route navigation and replay panel control

interface UiState {
  pendingHighlight: string | null
  replayExpandedCellParams: string[]  // 'healthy' | 'target' panels forced open during replay
  replayProtocolOpen: boolean         // ProtocolSection accordion forced open during replay
  protocolGuideOpen: boolean          // protocol step guide panel visible in experiment lab
  protocolGuideChecked: boolean[]     // per-step checkbox state (12 steps)
}

export const useUiStore = defineStore('ui', {
  state: (): UiState => ({
    pendingHighlight: null,
    replayExpandedCellParams: [],
    replayProtocolOpen: false,
    protocolGuideOpen: false,
    protocolGuideChecked: Array(12).fill(false),
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

    toggleProtocolGuideStep(index: number) {
      this.protocolGuideChecked[index] = !this.protocolGuideChecked[index]
    },

  },
})
