// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// All localStorage / sessionStorage keys used by the app.
// Single source of truth — prevents key drift across files.

export const STORAGE_KEY = {
  TERMS_ACCEPTED:       'rp_terms_v1',
  EXPERIMENT_SESSION:   'br-experiment',
  THEME:                'br-theme',
  USER_PRESETS:         'simbiotix_user_presets_v2',
  GUEST_ID:             'rp_guest_id',
  SEEN_RETRAIN_MODAL:   'rp_seen_retrain_modal',
  CSV_COLUMN_MAPPING:   'rp_csv_column_mapping_v1',
  CAMPAIGNS:            'rp_campaigns_v1',
  ACTIVE_CAMPAIGN_ID:   'rp_active_campaign_id_v1',
  APP_SHELL_SIDEBAR:    'simbiotix:appShell:sidebarCollapsed',
  DOWNSTREAM:           'rp_downstream_v1',
  LAB_RUNS:             'rp_lab_runs_v1',
  CLONES:               'rp_clones_v1',
  CALIBRATION:          'rp_calibration_v1',
} as const
