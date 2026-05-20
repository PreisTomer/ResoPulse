<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <button
    v-if="hasCampaign"
    class="active-campaign"
    :aria-label="$t('nav.appNav.switchCampaign')"
    @click="$emit('open')"
  >
    <span class="active-campaign__molecule" :data-category="categoryClass">{{ moleculeShortLabel }}</span>
    <span class="active-campaign__name">{{ campaignName }}</span>
    <span class="active-campaign__progress">
      <span
        v-for="step in PROGRESS_STEPS"
        :key="step.module"
        class="active-campaign__dot"
        :class="{ 'active-campaign__dot--done': step.done, 'active-campaign__dot--current': step.current }"
        :aria-label="step.module"
      ></span>
    </span>
    <span class="active-campaign__chevron" aria-hidden="true">{{ ICON.CARET_DOWN }}</span>
  </button>

  <button v-else class="active-campaign active-campaign--empty" @click="$emit('open')">
    <span class="active-campaign__empty-label">{{ $t('nav.appNav.noActiveCampaign') }}</span>
    <span class="active-campaign__chevron" aria-hidden="true">{{ ICON.CARET_DOWN }}</span>
  </button>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { ICON } from '@/constants/icons'

interface ProgressStep {
  module:  string
  done:    boolean
  current: boolean
}

export default defineComponent({
  name: 'ActiveCampaignIndicator',
  props: {
    campaignName:        { type: String, default: '' },
    moleculeShortLabel:  { type: String, default: '' },
    categoryClass:       { type: String, default: 'other' },
    moduleProgress:      { type: Array as () => ProgressStep[], default: () => [] },
  },
  emits: ['open'],
  computed: {
    ICON() { return ICON },
    hasCampaign(): boolean {
      return this.campaignName.length > 0
    },
    PROGRESS_STEPS(): ProgressStep[] {
      return this.moduleProgress.length > 0
        ? this.moduleProgress
        : [
            { module: '1', done: false, current: false },
            { module: '2', done: false, current: false },
            { module: '3', done: false, current: false },
          ]
    },
  },
})
</script>

<style lang="scss" scoped>
.active-campaign {
  @include flex-row(0.6rem);
  background: color-mix(in srgb, var(--color-bg-elevated) 80%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-text) 12%, transparent);
  border-radius: 999px;
  padding: 0.3rem 0.75rem 0.3rem 0.3rem;
  cursor: pointer;
  color: var(--color-text);
  font-size: var(--fs-sm);
  transition: background var(--tr-fast), border-color var(--tr-fast), transform var(--tr-fast);
  max-width: 22rem;

  &:hover {
    background: color-mix(in srgb, var(--color-primary) 8%, var(--color-bg-elevated));
    border-color: color-mix(in srgb, var(--color-primary) 30%, transparent);
  }

  &:active {
    transform: scale(0.98);
  }

  &__molecule {
    @include mono-upper(var(--fs-xxs));
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-primary) 18%, transparent);
    color: var(--color-primary);

    &[data-category="antibody"]     { background: color-mix(in srgb, var(--color-primary) 18%, transparent);   color: var(--color-primary); }
    &[data-category="protein"]      { background: color-mix(in srgb, var(--color-amber) 18%, transparent);     color: var(--color-amber); }
    &[data-category="viral-vector"] { background: color-mix(in srgb, var(--color-danger) 18%, transparent);    color: var(--color-danger); }
    &[data-category="nucleic-acid"] { background: color-mix(in srgb, var(--color-ok) 18%, transparent);   color: var(--color-ok); }
    &[data-category="antigen"]      { background: color-mix(in srgb, var(--color-primary) 18%, transparent);   color: var(--color-primary); }
  }

  &__name {
    font-weight: 500;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  &__progress {
    @include flex-row(0.2rem);
  }

  &__dot {
    width: 0.4rem;
    height: 0.4rem;
    border-radius: 50%;
    background: color-mix(in srgb, var(--color-text) 25%, transparent);
    transition: background var(--tr-fast), transform var(--tr-fast);

    &--done {
      background: var(--color-ok);
    }

    &--current {
      background: var(--color-primary);
      transform: scale(1.3);
    }
  }

  &__chevron {
    font-size: var(--fs-xs);
    opacity: var(--op-muted);
  }

  &--empty {
    color: var(--color-text);
    opacity: var(--op-muted);
  }

  &__empty-label {
    @include mono-upper(var(--fs-xxs));
  }
}
</style>
