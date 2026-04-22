// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// Mirrors Clerk session reactively; only hasCompletedOnboarding persists locally.

import { defineStore } from 'pinia'

export interface AuthState {
  hasCompletedOnboarding: boolean  // persisted; true after "create your first lab"
  hasSeenGuide:           boolean  // persisted; suppresses auto-open of protocol guide
  isClerkLoading:         boolean  // true until first useAuth() isLoaded=true fires
  isSignedIn:             boolean  // mirrors useAuth().isSignedIn, updated from App.vue
  hasOrg:                 boolean  // mirrors useAuth().orgId !== null
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
    // Covers both new visitors and users who entered the lab as a guest.
    isGuest(): boolean { return !this.isClerkLoading && !this.isSignedIn },
  },

  actions: {
    // Called once in App.vue after the useAuth() isLoaded watcher fires.
    setClerkLoaded(): void { this.isClerkLoading = false },

    completeOnboarding(): void { this.hasCompletedOnboarding = true },
    markGuideSeen():      void { this.hasSeenGuide           = true },

    // Syncs Clerk's reactive auth into the store — called by App.vue watcher on every change.
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
