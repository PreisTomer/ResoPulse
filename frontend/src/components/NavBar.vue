<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <header class="nav-bar">
    <div class="nav-bar__inner">

      <RouterLink :to="ROUTE.HOME" class="nav-bar__brand" @click="mobileOpen = false">
        <div class="nav-bar__brand-logo">
          <img src="/logo.png" :alt="$t('nav.logoAlt')" />
        </div>
        <div class="nav-bar__brand-text">
          <span class="nav-bar__brand-name">Reso<span class="nav-bar__brand-pulse">Pulse</span></span>
          <span class="nav-bar__brand-tag">{{ $t('nav.researchPlatform') }}</span>
        </div>
      </RouterLink>

      <nav class="nav-bar__nav" :class="{ 'nav-bar__nav--open': mobileOpen }">
        <RouterLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="nav-bar__link"
          :exact-active-class="link.exact ? 'active' : undefined"
          :active-class="!link.exact ? 'active' : undefined"
          @click="mobileOpen = false"
        >{{ $t(link.labelKey) }}</RouterLink>
      </nav>

      <div class="nav-bar__right">
        <button
          class="nav-bar__theme-toggle"
          :class="{ 'nav-bar__theme-toggle--oled': isOled }"
          type="button"
          :title="isOled ? $t('nav.themeSwitchDark') : $t('nav.themeSwitchOled')"
          @click="themeStore.toggle()"
        >{{ isOled ? $t('nav.themeOled') : $t('nav.themeDark') }}</button>

        <!-- Org switcher — shown only when user is signed in and has an org -->
        <div v-if="isSignedIn" class="nav-bar__org-switcher">
          <OrganizationSwitcher
            :appearance="clerkOrgSwitcherAppearance"
            :hidePersonalWorkspace="true"
            :afterCreateOrganizationUrl="ROUTE.EXPERIMENT"
            :afterSelectOrganizationUrl="ROUTE.EXPERIMENT"
          />
        </div>

        <!-- System status indicator -->
        <div
          class="nav-bar__status"
          :class="{ 'nav-bar__status--acoustic': isResonanceMode }"
          v-tip="statusTip"
        >
          <span
            class="nav-bar__status-dot"
            :class="{
              'nav-bar__status-dot--warning':  !isResonanceMode && !systemReady,
              'nav-bar__status-dot--acoustic': isResonanceMode,
            }"
          ></span>
          <span
            class="nav-bar__status-label"
            :class="{
              'nav-bar__status-label--warning':  !isResonanceMode && !systemReady,
              'nav-bar__status-label--acoustic': isResonanceMode,
            }"
          >
            {{ statusLabel }}
          </span>
        </div>

        <!-- User button — shown when signed in; sign-in link when guest -->
        <div v-if="isSignedIn" class="nav-bar__user-btn">
          <UserButton
            :appearance="clerkUserButtonAppearance"
            :afterSignOutUrl="ROUTE.SIGN_IN"
          />
        </div>
        <RouterLink
          v-else
          :to="ROUTE.SIGN_IN"
          class="nav-bar__sign-in-link"
        >Sign in</RouterLink>

        <button
          class="nav-bar__hamburger"
          :class="{ 'nav-bar__hamburger--open': mobileOpen }"
          :aria-label="mobileOpen ? $t('nav.closeMenu') : $t('nav.openMenu')"
          @click="mobileOpen = !mobileOpen"
        >
          <span></span><span></span><span></span>
        </button>
      </div>

    </div>
  </header>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'
import { UserButton, OrganizationSwitcher, useUser } from '@clerk/vue'
import { dark } from '@clerk/themes'

import { useCellStore } from '@/stores/cellStore'
import { useThemeStore } from '@/stores/themeStore'

import { ROUTE } from '@/constants/routes'

const NAV_LINKS = [
  { to: ROUTE.HOME,       labelKey: 'nav.home',      exact: true },
  { to: ROUTE.EXPERIMENT, labelKey: 'nav.experiment', exact: false },
  { to: ROUTE.DATASETS,   labelKey: 'nav.dataSets',   exact: false },
  { to: ROUTE.INSTRUMENT, labelKey: 'nav.instrument', exact: false },
  { to: ROUTE.REPORTS,    labelKey: 'nav.reports',    exact: false },
  { to: ROUTE.PROTOCOL,   labelKey: 'nav.protocol',   exact: false },
]

