<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <header class="nav-bar">
    <div class="nav-bar__inner">

      <div class="nav-bar__left">
        <RouterLink :to="ROUTE.HOME" class="nav-bar__brand" @click="mobileOpen = false">
          <div class="nav-bar__brand-logo">
            <img src="/logo.png" :alt="$t('nav.logoAlt')" />
          </div>
          <div class="nav-bar__brand-text">
            <span class="nav-bar__brand-name">Reso<span class="nav-bar__brand-pulse">Pulse</span></span>
            <span class="nav-bar__brand-tag">{{ $t('nav.researchPlatform') }}</span>
          </div>
        </RouterLink>
      </div>

      <nav class="nav-bar__nav" :class="{ 'nav-bar__nav--open': mobileOpen }">
        <RouterLink
          v-for="link in activeNavLinks"
          :key="link.to"
          :to="link.to"
          class="nav-bar__link"
          :exact-active-class="link.exact ? 'active' : undefined"
          :active-class="!link.exact ? 'active' : undefined"
          @click="mobileOpen = false"
        >{{ $t(link.labelKey) }}</RouterLink>
        <button class="nav-bar__link nav-bar__contact-mobile" @click="openContact">{{ ICON.MAIL }} {{ $t('nav.contact') }}</button>
        <template v-if="!isSignedIn">
          <RouterLink :to="ROUTE.SIGN_UP" class="nav-bar__link nav-bar__signup-mobile" @click="mobileOpen = false">{{ $t('nav.signUp') }}</RouterLink>
        </template>
      </nav>

      <ContactModal v-if="isContactOpen" @close="isContactOpen = false" />

      <div class="nav-bar__right">
        <button class="nav-bar__contact-btn" @click="openContact">{{ ICON.MAIL }} {{ $t('nav.contact') }}</button>

        <NavUserArea  v-if="isSignedIn" />
        <NavGuestArea v-else-if="showNavGuestArea" />
        <RouterLink   v-else-if="showSignUpBtn" :to="ROUTE.SIGN_UP" class="nav-bar__signup-btn">{{ $t('nav.signUp') }}</RouterLink>

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
import { useUser } from '@clerk/vue'

import { useThemeStore } from '@/stores/themeStore'

import { ROUTE } from '@/constants/routes'
import { ICON } from '@/constants/icons'

import { guestSessionActive } from '@/services/socket'

import NavUserArea from './NavUserArea.vue'
import NavGuestArea from './NavGuestArea.vue'
import ContactModal from '@/components/ContactModal/index.vue'

// App nav — shown to authenticated users in the lab.
const APP_NAV_LINKS = [
  { to: ROUTE.EXPERIMENT, labelKey: 'nav.experiment', exact: false },
  { to: ROUTE.PROTOCOL,   labelKey: 'nav.protocol',   exact: false },
  { to: ROUTE.DATASETS,   labelKey: 'nav.dataSets',   exact: false },
  { to: ROUTE.REPORTS,    labelKey: 'nav.reports',    exact: false },
  { to: ROUTE.INSTRUMENT, labelKey: 'nav.instrument', exact: false },
]

// Marketing nav — shown to visitors on the public landing pages.
const MARKETING_NAV_LINKS = [
  { to: ROUTE.HOME,     labelKey: 'nav.home',     exact: true  },
  { to: ROUTE.PROTOCOL, labelKey: 'nav.protocol', exact: false },
]

// Guest-in-lab nav — shown once a guest has entered the lab. Same surface as
// the signed-in nav: every feature is open. Sign-up is offered for persistence,
// not for unlocking features.
const GUEST_NAV_LINKS = [
  { to: ROUTE.EXPERIMENT, labelKey: 'nav.experiment', exact: false },
  { to: ROUTE.PROTOCOL,   labelKey: 'nav.protocol',   exact: false },
  { to: ROUTE.DATASETS,   labelKey: 'nav.dataSets',   exact: false },
  { to: ROUTE.REPORTS,    labelKey: 'nav.reports',    exact: false },
  { to: ROUTE.INSTRUMENT, labelKey: 'nav.instrument', exact: false },
]

export default defineComponent({
  name: 'NavBar',
  components: { NavUserArea, NavGuestArea, ContactModal },

  setup() {
    const { isSignedIn } = useUser()
    return { isSignedIn, guestSessionActive }
  },

  data() {
    return { mobileOpen: false, isContactOpen: false }
  },

  computed: {
    ROUTE() { return ROUTE },
    ICON()  { return ICON },
    themeStore() { return useThemeStore() },

    activeNavLinks() {
      if (this.isSignedIn) return APP_NAV_LINKS
      if (this.guestSessionActive) return GUEST_NAV_LINKS
      return MARKETING_NAV_LINKS
    },

    // Guest avatar hidden on home so the home page keeps a sign-up affordance for new visitors.
    showNavGuestArea(): boolean {
      return !this.isSignedIn && this.guestSessionActive && this.$route.path !== ROUTE.HOME
    },

    showSignUpBtn(): boolean {
      return !this.isSignedIn && !this.showNavGuestArea
    },
  },

  methods: {
    openContact(): void {
      this.mobileOpen = false
      this.isContactOpen = true
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
  z-index: 1000;

  &__inner {
    padding: 0 1.75rem;
    height: 60px;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
  }

  /* ── Left group: brand + theme toggle ───────────────────────────── */
  &__left {
    @include flex-row(0.65rem);
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

  &__contact-mobile {
    display: none;
    background: none;
    border: none;
    cursor: pointer;
    font-family: inherit;
    text-align: left;
  }

  &__contact-btn {
    @include mono-upper(0.6rem, 0.08em);
    @include flex-row(0.3rem);
    margin-bottom: 2px;
    padding: 0.22rem 0.6rem;
    background: var(--color-primary-surface);
    border: 1px solid var(--color-primary-border);
    border-radius: 4px;
    color: var(--color-primary);
    cursor: pointer;
    white-space: nowrap;
    transition: background var(--tr-fast), box-shadow var(--tr-fast), border-color var(--tr-fast);

    &:hover {
      background: var(--color-primary-dim);
      border-color: var(--color-primary);
      box-shadow: var(--glow-sm);
    }
  }

  /* ── Right side ─────────────────────────────────────────────────── */
  &__right {
    @include flex-row(0.75rem);
    align-items: flex-end;
    justify-self: end;
  }

  &__signup-btn {
    @include mono-upper(var(--fs-xxs), 0.06em);
    padding: 0.25rem 0.85rem;
    border: 1px solid var(--color-primary-border);
    border-radius: 4px;
    color: var(--color-bg);
    background: var(--color-primary);
    text-decoration: none;
    transition: background var(--tr-fast), box-shadow var(--tr-fast);
    white-space: nowrap;

    &:hover { background: color-mix(in srgb, var(--color-primary) 85%, white); box-shadow: var(--glow-sm); text-decoration: none; }
  }

  &__signup-mobile { display: none; }

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
      transition: transform 0.22s ease, opacity 0.22s ease, background-color var(--tr-fast); // intentional: between fast/normal for hamburger morph
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
  .nav-bar__contact-btn { display: none; }
  .nav-bar__contact-mobile { display: flex; }
  .nav-bar__signup-mobile { display: flex; }
  .nav-bar__signup-btn { display: none; }
}
</style>
