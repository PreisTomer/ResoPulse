<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="field-panel__section" :class="{ 'field-panel__section--open': open }">
  <button class="field-panel__accordion" :class="{ 'field-panel__accordion--open': open }" @click="open = !open">
    <span class="field-panel__accordion-label">{{ $t('slider.advanced') }}</span>
    <span class="field-panel__accordion-chevron" :class="{ 'field-panel__accordion-chevron--open': open }">{{ ICON.CHEVRON }}</span>
  </button>

  <div v-show="open" class="field-panel__accordion-body">
    <!-- Row 7: Cell Orientation θ -->
    <div class="field-panel__row field-panel__row--compact-readout">
      <div class="field-panel__row-header">
        <span class="field-panel__row-label" v-tip="tipOrientation">{{ $t('slider.orientationTheta') }}</span>
        <div class="field-panel__readout" v-tip="tipOrientation">
          <span class="field-panel__readout-value">{{ cosThetaDisplay }}</span>
        </div>
      </div>
      <div class="field-panel__track">
        <input
          class="field-panel__slider"
          type="range"
          :min="SLIDER_ADV.ORI_MIN"
          :max="SLIDER_ADV.ORI_MAX"
          :step="SLIDER_ADV.ORI_STEP"
          :value="orientationDeg"
          @input="onOrientationInput"
        />
      </div>
    </div>

    <!-- Row 8: Pulses to Lysis N (pulsed only) - target cell lysis timing only -->
    <div v-if="store.waveform === WAVEFORM.PULSED" class="field-panel__row field-panel__row--compact-readout">
      <div class="field-panel__row-header">
        <span class="field-panel__row-label" v-tip="tipLysisNFull">{{ $t('slider.pulsesN') }} <span class="field-panel__scope-tag field-panel__scope-tag--target">{{ CELL_LABEL.TARGET }}</span></span>
        <div class="field-panel__readout" v-tip="tipLysisN">
          <span class="field-panel__readout-value">{{ lysisNDisplay }}</span>
        </div>
      </div>
      <div class="field-panel__track">
        <input
          class="field-panel__slider"
          type="range"
          :min="SLIDER_ADV.LYSIS_N_LOG_MIN"
          :max="SLIDER_ADV.LYSIS_N_LOG_MAX"
          :step="SLIDER_ADV.LYSIS_N_LOG_STEP"
          :value="lysisNLogVal"
          @input="onLysisNInput"
        />
      </div>
    </div>

    <!-- Row 9: Double-Shell Model toggle (mammalian nucleated cells only) -->
    <div
      v-if="store.targetCellCategory === CELL_CATEGORY.MAMMALIAN && store.hasNuclearParams"
      class="field-panel__row field-panel__row--medium"
    >
      <div class="field-panel__row-header">
        <span class="field-panel__row-label" v-tip="tipShellModel">{{ $t('slider.doubleShell') }}</span>
        <div class="field-panel__pills">
          <label
            class="field-panel__pill"
            :class="{ 'field-panel__pill--active': !store.doubleShellEnabled }"
            v-tip="tipSingleShell"
          >
            <input type="radio" name="shellModel" :checked="!store.doubleShellEnabled" @change="setShellModel(false)" />
            {{ $t('slider.doubleShellSingle') }}
          </label>
          <label
            class="field-panel__pill field-panel__pill--nuclear"
            :class="{ 'field-panel__pill--active': store.doubleShellEnabled }"
            v-tip="tipDoubleShell"
          >
            <input type="radio" name="shellModel" :checked="store.doubleShellEnabled" @change="setShellModel(true)" />
            {{ $t('slider.doubleShellDouble') }}
          </label>
        </div>
      </div>
    </div>

    <!-- Row 10: Blood Perfusion Rate ω_b (Pennes bioheat) -->
    <div class="field-panel__row">
      <div class="field-panel__row-header">
        <span class="field-panel__row-label" v-tip="tipPerfusionFull">{{ $t('slider.bloodPerfusion') }}</span>
        <div class="field-panel__readout" v-tip="tipPerfusionFull">
          <span class="field-panel__readout-value">{{ perfusionDisplay }}</span>
        </div>
      </div>
      <div class="field-panel__track">
        <input
          class="field-panel__slider"
          type="range"
          :min="SLIDER_ADV.PERF_MIN"
          :max="SLIDER_ADV.PERF_MAX"
          :step="SLIDER_ADV.PERF_STEP"
          :value="store.perfusionRate"
          @input="onPerfusionInput"
        />
      </div>
    </div>

    <!-- Row 11: Cell Packing Fraction φ (Maxwell-Garnett) -->
    <div class="field-panel__row">
      <div class="field-panel__row-header">
        <span class="field-panel__row-label" v-tip="tipCellPackingFull">{{ $t('slider.cellPacking') }}</span>
        <div class="field-panel__readout" v-tip="tipCellPackingFull">
          <span class="field-panel__readout-value">{{ cellPackingDisplay }}</span>
        </div>
      </div>
      <div class="field-panel__track">
        <input
          class="field-panel__slider"
          type="range"
          :min="SLIDER_ADV.PHI_MIN"
          :max="SLIDER_ADV.PHI_MAX"
          :step="SLIDER_ADV.PHI_STEP"
          :value="store.cellPackingFraction"
          @input="onCellPackingInput"
        />
      </div>
    </div>
  </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useCellStore } from '@/stores/cellStore'
