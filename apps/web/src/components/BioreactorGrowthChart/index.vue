<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <svg
    class="growth-chart"
    :viewBox="`0 0 ${W} ${H}`"
    preserveAspectRatio="xMidYMid meet"
    role="img"
    :aria-label="ariaLabel"
  >
    <!-- Gridlines -->
    <g class="growth-chart__grid">
      <line v-for="f in [0, 0.25, 0.5, 0.75, 1]" :key="f"
        :x1="PLOT_LEFT" :y1="yRow(f)" :x2="W - PLOT_RIGHT" :y2="yRow(f)"
        stroke="color-mix(in srgb, var(--color-text) 8%, transparent)" stroke-width="1" />
    </g>

    <!-- Temperature shift marker -->
    <line v-if="tempShiftDay > 0 && tempShiftDay < maxDay"
      :x1="xFor(tempShiftDay)" :y1="PLOT_TOP" :x2="xFor(tempShiftDay)" :y2="H - PLOT_BOTTOM"
      stroke="var(--color-amber)" stroke-width="1.2" stroke-dasharray="4 4" opacity="0.7" />

    <!-- VCD area + line -->
    <polyline :points="vcdPoints" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linejoin="round" />

    <!-- Titer line -->
    <polyline :points="titerPoints" fill="none" stroke="var(--color-ok)" stroke-width="2" stroke-linejoin="round" />

    <!-- Axes labels -->
    <text :x="PLOT_LEFT" :y="H - 8" class="growth-chart__axis-label">{{ $t('cloneUp.dayAxis') }}</text>
    <text :x="PLOT_LEFT - 6" :y="PLOT_TOP + 4" text-anchor="end" class="growth-chart__axis-tick growth-chart__axis-tick--vcd">{{ maxVcd.toFixed(0) }}</text>
    <text :x="W - PLOT_RIGHT + 6" :y="PLOT_TOP + 4" class="growth-chart__axis-tick growth-chart__axis-tick--titer">{{ maxTiter.toFixed(1) }}</text>

    <!-- Legend -->
    <g class="growth-chart__legend" :transform="`translate(${PLOT_LEFT + 10}, ${PLOT_TOP + 6})`">
      <circle cx="0" cy="0" r="3.5" fill="var(--color-primary)" />
      <text x="8" y="3" class="growth-chart__legend-text">{{ $t('cloneUp.vcdLegend') }}</text>
      <circle cx="0" cy="14" r="3.5" fill="var(--color-ok)" />
      <text x="8" y="17" class="growth-chart__legend-text">{{ $t('cloneUp.titerLegend') }}</text>
    </g>
  </svg>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'

import type { DayPoint } from '@/utils/bioreactor/growth'

const W = 640
const H = 320
const PLOT_LEFT = 40
const PLOT_RIGHT = 40
const PLOT_TOP = 20
const PLOT_BOTTOM = 36

export default defineComponent({
  name: 'BioreactorGrowthChart',
  props: {
    curve:        { type: Array as PropType<DayPoint[]>, default: () => [] },
    tempShiftDay: { type: Number, default: 0 },
    ariaLabel:    { type: String, default: 'Bioreactor growth curve showing viable cell density and product titer over the culture run' },
  },
  data() {
    return { W, H, PLOT_LEFT, PLOT_RIGHT, PLOT_TOP, PLOT_BOTTOM }
  },
  computed: {
    maxDay(): number {
      return Math.max(1, ...this.curve.map(p => p.day))
    },
    maxVcd(): number {
      return Math.max(1, ...this.curve.map(p => p.vcdE6)) * 1.1
    },
    maxTiter(): number {
      return Math.max(0.1, ...this.curve.map(p => p.titerGL)) * 1.1
    },
    vcdPoints(): string {
      return this.curve.map(p => `${this.xFor(p.day)},${this.yVcd(p.vcdE6)}`).join(' ')
    },
    titerPoints(): string {
      return this.curve.map(p => `${this.xFor(p.day)},${this.yTiter(p.titerGL)}`).join(' ')
    },
  },
  methods: {
    xFor(day: number): number {
      return PLOT_LEFT + (day / this.maxDay) * (W - PLOT_LEFT - PLOT_RIGHT)
    },
    yRow(frac: number): number {
      return PLOT_TOP + (1 - frac) * (H - PLOT_TOP - PLOT_BOTTOM)
    },
    yVcd(vcd: number): number {
      return PLOT_TOP + (1 - vcd / this.maxVcd) * (H - PLOT_TOP - PLOT_BOTTOM)
    },
    yTiter(titer: number): number {
      return PLOT_TOP + (1 - titer / this.maxTiter) * (H - PLOT_TOP - PLOT_BOTTOM)
    },
  },
})
</script>

<style lang="scss" scoped>
.growth-chart {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;

  polyline { transition: points 400ms ease-out; }

  &__axis-label, &__axis-tick, &__legend-text {
    font-family: var(--font-mono);
    font-size: 9px;
    fill: var(--color-text);
    opacity: var(--op-muted);
  }
  &__axis-tick--vcd { fill: var(--color-primary); opacity: var(--op-partial); }
  &__axis-tick--titer { fill: var(--color-ok); opacity: var(--op-partial); }
  &__legend-text { opacity: var(--op-partial); }
}
</style>
