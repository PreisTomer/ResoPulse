<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="host-cell-visual" :style="sizeStyle">
    <MammalianCellSvg v-if="hostSpecies === HOST_SPECIES.MAMMALIAN" :active="active" :aria-label="ariaLabel" />
    <InsectCellSvg    v-else-if="hostSpecies === HOST_SPECIES.INSECT"    :active="active" :aria-label="ariaLabel" />
    <BacterialCellSvg v-else-if="hostSpecies === HOST_SPECIES.BACTERIAL" :active="active" :aria-label="ariaLabel" />
    <YeastCellSvg     v-else-if="hostSpecies === HOST_SPECIES.YEAST"     :active="active" :aria-label="ariaLabel" />
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'

import { HOST_SPECIES, type HostSpecies } from '@/constants/cellLineCatalog'

import MammalianCellSvg from './MammalianCellSvg.vue'
import InsectCellSvg    from './InsectCellSvg.vue'
import BacterialCellSvg from './BacterialCellSvg.vue'
import YeastCellSvg     from './YeastCellSvg.vue'

export default defineComponent({
  name: 'HostCellVisual',
  components: { MammalianCellSvg, InsectCellSvg, BacterialCellSvg, YeastCellSvg },
  props: {
    hostSpecies: { type: String as PropType<HostSpecies>, required: true },
    active:      { type: Boolean, default: false },
    size:        { type: [Number, String], default: 120 },
    ariaLabel:   { type: String, default: '' },
  },
  computed: {
    HOST_SPECIES() { return HOST_SPECIES },
    sizeStyle(): Record<string, string> {
      const dim = typeof this.size === 'number' ? `${this.size}px` : this.size
      return { width: dim, height: dim }
    },
  },
})
</script>

<style lang="scss" scoped>
.host-cell-visual {
  display: inline-block;
  flex-shrink: 0;
}
</style>
