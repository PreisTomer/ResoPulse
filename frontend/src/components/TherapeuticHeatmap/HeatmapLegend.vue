<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="hmap__legend" v-tip="$t('heatmap.tipCanvas')">
    <div v-for="(color, zone) in ZONE_COLORS" :key="zone" class="hmap__legend-item">
      <span class="hmap__legend-dot" :style="{ background: color }"></span>
      <span class="hmap__legend-label">{{ $t(`heatmap.zone${ZONE_KEY[zone]}`) }}</span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { HMAP_ZONE_COLOR, HMAP_ZONE_KEY } from '@/constants/heatmap'

const ZONE_COLORS = HMAP_ZONE_COLOR as Record<number, string>
const ZONE_KEY    = HMAP_ZONE_KEY    as Record<number, string>

export default defineComponent({
  setup() {
    return { ZONE_COLORS, ZONE_KEY }
  },
})
</script>

<style lang="scss" scoped>
.hmap__legend {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem 1rem;
  padding: 0;
}

.hmap__legend-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.hmap__legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;
}

.hmap__legend-label {
  font-size: 0.64rem;
  font-family: var(--font-mono);
  color: var(--color-text-muted);
  white-space: nowrap;
}
</style>
