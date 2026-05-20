// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Named route paths — use these everywhere instead of hardcoded path strings.
export const ROUTE = {
  // Marketing / public
  HOME:    '/',
  TERMS:   '/terms',
  PRIVACY: '/privacy',

  // Auth
  SIGN_IN:    '/sign-in',
  SIGN_UP:    '/sign-up',
  ONBOARDING: '/onboarding',
  ACCOUNT:    '/account',
  PROFILE:    '/profile',

  // Workspaces — where the user does design work
  CAMPAIGNS:        '/campaigns',
  CELL_ENGINEERING: '/cell-engineering',
  CLONE_UPSTREAM:   '/clone-upstream',
  DOWNSTREAM:       '/downstream',
  LAB_RUNS:         '/lab-runs',

  // Knowledge — where the user references and learns
  LIBRARY: '/library',
  METHODS: '/methods',
  REPORTS: '/reports',

  // Setup
  INSTRUMENT_HUB: '/instrument-hub',

  // Legacy EP route keys — alias to new bioproduction paths during pivot transition; remove once all consumers migrated
  EXPERIMENT:  '/cell-engineering',
  EXPERIMENTS: '/campaigns',
  DATASETS:    '/library',
  PROTOCOL:    '/methods',
  INSTRUMENT:  '/instrument-hub',
} as const
