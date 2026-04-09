<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div id="layout">
    <template v-if="!isAuthPage">
      <NavBar />
      <ModeBanner />
      <LiteratureStrip v-if="$route.path === ROUTE.HOME" />
    </template>
    <main>
      <RouterView />
    </main>
    <ProtocolGuidePanel v-if="showGuidePanel && !isAuthPage" />
    <TermsGate v-if="showTermsGate" @accepted="onTermsAccepted" />
    <footer class="app-footer">
      <span class="app-footer__copy">© 2026 Tomer Preis. All rights reserved.</span>
      <RouterLink :to="ROUTE.TERMS" class="app-footer__link">Terms of Use</RouterLink>
    </footer>
  </div>
</template>

<script lang="ts">
import { defineComponent, watch } from 'vue'
import { useAuth } from '@clerk/vue'

import NavBar from './components/NavBar.vue'
import ModeBanner from './components/ModeBanner.vue'
import LiteratureStrip from './components/LiteratureStrip.vue'
import TermsGate from './components/TermsGate.vue'
import ProtocolGuidePanel from './components/ExperimentLab/ProtocolGuidePanel.vue'

import { useThemeStore } from './stores/themeStore'
import { useAuthStore } from './stores/authStore'

import { ROUTE } from './constants/routes'

const TERMS_KEY = 'rp_terms_v1'

export default defineComponent({
  components: { NavBar, ModeBanner, LiteratureStrip, TermsGate, ProtocolGuidePanel },

  setup() {
    const authStore             = useAuthStore()
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
      },
      { immediate: true },
    )

    return { themeStore: useThemeStore() }
  },

  data() {
    return {
      termsAccepted: localStorage.getItem(TERMS_KEY) === '1',
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
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  padding: 0.65rem 1.5rem;
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
  flex-shrink: 0;

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
}
</style>
