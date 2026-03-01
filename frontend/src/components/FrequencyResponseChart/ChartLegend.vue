<script lang="ts">
import { defineComponent } from 'vue'
import { useCellStore } from '../../stores/cellStore'
import { GROUP_COLORS } from '../../constants/cellLibrary'
import type { CellGroup } from '../../constants/cellLibrary'

export default defineComponent({
  setup() {
    return { store: useCellStore(), GROUP_COLORS }
  },

  computed: {
    groups(): CellGroup[] {
      return ['reference', 'cancer', 'bacteria', 'virus']
    },
  },
})
</script>

<template>
  <div class="freq-chart__legend">
    <span
      v-for="g in groups"
      :key="g"
      class="freq-chart__legend-item"
      v-tip="{ reference: `<strong>Reference cells</strong>\nHealthy baseline — hepatocyte, RBC\nTypically higher threshold voltage\nand lower membrane permittivity`,
               cancer:    `<strong>Cancer cells</strong>\nLarger radius → lower fc → higher Vm at low frequency\nLower threshold → disrupted at lower field intensity`,
               bacteria:  `<strong>Bacteria</strong>\nSmall radius (0.5–1 µm) → fc ~8–26 MHz (E. coli ~8 MHz, MRSA ~26 MHz)\nThick peptidoglycan wall raises membrane thickness`,
               virus:     `<strong>Viruses</strong>\nRadius ~100 nm · Schwan fc ~0.4 MHz (σ_i-limited)\nNote: single-shell model is approximate for virions` }[g]"
    >
      <span class="freq-chart__legend-dot" :style="{ background: `var(--group-${g})` }"></span>
      {{ { reference: 'Reference', cancer: 'Cancer', bacteria: 'Bacteria', virus: 'Virus' }[g] }}
    </span>
    <span
      class="freq-chart__legend-item"
      v-tip="'<strong>Active Healthy cell</strong>\nCurrently selected healthy baseline\n(cyan, full opacity, glowing)\nShows Vm curve for selected preset and current field'"
    ><span class="freq-chart__legend-line freq-chart__legend-line--h"></span> Active H</span>
    <span
      class="freq-chart__legend-item"
      v-tip="'<strong>Active Target cell</strong>\nCurrently selected target (cancer / pathogen)\n(red, full opacity, glowing)\nDrag the white cursor to set broadcast frequency'"
    ><span class="freq-chart__legend-line freq-chart__legend-line--t"></span> Active T</span>
    <span
      class="freq-chart__legend-item"
      v-tip="'<strong>Vm selectivity ratio</strong> (amber dashed · right axis)\nVm_T(f) × psf_T / (Vm_H(f) × psf_H) — orientation-independent (cos θ cancels).\n>1× → target accumulates more Vm than healthy at that frequency.\nPulse step factor (psf) accounts for ns-pulse charging fraction.'"
    ><span class="freq-chart__legend-line freq-chart__legend-line--sel"></span> Vm ratio T/H</span>
    <span
      v-if="store.doubleShellEnabled"
      class="freq-chart__legend-item"
      v-tip="'<strong>Nuclear Vm — Healthy</strong> (dashed, half opacity)\nDouble-shell model (Kotnik &amp; Miklavcic 2006).\nVm_nuc is a bandpass function peaking near f_peak = 1/(2π√(τ_out·τ_ne)).\nTypical: hepatocyte f_peak ≈ 1.66 MHz · Vm_nuc ≈ 40 mV at 417 kHz / 150 V/cm'"
    ><span class="freq-chart__legend-line freq-chart__legend-line--nuc-h"></span> Nucleus H</span>
    <span
      v-if="store.doubleShellEnabled"
      class="freq-chart__legend-item"
      v-tip="'<strong>Nuclear Vm — Target</strong> (dashed, half opacity)\nDouble-shell model (Kotnik &amp; Miklavcic 2006).\nCancer nuclei have thinner/leakier NE → higher Vm_nuc and lower threshold.\nTypical: adenocarcinoma f_peak ≈ 0.87 MHz · Vm_nuc ≈ 110 mV at 417 kHz / 150 V/cm'"
    ><span class="freq-chart__legend-line freq-chart__legend-line--nuc-t"></span> Nucleus T</span>
  </div>
</template>
