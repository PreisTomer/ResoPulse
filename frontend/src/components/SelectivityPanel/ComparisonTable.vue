<template>
  <div class="sel-panel__library">
    <div
      class="sel-panel__lib-title"
      v-tip="'<strong>' + presetCompTitleDynamic + '</strong>\n' + $t('selectivity.presetCompTip')"
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
import { CELL_CATEGORY, CELL_GROUP } from '@/constants/strings'
import { ICON } from '@/constants/icons'
import { UNIT } from '@/constants/units'
import { computeSchwan, computeResonantDisruption } from '@/utils/physics'

export default defineComponent({
  setup() {
    return { store: useCellStore(), CELL_PRESETS, GROUP_COLORS, UNIT }
  },

  computed: {
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
              pr.capsidQ ?? 20,
              pr.resonantThresholdVcm!,
              freq * 1e3,
              field,
            )
            sel = hDr > 1e-9 ? Math.min(99.9, ratio / hDr) : (ratio > 0 ? 99.9 : 0)
            tVmMv = `D:${(ratio * 100).toFixed(0)}%`
          } else {
            const tVm = computeSchwan(p, freq, field, sigma_e)
            const tDr = tVm / p.thresholdVoltage
            sel = hDr > 1e-9 ? Math.min(99.9, tDr / hDr) : 0
            tVmMv = (tVm * 1000).toFixed(1)
          }
          return { preset: p, sel, tVmMv, isActive: this.store.target.id === p.id, hasRes }
        })
        .sort((a, b) => b.sel - a.sel)
    },
  },

  methods: {
    selClass(sel: number): string {
      return sel >= 1.5 ? 'sel-panel__cmp--strong' : sel >= 1.0 ? 'sel-panel__cmp--marginal' : 'sel-panel__cmp--weak'
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
