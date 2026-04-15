// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// App-level auth state that complements Clerk's internal session management.
// isSignedIn / hasOrg are kept in sync reactively from App.vue via useAuth().
// Only hasCompletedOnboarding is persisted — the rest is always sourced from Clerk on load.

import { defineStore } from 'pinia'

export interface AuthState {
  /** Whether the user has completed the "create your first lab" onboarding step. */
  hasCompletedOnboarding: boolean
  /** Whether the user has seen the protocol guide panel in the experiment lab. */
  hasSeenGuide: boolean
  /** True while App.vue has not yet received the first useAuth() isLoaded=true event. */
  isClerkLoading: boolean
  /** Mirrors useAuth().isSignedIn — updated reactively from App.vue. */
  isSignedIn: boolean
  /** True when the session has an active organisation (mirrors useAuth().orgId). */
  hasOrg: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    hasCompletedOnboarding: false,
    hasSeenGuide:           false,
    isClerkLoading:         true,
    isSignedIn:             false,
    hasOrg:                 false,
  }),

  getters: {
    /**
     * True when Clerk has finished loading and the user is not signed in.
     * This covers both new visitors and users who chose "Try the Lab" as a guest.
     */
    isGuest(): boolean {
      return !this.isClerkLoading && !this.isSignedIn
    },
  },

  actions: {
    /** Called once the useAuth() isLoaded watcher fires true in App.vue. */
    setClerkLoaded(): void {
      this.isClerkLoading = false
    },

    /** Marks onboarding as complete. */
    completeOnboarding(): void {
      this.hasCompletedOnboarding = true
    },

    /** Marks the protocol guide as seen so it is not auto-opened again. */
    markGuideSeen(): void {
      this.hasSeenGuide = true
    },

    /**
     * Syncs Clerk's reactive auth state into the store.
     * Called by the App.vue watcher whenever useAuth() values change.
     */
    syncFromClerk(isSignedIn: boolean, hasOrg: boolean): void {
      this.isSignedIn = isSignedIn
      this.hasOrg     = hasOrg
    },
  },

  // Only persist onboarding/guide flags — auth state is always re-derived from Clerk on load.
  persist: {
    pick: ['hasCompletedOnboarding', 'hasSeenGuide'],
  },
})
