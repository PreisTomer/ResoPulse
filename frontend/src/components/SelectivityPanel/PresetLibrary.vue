<template>
  <!-- Target cell library -->
  <div v-if="type === CELL_TYPE.TARGET" class="sel-panel__library">
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
    <div class="sel-panel__lib-pills" :style="{ '--pill-c': GROUP_COLORS[CELL_GROUP.REFERENCE] }">
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

<script lang="ts">
import { defineComponent } from 'vue'
import type { PropType } from 'vue'
import { useCellStore } from '@/stores/cellStore'
import { CELL_PRESETS, GROUP_COLORS, GROUP_LABELS } from '@/constants/cellLibrary'
import type { CellGroup } from '@/constants/cellLibrary'
import { CELL_TYPE, CELL_GROUP } from '@/constants/strings'
import { UNIT } from '@/constants/units'
import { DEFAULT_CAPSID_Q } from '@/constants/cellCard'

const TARGET_GROUPS: CellGroup[] = [CELL_GROUP.CANCER, CELL_GROUP.BACTERIA, CELL_GROUP.VIRUS] as CellGroup[]
const HEALTHY_GROUP: CellGroup = CELL_GROUP.REFERENCE as CellGroup

export default defineComponent({
  props: {
    type: {
      type: String as PropType<'target' | 'healthy'>,
      required: true,
    },
  },

  setup() {
    return { store: useCellStore(), CELL_PRESETS, GROUP_COLORS, GROUP_LABELS, CELL_TYPE, CELL_GROUP, UNIT }
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
      const R   = this.$t('selectivity.presetTipRadius')
      const mem = this.$t('selectivity.presetTipMembrane')
      const thr = this.$t('selectivity.presetTipVmThr')
      const res = pr.resonantFreqGHz
        ? `\nf_res = <span class="tip-val">${pr.resonantFreqGHz} ${UNIT.GHZ}</span>  ·  Q = ${pr.capsidQ ?? DEFAULT_CAPSID_Q}  ·  E_thr = ${pr.resonantThresholdVcm} ${UNIT.V_PER_CM}`
        : ''
      return `<strong>${p.label}</strong>\n${p.notes}\n\n${R} = <span class="tip-val">${p.radius} ${UNIT.UM}</span>  ·  ${mem} = ${p.membraneThickness} ${UNIT.NM}\nε_r = ${p.dielectricConstant}  ·  σ_i = ${p.conductivity} ${UNIT.S_PER_M}\n${thr} = <span class="tip-val">${p.thresholdVoltage} ${UNIT.V}</span>${res}`
    },
  },
})
</script>

<style lang="scss" scoped>
.sel-panel {
  &__library { display: flex; flex-direction: column; gap: 0.4rem; }

  &__lib-title {
    font-size: 0.6rem;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-text-heading);
    opacity: 0.9;
    margin-bottom: 0.1rem;
  }

  &__lib-group { display: flex; flex-direction: column; gap: 0.25rem; margin-bottom: 0.25rem; }

  &__lib-group-label {
    font-size: 0.55rem;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    opacity: 0.9;
    color: var(--pill-c, var(--color-text-muted));
  }

  &__lib-pills { display: flex; flex-wrap: wrap; gap: 0.3rem; }

  &__preset-pill {
    font-size: 0.58rem;
    font-family: var(--font-mono);
    padding: 0.18rem 0.5rem;
    border: 1px solid var(--color-border);
    border-radius: 10px;
    background: transparent;
    color: var(--color-text);
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s, background-color 0.15s;
    white-space: nowrap;

    &:hover { border-color: var(--color-primary); color: var(--color-primary); }

    &--active {
      background-color: rgba(255, 255, 255, 0.05);
      border-color: var(--pill-c, var(--color-primary));
      color: var(--pill-c, var(--color-primary));
    }
  }
}
</style>
