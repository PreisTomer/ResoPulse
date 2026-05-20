<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="sequencer">
    <header class="sequencer__header">
      <h3 class="sequencer__title">{{ $t('downstream.sequencer.title') }}</h3>
    </header>

    <div v-if="steps.length === 0" class="sequencer__empty">
      <p class="sequencer__empty-title">{{ $t('downstream.sequencer.emptyTitle') }}</p>
      <p class="sequencer__empty-text">{{ $t('downstream.sequencer.emptyText') }}</p>
      <button class="sequencer__template-btn" @click="$emit('loadTemplate')">{{ $t('downstream.sequencer.loadTemplate') }}</button>
    </div>

    <ol v-else class="sequencer__list">
      <li
        v-for="(step, i) in steps"
        :key="step.id"
        class="sequencer__item"
        :class="{ 'sequencer__item--selected': step.id === selectedId, 'sequencer__item--bottleneck': step.id === bottleneckId }"
        @click="$emit('select', step.id)"
      >
        <div class="sequencer__visual">
          <StepVisual :category="categoryFor(step.stepType)" />
        </div>

        <div class="sequencer__info">
          <span class="sequencer__step-name">{{ nameFor(step.stepType) }}</span>
          <span class="sequencer__yield-badge" :data-tier="tierFor(yieldFor(step.id))">{{ Math.round(yieldFor(step.id)) }}%</span>
        </div>

        <div class="sequencer__controls">
          <button class="sequencer__ctrl" :disabled="i === 0" :aria-label="$t('downstream.sequencer.moveUp')" @click.stop="$emit('move', i, i - 1)">{{ ICON.CARET_UP }}</button>
          <button class="sequencer__ctrl" :disabled="i === steps.length - 1" :aria-label="$t('downstream.sequencer.moveDown')" @click.stop="$emit('move', i, i + 1)">{{ ICON.CARET_DOWN }}</button>
          <button class="sequencer__ctrl" :aria-label="$t('downstream.sequencer.duplicate')" @click.stop="$emit('duplicate', step.id)">{{ ICON.SAVE }}</button>
          <button class="sequencer__ctrl sequencer__ctrl--danger" :aria-label="$t('downstream.sequencer.remove')" @click.stop="$emit('remove', step.id)">{{ ICON.CLOSE }}</button>
        </div>
      </li>
    </ol>

    <button class="sequencer__add-btn" @click="$emit('addStep')">{{ $t('downstream.sequencer.addStep') }}</button>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'

import { ICON } from '@/constants/icons'
import { getStepById, STEP_CATEGORY, type StepCategory } from '@/constants/processStepCatalog'

import StepVisual from '@/components/StepVisual/index.vue'

import type { ProcessStepInstance, StepYieldResult } from '@/types/downstream'

function tierFor(pct: number): 'high' | 'mid' | 'low' {
  if (pct >= 90) return 'high'
  if (pct >= 75) return 'mid'
  return 'low'
}

export default defineComponent({
  name: 'ProcessStepSequencer',
  components: { StepVisual },
  props: {
    steps:        { type: Array as PropType<ProcessStepInstance[]>, default: () => [] },
    results:      { type: Array as PropType<StepYieldResult[]>, default: () => [] },
    selectedId:   { type: String as PropType<string | null>, default: null },
    bottleneckId: { type: String as PropType<string | null>, default: null },
  },
  emits: ['select', 'move', 'duplicate', 'remove', 'addStep', 'loadTemplate'],
  computed: {
    ICON() { return ICON },
  },
  methods: {
    tierFor,
    nameFor(stepType: string): string {
      return getStepById(stepType)?.shortLabel ?? stepType
    },
    categoryFor(stepType: string): StepCategory {
      return getStepById(stepType)?.category ?? STEP_CATEGORY.CAPTURE
    },
    yieldFor(instanceId: string): number {
      return this.results.find(r => r.instanceId === instanceId)?.yieldPct ?? 0
    },
  },
})
</script>

<style lang="scss" scoped>
.sequencer {
  @include flex-col(0.75rem);

  &__header {
    @include flex-between(0.5rem);
  }

  &__title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text-heading);
  }

  &__empty {
    @include flex-col(0.5rem);
    align-items: center;
    text-align: center;
    padding: 2rem 1rem;
    background: var(--color-surface);
    border: 1px dashed var(--color-border);
    border-radius: var(--radius);
  }

  &__empty-title {
    margin: 0;
    font-weight: 600;
    color: var(--color-text-heading);
  }

  &__empty-text {
    margin: 0;
    font-size: var(--fs-sm);
    opacity: var(--op-partial);
    line-height: 1.5;
  }

  &__template-btn {
    @include mono-upper(var(--fs-xs));
    background: var(--color-primary);
    color: var(--color-bg);
    border: none;
    padding: 0.55rem 1rem;
    border-radius: var(--radius);
    cursor: pointer;
    margin-top: 0.5rem;

    &:hover { background: color-mix(in srgb, var(--color-primary) 90%, white); }
  }

  &__list {
    list-style: none;
    margin: 0;
    padding: 0;
    @include flex-col(0.5rem);
  }

  &__item {
    @include flex-row(0.6rem);
    align-items: center;
    padding: 0.6rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    cursor: pointer;
    transition: border-color var(--tr-fast), transform var(--tr-fast);

    &:hover { transform: translateX(2px); border-color: color-mix(in srgb, var(--color-primary) 35%, var(--color-border)); }

    &--selected { border-color: var(--color-primary); box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-primary) 35%, transparent); }
    &--bottleneck { border-color: color-mix(in srgb, var(--color-amber) 60%, transparent); }
  }

  &__visual {
    width: 40px;
    height: 48px;
    flex-shrink: 0;
  }

  &__info {
    @include flex-col(0.3rem);
    flex: 1;
    min-width: 0;
  }

  &__step-name {
    font-size: var(--fs-sm);
    font-weight: 600;
    color: var(--color-text);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__yield-badge {
    @include mono-upper(var(--fs-xxs));
    align-self: flex-start;
    padding: 0.1rem 0.45rem;
    border-radius: 999px;

    &[data-tier="high"] { background: color-mix(in srgb, var(--color-ok) 20%, transparent); color: var(--color-ok); }
    &[data-tier="mid"]  { background: color-mix(in srgb, var(--color-primary) 20%, transparent); color: var(--color-primary); }
    &[data-tier="low"]  { background: color-mix(in srgb, var(--color-amber) 22%, transparent); color: var(--color-amber); }
  }

  &__controls {
    @include flex-col(0.15rem);
    flex-shrink: 0;
  }

  &__ctrl {
    width: 1.5rem;
    height: 1.2rem;
    @include inline-flex-center;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 4px;
    color: var(--color-text);
    opacity: var(--op-dim);
    cursor: pointer;
    font-size: 0.7rem;
    transition: opacity var(--tr-fast), border-color var(--tr-fast), color var(--tr-fast);

    &:hover:not(:disabled) { opacity: 1; border-color: var(--color-primary); color: var(--color-primary); }
    &:disabled { opacity: var(--op-ghost); cursor: not-allowed; }

    &--danger:hover:not(:disabled) { border-color: var(--color-danger); color: var(--color-danger); }
  }

  &__add-btn {
    @include mono-upper(var(--fs-xs));
    background: transparent;
    border: 1px dashed var(--color-border);
    color: var(--color-text);
    padding: 0.6rem;
    border-radius: var(--radius);
    cursor: pointer;
    transition: border-color var(--tr-fast), color var(--tr-fast);

    &:hover { border-color: var(--color-primary); color: var(--color-primary); }
  }
}
</style>
