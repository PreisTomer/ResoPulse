<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <header class="app-topbar">
    <div class="app-topbar__left">
      <button
        class="app-topbar__hamburger"
        :aria-label="mobileMenuOpen ? $t('nav.closeMenu') : $t('nav.openMenu')"
        @click="$emit('toggleMobileMenu')"
      >
        <span :class="{ 'app-topbar__hamburger-icon--open': mobileMenuOpen }">{{ ICON.MENU }}</span>
      </button>

      <RouterLink :to="ROUTE.HOME" class="app-topbar__brand">
        <span class="app-topbar__brand-logo">
          <img src="/logo.png" :alt="$t('nav.logoAlt')" />
        </span>
        <span class="app-topbar__brand-name">Sim<span class="app-topbar__brand-accent">Biotix</span></span>
      </RouterLink>
    </div>

    <div class="app-topbar__center">
      <ActiveCampaignIndicator
        :campaign-name="activeCampaignName"
        :molecule-short-label="activeMoleculeShortLabel"
        :category-class="activeMoleculeCategory"
        :module-progress="activeModuleProgress"
        @open="$emit('openCampaignSwitcher')"
      />
    </div>

    <div class="app-topbar__right">
      <NavUserArea v-if="isSignedIn" />
    </div>
  </header>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { ROUTE } from '@/constants/routes'
import { ICON } from '@/constants/icons'

import NavUserArea from '@/components/NavUserArea/index.vue'
import ActiveCampaignIndicator from './ActiveCampaignIndicator.vue'

interface ProgressStep {
  module:  string
  done:    boolean
  current: boolean
}

export default defineComponent({
  name: 'AppTopBar',
  components: { NavUserArea, ActiveCampaignIndicator },
  props: {
    isSignedIn:                { type: Boolean, default: false },
    mobileMenuOpen:            { type: Boolean, default: false },
    activeCampaignName:        { type: String, default: '' },
    activeMoleculeShortLabel:  { type: String, default: '' },
    activeMoleculeCategory:    { type: String, default: 'other' },
    activeModuleProgress:      { type: Array as () => ProgressStep[], default: () => [] },
  },
  emits: ['toggleMobileMenu', 'openCampaignSwitcher'],
  computed: {
    ROUTE() { return ROUTE },
    ICON()  { return ICON },
  },
})
</script>

<style lang="scss" scoped>
.app-topbar {
  height: 56px;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  padding: 0 1rem;
  background: var(--color-bg);
  border-bottom: 1px solid color-mix(in srgb, var(--color-text) 8%, transparent);
  position: sticky;
  top: 0;
  z-index: 50;

  &__left {
    @include flex-row(0.75rem);
    justify-self: start;
  }

  &__center {
    @include inline-flex-center;
    justify-self: center;
  }

  &__right {
    @include flex-row(0.5rem);
    justify-self: end;
  }

  &__hamburger {
    background: transparent;
    border: none;
    color: var(--color-text);
    font-size: 1.4rem;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius);
    display: none;
    transition: background var(--tr-fast);

    &:hover {
      background: color-mix(in srgb, var(--color-text) 6%, transparent);
    }

    @media (max-width: 768px) {
      display: block;
    }
  }

  &__hamburger-icon--open {
    transform: rotate(90deg);
    display: inline-block;
    transition: transform var(--tr-normal);
  }

  &__brand {
    @include flex-row(0.6rem);
    text-decoration: none;
    color: var(--color-text);

    &-logo {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      overflow: hidden;
      flex-shrink: 0;
      outline: 1.5px solid var(--color-border);
      background-color: var(--color-bg);

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transform: scale(1.7); // crop the logo PNG's baked-in margin
        display: block;
      }
    }

    &-name {
      font-weight: 600;
      font-size: 1.05rem;
    }

    &-accent {
      color: var(--color-primary);
    }
  }

  @media (max-width: 768px) {
    &__center {
      display: none;
    }

    grid-template-columns: 1fr auto;
  }
}
</style>
