<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <section class="advisor">
    <header class="advisor__header">
      <div>
        <h3 class="advisor__title">{{ ICON.AI }} {{ $t('advisor.title') }}</h3>
        <p class="advisor__subtitle">{{ $t('advisor.subtitle') }}</p>
      </div>
      <span class="advisor__badge">{{ $t('advisor.badge') }}</span>
    </header>

    <ul class="advisor__list">
      <li v-for="advice in adviceList" :key="advice.id" class="advisor__item" :data-severity="advice.severity">
        <div class="advisor__item-head">
          <span class="advisor__severity" :data-severity="advice.severity">{{ severityLabel(advice.severity) }}</span>
          <span class="advisor__module">{{ moduleLabel(advice.module) }}</span>
        </div>
        <h4 class="advisor__item-title">{{ advice.title }}</h4>
        <p class="advisor__item-detail">{{ advice.detail }}</p>
      </li>
    </ul>
  </section>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'

import { ICON } from '@/constants/icons'

import { type Advice, type AdviceSeverity, type AdviceModule } from '@/utils/advisor/campaignAdvisor'

export default defineComponent({
  name: 'CampaignAdvisorPanel',
  props: {
    adviceList: { type: Array as PropType<Advice[]>, default: () => [] },
  },
  computed: {
    ICON() { return ICON },
  },
  methods: {
    severityLabel(s: AdviceSeverity): string {
      const map: Record<AdviceSeverity, string> = {
        critical:   this.$t('advisor.severityCritical'),
        warning:    this.$t('advisor.severityWarning'),
        suggestion: this.$t('advisor.severitySuggestion'),
        positive:   this.$t('advisor.severityPositive'),
      }
      return map[s]
    },
    moduleLabel(m: AdviceModule): string {
      const map: Record<AdviceModule, string> = {
        'cell-engineering': this.$t('advisor.moduleCellEngineering'),
        'clone-upstream':   this.$t('advisor.moduleCloneUpstream'),
        'downstream':       this.$t('advisor.moduleDownstream'),
        'lab-runs':         this.$t('advisor.moduleLabRuns'),
      }
      return map[m]
    },
  },
})
</script>

<style lang="scss" scoped>
.advisor {
  @include flex-col(1rem);
  padding: 1.5rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);

  &__header { @include flex-between(1rem); align-items: flex-start; }
  &__title { margin: 0 0 0.3rem; font-size: 1.15rem; font-weight: 600; color: var(--color-text-heading); }
  &__subtitle { margin: 0; font-size: var(--fs-sm); opacity: var(--op-partial); line-height: 1.5; max-width: 38rem; }
  &__badge {
    @include mono-upper(var(--fs-xxs)); padding: 0.3rem 0.6rem; border-radius: 999px; flex-shrink: 0;
    background: color-mix(in srgb, var(--color-primary) 14%, transparent); color: var(--color-primary);
  }

  &__list { list-style: none; margin: 0; padding: 0; @include flex-col(0.6rem); }

  &__item {
    @include flex-col(0.4rem);
    padding: 0.9rem 1.1rem;
    border-radius: var(--radius);
    border: 1px solid var(--color-border);
    border-left-width: 3px;

    &[data-severity="critical"]   { border-left-color: var(--color-danger);  background: color-mix(in srgb, var(--color-danger) 5%, transparent); }
    &[data-severity="warning"]    { border-left-color: var(--color-amber);   background: color-mix(in srgb, var(--color-amber) 5%, transparent); }
    &[data-severity="suggestion"] { border-left-color: var(--color-primary); background: color-mix(in srgb, var(--color-primary) 4%, transparent); }
    &[data-severity="positive"]   { border-left-color: var(--color-ok); background: color-mix(in srgb, var(--color-ok) 5%, transparent); }
  }

  &__item-head { @include flex-row(0.6rem); align-items: center; }
  &__severity {
    @include mono-upper(var(--fs-xxs)); padding: 0.1rem 0.45rem; border-radius: 999px;
    &[data-severity="critical"]   { background: color-mix(in srgb, var(--color-danger) 18%, transparent);  color: var(--color-danger); }
    &[data-severity="warning"]    { background: color-mix(in srgb, var(--color-amber) 18%, transparent);   color: var(--color-amber); }
    &[data-severity="suggestion"] { background: color-mix(in srgb, var(--color-primary) 16%, transparent); color: var(--color-primary); }
    &[data-severity="positive"]   { background: color-mix(in srgb, var(--color-ok) 18%, transparent); color: var(--color-ok); }
  }
  &__module { @include mono-upper(var(--fs-xxs)); opacity: var(--op-muted); }
  &__item-title { margin: 0; font-size: var(--fs-md); font-weight: 600; color: var(--color-text-heading); }
  &__item-detail { margin: 0; font-size: var(--fs-sm); opacity: var(--op-partial); line-height: 1.5; }
}
</style>
