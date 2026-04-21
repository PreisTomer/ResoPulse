<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div id="layout">
    <RouteLoadingBar />
    <template v-if="!isAuthPage">
      <NavBar />
      <ModeBanner />
      <LiteratureStrip v-if="$route.path === ROUTE.HOME" />
    </template>
    <main>
      <RouterView />
    </main>
    <ProtocolGuidePanel v-if="isGuidePanelVisible" />
    <TermsGate v-if="showTermsGate" @accepted="onTermsAccepted" />
    <footer class="app-footer">
      <div class="app-footer__row">
        <span class="app-footer__copy">{{ $t('nav.footerCopy') }}</span>
        <RouterLink :to="ROUTE.TERMS" class="app-footer__link">{{ $t('nav.footerTerms') }}</RouterLink>
        <RouterLink :to="ROUTE.PRIVACY" class="app-footer__link">{{ $t('nav.footerPrivacy') }}</RouterLink>
      </div>
      <p class="app-footer__ip">{{ $t('nav.footerIp') }}</p>
    </footer>
  </div>
</template>

<script lang="ts">
import { defineComponent, watch } from 'vue'
import { useAuth } from '@clerk/vue'

import NavBar from './components/NavBar/index.vue'
import ModeBanner from '@/components/ModeBanner/index.vue'
import LiteratureStrip from '@/components/LiteratureStrip/index.vue'
import TermsGate from '@/components/TermsGate/index.vue'
import RouteLoadingBar from '@/components/RouteLoadingBar.vue'
import ProtocolGuidePanel from './components/ExperimentLab/ProtocolGuidePanel.vue'

import { useThemeStore } from './stores/themeStore'
import { useAuthStore } from './stores/authStore'
import { useTokenStore } from './stores/tokenStore'
import { useUserPresetsStore } from './stores/userPresetsStore'

import { ROUTE } from './constants/routes'
import { STORAGE_KEY } from './constants/storageKeys'

export default defineComponent({
  components: { NavBar, ModeBanner, LiteratureStrip, TermsGate, RouteLoadingBar, ProtocolGuidePanel },

  setup() {
    const authStore              = useAuthStore()
    const tokenStore             = useTokenStore()
    const userPresetsStore       = useUserPresetsStore()
    const { isLoaded, isSignedIn, orgId } = useAuth()

    // Keep authStore in sync with Clerk's reactive state.
    // isLoaded becomes true once Clerk has resolved the initial session check —
    // only then is it safe for the router guard to read auth state.
    watch(
      [isLoaded, isSignedIn, orgId],
      ([loaded, signedIn, oid]) => {
        if (!loaded) return
        authStore.syncFromClerk(!!signedIn, !!oid)
        if (authStore.isClerkLoading) authStore.setClerkLoaded()

        // Fetch token balance and cell library as soon as auth state resolves.
        // startPolling() and fetchAll() are idempotent — safe on every state change.
        if (signedIn && oid) {
          tokenStore.fetchBalance()
          tokenStore.startPolling()
          userPresetsStore.fetchAll()
        } else {
          tokenStore.reset()
          // Load guest presets from localStorage if not signed in
          userPresetsStore.fetchAll()
        }
      },
      { immediate: true },
    )

    return { themeStore: useThemeStore() }
  },

  data() {
    return {
      termsAccepted: localStorage.getItem(STORAGE_KEY.TERMS_ACCEPTED) === '1',
    }
  },

  computed: {
    ROUTE() { return ROUTE },

    isAuthPage(): boolean {
      const authPaths: string[] = [ROUTE.SIGN_IN, ROUTE.SIGN_UP, ROUTE.ONBOARDING]
      return authPaths.some(p => this.$route.path.startsWith(p))
    },

    showTermsGate(): boolean {
      return !this.termsAccepted && this.$route.path === ROUTE.EXPERIMENT
    },

    showGuidePanel(): boolean {
      return ([ROUTE.EXPERIMENT, ROUTE.INSTRUMENT, ROUTE.REPORTS] as string[]).includes(this.$route.path)
    },

    isGuidePanelVisible(): boolean {
      return this.showGuidePanel && !this.isAuthPage
    },
  },

  mounted() {
    this.themeStore.init()
  },

  methods: {
    onTermsAccepted() {
      this.termsAccepted = true
    },
  },
})
</script>

<style lang="scss" scoped>
#layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.app-footer {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  padding: 0.65rem 1.5rem 0.75rem;
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
  flex-shrink: 0;

  &__row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1.5rem;
  }

  &__copy {
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-text-muted);
    opacity: var(--op-muted);
  }

  &__link {
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-primary);
    text-decoration: none;
    opacity: var(--op-dim);
    transition: opacity var(--tr-fast);

    &:hover { opacity: 1; }
  }

  &__ip {
    font-family: var(--font-mono);
    font-size: 0.6rem; // deliberate sub-scale micro-size for legal notice
    letter-spacing: 0.04em;
    color: var(--color-text-muted);
    opacity: var(--op-ghost);
    text-align: center;
    width: 100%;
    margin: 0;
    line-height: 1.5;
    padding: 0 1rem;
    box-sizing: border-box;
  }
}
</style>
