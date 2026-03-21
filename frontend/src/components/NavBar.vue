<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <header class="nav-bar">
    <div class="nav-bar__inner">

      <RouterLink to="/" class="nav-bar__brand" @click="mobileOpen = false">
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
        <div
          class="nav-bar__status"
          v-tip="systemReady ? $t('nav.tipSystemReady') : $t('nav.tipSystemWarning')"
        >
          <span class="nav-bar__status-dot" :class="{ 'nav-bar__status-dot--warning': !systemReady }"></span>
          <span class="nav-bar__status-label" :class="{ 'nav-bar__status-label--warning': !systemReady }">
            {{ systemReady ? $t('nav.systemReady') : $t('nav.systemWarning') }}
          </span>
        </div>
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
import { useCellStore } from '@/stores/cellStore'
import { useThemeStore } from '@/stores/themeStore'

const NAV_LINKS = [
  { to: '/',           labelKey: 'nav.home',       exact: true },
  { to: '/experiment', labelKey: 'nav.experiment',  exact: false },
  { to: '/datasets',   labelKey: 'nav.dataSets',    exact: false },
  { to: '/instrument', labelKey: 'nav.instrument',  exact: false },
  { to: '/reports',    labelKey: 'nav.reports',     exact: false },
  { to: '/protocol',   labelKey: 'nav.protocol',    exact: false },
]

export default defineComponent({
  name: 'NavBar',

  setup() {
    return { store: useCellStore(), themeStore: useThemeStore() }
  },

  data() {
    return { mobileOpen: false, navLinks: NAV_LINKS }
  },

  computed: {
    systemReady(): boolean { return this.store.systemReady },
    isOled(): boolean { return this.themeStore.theme === 'oled' },
  },
})
</script>

<style lang="scss" scoped>
@use '../styles/mixins' as *;

.nav-bar {
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 100;

  &__inner {
    max-width: 1600px;
    margin: 0 auto;
    padding: 0 2rem;
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
      color: #0a2e58;
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
    font-size: 0.875rem;
    color: var(--color-text-muted);
    transition: color 0.15s, background-color 0.15s;
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

      &--warning { background-color: var(--color-amber-warm); box-shadow: 0 0 6px var(--color-amber-warm); }
    }

    &-label {
      @include mono-upper(0.75rem);
      color: var(--color-text-muted);

      &--warning { color: var(--color-amber-warm); }
    }
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
    transition: color 0.15s, border-color 0.15s, background 0.15s;
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
    transition: border-color 0.15s;

    &:hover { border-color: var(--color-primary); }

    span {
      display: block;
      width: 20px;
      height: 2px;
      background: var(--color-text-muted);
      border-radius: 2px;
      transition: transform 0.22s ease, opacity 0.22s ease, background-color 0.15s;
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

@keyframes nav-pulse   { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
@keyframes brand-pulse { 0%, 100% { text-shadow: 0 0 8px var(--color-primary-dim); } 50% { text-shadow: 0 0 18px rgba(0, 212, 255, 0.5); } }

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
