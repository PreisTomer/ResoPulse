<script setup lang="ts">
</script>

<template>
  <header class="app-header">
    <div class="header-inner">
      <div class="brand">
        <span class="brand-icon">◉</span>
        <span class="brand-name">BioResonance</span>
        <span class="brand-tag">Research Platform</span>
      </div>
      <nav class="nav">
        <a class="nav-link active" href="#">Dashboard</a>
        <a class="nav-link" href="#">Analysis</a>
        <a class="nav-link" href="#">Data Sets</a>
        <a class="nav-link" href="#">Reports</a>
      </nav>
      <div class="header-status">
        <span class="status-dot"></span>
        <span class="status-label">System Ready</span>
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
  max-width: 1440px;
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
}

.brand-icon {
  color: var(--color-primary);
  font-size: 1.4rem;
  line-height: 1;
  animation: pulse 3s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.brand-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--color-text-heading);
  letter-spacing: 0.03em;
}

.brand-tag {
  font-size: 0.65rem;
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  border: 1px solid var(--color-border);
  padding: 1px 6px;
  border-radius: 3px;
}

.nav {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  flex: 1;
}

.nav-link {
  padding: 0.35rem 0.85rem;
  border-radius: var(--radius);
  font-size: 0.875rem;
  color: var(--color-text-muted);
  transition: color 0.15s, background-color 0.15s;
  text-decoration: none;
}

.nav-link:hover {
  color: var(--color-text);
  background-color: var(--color-surface-2);
  text-decoration: none;
}

.nav-link.active {
  color: var(--color-primary);
  background-color: var(--color-primary-dim);
}

.header-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--color-accent);
  box-shadow: 0 0 6px var(--color-accent);
  animation: pulse 2s ease-in-out infinite;
}

.status-label {
  font-size: 0.75rem;
  color: var(--color-text-muted);
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
</style>
