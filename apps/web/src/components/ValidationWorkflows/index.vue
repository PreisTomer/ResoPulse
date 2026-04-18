<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <section class="validate-section">

    <div class="validate-section__header">
      <h2 class="validate-section__title">{{ $t('validate.sectionTitle') }}</h2>
      <p class="validate-section__subtitle">{{ $t('validate.sectionSubtitle') }}</p>
    </div>

    <div class="validate-section__cards">
      <button
        v-for="workflow in VALIDATION_WORKFLOWS"
        :key="workflow.id"
        :class="['validate-section__card', `validate-section__card--${workflow.mod}`]"
        @click="openModal(workflow)"
      >
        <div class="validate-section__card-top">
          <span class="validate-section__badge">{{ $t(workflow.categoryKey) }}</span>
          <span class="validate-section__metric">{{ $t(workflow.metricKey) }}</span>
        </div>

        <h3 class="validate-section__card-title">{{ $t(workflow.titleKey) }}</h3>
        <p class="validate-section__card-authors">{{ $t(workflow.authorsKey) }}</p>

        <p class="validate-section__card-result">{{ $t(workflow.cardSummaryKey) }}</p>

        <a
          :href="doiUrl(workflow.doiKey)"
          target="_blank"
          rel="noopener noreferrer"
          class="validate-section__doi"
          @click.stop
        >
          <span class="validate-section__doi-label">DOI</span>
          {{ $t(workflow.doiKey) }}
        </a>

        <span class="validate-section__card-cta">
          {{ $t('validate.cardCta') }}
          <span class="validate-section__cta-arrow">{{ ICON.ARROW_R }}</span>
        </span>
      </button>
    </div>

    <ValidateModal
      v-if="activeWorkflow !== null"
      :is-open="isModalOpen"
      :workflow="activeWorkflow"
      @close="closeModal"
    />

  </section>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { ICON } from '@/constants/icons'

import ValidateModal from './ValidateModal.vue'
import { VALIDATION_WORKFLOWS, type WorkflowMeta } from './scripts/index'

export default defineComponent({
  name: 'ValidateSection',

  components: { ValidateModal },

  data() {
    return {
      isModalOpen:    false,
      activeWorkflow: null as WorkflowMeta | null,
    }
  },

  computed: {
    ICON()                { return ICON },
    VALIDATION_WORKFLOWS(){ return VALIDATION_WORKFLOWS },
  },

  methods: {
    openModal(workflow: WorkflowMeta) {
      this.activeWorkflow = workflow
      this.isModalOpen    = true
    },

    closeModal() {
      this.isModalOpen    = false
      this.activeWorkflow = null
    },

    doiUrl(doiKey: string): string {
      return 'https://doi.org/' + this.$t(doiKey)
    },
  },
})
</script>

<style lang="scss" scoped>
@use '@/styles/mixins' as *;

.validate-section {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2rem;
  padding: 3rem 1rem 2rem;

  &__header {
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    max-width: 640px;
  }

  &__title {
    font-size: 1.75rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
    line-height: 1.2;
    letter-spacing: -0.01em;
  }

  &__subtitle {
    font-size: 1.05rem;
    color: var(--color-text);
    opacity: var(--op-dim);
    margin: 0;
    line-height: 1.6;
  }

  &__cards {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1rem;
    width: 100%;
    max-width: 700px;

    @media (max-width: 768px) {
      grid-template-columns: 1fr;
    }
  }

  &__card {
    @include surface-card(var(--radius-lg), 1.25rem);
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    text-align: left;
    cursor: pointer;
    border: none;
    transition: border-color var(--tr-normal), background var(--tr-normal), transform var(--tr-normal);

    &:hover {
      border-color: color-mix(in srgb, var(--color-primary) 40%, transparent);
      background: color-mix(in srgb, var(--color-primary) 5%, var(--color-surface));
      transform: translateY(-2px);
    }

    &--cancer {
      border-left: 3px solid color-mix(in srgb, var(--color-danger) 70%, transparent);
      &:hover { border-left-color: var(--color-danger); }
    }
    &--resonance {
      border-left: 3px solid color-mix(in srgb, var(--color-amber) 55%, transparent);
      &:hover { border-left-color: var(--color-amber); }
    }
  }

  &__card-top {
    @include flex-row(0.5rem);
    justify-content: space-between;
  }

  &__badge {
    @include badge-pill();
    @include color-variant(primary, 30%, 8%);
    white-space: nowrap;
    flex-shrink: 0;

    .validate-section__card--cancer    & { @include color-variant(danger, 30%, 8%); }
    .validate-section__card--resonance & { @include color-variant(amber,  30%, 8%); }
  }

  &__metric {
    @include mono-upper(var(--fs-xxs));
    color: var(--color-amber);
    opacity: var(--op-dim);
  }

  &__card-title {
    font-size: var(--fs-lg);
    font-weight: 600;
    color: var(--color-text);
    margin: 0;
  }

  &__card-authors {
    font-size: var(--fs-xs);
    color: var(--color-text);
    opacity: var(--op-muted);
    margin: 0;
  }

  &__card-result {
    font-size: var(--fs-sm);
    color: var(--color-text);
    opacity: var(--op-dim);
    line-height: 1.5;
    margin: 0;
    flex: 1;
  }

  &__doi {
    @include mono-upper(var(--fs-xxs));
    color: var(--color-text);
    opacity: var(--op-muted);
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    transition: opacity var(--tr-fast), color var(--tr-fast);

    &:hover {
      opacity: 1;
      color: var(--color-primary);
    }

    .validate-section__card--cancer &:hover  { color: var(--color-danger); }
    .validate-section__card--resonance &:hover { color: var(--color-amber); }
  }

  &__doi-label {
    @include badge-pill(0.1rem 0.35rem, 3px);
    color: inherit;
    border-color: currentColor;
    background: transparent;
    opacity: var(--op-dim);
    letter-spacing: 0.06em;
  }

  &__card-cta {
    @include flex-row(0.35rem);
    @include mono-upper(var(--fs-xxs));
    color: var(--color-primary);
    margin-top: 0.25rem;
    transition: opacity var(--tr-fast);

    .validate-section__card:hover & { opacity: 1; }
    .validate-section__card--cancer & { color: var(--color-danger); }
    .validate-section__card--resonance & { color: var(--color-amber); }
  }

  &__cta-arrow {
    transition: transform var(--tr-fast);

    .validate-section__card:hover & {
      transform: translateX(3px);
    }
  }
}
</style>
