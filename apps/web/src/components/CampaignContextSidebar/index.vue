<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <aside class="campaign-context">
    <header class="campaign-context__header">
      <span class="campaign-context__eyebrow">{{ $t('cellEng.context.campaignLabel') }}</span>
      <h3 class="campaign-context__name">{{ campaignName || $t('campaign.card.noMoleculeYet') }}</h3>
    </header>

    <dl class="campaign-context__fields">
      <div class="campaign-context__field">
        <dt class="campaign-context__field-label">{{ $t('cellEng.context.moleculeLabel') }}</dt>
        <dd class="campaign-context__field-value">
          <span class="campaign-context__chip" :data-category="moleculeCategory">{{ moleculeShortLabel }}</span>
          <span class="campaign-context__field-detail">{{ moleculeLabel }}</span>
        </dd>
      </div>

      <div class="campaign-context__field">
        <dt class="campaign-context__field-label">{{ $t('cellEng.context.selectedCellLabel') }}</dt>
        <dd class="campaign-context__field-value">
          <template v-if="selectedCellLine">
            <HostCellVisual
              :host-species="selectedCellLine.hostSpecies"
              :active="true"
              :size="56"
              :aria-label="`${selectedCellLine.shortLabel} cell visualization`"
            />
            <span class="campaign-context__field-detail">{{ selectedCellLine.shortLabel }}</span>
          </template>
          <span v-else class="campaign-context__empty-value">{{ $t('cellEng.context.selectedCellEmpty') }}</span>
        </dd>
      </div>

      <div class="campaign-context__field">
        <dt class="campaign-context__field-label">{{ $t('cellEng.context.moduleProgressLabel') }}</dt>
        <dd class="campaign-context__field-value">
          <div class="campaign-context__progress">
            <span
              v-for="step in moduleProgress"
              :key="step.module"
              class="campaign-context__progress-dot"
              :class="{
                'campaign-context__progress-dot--done': step.done,
                'campaign-context__progress-dot--current': step.current,
              }"
            >{{ step.module }}</span>
          </div>
        </dd>
      </div>
    </dl>

    <button
      class="campaign-context__finish-btn"
      :disabled="!canFinish"
      @click="$emit('finish')"
    >
      {{ $t('cellEng.context.finishBtn') }}
    </button>
    <p v-if="!canFinish" class="campaign-context__finish-hint">{{ $t('cellEng.context.finishHint') }}</p>

    <button class="campaign-context__switcher-btn" @click="$emit('openSwitcher')">
      {{ ICON.FOLDER }} {{ $t('cellEng.context.openSwitcher') }}
    </button>
  </aside>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'

import HostCellVisual from '@/components/HostCellVisual/index.vue'

import { ICON } from '@/constants/icons'
import { MOLECULE_TYPE_META, type MoleculeType } from '@/constants/moleculeTypes'
import { getCellLineById, type CellLineEntry } from '@/constants/cellLineCatalog'

import type { CampaignProgressStep } from '@/types/campaign'

export default defineComponent({
  name: 'CampaignContextSidebar',
  components: { HostCellVisual },
  props: {
    campaignName:       { type: String, default: '' },
    moleculeType:       { type: String as PropType<MoleculeType | null>, default: null },
    selectedCellLineId: { type: String as PropType<string | null>, default: null },
    moduleProgress:     { type: Array as PropType<CampaignProgressStep[]>, default: () => [] },
  },
  emits: ['openSwitcher', 'finish'],
  computed: {
    ICON() { return ICON },

    canFinish(): boolean {
      return this.moduleProgress.length > 0 && this.moduleProgress.every(step => step.done)
    },

    moleculeShortLabel(): string {
      return this.moleculeType ? MOLECULE_TYPE_META[this.moleculeType].shortLabel : ''
    },

    moleculeLabel(): string {
      return this.moleculeType ? MOLECULE_TYPE_META[this.moleculeType].label : ''
    },

    moleculeCategory(): string {
      return this.moleculeType ? MOLECULE_TYPE_META[this.moleculeType].category : 'other'
    },

    selectedCellLine(): CellLineEntry | undefined {
      return this.selectedCellLineId ? getCellLineById(this.selectedCellLineId) : undefined
    },
  },
})
</script>

