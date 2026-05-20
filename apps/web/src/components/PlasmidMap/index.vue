<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="plasmid-map" :style="sizeStyle">
    <svg
      class="plasmid-map__svg"
      viewBox="0 0 200 200"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      :aria-label="ariaLabel"
    >
      <!-- Backbone ring -->
      <circle cx="100" cy="100" r="78"
        fill="none"
        stroke="color-mix(in srgb, var(--color-text) 18%, transparent)"
        stroke-width="1"
        stroke-dasharray="2 3"
      />

      <!-- Feature arcs -->
      <g class="plasmid-map__features">
        <path
          v-for="(seg, i) in segments"
          :key="i"
          :d="seg.path"
          fill="none"
          :stroke="seg.color"
          stroke-width="13"
          stroke-linecap="butt"
        >
          <title>{{ seg.label }}</title>
        </path>
      </g>

      <!-- Center label -->
      <text x="100" y="94" text-anchor="middle" class="plasmid-map__center-name">{{ vectorName }}</text>
      <text x="100" y="112" text-anchor="middle" class="plasmid-map__center-size">{{ vectorSizeKb }} kb</text>
    </svg>

    <ul v-if="legend" class="plasmid-map__legend">
      <li v-for="(seg, i) in segments" :key="`l${i}`" class="plasmid-map__legend-item">
        <span class="plasmid-map__legend-swatch" :style="{ background: seg.color }"></span>
        <span class="plasmid-map__legend-label">{{ seg.label }}</span>
      </li>
    </ul>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'

import { PLASMID_FEATURES, type PlasmidFeature } from '@/constants/plasmidFeatures'
import type { VectorEntry } from '@/constants/vectorCatalog'

interface RenderedSegment {
  label: string
  color: string
  path:  string
}

const CENTER = { x: 100, y: 100 }
const RADIUS = 70

function polar(angleRad: number, r: number) {
  return { x: CENTER.x + r * Math.cos(angleRad), y: CENTER.y + r * Math.sin(angleRad) }
}

function arcPath(startRad: number, endRad: number, r: number): string {
  const start = polar(startRad, r)
  const end   = polar(endRad,   r)
  const large = (endRad - startRad) > Math.PI ? 1 : 0
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`
}

export default defineComponent({
  name: 'PlasmidMap',
  props: {
    vector:    { type: Object as PropType<VectorEntry>, required: true },
    size:      { type: [Number, String], default: 240 },
    ariaLabel: { type: String, default: '' },
    legend:    { type: Boolean, default: true },
  },
  computed: {
    sizeStyle(): Record<string, string> {
      const d = typeof this.size === 'number' ? `${this.size}px` : this.size
      return { width: d }
    },

    vectorName(): string {
      return this.vector.shortLabel
    },

    vectorSizeKb(): string {
      return this.vector.sizeKb.toFixed(1)
    },

    segments(): RenderedSegment[] {
      const total = PLASMID_FEATURES.reduce((sum, f) => sum + f.fraction, 0)
      const gapRad = 0.06
      let cursor = -Math.PI / 2          // start at top (12 o'clock)

      return PLASMID_FEATURES.map(feature => {
        const arcAngle = (feature.fraction / total) * (Math.PI * 2 - gapRad * PLASMID_FEATURES.length)
        const start = cursor + gapRad / 2
        const end   = start + arcAngle
        cursor = end + gapRad / 2
        return {
          label: this.labelFor(feature),
          color: feature.color,
          path:  arcPath(start, end, RADIUS),
        }
      })
    },
  },
  methods: {
    labelFor(feature: PlasmidFeature): string {
      const base = this.$t(feature.labelKey)
      if (feature.key === 'promoter')  return `${base} (${this.vector.promoter})`
      if (feature.key === 'selection') return `${base} (${this.vector.selectionMarker})`
      return base
    },
  },
})
</script>

<style lang="scss" scoped>
.plasmid-map {
  @include flex-col(0.75rem);
  align-items: stretch;

  &__svg {
    display: block;
    width: 100%;
    aspect-ratio: 1;
    overflow: hidden;
  }

  &__features path {
    transition: stroke-width var(--tr-fast);
  }

  &__center-name {
    font-family: var(--font-mono);
    font-size: 16px;
    font-weight: 700;
    fill: var(--color-text-heading);
  }

  &__center-size {
    font-family: var(--font-mono);
    font-size: 11px;
    fill: var(--color-text);
    opacity: var(--op-muted);
  }

  &__legend {
    @include flex-col(0.3rem);
    margin: 0;
    padding: 0;
    list-style: none;
  }

  &__legend-item {
    @include flex-row(0.45rem);
    align-items: center;
  }

  &__legend-swatch {
    flex-shrink: 0;
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 3px;
  }

  &__legend-label {
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    color: var(--color-text);
    opacity: var(--op-partial);
    line-height: 1.3;
    overflow-wrap: anywhere;
  }
}
</style>
