<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <Transition name="acm">
    <div v-if="isOpen" class="acm" role="dialog" aria-modal="true" @click.self="onClose">
      <div class="acm__panel">

        <div class="acm__header">
          <span class="acm__eyebrow">{{ ICON.FLASK }} {{ $t('ai.applyCalibTitle') }}</span>
          <h2 class="acm__subtitle">{{ $t('ai.applyCalibSubtitle') }}</h2>
          <p class="acm__hint">{{ $t('ai.applyCalibHint') }}</p>
        </div>

        <div class="acm__body">

          <!-- Protocol summary -->
          <section class="acm__section">
            <h3 class="acm__section-title">{{ $t('ai.applyCalibProtocolTitle') }}</h3>
            <div class="acm__protocol">
              <span class="acm__protocol-item">{{ formatFreqKHz(cellStore.currentBroadcastFrequency) }}</span>
              <span class="acm__protocol-item">{{ cellStore.fieldIntensity.toFixed(0) }} {{ UNIT.V_PER_CM }}</span>
              <span class="acm__protocol-item">{{ cellStore.waveform.toUpperCase() }}</span>
              <span v-if="isPulsed" class="acm__protocol-item">{{ (cellStore.dutyCycle * 100).toFixed(0) }}% DC</span>
            </div>
          </section>

          <!-- Applied multipliers — σ_i and V_th from the two-parameter physics-inversion fit -->
          <section class="acm__section">
            <h3 class="acm__section-title">{{ $t('ai.applyCalibMultipliersTitle') }}</h3>
            <div class="acm__mults">
              <div class="acm__mult">
                <span class="acm__mult-label">{{ cellStore.healthy.label }}</span>
                <span class="acm__mult-value">σᵢ ×{{ healthyMultiplier.toFixed(2) }} · Vₜₕ ×{{ healthyVthMultiplier.toFixed(2) }}</span>
              </div>
              <div class="acm__mult">
                <span class="acm__mult-label">{{ cellStore.target.label }}</span>
                <span class="acm__mult-value">σᵢ ×{{ targetMultiplier.toFixed(2) }} · Vₜₕ ×{{ targetVthMultiplier.toFixed(2) }}</span>
              </div>
            </div>
          </section>

          <!-- Diff table -->
          <section class="acm__section">
            <h3 class="acm__section-title">{{ $t('ai.applyCalibDiffTitle') }}</h3>
            <table class="acm__diff">
              <thead>
                <tr>
                  <th>{{ $t('ai.applyCalibColMetric') }}</th>
                  <th>{{ $t('ai.applyCalibColBase') }}</th>
                  <th>{{ $t('ai.applyCalibColCorrected') }}</th>
                  <th>{{ $t('ai.applyCalibColDelta') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in diffRows" :key="row.key">
                  <td class="acm__diff-metric">{{ row.label }}</td>
                  <td>{{ row.baseText }}</td>
                  <td>{{ row.correctedText }}</td>
                  <td :class="row.deltaClass">{{ row.deltaText }}</td>
                </tr>
              </tbody>
            </table>
            <p class="acm__note">{{ $t('ai.applyCalibNote') }}</p>
          </section>

        </div>

        <div class="acm__footer">
          <button class="acm__btn acm__btn--primary" @click="onClose">
            {{ $t('ai.applyCalibClose') }}
          </button>
        </div>

      </div>
    </div>
  </Transition>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'

import { useCellStore } from '@/stores/cellStore'

import { computeCalibrationPreview } from '@/utils/calibrationPreview'
import { formatFreqKHz } from '@/utils/format'

import { ICON } from '@/constants/icons'
import { UNIT } from '@/constants/units'
import { WAVEFORM } from '@/constants/strings'

import type { CalibrationPreviewOutput } from '@/utils/calibrationPreview'

interface DiffRow {
  key:           string
  label:         string
  baseText:      string
  correctedText: string
  deltaText:     string
  deltaClass:    string
}

export default defineComponent({
  name: 'ApplyCalibrationModal',

  props: {
    isOpen:               { type: Boolean, required: true },
    healthyMultiplier:    { type: Number,  required: true },
    targetMultiplier:     { type: Number,  required: true },
    healthyVthMultiplier: { type: Number,  default:  1.0  },
    targetVthMultiplier:  { type: Number,  default:  1.0  },
  },

  emits: ['close'],

  computed: {
    ICON() { return ICON },
    UNIT() { return UNIT },
    ...mapStores(useCellStore),

    isPulsed(): boolean {
      return this.cellStore.waveform === WAVEFORM.PULSED || this.cellStore.waveform === WAVEFORM.H_FIRE
    },

    baseResult(): CalibrationPreviewOutput {
      return computeCalibrationPreview({ ...this.previewBase, healthyMultiplier: 1.0, targetMultiplier: 1.0 })
    },

    correctedResult(): CalibrationPreviewOutput {
      return computeCalibrationPreview({
        ...this.previewBase,
        healthyMultiplier:    this.healthyMultiplier,
        targetMultiplier:     this.targetMultiplier,
        healthyVthMultiplier: this.healthyVthMultiplier,
        targetVthMultiplier:  this.targetVthMultiplier,
      })
    },

    previewBase() {
      return {
        healthy:             this.cellStore.healthy,
        target:              this.cellStore.target,
        sigmaE:              this.cellStore.effectiveSigmaE,
        cosThetaFactor:      this.cellStore.cosThetaFactor,
        freqKHz:             this.cellStore.currentBroadcastFrequency,
        fieldVcm:            this.cellStore.fieldIntensity,
        healthyTemp:         this.cellStore.healthyTemp,
        targetTemp:          this.cellStore.targetTemp,
        waveform:            this.cellStore.waveform,
        pulseWidthNs:        this.cellStore.pulseWidthNs,
        effectivePulseCount: this.cellStore.effectivePulseCount,
      }
    },

    diffRows(): DiffRow[] {
      return [
        this.buildPctRow('targetDr',  this.$t('ai.applyCalibRowTargetDr'),  this.baseResult.targetDr,  this.correctedResult.targetDr),
        this.buildPctRow('healthyDr', this.$t('ai.applyCalibRowHealthyDr'), this.baseResult.healthyDr, this.correctedResult.healthyDr),
        this.buildTiRow('ti', this.$t('ai.applyCalibRowTi'), this.baseResult.ti, this.correctedResult.ti),
      ]
    },
  },

  methods: {
    formatFreqKHz(khz: number): string { return formatFreqKHz(khz) },

    buildPctRow(key: string, label: string, base: number, corrected: number): DiffRow {
      const baseText      = `${(base      * 100).toFixed(1)}%`
      const correctedText = `${(corrected * 100).toFixed(1)}%`
      const deltaPp       = (corrected - base) * 100
      const deltaText     = `${deltaPp >= 0 ? '+' : ''}${deltaPp.toFixed(1)} pp`
      return { key, label, baseText, correctedText, deltaText, deltaClass: this.deltaClass(deltaPp) }
    },

    buildTiRow(key: string, label: string, base: number, corrected: number): DiffRow {
      const baseText      = base.toFixed(2)
      const correctedText = corrected.toFixed(2)
      const delta         = corrected - base
      const deltaText     = `${delta >= 0 ? '+' : ''}${delta.toFixed(2)}`
      return { key, label, baseText, correctedText, deltaText, deltaClass: this.deltaClass(delta) }
    },

    deltaClass(delta: number): string {
      if (Math.abs(delta) < 1e-3) return 'acm__diff-delta--flat'
      return delta > 0 ? 'acm__diff-delta--up' : 'acm__diff-delta--down'
    },

    onClose() { this.$emit('close') },
  },
})
</script>

<style lang="scss" scoped>
.acm {
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
    max-width: 560px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    max-height: 92vh;
  }

  &__header {
    @include flex-col(0.3rem);
    padding: 1.1rem 1.4rem 0.75rem;
    border-bottom: 1px solid color-mix(in srgb, var(--color-primary) 12%, transparent);
    flex-shrink: 0;
  }

  &__eyebrow {
    @include mono-upper(var(--fs-xxs));
    color: var(--color-primary);
  }

  &__subtitle {
    margin: 0;
    font-size: var(--fs-lg);
    color: var(--color-text);
  }

  &__hint {
    margin: 0;
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
    line-height: 1.45;
  }

  &__body {
    @include flex-col(1rem);
    padding: 1rem 1.4rem;
    overflow-y: auto;
  }

  &__section { @include flex-col(0.5rem); }

  &__section-title {
    @include section-title();
    margin: 0;
  }

  &__protocol {
    @include flex-row(0.45rem);
    flex-wrap: wrap;
  }

  &__protocol-item { @include badge-pill(0.18rem 0.55rem, 3px); }

  &__mults {
    @include flex-col(0.3rem);
  }

  &__mult {
    @include flex-between();
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
  }

  &__mult-label { color: var(--color-text-muted); }
  &__mult-value { color: var(--color-primary); }

  &__diff {
    width: 100%;
    border-collapse: collapse;
    font-family: var(--font-mono);
    font-size: var(--fs-xs);

    th {
      @include mono-upper(var(--fs-xxs), 0.06em);
      color: var(--color-text-muted);
      padding: 0.3rem 0.4rem;
      text-align: right;
      border-bottom: 1px solid var(--color-border);

      &:first-child { text-align: left; }
    }

    td {
      padding: 0.35rem 0.4rem;
      text-align: right;
      color: var(--color-text);
      border-bottom: 1px solid color-mix(in srgb, var(--color-border) 40%, transparent);

      &:first-child { text-align: left; color: var(--color-text-muted); }
    }

    tbody tr:last-child td { border-bottom: 0; }
  }

  &__diff-metric { color: var(--color-text-muted); }

  &__diff-delta {
    &--up   { color: var(--color-lime); }
    &--down { color: var(--color-amber); }
    &--flat { color: var(--color-text-muted); opacity: var(--op-dim); }
  }

  &__note {
    margin: 0.2rem 0 0;
    font-size: var(--fs-xxs);
    color: var(--color-text-muted);
    opacity: var(--op-muted);
    line-height: 1.5;
  }

  &__footer {
    @include flex-between();
    padding: 0.85rem 1.4rem;
    border-top: 1px solid color-mix(in srgb, var(--color-primary) 10%, transparent);
    gap: 0.6rem;
  }

  &__btn {
    padding: 0.4rem 1rem;
    border-radius: var(--radius);
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    cursor: pointer;
    transition: border-color var(--tr-fast), color var(--tr-fast), background var(--tr-fast);

    &--primary {
      background: color-mix(in srgb, var(--color-primary) 12%, transparent);
      border: 1px solid color-mix(in srgb, var(--color-primary) 40%, transparent);
      color: var(--color-primary);
      margin-left: auto;

      &:hover { background: color-mix(in srgb, var(--color-primary) 20%, transparent); }
    }
  }
}

.acm-enter-active, .acm-leave-active { transition: opacity 0.2s ease; }
.acm-enter-from, .acm-leave-to       { opacity: 0; }
</style>
