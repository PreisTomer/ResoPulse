<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <svg
    class="dev-radar"
    viewBox="-56 -18 352 280"
    preserveAspectRatio="xMidYMid meet"
    role="img"
    aria-label="Developability score radar chart across productivity, stability, scalability, and regulatory acceptance"
  >
    <!-- Concentric grid rings -->
    <g class="dev-radar__rings" fill="none" stroke="color-mix(in srgb, var(--color-text) 12%, transparent)" stroke-width="0.8">
      <polygon v-for="ring in rings" :key="ring.r" :points="ringPoints(ring.r)" />
    </g>

    <!-- Axis spokes -->
    <g class="dev-radar__spokes" stroke="color-mix(in srgb, var(--color-text) 20%, transparent)" stroke-width="0.8">
      <line v-for="(axis, i) in axisInfo" :key="`s${i}`"
        :x1="center.x" :y1="center.y"
        :x2="axis.tip.x" :y2="axis.tip.y"
      />
    </g>

    <!-- Score polygon -->
    <polygon
      class="dev-radar__data"
      :points="dataPoints"
      :style="{ '--fill-opacity': dataFillOpacity }"
    />

    <!-- Score dots at each vertex -->
    <g class="dev-radar__dots">
      <circle v-for="(p, i) in dataVertices" :key="`d${i}`"
        :cx="p.x" :cy="p.y" r="3.5"
        fill="var(--color-primary)"
      />
    </g>

    <!-- Axis labels -->
    <g class="dev-radar__labels">
      <text v-for="(axis, i) in axisInfo" :key="`l${i}`"
        :x="axis.labelPos.x" :y="axis.labelPos.y"
        :text-anchor="axis.anchor"
        dominant-baseline="middle"
        class="dev-radar__axis-label"
      >{{ axis.label }}</text>
      <text v-for="(axis, i) in axisInfo" :key="`v${i}`"
        :x="axis.valuePos.x" :y="axis.valuePos.y"
        :text-anchor="axis.anchor"
        dominant-baseline="middle"
        class="dev-radar__axis-value"
      >{{ axis.valueLabel }}</text>
    </g>
  </svg>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'

const CENTER = { x: 120, y: 120 }
const RING_R = 95

interface RadarAxis {
  label:    string
  value:    number      // 0-1
}

interface RenderedAxis {
  label:     string
  tip:       { x: number; y: number }
  labelPos:  { x: number; y: number }
  valuePos:  { x: number; y: number }
  valueLabel:string
  anchor:    'start' | 'middle' | 'end'
}

function polar(angleRad: number, r: number) {
  return { x: CENTER.x + r * Math.cos(angleRad), y: CENTER.y + r * Math.sin(angleRad) }
}

function anchorFor(angleRad: number): 'start' | 'middle' | 'end' {
  const cos = Math.cos(angleRad)
  if (cos > 0.2)  return 'start'
  if (cos < -0.2) return 'end'
  return 'middle'
}

export default defineComponent({
  name: 'DevelopabilityRadarChart',
  props: {
    axes: { type: Array as PropType<RadarAxis[]>, required: true },
  },
  computed: {
    center() { return CENTER },

    rings(): { r: number }[] {
      return [
        { r: RING_R * 0.25 },
        { r: RING_R * 0.50 },
        { r: RING_R * 0.75 },
        { r: RING_R },
      ]
    },

    axisInfo(): RenderedAxis[] {
      const n = this.axes.length
      const startAngle = -Math.PI / 2
      return this.axes.map((axis, i) => {
        const angle = startAngle + (i / n) * Math.PI * 2
        const anchor = anchorFor(angle)
        const tip      = polar(angle, RING_R)
        const labelPos = polar(angle, RING_R + 16)
        // Left/right labels sit on the centre line; stack the value below instead of
        // further along the spoke, where it would overlap the label.
        const valuePos = anchor === 'middle'
          ? polar(angle, RING_R + 32)
          : { x: labelPos.x, y: labelPos.y + 13 }
        return {
          label:      axis.label,
          tip,
          labelPos,
          valuePos,
          valueLabel: `${Math.round(axis.value * 100)}%`,
          anchor,
        }
      })
    },

    dataVertices(): { x: number; y: number }[] {
      const n = this.axes.length
      const startAngle = -Math.PI / 2
      return this.axes.map((axis, i) => {
        const angle = startAngle + (i / n) * Math.PI * 2
        return polar(angle, RING_R * Math.max(0.02, axis.value))
      })
    },

    dataPoints(): string {
      return this.dataVertices.map(p => `${p.x},${p.y}`).join(' ')
    },

    dataFillOpacity(): number {
      const avg = this.axes.reduce((s, a) => s + a.value, 0) / Math.max(this.axes.length, 1)
      return 0.15 + avg * 0.25
    },
  },
  methods: {
    ringPoints(r: number): string {
      const n = this.axes.length
      const startAngle = -Math.PI / 2
      const pts: string[] = []
      for (let i = 0; i < n; i++) {
        const angle = startAngle + (i / n) * Math.PI * 2
        const p = polar(angle, r)
        pts.push(`${p.x},${p.y}`)
      }
      return pts.join(' ')
    },
  },
})
</script>

<style lang="scss" scoped>
.dev-radar {
  display: block;
  width: 100%;
  height: auto;
  max-width: 340px;
  overflow: visible;

  &__data {
    fill: color-mix(in srgb, var(--color-primary) calc(var(--fill-opacity, 0.25) * 100%), transparent);
    stroke: var(--color-primary);
    stroke-width: 1.5;
    stroke-linejoin: round;
    transition: all 400ms ease-out;
  }

  &__dots circle {
    transition: cx 400ms ease-out, cy 400ms ease-out;
  }

  &__axis-label {
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 600;
    fill: var(--color-text);
    opacity: var(--op-strong);
  }

  &__axis-value {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
    fill: var(--color-primary);
  }
}
</style>
