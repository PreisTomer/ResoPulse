<template>
  <div id="layout">
    <NavBar />
    <main>
      <RouterView />
    </main>
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

<style scoped>
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
</style>
