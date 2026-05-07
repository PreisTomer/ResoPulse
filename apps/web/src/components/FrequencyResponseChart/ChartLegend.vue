<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
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
      v-if="!cellStore.isResonanceMode"
      class="freq-chart__legend-item"
      v-tip="$t('chart.tipSigmaBand')"
    ><span class="freq-chart__legend-swatch"></span> {{ $t('chart.legendSigmaBand') }}</span>
    <span
      class="freq-chart__legend-item"
      v-tip="$t('chart.tipVmRatio')"
    ><span class="freq-chart__legend-line freq-chart__legend-line--sel"></span> {{ $t('chart.legendVmRatio') }}</span>
    <span
      v-if="cellStore.doubleShellEnabled"
      class="freq-chart__legend-item"
      v-tip="$t('chart.tipNucH')"
    ><span class="freq-chart__legend-line freq-chart__legend-line--nuc-h"></span> {{ $t('chart.legendNucH') }}</span>
    <span
      v-if="cellStore.doubleShellEnabled"
      class="freq-chart__legend-item"
      v-tip="$t('chart.tipNucT')"
    ><span class="freq-chart__legend-line freq-chart__legend-line--nuc-t"></span> {{ $t('chart.legendNucT') }}</span>
    <span
      v-if="!cellStore.isResonanceMode"
      class="freq-chart__legend-item"
      v-tip="$t('chart.tipDepH')"
    ><span class="freq-chart__legend-line freq-chart__legend-line--dep-h"></span> {{ $t('chart.legendDepH') }}</span>
    <span
      v-if="!cellStore.isResonanceMode"
      class="freq-chart__legend-item"
      v-tip="$t('chart.tipDepT')"
    ><span class="freq-chart__legend-line freq-chart__legend-line--dep-t"></span> {{ $t('chart.legendDepT') }}</span>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'

import { useCellStore } from '@/stores/cellStore'

import { GROUP_COLORS } from '@/constants/cellLibrary'
import type { CellGroup } from '@/constants/cellLibrary'
const GROUP_TIP_KEYS: Record<CellGroup, string> = {
  reference: 'chart.tipReference',
  cancer:    'chart.tipCancer',
  bacteria:  'chart.tipBacteria',
  virus:     'chart.tipVirus',
  stem:      'chart.tipStem',
}

const GROUP_LABEL_KEYS: Record<CellGroup, string> = {
  reference: 'chart.legendRef',
  cancer:    'chart.legendCancer',
  bacteria:  'chart.legendBacteria',
  virus:     'chart.legendVirus',
  stem:      'chart.legendStem',
}

export default defineComponent({
  computed: {
    ...mapStores(useCellStore),
    GROUP_COLORS() { return GROUP_COLORS },

    groups(): CellGroup[] {
      return ['reference', 'cancer', 'bacteria', 'virus', 'stem']
    },
  },

  methods: {
    groupTip(g: CellGroup): string  { return this.$t(GROUP_TIP_KEYS[g]) },
    groupLabel(g: CellGroup): string { return this.$t(GROUP_LABEL_KEYS[g]) },
  },
})
</script>

<style lang="scss" scoped>


.freq-chart {
  &__legend {
    @include flex-row(0.75rem);
    flex-wrap: wrap;
  }

  &__legend-item {
    @include flex-row(0.3rem);
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    color: var(--color-text);
    white-space: nowrap;
  }

  &__legend-dot {
    width: 7px; height: 7px;
    border-radius: 50%;
    opacity: 0.75; // intentional between-tier value
    flex-shrink: 0;
  }

  &__legend-swatch {
    width: 14px; height: 8px;
    border-radius: 2px;
    flex-shrink: 0;
    background: linear-gradient(
      to right,
      color-mix(in srgb, var(--color-primary) 30%, transparent) 0%,
      color-mix(in srgb, var(--color-primary) 30%, transparent) 50%,
      color-mix(in srgb, var(--color-danger) 30%, transparent) 50%,
      color-mix(in srgb, var(--color-danger) 30%, transparent) 100%
    );
  }

  &__legend-line {
    width: 14px; height: 2px;
    border-radius: 1px;
    flex-shrink: 0;

    &--h   { background: var(--color-primary); box-shadow: 0 0 4px var(--color-primary); }
    &--t   { background: var(--color-danger);  box-shadow: 0 0 4px var(--color-danger); }
    &--sel { width: 18px; height: 0; border-top: 2px dashed var(--color-amber); background: transparent; opacity: var(--op-partial); }
    &--nuc-h { width: 18px; height: 0; border-top: 2px dashed color-mix(in srgb, var(--color-primary) 55%, transparent); background: transparent; }
    &--nuc-t { width: 18px; height: 0; border-top: 2px dashed color-mix(in srgb, var(--color-danger) 55%, transparent); background: transparent; }
    &--dep-h { width: 18px; height: 0; border-top: 2px dotted color-mix(in srgb, var(--color-primary) 50%, transparent); background: transparent; }
    &--dep-t { width: 18px; height: 0; border-top: 2px dotted color-mix(in srgb, var(--color-danger) 50%, transparent); background: transparent; }
  }
}
</style>
