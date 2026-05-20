<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <section class="strategy-panel">

    <!-- No cell line selected state -->
    <div v-if="!selectedCellLineId" class="strategy-panel__empty">
      <p class="strategy-panel__empty-text">{{ $t('cellEng.strategy.noCellLineSelected') }}</p>
      <button class="strategy-panel__empty-btn" @click="$emit('openSelector')">
        {{ $t('cellEng.strategy.openSelectorBtn') }} {{ ICON.ARROW_SHORT }}
      </button>
    </div>

    <template v-else>

      <header class="strategy-panel__header">
        <h2 class="strategy-panel__title">{{ $t('cellEng.strategy.title') }}</h2>
        <p class="strategy-panel__help">{{ $t('cellEng.strategy.helpText') }}</p>
      </header>

      <div class="strategy-panel__visual-row">
        <div class="strategy-panel__visual-card">
          <span class="strategy-panel__visual-label">{{ $t('cellEng.strategy.targetProteinLabel') }}</span>
          <TargetProteinVisual :molecule-type="moleculeType" :size="200" />
          <span class="strategy-panel__visual-value">{{ moleculeLabel }}</span>
        </div>

        <div class="strategy-panel__visual-card">
          <div class="strategy-panel__visual-header">
            <span class="strategy-panel__visual-label">{{ $t('cellEng.strategy.primaryVectorLabel') }}</span>
            <div class="strategy-panel__view-toggle" v-if="recommendation.primaryVector">
              <button
                class="strategy-panel__toggle-btn"
                :class="{ 'strategy-panel__toggle-btn--active': viewMode === 'circular' }"
                @click="viewMode = 'circular'"
              >{{ $t('cellEng.strategy.viewToggleCircular') }}</button>
              <button
                class="strategy-panel__toggle-btn"
                :class="{ 'strategy-panel__toggle-btn--active': viewMode === 'linear' }"
                @click="viewMode = 'linear'"
              >{{ $t('cellEng.strategy.viewToggleLinear') }}</button>
            </div>
          </div>

          <template v-if="recommendation.primaryVector">
            <PlasmidMap v-if="viewMode === 'circular'" :vector="recommendation.primaryVector" :size="220" />
            <LinearConstructMap v-else :vector="recommendation.primaryVector" />
            <span class="strategy-panel__visual-value">{{ recommendation.primaryVector.name }}</span>
            <p class="strategy-panel__rationale">{{ recommendation.primaryVectorRationale }}</p>
          </template>
          <p v-else class="strategy-panel__rationale">{{ recommendation.primaryVectorRationale }}</p>
        </div>
      </div>

      <div class="strategy-panel__rec-grid">
        <div class="strategy-panel__rec-card">
          <span class="strategy-panel__rec-label" v-tip="$t('cellEng.strategy.tipExpressionMode')">{{ $t('cellEng.strategy.expressionModeLabel') }}</span>
          <span class="strategy-panel__rec-value strategy-panel__rec-value--accent">{{ expressionModeLabel }}</span>
          <p class="strategy-panel__rec-rationale">{{ recommendation.expressionRationale }}</p>
        </div>

        <div class="strategy-panel__rec-card">
          <span class="strategy-panel__rec-label" v-tip="$t('cellEng.strategy.tipCodonOptimization')">{{ $t('cellEng.strategy.codonOptimizationLabel') }}</span>
          <span class="strategy-panel__rec-value" :class="codonValueClass">
            {{ recommendation.codonOptimization.recommended ? $t('cellEng.strategy.codonRecommended') : $t('cellEng.strategy.codonOptional') }}
          </span>
          <p class="strategy-panel__rec-rationale">{{ recommendation.codonOptimization.rationale }}</p>
        </div>

        <div class="strategy-panel__rec-card">
          <span class="strategy-panel__rec-label">{{ $t('cellEng.strategy.secretionSignalLabel') }}</span>
          <span class="strategy-panel__rec-value">{{ recommendation.secretionSignal.value }}</span>
          <p class="strategy-panel__rec-rationale">{{ recommendation.secretionSignal.rationale }}</p>
        </div>
      </div>

      <div v-if="recommendation.warnings.length > 0" class="strategy-panel__warnings">
        <h4 class="strategy-panel__warnings-title">
          <span aria-hidden="true">{{ ICON.WARNING }}</span> {{ $t('cellEng.strategy.warningsLabel') }}
        </h4>
        <ul class="strategy-panel__warnings-list">
          <li v-for="(w, i) in recommendation.warnings" :key="i" class="strategy-panel__warning">{{ w }}</li>
        </ul>
      </div>

      <section class="strategy-panel__alternatives">
        <h4 class="strategy-panel__alternatives-title">{{ $t('cellEng.strategy.alternativeVectorsLabel') }}</h4>
        <div v-if="alternativeVectors.length > 0" class="strategy-panel__vector-list">
          <article
            v-for="v in alternativeVectors"
            :key="v.id"
            class="strategy-panel__vector-card"
          >
            <header class="strategy-panel__vector-header">
              <span class="strategy-panel__vector-name">{{ v.name }}</span>
              <span class="strategy-panel__vector-vendor">{{ v.vendor }}</span>
            </header>
            <dl class="strategy-panel__vector-fields">
              <div><dt>{{ $t('cellEng.strategy.vectorPromoterShort') }}</dt><dd>{{ v.promoter }}</dd></div>
              <div><dt>{{ $t('cellEng.strategy.vectorMarkerShort') }}</dt><dd>{{ v.selectionMarker }}</dd></div>
              <div><dt>{{ $t('cellEng.strategy.vectorSizeShort') }}</dt><dd>{{ v.sizeKb }} kb</dd></div>
            </dl>
            <p class="strategy-panel__vector-desc">{{ v.description }}</p>
          </article>
        </div>
        <p v-else class="strategy-panel__no-alternatives">{{ $t('cellEng.strategy.noAlternativesText') }}</p>
      </section>

    </template>
  </section>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'

