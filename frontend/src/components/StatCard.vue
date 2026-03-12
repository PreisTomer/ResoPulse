<template>
  <div class="stat-card" v-tip="tooltip || undefined">
    <span class="stat-card__label">{{ label }}</span>
    <span class="stat-card__value" :class="`stat-card__value--${variant}`">{{ value }}</span>
    <span v-if="sub" class="stat-card__sub">{{ sub }}</span>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'StatCard',

  props: {
    label: {
      type: String,
      required: true,
    },
    value: {
      type: String,
      required: true,
    },
    sub: {
      type: String,
      default: '',
    },
    variant: {
      type: String,
      default: 'default',
    },
    tooltip: {
      type: String,
      default: '',
    },
  },
})
</script>

<style lang="scss" scoped>
.stat-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;

  &__label {
    font-size: 0.65rem;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-text-muted);
  }

  &__value {
    font-size: 1rem;
    font-weight: 700;
    font-family: var(--font-mono);
    color: var(--color-text-heading);
    line-height: 1;

    &--default  { color: var(--color-text-heading); }
    &--ok       { color: #4ade80; }
    &--warn,
    &--amber    { color: var(--color-amber); }
    &--danger   { color: var(--color-danger); }
    &--info,
    &--primary  { color: var(--color-primary); }
    &--muted    { color: var(--color-text-muted); }
  }

  &__sub {
    font-size: 0.62rem;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    line-height: 1.4;
  }
}
</style>
