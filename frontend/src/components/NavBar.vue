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
  <header class="app-header">
    <div class="header-inner">
      <RouterLink to="/" class="brand">
        <div class="brand-logo">
          <img src="/logo.jpg" :alt="$t('hero.title')" />
        </div>
        <span class="brand-name">Bio<span class="brand-resonance">Resonance</span></span>
        <span class="brand-tag">{{ $t('nav.researchPlatform') }}</span>
      </RouterLink>
      <nav class="nav">
        <RouterLink to="/"           class="nav-link" exact-active-class="active">{{ $t('nav.home') }}</RouterLink>
        <RouterLink to="/experiment" class="nav-link" active-class="active">{{ $t('nav.experiment') }}</RouterLink>
        <RouterLink to="/datasets" class="nav-link" active-class="active">{{ $t('nav.dataSets') }}</RouterLink>
        <RouterLink to="/reports"  class="nav-link" active-class="active">{{ $t('nav.reports') }}</RouterLink>
      </nav>
      <div class="header-status">
        <span class="status-dot" :class="{ 'status-dot--warning': !systemReady }"></span>
        <span class="status-label" :class="{ 'status-label--warning': !systemReady }">
          {{ systemReady ? $t('nav.systemReady') : $t('nav.systemWarning') }}
        </span>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  background-color: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-inner {
  max-width: 1600px;
  margin: 0 auto;
  padding: 0 2rem;
  height: 60px;
  display: flex;
  align-items: center;
  gap: 2rem;
}

.brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-shrink: 0;
  text-decoration: none;
}

.brand-logo {
  width: 30px; height: 30px;
  border-radius: 50%; overflow: hidden; flex-shrink: 0;
  outline: 1.5px solid var(--color-border);
}
.brand-logo img {
  width: 100%; height: 100%;
  object-fit: cover; transform: scale(1.7); display: block;
}
.brand-name {
  font-size: 1.1rem; font-weight: 700;
  color: var(--color-text-heading); letter-spacing: 0.03em;
}
.brand-resonance {
  color: #0a2e58;
  -webkit-text-stroke: 0.8px var(--color-primary);
  paint-order: stroke fill;
}
.brand-tag {
  font-size: 0.65rem; color: var(--color-text-muted);
  text-transform: uppercase; letter-spacing: 0.1em;
  border: 1px solid var(--color-border); padding: 1px 6px; border-radius: 3px;
}

.nav {
  display: flex; align-items: center; gap: 0.25rem; flex: 1;
}
.nav-link {
  padding: 0.35rem 0.85rem; border-radius: var(--radius);
  font-size: 0.875rem; color: var(--color-text-muted);
  transition: color 0.15s, background-color 0.15s;
  text-decoration: none;
}
.nav-link:hover { color: var(--color-text); background-color: var(--color-surface-2); }
.nav-link.active { color: var(--color-primary); background-color: var(--color-primary-dim); }

.header-status {
  display: flex; align-items: center; gap: 0.5rem; flex-shrink: 0;
}
.status-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background-color: var(--color-accent);
  box-shadow: 0 0 6px var(--color-accent);
  animation: pulse 2s ease-in-out infinite;
  transition: background-color 0.4s, box-shadow 0.4s;
}
.status-dot--warning { background-color: var(--color-amber-warm); box-shadow: 0 0 6px var(--color-amber-warm); }
.status-label--warning { color: var(--color-amber-warm); }
@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
.status-label {
  font-size: 0.75rem; color: var(--color-text-muted);
  font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.08em;
}

@media (max-width: 600px) {
  .header-inner { gap: 0.75rem; padding: 0 1rem; }
  .nav { display: none; }
  .brand-tag { display: none; }
}
</style>
