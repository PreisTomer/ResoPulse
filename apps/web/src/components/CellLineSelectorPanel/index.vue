<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <section class="selector-panel">

    <!-- ── Top: molecule prompt ─────────────────────────────────────── -->
    <header class="selector-panel__prompt">
      <div class="selector-panel__prompt-text">
        <h2 class="selector-panel__title">{{ $t('cellEng.selector.promptTitle') }}</h2>
        <p class="selector-panel__help">{{ $t('cellEng.selector.promptHelp') }}</p>
      </div>

      <div class="selector-panel__molecule-pills" v-tip="$t('cellEng.selector.tipChangeMolecule')">
        <button
          v-for="meta in molecules"
          :key="meta.id"
          class="selector-panel__molecule-pill"
          :class="{ 'selector-panel__molecule-pill--active': activeMolecule === meta.id }"
          :data-category="meta.category"
          @click="$emit('changeMolecule', meta.id)"
        >
          {{ meta.shortLabel }}
        </button>
      </div>
    </header>

    <!-- ── Ranking summary ─────────────────────────────────────────── -->
    <div class="selector-panel__summary">
      <span class="selector-panel__summary-text">
        {{ $t('cellEng.selector.rankedFor') }} <strong>{{ activeMoleculeLabel }}</strong>
      </span>
      <span class="selector-panel__count">{{ $t('cellEng.selector.candidateCount', { count: ranked.length }) }}</span>
    </div>

    <!-- ── Ranked cards ────────────────────────────────────────────── -->
    <div v-if="ranked.length > 0" class="selector-panel__grid">
      <CellLineCard
        v-for="(result, i) in ranked"
        :key="result.cellLine.id"
        :result="result"
        :rank-index="i"
        :selected="selectedCellLineId === result.cellLine.id"
        :top-match="i === 0"
        @select="$emit('select', result.cellLine.id)"
        @view-detail="$emit('viewDetail', result.cellLine.id)"
      />
    </div>

    <div v-else class="selector-panel__empty">
      <p class="selector-panel__empty-text">{{ $t('cellEng.selector.noCandidates') }}</p>
    </div>

  </section>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'

import { ALL_MOLECULE_TYPES, MOLECULE_TYPE, MOLECULE_TYPE_META, type MoleculeType } from '@/constants/moleculeTypes'

import { rankCellLines, type CellLineRankResult } from '@/utils/cellLine/ranking'

import CellLineCard from '@/components/CellLineCard/index.vue'

export default defineComponent({
  name: 'CellLineSelectorPanel',
  components: { CellLineCard },
  props: {
    activeMolecule:     { type: String as PropType<MoleculeType>, required: true },
    selectedCellLineId: { type: String as PropType<string | null>, default: null },
  },
  emits: ['changeMolecule', 'select', 'viewDetail'],
  computed: {
    molecules() {
      return ALL_MOLECULE_TYPES.filter(m => m.id !== MOLECULE_TYPE.OTHER)
    },
    activeMoleculeLabel(): string {
      return MOLECULE_TYPE_META[this.activeMolecule].label
    },
    ranked(): CellLineRankResult[] {
      return rankCellLines(this.activeMolecule)
    },
  },
})
</script>

<style lang="scss" scoped>
.selector-panel {
  @include flex-col(1.5rem);
  width: 100%;

  &__prompt {
    @include flex-col(1rem);
    padding: 1.5rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);

    @media (min-width: 900px) {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      gap: 2rem;
    }
  }

  &__prompt-text {
    @include flex-col(0.3rem);
    flex: 1;
  }

  &__title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-text-heading);
  }

  &__help {
    margin: 0;
    font-size: var(--fs-md);
    opacity: var(--op-partial);
    line-height: 1.5;
  }

  &__molecule-pills {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
    max-width: 26rem;
  }

  &__molecule-pill {
    @include mono-upper(var(--fs-xs));
    padding: 0.45rem 0.85rem;
    border-radius: 999px;
    border: 1px solid var(--color-border);
    background: var(--color-surface-2);
    color: var(--color-text);
    cursor: pointer;
    transition: border-color var(--tr-fast), background var(--tr-fast), color var(--tr-fast), transform var(--tr-fast);

    &:hover {
      border-color: color-mix(in srgb, var(--color-primary) 40%, var(--color-border));
      transform: translateY(-1px);
    }

    &--active {
      background: var(--color-primary);
      color: var(--color-bg);
      border-color: var(--color-primary);
    }

    &[data-category="viral-vector"]:not(.selector-panel__molecule-pill--active) { border-color: color-mix(in srgb, var(--color-danger) 30%, var(--color-border)); }
    &[data-category="nucleic-acid"]:not(.selector-panel__molecule-pill--active) { border-color: color-mix(in srgb, var(--color-ok) 30%, var(--color-border)); }
    &[data-category="protein"]:not(.selector-panel__molecule-pill--active)      { border-color: color-mix(in srgb, var(--color-amber) 30%, var(--color-border)); }
  }

  &__summary {
    @include flex-between(0.5rem);
    padding: 0 0.25rem;
  }

  &__summary-text {
    font-size: var(--fs-md);
    color: var(--color-text);

    strong {
      color: var(--color-primary);
      font-weight: 600;
    }
  }

  &__count {
    @include mono-upper(var(--fs-xs));
    opacity: var(--op-muted);
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.25rem;
  }

  &__empty {
    padding: 2rem;
    background: var(--color-surface);
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-lg);
    text-align: center;
  }

  &__empty-text {
    margin: 0;
    opacity: var(--op-partial);
    font-size: var(--fs-md);
  }
}
</style>
