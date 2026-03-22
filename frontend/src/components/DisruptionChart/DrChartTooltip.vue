<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div
    v-if="info"
    class="dr-tooltip"
    :style="{ left: info.x + 'px', top: info.y + 'px' }"
  >
    <div class="dr-tooltip__freq">{{ info.freq }}</div>
    <div class="dr-tooltip__row dr-tooltip__row--target">T: {{ info.tDR }}%</div>
    <div class="dr-tooltip__row dr-tooltip__row--healthy">H: {{ info.hDR }}%</div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export type HoverInfo = { x: number; y: number; freq: string; tDR: string; hDR: string }

export default defineComponent({
  props: {
    info: {
      type: Object as () => HoverInfo | null,
      default: null,
    },
  },
})
</script>

<style lang="scss" scoped>


.dr-tooltip {
  position: absolute;
  pointer-events: none;
  background: rgba(10, 15, 30, 0.92);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 0.3rem 0.5rem;
  font-family: var(--font-mono);
  font-size: var(--fs-xxs);
  line-height: 1.6;
  white-space: nowrap;
  z-index: 10;

  &__freq {
    color: var(--color-text-muted);
    font-size: var(--fs-xs);
    margin-bottom: 0.1rem;
  }

  &__row {
    &--target  { color: var(--color-danger); }
    &--healthy { color: var(--color-primary); }
  }
}
</style>
