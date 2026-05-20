<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="app-shell">
    <AppTopBar
      :is-signed-in="isSignedIn"
      :mobile-menu-open="mobileMenuOpen"
      :active-campaign-name="activeCampaignName"
      :active-molecule-short-label="activeMoleculeShortLabel"
      :active-molecule-category="activeMoleculeCategory"
      :active-module-progress="activeModuleProgress"
      @toggle-mobile-menu="toggleMobileMenu"
      @open-campaign-switcher="openCampaignSwitcher"
    />

    <div class="app-shell__body">
      <AppSidebar
        :collapsed="sidebarCollapsed"
        :mobile-open="mobileMenuOpen"
        @toggle-collapsed="toggleSidebarCollapsed"
        @link-click="closeMobileMenu"
      />

      <div
        v-if="mobileMenuOpen"
        class="app-shell__mobile-overlay"
        @click="closeMobileMenu"
      ></div>

      <main class="app-shell__main">
        <router-view v-slot="{ Component }">
          <transition name="app-shell-fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </main>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import AppTopBar from './AppTopBar.vue'
import AppSidebar from './AppSidebar.vue'

const STORAGE_KEY_SIDEBAR_COLLAPSED = 'simbiotix:appShell:sidebarCollapsed'

interface ProgressStep {
  module:  string
  done:    boolean
  current: boolean
}

export default defineComponent({
  name: 'AppShell',
  components: { AppTopBar, AppSidebar },
  props: {
    isSignedIn:                { type: Boolean, default: false },
    activeCampaignName:        { type: String, default: '' },
    activeMoleculeShortLabel:  { type: String, default: '' },
    activeMoleculeCategory:    { type: String, default: 'other' },
    activeModuleProgress:      { type: Array as () => ProgressStep[], default: () => [] },
  },
  emits: ['openCampaignSwitcher'],
  data() {
    return {
      sidebarCollapsed: loadCollapsedState(),
      mobileMenuOpen:   false,
    }
  },
  methods: {
    toggleSidebarCollapsed(): void {
      this.sidebarCollapsed = !this.sidebarCollapsed
      persistCollapsedState(this.sidebarCollapsed)
    },
    toggleMobileMenu(): void {
      this.mobileMenuOpen = !this.mobileMenuOpen
    },
    closeMobileMenu(): void {
      this.mobileMenuOpen = false
    },
    openCampaignSwitcher(): void {
      this.$emit('openCampaignSwitcher')
    },
  },
})

function loadCollapsedState(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY_SIDEBAR_COLLAPSED) === '1'
  } catch {
    return false
  }
}

function persistCollapsedState(collapsed: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY_SIDEBAR_COLLAPSED, collapsed ? '1' : '0')
  } catch {
    // localStorage unavailable (private browsing or quota); ignore
  }
}
</script>

<style lang="scss" scoped>
.app-shell {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: var(--color-bg);

  &__body {
    display: flex;
    flex: 1;
    position: relative;
  }

  &__mobile-overlay {
    display: none;
    position: fixed;
    top: 56px;
    left: 0;
    right: 0;
    bottom: 0;
    background: color-mix(in srgb, black 50%, transparent);
    z-index: 99;

    @media (max-width: 768px) {
      display: block;
    }
  }

  &__main {
    flex: 1;
    min-width: 0;
    // clip (not hidden) so we still bound horizontal overflow without creating a
    // scroll container, which would break position:sticky for descendant views.
    overflow-x: clip;
  }
}

.app-shell-fade-enter-active,
.app-shell-fade-leave-active {
  transition: opacity 120ms ease;
}

.app-shell-fade-enter-from,
.app-shell-fade-leave-to {
  opacity: 0;
}
</style>
