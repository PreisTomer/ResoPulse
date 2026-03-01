<script lang="ts">
import { defineComponent } from 'vue'
import { useCellStore } from '../../stores/cellStore'
import { tipOrientation, tipLysisN, formatLysisTime } from '../../utils/sliderTooltips'

export default defineComponent({
  setup() {
    return { store: useCellStore() }
  },

  data() {
    return { open: false }
  },

  computed: {
    orientationDeg(): number { return this.store.orientationDeg },

    cosThetaDisplay(): string {
      const cosT = this.store.cosThetaFactor
      return `${this.store.orientationDeg}° — ${(cosT * 100).toFixed(0)}% Vm coupling`
    },

    lysisNLogVal(): number {
      return Math.log10(Math.max(1, this.store.lysisNPulses))
    },

    lysisNDisplay(): string {
      const n = this.store.lysisNPulses
      return `${n} pulse${n === 1 ? '' : 's'} — est. ${formatLysisTime(this.store.lysisDelayMs)}`
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
  },

  methods: {
    onOrientationInput(e: Event) {
      const deg = Number((e.target as HTMLInputElement).value)
      this.store.setOrientationDeg(deg)
    },

    onLysisNInput(e: Event) {
      const logVal = Number((e.target as HTMLInputElement).value)
      this.store.setLysisNPulses(Math.round(Math.pow(10, logVal)))
    },
  },
})
</script>

<template>
  <button class="field-panel__accordion" @click="open = !open">
    <span class="field-panel__accordion-label">Advanced</span>
    <span class="field-panel__accordion-chevron" :class="{ 'field-panel__accordion-chevron--open': open }">›</span>
  </button>

  <div v-show="open" class="field-panel__accordion-body">
    <!-- Row 7: Cell Orientation θ -->
    <div class="field-panel__row">
      <span class="field-panel__row-label" v-tip="tipOrientation">{{ $t('slider.orientationAngle') }}</span>
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
      <div class="field-panel__readout">
        <span class="field-panel__readout-value" v-tip="tipOrientation">{{ cosThetaDisplay }}</span>
        <span class="field-panel__readout-sub" v-tip="tipOrientation">{{ $t('slider.orientationSub') }}</span>
      </div>
    </div>

    <!-- Row 8: Pulses to Lysis N (pulsed only) -->
    <div v-if="store.waveform === 'pulsed'" class="field-panel__row">
      <span class="field-panel__row-label" v-tip="tipLysisN">{{ $t('slider.lysisNPulses') }}</span>
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
      <div class="field-panel__readout">
        <span class="field-panel__readout-value" v-tip="tipLysisN">{{ lysisNDisplay }}</span>
        <span class="field-panel__readout-sub" v-tip="tipLysisN">{{ $t('slider.lysisNSub') }}</span>
      </div>
    </div>

    <!-- Row 9: Double-Shell Model toggle (mammalian nucleated cells only) -->
    <div
      v-if="store.targetCellCategory === 'mammalian' && store.hasNuclearParams"
      class="field-panel__row field-panel__row--medium"
    >
      <span
        class="field-panel__row-label"
        v-tip="'<strong>Shell Model</strong>\nChoose the membrane model used to compute transmembrane potential.\nSingle-Shell: standard Schwan (plasma membrane only).\n+ Nuclear Envelope: adds nuclear Vm bandpass — Kotnik &amp; Miklavcic (2006).'"
      >{{ $t('slider.doubleShell') }}</span>
      <div class="field-panel__pills">
        <label
          class="field-panel__pill"
          :class="{ 'field-panel__pill--active': !store.doubleShellEnabled }"
          v-tip="'<strong>Single-Shell (Schwan)</strong>\nStandard single-shell model — only plasma membrane Vm is computed.\nτ = R·Cm·(2σ_e+σ_i)/(2σ_e·σ_i)  ·  Vm = 1.5·E·R·cos θ / √(1+(ωτ)²)\nDefault mode. Applicable to all cell types.\nRef: Kotnik &amp; Miklavcic, Biophys. J. 79:670 (2000)'"
        >
          <input type="radio" name="shellModel" :checked="!store.doubleShellEnabled" @change="store.doubleShellEnabled && store.toggleDoubleShell()" />
          {{ $t('slider.doubleShellSingle') }}
        </label>
        <label
          class="field-panel__pill field-panel__pill--nuclear"
          :class="{ 'field-panel__pill--active': store.doubleShellEnabled }"
          v-tip="'<strong>+ Nuclear Envelope (Double-Shell)</strong>\nAdds nuclear membrane Vm as a two-pole bandpass function.\nVm_nuc peaks at f_peak = 1/(2π√(τ_out·τ_ne))\nτ_ne = R_nuc·Cm_ne·(2σ_i+σ_np)/(2σ_i·σ_np)  [σ_i = cytoplasm, external medium for nucleus]\nCancer nuclei: thinner NE, lower σ_ne threshold → additional selectivity axis.\n\nExpected at 417 kHz / 150 V/cm / saline:\n  Hepatocyte:    Vm_nuc ≈ 40 mV  (f_peak ≈ 1.66 MHz)\n  Adeno CA:      Vm_nuc ≈ 113 mV (f_peak ≈ 0.87 MHz)\n  GBM:           Vm_nuc ≈ 87 mV  (f_peak ≈ 1.05 MHz)\n\nRef: Kotnik &amp; Miklavcic, Biophys. J. 90:480 (2006)'"
        >
          <input type="radio" name="shellModel" :checked="store.doubleShellEnabled" @change="!store.doubleShellEnabled && store.toggleDoubleShell()" />
          {{ $t('slider.doubleShellDouble') }}
        </label>
      </div>
    </div>
  </div>
</template>