import { ICON } from '@/constants/icons'
import { MOLECULE_TYPE_META, type MoleculeType } from '@/constants/moleculeTypes'
import { EXPRESSION_MODE, type ExpressionMode } from '@/constants/cellLineCatalog'

import { recommendStrategy } from '@/utils/geneticStrategy/rules'

import PlasmidMap          from '@/components/PlasmidMap/index.vue'
import LinearConstructMap  from '@/components/LinearConstructMap/index.vue'
import TargetProteinVisual from '@/components/TargetProteinVisual/index.vue'

export default defineComponent({
  name: 'GeneticStrategyPanel',
  components: { PlasmidMap, LinearConstructMap, TargetProteinVisual },
  props: {
    selectedCellLineId: { type: String as PropType<string | null>, default: null },
    moleculeType:       { type: String as PropType<MoleculeType>, required: true },
  },
  emits: ['openSelector'],
  data() {
    return {
      viewMode: 'circular' as 'circular' | 'linear',
    }
  },
  computed: {
    ICON() { return ICON },

    moleculeLabel(): string {
      return MOLECULE_TYPE_META[this.moleculeType].label
    },

    recommendation() {
      return recommendStrategy(this.selectedCellLineId, this.moleculeType)
    },

    expressionModeLabel(): string {
      const map: Record<ExpressionMode, string> = {
        [EXPRESSION_MODE.TRANSIENT]: this.$t('cellEng.strategy.transientLabel'),
        [EXPRESSION_MODE.STABLE]:    this.$t('cellEng.strategy.stableLabel'),
        [EXPRESSION_MODE.BOTH]:      this.$t('cellEng.strategy.bothLabel'),
      }
      return map[this.recommendation.expressionMode]
    },

    codonValueClass(): string {
      return this.recommendation.codonOptimization.recommended
        ? 'strategy-panel__rec-value--success'
        : 'strategy-panel__rec-value--neutral'
    },

    alternativeVectors() {
      return this.recommendation.recommendedVectors.filter(v => v.id !== this.recommendation.primaryVector?.id)
    },
  },
})
</script>

