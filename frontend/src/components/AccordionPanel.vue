<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div
    class="accordion-panel"
    :class="{
      'accordion-panel--compact': compact,
      'accordion-panel--border-toggle': borderOnToggle,
    }"
  >
    <button
      class="accordion-panel__toggle"
      :class="{ 'accordion-panel__toggle--open': isOpen }"
      @click="toggle"
    >
      <span class="accordion-panel__left">
        <span class="accordion-panel__icon">{{ icon }}</span>
        <span class="accordion-panel__title">{{ title }}</span>
        <span v-if="subtitle" class="accordion-panel__sub">{{ subtitle }}</span>
      </span>
      <span class="accordion-panel__chevron" :class="{ 'accordion-panel__chevron--open': isOpen }">{{ ICON.CHEVRON }}</span>
    </button>
    <div v-show="isOpen" class="accordion-panel__body">
      <slot />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { ICON } from '@/constants/icons'
import { EMIT } from '@/constants/emitEvents'
export default defineComponent({
  name: 'AccordionPanel',

  props: {
    icon:          { type: String,  required: true },
    title:         { type: String,  required: true },
    subtitle:      { type: String,  default: '' },
    initialOpen:   { type: Boolean, default: false },
    compact:       { type: Boolean, default: false },
    borderOnToggle: { type: Boolean, default: false },
  },

  emits: [EMIT.OPEN_CHANGE],

  data() {
    return {
      isOpen: this.initialOpen,
    }
  },

  computed: {
    ICON() { return ICON },
    EMIT() { return EMIT },
  },

  methods: {
    toggle() {
      this.isOpen = !this.isOpen
      this.$emit(EMIT.OPEN_CHANGE, this.isOpen)
    },
  },
})
</script>

<style lang="scss" scoped>

.accordion-panel {
  /* ── Toggle button ──────────────────────────────────────────── */
  &__toggle {
    @include flex-between();
    width: 100%;
    background: transparent;
    border: none;
    padding: 0.75rem 1rem;
    cursor: pointer;
    gap: 0.5rem;
    transition: background var(--tr-fast);

    &:hover { background: color-mix(in srgb, white 4%, transparent); }
  }

  &__toggle:hover &__title {
    color: var(--color-primary);
  }

  &__left {
    @include flex-row(0.6rem);
    align-items: center;
    min-width: 0;
  }

  &__icon {
    font-size: var(--fs-xl);
    color: var(--color-primary);
    flex-shrink: 0;
  }

  &__title {
    font-size: var(--fs-md);
    font-weight: 600;
    color: var(--color-text-heading);
    font-family: var(--font-mono);
    letter-spacing: 0.04em;
    flex-shrink: 0;
    transition: color var(--tr-fast);
  }

  &__sub {
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  &__chevron {
    font-size: 1.1rem;
    color: var(--color-text-muted);
    flex-shrink: 0;
    transition: transform var(--tr-normal);
    &--open { transform: rotate(90deg); }
  }

  /* ── compact variant - SelectivityPanel style ───────────────── */
  &--compact &__toggle {
    padding: 0.5rem 0;
    &:hover { background: transparent; }
  }

  &--compact &__toggle--open {
    border-bottom: 1px solid var(--color-border);
  }

  &--compact &__body {
    padding-top: 0.5rem;
  }

  /* ── border-toggle variant - card header style ──────────────── */
  &--border-toggle &__toggle {
    border-bottom: 1px solid var(--color-border);
    padding: 0.6rem 1rem;
    &:hover { background: transparent; }
  }
}
</style>
