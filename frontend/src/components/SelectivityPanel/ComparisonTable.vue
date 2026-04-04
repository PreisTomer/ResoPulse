<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
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

import { computeSchwan, computeResonantDisruption, safeRatio, computeTau, computePulseStepResponse, tempCorrectedVth } from '@/utils/physics'
import { tipCmpTitle, tipCmpRow } from '@/tooltips/selectivityTooltips'

import { CELL_PRESETS, GROUP_COLORS } from '@/constants/cellLibrary'
import { DEFAULT_CAPSID_Q, THRESHOLDS, NEAR_ZERO_DR, H_FIRE_THRESHOLD_MULTIPLIER, BODY_TEMP_C, MIN_PULSE_ENVELOPE } from '@/constants/physics'
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

    presetCompTitleDynamic(): string {
      const cat = this.cellStore.targetCellCategory
      if (cat === CELL_CATEGORY.BACTERIA) return this.$t('selectivity.compAltBacteria')
      if (cat === CELL_CATEGORY.VIRUS)    return this.$t('selectivity.compAltViruses')
      return this.$t('selectivity.compAltCancer')
    },

    presetComparison() {
      const sigma_e   = this.cellStore.effectiveSigmaE
      const cosT      = this.cellStore.cosThetaFactor
      const freq      = this.cellStore.currentBroadcastFrequency
      const field     = this.cellStore.fieldIntensity
      const pwNs      = this.cellStore.pulseWidthNs
      const isPulsed  = this.cellStore.waveform === WAVEFORM.PULSED || this.cellStore.waveform === WAVEFORM.H_FIRE
      const hfireMult = this.cellStore.waveform === WAVEFORM.H_FIRE ? H_FIRE_THRESHOLD_MULTIPLIER : 1.0

      const cat = this.cellStore.targetCellCategory
      const relevantGroup = cat === CELL_CATEGORY.MAMMALIAN ? CELL_GROUP.CANCER : cat

      // PEF for the healthy reference cell (frequency-independent, computed once).
      // Use healthyTemp for threshold correction — healthy cell is the live simulated reference.
      const pefH  = isPulsed ? Math.max(MIN_PULSE_ENVELOPE, computePulseStepResponse(computeTau(this.cellStore.healthy, sigma_e), pwNs)) : 1.0
      const hVm   = computeSchwan(this.cellStore.healthy, freq, field, sigma_e, cosT)
      const hVthE = tempCorrectedVth(this.cellStore.healthy.thresholdVoltage, this.cellStore.healthyTemp)
      const hDr   = (hVm * pefH) / (hVthE * hfireMult)

      return CELL_PRESETS
        .filter((p) => p.group === relevantGroup)
        .map((p) => {
          const pr = p as typeof p & { resonantFreqGHz?: number; capsidQ?: number; resonantThresholdVcm?: number }
          const hasRes = (p.group === CELL_GROUP.BACTERIA || p.group === CELL_GROUP.VIRUS) && !!pr.resonantFreqGHz && !!pr.resonantThresholdVcm && this.cellStore.isResonanceMode
          let sel: number, tVmMv: string

          if (hasRes) {
            // Resonance targets: acoustic capsid disruption — hfireMult does NOT apply.
            // H-FIRE charge cancellation is an EP membrane-charging mechanism, not acoustic.
            // Active preset uses live targetTemp; others use BODY_TEMP_C (not live-simulated).
            const resTemp      = p.presetId === this.cellStore.target.id ? this.cellStore.targetTemp : BODY_TEMP_C
            const effThreshold = tempCorrectedVth(pr.resonantThresholdVcm!, resTemp)
            const ratio = computeResonantDisruption(
              pr.resonantFreqGHz!,
              pr.capsidQ ?? DEFAULT_CAPSID_Q,
              effThreshold,
              freq * 1e3,
              field,
            )
            sel = safeRatio(ratio, hDr, THRESHOLDS.TI_DISPLAY_CAP, NEAR_ZERO_DR)
            tVmMv = `D:${(ratio * 100).toFixed(0)}%`
          } else {
            // Active preset uses live targetTemp; others use BODY_TEMP_C (not live-simulated).
            const schTemp = p.presetId === this.cellStore.target.id ? this.cellStore.targetTemp : BODY_TEMP_C
            const pefT    = isPulsed ? Math.max(MIN_PULSE_ENVELOPE, computePulseStepResponse(computeTau(p, sigma_e), pwNs)) : 1.0
            const tVm     = computeSchwan(p, freq, field, sigma_e, cosT)
            const tVthE   = tempCorrectedVth(p.thresholdVoltage, schTemp)
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