<style lang="scss" scoped>
.strategy-panel {
  @include flex-col(1.5rem);
  width: 100%;

  &__empty {
    @include flex-col(1rem);
    align-items: center;
    text-align: center;
    padding: 4rem 1.5rem;
    background: var(--color-surface);
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-lg);
  }

  &__empty-text {
    margin: 0;
    opacity: var(--op-partial);
    font-size: var(--fs-lg);
  }

  &__empty-btn {
    @include mono-upper(var(--fs-sm));
    background: var(--color-primary);
    color: var(--color-bg);
    border: none;
    padding: 0.7rem 1.2rem;
    border-radius: var(--radius);
    cursor: pointer;
    transition: background var(--tr-fast);

    &:hover { background: color-mix(in srgb, var(--color-primary) 90%, white); }
  }

  &__header {
    @include flex-col(0.3rem);
  }

  &__title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-text-heading);
  }

  &__help {
    margin: 0;
    opacity: var(--op-partial);
    font-size: var(--fs-md);
    line-height: 1.5;
  }

  &__visual-row {
    display: grid;
    grid-template-columns: 1fr 1.4fr;
    gap: 1.25rem;

    @media (max-width: 900px) {
      grid-template-columns: 1fr;
    }
  }

  &__visual-card {
    @include flex-col(0.75rem);
    align-items: center;
    padding: 1.25rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
  }

  &__visual-header {
    @include flex-between(0.5rem);
    align-items: center;
    width: 100%;
  }

  &__visual-label {
    @include mono-upper(var(--fs-xxs));
    opacity: var(--op-muted);
  }

  &__visual-value {
    font-size: var(--fs-md);
    font-weight: 600;
    color: var(--color-text);
    text-align: center;
  }

  &__rationale {
    margin: 0;
    font-size: var(--fs-sm);
    opacity: var(--op-partial);
    line-height: 1.5;
    text-align: center;
  }

  &__view-toggle {
    @include flex-row(0);
    background: var(--color-surface-2);
    border-radius: var(--radius);
    overflow: hidden;
  }

  &__toggle-btn {
    @include mono-upper(0.6rem);
    background: transparent;
    border: none;
    color: var(--color-text);
    opacity: var(--op-muted);
    padding: 0.3rem 0.6rem;
    cursor: pointer;
    transition: background var(--tr-fast), color var(--tr-fast), opacity var(--tr-fast);

    &--active {
      background: var(--color-primary);
      color: var(--color-bg);
      opacity: 1;
    }
  }

  &__rec-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
  }

  &__rec-card {
    @include flex-col(0.5rem);
    padding: 1.1rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    transition: border-color var(--tr-fast);

    &:hover { border-color: color-mix(in srgb, var(--color-primary) 30%, var(--color-border)); }
  }

  &__rec-label {
    @include mono-upper(var(--fs-xxs));
    opacity: var(--op-muted);
  }

  &__rec-value {
    font-size: 1.05rem;
    font-weight: 600;
    color: var(--color-text-heading);

    &--accent  { color: var(--color-primary); }
    &--success { color: var(--color-ok); }
    &--neutral { color: var(--color-text-muted); }
  }

  &__rec-rationale {
    margin: 0;
    font-size: var(--fs-sm);
    opacity: var(--op-partial);
    line-height: 1.5;
  }

  &__warnings {
    @include flex-col(0.6rem);
    padding: 1rem 1.25rem;
    background: color-mix(in srgb, var(--color-amber) 10%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-amber) 30%, transparent);
    border-radius: var(--radius);
  }

  &__warnings-title {
    margin: 0;
    @include mono-upper(var(--fs-xs));
    color: var(--color-amber);
  }

  &__warnings-list {
    list-style: none;
    margin: 0;
    padding: 0;
    @include flex-col(0.35rem);
  }

  &__warning {
    font-size: var(--fs-md);
    color: var(--color-text);
    line-height: 1.5;
  }

  &__alternatives-title {
    margin: 0 0 0.75rem;
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text-heading);
  }

  &__vector-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 0.85rem;
  }

  &__vector-card {
    @include flex-col(0.5rem);
    padding: 0.9rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    transition: border-color var(--tr-fast);

    &:hover { border-color: color-mix(in srgb, var(--color-primary) 35%, var(--color-border)); }
  }

  &__vector-header {
    @include flex-between(0.5rem);
    align-items: baseline;
  }

  &__vector-name {
    font-size: var(--fs-md);
    font-weight: 600;
    color: var(--color-text);
  }

  &__vector-vendor {
    @include mono-upper(var(--fs-xxs));
    opacity: var(--op-muted);
  }

  &__vector-fields {
    @include flex-row(0.6rem);
    margin: 0;
    flex-wrap: wrap;

    div {
      @include flex-col(0.1rem);
    }

    dt {
      @include mono-upper(0.55rem);
      opacity: var(--op-muted);
      margin: 0;
    }

    dd {
      font-family: var(--font-mono);
      font-size: var(--fs-xs);
      color: var(--color-text);
      margin: 0;
    }
  }

  &__vector-desc {
    margin: 0;
    font-size: var(--fs-sm);
    opacity: var(--op-partial);
    line-height: 1.5;
  }

  &__no-alternatives {
    margin: 0;
    opacity: var(--op-muted);
    font-size: var(--fs-md);
  }
}
</style>
