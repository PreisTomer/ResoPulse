// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// Named route paths — use these everywhere instead of hardcoded path strings.
export const ROUTE = {
  HOME:        '/',
  EXPERIMENT:  '/experiment',
  DATASETS:    '/datasets',
  REPORTS:     '/reports',
  PROTOCOL:    '/protocol',
  INSTRUMENT:  '/instrument',
  TERMS:       '/terms',
  PRIVACY:     '/privacy',
  SIGN_IN:     '/sign-in',
  SIGN_UP:     '/sign-up',
  ONBOARDING:  '/onboarding',
  ACCOUNT:     '/account',
  PROFILE:     '/profile',
} as const

// Routes that require an authenticated user session with an active organisation.
// Home is included so a freshly signed-in user without an org lands on onboarding.
export const PROTECTED_ROUTES: string[] = [
  ROUTE.HOME,
  ROUTE.EXPERIMENT,
  ROUTE.DATASETS,
  ROUTE.REPORTS,
  ROUTE.INSTRUMENT,
]
