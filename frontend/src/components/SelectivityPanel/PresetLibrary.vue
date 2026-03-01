<script lang="ts">
import { defineComponent } from 'vue'
import type { PropType } from 'vue'
import { useCellStore } from '../../stores/cellStore'
import { CELL_PRESETS, GROUP_COLORS, GROUP_LABELS } from '../../constants/cellLibrary'
import type { CellGroup } from '../../constants/cellLibrary'

const TARGET_GROUPS: CellGroup[] = ['cancer', 'bacteria', 'virus']
const HEALTHY_GROUP: CellGroup = 'reference'

export default defineComponent({
  props: {
    type: {
      type: String as PropType<'target' | 'healthy'>,
      required: true,
    },
  },

  setup() {
    return { store: useCellStore(), CELL_PRESETS, GROUP_COLORS, GROUP_LABELS }
  },

  computed: {
    targetGroups(): CellGroup[] { return TARGET_GROUPS },

    presetsByGroup(): Record<CellGroup, typeof CELL_PRESETS> {
      const out: Partial<Record<CellGroup, typeof CELL_PRESETS>> = {}
      for (const g of TARGET_GROUPS) {
        out[g] = CELL_PRESETS.filter((p) => p.group === g)
      }
      return out as Record<CellGroup, typeof CELL_PRESETS>
    },

    healthyPresets() {
      return CELL_PRESETS.filter((p) => p.group === HEALTHY_GROUP)
    },

    activeTargetId(): string  { return this.store.target.id },
    activeHealthyId(): string { return this.store.healthy.id },
  },

  methods: {
    loadTarget(preset: typeof CELL_PRESETS[0]) {
      this.store.loadPreset('target', preset)
    },
    loadHealthy(preset: typeof CELL_PRESETS[0]) {
      this.store.loadPreset('healthy', preset)
    },

    presetTip(p: typeof CELL_PRESETS[0]): string {
      const pr = p as typeof p & { resonantFreqGHz?: number; capsidQ?: number; resonantThresholdVcm?: number }
      const res = pr.resonantFreqGHz
        ? `\nf_res = <span class="tip-val">${pr.resonantFreqGHz} GHz</span>  ·  Q = ${pr.capsidQ ?? 20}  ·  E_thr = ${pr.resonantThresholdVcm} V/cm`
        : ''
      return `<strong>${p.label}</strong>
${p.notes}

R = <span class="tip-val">${p.radius} µm</span>  ·  membrane = ${p.membraneThickness} nm
ε_r = ${p.dielectricConstant}  ·  σ_i = ${p.conductivity} S/m
Vm threshold = <span class="tip-val">${p.thresholdVoltage} V</span>${res}`
    },
  },
})
</script>

<template>
  <!-- Target cell library -->
  <div v-if="type === 'target'" class="sel-panel__library">
    <div
      class="sel-panel__lib-title"
      v-tip="'<strong>' + $t('selectivity.targetLibTitle') + '</strong>\n' + $t('selectivity.targetLibTip')"
    >{{ $t('selectivity.targetLibTitle') }}</div>
    <div v-for="grp in targetGroups" :key="grp" class="sel-panel__lib-group" :style="{ '--pill-c': GROUP_COLORS[grp] }">
      <span class="sel-panel__lib-group-label">{{ GROUP_LABELS[grp] }}</span>
      <div class="sel-panel__lib-pills">
        <button
          v-for="p in presetsByGroup[grp]"
          :key="p.presetId"
          class="sel-panel__preset-pill"
          :class="{ 'sel-panel__preset-pill--active': activeTargetId === p.id }"
          v-tip="presetTip(p)"
          @click="loadTarget(p)"
        >{{ p.shortLabel }}</button>
      </div>
    </div>
  </div>

  <!-- Healthy baseline library -->
  <div v-else class="sel-panel__library">
    <div
      class="sel-panel__lib-title"
      v-tip="'<strong>' + $t('selectivity.healthyLibTitle') + '</strong>\n' + $t('selectivity.healthyLibTip')"
    >{{ $t('selectivity.healthyLibTitle') }}</div>
    <div class="sel-panel__lib-pills" :style="{ '--pill-c': GROUP_COLORS.reference }">
      <button
        v-for="p in healthyPresets"
        :key="p.presetId"
        class="sel-panel__preset-pill"
        :class="{ 'sel-panel__preset-pill--active': activeHealthyId === p.id }"
        v-tip="presetTip(p)"
        @click="loadHealthy(p)"
      >{{ p.shortLabel }}</button>
    </div>
  </div>
</template>
