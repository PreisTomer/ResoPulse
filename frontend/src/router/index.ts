// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { createRouter, createWebHistory } from 'vue-router'

import { ROUTE, PROTECTED_ROUTES } from '@/constants/routes'

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: ROUTE.HOME,        component: () => import('../views/HomeView/index.vue'),            meta: { requiresAuth: true } },
    { path: ROUTE.EXPERIMENT,  component: () => import('../views/ExperimentView.vue'),          meta: { requiresAuth: true } },
    { path: ROUTE.DATASETS,    component: () => import('../views/DataSetsView/index.vue'),      meta: { requiresAuth: true } },
    { path: ROUTE.REPORTS,     component: () => import('../views/ReportsView/index.vue'),       meta: { requiresAuth: true } },
    { path: ROUTE.PROTOCOL,    component: () => import('../views/ProtocolView/index.vue') },
    { path: ROUTE.INSTRUMENT,  component: () => import('../views/InstrumentView.vue'),          meta: { requiresAuth: true } },
    { path: ROUTE.TERMS,       component: () => import('../views/TermsView.vue') },
    { path: ROUTE.SIGN_IN,                         component: () => import('../views/SignInView/index.vue'),  meta: { guestOnly: true } },
    // Sub-paths Clerk needs for OAuth callbacks, MFA, and email verification.
    // No guestOnly — the user may already be partially authenticated at these points.
    { path: '/sign-in/sso-callback',              component: () => import('../views/SignInView/index.vue') },
    { path: '/sign-in/factor-one',                component: () => import('../views/SignInView/index.vue') },
    { path: '/sign-in/factor-two',                component: () => import('../views/SignInView/index.vue') },
    { path: ROUTE.SIGN_UP,                         component: () => import('../views/SignUpView/index.vue'),  meta: { guestOnly: true } },
    { path: '/sign-up/sso-callback',              component: () => import('../views/SignUpView/index.vue') },
    { path: '/sign-up/continue',                  component: () => import('../views/SignUpView/index.vue') },
    { path: '/sign-up/verify-email-address',      component: () => import('../views/SignUpView/index.vue') },
    { path: ROUTE.ONBOARDING,  component: () => import('../views/OnboardingView/index.vue'),   meta: { requiresAuth: true } },
    // Clerk's hosted profile page is at /profile — we just redirect to User.profile in Clerk
    { path: ROUTE.PROFILE,     redirect: ROUTE.HOME },
  ],
})

// ── Navigation guard ───────────────────────────────────────────────────────
// Uses window.Clerk (set by @clerk/vue's clerkPlugin) for auth state.
// Clerk loads asynchronously; we wait until it is ready before gating routes.

router.beforeEach(async (to) => {
  // Wait for Clerk to initialise before making any auth decision.
  if (typeof window !== 'undefined' && window.Clerk) {
    await window.Clerk.load()
  }

  const isSignedIn = Boolean(window.Clerk?.user)

  // Signed-in user landing on a guest-only page → go to experiment lab.
  if (to.meta.guestOnly && isSignedIn) {
    return { path: ROUTE.EXPERIMENT }
  }

  // Unauthenticated user hitting any protected route (including /) → sign-in,
  // preserving the intended destination so we can redirect back after login.
  if (to.meta.requiresAuth && !isSignedIn) {
    // Do not add a redirect query param for the home route — sign-in is the natural next step.
    const redirectQuery = to.path === ROUTE.HOME ? {} : { redirect: to.fullPath }
    return { path: ROUTE.SIGN_IN, query: redirectQuery }
  }

  // Signed-in user without an org hitting any protected route → onboarding.
  if (isSignedIn && PROTECTED_ROUTES.includes(to.path)) {
    const hasOrg = (window.Clerk?.user?.organizationMemberships?.length ?? 0) > 0
    if (!hasOrg && to.path !== ROUTE.ONBOARDING) {
      return { path: ROUTE.ONBOARDING }
    }
  }
})

export default router
