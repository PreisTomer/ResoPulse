<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <section id="protocol-steps" class="protocol__section">
    <h2 class="protocol__section-title" v-html="$t('protocol.protocol.title')"></h2>
    <ol class="protocol__steps" @click="onStepsClick">
      <li v-for="(stepKey, i) in stepKeys" :key="stepKey" class="protocol__step">
        <div class="protocol__step-num">{{ String(i + 1).padStart(2, '0') }}</div>
        <div class="protocol__step-body">
          <div class="protocol__step-title" v-html="$t(`protocol.protocol.steps.${stepKey}.title`)"></div>
          <p class="protocol__step-desc" v-html="$t(`protocol.protocol.steps.${stepKey}.desc`)"></p>
        </div>
      </li>
    </ol>
  </section>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import { useUiStore } from '@/stores/uiStore'
import { scrollAndHighlight } from '@/utils/highlight'

export default defineComponent({
  name: 'ProtocolSectionSteps',

  props: {
    stepKeys: {
      type: Array as PropType<string[]>,
      required: true,
    },
  },

  methods: {
    // Handles lab-link spans in step descriptions: scroll-highlight on current route, or navigate then highlight.
    onStepsClick(e: MouseEvent) {
      const link = (e.target as HTMLElement).closest<HTMLElement>('.proto-lab-link')
      if (!link) return
      e.preventDefault()

      const targetId = link.dataset.target ?? ''
      const route    = link.dataset.route  ?? '/experiment'

      if (this.$route.path === route) {
        scrollAndHighlight(targetId)
      } else {
        useUiStore().setPendingHighlight(targetId)
        this.$router.push(route)
      }
    },
  },
})
</script>

<style lang="scss" scoped>

@use './protocol' as proto;

@include proto.protocol-section();

.protocol__steps {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.protocol__step {
  @include surface-card(var(--radius), 0.75rem 1rem);
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  transition: border-color var(--tr-fast);

  &:hover { border-color: color-mix(in srgb, var(--color-primary) 25%, transparent); }
}

.protocol__step-num {
  font-family: var(--font-mono);
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--color-primary);
  opacity: var(--op-ghost);
  flex-shrink: 0;
  width: 2rem;
  line-height: 1.5;
}

.protocol__step-body {
  @include flex-col(0.25rem);
  flex: 1;
}

.protocol__step-title {
  font-size: var(--fs-lg);
  font-weight: 600;
  color: var(--color-text-heading);
}

.protocol__step-desc {
  font-size: var(--fs-md);
  line-height: 1.6;
  color: var(--color-text);
  margin: 0;

  // Inline lab-link spans inside v-html rendered descriptions
  :deep(.proto-lab-link) {
    display: inline-flex;
    align-items: center;
    gap: 0.2em;
    color: var(--color-primary);
    font-weight: 500;
    cursor: pointer;
    border-bottom: 1px dashed color-mix(in srgb, var(--color-primary) 50%, transparent);
    transition: color var(--tr-fast), border-color var(--tr-fast);

    &::after {
      content: '↗';
      font-size: 0.7em;
      opacity: var(--op-muted);
      transition: opacity var(--tr-fast);
    }

    &:hover {
      color: var(--color-primary-light, var(--color-primary));
      border-bottom-color: var(--color-primary);

      &::after { opacity: 1; }
    }
  }
}
</style>
