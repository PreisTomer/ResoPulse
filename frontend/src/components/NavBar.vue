<template>
  <header class="app-header">
    <div class="app-header__inner">
      <RouterLink to="/" class="app-header__brand">
        <div class="app-header__brand-logo">
          <img src="/logo.jpg" :alt="$t('hero.title')" />
        </div>
        <span class="app-header__brand-name">{{ $t('hero.title') }}</span>
        <span class="app-header__brand-tag">{{ $t('nav.researchPlatform') }}</span>
      </RouterLink>

      <nav class="app-header__nav">
        <RouterLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="app-header__nav-link"
          :exact-active-class="link.exact ? 'app-header__nav-link--active' : undefined"
          :active-class="!link.exact ? 'app-header__nav-link--active' : undefined"
        >{{ $t(link.labelKey) }}</RouterLink>
      </nav>

      <div class="app-header__status">
        <span class="app-header__status-dot" :class="{ 'app-header__status-dot--warning': !systemReady }"></span>
        <span class="app-header__status-label" :class="{ 'app-header__status-label--warning': !systemReady }">
          {{ systemReady ? $t('nav.systemReady') : $t('nav.systemWarning') }}
        </span>
      </div>
    </div>
  </header>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useCellStore } from '../stores/cellStore'

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
    return { store: useCellStore() }
  },

  data() {
    return { navLinks: NAV_LINKS }
  },

  computed: {
    systemReady(): boolean { return this.store.systemReady },
  },
})
</script>

<style lang="scss" scoped>
.app-header {
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
    display: flex;
    align-items: center;
    gap: 2rem;
  }

  /* ── Brand ──────────────────────────────────────────────────────── */
  &__brand {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    flex-shrink: 0;
    text-decoration: none;

    &-logo {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      overflow: hidden;
      flex-shrink: 0;
      outline: 1.5px solid var(--color-border);

      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
        transform: scale(1.7);
        display: block;
      }
    }

    &-name {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--color-text-heading);
      letter-spacing: 0.03em;
    }

    &-tag {
      font-size: 0.65rem;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      border: 1px solid var(--color-border);
      padding: 1px 6px;
      border-radius: 3px;
    }
  }

  /* ── Nav ────────────────────────────────────────────────────────── */
  &__nav {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    flex: 1;
  }

  &__nav-link {
    padding: 0.35rem 0.85rem;
    border-radius: var(--radius);
    font-size: 0.875rem;
    color: var(--color-text-muted);
    transition: color 0.15s, background-color 0.15s;
    text-decoration: none;

    &:hover { color: var(--color-text); background-color: var(--color-surface-2); }

    &--active { color: var(--color-primary); background-color: var(--color-primary-dim); }
  }

  /* ── Status indicator ───────────────────────────────────────────── */
  &__status {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-shrink: 0;

    &-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: var(--color-accent);
      box-shadow: 0 0 6px var(--color-accent);
      animation: nav-pulse 2s ease-in-out infinite;
      transition: background-color 0.4s, box-shadow 0.4s;

      &--warning { background-color: #ffb800; box-shadow: 0 0 6px #ffb800; }
    }

    &-label {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      font-family: var(--font-mono);
      text-transform: uppercase;
      letter-spacing: 0.08em;

      &--warning { color: #ffb800; }
    }
  }

  /* ── Responsive ─────────────────────────────────────────────────── */
  @media (max-width: 600px) {
    &__inner { gap: 0.75rem; padding: 0 1rem; }
    &__nav   { display: none; }
    &__brand-tag { display: none; }
  }
}

@keyframes nav-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
</style>
