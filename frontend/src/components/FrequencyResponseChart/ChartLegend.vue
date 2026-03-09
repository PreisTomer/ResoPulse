<template>
  <div class="freq-chart__legend">
    <span
      v-for="g in groups"
      :key="g"
      class="freq-chart__legend-item"
      v-tip="groupTip(g)"
    >
      <span class="freq-chart__legend-dot" :style="{ background: `var(--group-${g})` }"></span>
      {{ groupLabel(g) }}
    </span>
    <span
      class="freq-chart__legend-item"
      v-tip="$t('chart.tipActiveH')"
    ><span class="freq-chart__legend-line freq-chart__legend-line--h"></span> {{ $t('chart.activeH') }}</span>
    <span
      class="freq-chart__legend-item"
      v-tip="$t('chart.tipActiveT')"
    ><span class="freq-chart__legend-line freq-chart__legend-line--t"></span> {{ $t('chart.activeT') }}</span>
    <span
      class="freq-chart__legend-item"
      v-tip="$t('chart.tipVmRatio')"
    ><span class="freq-chart__legend-line freq-chart__legend-line--sel"></span> {{ $t('chart.legendVmRatio') }}</span>
    <span
      v-if="store.doubleShellEnabled"
      class="freq-chart__legend-item"
      v-tip="$t('chart.tipNucH')"
    ><span class="freq-chart__legend-line freq-chart__legend-line--nuc-h"></span> {{ $t('chart.legendNucH') }}</span>
    <span
      v-if="store.doubleShellEnabled"
      class="freq-chart__legend-item"
      v-tip="$t('chart.tipNucT')"
    ><span class="freq-chart__legend-line freq-chart__legend-line--nuc-t"></span> {{ $t('chart.legendNucT') }}</span>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useCellStore } from '@/stores/cellStore'
import { GROUP_COLORS } from '@/constants/cellLibrary'
import type { CellGroup } from '@/constants/cellLibrary'

const GROUP_TIP_KEYS: Record<CellGroup, string> = {
  reference: 'chart.tipReference',
  cancer:    'chart.tipCancer',
  bacteria:  'chart.tipBacteria',
  virus:     'chart.tipVirus',
}

const GROUP_LABEL_KEYS: Record<CellGroup, string> = {
  reference: 'chart.legendRef',
  cancer:    'chart.legendCancer',
  bacteria:  'chart.legendBacteria',
  virus:     'chart.legendVirus',
}

export default defineComponent({
  setup() {
    return { store: useCellStore(), GROUP_COLORS }
  },

  computed: {
    groups(): CellGroup[] {
      return ['reference', 'cancer', 'bacteria', 'virus']
    },
  },

  methods: {
    groupTip(g: CellGroup): string  { return this.$t(GROUP_TIP_KEYS[g]) },
    groupLabel(g: CellGroup): string { return this.$t(GROUP_LABEL_KEYS[g]) },
  },
})
</script>
