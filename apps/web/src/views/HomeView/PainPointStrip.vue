<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <section class="pain-strip">
    <div class="pain-strip__inner">
      <header class="pain-strip__header">
        <h2 class="pain-strip__title">{{ $t('home.painTitle') }}</h2>
        <p class="pain-strip__subtitle">{{ $t('home.painSubtitle') }}</p>
      </header>

      <div class="pain-strip__grid">
        <div v-for="pain in pains" :key="pain.titleKey" class="pain-strip__item">
          <span class="pain-strip__icon" aria-hidden="true">{{ pain.icon }}</span>
          <h3 class="pain-strip__item-title">{{ $t(pain.titleKey) }}</h3>
          <p class="pain-strip__item-body">{{ $t(pain.bodyKey) }}</p>
        </div>
      </div>
    </div>
  </section>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { ICON } from '@/constants/icons'

interface Pain {
  icon:     string
  titleKey: string
  bodyKey:  string
}

const PAINS: Pain[] = [
  { icon: ICON.RELOAD,    titleKey: 'home.pain1Title', bodyKey: 'home.pain1Body' },
  { icon: ICON.WARNING,   titleKey: 'home.pain2Title', bodyKey: 'home.pain2Body' },
  { icon: ICON.LIGHTNING, titleKey: 'home.pain3Title', bodyKey: 'home.pain3Body' },
]

export default defineComponent({
  name: 'PainPointStrip',
  data() {
    return { pains: PAINS }
  },
})
</script>

<style lang="scss" scoped>
.pain-strip {
  position: relative;
  z-index: 1;
  width: 100%;
  padding: 1rem 1.5rem 4rem;
  background: transparent;

  &__inner {
    max-width: 1100px;
    margin: 0 auto;
    @include flex-col(2rem);
    align-items: center;
  }

  &__header {
    @include flex-col(0.5rem);
    align-items: center;
    text-align: center;
    max-width: 38rem;
  }

  &__title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--color-text-heading);
  }

  &__subtitle {
    margin: 0;
    opacity: var(--op-partial);
    line-height: 1.6;
    font-size: var(--fs-lg);
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 1.5rem;
    width: 100%;
  }

  &__item {
    @include flex-col(0.6rem);
    padding: 1.25rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    transition: transform var(--tr-fast), border-color var(--tr-fast);

    &:hover {
      transform: translateY(-2px);
      border-color: color-mix(in srgb, var(--color-primary) 30%, var(--color-border));
    }
  }

  &__icon {
    font-size: 1.5rem;
    color: var(--color-primary);
    opacity: var(--op-strong);
  }

  &__item-title {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 600;
    color: var(--color-text-heading);
  }

  &__item-body {
    margin: 0;
    opacity: var(--op-partial);
    font-size: var(--fs-md);
    line-height: 1.55;
  }
}
</style>
