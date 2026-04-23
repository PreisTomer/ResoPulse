// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

/**
 * Centralised emit event name constants.
 * Use EMIT.* everywhere instead of raw string literals in $emit() calls and emits: [] declarations.
 */
export const EMIT = {
  // ── Modal / overlay lifecycle ──────────────────────────────────────────────
  CLOSE:    'close',
  CANCEL:   'cancel',
  SAVE:     'save',
  SAVED:    'saved',
  ACCEPTED: 'accepted',
  FEEDBACK: 'feedback',

  // ── Panel open/close ───────────────────────────────────────────────────────
  OPEN_CHANGE:   'open-change',
  WINDOW_CHANGE: 'window-change',

  // ── Cell card ──────────────────────────────────────────────────────────────
  STABLE_RESET:    'stable-reset',
  FULL_RESET:      'full-reset',
  THERMAL_LYSIS:   'thermal-lysis',
  RESET_TO_PRESET: 'reset-to-preset',
  PARAM_CHANGE:    'param-change',

  // ── Cell creation modal ────────────────────────────────────────────────────
  FIELD_CHANGE:     'field-change',
  CELL_TYPE_CHANGE: 'cell-type-change',
  SHOW_TIP:         'show-tip',

  // ── Experiment lab ─────────────────────────────────────────────────────────
  NOTES_TOGGLE:         'notes-toggle',
  LOAD_HEALTHY_PRESET:  'load-healthy-preset',
  LOAD_TARGET_PRESET:   'load-target-preset',
  SCROLL_TO_CELLS:      'scroll-to-cells',
  PICKER_OPENED:        'picker-opened',

  // ── Reports ────────────────────────────────────────────────────────────────
  DOWNLOAD: 'download',
  DISMISS:  'dismiss',
  SELECT:   'select',
  DELETE:   'delete',

  // ── Sweep panel ────────────────────────────────────────────────────────────
  EXPAND:     'expand',
  MAX_CHANGE: 'max-change',
  EXPORT:     'export',

  // ── Heatmap ────────────────────────────────────────────────────────────────
  HOVER_INFO_CHANGE: 'hover-info-change',
  OP_ZONE_CHANGE:    'op-zone-change',

  // ── Population panel ───────────────────────────────────────────────────────
  RESAMPLE:   'resample',
  REDRAW:     'redraw',
  EXPORT_CSV: 'export-csv',

  // ── Bridge setup modal ────────────────────────────────────────────────────
  COPY: 'copy',

  // ── Population panel v-model ───────────────────────────────────────────────
  UPDATE_N_CELLS:          'update:nCells',
  UPDATE_R_VARIANCE_PCT:   'update:rVariancePct',
  UPDATE_VTH_VARIANCE_PCT: 'update:vThVariancePct',
  UPDATE_NORMALIZE_CHART:  'update:normalizeChart',
} as const
