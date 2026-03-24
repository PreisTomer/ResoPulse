<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <nav class="protocol__toc" :class="{ 'protocol__toc--mobile-open': isMobileOpen }" aria-label="Table of contents">
    <div class="protocol__toc-title" v-html="$t('protocol.toc.title')"></div>
    <a
      v-for="item in items"
      :key="item.id"
      :href="`#${item.id}`"
      class="protocol__toc-link"
      :class="{
        'protocol__toc-indent':       item.indent,
        'protocol__toc-link--active': isActive(item),
      }"
      @click="$emit('close')"
      v-html="$t(`protocol.toc.${item.key}`)"
    ></a>

    <div class="protocol__toc-divider"></div>
    <button class="protocol__toc-feedback" @click="$emit('feedback')">
      <span class="protocol__toc-feedback-main">{{ $t('protocol.feedback.trigger') }}</span>
      <span class="protocol__toc-feedback-sub">{{ $t('protocol.feedback.triggerSub') }}</span>
    </button>
  </nav>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import type { TocItem } from './types'

export default defineComponent({
  name: 'ProtocolToc',

  props: {
    items: {
      type: Array as PropType<TocItem[]>,
      required: true,
    },
    activeSection: {
      type: String,
      required: true,
    },
    isMobileOpen: {
      type: Boolean,
      default: false,
    },
  },

  emits: ['close', 'feedback'],

  methods: {
    isActive(item: TocItem): boolean {
      if (item.physicsParent) {
        const physicsIds = new Set(['physics', 'schwan', 'thermal', 'maxwell', 'disruption', 'resonance', 'nsep', 'doubleshell', 'dep', 'uncertainty', 'biomodulation', 'impedance', 'sonification'])
        return physicsIds.has(this.activeSection)
      }
      return this.activeSection === item.id
    },
  },
})
</script>

<style lang="scss" scoped>


.protocol__toc {
  @include flex-col(0.05rem);
  @include surface-card(var(--radius), 1.25rem);
  position: sticky;
  top: 5rem;
  max-height: calc(100vh - 6rem);
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--color-border) transparent;

  &-title {
    @include mono-upper(var(--fs-xxs), 0.12em);
    color: var(--color-text-muted);
    margin-bottom: 0.65rem;
  }

  &-link {
    font-size: var(--fs-md);
    color: var(--color-text-muted);
    text-decoration: none;
    padding: 0.3rem 0.5rem;
    border-radius: 4px;
    transition: color var(--tr-fast), background-color var(--tr-fast);
    line-height: 1.4;

    &:hover {
      color: var(--color-primary);
      background-color: color-mix(in srgb, var(--color-primary) 6%, transparent);
    }

    &--active {
      color: var(--color-primary);
      background-color: color-mix(in srgb, var(--color-primary) 8%, transparent);
      border-left: 2px solid var(--color-primary);
      padding-left: calc(0.5rem - 2px);
    }
  }

  &-divider {
    height: 1px;
    background: var(--color-border);
    margin: 0.65rem 0;
    opacity: var(--op-ghost);
  }

  &-feedback {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    width: 100%;
    background: color-mix(in srgb, var(--color-amber) 5%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-amber) 25%, var(--color-border));
    border-radius: var(--radius);
    padding: 0.55rem 0.65rem;
    cursor: pointer;
    text-align: left;
    transition: background-color var(--tr-fast), border-color var(--tr-fast);

    &:hover {
      background: color-mix(in srgb, var(--color-amber) 10%, transparent);
      border-color: color-mix(in srgb, var(--color-amber) 50%, var(--color-border));
    }

    &-main {
      font-size: var(--fs-sm);
      font-weight: 600;
      color: var(--color-amber);
    }

    &-sub {
      @include mono-upper(var(--fs-xxs), 0.05em);
      color: var(--color-text-muted);
      opacity: var(--op-muted);
      text-transform: none;
      letter-spacing: 0;
      font-size: var(--fs-xxs);
    }
  }

  &-indent {
    padding-left: 1.5rem;
    font-size: var(--fs-sm);

    &.protocol__toc-link--active {
      padding-left: calc(1.5rem - 2px);
    }
  }
}

@media (max-width: 768px) {
  .protocol__toc {
    display: none;
    position: fixed;
    top: 60px;
    left: 0;
    right: 0;
    height: calc(100vh - 60px);
    height: calc(100dvh - 60px);
    z-index: 90;
    background: color-mix(in srgb, var(--color-bg) 97%, transparent);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-top: 1px solid var(--color-border);
    padding: 1.5rem 1.25rem;
    overflow-y: auto;
    flex-direction: column;
    gap: 0.1rem;

    &--mobile-open {
      display: flex;
    }
  }

  .protocol__toc-link {
    font-size: var(--fs-xl);
    padding: 0.65rem 0.75rem;
    border-bottom: 1px solid color-mix(in srgb, var(--color-border) 40%, transparent);

    &:last-child { border-bottom: none; }
  }

  .protocol__toc-indent {
    padding-left: 1.75rem;
    font-size: var(--fs-md);
  }
}

@media (max-width: 400px) {
  .protocol__toc-link {
    font-size: var(--fs-md);
    padding: 0.5rem 0.65rem;
  }
}
</style>
