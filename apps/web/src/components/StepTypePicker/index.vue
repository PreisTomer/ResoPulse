<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="step-picker-overlay" @click.self="$emit('close')">
    <div class="step-picker" role="dialog" aria-labelledby="step-picker-title">
      <header class="step-picker__header">
        <h3 id="step-picker-title" class="step-picker__title">{{ $t('downstream.stepPicker.title') }}</h3>
        <button class="step-picker__close" :aria-label="$t('downstream.stepPicker.close')" @click="$emit('close')">{{ ICON.CLOSE }}</button>
      </header>

      <div class="step-picker__body">
        <section v-for="group in groupedSteps" :key="group.category" class="step-picker__group">
          <span class="step-picker__group-label">{{ group.label }}</span>
          <div class="step-picker__grid">
            <button
              v-for="step in group.steps"
              :key="step.id"
              class="step-picker__card"
              @click="$emit('pick', step.id)"
            >
              <div class="step-picker__card-visual">
                <StepVisual :category="step.category" />
              </div>
              <span class="step-picker__card-name">{{ step.name }}</span>
              <span class="step-picker__card-yield">{{ $t('downstream.stepPicker.typicalYield') }}: {{ step.yieldRangePct[0] }}–{{ step.yieldRangePct[1] }}%</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'

import { ICON } from '@/constants/icons'
import { PROCESS_STEP_CATALOG, STEP_CATEGORY, type StepCategory, type ProcessStepEntry } from '@/constants/processStepCatalog'
import { type MoleculeType } from '@/constants/moleculeTypes'

import StepVisual from '@/components/StepVisual/index.vue'

interface Group {
  category: StepCategory
  label:    string
  steps:    ProcessStepEntry[]
}

const CATEGORY_LABELS: Record<StepCategory, string> = {
  [STEP_CATEGORY.CLARIFICATION]:      'Clarification',
  [STEP_CATEGORY.CAPTURE]:            'Capture',
  [STEP_CATEGORY.VIRAL_INACTIVATION]: 'Viral Inactivation',
  [STEP_CATEGORY.POLISH]:             'Polish',
  [STEP_CATEGORY.UF_DF]:              'UF / DF',
  [STEP_CATEGORY.FORMULATION]:        'Formulation',
}

const CATEGORY_ORDER: StepCategory[] = [
  STEP_CATEGORY.CLARIFICATION,
  STEP_CATEGORY.CAPTURE,
  STEP_CATEGORY.VIRAL_INACTIVATION,
  STEP_CATEGORY.POLISH,
  STEP_CATEGORY.UF_DF,
  STEP_CATEGORY.FORMULATION,
]

export default defineComponent({
  name: 'StepTypePicker',
  components: { StepVisual },
  props: {
    moleculeType: { type: String as PropType<MoleculeType>, required: true },
  },
  emits: ['close', 'pick'],
  computed: {
    ICON() { return ICON },
    groupedSteps(): Group[] {
      const allowed = new Set(PROCESS_STEP_CATALOG
        .filter(s => s.compatibleMolecules.includes(this.moleculeType))
        .map(s => s.id))
      return CATEGORY_ORDER.map(category => ({
        category,
        label: CATEGORY_LABELS[category],
        steps: PROCESS_STEP_CATALOG.filter(s => s.category === category && allowed.has(s.id)),
      })).filter(g => g.steps.length > 0)
    },
  },
})
</script>

<style lang="scss" scoped>
.step-picker-overlay {
  position: fixed;
  inset: 0;
  background: color-mix(in srgb, black 60%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 1.5rem;
}

.step-picker {
  width: 100%;
  max-width: 720px;
  max-height: 85vh;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: 0 24px 64px color-mix(in srgb, black 50%, transparent);
  display: flex;
  flex-direction: column;

  &__header {
    @include flex-between();
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid var(--color-border);
  }

  &__title {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 600;
  }

  &__close {
    background: transparent;
    border: none;
    color: var(--color-text-muted);
    font-size: 1.2rem;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius);

    &:hover { background: color-mix(in srgb, var(--color-text) 6%, transparent); color: var(--color-text); }
  }

  &__body {
    padding: 1.25rem 1.5rem;
    overflow-y: auto;
    @include flex-col(1.25rem);
  }

  &__group {
    @include flex-col(0.6rem);
  }

  &__group-label {
    @include mono-upper(var(--fs-xxs));
    color: var(--color-primary);
    opacity: var(--op-partial);
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 0.6rem;
  }

  &__card {
    @include flex-row(0.6rem);
    align-items: center;
    text-align: left;
    padding: 0.7rem;
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    cursor: pointer;
    transition: border-color var(--tr-fast), transform var(--tr-fast);

    &:hover { border-color: var(--color-primary); transform: translateY(-1px); }
  }

  &__card-visual {
    width: 32px;
    height: 40px;
    flex-shrink: 0;
  }

  &__card-name {
    font-size: var(--fs-sm);
    font-weight: 600;
    color: var(--color-text);
    flex: 1;
  }

  &__card-yield {
    @include mono-upper(0.55rem);
    opacity: var(--op-muted);
  }
}
</style>
