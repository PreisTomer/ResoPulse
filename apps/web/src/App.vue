<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div id="layout" :class="layoutClass">
    <RouteLoadingBar />

    <!-- Auth pages: no chrome -->
    <template v-if="isAuthPage">
      <main>
        <RouterView />
      </main>
    </template>

    <!-- Marketing pages: NavBar shell + footer -->
    <template v-else-if="isMarketingPage">
      <NavBar />
      <main>
        <RouterView />
      </main>
      <footer class="app-footer">
        <div class="app-footer__row">
          <span class="app-footer__copy">{{ $t('nav.footerCopy') }}</span>
          <RouterLink :to="ROUTE.TERMS"   class="app-footer__link">{{ $t('nav.footerTerms') }}</RouterLink>
          <RouterLink :to="ROUTE.PRIVACY" class="app-footer__link">{{ $t('nav.footerPrivacy') }}</RouterLink>
        </div>
      </footer>
    </template>

    <!-- App pages: AppShell with sidebar + topbar (no separate footer; shell owns layout) -->
    <template v-else>
      <AppShell
        :is-signed-in="!!isSignedInBool"
        :active-campaign-name="campaignStore.activeCampaign?.name ?? ''"
        :active-molecule-short-label="campaignStore.activeMoleculeShortLabel"
        :active-molecule-category="campaignStore.activeMoleculeCategory"
        :active-module-progress="campaignStore.moduleProgress"
        @open-campaign-switcher="openSwitcher"
      />
    </template>

    <CampaignSwitcher
      v-if="switcherOpen"
      @close="switcherOpen = false"
      @open-wizard="openWizardFromSwitcher"
    />
    <CampaignWizard v-if="wizardOpen" @close="wizardOpen = false" />

    <TermsGate v-if="showTermsGate" @accepted="onTermsAccepted" />
  </div>
</template>

<script lang="ts">
import { defineComponent, watch } from 'vue'
import { useAuth } from '@clerk/vue'

import { mapStores } from 'pinia'

import NavBar from './components/NavBar/index.vue'
import TermsGate from '@/components/TermsGate/index.vue'
import RouteLoadingBar from '@/components/RouteLoadingBar.vue'
import AppShell from '@/components/AppShell/index.vue'
import CampaignSwitcher from '@/components/CampaignSwitcher/index.vue'
import CampaignWizard from '@/components/CampaignWizard/index.vue'

import { useThemeStore } from './stores/themeStore'
import { useAuthStore } from './stores/authStore'
import { useUserPresetsStore } from './stores/userPresetsStore'
import { useCellCalibrationStore } from './stores/cellCalibrationStore'
import { useProductionCampaignStore } from './stores/productionCampaignStore'

import { ROUTE } from './constants/routes'
import { STORAGE_KEY } from './constants/storageKeys'

const MARKETING_ROUTES: string[] = [ROUTE.HOME, ROUTE.TERMS, ROUTE.PRIVACY]
const AUTH_ROUTES:      string[] = [ROUTE.SIGN_IN, ROUTE.SIGN_UP, ROUTE.ONBOARDING]

export default defineComponent({
  components: { NavBar, TermsGate, RouteLoadingBar, AppShell, CampaignSwitcher, CampaignWizard },

  setup() {
    const authStore        = useAuthStore()
    const userPresetsStore = useUserPresetsStore()
    const calibrationStore = useCellCalibrationStore()
    const { isLoaded, isSignedIn, orgId } = useAuth()

    watch(
      [isLoaded, isSignedIn, orgId],
      ([loaded, signedIn, oid]) => {
        if (!loaded) return
        authStore.syncFromClerk(!!signedIn, !!oid)
        if (authStore.isClerkLoading) authStore.setClerkLoaded()

        if (signedIn && oid) {
          userPresetsStore.fetchAll()
          calibrationStore.fetchAll()
        } else {
          calibrationStore.reset()
          userPresetsStore.fetchAll()
        }
      },
      { immediate: true },
    )

    return { themeStore: useThemeStore(), isSignedInBool: isSignedIn }
  },

  data() {
    return {
      termsAccepted: localStorage.getItem(STORAGE_KEY.TERMS_ACCEPTED) === '1',
      switcherOpen:  false,
      wizardOpen:    false,
    }
  },

  computed: {
    ...mapStores(useProductionCampaignStore),
    ROUTE() { return ROUTE },

    campaignStore() { return this.productionCampaignStore },

    isAuthPage(): boolean {
      return AUTH_ROUTES.some(p => this.$route.path.startsWith(p))
    },

    isMarketingPage(): boolean {
      return MARKETING_ROUTES.some(p => this.$route.path === p)
    },

    layoutClass(): string {
      if (this.isAuthPage)      return 'layout--auth'
      if (this.isMarketingPage) return 'layout--marketing'
      return 'layout--app'
    },

    showTermsGate(): boolean {
      // Terms gate triggers when entering the workspace (campaigns landing) without accepting.
      return !this.termsAccepted && this.$route.path === ROUTE.CAMPAIGNS
    },
  },

  mounted() {
    this.themeStore.init()
  },

  methods: {
    onTermsAccepted() {
      this.termsAccepted = true
    },
    openSwitcher() {
      this.switcherOpen = true
    },
    openWizardFromSwitcher() {
      this.wizardOpen = true
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

.layout--app {
  // AppShell handles its own layout; main wrapper not used in this mode
  display: block;
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
}
</style>
