<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div
    :id="anchorId"
    class="protocol-sub"
    :class="{ 'protocol-sub--open': isOpen }"
  >
    <button
      class="protocol-sub__toggle"
      :aria-expanded="isOpen"
      :aria-controls="`${anchorId}-body`"
      @click="toggle"
    >
      <span class="protocol-sub__caret" :class="{ 'protocol-sub__caret--open': isOpen }">{{ ICON.CHEVRON }}</span>
      <h3 class="protocol-sub__title" v-html="titleHtml" v-tip="tooltip"></h3>
    </button>

    <p v-if="showSummary" class="protocol-sub__summary" v-html="summary"></p>

    <div v-show="isOpen" :id="`${anchorId}-body`" class="protocol-sub__body">
      <slot />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { ICON } from '@/constants/icons'

export default defineComponent({
  name: 'ProtocolSubsection',

  props: {
    anchorId:      { type: String, required: true },
    titleHtml:     { type: String, required: true },
    tooltip:       { type: String, default: '' },
    summary:       { type: String, default: '' },
    expandToken:   { type: Number, default: 0 },
    collapseToken: { type: Number, default: 0 },
  },

  data() {
    return { isOpen: false }
  },

  computed: {
    ICON() { return ICON },

    showSummary(): boolean {
      return !this.isOpen && this.summary.length > 0
    },
  },

  watch: {
    expandToken()   { this.isOpen = true  },
    collapseToken() { this.isOpen = false },
  },

  mounted() {
    if (this.matchesHash()) this.isOpen = true
    window.addEventListener('hashchange', this.onHashChange)
  },

  beforeUnmount() {
    window.removeEventListener('hashchange', this.onHashChange)
  },

  methods: {
    toggle(): void {
      this.isOpen = !this.isOpen
    },

    matchesHash(): boolean {
      return window.location.hash === `#${this.anchorId}`
    },

    onHashChange(): void {
      if (this.matchesHash()) this.isOpen = true
    },
  },
})
</script>

<style lang="scss" scoped>
.protocol-sub {
  margin: 1.25rem 0;
  border-top: 1px solid var(--color-border);
  padding-top: 0.85rem;

  &__toggle {
    @include flex-row(0.55rem);
    width: 100%;
    background: transparent;
    border: none;
    padding: 0;
    cursor: pointer;
    text-align: left;
    color: inherit;

    &:hover .protocol-sub__title { color: var(--color-primary); }
  }

  &__caret {
    font-size: var(--fs-md);
    color: var(--color-text-muted);
    opacity: var(--op-dim);
    transition: transform var(--tr-fast), color var(--tr-fast), opacity var(--tr-fast);
    flex-shrink: 0;
    line-height: 1;

    &--open {
      transform: rotate(90deg);
      color: var(--color-primary);
      opacity: 1;
    }
  }

  &__title {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--color-text-heading);
    font-family: var(--font-mono);
    letter-spacing: 0.04em;
    margin: 0;
    transition: color var(--tr-fast);
  }

  &__summary {
    margin: 0.45rem 0 0 1.6rem;
    font-size: var(--fs-md);
    line-height: 1.55;
    color: var(--color-text-muted);
    opacity: var(--op-strong);
  }

  &__body {
    margin-top: 0.6rem;
  }
}
</style>