export default defineComponent({
  name: 'NavBar',
  components: { UserButton, OrganizationSwitcher },

  setup() {
    const { isSignedIn } = useUser()
    return { isSignedIn }
  },

  data() {
    return { mobileOpen: false, navLinks: NAV_LINKS }
  },

  computed: {
    ROUTE() { return ROUTE },
    ...mapStores(useCellStore),
    themeStore() { return useThemeStore() },

    clerkUserButtonAppearance() {
      return {
        baseTheme: dark,
        variables: { colorBackground: '#0d1826', colorPrimary: '#00d4ff', borderRadius: '8px' },
        elements: {
          avatarBox:          { width: '30px', height: '30px', border: '1.5px solid #1e3a5f' },
          userButtonPopoverCard: { background: '#0d1826', border: '1px solid #1e3a5f' },
          userButtonPopoverActionButton: { color: '#c8d8e8' },
          userButtonPopoverActionButtonText: { color: '#c8d8e8' },
          userButtonPopoverFooter: { display: 'none' },
        },
      }
    },

    clerkOrgSwitcherAppearance() {
      return {
        baseTheme: dark,
        variables: { colorBackground: '#0d1826', colorPrimary: '#00d4ff', borderRadius: '8px' },
        elements: {
          organizationSwitcherTrigger:     { border: '1px solid #1e3a5f', background: '#132035', borderRadius: '6px', padding: '0.2rem 0.5rem', fontSize: '0.75rem' },
          organizationSwitcherPopoverCard: { background: '#0d1826', border: '1px solid #1e3a5f' },
          organizationPreviewTextContainer: { color: '#c8d8e8' },
        },
      }
    },

    systemReady(): boolean    { return this.cellStore.systemReady },
    isResonanceMode(): boolean { return this.cellStore.isResonanceMode },
    isOled(): boolean          { return this.themeStore.theme === 'oled' },

    statusLabel(): string {
      if (this.isResonanceMode) return this.$t('nav.modeAcoustic')
      return this.systemReady ? this.$t('nav.systemReady') : this.$t('nav.systemWarning')
    },

    statusTip(): string {
      if (this.isResonanceMode) return this.$t('nav.tipModeAcoustic')
      return this.systemReady ? this.$t('nav.tipSystemReady') : this.$t('nav.tipSystemWarning')
    },
  },
})
</script>

<style lang="scss" scoped>


