<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="lib-step">
    <article v-for="step in catalog" :key="step.id" class="lib-step__card">
      <div class="lib-step__visual">
        <StepVisual :category="step.category" />
      </div>
      <div class="lib-step__body">
        <header class="lib-step__header">
          <h3 class="lib-step__name">{{ step.name }}</h3>
          <span class="lib-step__cat">{{ step.category }}</span>
        </header>
        <p class="lib-step__desc">{{ step.description }}</p>
        <div class="lib-step__metrics">
          <div class="lib-step__metric">
            <span class="lib-step__metric-label">{{ $t('library.processStep.yieldRange') }}</span>
            <span class="lib-step__metric-value">{{ step.yieldRangePct[0] }}–{{ step.yieldRangePct[1] }}%</span>
          </div>
          <div class="lib-step__metric">
            <span class="lib-step__metric-label">{{ $t('library.processStep.hcpClearance') }}</span>
            <span class="lib-step__metric-value">{{ step.hcpLogReduction[0] }}–{{ step.hcpLogReduction[1] }} {{ $t('library.processStep.logUnit') }}</span>
          </div>
          <div class="lib-step__metric">
            <span class="lib-step__metric-label">{{ $t('library.processStep.dnaClearance') }}</span>
            <span class="lib-step__metric-value">{{ step.dnaLogReduction[0] }}–{{ step.dnaLogReduction[1] }} {{ $t('library.processStep.logUnit') }}</span>
          </div>
        </div>
        <div class="lib-step__params">
          <span class="lib-step__params-label">{{ $t('library.processStep.parameters') }}</span>
          <span class="lib-step__param-chips">
            <span v-for="p in step.parameters" :key="p.key" class="lib-step__param-chip">{{ p.label }}</span>
          </span>
        </div>
      </div>
    </article>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { PROCESS_STEP_CATALOG } from '@/constants/processStepCatalog'

import StepVisual from '@/components/StepVisual/index.vue'

export default defineComponent({
  name: 'ProcessStepSection',
  components: { StepVisual },
  computed: {
    catalog() { return PROCESS_STEP_CATALOG },
  },
})
</script>

<style lang="scss" scoped>
.lib-step {
  @include flex-col(1rem);

  &__card {
    @include flex-row(1.25rem);
    align-items: flex-start;
    padding: 1.25rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    transition: border-color var(--tr-fast);

    &:hover { border-color: color-mix(in srgb, var(--color-primary) 30%, var(--color-border)); }

    @media (max-width: 600px) { flex-direction: column; }
  }

  &__visual { flex-shrink: 0; width: 116px; height: 126px; }
  &__body { flex: 1; @include flex-col(0.6rem); min-width: 0; }

  &__header { @include flex-between(0.5rem); align-items: baseline; }
  &__name { margin: 0; font-size: 1.05rem; font-weight: 600; color: var(--color-text-heading); }
  &__cat { @include mono-upper(var(--fs-xxs)); color: var(--color-primary); opacity: var(--op-partial); }

  &__desc { margin: 0; font-size: var(--fs-md); opacity: var(--op-partial); line-height: 1.5; }

  &__metrics { @include flex-row(1.5rem); flex-wrap: wrap; }
  &__metric { @include flex-col(0.15rem); }
  &__metric-label { @include mono-upper(0.55rem); opacity: var(--op-muted); }
  &__metric-value { font-family: var(--font-mono); font-size: var(--fs-sm); color: var(--color-text); }

  &__params { @include flex-col(0.4rem); }
  &__params-label { @include mono-upper(var(--fs-xxs)); opacity: var(--op-muted); }
  &__param-chips { display: flex; flex-wrap: wrap; gap: 0.35rem; }
  &__param-chip {
    @include mono-upper(0.55rem);
    padding: 0.15rem 0.5rem;
    background: color-mix(in srgb, var(--color-text) 6%, transparent);
    border-radius: 999px;
    opacity: var(--op-partial);
  }
}
</style>
