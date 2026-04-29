// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// ScriptFactory produces ReplayScript at click-time so each step closes over live stores, avoiding circular imports.

export interface ReplayStep {
  /** DOM element id to scroll-into-view and pulse-highlight. */
  highlightId: string
  /** Zero-argument thunk that mutates the store for this step. */
  action: () => void
  /** i18n key for the progress pill label shown during playback. */
  labelKey: string
  /** Milliseconds to wait after the highlight animation before the next step fires. */
  delayMs: number
}

export interface ReplayScript {
  /** Unique identifier for this workflow — used to avoid double-loading. */
  id: string
  /** i18n key: abbreviated paper title shown on the home section card. */
  titleKey: string
  /** i18n key: authors, journal, year citation string. */
  authorsKey: string
  /** i18n key: category badge label (e.g. "CANCER", "VIRUS", "BACTERIA"). */
  categoryKey: string
  /** i18n key: one-line description of the published result used in the modal. */
  publishedResultKey: string
  /** i18n key: the key metric from the paper shown in the comparison banner. */
  publishedMetricKey: string
  /** DOM element id to highlight when the replay finishes. */
  resultHighlightId: string
  /** i18n key for the per-workflow agreement sentence shown after the result comparison. Overrides the global key. */
  resultAgreementKey?: string
  /**
   * Returns the live app result string for the comparison banner.
   * Called after all steps complete so values reflect the loaded state.
   */
  appResultGetter: () => string
  steps: ReplayStep[]
}

/**
 * Factory that wires live Pinia store references into a ReplayScript.
 * Must be called inside a component or store context where useCellStore() is valid.
 */
export type ScriptFactory = () => ReplayScript
