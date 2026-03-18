<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div id="layout">
    <NavBar />
    <main>
      <RouterView />
    </main>
    <footer class="app-footer">
      <span class="app-footer__copy">© 2026 Tomer Preis. All rights reserved.</span>
      <RouterLink to="/terms" class="app-footer__link">Terms of Use</RouterLink>
    </footer>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import NavBar from './components/NavBar.vue'
import { useThemeStore } from './stores/themeStore'

export default defineComponent({
  components: { NavBar },

  setup() {
    return { themeStore: useThemeStore() }
  },

  mounted() {
    this.themeStore.init()
  },
})
</script>

<style lang="scss" scoped>
#layout {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.app-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  padding: 0.65rem 1.5rem;
  border-top: 1px solid var(--color-border);
  background: var(--color-surface);
  flex-shrink: 0;

  &__copy {
    font-family: var(--font-mono);
    font-size: 0.6rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-text-muted);
    opacity: 0.55;
  }

  &__link {
    font-family: var(--font-mono);
    font-size: 0.6rem;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-primary);
    text-decoration: none;
    opacity: 0.7;
    transition: opacity 0.15s;

    &:hover { opacity: 1; }
  }
}
</style>
