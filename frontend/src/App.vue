<script setup lang="ts">
import AppHeader from './components/AppHeader.vue'
import HomeView from './views/HomeView.vue'
</script>

<template>
  <div id="layout">
    <AppHeader />
    <main>
      <HomeView />
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
