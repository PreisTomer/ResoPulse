<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
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
    <span
      v-if="store.chartMode !== 'resonance'"
      class="freq-chart__legend-item"
      v-tip="$t('chart.tipDepH')"
    ><span class="freq-chart__legend-line freq-chart__legend-line--dep-h"></span> {{ $t('chart.legendDepH') }}</span>
    <span
      v-if="store.chartMode !== 'resonance'"
      class="freq-chart__legend-item"
      v-tip="$t('chart.tipDepT')"
    ><span class="freq-chart__legend-line freq-chart__legend-line--dep-t"></span> {{ $t('chart.legendDepT') }}</span>
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

<style lang="scss" scoped>
@use '../../styles/mixins' as *;

.freq-chart {
  &__legend {
    @include flex-row(0.75rem);
    flex-wrap: wrap;
  }

  &__legend-item {
    @include flex-row(0.3rem);
    font-size: 0.62rem;
    font-family: var(--font-mono);
    color: var(--color-text);
    white-space: nowrap;
  }

  &__legend-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    opacity: 0.75;
    flex-shrink: 0;
  }

  &__legend-line {
    width: 14px; height: 2px;
    border-radius: 1px;
    flex-shrink: 0;

    &--h   { background: var(--color-primary); box-shadow: 0 0 4px var(--color-primary); }
    &--t   { background: var(--color-danger);  box-shadow: 0 0 4px var(--color-danger); }
    &--sel { width: 18px; height: 0; border-top: 2px dashed #fbbf24; background: transparent; opacity: 0.8; }
    &--nuc-h { width: 18px; height: 0; border-top: 2px dashed rgba(0, 212, 255, 0.55); background: transparent; }
    &--nuc-t { width: 18px; height: 0; border-top: 2px dashed rgba(255, 77, 109, 0.55); background: transparent; }
    &--dep-h { width: 18px; height: 0; border-top: 2px dotted rgba(0, 212, 255, 0.50); background: transparent; }
    &--dep-t { width: 18px; height: 0; border-top: 2px dotted rgba(255, 77, 109, 0.50); background: transparent; }
  }
}
</style>
