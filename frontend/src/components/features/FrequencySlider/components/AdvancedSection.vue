<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div
    class="field-panel__section"
    :class="{ 'field-panel__section--open': open }"
  >
    <button
      class="field-panel__accordion"
      :class="{ 'field-panel__accordion--open': open }"
      @click="open = !open"
    >
      <span class="field-panel__accordion-label">{{
        $t("slider.advanced")
      }}</span>
      <span
        class="field-panel__accordion-chevron"
        :class="{ 'field-panel__accordion-chevron--open': open }"
        >{{ ICON.CHEVRON }}</span
      >
    </button>

    <div v-show="open" class="field-panel__accordion-body">
      <!-- Row 7: Cell Orientation θ -->
      <div class="field-panel__row field-panel__row--compact-readout">
        <div class="field-panel__row-header">
          <span class="field-panel__row-label" v-tip="tipOrientation">{{
            $t("slider.orientationTheta")
          }}</span>
          <div class="field-panel__readout" v-tip="tipOrientation">
            <span class="field-panel__readout-value">{{
              cosThetaDisplay
            }}</span>
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

      <!-- Row 8: Pulses to Lysis N (pulsed/H-FIRE only) - target cell lysis timing only -->
      <div
        v-if="isTimedWaveform"
        class="field-panel__row field-panel__row--compact-readout"
      >
        <div class="field-panel__row-header">
          <span class="field-panel__row-label" v-tip="tipLysisNFull"
            >{{ $t("slider.pulsesN") }}
            <span
              class="field-panel__scope-tag field-panel__scope-tag--target"
              >{{ CELL_LABEL.TARGET }}</span
            ></span
          >
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
        v-if="isDoubleShellEligible"
        class="field-panel__row field-panel__row--medium"
      >
        <div class="field-panel__row-header">
          <span
            class="field-panel__row-label"
            v-tip="STATIC_SLIDER_TOOLTIPS.shellModel"
            >{{ $t("slider.doubleShell") }}</span
          >
          <div class="field-panel__pills">
            <label
              class="field-panel__pill"
              :class="{
                'field-panel__pill--active': !cellStore.doubleShellEnabled,
              }"
              v-tip="STATIC_SLIDER_TOOLTIPS.singleShell"
            >
              <input
                type="radio"
                name="shellModel"
                :checked="!cellStore.doubleShellEnabled"
                @change="setShellModel(false)"
              />
              {{ $t("slider.doubleShellSingle") }}
            </label>
            <label
              class="field-panel__pill field-panel__pill--nuclear"
              :class="{
                'field-panel__pill--active': cellStore.doubleShellEnabled,
              }"
              v-tip="tipDoubleShell"
            >
              <input
                type="radio"
                name="shellModel"
                :checked="cellStore.doubleShellEnabled"
                @change="setShellModel(true)"
              />
              {{ $t("slider.doubleShellDouble") }}
            </label>
          </div>
        </div>
      </div>

      <!-- Row 10: Blood Perfusion Rate ω_b (Pennes bioheat) -->
      <div class="field-panel__row">
        <div class="field-panel__row-header">
          <span class="field-panel__row-label" v-tip="tipPerfusionFull">{{
            $t("slider.bloodPerfusion")
          }}</span>
          <div class="field-panel__readout" v-tip="tipPerfusionFull">
            <span class="field-panel__readout-value">{{
              perfusionDisplay
            }}</span>
          </div>
        </div>
        <div class="field-panel__track">
          <input
            class="field-panel__slider"
            type="range"
            :min="SLIDER_ADV.PERF_MIN"
            :max="SLIDER_ADV.PERF_MAX"
            :step="SLIDER_ADV.PERF_STEP"
            :value="cellStore.perfusionRate"
            @input="onPerfusionInput"
          />
        </div>
      </div>

      <!-- Row 11: Cell Packing Fraction φ (Maxwell-Garnett) -->
      <div class="field-panel__row">
        <div class="field-panel__row-header">
          <span class="field-panel__row-label" v-tip="tipCellPackingFull">{{
            $t("slider.cellPacking")
          }}</span>
          <div class="field-panel__readout" v-tip="tipCellPackingFull">
            <span class="field-panel__readout-value">{{
              cellPackingDisplay
            }}</span>
          </div>
        </div>
        <div class="field-panel__track">
          <input
            class="field-panel__slider"
            type="range"
            :min="SLIDER_ADV.PHI_MIN"
            :max="SLIDER_ADV.PHI_MAX"
            :step="SLIDER_ADV.PHI_STEP"
            :value="cellStore.cellPackingFraction"
            @input="onCellPackingInput"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { mapStores } from "pinia";

