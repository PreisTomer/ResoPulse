// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// App-level auth state that complements Clerk's internal session management.
// Tracks onboarding status and org context that Clerk does not own directly.

import { defineStore } from 'pinia'

export interface AuthState {
  /** Whether the user has completed the "create your first lab" onboarding step. */
  hasCompletedOnboarding: boolean
  /** Clerk orgId of the currently active organization, null if none selected. */
  activeOrgId: string | null
  /** True while we are waiting for the Clerk SDK to finish loading. */
  isClerkLoading: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    hasCompletedOnboarding: false,
    activeOrgId:            null,
    isClerkLoading:         true,
  }),

  getters: {
    /** True once Clerk has resolved its initial session check. */
    isReady: (state): boolean => !state.isClerkLoading,
  },

  actions: {
    /** Called once Clerk finishes loading its session. */
    setClerkLoaded(): void {
      this.isClerkLoading = false
    },

    /** Marks onboarding as complete (persisted to localStorage via Clerk user metadata in production). */
    completeOnboarding(): void {
      this.hasCompletedOnboarding = true
    },

    /** Updates the active org reference when the user switches organizations. */
    setActiveOrg(orgId: string | null): void {
      this.activeOrgId = orgId
    },
  },

  persist: true,
})
