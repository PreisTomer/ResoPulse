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

        <!-- Combined workspace + user pill with dropdown -->
        <div v-if="isSignedIn" class="nav-bar__user-area" @click="toggleMenu">
          <span v-if="orgName" class="nav-bar__workspace">{{ orgName }}</span>
          <div class="nav-bar__user-btn">
            <img
              v-if="userImageUrl"
              :src="userImageUrl"
              :alt="userName"
              class="nav-bar__user-avatar"
            />
            <span v-else class="nav-bar__user-initials">{{ userInitials }}</span>
          </div>
          <div v-if="menuOpen" class="nav-bar__user-menu" @click.stop>
            <button class="nav-bar__user-menu-item" @click="openProfile">
              <span class="nav-bar__user-menu-icon">{{ ICON.USER }}</span>
              {{ $t('nav.manageAccount') }}
            </button>
            <button class="nav-bar__user-menu-item" @click="goToWorkspace">
              <span class="nav-bar__user-menu-icon">{{ ICON.ORG }}</span>
              {{ $t('nav.switchWorkspace') }}
            </button>
            <div class="nav-bar__user-menu-divider"></div>
            <button class="nav-bar__user-menu-item nav-bar__user-menu-item--danger" @click="doSignOut">
              <span class="nav-bar__user-menu-icon">{{ ICON.LOGOUT }}</span>
              {{ $t('nav.signOut') }}
            </button>
          </div>
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
import { useUser, useOrganization, useClerk } from '@clerk/vue'

import { useThemeStore } from '@/stores/themeStore'

import { ROUTE } from '@/constants/routes'
import { ICON } from '@/constants/icons'

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

  setup() {
    const { isSignedIn, user } = useUser()
    const { organization }     = useOrganization()
    const clerk                = useClerk()
    return { isSignedIn, user, organization, clerk }
  },

  data() {
    return { mobileOpen: false, menuOpen: false, navLinks: NAV_LINKS }
  },

  computed: {
    ROUTE() { return ROUTE },
    ICON()  { return ICON },
    themeStore() { return useThemeStore() },

    orgName(): string | null {
      return (this.organization as { name?: string } | null)?.name ?? null
    },

    userImageUrl(): string | null {
      return (this.user as { imageUrl?: string } | null)?.imageUrl ?? null
    },

    userName(): string {
      const u = this.user as { firstName?: string; lastName?: string; fullName?: string } | null
      return (u?.fullName ?? `${u?.firstName ?? ''} ${u?.lastName ?? ''}`.trim()) || 'User'
    },

    userInitials(): string {
      const u = this.user as { firstName?: string; lastName?: string } | null
      const first = u?.firstName?.[0] ?? ''
      const last  = u?.lastName?.[0]  ?? ''
      return (first + last).toUpperCase() || '?'
    },

    isOled(): boolean { return this.themeStore.theme === 'oled' },
  },

  mounted() {
    document.addEventListener('click', this.handleOutsideClick)
  },

  beforeUnmount() {
    document.removeEventListener('click', this.handleOutsideClick)
  },

  methods: {
    toggleMenu() {
      this.menuOpen = !this.menuOpen
    },

    closeMenu() {
      this.menuOpen = false
    },

    handleOutsideClick(e: MouseEvent) {
      const area = this.$el?.querySelector?.('.nav-bar__user-area')
      if (area && !area.contains(e.target as Node)) {
        this.menuOpen = false
      }
    },

    openProfile() {
      this.closeMenu()
      ;(this.clerk as { openUserProfile?(): void })?.openUserProfile?.()
    },

    goToWorkspace() {
      this.closeMenu()
      // Workspace management page — to be implemented
    },

    doSignOut() {
      this.closeMenu()
      ;(this.clerk as { signOut?(opts?: { redirectUrl?: string }): Promise<void> })
        ?.signOut?.({ redirectUrl: ROUTE.SIGN_IN })
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

    &-tag { font-family: var(--font-mono); font-size: 0.6rem; letter-spacing: 0.02em; text-transform: capitalize; color: var(--color-text-muted); }
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

  /* ── User area + dropdown ───────────────────────────────────────── */
  &__user-area {
    @include flex-row(0);
    position: relative;
    border: 1px solid var(--color-border);
    border-radius: 6px;
    overflow: visible;
    transition: border-color var(--tr-fast);
    flex-shrink: 0;
    cursor: pointer;
    user-select: none;

    &:hover { border-color: var(--color-primary-border); }
  }

  &__workspace {
    @include mono-upper(var(--fs-xxs), 0.06em);
    color: var(--color-text-muted);
    opacity: var(--op-dim);
    padding: 0 0.65rem;
    border-right: 1px solid var(--color-border);
    white-space: nowrap;
    max-width: 24ch;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__user-btn {
    display: flex;
    align-items: center;
    padding: 0.18rem 0.4rem;
    flex-shrink: 0;
  }

  &__user-avatar {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    object-fit: cover;
    border: 1.5px solid var(--color-border);
    display: block;
  }

  &__user-initials {
    @include inline-flex-center();
    width: 26px;
    height: 26px;
    border-radius: 50%;
    border: 1.5px solid var(--color-border);
    font-family: var(--font-mono);
    font-size: 0.6rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    color: var(--color-primary);
    background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  }

  &__user-menu {
    position: absolute;
    top: calc(100% + 6px);
    right: 0;
    min-width: 185px;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
    z-index: 200;
    padding: 0.3rem;
    @include flex-col(0);
    overflow: hidden;

    &-item {
      @include flex-row(0.5rem);
      width: 100%;
      padding: 0.5rem 0.7rem;
      background: transparent;
      border: none;
      border-radius: 4px;
      font-family: var(--font-mono);
      font-size: var(--fs-xs);
      letter-spacing: 0.04em;
      color: var(--color-text-muted);
      cursor: pointer;
      text-align: left;
      transition: background var(--tr-fast), color var(--tr-fast);

      &:hover { background: var(--color-surface-2); color: var(--color-text); }

      &--danger {
        color: color-mix(in srgb, var(--color-danger, var(--color-amber)) 80%, transparent);
        &:hover { background: color-mix(in srgb, var(--color-amber) 10%, transparent); color: var(--color-amber); }
      }
    }

    &-icon {
      font-size: var(--fs-sm);
      opacity: var(--op-dim);
      flex-shrink: 0;
    }

    &-divider {
      height: 1px;
      background: var(--color-border);
      margin: 0.25rem 0.3rem;
    }
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