import { useCellStore } from "@/stores/cellStore";

import { broadcastStateSync } from "@/services/socket";

import {
  tipOrientation,
  tipLysisN,
  tipLysisNNote,
  tipDoubleShell,
  tipPerfusion,
  tipCellPacking,
} from "@/tooltips/sliderTooltips";
import {
  buildCellPackingTooltipParams,
  buildDoubleShellTooltipParams,
  buildLysisNTooltipParams,
  buildPerfusionTooltipParams,
  formatCellPackingDisplay,
  formatLysisNDisplay,
  formatOrientationDisplay,
  formatPerfusionDisplay,
} from "../lib";
import { STATIC_SLIDER_TOOLTIPS } from "../lib";

import { WAVEFORM, CELL_CATEGORY, CELL_LABEL } from "@/constants/strings";
import { ICON } from "@/constants/icons";
import { SLIDER_ADV } from "@/constants/sliderBounds";
import { UNIT } from "@/constants/units";

export default defineComponent({
  data() {
    return { open: false, STATIC_SLIDER_TOOLTIPS };
  },

  computed: {
    ...mapStores(useCellStore),
    WAVEFORM() {
      return WAVEFORM;
    },
    CELL_CATEGORY() {
      return CELL_CATEGORY;
    },
    CELL_LABEL() {
      return CELL_LABEL;
    },
    ICON() {
      return ICON;
    },
    UNIT() {
      return UNIT;
    },
    SLIDER_ADV() {
      return SLIDER_ADV;
    },

    orientationDeg(): number {
      return this.cellStore.orientationDeg;
    },

    cosThetaDisplay(): string {
      return formatOrientationDisplay(
        this.cellStore.orientationDeg,
        this.cellStore.cosThetaFactor,
      );
    },

    lysisNLogVal(): number {
      return Math.log10(Math.max(1, this.cellStore.lysisNPulses));
    },

    lysisNDisplay(): string {
      return formatLysisNDisplay(
        this.cellStore.lysisNPulses,
        this.cellStore.lysisDelayMs,
      );
    },

    tipOrientation(): string {
      return tipOrientation(
        this.cellStore.orientationDeg,
        this.cellStore.cosThetaFactor,
      );
    },

    tipLysisN(): string {
      return tipLysisN(
        buildLysisNTooltipParams({
          lysisNPulses: this.cellStore.lysisNPulses,
          lysisDelayMs: this.cellStore.lysisDelayMs,
          dutyCycle: this.cellStore.dutyCycle,
          pulseWidthNs: this.cellStore.pulseWidthNs,
        }),
      );
    },

    tipLysisNFull(): string {
      return this.tipLysisN + tipLysisNNote();
    },
    tipDoubleShell(): string {
      return tipDoubleShell(
        buildDoubleShellTooltipParams({
          targetLabel: this.cellStore.target.label,
          healthyLabel: this.cellStore.healthy.label,
          targetVmNucMv: this.cellStore.targetNuclearVm * 1000,
          healthyVmNucMv: this.cellStore.healthyNuclearVm * 1000,
          targetFpeakKHz: this.cellStore.targetNuclearFpeakKHz,
          healthyFpeakKHz: this.cellStore.healthyNuclearFpeakKHz,
          currentBroadcastFrequency: this.cellStore.currentBroadcastFrequency,
          fieldIntensity: this.cellStore.fieldIntensity,
          hasTargetNucleus: !!this.cellStore.target.nuclearRadius,
          hasHealthyNucleus: !!this.cellStore.healthy.nuclearRadius,
        }),
      );
    },

    perfusionDisplay(): string {
      return formatPerfusionDisplay(
        this.cellStore.perfusionRate,
        this.$t("slider.perfusionInVitro") as string,
      );
    },

    cellPackingDisplay(): string {
      return formatCellPackingDisplay(
        this.cellStore.cellPackingFraction,
        this.$t("slider.cellPackingIsolated") as string,
      );
    },

    tipPerfusionFull(): string {
      const { perfusionRate, effLambdaH } = buildPerfusionTooltipParams({
        perfusionRate: this.cellStore.perfusionRate,
        healthySpecificHeatCapacity:
          this.cellStore.healthy.specificHeatCapacity,
      });
      return tipPerfusion(perfusionRate, effLambdaH);
    },

    tipCellPackingFull(): string {
      const { phi, sigmaE0, sigmaEff } = buildCellPackingTooltipParams({
        cellPackingFraction: this.cellStore.cellPackingFraction,
        sigmaE: this.cellStore.sigma_e,
        effectiveSigmaE: this.cellStore.effectiveSigmaE,
      });
      return tipCellPacking(phi, sigmaE0, sigmaEff);
    },

    isTimedWaveform(): boolean {
      return (
        this.cellStore.waveform === WAVEFORM.PULSED ||
        this.cellStore.waveform === WAVEFORM.H_FIRE
      );
    },
    isDoubleShellEligible(): boolean {
      return (
        this.cellStore.targetCellCategory === CELL_CATEGORY.MAMMALIAN &&
        this.cellStore.hasNuclearParams
      );
    },
  },

  methods: {
    onOrientationInput(e: Event) {
      this.cellStore.setOrientationDeg(
        Number((e.target as HTMLInputElement).value),
      );
      broadcastStateSync();
    },

    onLysisNInput(e: Event) {
      const logVal = Number((e.target as HTMLInputElement).value);
      this.cellStore.setLysisNPulses(Math.round(Math.pow(10, logVal)));
      broadcastStateSync();
    },

    setShellModel(enable: boolean) {
      if (this.cellStore.doubleShellEnabled !== enable)
        this.cellStore.toggleDoubleShell();
      broadcastStateSync();
    },

    onPerfusionInput(e: Event) {
      this.cellStore.setPerfusionRate(
        Number((e.target as HTMLInputElement).value),
      );
      broadcastStateSync();
    },

    onCellPackingInput(e: Event) {
      this.cellStore.setCellPackingFraction(
        Number((e.target as HTMLInputElement).value),
      );
      broadcastStateSync();
    },
  },
});
</script>

