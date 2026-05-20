<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <section class="tx-panel">

    <div v-if="!selectedCellLineId" class="tx-panel__empty">
      <p class="tx-panel__empty-text">{{ $t('cellEng.transfection.noCellLineSelected') }}</p>
      <button class="tx-panel__empty-btn" @click="$emit('openSelector')">
        {{ $t('cellEng.transfection.openSelectorBtn') }} {{ ICON.ARROW_SHORT }}
      </button>
    </div>

    <template v-else>

      <header class="tx-panel__header">
        <div>
          <h2 class="tx-panel__title">{{ $t('cellEng.transfection.title') }}</h2>
          <p class="tx-panel__help">{{ $t('cellEng.transfection.helpText') }}</p>
        </div>
        <span class="tx-panel__pred-badge" v-tip="$t('cellEng.transfection.simulatorConstructHelp')">
          {{ ICON.INFO }} {{ $t('cellEng.transfection.simulatorConstructLabel') }}
        </span>
      </header>

      <div class="tx-panel__body">

        <!-- Animation -->
        <div class="tx-panel__animation-card">
          <TransfectionAnimation
            :field-strength="prediction.fieldStrength"
            :efficiency="prediction.transfectionEfficiency"
            :viability="prediction.viability"
          />
        </div>

        <!-- Predictions -->
        <div class="tx-panel__predictions">
          <div class="tx-panel__readout tx-panel__readout--hero" :data-window="prediction.windowState">
            <span class="tx-panel__readout-label">{{ $t('cellEng.transfection.transfectionEfficiencyLabel') }}</span>
            <span class="tx-panel__readout-value">{{ efficiencyPercent }}<span class="tx-panel__readout-unit">%</span></span>
          </div>

          <div class="tx-panel__readout" :data-window="viabilityClass">
            <span class="tx-panel__readout-label">{{ $t('cellEng.transfection.viabilityLabel') }}</span>
            <span class="tx-panel__readout-value">{{ viabilityPercent }}<span class="tx-panel__readout-unit">%</span></span>
          </div>

          <div class="tx-panel__readout">
            <span class="tx-panel__readout-label">{{ $t('cellEng.transfection.vmLabel') }}</span>
            <span class="tx-panel__readout-value">{{ vmDisplay }}<span class="tx-panel__readout-unit">{{ $t('cellEng.transfection.vmUnit') }}</span></span>
          </div>

          <div class="tx-panel__readout">
            <span class="tx-panel__readout-label">{{ $t('cellEng.transfection.disruptionRatioLabel') }}</span>
            <span class="tx-panel__readout-value">{{ drDisplay }}</span>
          </div>

          <div class="tx-panel__window" :data-window="prediction.windowState">
            <span class="tx-panel__window-label">{{ $t('cellEng.transfection.windowStateLabel') }}</span>
            <span class="tx-panel__window-state">{{ windowStateLabel }}</span>
            <p class="tx-panel__window-rec">{{ recommendationText }}</p>
          </div>
        </div>

      </div>

      <!-- Protocol guidance (host-aware, beyond the pulse physics) -->
      <div class="tx-panel__guidance">
        <h3 class="tx-panel__guidance-title">{{ $t('cellEng.transfection.guidanceTitle') }}</h3>
        <p class="tx-panel__guidance-help">{{ $t('cellEng.transfection.guidanceHelp') }}</p>
        <div class="tx-panel__guidance-grid">
          <div class="tx-panel__guidance-item">
            <span class="tx-panel__guidance-label">{{ $t('cellEng.transfection.guidanceDnaPerCell') }}</span>
            <span class="tx-panel__guidance-value">{{ guidance.dnaPerCell }}</span>
          </div>
          <div class="tx-panel__guidance-item">
            <span class="tx-panel__guidance-label">{{ $t('cellEng.transfection.guidanceCultureState') }}</span>
            <span class="tx-panel__guidance-value">{{ guidance.cultureState }}</span>
          </div>
          <div class="tx-panel__guidance-item">
            <span class="tx-panel__guidance-label">{{ $t('cellEng.transfection.guidanceRecoveryMedium') }}</span>
            <span class="tx-panel__guidance-value">{{ guidance.recoveryMedium }}</span>
          </div>
          <div class="tx-panel__guidance-item">
            <span class="tx-panel__guidance-label">{{ $t('cellEng.transfection.guidanceRecoveryWindow') }}</span>
            <span class="tx-panel__guidance-value">{{ guidance.recoveryWindow }}</span>
          </div>
        </div>
      </div>

      <!-- Parameters -->
      <div class="tx-panel__params">
        <h3 class="tx-panel__params-title">{{ $t('cellEng.transfection.parametersLabel') }}</h3>
        <div class="tx-panel__params-grid">

          <label class="tx-panel__param">
            <span class="tx-panel__param-label" v-tip="$t('cellEng.transfection.tipVoltage')">
              {{ $t('cellEng.transfection.voltageLabel') }}
              <span class="tx-panel__param-value">{{ params.voltage }} {{ $t('cellEng.transfection.voltageUnit') }}</span>
            </span>
            <input type="range" min="0" max="3000" step="50" v-model.number="params.voltage" class="tx-panel__slider" />
          </label>

          <label class="tx-panel__param">
            <span class="tx-panel__param-label" v-tip="$t('cellEng.transfection.tipPulseWidth')">
              {{ $t('cellEng.transfection.pulseWidthLabel') }}
              <span class="tx-panel__param-value">{{ params.pulseWidthUs }} {{ $t('cellEng.transfection.pulseWidthUnit') }}</span>
            </span>
            <input type="range" min="1" max="1000" step="10" v-model.number="params.pulseWidthUs" class="tx-panel__slider" />
          </label>

          <label class="tx-panel__param">
            <span class="tx-panel__param-label" v-tip="$t('cellEng.transfection.tipNumPulses')">
              {{ $t('cellEng.transfection.numPulsesLabel') }}
              <span class="tx-panel__param-value">{{ params.numPulses }}</span>
            </span>
            <input type="range" min="1" max="10" step="1" v-model.number="params.numPulses" class="tx-panel__slider" />
          </label>

          <label class="tx-panel__param">
            <span class="tx-panel__param-label" v-tip="$t('cellEng.transfection.tipBuffer')">
              {{ $t('cellEng.transfection.bufferLabel') }}
              <span class="tx-panel__param-value">{{ params.bufferConductivity.toFixed(2) }} {{ $t('cellEng.transfection.bufferUnit') }}</span>
            </span>
            <input type="range" min="0.05" max="1.5" step="0.05" v-model.number="params.bufferConductivity" class="tx-panel__slider" />
          </label>

        </div>
      </div>

    </template>
  </section>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'

