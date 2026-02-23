<script lang="ts">
import { defineComponent } from 'vue'
import NavBar from './components/NavBar.vue'
import Dashboard from './views/Dashboard.vue'

export default defineComponent({
  components: {
    NavBar,
    Dashboard,
  },
})
</script>

<template>
  <div id="layout">
    <NavBar />
    <main>
      <Dashboard />
    </main>
  </div>
</template>

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
