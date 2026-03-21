<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="reports-log-legend">
    <span class="reports-log-legend__item">
      <span class="reports-log-legend__color reports-log-legend__cancer-val">{{ ICON.SQUARE }}</span>
      {{ $t('reports.legendTarget') }}
    </span>
    <span class="reports-log-legend__item">
      <span class="reports-log-legend__color reports-log-legend__ref-val">{{ ICON.SQUARE }}</span>
      {{ $t('reports.legendHealthy') }}
    </span>
    <span class="reports-log-legend__item">
      <span class="reports-log-legend__color reports-log-legend__green-val">{{ ICON.SQUARE }}</span>
      {{ $t('reports.legendSelectivity', { strong: THRESHOLDS.SEL_STRONG }) }}
    </span>
    <span class="reports-log-legend__item">
      <span class="reports-log-legend__color reports-log-legend__warn-val">{{ ICON.SQUARE }}</span>
      {{ $t('reports.legendWarning', { marginal: THRESHOLDS.SEL_MARGINAL, strong: THRESHOLDS.SEL_STRONG }) }}
    </span>
    <span class="reports-log-legend__item reports-log-legend__footnote">
      {{ $t('reports.footnote') }}
    </span>
    <RouterLink
      to="/instrument"
      class="reports-log-legend__item reports-log-legend__instrument-link"
      :title="$t('reports.instrumentLinkTitle')"
    >
      {{ $t('reports.instrumentLink') }}
    </RouterLink>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { THRESHOLDS } from '@/constants/physics'
import { ICON } from '@/constants/icons'

export default defineComponent({
  name: 'ReportsLogLegend',

  setup() {
    return { ICON, THRESHOLDS }
  },
})
</script>

<style lang="scss" scoped>
.reports-log-legend {
  display: flex;
  gap: 1.25rem;
  flex-wrap: wrap;
  padding: 0.75rem 1.5rem;
  border-top: 1px solid var(--color-border);
  font-size: var(--fs-xs);
  font-family: var(--font-mono);
  color: var(--color-text-muted);

  &__item {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  &__color {
    font-size: var(--fs-lg);
  }

  &__cancer-val { color: var(--color-danger); }
  &__ref-val    { color: var(--color-primary); }
  &__green-val  { color: var(--color-lime); }
  &__warn-val   { color: var(--color-warning); }

  &__footnote {
    width: 100%;
    font-size: var(--fs-xxs);
    color: var(--color-text-muted);
    opacity: 0.65;
    margin-top: 0.15rem;
    line-height: 1.5;
  }

  &__instrument-link {
    width: 100%;
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    color: var(--color-primary);
    opacity: 0.7;
    text-decoration: none;
    margin-top: 0.1rem;
    transition: opacity 0.15s;

    &:hover {
      opacity: 1;
    }
  }
}
</style>