import { ICON } from '@/constants/icons'
import { getCellLineById, HOST_SPECIES } from '@/constants/cellLineCatalog'
import type { MoleculeType } from '@/constants/moleculeTypes'

import { predictTransfection, type TransfectionInputs, type TransfectionPrediction } from '@/utils/transfection/predict'
import { transfectionGuidance, type ProtocolGuidance } from '@/utils/transfection/protocolGuidance'

import TransfectionAnimation from '@/components/TransfectionAnimation/index.vue'

interface ParamState {
  voltage:               number
  pulseWidthUs:          number
  numPulses:             number
  bufferConductivity:    number
}

function defaultsForHostSpecies(species: string | undefined): { radius: number; threshold: number } {
  // Threshold is the transfection-window onset, not the bare EP threshold; tuned so realistic
  // field strengths (mammalian ~800 V/cm) land inside the reversible-EP window.
  if (species === HOST_SPECIES.BACTERIAL) return { radius: 1.0, threshold: 1.5 }
  if (species === HOST_SPECIES.YEAST)     return { radius: 4.0, threshold: 1.8 }
  if (species === HOST_SPECIES.INSECT)    return { radius: 9.0, threshold: 1.4 }
  return { radius: 10.0, threshold: 1.5 }   // mammalian default
}

export default defineComponent({
  name: 'TransfectionOptimizerPanel',
  components: { TransfectionAnimation },
  props: {
    selectedCellLineId: { type: String as PropType<string | null>, default: null },
    moleculeType:       { type: String as PropType<MoleculeType>, required: true },
  },
  emits: ['openSelector'],
  data() {
    return {
      params: {
        voltage:            800,
        pulseWidthUs:       100,
        numPulses:          1,
        bufferConductivity: 0.14,
      } as ParamState,
    }
  },
  computed: {
    ICON() { return ICON },

    cellLine() {
      return this.selectedCellLineId ? getCellLineById(this.selectedCellLineId) : undefined
    },

    cellDefaults() {
      return defaultsForHostSpecies(this.cellLine?.hostSpecies)
    },

    inputs(): TransfectionInputs {
      return {
        cellRadiusUm:          this.cellDefaults.radius,
        membraneThicknessNm:   7,
        dielectricConstant:    5,
        cytoplasmConductivity: 0.5,
        bufferConductivity:    this.params.bufferConductivity,
        thresholdVoltage:      this.cellDefaults.threshold,
        voltage:               this.params.voltage,
        pulseWidthUs:          this.params.pulseWidthUs,
        numPulses:             this.params.numPulses,
      }
    },

    prediction(): TransfectionPrediction {
      return predictTransfection(this.inputs)
    },

    guidance(): ProtocolGuidance {
      const host = this.cellLine?.hostSpecies ?? 'mammalian'
      return transfectionGuidance(host, this.prediction.viability)
    },

    efficiencyPercent(): number {
      return Math.round(this.prediction.transfectionEfficiency * 100)
    },

    viabilityPercent(): number {
      return Math.round(this.prediction.viability * 100)
    },

    viabilityClass(): string {
      if (this.prediction.viability >= 0.85) return 'optimal'
      if (this.prediction.viability >= 0.50) return 'below'
      return 'above'
    },

    vmDisplay(): string {
      return this.prediction.vm.toFixed(2)
    },

    drDisplay(): string {
      return this.prediction.disruptionRatio.toFixed(2)
    },

    windowStateLabel(): string {
      const map = {
        optimal: this.$t('cellEng.transfection.windowOptimal'),
        below:   this.$t('cellEng.transfection.windowBelow'),
        above:   this.$t('cellEng.transfection.windowAbove'),
      }
      return map[this.prediction.windowState]
    },

    recommendationText(): string {
      const map = {
        optimal: this.$t('cellEng.transfection.recommendationOptimal'),
        below:   this.$t('cellEng.transfection.recommendationBelow'),
        above:   this.$t('cellEng.transfection.recommendationAbove'),
      }
      return map[this.prediction.windowState]
    },
  },
})
</script>

