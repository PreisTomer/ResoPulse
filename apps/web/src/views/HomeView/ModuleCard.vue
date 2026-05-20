<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <RouterLink :to="to" class="module-card" :class="{ 'module-card--disabled': disabled }">
    <header class="module-card__header">
      <span class="module-card__number">{{ number }}</span>
      <span class="module-card__phase">{{ phaseLabel }}</span>
    </header>
    <h3 class="module-card__title">{{ title }}</h3>
    <p class="module-card__description">{{ description }}</p>
    <div class="module-card__output">
      <span class="module-card__output-label">{{ $t('home.moduleOutputLabel') }}</span>
      <span class="module-card__output-value">{{ outputMetric }}</span>
    </div>
    <span class="module-card__cta">{{ ctaLabel }} {{ ICON.ARROW_SHORT }}</span>
  </RouterLink>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { ICON } from '@/constants/icons'

export default defineComponent({
  name: 'ModuleCard',
  props: {
    number:       { type: String, required: true },
    title:        { type: String, required: true },
    description:  { type: String, required: true },
    outputMetric: { type: String, required: true },
    to:           { type: String, required: true },
    ctaLabel:     { type: String, required: true },
    phaseLabel:   { type: String, default: '' },
    disabled:     { type: Boolean, default: false },
  },
  computed: {
    ICON() { return ICON },
  },
})
</script>

<style lang="scss" scoped>
.module-card {
  @include flex-col(1.15rem);
  position: relative;
  padding: 2.1rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  text-decoration: none;
  color: var(--color-text);
  transition: transform var(--tr-fast), border-color var(--tr-fast), box-shadow var(--tr-fast);
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, var(--color-primary) 0%, color-mix(in srgb, var(--color-primary) 50%, transparent) 100%);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform var(--tr-slow);
  }

  &:hover {
    transform: translateY(-3px);
    border-color: color-mix(in srgb, var(--color-primary) 45%, var(--color-border));
    box-shadow: 0 12px 28px color-mix(in srgb, black 30%, transparent);

    &::before {
      transform: scaleX(1);
    }

    .module-card__cta {
      background: color-mix(in srgb, var(--color-primary) 20%, transparent);
      border-color: var(--color-primary);
    }
  }

  &--disabled {
    opacity: var(--op-partial);
    pointer-events: auto;

    &:hover { transform: none; }
  }

  &__header {
    @include flex-between(0.5rem);
    align-items: center;
  }

  &__number {
    @include inline-flex-center;
    width: 2.6rem;
    height: 2.6rem;
    border-radius: 50%;
    background: color-mix(in srgb, var(--color-primary) 18%, transparent);
    color: var(--color-primary);
    font-family: var(--font-mono);
    font-weight: 700;
    font-size: 1.2rem;
  }

  &__phase {
    @include mono-upper(var(--fs-xs));
    opacity: var(--op-muted);
  }

  &__title {
    margin: 0;
    font-size: 1.65rem;
    font-weight: 600;
    color: var(--color-text-heading);
    line-height: 1.2;
  }

  &__description {
    margin: 0;
    flex-grow: 1;
    opacity: var(--op-partial);
    line-height: 1.55;
    font-size: 1.05rem; // larger body for at-a-glance readability on landing cards
  }

  &__output {
    @include flex-col(0.3rem);
    padding: 0.9rem 1.1rem;
    background: color-mix(in srgb, var(--color-primary) 6%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-primary) 18%, transparent);
    border-radius: var(--radius);
  }

  &__output-label {
    @include mono-upper(var(--fs-xs));
    opacity: var(--op-muted);
  }

  &__output-value {
    font-size: 1.05rem;
    color: var(--color-primary);
    font-weight: 500;
  }

  &__cta {
    margin-top: auto;
    align-self: flex-start;
    @include mono-upper(var(--fs-md));
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.7rem 1.2rem;
    border-radius: var(--radius);
    color: var(--color-primary);
    background: color-mix(in srgb, var(--color-primary) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-primary) 28%, transparent);
    transition: background var(--tr-fast), border-color var(--tr-fast);
  }
}
</style>
