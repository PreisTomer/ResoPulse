<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="sel-panel__library">
    <div
      class="sel-panel__lib-title"
      v-tip="cmpTitleTip"
    >{{ presetCompTitleDynamic }}</div>
    <div class="sel-panel__comparison-table">
      <div
        v-for="row in presetComparison"
        :key="row.preset.presetId"
        class="sel-panel__cmp-row"
        :class="{ 'sel-panel__cmp-row--active': row.isActive }"
        v-tip="cmpTip(row)"
      >
        <span class="sel-panel__cmp-name" :style="{ '--gc': GROUP_COLORS[row.preset.group] }">{{ row.preset.shortLabel }}</span>
        <div class="sel-panel__cmp-bar-track">
          <div
            class="sel-panel__cmp-bar"
            :class="selClass(row.sel)"
            :style="{ width: Math.min(100, row.sel * 40) + '%' }"
          ></div>
        </div>
        <span class="sel-panel__cmp-sel" :class="selClass(row.sel)">×{{ row.sel.toFixed(2) }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'

import { useCellStore } from '@/stores/cellStore'

import { computeSchwan, computeResonantDisruption, safeRatio, computeTau, pulseEnvelopeClamped, tempCorrectedVth } from '@/utils/physics'
import { tipCmpTitle, tipCmpRow } from '@/tooltips/selectivityTooltips'

import { CELL_PRESETS, GROUP_COLORS } from '@/constants/cellLibrary'
import { DEFAULT_CAPSID_Q, THRESHOLDS, NEAR_ZERO_DR, BODY_TEMP_C } from '@/constants/physics'
import { CELL_CATEGORY, CELL_GROUP, WAVEFORM } from '@/constants/strings'
import { UNIT } from '@/constants/units'

export default defineComponent({
  computed: {
    ...mapStores(useCellStore),
    CELL_PRESETS()  { return CELL_PRESETS },
    GROUP_COLORS()  { return GROUP_COLORS },
    UNIT()          { return UNIT },

    cmpTitleTip(): string {
      return tipCmpTitle(this.presetCompTitleDynamic, this.$t('selectivity.presetCompTip'))
    },

    targetPresetGroup(): string | undefined {
      return CELL_PRESETS.find(p => p.presetId === this.cellStore.target.id)?.group
    },

    presetCompTitleDynamic(): string {
      const cat = this.cellStore.targetCellCategory
      if (cat === CELL_CATEGORY.BACTERIA)                return this.$t('selectivity.compAltBacteria')
      if (cat === CELL_CATEGORY.VIRUS)                   return this.$t('selectivity.compAltViruses')
      if (this.targetPresetGroup === CELL_GROUP.STEM)    return this.$t('selectivity.compAltStem')
      return this.$t('selectivity.compAltCancer')
    },

    presetComparison() {
      const sigma_e   = this.cellStore.effectiveSigmaE
      const cosT      = this.cellStore.cosThetaFactor
      const freq      = this.cellStore.currentBroadcastFrequency
      const field     = this.cellStore.fieldIntensity
      const pwNs      = this.cellStore.pulseWidthNs
      const isPulsed  = this.cellStore.waveform === WAVEFORM.PULSED || this.cellStore.waveform === WAVEFORM.H_FIRE
      const hfireMult = this.cellStore.hFireMultiplier

      const cat = this.cellStore.targetCellCategory
      const relevantGroup = this.targetPresetGroup === CELL_GROUP.STEM ? CELL_GROUP.STEM
                          : cat === CELL_CATEGORY.MAMMALIAN             ? CELL_GROUP.CANCER
                          : cat

      // PEF / Vm / Vth for the healthy reference cell, frequency-independent and computed once. effectiveHealthy carries both σ_i and V_th calibration multipliers; reading thresholdVoltage off it (instead of raw state.healthy) keeps the closed-loop fit live in this what-if grid. Library comparison presets in the row loop below stay uncalibrated by design — their values reflect literature parameters.
      const calHealthy = this.cellStore.effectiveHealthy
      const pefH  = pulseEnvelopeClamped(computeTau(calHealthy, sigma_e), pwNs, isPulsed)
      const hVm   = computeSchwan(calHealthy, freq, field, sigma_e, cosT)
      const hVthE = tempCorrectedVth(calHealthy.thresholdVoltage, this.cellStore.healthyTemp, this.cellStore.effectivePulseCount)
      const hDr   = (hVm * pefH) / (hVthE * hfireMult)

      return CELL_PRESETS
        .filter((p) => p.group === relevantGroup)
        .map((p) => {
          const pr = p as typeof p & { resonantFreqGHz?: number; capsidQ?: number; resonantThresholdVcm?: number }
          const hasRes = (p.group === CELL_GROUP.BACTERIA || p.group === CELL_GROUP.VIRUS) && !!pr.resonantFreqGHz && !!pr.resonantThresholdVcm && this.cellStore.isResonanceMode
          let sel: number, tVmMv: string

          if (hasRes) {
            // Acoustic capsid: no hfireMult (EP mechanism only). Active preset uses live targetTemp; library rows stay at BODY_TEMP_C. Active preset's resonance knobs (Q, V_thr_res) come from effectiveTarget so the resonance calibration multiplier reaches this what-if cell.
            const isActive = p.presetId === this.cellStore.target.id
            const resTemp  = isActive ? this.cellStore.targetTemp : BODY_TEMP_C
            const eT       = this.cellStore.effectiveTarget as typeof p & { resonantFreqGHz?: number; capsidQ?: number; resonantThresholdVcm?: number; resonantFreqGHz2?: number; capsidQ2?: number; resonantMode2Amplitude?: number }
            const fres     = isActive ? (eT.resonantFreqGHz       ?? pr.resonantFreqGHz!)       : pr.resonantFreqGHz!
            const q        = isActive ? (eT.capsidQ               ?? pr.capsidQ              ?? DEFAULT_CAPSID_Q) : (pr.capsidQ ?? DEFAULT_CAPSID_Q)
            const vthrCm   = isActive ? (eT.resonantThresholdVcm  ?? pr.resonantThresholdVcm!) : pr.resonantThresholdVcm!
            const fres2    = isActive ? eT.resonantFreqGHz2     : pr.resonantFreqGHz2
            const q2       = isActive ? eT.capsidQ2             : pr.capsidQ2
            const amp2     = isActive ? eT.resonantMode2Amplitude : pr.resonantMode2Amplitude
            const effThreshold = tempCorrectedVth(vthrCm, resTemp)
            const ratio = computeResonantDisruption(fres, q, effThreshold, freq * 1e3, field, fres2, q2, amp2)
            sel = safeRatio(ratio, hDr, THRESHOLDS.TI_DISPLAY_CAP, NEAR_ZERO_DR)
            tVmMv = `D:${(ratio * 100).toFixed(0)}%`
          } else {
            // Active preset uses live targetTemp + calibrated effectiveTarget (σ_i AND V_th); library rows stay uncalibrated and at BODY_TEMP_C.
            const isActive = p.presetId === this.cellStore.target.id
            const schTemp = isActive ? this.cellStore.targetTemp : BODY_TEMP_C
            const cellForCompute = isActive ? this.cellStore.effectiveTarget : p
            const pefT    = pulseEnvelopeClamped(computeTau(cellForCompute, sigma_e), pwNs, isPulsed)
            const tVm     = computeSchwan(cellForCompute, freq, field, sigma_e, cosT)
            const tVthE   = tempCorrectedVth(cellForCompute.thresholdVoltage, schTemp, this.cellStore.effectivePulseCount)
            const tDr   = (tVm * pefT) / (tVthE * hfireMult)
            sel = hDr > NEAR_ZERO_DR ? Math.min(THRESHOLDS.TI_DISPLAY_CAP, tDr / hDr) : 0
            tVmMv = (tVm * 1000).toFixed(1)
          }
          return { preset: p, sel, tVmMv, isActive: this.cellStore.target.id === p.id, hasRes }
        })
        .sort((a, b) => b.sel - a.sel)
    },
  },

  methods: {
    selClass(sel: number): string {
      return sel >= THRESHOLDS.SEL_STRONG ? 'sel-panel__cmp--strong' : sel >= THRESHOLDS.SEL_MARGINAL ? 'sel-panel__cmp--marginal' : 'sel-panel__cmp--weak'
    },

    loadTarget(preset: typeof CELL_PRESETS[0]) {
      this.cellStore.loadPreset('target', preset)
    },

    cmpTip(row: { preset: typeof CELL_PRESETS[0]; sel: number; tVmMv: string; hasRes: boolean }): string {
      return tipCmpRow({
        label:                row.preset.label,
        notes:                row.preset.notes,
        tVmMv:                row.tVmMv,
        sel:                  row.sel,
        hasRes:               row.hasRes,
        disrLabel:            this.$t('selectivity.cmpTipDisruption'),
        selLabel:             this.$t('selectivity.cmpTipSelectivity'),
        clickHint:            this.$t('selectivity.cmpTipClickHint'),
        counterSelectiveNote: row.sel > 0 && row.sel < 1.0
          ? `<span class='tip-warn'>${this.$t('selectivity.cmpTipCounterSelective')}</span>`
          : '',
        unit:                 UNIT.MV,
      })
    },
  },
})
</script>

<style lang="scss" scoped>
.sel-panel {
  &__library { display: flex; flex-direction: column; gap: 0.4rem; }

  &__lib-title {
    font-size: var(--fs-xs);
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-text-heading);
    opacity: var(--op-strong);
    margin-bottom: 0.1rem;
  }

  &__comparison-table { display: flex; flex-direction: column; gap: 0.18rem; }

  &__cmp-row {
    display: grid;
    grid-template-columns: 3.2rem 1fr 2.8rem;
    align-items: center;
    gap: 0.4rem;
    padding: 0.1rem 0.2rem;
    border-radius: 3px;
    transition: background 0.1s;

    &--active { background: color-mix(in srgb, white 5%, transparent); }
  }

  &__cmp-name {
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--gc, var(--color-text));
  }

  &__cmp-bar-track {
    height: 4px;
    background: color-mix(in srgb, white 8%, transparent);
    border-radius: 2px;
    overflow: hidden;
  }

  &__cmp-bar {
    height: 100%;
    border-radius: 2px;
    transition: width var(--tr-slow);

    &.sel-panel__cmp--strong   { background: var(--color-lime); }
    &.sel-panel__cmp--marginal { background: var(--color-amber); }
    &.sel-panel__cmp--weak     { background: var(--color-danger); }
  }

  &__cmp-sel {
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    font-weight: 600;
    text-align: right;

    &.sel-panel__cmp--strong   { color: var(--color-lime); }
    &.sel-panel__cmp--marginal { color: var(--color-amber); }
    &.sel-panel__cmp--weak     { color: var(--color-danger); }
  }
}
</style>
