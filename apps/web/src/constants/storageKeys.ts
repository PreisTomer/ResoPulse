// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// All localStorage / sessionStorage keys used by the app.
// Single source of truth — prevents key drift across files.

export const STORAGE_KEY = {
  TERMS_ACCEPTED:     'rp_terms_v1',
  EXPERIMENT_SESSION: 'br-experiment',
  THEME:              'br-theme',
  USER_PRESETS:       'resopulse_user_presets_v2',
  GUEST_ID:           'rp_guest_id',
  SEEN_RETRAIN_MODAL: 'rp_seen_retrain_modal',
  CSV_COLUMN_MAPPING: 'rp_csv_column_mapping_v1',
} as const