<style lang="scss" scoped>
.tx-panel {
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

  &__pred-badge {
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
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
    gap: 1.25rem;

    @media (max-width: 900px) {
      grid-template-columns: 1fr;
    }
  }

  &__animation-card {
    @include inline-flex-center;
    padding: 1.5rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
  }

  &__predictions {
    @include flex-col(0.75rem);
  }

  &__readout {
    @include flex-between(0.5rem);
    align-items: baseline;
    padding: 0.9rem 1.1rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);

    &--hero {
      padding: 1.2rem 1.4rem;

      .tx-panel__readout-value {
        font-size: 2rem;
      }
    }

    &[data-window="optimal"] {
      border-color: color-mix(in srgb, var(--color-ok) 50%, transparent);
      background: color-mix(in srgb, var(--color-ok) 6%, var(--color-surface));

      .tx-panel__readout-value { color: var(--color-ok); }
    }

    &[data-window="below"]   { .tx-panel__readout-value { color: var(--color-amber); } }
    &[data-window="above"]   {
      border-color: color-mix(in srgb, var(--color-danger) 35%, transparent);
      .tx-panel__readout-value { color: var(--color-danger); }
    }
  }

  &__readout-label {
    @include mono-upper(var(--fs-xxs));
    opacity: var(--op-muted);
  }

  &__readout-value {
    font-family: var(--font-mono);
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--color-text);
  }

  &__readout-unit {
    font-size: 0.7em;
    opacity: var(--op-muted);
    margin-left: 0.15rem;
  }

  &__window {
    @include flex-col(0.4rem);
    padding: 1rem 1.1rem;
    border-radius: var(--radius);
    border: 1px solid var(--color-border);

    &[data-window="optimal"] {
      background: color-mix(in srgb, var(--color-ok) 8%, transparent);
      border-color: color-mix(in srgb, var(--color-ok) 40%, transparent);
    }
    &[data-window="below"] {
      background: color-mix(in srgb, var(--color-amber) 8%, transparent);
      border-color: color-mix(in srgb, var(--color-amber) 35%, transparent);
    }
    &[data-window="above"] {
      background: color-mix(in srgb, var(--color-danger) 8%, transparent);
      border-color: color-mix(in srgb, var(--color-danger) 40%, transparent);
    }
  }

  &__window-label {
    @include mono-upper(var(--fs-xxs));
    opacity: var(--op-muted);
  }

  &__window-state {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text-heading);
  }

  &__window-rec {
    margin: 0;
    font-size: var(--fs-sm);
    opacity: var(--op-partial);
    line-height: 1.5;
  }

  &__guidance {
    @include flex-col(0.75rem);
    padding: 1.25rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
  }

  &__guidance-title { margin: 0; font-size: 1.05rem; font-weight: 600; color: var(--color-text-heading); }
  &__guidance-help { margin: 0; font-size: var(--fs-sm); opacity: var(--op-partial); line-height: 1.5; }
  &__guidance-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 0.75rem; }
  &__guidance-item {
    @include flex-col(0.2rem);
    padding: 0.7rem 0.85rem;
    background: var(--color-surface-2);
    border-radius: var(--radius);
  }
  &__guidance-label { @include mono-upper(var(--fs-xxs)); opacity: var(--op-muted); }
  &__guidance-value { font-size: var(--fs-sm); color: var(--color-text); line-height: 1.4; }

  &__params {
    @include flex-col(1rem);
    padding: 1.25rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
  }

  &__params-title {
    margin: 0;
    font-size: 1.05rem;
    font-weight: 600;
    color: var(--color-text-heading);
  }

  &__params-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 1.25rem;
  }

  &__param {
    @include flex-col(0.5rem);
  }

  &__param-label {
    @include flex-between(0.5rem);
    align-items: baseline;
    font-size: var(--fs-sm);
    color: var(--color-text);
    cursor: help;
  }

  &__param-value {
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
    font-weight: 600;
    color: var(--color-primary);
  }

  &__slider {
    width: 100%;
    @include slider-track;
    accent-color: var(--color-primary);
  }
}
</style>