<style lang="scss" scoped>
.field-panel {
  &__section {
    border-bottom: 1px solid var(--color-border);

    &--open {
      border-bottom: none;
    }
  }

  &__accordion {
    @include accordion-header();
    border-top: none;
    padding: 0.65rem 1.25rem;

    &-label {
      flex: 1;
    }

    &-chevron {
      font-size: var(--fs-2xl);
      line-height: 1;
      display: inline-block;
      transform: rotate(0deg);
      transition: transform var(--tr-normal);
      opacity: var(--op-muted);

      &--open {
        transform: rotate(90deg);
      }
    }

    &-body {
      display: flex;
      flex-direction: column;
      gap: 1.3rem;
      padding: 0.9rem 1.25rem 1.1rem;
    }
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

    &--target {
      background: color-mix(in srgb, var(--color-danger) 12%, transparent);
      color: var(--color-danger);
      border: 1px solid color-mix(in srgb, var(--color-danger) 22%, transparent);
    }
    &--healthy {
      background: color-mix(in srgb, var(--color-primary) 10%, transparent);
      color: var(--color-accent);
      border: 1px solid
        color-mix(in srgb, var(--color-primary) 20%, transparent);
    }
  }

  &__row {
    @include field-row-grid();

    &--medium .field-panel__row-header .field-panel__pills {
      flex: 1;
      justify-content: center;
    }
  }

  &__row-header {
    @include field-row-header();
    min-height: 2.2rem;
  }

  &__row-label {
    @include row-label();
  }

  &__pills {
    display: flex;
    gap: 0.35rem;
    flex-wrap: wrap;
  }

  &__pill {
    @include mono-upper(0.62rem, 0);
    text-transform: capitalize;
    padding: 0.18rem 0.55rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    cursor: pointer;
    color: var(--color-text-muted);
    transition:
      border-color var(--tr-fast),
      color var(--tr-fast),
      background-color var(--tr-fast);
    user-select: none;
    white-space: nowrap;

    input {
      display: none;
    }

    &--active {
      border-color: var(--color-primary);
      color: var(--color-primary);
      background-color: var(--color-primary-dim);
    }
    &--nuclear {
      border-color: color-mix(
        in srgb,
        var(--color-purple) 50%,
        transparent
      ) !important;
      color: var(--color-purple) !important;
      &.field-panel__pill--active {
        border-color: var(--color-purple) !important;
        background-color: var(--color-purple-dim) !important;
      }
    }
  }

  &__track {
    position: relative;
    display: flex;
    align-items: center;
  }

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

    &-sub {
      font-size: var(--fs-xxs);
      font-family: var(--font-mono);
      color: var(--color-text-muted);
      white-space: nowrap;
      opacity: 0.75;
    }
  }
}
</style>
