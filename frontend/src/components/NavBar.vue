<template>
  <header class="nav-bar">
    <div class="nav-bar__inner">
      <RouterLink to="/" class="nav-bar__brand" @click="mobileOpen = false">
        <div class="nav-bar__brand-logo">
          <img src="/logo.png" :alt="$t('hero.title')" />
        </div>
        <div class="nav-bar__brand-text">
          <span class="nav-bar__brand-name">Bio<span class="nav-bar__brand-resonance">Resonance</span></span>
          <span class="nav-bar__brand-tag">{{ $t('nav.researchPlatform') }}</span>
        </div>
      </RouterLink>
      <nav class="nav-bar__nav" :class="{ 'nav-bar__nav--open': mobileOpen }">
        <RouterLink to="/"           class="nav-bar__link" exact-active-class="active" @click="mobileOpen = false">{{ $t('nav.home') }}</RouterLink>
        <RouterLink to="/experiment" class="nav-bar__link" active-class="active"       @click="mobileOpen = false">{{ $t('nav.experiment') }}</RouterLink>
        <RouterLink to="/datasets"   class="nav-bar__link" active-class="active"       @click="mobileOpen = false">{{ $t('nav.dataSets') }}</RouterLink>
        <RouterLink to="/reports"    class="nav-bar__link" active-class="active"       @click="mobileOpen = false">{{ $t('nav.reports') }}</RouterLink>
        <RouterLink to="/protocol"   class="nav-bar__link" active-class="active"       @click="mobileOpen = false">{{ $t('nav.protocol') }}</RouterLink>
      </nav>
      <div class="nav-bar__right">
        <div
          class="nav-bar__status"
          v-tip="systemReady
            ? '<strong>System Ready</strong>\nAll physics running client-side.\nNo thermal warnings active.'
            : '<strong>Thermal Alert</strong>\nSteady-state temperature exceeds 42°C.\nReduce duty cycle or field intensity.'"
        >
          <span class="nav-bar__status-dot" :class="{ 'nav-bar__status-dot--warning': !systemReady }"></span>
          <span class="nav-bar__status-label" :class="{ 'nav-bar__status-label--warning': !systemReady }">
            {{ systemReady ? $t('nav.systemReady') : $t('nav.systemWarning') }}
          </span>
        </div>
        <button
          class="nav-bar__hamburger"
          :class="{ 'nav-bar__hamburger--open': mobileOpen }"
          :aria-label="mobileOpen ? 'Close menu' : 'Open menu'"
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

export default defineComponent({
  setup() {
    return { store: useCellStore() }
  },
  data() {
    return { mobileOpen: false }
  },
  computed: {
    systemReady(): boolean { return this.store.systemReady },
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

  &__brand {
    @include flex-row(0.6rem);
    flex-shrink: 0;
    text-decoration: none;

    &-logo {
      width: 30px; height: 30px;
      border-radius: 50%; overflow: hidden; flex-shrink: 0;
      outline: 1.5px solid var(--color-border);
      background-color: var(--color-bg);

      img {
        width: 100%; height: 100%;
        object-fit: cover; transform: scale(1.7); display: block;
      }
    }

    &-text {
      display: flex; flex-direction: column; gap: 2px;
    }

    &-name {
      font-size: 1.1rem; font-weight: 700;
      color: var(--color-text-heading); letter-spacing: 0.03em;
      line-height: 1;
    }

    &-resonance {
      color: #0a2e58;
      -webkit-text-stroke: 0.8px var(--color-primary);
      paint-order: stroke fill;
    }

    &-tag {
      font-size: 0.6rem; color: var(--color-text-muted);
      text-transform: uppercase; letter-spacing: 0.1em;
    }
  }

  &__nav {
    display: flex; align-items: center; gap: 0.25rem; justify-content: center;
  }

  &__link {
    padding: 0.35rem 0.85rem; border-radius: var(--radius);
    font-size: 0.875rem; color: var(--color-text-muted);
    transition: color 0.15s, background-color 0.15s;
    text-decoration: none;

    &:hover { color: var(--color-text); background-color: var(--color-surface-2); }
    &.active { color: var(--color-primary); background-color: var(--color-primary-dim); }
  }

  &__right {
    display: flex; align-items: center; gap: 0.75rem; justify-self: end;
  }

  &__status {
    display: flex; align-items: center; gap: 0.5rem;

    &-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background-color: var(--color-accent);
      box-shadow: 0 0 6px var(--color-accent);
      animation: pulse 2s ease-in-out infinite;
      transition: background-color 0.4s, box-shadow 0.4s;

      &--warning { background-color: var(--color-amber-warm); box-shadow: 0 0 6px var(--color-amber-warm); }
    }

    &-label {
      @include mono-upper(0.75rem);
      color: var(--color-text-muted);

      &--warning { color: var(--color-amber-warm); }
    }
  }

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

@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

// ── Mobile navigation ─────────────────────────────────────────────────────────
@media (max-width: 768px) {
  .nav-bar__inner {
    grid-template-columns: auto 1fr auto;
    padding: 0 1rem;
    gap: 0;
  }

  // Hide desktop link bar
  .nav-bar__nav {
    display: none;
    position: fixed;
    top: 60px;
    left: 0;
    right: 0;
    bottom: 0;
    flex-direction: column;
    align-items: stretch;
    gap: 0;
    background: rgba(8, 14, 26, 0.97);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-top: 1px solid var(--color-border);
    padding: 1.5rem 1.25rem;
    z-index: 99;
    overflow-y: auto;
  }

  .nav-bar__nav--open {
    display: flex;
  }

  .nav-bar__link {
    font-size: 1.1rem;
    padding: 0.9rem 1rem;
    border-radius: var(--radius);
    border-bottom: 1px solid rgba(30, 58, 95, 0.5);
    color: var(--color-text-muted);

    &:last-child { border-bottom: none; }
    &:hover, &.active { color: var(--color-primary); background: rgba(0, 212, 255, 0.06); }
  }

  // Show hamburger
  .nav-bar__hamburger { display: flex; }

  // Hide text label on status, keep dot
  .nav-bar__status-label { display: none; }
  .nav-bar__brand-tag { display: none; }
}
</style>