<style lang="scss" scoped>
.campaign-context {
  @include flex-col(1.25rem);
  padding: 1.25rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  position: sticky;
  top: 1rem;

  &__header {
    @include flex-col(0.3rem);
  }

  &__eyebrow {
    @include mono-upper(var(--fs-xxs));
    color: var(--color-primary);
    opacity: var(--op-partial);
  }

  &__name {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 600;
    color: var(--color-text-heading);
    line-height: 1.3;
  }

  &__fields {
    @include flex-col(1rem);
    margin: 0;
  }

  &__field {
    @include flex-col(0.35rem);
  }

  &__field-label {
    @include mono-upper(var(--fs-xxs));
    opacity: var(--op-muted);
    margin: 0;
  }

  &__field-value {
    @include flex-row(0.6rem);
    align-items: center;
    margin: 0;
  }

  &__field-detail {
    font-size: var(--fs-md);
    color: var(--color-text);
    font-weight: 500;
  }

  &__empty-value {
    font-size: var(--fs-md);
    opacity: var(--op-muted);
    font-style: italic;
  }

  &__chip {
    @include mono-upper(var(--fs-xxs));
    padding: 0.18rem 0.5rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-primary) 18%, transparent);
    color: var(--color-primary);

    &[data-category="antibody"]     { background: color-mix(in srgb, var(--color-primary) 18%, transparent); color: var(--color-primary); }
    &[data-category="protein"]      { background: color-mix(in srgb, var(--color-amber) 18%, transparent);   color: var(--color-amber); }
    &[data-category="viral-vector"] { background: color-mix(in srgb, var(--color-danger) 18%, transparent);  color: var(--color-danger); }
    &[data-category="nucleic-acid"] { background: color-mix(in srgb, var(--color-ok) 18%, transparent); color: var(--color-ok); }
    &[data-category="antigen"]      { background: color-mix(in srgb, var(--color-primary) 18%, transparent); color: var(--color-primary); }
  }

  &__progress {
    @include flex-row(0.35rem);
  }

  &__progress-dot {
    width: 1.4rem;
    height: 1.4rem;
    border-radius: 50%;
    @include inline-flex-center;
    font-family: var(--font-mono);
    font-size: 0.65rem;
    font-weight: 600;
    background: color-mix(in srgb, var(--color-text) 8%, transparent);
    color: var(--color-text-muted);

    &--done {
      background: color-mix(in srgb, var(--color-ok) 25%, transparent);
      color: var(--color-ok);
    }

    &--current {
      background: var(--color-primary);
      color: var(--color-bg);
    }
  }

  &__finish-btn {
    @include mono-upper(var(--fs-sm));
    background: var(--color-primary);
    color: var(--color-bg);
    border: 1px solid transparent;
    padding: 0.6rem 0.8rem;
    border-radius: var(--radius);
    cursor: pointer;
    transition: background var(--tr-fast);

    &:hover:not(:disabled) { background: color-mix(in srgb, var(--color-primary) 90%, white); }

    &:disabled {
      background: color-mix(in srgb, var(--color-text) 10%, transparent);
      color: var(--color-text-muted);
      cursor: not-allowed;
    }
  }

  &__finish-hint {
    margin: 0;
    font-size: var(--fs-xxs);
    opacity: var(--op-muted);
    line-height: 1.4;
    text-align: center;
  }

  &__switcher-btn {
    @include mono-upper(var(--fs-xs));
    background: transparent;
    border: 1px solid var(--color-border);
    color: var(--color-text);
    padding: 0.55rem 0.8rem;
    border-radius: var(--radius);
    cursor: pointer;
    transition: border-color var(--tr-fast), color var(--tr-fast);

    &:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }
  }
}
</style>
