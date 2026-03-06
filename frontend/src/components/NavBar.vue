<script lang="ts">
import { defineComponent } from 'vue'
import { useCellStore } from '../stores/cellStore'

export default defineComponent({
  setup() {
    return { store: useCellStore() }
  },
  computed: {
    systemReady(): boolean { return this.store.systemReady },
  },
})
</script>

<template>
  <header class="nav-bar">
    <div class="nav-bar__inner">
      <RouterLink to="/" class="nav-bar__brand">
        <div class="nav-bar__brand-logo">
          <img src="/logo.png" :alt="$t('hero.title')" />
        </div>
        <div class="nav-bar__brand-text">
          <span class="nav-bar__brand-name">Bio<span class="nav-bar__brand-resonance">Resonance</span></span>
          <span class="nav-bar__brand-tag">{{ $t('nav.researchPlatform') }}</span>
        </div>
      </RouterLink>
      <nav class="nav-bar__nav">
        <RouterLink to="/"           class="nav-bar__link" exact-active-class="active">{{ $t('nav.home') }}</RouterLink>
        <RouterLink to="/experiment" class="nav-bar__link" active-class="active">{{ $t('nav.experiment') }}</RouterLink>
        <RouterLink to="/datasets"   class="nav-bar__link" active-class="active">{{ $t('nav.dataSets') }}</RouterLink>
        <RouterLink to="/reports"    class="nav-bar__link" active-class="active">{{ $t('nav.reports') }}</RouterLink>
        <RouterLink to="/protocol"   class="nav-bar__link" active-class="active">{{ $t('nav.protocol') }}</RouterLink>
      </nav>
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
    </div>
  </header>
</template>

<style lang="scss" scoped>
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
    display: flex;
    align-items: center;
    gap: 0.6rem;
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

  &__status {
    display: flex; align-items: center; gap: 0.5rem; justify-self: end;

    &-dot {
      width: 8px; height: 8px; border-radius: 50%;
      background-color: var(--color-accent);
      box-shadow: 0 0 6px var(--color-accent);
      animation: pulse 2s ease-in-out infinite;
      transition: background-color 0.4s, box-shadow 0.4s;

      &--warning { background-color: var(--color-amber-warm); box-shadow: 0 0 6px var(--color-amber-warm); }
    }

    &-label {
      font-size: 0.75rem; color: var(--color-text-muted);
      font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.08em;

      &--warning { color: var(--color-amber-warm); }
    }
  }
}

@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }

@media (max-width: 600px) {
  .nav-bar {
    &__inner { gap: 0.75rem; padding: 0 1rem; }
    &__nav { display: none; }
    &__brand-tag { display: none; }
  }
}
</style>
