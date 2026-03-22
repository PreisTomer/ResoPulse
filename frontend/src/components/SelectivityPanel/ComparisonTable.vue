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
import { useCellStore } from '@/stores/cellStore'
import { CELL_PRESETS, GROUP_COLORS } from '@/constants/cellLibrary'
import { DEFAULT_CAPSID_Q, THRESHOLDS, NEAR_ZERO_DR } from '@/constants/physics'
import { CELL_CATEGORY, CELL_GROUP } from '@/constants/strings'
import { ICON } from '@/constants/icons'
import { UNIT } from '@/constants/units'
import { computeSchwan, computeResonantDisruption, safeRatio } from '@/utils/physics'

export default defineComponent({
  setup() {
    return { store: useCellStore(), CELL_PRESETS, GROUP_COLORS, UNIT }
  },

  computed: {
    cmpTitleTip(): string {
      return `<strong>${this.presetCompTitleDynamic}</strong>\n${this.$t('selectivity.presetCompTip')}`
    },

    presetCompTitleDynamic(): string {
      const cat = this.store.targetCellCategory
      if (cat === CELL_CATEGORY.BACTERIA) return this.$t('selectivity.compAltBacteria')
      if (cat === CELL_CATEGORY.VIRUS)    return this.$t('selectivity.compAltViruses')
      return this.$t('selectivity.compAltCancer')
    },

    presetComparison() {
      const sigma_e = this.store.effectiveSigmaE
      const freq    = this.store.currentBroadcastFrequency
      const field   = this.store.fieldIntensity

      const cat = this.store.targetCellCategory
      const relevantGroup = cat === CELL_CATEGORY.MAMMALIAN ? CELL_GROUP.CANCER : cat

      const hVm = computeSchwan(this.store.healthy, freq, field, sigma_e)
      const hDr = hVm / this.store.healthy.thresholdVoltage

      return CELL_PRESETS
        .filter((p) => p.group === relevantGroup)
        .map((p) => {
          const pr = p as typeof p & { resonantFreqGHz?: number; capsidQ?: number; resonantThresholdVcm?: number }
          const hasRes = (p.group === CELL_GROUP.BACTERIA || p.group === CELL_GROUP.VIRUS) && !!pr.resonantFreqGHz && !!pr.resonantThresholdVcm
          let sel: number, tVmMv: string

          if (hasRes) {
            const ratio = computeResonantDisruption(
              pr.resonantFreqGHz!,
              pr.capsidQ ?? DEFAULT_CAPSID_Q,
              pr.resonantThresholdVcm!,
              freq * 1e3,
              field,
            )
            sel = safeRatio(ratio, hDr, THRESHOLDS.TI_DISPLAY_CAP, NEAR_ZERO_DR)
            tVmMv = `D:${(ratio * 100).toFixed(0)}%`
          } else {
            const tVm = computeSchwan(p, freq, field, sigma_e)
            const tDr = tVm / p.thresholdVoltage
            sel = hDr > NEAR_ZERO_DR ? Math.min(THRESHOLDS.TI_DISPLAY_CAP, tDr / hDr) : 0
            tVmMv = (tVm * 1000).toFixed(1)
          }
          return { preset: p, sel, tVmMv, isActive: this.store.target.id === p.id, hasRes }
        })
        .sort((a, b) => b.sel - a.sel)
    },
  },

  methods: {
    selClass(sel: number): string {
      return sel >= THRESHOLDS.SEL_STRONG ? 'sel-panel__cmp--strong' : sel >= THRESHOLDS.SEL_MARGINAL ? 'sel-panel__cmp--marginal' : 'sel-panel__cmp--weak'
    },

    loadTarget(preset: typeof CELL_PRESETS[0]) {
      this.store.loadPreset('target', preset)
    },

    cmpTip(row: { preset: typeof CELL_PRESETS[0]; sel: number; tVmMv: string; hasRes: boolean }): string {
      const selStr = row.sel >= 99 ? ICON.INFINITY : row.sel.toFixed(2)
      const disr  = this.$t('selectivity.cmpTipDisruption')
      const selLbl = this.$t('selectivity.cmpTipSelectivity')
      const hint  = this.$t('selectivity.cmpTipClickHint')
      if (row.hasRes) {
        return `<strong>${row.preset.label}</strong>\n${row.preset.notes}\n${disr} = <span class='tip-val'>${row.tVmMv}</span>  ·  ${selLbl} = <span class='tip-val'>×${selStr}</span>${hint}`
      }
      return `<strong>${row.preset.label}</strong>\n${row.preset.notes}\nVm = <span class='tip-val'>${row.tVmMv} ${UNIT.MV}</span>  ·  ${selLbl} = <span class='tip-val'>×${selStr}</span>${hint}`
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

    &--active { background: rgba(255, 255, 255, 0.05); }
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
    background: rgba(255, 255, 255, 0.08);
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
