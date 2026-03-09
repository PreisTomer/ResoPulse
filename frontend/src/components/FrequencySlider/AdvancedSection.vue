<template>
  <button class="field-panel__accordion" @click="open = !open">
    <span class="field-panel__accordion-label">{{ $t('slider.advanced') }}</span>
    <span class="field-panel__accordion-chevron" :class="{ 'field-panel__accordion-chevron--open': open }">{{ ICON.CHEVRON }}</span>
  </button>

  <div v-show="open" class="field-panel__accordion-body">
    <!-- Row 7: Cell Orientation θ -->
    <div class="field-panel__row field-panel__row--compact-readout">
      <span class="field-panel__row-label" v-tip="tipOrientation">{{ $t('slider.orientationTheta') }}</span>
      <div class="field-panel__track">
        <input
          class="field-panel__slider"
          type="range"
          min="0"
          max="90"
          step="1"
          :value="orientationDeg"
          @input="onOrientationInput"
        />
      </div>
      <div class="field-panel__readout" v-tip="tipOrientation">
        <span class="field-panel__readout-value">{{ cosThetaDisplay }}</span>
      </div>
    </div>

    <!-- Row 8: Pulses to Lysis N (pulsed only) — target cell lysis timing only -->
    <div v-if="store.waveform === WAVEFORM.PULSED" class="field-panel__row field-panel__row--compact-readout">
      <span
        class="field-panel__row-label"
        v-tip="tipLysisNFull"
      >{{ $t('slider.pulsesN') }} <span class="field-panel__scope-tag field-panel__scope-tag--target">T</span></span>
      <div class="field-panel__track">
        <input
          class="field-panel__slider"
          type="range"
          min="0"
          max="3"
          step="0.05"
          :value="lysisNLogVal"
          @input="onLysisNInput"
        />
      </div>
      <div class="field-panel__readout" v-tip="tipLysisN">
        <span class="field-panel__readout-value">{{ lysisNDisplay }}</span>
      </div>
    </div>

    <!-- Row 9: Double-Shell Model toggle (mammalian nucleated cells only) -->
    <div
      v-if="store.targetCellCategory === CELL_CATEGORY.MAMMALIAN && store.hasNuclearParams"
      class="field-panel__row field-panel__row--medium"
    >
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

    <!-- Row 10: Blood Perfusion Rate ω_b (Pennes bioheat) -->
    <div class="field-panel__row">
      <span class="field-panel__row-label" v-tip="tipPerfusionFull">{{ $t('slider.bloodPerfusion') }}</span>
      <div class="field-panel__track">
        <input
          class="field-panel__slider"
          type="range"
          min="0"
          max="5"
          step="0.05"
          :value="store.perfusionRate"
          @input="onPerfusionInput"
        />
      </div>
      <div class="field-panel__readout" v-tip="tipPerfusionFull">
        <span class="field-panel__readout-value">{{ perfusionDisplay }}</span>
      </div>
    </div>

    <!-- Row 11: Cell Packing Fraction φ (Maxwell-Garnett) -->
    <div class="field-panel__row">
      <span class="field-panel__row-label" v-tip="tipCellPackingFull">{{ $t('slider.cellPacking') }}</span>
      <div class="field-panel__track">
        <input
          class="field-panel__slider"
          type="range"
          min="0"
          max="0.9"
          step="0.01"
          :value="store.cellPackingFraction"
          @input="onCellPackingInput"
        />
      </div>
      <div class="field-panel__readout" v-tip="tipCellPackingFull">
        <span class="field-panel__readout-value">{{ cellPackingDisplay }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useCellStore } from '@/stores/cellStore'
import { broadcastStateSync } from '@/services/socket'
import { WAVEFORM } from '@/constants/strings'
import { CELL_CATEGORY } from '@/constants/strings'
import { ICON } from '@/constants/icons'
import { tipOrientation, tipLysisN, tipLysisNNote, tipShellModel, tipSingleShell, tipDoubleShell, tipPerfusion, tipCellPacking, formatLysisTime } from '@/utils/sliderTooltips'
import { UNIT } from '@/constants/units'

export default defineComponent({
  setup() {
    return { store: useCellStore(), WAVEFORM, CELL_CATEGORY, ICON, UNIT }
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
      const lambdaH = 0.02 + this.store.perfusionRate * 63.9 / cp_h
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
