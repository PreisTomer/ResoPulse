<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="hmap__readout" :class="{ 'hmap__readout--active': !!hoverInfo }">
    <template v-if="hoverInfo">
      <span class="hmap__readout-coord">{{ hoverInfo.freqLabel }}</span>
      <span class="hmap__readout-sep">·</span>
      <span class="hmap__readout-coord">{{ hoverInfo.fieldLabel }}</span>
      <span class="hmap__readout-zone" :style="{ color: hoverInfo.zoneColor }">{{ hoverInfo.zoneLabel }}</span>
      <span class="hmap__readout-dr">T&thinsp;<strong>{{ hoverInfo.tDr }}</strong></span>
      <span class="hmap__readout-dr">H&thinsp;<strong>{{ hoverInfo.hDr }}</strong></span>
      <span class="hmap__readout-temp">{{ hoverInfo.temp }}</span>
      <span
        v-for="o in hoverInfo.outcomes" :key="o.text"
        class="hmap__readout-outcome" :class="`hmap__readout-outcome--${o.level}`"
      >{{ o.text }}</span>
      <span class="hmap__readout-hint">{{ $t('heatmap.clickToSet') }}</span>
    </template>
    <template v-else>
      <span class="hmap__readout-idle">{{ $t('heatmap.hoverToInspect') }}</span>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import type { PropType } from 'vue'
import type { HoverInfo } from '@/types/heatmap'

export default defineComponent({
  props: {
    hoverInfo: { type: Object as PropType<HoverInfo | null>, default: null },
  },
})
</script>

<style lang="scss" scoped>
.hmap__readout {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.2rem 0.75rem;
  padding: 0.28rem 0.65rem;
  min-height: 1.75rem;
  background: rgba(0, 0, 0, 0.18);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  font-family: var(--font-mono);
  font-size: var(--fs-xxs);
  transition: border-color var(--tr-normal);

  &--active { border-color: rgba(255, 255, 255, 0.18); }

  &-coord { font-weight: 700; color: var(--color-text); }
  &-sep   { color: rgba(255, 255, 255, 0.2); }
  &-zone  { font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; }
  &-dr    { color: var(--color-text-muted); strong { color: var(--color-text); } }
  &-temp  { color: var(--color-text-muted); }
  &-hint  { margin-left: auto; color: rgba(255, 255, 255, 0.18); font-size: var(--fs-xxs); }
  &-idle  { color: rgba(255, 255, 255, 0.2); font-style: italic; }

  &-outcome {
    font-weight: 600;
    &--ok     { color: var(--color-ok); }
    &--warn   { color: var(--color-amber); }
    &--danger { color: var(--color-danger-light); }
    &--info   { color: var(--color-text-muted); }
  }
}
</style>
