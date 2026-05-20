<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <section class="dev-panel">

    <div v-if="!selectedCellLineId" class="dev-panel__empty">
      <p class="dev-panel__empty-text">{{ $t('cellEng.developability.noCellLineSelected') }}</p>
      <button class="dev-panel__empty-btn" @click="$emit('openSelector')">
        {{ $t('cellEng.developability.openSelectorBtn') }} {{ ICON.ARROW_SHORT }}
      </button>
    </div>

    <template v-else>
      <header class="dev-panel__header">
        <div>
          <h2 class="dev-panel__title">{{ $t('cellEng.developability.title') }}</h2>
          <p class="dev-panel__help">{{ $t('cellEng.developability.helpText') }}</p>
        </div>
        <span class="dev-panel__construct-badge" v-tip="$t('cellEng.developability.simulatorConstructHelp')">
          {{ ICON.INFO }} {{ $t('cellEng.developability.simulatorConstructLabel') }}
        </span>
      </header>

      <div class="dev-panel__body">

        <!-- Left: composite score + radar -->
        <div class="dev-panel__radar-section">
          <div class="dev-panel__composite" v-tip="$t('cellEng.developability.tipComposite')">
            <span class="dev-panel__composite-value" :data-tier="compositeTier">{{ compositePercent }}<span class="dev-panel__composite-unit">%</span></span>
            <span class="dev-panel__composite-label">{{ $t('cellEng.developability.compositeLabel') }}</span>
          </div>

          <DevelopabilityRadarChart :axes="radarAxes" />
        </div>

        <!-- Right: per-axis breakdown -->
        <div class="dev-panel__axes-list">
          <div v-for="axis in axisDetails" :key="axis.key" class="dev-panel__axis">
            <header class="dev-panel__axis-header">
              <span class="dev-panel__axis-label">{{ axis.label }}</span>
              <span class="dev-panel__axis-value">{{ axis.percent }}%</span>
            </header>
            <div class="dev-panel__axis-bar">
              <div class="dev-panel__axis-bar-fill" :style="{ width: `${axis.percent}%` }" :data-tier="axis.tier"></div>
            </div>
            <p class="dev-panel__axis-rationale">{{ axis.rationale }}</p>
          </div>
        </div>

      </div>
    </template>
  </section>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'

import { ICON } from '@/constants/icons'
import type { MoleculeType } from '@/constants/moleculeTypes'

import { computeDevelopabilityScore, DEVELOPABILITY_AXES, type DevelopabilityAxis } from '@/utils/developability/score'

import DevelopabilityRadarChart from '@/components/DevelopabilityRadarChart/index.vue'

interface AxisDetail {
  key:       DevelopabilityAxis
  label:     string
  percent:   number
  tier:      'low' | 'mid' | 'high'
  rationale: string
}

function tierFor(value: number): 'low' | 'mid' | 'high' {
  if (value >= 0.80) return 'high'
  if (value >= 0.55) return 'mid'
  return 'low'
}

export default defineComponent({
  name: 'DevelopabilityScorePanel',
  components: { DevelopabilityRadarChart },
  props: {
    selectedCellLineId: { type: String as PropType<string | null>, default: null },
    moleculeType:       { type: String as PropType<MoleculeType>, required: true },
  },
  emits: ['openSelector'],
  computed: {
    ICON() { return ICON },

    scoreResult() {
      return computeDevelopabilityScore(this.selectedCellLineId, this.moleculeType)
    },

    compositePercent(): number {
      return Math.round(this.scoreResult.composite * 100)
    },

    compositeTier(): 'low' | 'mid' | 'high' {
      return tierFor(this.scoreResult.composite)
    },

    axisLabelMap(): Record<DevelopabilityAxis, string> {
      return {
        productivity: this.$t('cellEng.developability.axisProductivity'),
        stability:    this.$t('cellEng.developability.axisStability'),
        scalability:  this.$t('cellEng.developability.axisScalability'),
        regulatory:   this.$t('cellEng.developability.axisRegulatory'),
      }
    },

    radarAxes() {
      return DEVELOPABILITY_AXES.map(key => ({
        label: this.axisLabelMap[key],
        value: this.scoreResult.axes[key],
      }))
    },

    axisDetails(): AxisDetail[] {
      return DEVELOPABILITY_AXES.map(key => {
        const value = this.scoreResult.axes[key]
        return {
          key,
          label:     this.axisLabelMap[key],
          percent:   Math.round(value * 100),
          tier:      tierFor(value),
          rationale: this.scoreResult.rationale[key],
        }
      })
    },
  },
})
</script>

<style lang="scss" scoped>
.dev-panel {
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
    @include flex-between(1rem);
    align-items: flex-start;
  }

  &__title {
    margin: 0 0 0.3rem;
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--color-text-heading);
  }

  &__help {
    margin: 0;
    opacity: var(--op-partial);
    font-size: var(--fs-md);
    line-height: 1.5;
    max-width: 36rem;
  }

  &__construct-badge {
    @include mono-upper(var(--fs-xxs));
    padding: 0.3rem 0.6rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-amber) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-amber) 35%, transparent);
    color: var(--color-amber);
    cursor: help;
    flex-shrink: 0;
  }

  &__body {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    padding: 1.5rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);

    @media (max-width: 900px) {
      grid-template-columns: 1fr;
    }
  }

  &__radar-section {
    @include flex-col(1rem);
    align-items: center;
  }

  &__composite {
    @include flex-col(0.1rem);
    align-items: center;
    cursor: help;
  }

  &__composite-value {
    font-family: var(--font-mono);
    font-size: 3rem;
    font-weight: 700;
    line-height: 1;

    &[data-tier="high"] { color: var(--color-ok); }
    &[data-tier="mid"]  { color: var(--color-primary); }
    &[data-tier="low"]  { color: var(--color-amber); }
  }

  &__composite-unit {
    font-size: 1.4rem;
    opacity: var(--op-muted);
  }

  &__composite-label {
    @include mono-upper(var(--fs-xxs));
    opacity: var(--op-muted);
    margin-top: 0.2rem;
  }

  &__axes-list {
    @include flex-col(1rem);
  }

  &__axis {
    @include flex-col(0.4rem);
  }

  &__axis-header {
    @include flex-between(0.5rem);
  }

  &__axis-label {
    font-size: var(--fs-md);
    font-weight: 600;
    color: var(--color-text);
  }

  &__axis-value {
    font-family: var(--font-mono);
    font-weight: 700;
    font-size: var(--fs-md);
    color: var(--color-primary);
  }

  &__axis-bar {
    width: 100%;
    height: 6px;
    background: color-mix(in srgb, var(--color-text) 10%, transparent);
    border-radius: 999px;
    overflow: hidden;
  }

  &__axis-bar-fill {
    height: 100%;
    border-radius: 999px;
    transition: width 500ms ease-out, background 200ms ease;

    &[data-tier="high"] { background: var(--color-ok); }
    &[data-tier="mid"]  { background: var(--color-primary); }
    &[data-tier="low"]  { background: var(--color-amber); }
  }

  &__axis-rationale {
    margin: 0;
    font-size: var(--fs-sm);
    opacity: var(--op-partial);
    line-height: 1.5;
  }
}
</style>
