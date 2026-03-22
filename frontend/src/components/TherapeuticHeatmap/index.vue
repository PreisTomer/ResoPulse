<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="hmap" v-if="store.targetCellCategory === CELL_CATEGORY.MAMMALIAN">
    <AccordionPanel
      :icon="ICON.WAVE"
      :title="$t('heatmap.title')"
      :subtitle="$t('heatmap.subtitle')"
      :initial-open="false"
      :border-on-toggle="true"
      @open-change="onAccordionChange"
    >
      <div class="hmap__body">

        <HeatmapCanvas
          :open="open"
          @hover-info-change="hoverInfo = $event"
          @op-zone-change="opZoneColor = $event"
        />

        <HeatmapReadout :hover-info="hoverInfo" />

        <HeatmapLegend />

        <HeatmapStats :op-zone-color="opZoneColor" />

      </div>
    </AccordionPanel>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useCellStore } from '@/stores/cellStore'
import { CELL_CATEGORY } from '@/constants/strings'
import { ICON } from '@/constants/icons'
import type { HoverInfo } from '@/types/heatmap'
import AccordionPanel  from '@/components/AccordionPanel.vue'
import HeatmapCanvas   from './HeatmapCanvas.vue'
import HeatmapReadout  from './HeatmapReadout.vue'
import HeatmapLegend   from './HeatmapLegend.vue'
import HeatmapStats    from './HeatmapStats.vue'

export default defineComponent({
  name: 'TherapeuticHeatmap',
  components: { AccordionPanel, HeatmapCanvas, HeatmapReadout, HeatmapLegend, HeatmapStats },

  setup() {
    return { store: useCellStore(), CELL_CATEGORY, ICON }
  },

  data() {
    return {
      open:        false,
      hoverInfo:   null as HoverInfo | null,
      opZoneColor: 'var(--color-text)',
    }
  },

  methods: {
    onAccordionChange(v: boolean) { this.open = v },
  },
})
</script>

<style lang="scss" scoped>


.hmap {
  @include surface-card(var(--radius));
  overflow: hidden;

  &__body {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 0 0.75rem 0.75rem;
  }
}
</style>
