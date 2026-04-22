// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { watch } from 'vue'
import { createRouter, createWebHistory } from 'vue-router'

import { ROUTE } from '@/constants/routes'
import { useAuthStore } from '@/stores/authStore'
import { startRouteLoading, stopRouteLoading } from '@/utils/routeLoading'

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: ROUTE.HOME,        component: () => import('../views/HomeView/index.vue') },
    { path: ROUTE.EXPERIMENT,  component: () => import('@/views/ExperimentView/index.vue') },
    { path: ROUTE.EXPERIMENTS, component: () => import('../views/ExperimentsView/index.vue'),   meta: { requiresAuth: true } },
    { path: ROUTE.DATASETS,    component: () => import('../views/DataSetsView/index.vue'),      meta: { requiresAuth: true } },
    { path: ROUTE.REPORTS,     component: () => import('../views/ReportsView/index.vue'),       meta: { requiresAuth: true } },
    { path: ROUTE.PROTOCOL,    component: () => import('../views/ProtocolView/index.vue') },
    { path: ROUTE.INSTRUMENT,  component: () => import('@/views/InstrumentView/index.vue'),          meta: { requiresAuth: true } },
    { path: ROUTE.PRICING,     component: () => import('@/views/PricingView/index.vue') },
    { path: ROUTE.TERMS,       component: () => import('@/views/TermsView/index.vue') },
    { path: ROUTE.PRIVACY,     component: () => import('@/views/PrivacyView/index.vue') },
    { path: ROUTE.SIGN_IN,                         component: () => import('../views/SignInView/index.vue'),  meta: { guestOnly: true } },
    // Sub-paths Clerk needs for OAuth callbacks, MFA, and email verification.
    // No guestOnly — the user may already be partially authenticated at these points.
    { path: '/sign-in/sso-callback',              component: () => import('../views/SignInView/index.vue') },
    { path: '/sign-in/factor-one',                component: () => import('../views/SignInView/index.vue') },
    { path: '/sign-in/factor-two',                component: () => import('../views/SignInView/index.vue') },
    { path: '/sign-in/tasks/choose-organization', component: () => import('../views/SignInView/index.vue') },
    { path: ROUTE.SIGN_UP,                         component: () => import('../views/SignUpView/index.vue'),  meta: { guestOnly: true } },
    { path: '/sign-up/sso-callback',              component: () => import('../views/SignUpView/index.vue') },
    { path: '/sign-up/continue',                  component: () => import('../views/SignUpView/index.vue') },
    { path: '/sign-up/verify-email-address',      component: () => import('../views/SignUpView/index.vue') },
    { path: '/sign-up/tasks/choose-organization', component: () => import('../views/SignUpView/index.vue') },
    { path: ROUTE.ONBOARDING,  component: () => import('../views/OnboardingView/index.vue'),   meta: { requiresAuth: true } },
    { path: ROUTE.ACCOUNT,     component: () => import('../views/AccountView/index.vue'),      meta: { requiresAuth: true } },
    // Clerk's hosted profile page is at /profile — we just redirect to User.profile in Clerk
    { path: ROUTE.PROFILE,     redirect: ROUTE.HOME },
  ],
})

// Auth via authStore (App.vue mirrors Clerk's useAuth); avoids window.Clerk reads during async init.

/**
 * Blocks until App.vue's useAuth() watcher has fired with isLoaded=true.
 * Uses Vue's watch on the Pinia store so no polling is needed.
 */
function waitForClerkLoaded(): Promise<void> {
  const store = useAuthStore()
  if (!store.isClerkLoading) return Promise.resolve()

  return new Promise<void>(resolve => {
    const stop = watch(
      () => store.isClerkLoading,
      (loading) => { if (!loading) { stop(); resolve() } },
    )
  })
}

// Route-loading indicator — fires BEFORE the auth guard so the bar appears immediately.
// The utility adds a 150 ms grace period internally, so instant navigations do not flash it.
router.beforeEach(() => {
  startRouteLoading()
  return true
})

router.afterEach(stopRouteLoading)
router.onError(stopRouteLoading)

router.beforeEach(async (to, from) => {
  await waitForClerkLoaded()

  const authStore   = useAuthStore()
  const { isSignedIn } = authStore

  // Signed-in user landing on a guest-only page → go to home.
  if (to.meta.guestOnly && isSignedIn) {
    return { path: ROUTE.HOME }
  }

  // Unauth → sign-in (preserve redirect). Abort only if user is mid sign-in/sign-up to dodge Clerk's OAuth rate-limit loop.
  if (to.meta.requiresAuth && !isSignedIn) {
    const isAlreadyInAuthFlow = from.path.startsWith(ROUTE.SIGN_IN) || from.path.startsWith(ROUTE.SIGN_UP)
    const isNavigatingToAuthRoute = to.path.startsWith(ROUTE.SIGN_IN) || to.path.startsWith(ROUTE.SIGN_UP)
    if (isAlreadyInAuthFlow && isNavigatingToAuthRoute) return false
    const redirectQuery = to.path === ROUTE.HOME ? {} : { redirect: to.fullPath }
    return { path: ROUTE.SIGN_IN, query: redirectQuery }
  }

  // Signed-in user who has completed onboarding trying to access it again → lab.
  if (to.path === ROUTE.ONBOARDING && isSignedIn && authStore.hasCompletedOnboarding) {
    return { path: ROUTE.EXPERIMENT }
  }
})

export default router
