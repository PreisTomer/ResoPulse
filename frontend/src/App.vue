<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div id="layout">
    <NavBar />
    <main>
      <RouterView />
    </main>
    <TermsGate v-if="showTermsGate" @accepted="onTermsAccepted" />
    <footer class="app-footer">
      <span class="app-footer__copy"
        >© 2026 Tomer Preis. All rights reserved.</span
      >
      <RouterLink to="/terms" class="app-footer__link">Terms of Use</RouterLink>
    </footer>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";

import { NavBar, TermsGate } from "./components/app";
import { useThemeStore } from "./stores/themeStore";
const TERMS_KEY = "rp_terms_v1";

export default defineComponent({
  components: { NavBar, TermsGate },

  setup() {
    return { themeStore: useThemeStore() };
  },

  data() {
    return {
      termsAccepted: localStorage.getItem(TERMS_KEY) === "1",
    };
  },

  computed: {
    showTermsGate(): boolean {
      return !this.termsAccepted && this.$route.path === "/experiment";
    },
  },

  mounted() {
    this.themeStore.init();
  },

  methods: {
    onTermsAccepted() {
      this.termsAccepted = true;
    },
  },
});
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
    font-size: var(--fs-xxs);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-text-muted);
    opacity: var(--op-muted);
  }

  &__link {
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--color-primary);
    text-decoration: none;
    opacity: var(--op-dim);
    transition: opacity var(--tr-fast);

    &:hover {
      opacity: 1;
    }
  }
}
</style>
