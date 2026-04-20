<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <Transition name="validate-modal">
    <div v-if="isOpen" class="vmodal" role="dialog" aria-modal="true" @click.self="onCancel">
      <div class="vmodal__panel">

        <div class="vmodal__header">
          <span class="vmodal__category-badge">{{ $t(workflow.categoryKey) }}</span>
          <h2 class="vmodal__title">{{ $t(workflow.titleKey) }}</h2>
          <p class="vmodal__authors">{{ $t(workflow.authorsKey) }}</p>
          <p class="vmodal__doi">
            <span class="vmodal__doi-label">{{ $t('validate.modalDoi') }}</span>
            <a :href="doiUrl" target="_blank" rel="noopener noreferrer" class="vmodal__doi-link">{{ doi }}</a>
          </p>
        </div>

        <div class="vmodal__body">
          <div class="vmodal__result-block">
            <span class="vmodal__block-label">{{ $t('validate.modalKeyResult') }}</span>
            <p
              v-for="sentence in resultSentences"
              :key="sentence"
              class="vmodal__result-sentence"
            >{{ sentence }}</p>
            <span class="vmodal__metric-badge">{{ $t(workflow.metricKey) }}</span>
          </div>

          <div class="vmodal__params-block">
            <span class="vmodal__block-label">{{ $t('validate.modalParams') }}</span>
            <table class="vmodal__params-table">
              <thead>
                <tr>
                  <th class="vmodal__th">{{ $t('validate.modalParamColSource') }}</th>
                  <th class="vmodal__th">{{ $t('validate.modalParamColValue') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in paramsRows" :key="row.source" class="vmodal__tr">
                  <td class="vmodal__td vmodal__td--source">{{ row.source }}</td>
                  <td class="vmodal__td vmodal__td--value">{{ row.value }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="vmodal__actions">
          <button class="vmodal__btn vmodal__btn--ghost" @click="onCancel">
            {{ $t('validate.modalCtaCancel') }}
          </button>
          <button class="vmodal__btn vmodal__btn--primary" @click="onReplicate">
            {{ $t('validate.modalCtaReplicate') }}
            <span class="vmodal__btn-arrow">{{ ICON.ARROW_R }}</span>
          </button>
        </div>

      </div>
    </div>
  </Transition>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'

import { mapStores } from 'pinia'

import { useReplayStore } from '@/stores/replayStore'

import { ICON } from '@/constants/icons'
import { ROUTE } from '@/constants/routes'

import type { WorkflowMeta } from './scripts/index'

interface ParamRow { source: string; value: string }

export default defineComponent({
  name: 'ValidateModal',

  props: {
    isOpen: {
      type:    Boolean,
      required: true,
    },
    workflow: {
      type:    Object as PropType<WorkflowMeta>,
      required: true,
    },
  },

  emits: ['close'],

  computed: {
    ICON() { return ICON },
    ROUTE() { return ROUTE },
    ...mapStores(useReplayStore),

    doi(): string {
      return this.$t(this.workflow.doiKey)
    },

    doiUrl(): string {
      return 'https://doi.org/' + this.doi
    },

    resultSentences(): string[] {
      const raw = this.$t(this.workflow.publishedResultKey)
      return raw
        .split('. ')
        .map((s, i, arr) => {
          const trimmed = s.trim()
          if (!trimmed) return ''
          return i < arr.length - 1 ? trimmed + '.' : trimmed
        })
        .filter(Boolean)
    },

    paramsRows(): ParamRow[] {
      return (this.$tm(this.workflow.paramsKey) as ParamRow[]) || []
    },
  },

  methods: {
    onCancel() {
      this.$emit('close')
    },

    onReplicate() {
      const script = this.workflow.factory()
      this.replayStore.setPendingScript(script)
      this.$emit('close')
      this.$router.push(ROUTE.EXPERIMENT)
    },
  },
})
</script>

<style lang="scss" scoped>
@use '@/styles/mixins' as *;

.vmodal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--color-bg) 92%, transparent);
  padding: 1rem;

  &__panel {
    @include surface-card(var(--radius-lg), 0);
    width: 100%;
    max-width: 700px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    max-height: 90vh;
  }

  &__header {
    padding: 1.5rem 1.5rem 1rem;
    border-bottom: 1px solid color-mix(in srgb, var(--color-primary) 12%, transparent);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.35rem;
    flex-shrink: 0;
    text-align: center;
  }

  &__category-badge {
    @include badge-pill();
    @include color-variant(primary, 30%, 8%);
    align-self: flex-start;
  }

  &__title {
    font-size: var(--fs-xl);
    font-weight: 600;
    color: var(--color-text);
    margin: 0;
  }

  &__authors {
    font-size: var(--fs-sm);
    color: var(--color-text);
    opacity: var(--op-muted);
    margin: 0;
  }

  &__doi {
    @include mono-upper(var(--fs-xxs));
    color: var(--color-primary);
    opacity: var(--op-dim);
    margin: 0;
  }

  &__doi-label {
    opacity: var(--op-muted);
    margin-right: 0.25rem;
  }

  &__doi-link {
    color: var(--color-primary);
    text-decoration: underline;
    text-underline-offset: 2px;
    transition: opacity var(--tr-fast), filter var(--tr-fast);

    &:hover {
      opacity: 0.85; // intentional: hover pre-active state
      filter: brightness(1.3);
    }
  }

  &__body {
    padding: 1rem 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    overflow-y: auto;
  }

  &__result-block,
  &__params-block {
    @include info-panel(
      color-mix(in srgb, var(--color-primary) 5%, transparent),
      color-mix(in srgb, var(--color-primary) 15%, transparent)
    );
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  &__block-label {
    @include mono-upper(var(--fs-xxs));
    color: var(--color-primary);
    opacity: var(--op-dim);
    text-align: center;
  }

  &__result-sentence {
    font-size: var(--fs-md);
    color: var(--color-text);
    line-height: 1.5;
    margin: 0;
    text-align: left;

    & + & {
      padding-top: 0.2rem;
      border-top: 1px solid color-mix(in srgb, var(--color-primary) 8%, transparent);
    }
  }

  &__metric-badge {
    @include badge-pill();
    @include color-variant(amber, 30%, 8%);
    align-self: flex-start;
    margin-top: 0.15rem;
  }

  // ── Parameters table ─────────────────────────────────────────────────────────
  &__params-table {
    width: 100%;
    border-collapse: collapse;
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
  }

  &__th {
    @include mono-upper(var(--fs-xxs));
    color: var(--color-primary);
    opacity: var(--op-dim);
    text-align: center;
    padding: 0.2rem 0.5rem 0.3rem;
    border-bottom: 1px solid color-mix(in srgb, var(--color-primary) 20%, transparent);
  }

  &__tr {
    &:nth-child(even) {
      background: color-mix(in srgb, var(--color-primary) 4%, transparent);
    }
  }

  &__td {
    padding: 0.3rem 0.5rem;
    vertical-align: top;
    text-align: left;
    color: var(--color-text);
    line-height: 1.4;

    &--source {
      opacity: var(--op-muted);
      white-space: nowrap;
      padding-right: 0.75rem;
      font-size: var(--fs-xxs);
    }

    &--value {
      opacity: var(--op-dim);
    }
  }

  &__actions {
    @include flex-row(0.75rem);
    justify-content: flex-end;
    padding: 1rem 1.5rem;
    border-top: 1px solid color-mix(in srgb, var(--color-primary) 10%, transparent);
    flex-shrink: 0;
  }

  &__btn {
    @include flex-row(0.4rem);
    padding: 0.5rem 1.1rem;
    border-radius: var(--radius);
    border: 1px solid;
    font-size: var(--fs-md);
    cursor: pointer;
    transition: background var(--tr-fast), color var(--tr-fast);

    &--ghost {
      background: transparent;
      color: var(--color-text);
      border-color: color-mix(in srgb, var(--color-text) 20%, transparent);
      opacity: var(--op-muted);

      &:hover { opacity: 1; }
    }

    &--primary {
      background: color-mix(in srgb, var(--color-primary) 15%, transparent);
      color: var(--color-primary);
      border-color: color-mix(in srgb, var(--color-primary) 40%, transparent);

      &:hover {
        background: color-mix(in srgb, var(--color-primary) 25%, transparent);
        border-color: var(--color-primary);
      }
    }
  }

  &__btn-arrow {
    opacity: var(--op-muted);
  }
}

// ── Transition ────────────────────────────────────────────────────────────────
.validate-modal-enter-active,
.validate-modal-leave-active {
  transition: opacity var(--tr-slow);

  .vmodal__panel {
    transition: transform var(--tr-slow), opacity var(--tr-slow);
  }
}

.validate-modal-enter-from,
.validate-modal-leave-to {
  opacity: 0;

  .vmodal__panel {
    transform: translateY(-16px);
    opacity: 0;
  }
}
</style>
