<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="coming-soon">
    <div class="coming-soon__inner">
      <span class="coming-soon__phase">{{ phase }}</span>
      <h1 class="coming-soon__title">{{ title }}</h1>
      <p v-if="description" class="coming-soon__description">{{ description }}</p>
      <div class="coming-soon__pulse" aria-hidden="true"></div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'ComingSoonStub',
  props: {
    title:       { type: String, required: true },
    description: { type: String, default: '' },
    phase:       { type: String, default: 'Under construction' },
  },
})
</script>

<style lang="scss" scoped>
.coming-soon {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 80px);
  padding: 2rem;

  &__inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    max-width: 32rem;
    text-align: center;
  }

  &__phase {
    @include mono-upper(var(--fs-xxs));
    opacity: var(--op-muted);
    color: var(--color-primary);
  }

  &__title {
    font-size: 2rem;
    font-weight: 600;
    margin: 0;
    color: var(--color-text);
  }

  &__description {
    font-size: var(--fs-md);
    opacity: var(--op-partial);
    line-height: 1.6;
    margin: 0;
  }

  &__pulse {
    width: 4rem;
    height: 4rem;
    border-radius: 50%;
    background: color-mix(in srgb, var(--color-primary) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-primary) 30%, transparent);
    margin-top: 1rem;
    animation: comingSoonPulse 2.4s ease-in-out infinite;
  }
}

@keyframes comingSoonPulse {
  0%, 100% { transform: scale(1);    opacity: 0.7; }
  50%      { transform: scale(1.15); opacity: 1; }
}
</style>
