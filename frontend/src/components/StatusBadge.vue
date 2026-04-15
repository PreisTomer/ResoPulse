<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
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
  font-size: var(--fs-xxs);
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
    border-color: color-mix(in srgb, white 20%, transparent);
    background: color-mix(in srgb, white 4%, transparent);
  }

  &--ok                   { @include color-variant(ok, 35%, 8%); }
  &--warn, &--amber       { @include color-variant(amber, 35%, 8%); }
  &--danger               { @include color-variant(danger, 35%, 8%); }
  &--info, &--primary     { @include color-variant(primary, 35%, 8%); }

  &--muted {
    color: var(--color-text-muted);
    border-color: color-mix(in srgb, white 10%, transparent);
    background: color-mix(in srgb, white 2%, transparent);
  }
}
</style>