.nav-bar {
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 100;

  &__inner {
    padding: 0 1.75rem;
    height: 60px;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
  }

  /* ── Brand ──────────────────────────────────────────────────────── */
  &__brand {
    @include flex-row(0.6rem);
    flex-shrink: 0;
    text-decoration: none;

    &-logo {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      overflow: hidden;
      flex-shrink: 0;
      outline: 1.5px solid var(--color-border);
      background-color: var(--color-bg);

      img { width: 100%; height: 100%; object-fit: cover; transform: scale(1.7); display: block; }
    }

    &-text { @include flex-col(2px); }

    &-name {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--color-text-heading);
      letter-spacing: 0.03em;
      line-height: 1;
    }

    &-pulse {
      color: var(--color-primary-deep);
      -webkit-text-stroke: 0.8px var(--color-primary);
      paint-order: stroke fill;
      animation: brand-pulse 2.5s ease-in-out infinite;
    }

    &-tag { @include mono-upper(0.6rem, 0.02em); color: var(--color-text-muted); }
  }

  /* ── Nav ────────────────────────────────────────────────────────── */
  &__nav {
    @include flex-row(0.25rem);
    justify-content: center;
  }

  &__link {
    padding: 0.35rem 0.85rem;
    border-radius: var(--radius);
    font-size: var(--fs-lg);
    color: var(--color-text-muted);
    transition: color var(--tr-fast), background-color var(--tr-fast);
    text-decoration: none;

    &:hover { color: var(--color-text); background-color: var(--color-surface-2); }
    &.active { color: var(--color-primary); background-color: var(--color-primary-dim); }
  }

  /* ── Right side ─────────────────────────────────────────────────── */
  &__right {
    @include flex-row(0.75rem);
    justify-self: end;
  }

  &__status {
    @include flex-row(0.5rem);

    &-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: var(--color-accent);
      box-shadow: 0 0 6px var(--color-accent);
      animation: nav-pulse 2s ease-in-out infinite;
      transition: background-color 0.4s, box-shadow 0.4s;

      &--warning  { background-color: var(--color-amber-warm); box-shadow: 0 0 6px var(--color-amber-warm); }
      &--acoustic { background-color: var(--color-amber); box-shadow: 0 0 8px var(--color-amber); animation: nav-pulse-acoustic 1.8s ease-in-out infinite; }
    }

    &-label {
      @include mono-upper(var(--fs-sm));
      color: var(--color-text-muted);
      transition: color 0.4s;

      &--warning  { color: var(--color-amber-warm); }
      &--acoustic { color: var(--color-amber); }
    }
  }

  /* ── Clerk controls ─────────────────────────────────────────────── */
  &__user-btn,
  &__org-switcher {
    display: flex;
    align-items: center;
    flex-shrink: 0;
  }

  &__sign-in-link {
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 0.22rem 0.75rem;
    border: 1px solid var(--color-primary-border);
    border-radius: 4px;
    color: var(--color-primary);
    background: var(--color-primary-surface);
    text-decoration: none;
    transition: background var(--tr-fast), box-shadow var(--tr-fast);
    white-space: nowrap;

    &:hover { background: var(--color-primary-dim); box-shadow: var(--glow-sm); text-decoration: none; }
  }

  /* ── Theme toggle ───────────────────────────────────────────────── */
  &__theme-toggle {
    @include mono-upper(0.6rem, 0.08em);
    padding: 0.22rem 0.6rem;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: color var(--tr-fast), border-color var(--tr-fast), background var(--tr-fast);
    white-space: nowrap;

    &:hover { color: var(--color-text); border-color: var(--color-text-muted); }

    &--oled {
      color: var(--color-primary);
      border-color: var(--color-primary-border);
      background: var(--color-primary-surface);
    }
  }

  /* ── Hamburger ──────────────────────────────────────────────────── */
  &__hamburger {
    display: none;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 5px;
    width: 40px;
    height: 40px;
    padding: 8px;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    cursor: pointer;
    flex-shrink: 0;
    transition: border-color var(--tr-fast);

    &:hover { border-color: var(--color-primary); }

    span {
      display: block;
      width: 20px;
      height: 2px;
      background: var(--color-text-muted);
      border-radius: 2px;
      transition: transform 0.22s ease, opacity 0.22s ease, background-color var(--tr-fast);
    }

    &--open {
      border-color: var(--color-primary);
      span { background: var(--color-primary); }
      span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
      span:nth-child(2) { opacity: 0; transform: scaleX(0); }
      span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }
    }
  }
}

@keyframes nav-pulse         { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
@keyframes nav-pulse-acoustic { 0%, 100% { opacity: 1; box-shadow: 0 0 8px var(--color-amber); } 50% { opacity: 0.5; box-shadow: 0 0 16px var(--color-amber); } }
@keyframes brand-pulse       { 0%, 100% { text-shadow: 0 0 8px var(--color-primary-dim); } 50% { text-shadow: 0 0 18px color-mix(in srgb, var(--color-primary) 50%, transparent); } }

/* ── Mobile / tablet (hamburger at ≤ 960px) ─────────────────────────────── */
@media (max-width: 960px) {
  .nav-bar__inner {
    grid-template-columns: auto 1fr auto;
    padding: 0 1rem;
    gap: 0;
  }

  .nav-bar__nav {
    display: none;
    position: fixed;
    top: 60px;
    left: 0; right: 0; bottom: 0;
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    background: var(--color-bg);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-top: 1px solid var(--color-border);
    padding: 1.5rem 1.25rem;
    z-index: 99;
    overflow-y: auto;

    &--open { display: flex; }
  }

  .nav-bar__link {
    font-size: 1.1rem;
    padding: 0.9rem 1rem;
    border-radius: var(--radius);
    border-bottom: 1px solid var(--color-border);
    color: var(--color-text-muted);

    &:last-child { border-bottom: none; }
    &:hover, &.active { color: var(--color-primary); background: var(--color-primary-surface); }
  }

  .nav-bar__hamburger { display: flex; }
  .nav-bar__status-label { display: none; }
}
</style>
