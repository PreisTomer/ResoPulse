// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { defineStore } from 'pinia'

import { scrollAndHighlight } from '@/utils/highlight'
import { useUiStore } from '@/stores/uiStore'

import type { ReplayScript } from '@/types/replay'

interface ReplayState {
  /** Script queued by the home-page section; cleared once the executor picks it up. */
  pendingScript: ReplayScript | null
  /** Script currently executing — kept so skip() and the overlay can reference it. */
  activeScript: ReplayScript | null
  /** True while the step-by-step animation is running inside ExperimentView. */
  isReplaying: boolean
  /** Index of the step currently executing (0-based). */
  currentStepIndex: number
  /** Total number of steps in the active script (set when playback begins). */
  totalSteps: number
  /** i18n key of the label for the step currently visible in the progress pill. */
  currentLabelKey: string
  /** True after all steps complete — shows the comparison banner. */
  isComplete: boolean
  /** The live app-result string computed at completion (e.g. "TI = 1.13"). */
  appResultString: string
  /** Active timeout handle so skip() can cancel a pending step. */
  _stepTimer: ReturnType<typeof setTimeout> | null
}

export const useReplayStore = defineStore('replay', {
  state: (): ReplayState => ({
    pendingScript:    null,
    activeScript:     null,
    isReplaying:      false,
    currentStepIndex: 0,
    totalSteps:       0,
    currentLabelKey:  '',
    isComplete:       false,
    appResultString:  '',
    _stepTimer:       null,
  }),

  getters: {
    hasPendingScript: (state): boolean => state.pendingScript !== null,
    progressLabel: (state): string => state.currentLabelKey,
  },

  actions: {
    /** Called from the home-page ValidateModal when user confirms "Replicate in Lab". */
    setPendingScript(script: ReplayScript) {
      this.pendingScript    = script
      this.isReplaying      = false
      this.isComplete       = false
      this.currentStepIndex = 0
      this.appResultString  = ''
    },

    /**
     * Called from ExperimentView.mounted() when a pendingScript is detected.
     * Executes each step in sequence: fires the action, highlights the element,
     * then waits step.delayMs before advancing to the next step.
     */
    startReplay() {
      const script = this.pendingScript
      if (!script) return
      this.pendingScript    = null
      this.activeScript     = script
      this.isReplaying      = true
      this.isComplete       = false
      this.totalSteps       = script.steps.length
      this.currentStepIndex = 0
      this.executeStep(script, 0)
    },

    executeStep(script: ReplayScript, index: number) {
      if (index >= script.steps.length) {
        this.finishReplay(script)
        return
      }

      const step = script.steps[index]!
      this.currentStepIndex = index
      this.currentLabelKey  = step.labelKey

      step.action()
      scrollAndHighlight(step.highlightId)

      this._stepTimer = setTimeout(() => {
        this._stepTimer = null
        this.executeStep(script, index + 1)
      }, step.delayMs)
    },

    finishReplay(script: ReplayScript) {
      this.appResultString = script.appResultGetter()
      this.isReplaying     = false
      this.isComplete      = true
      scrollAndHighlight(script.resultHighlightId)
    },

    /**
     * Skip remaining animation steps and jump straight to the result.
     * Preserves all store state set so far — only cancels the pending timer.
     * Uses activeScript so the overlay component does not need to carry a reference.
     */
    skipToResult() {
      const script = this.activeScript
      if (!script) return
      if (this._stepTimer !== null) {
        clearTimeout(this._stepTimer)
        this._stepTimer = null
      }
      // Apply all remaining step actions instantly without highlights.
      for (let i = this.currentStepIndex + 1; i < script.steps.length; i++) {
        script.steps[i]!.action()
      }
      this.finishReplay(script)
    },

    dismiss() {
      if (this._stepTimer !== null) {
        clearTimeout(this._stepTimer)
        this._stepTimer = null
      }
      this.isReplaying      = false
      this.isComplete       = false
      this.pendingScript    = null
      this.activeScript     = null
      this.currentStepIndex = 0
      this.currentLabelKey  = ''
      this.appResultString  = ''
      // Release any replay-forced panel expansions in cell cards
      useUiStore().clearReplayExpandedPanels()
    },
  },
})
