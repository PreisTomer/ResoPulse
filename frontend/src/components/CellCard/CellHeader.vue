<template>
  <div class="cell-card__header">
    <span class="cell-card__icon">◎</span>
    <div class="cell-card__name">
      <div class="cell-card__label">{{ label }}</div>
      <div
        class="cell-card__sublabel"
        :class="{ 'cell-card__sublabel--has-tip': sublabelTip }"
        v-tip="sublabelTip || undefined"
      >{{ sublabel }}</div>
      <div v-if="hasCellData" class="cell-card__meta">
        <span class="cell-card__meta-item" v-tip="tipVm">{{ vmDisplay }}</span>
        <span class="cell-card__meta-sep">·</span>
        <span
          class="cell-card__meta-item"
          :class="{ 'cell-card__meta-temp-warn': tempWarning }"
          v-tip="tipTemp"
        >{{ tempDisplay }}</span>
        <span class="cell-card__meta-sep">·</span>
        <span class="cell-card__meta-state" :class="metaStateClass" v-tip="tipState">{{ cellState }}</span>
      </div>
      <div v-if="doubleShellEnabled && hasNuclearParams" class="cell-card__nuclear-meta">
        <span class="cell-card__nuclear-label">{{ ICON.NUCLEUS }} Nucleus Vm</span>
        <span class="cell-card__nuclear-value">{{ nuclearVmMv.toFixed(3) }} mV</span>
        <span
          class="cell-card__nuclear-ratio"
          :class="nuclearDisruptionRatio >= THRESHOLDS.DISRUPTION_WARN ? 'cell-card__nuclear-ratio--warn' : nuclearDisruptionRatio >= THRESHOLDS.HEALTHY_APPROACHING ? 'cell-card__nuclear-ratio--caution' : ''"
        >{{ (nuclearDisruptionRatio * 100).toFixed(0) }}%</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import type { PropType } from 'vue'
import type { CellState } from '@/types/cell'
import { ICON } from '@/constants/icons'
import { THRESHOLDS } from '@/constants/cellCard'

export default defineComponent({
  setup() { return { ICON, THRESHOLDS } },

  props: {
    type:               { type: String as PropType<'healthy' | 'target'>, required: true },
    label:              { type: String, required: true },
    sublabel:           { type: String, required: true },
    sublabelTip:        { type: String, default: '' },
    vmDisplay:          { type: String, required: true },
    tempDisplay:        { type: String, required: true },
    tempWarning:        { type: Boolean, required: true },
    cellState:          { type: String as PropType<CellState>, required: true },
    metaStateClass:     { type: String, required: true },
    tipVm:              { type: String, required: true },
    tipTemp:            { type: String, required: true },
    tipState:           { type: String, required: true },
    doubleShellEnabled: { type: Boolean, required: true },
    hasNuclearParams:   { type: Boolean, required: true },
    nuclearVmMv:        { type: Number, required: true },
    nuclearDisruptionRatio: { type: Number, required: true },
    hasCellData:        { type: Boolean, required: true },
  },
})
</script>
