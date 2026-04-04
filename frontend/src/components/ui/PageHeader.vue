<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="page-header">
    <div class="page-header__eyebrow">
      <span class="page-header__eyebrow-dot"></span>
      {{ eyebrow }}
    </div>
    <h1 class="page-header__title" v-html="title"></h1>
    <slot />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  props: {
    eyebrow: { type: String, required: true },
    title: { type: String, required: true },
  },
})
</script>

<style lang="scss" scoped>


.page-header {
  display: flex;
  flex-direction: column;

  &__eyebrow {
    @include flex-row(0.5rem);
    @include mono-upper(0.72rem, 0.14em);
    color: var(--color-primary);
    margin-bottom: 0.75rem;
  }

  &__eyebrow-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: var(--color-primary);
    box-shadow: 0 0 8px var(--color-primary);
  }

  &__title {
    font-size: 2rem;
    font-weight: 800;
    color: var(--color-text-heading);
    margin: 0 0 0.5rem;
    line-height: 1.15;
  }
}
</style>