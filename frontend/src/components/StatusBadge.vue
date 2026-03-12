<template>
  <span
    class="status-badge"
    :class="`status-badge--${variant}`"
    v-tip="tooltip || undefined"
  >{{ label }}</span>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'StatusBadge',

  props: {
    label: {
      type: String,
      required: true,
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
.status-badge {
  display: inline-block;
  font-size: 0.63rem;
  font-family: var(--font-mono);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.12rem 0.45rem;
  border-radius: 3px;
  border: 1px solid;
  white-space: nowrap;
  line-height: 1.5;

  &--default {
    color: var(--color-text);
    border-color: rgba(255, 255, 255, 0.2);
    background: rgba(255, 255, 255, 0.04);
  }

  &--ok {
    color: #4ade80;
    border-color: rgba(74, 222, 128, 0.35);
    background: rgba(74, 222, 128, 0.08);
  }

  &--warn,
  &--amber {
    color: var(--color-amber);
    border-color: rgba(251, 191, 36, 0.35);
    background: rgba(251, 191, 36, 0.08);
  }

  &--danger {
    color: var(--color-danger);
    border-color: rgba(255, 77, 109, 0.35);
    background: rgba(255, 77, 109, 0.08);
  }

  &--info,
  &--primary {
    color: var(--color-primary);
    border-color: rgba(0, 212, 255, 0.35);
    background: rgba(0, 212, 255, 0.08);
  }

  &--muted {
    color: var(--color-text-muted);
    border-color: rgba(255, 255, 255, 0.1);
    background: rgba(255, 255, 255, 0.02);
  }
}
</style>