import { broadcastStateSync } from '@/services/socket'
import { WAVEFORM, CELL_CATEGORY, CELL_LABEL } from '@/constants/strings'
import { ICON } from '@/constants/icons'
import { SLIDER_ADV } from '@/constants/sliderBounds'
import { tipOrientation, tipLysisN, tipLysisNNote, tipShellModel, tipSingleShell, tipDoubleShell, tipPerfusion, tipCellPacking, formatLysisTime } from '@/tooltips/sliderTooltips'
import { UNIT } from '@/constants/units'
import { NEWTON_COOLING_LAMBDA, PENNES_BLOOD_COEFF } from '@/constants/physics'

export default defineComponent({
  setup() {
    return { store: useCellStore(), WAVEFORM, CELL_CATEGORY, CELL_LABEL, ICON, UNIT, SLIDER_ADV }
  },

  data() {
    return { open: false }
  },

  computed: {
    orientationDeg(): number { return this.store.orientationDeg },

    cosThetaDisplay(): string {
      const pct = (this.store.cosThetaFactor * 100).toFixed(0)
      return `${this.store.orientationDeg}° · cos ${pct}%`
    },

    lysisNLogVal(): number {
      return Math.log10(Math.max(1, this.store.lysisNPulses))
    },

    lysisNDisplay(): string {
      const n = this.store.lysisNPulses
      return `×${n} · ~${formatLysisTime(this.store.lysisDelayMs)}`
    },

    tipOrientation(): string {
      return tipOrientation(this.store.orientationDeg, this.store.cosThetaFactor)
    },

    tipLysisN(): string {
      return tipLysisN({
        lysisNPulses: this.store.lysisNPulses,
        lysisDelayMs: this.store.lysisDelayMs,
        dutyCycle:    this.store.dutyCycle,
        pulseWidthNs: this.store.pulseWidthNs,
      })
    },

    tipLysisNFull(): string  { return this.tipLysisN + tipLysisNNote() },
    tipShellModel(): string  { return tipShellModel() },
    tipSingleShell(): string { return tipSingleShell() },
    tipDoubleShell(): string { return tipDoubleShell() },

    perfusionDisplay(): string {
      const r = this.store.perfusionRate
      return r === 0 ? this.$t('slider.perfusionInVitro') : `${r.toFixed(2)} ${UNIT.ML_PER_G_MIN}`
    },

    cellPackingDisplay(): string {
      const phi = this.store.cellPackingFraction
      return phi === 0 ? this.$t('slider.cellPackingIsolated') : `${(phi * 100).toFixed(0)}${UNIT.PERCENT}`
    },

    tipPerfusionFull(): string {
      const cp_h = this.store.healthy.specificHeatCapacity
      const lambdaH = NEWTON_COOLING_LAMBDA + this.store.perfusionRate * PENNES_BLOOD_COEFF / cp_h
      return tipPerfusion(this.store.perfusionRate, lambdaH)
    },

    tipCellPackingFull(): string {
      const sigma_e0 = this.store.sigma_e
      const sigma_eff = this.store.effectiveSigmaE
      return tipCellPacking(this.store.cellPackingFraction, sigma_e0, sigma_eff)
    },
  },

  methods: {
    onOrientationInput(e: Event) {
      this.store.setOrientationDeg(Number((e.target as HTMLInputElement).value))
      broadcastStateSync()
    },

    onLysisNInput(e: Event) {
      const logVal = Number((e.target as HTMLInputElement).value)
      this.store.setLysisNPulses(Math.round(Math.pow(10, logVal)))
      broadcastStateSync()
    },

    setShellModel(enable: boolean) {
      if (this.store.doubleShellEnabled !== enable) this.store.toggleDoubleShell()
      broadcastStateSync()
    },

    onPerfusionInput(e: Event) {
      this.store.setPerfusionRate(Number((e.target as HTMLInputElement).value))
      broadcastStateSync()
    },

    onCellPackingInput(e: Event) {
      this.store.setCellPackingFraction(Number((e.target as HTMLInputElement).value))
      broadcastStateSync()
    },
  },
})
</script>

