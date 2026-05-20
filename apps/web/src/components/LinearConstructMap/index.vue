<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="linear-construct">
    <div class="linear-construct__track">
      <div
        v-for="(seg, i) in segments"
        :key="i"
        class="linear-construct__segment"
        :style="{ flexBasis: `${seg.fraction * 100}%`, background: seg.color }"
      >
        <span class="linear-construct__segment-label">{{ seg.label }}</span>
      </div>
    </div>

    <div class="linear-construct__scale">
      <span class="linear-construct__scale-label">5' end</span>
      <span class="linear-construct__scale-size">{{ vector.shortLabel }} · {{ vector.sizeKb }} kb</span>
      <span class="linear-construct__scale-label">3' end</span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'

import type { VectorEntry } from '@/constants/vectorCatalog'

interface Segment {
  label:    string
  fraction: number
  color:    string
}

export default defineComponent({
  name: 'LinearConstructMap',
  props: {
    vector: { type: Object as PropType<VectorEntry>, required: true },
  },
  computed: {
    segments(): Segment[] {
      return [
        { label: `Promoter (${this.vector.promoter})`,           fraction: 0.18, color: 'color-mix(in srgb, var(--color-primary) 70%, var(--color-bg))' },
        { label: 'Gene of interest',                             fraction: 0.42, color: 'color-mix(in srgb, var(--color-ok) 70%, var(--color-bg))' },
        { label: `Selection (${this.vector.selectionMarker})`,   fraction: 0.18, color: 'color-mix(in srgb, var(--color-amber) 70%, var(--color-bg))' },
        { label: 'polyA',                                        fraction: 0.10, color: 'color-mix(in srgb, var(--color-primary) 45%, var(--color-bg))' },
        { label: 'ori',                                          fraction: 0.12, color: 'color-mix(in srgb, var(--color-text) 25%, var(--color-bg))' },
      ]
    },
  },
})
</script>

<style lang="scss" scoped>
.linear-construct {
  @include flex-col(0.5rem);
  width: 100%;

  &__track {
    display: flex;
    height: 2.5rem;
    border-radius: var(--radius);
    overflow: hidden;
    border: 1px solid color-mix(in srgb, var(--color-text) 12%, transparent);
  }

  &__segment {
    @include inline-flex-center;
    flex-grow: 0;
    flex-shrink: 0;
    color: var(--color-text);
    transition: flex-basis var(--tr-slow);
    border-right: 1px solid color-mix(in srgb, black 25%, transparent);
    overflow: hidden;
    padding: 0 0.4rem;

    &:last-child { border-right: none; }
  }

  &__segment-label {
    @include mono-upper(0.62rem);
    color: var(--color-bg);
    font-weight: 600;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }

  &__scale {
    @include flex-between(0.5rem);
    padding: 0 0.25rem;
  }

  &__scale-label {
    @include mono-upper(var(--fs-xxs));
    opacity: var(--op-muted);
  }

  &__scale-size {
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    color: var(--color-text);
    opacity: var(--op-partial);
  }
}
</style>