<style lang="scss" scoped>

.field-panel {
  &__section {
    border-bottom: 1px solid var(--color-border);

    &--open { border-bottom: none; }
  }

  &__accordion {
    @include accordion-header();
    border-top: none;
    padding: 0.65rem 1.25rem;

    &-label  { flex: 1; }

    &-chevron {
      font-size: 1rem;
      line-height: 1;
      display: inline-block;
      transform: rotate(0deg);
      transition: transform var(--tr-normal);
      opacity: var(--op-muted);

      &--open { transform: rotate(90deg); }
    }

    &-body { display: flex; flex-direction: column; gap: 1.3rem; padding: 0.9rem 1.25rem 1.1rem; }
  }

  &__scope-tag {
    display: inline-block;
    font-size: var(--fs-xxs);
    font-weight: 700;
    letter-spacing: 0.04em;
    padding: 0.04rem 0.25rem;
    border-radius: 2px;
    vertical-align: middle;
    margin-left: 0.2rem;
    position: relative;
    top: -0.5px;

    &--target  { background: color-mix(in srgb, var(--color-danger) 12%, transparent); color: var(--color-danger); border: 1px solid color-mix(in srgb, var(--color-danger) 22%, transparent); }
    &--healthy { background: color-mix(in srgb, var(--color-primary) 10%, transparent);  color: var(--color-accent); border: 1px solid color-mix(in srgb, var(--color-primary) 20%, transparent); }
  }

  &__row {
    @include field-row-grid();

    &--medium .field-panel__row-header .field-panel__pills { flex: 1; justify-content: center; }
  }

  &__row-header {
    @include field-row-header();
    min-height: 2.2rem;
  }

  &__row-label { @include row-label(); }

  &__pills { display: flex; gap: 0.35rem; flex-wrap: wrap; }

  &__pill {
    @include mono-upper(0.62rem, 0);
    text-transform: capitalize;
    padding: 0.18rem 0.55rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    cursor: pointer;
    color: var(--color-text-muted);
    transition: border-color var(--tr-fast), color var(--tr-fast), background-color var(--tr-fast);
    user-select: none;
    white-space: nowrap;

    input { display: none; }

    &--active  { border-color: var(--color-primary); color: var(--color-primary); background-color: var(--color-primary-dim); }
    &--nuclear {
      border-color: color-mix(in srgb, var(--color-purple) 50%, transparent) !important;
      color: var(--color-purple) !important;
      &.field-panel__pill--active { border-color: var(--color-purple) !important; background-color: var(--color-purple-dim) !important; }
    }
  }

  &__track { position: relative; display: flex; align-items: center; }

  &__slider {
    @include slider-track();
    @include slider-thumb();
  }

  &__readout {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem;
    flex-shrink: 0;

    &-value {
      font-size: var(--fs-md);
      font-weight: 600;
      font-family: var(--font-mono);
      color: var(--color-text);
      letter-spacing: -0.01em;
      line-height: 1;
      white-space: nowrap;
    }

    &-sub { font-size: var(--fs-xxs); font-family: var(--font-mono); color: var(--color-text-muted); white-space: nowrap; opacity: 0.75; }
  }
}
</style>
