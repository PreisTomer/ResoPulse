<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="waterfall">
    <svg
      class="waterfall__svg"
      :viewBox="`0 0 ${W} ${H}`"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      :aria-label="ariaLabel"
      @mouseleave="hoverIndex = null"
    >
      <!-- Y-axis gridlines + labels -->
      <g class="waterfall__grid">
        <g v-for="tick in yTicks" :key="`y${tick}`">
          <line :x1="PLOT_LEFT" :y1="yFor(tick)" :x2="W - PLOT_RIGHT" :y2="yFor(tick)"
            stroke="color-mix(in srgb, var(--color-text) 8%, transparent)" stroke-width="1" />
          <text :x="PLOT_LEFT - 8" :y="yFor(tick) + 3" text-anchor="end" class="waterfall__y-label">{{ tick }}%</text>
        </g>
      </g>

      <!-- Target yield line -->
      <g v-if="targetYieldPct > 0" class="waterfall__target">
        <line :x1="PLOT_LEFT" :y1="yFor(targetYieldPct)" :x2="W - PLOT_RIGHT" :y2="yFor(targetYieldPct)"
          stroke="var(--color-primary)" stroke-width="1.2" stroke-dasharray="5 4" opacity="0.7" />
        <text :x="W - PLOT_RIGHT + 4" :y="yFor(targetYieldPct) + 3" class="waterfall__target-label">{{ $t('downstream.chart.target') }} {{ targetYieldPct }}%</text>
      </g>

      <!-- Empty state -->
      <text v-if="bars.length === 0" :x="W / 2" :y="H / 2" text-anchor="middle" class="waterfall__empty-label">
        {{ $t('downstream.chart.emptyState') }}
      </text>

      <!-- Cascade bars + trajectory -->
      <template v-else>
        <!-- Trajectory line connecting cumulative yield points -->
        <polyline :points="trajectoryPoints" fill="none" stroke="var(--color-primary)" stroke-width="2" stroke-linejoin="round" opacity="0.85" />

        <!-- Step columns -->
        <g v-for="(bar, i) in bars" :key="bar.instanceId"
          class="waterfall__col"
          :class="{ 'waterfall__col--hover': hoverIndex === i }"
          @mouseenter="hoverIndex = i"
        >
          <!-- Loss segment (hatched, from cumBefore down to cumAfter) -->
          <rect
            :x="bar.x" :y="bar.lossTop" :width="COL_W" :height="bar.lossHeight"
            :fill="`color-mix(in srgb, var(--color-danger) 18%, transparent)`"
            stroke="color-mix(in srgb, var(--color-danger) 45%, transparent)"
            stroke-width="0.8"
            rx="2"
          />
          <!-- Retained segment (solid, from cumAfter down to baseline) -->
          <rect
            :x="bar.x" :y="bar.retainedTop" :width="COL_W" :height="bar.retainedHeight"
            :fill="bar.color"
            rx="2"
          />
          <!-- Cumulative-yield dot -->
          <circle :cx="bar.x + COL_W / 2" :cy="bar.retainedTop" r="3.5" fill="var(--color-primary)" />
          <!-- Step yield % label on the retained block -->
          <text :x="bar.x + COL_W / 2" :y="bar.retainedTop + 16" text-anchor="middle" class="waterfall__bar-pct">{{ Math.round(bar.yieldPct) }}%</text>
          <!-- Step name (rotated under axis) -->
          <text :x="bar.x + COL_W / 2" :y="H - PLOT_BOTTOM + 14" text-anchor="end"
            class="waterfall__x-label"
            :transform="`rotate(-35 ${bar.x + COL_W / 2} ${H - PLOT_BOTTOM + 14})`"
          >{{ bar.label }}</text>
        </g>
      </template>
    </svg>

    <!-- Hover tooltip -->
    <div v-if="hoveredBar" class="waterfall__tooltip">
      <span class="waterfall__tooltip-name">{{ hoveredBar.label }}</span>
      <div class="waterfall__tooltip-row">
        <span>{{ $t('downstream.chart.stepYield') }}</span>
        <strong>{{ hoveredBar.yieldPct.toFixed(1) }}%</strong>
      </div>
      <div class="waterfall__tooltip-row">
        <span>{{ $t('downstream.chart.range') }}</span>
        <span>{{ hoveredBar.uncLow }}–{{ hoveredBar.uncHigh }}%</span>
      </div>
      <div class="waterfall__tooltip-row">
        <span>{{ $t('downstream.chart.cumulative') }}</span>
        <strong>{{ hoveredBar.cumulative.toFixed(1) }}%</strong>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'

import { getStepById } from '@/constants/processStepCatalog'

import type { StepYieldResult } from '@/types/downstream'

const W = 720
const H = 360
const PLOT_LEFT = 44
const PLOT_RIGHT = 70
const PLOT_TOP = 20
const PLOT_BOTTOM = 70
const COL_GAP = 14

interface Bar {
  instanceId:     string
  label:          string
  x:              number
  lossTop:        number
  lossHeight:     number
  retainedTop:    number
  retainedHeight: number
  color:          string
  yieldPct:       number
  cumulative:     number
  uncLow:         number
  uncHigh:        number
}

function colorForYield(pct: number): string {
  if (pct >= 90) return 'color-mix(in srgb, var(--color-ok) 55%, transparent)'
  if (pct >= 75) return 'color-mix(in srgb, var(--color-primary) 55%, transparent)'
  return 'color-mix(in srgb, var(--color-amber) 60%, transparent)'
}

export default defineComponent({
  name: 'YieldWaterfallChart',
  props: {
    steps:          { type: Array as PropType<StepYieldResult[]>, default: () => [] },
    targetYieldPct: { type: Number, default: 0 },
    ariaLabel:      { type: String, default: 'Downstream yield waterfall chart showing cumulative recovery at each process step' },
  },
  data() {
    return {
      hoverIndex: null as number | null,
      W, H, PLOT_LEFT, PLOT_RIGHT, PLOT_BOTTOM,
    }
  },
  computed: {
    plotHeight(): number {
      return H - PLOT_TOP - PLOT_BOTTOM
    },
    colWidth(): number {
      const n = Math.max(1, this.steps.length)
      const avail = W - PLOT_LEFT - PLOT_RIGHT
      return avail / n
    },
    COL_W(): number {
      return Math.max(8, this.colWidth - COL_GAP)
    },
    yTicks(): number[] {
      return [0, 25, 50, 75, 100]
    },
    bars(): Bar[] {
      return this.steps.map((s, i) => {
        const cumBefore = i === 0 ? 100 : (this.steps[i - 1]?.cumulativeYieldPct ?? 100)
        const cumAfter  = s.cumulativeYieldPct
        const x = PLOT_LEFT + i * this.colWidth + COL_GAP / 2
        const lossTop = this.yFor(cumBefore)
        const retainedTop = this.yFor(cumAfter)
        const entry = getStepById(s.stepType)
        return {
          instanceId:     s.instanceId,
          label:          entry?.shortLabel ?? s.stepType,
          x,
          lossTop,
          lossHeight:     Math.max(0, retainedTop - lossTop),
          retainedTop,
          retainedHeight: Math.max(0, this.yFor(0) - retainedTop),
          color:          colorForYield(s.yieldPct),
          yieldPct:       s.yieldPct,
          cumulative:     cumAfter,
          uncLow:         s.uncertaintyPct[0],
          uncHigh:        s.uncertaintyPct[1],
        }
      })
    },
    trajectoryPoints(): string {
      const pts = this.bars.map(b => `${b.x + this.COL_W / 2},${b.retainedTop}`)
      // Anchor the trajectory at the 100% start on the left edge
      return [`${PLOT_LEFT},${this.yFor(100)}`, ...pts].join(' ')
    },
    hoveredBar(): Bar | null {
      return this.hoverIndex === null ? null : (this.bars[this.hoverIndex] ?? null)
    },
  },
  methods: {
    yFor(pct: number): number {
      return PLOT_TOP + (1 - pct / 100) * this.plotHeight
    },
  },
})
</script>

<style lang="scss" scoped>
.waterfall {
  position: relative;
  width: 100%;

  &__svg {
    display: block;
    width: 100%;
    height: auto;
    overflow: visible;
  }

  &__y-label,
  &__x-label {
    font-family: var(--font-mono);
    font-size: 9px;
    fill: var(--color-text);
    opacity: var(--op-muted);
  }

  &__target-label {
    font-family: var(--font-mono);
    font-size: 8px;
    fill: var(--color-primary);
  }

  &__empty-label {
    font-family: var(--font-mono);
    font-size: 12px;
    fill: var(--color-text);
    opacity: var(--op-muted);
  }

  &__bar-pct {
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 700;
    fill: var(--color-text-heading);
  }

  &__col {
    cursor: pointer;
    transition: opacity var(--tr-fast);

    rect { transition: y 400ms ease-out, height 400ms ease-out; }

    &--hover { opacity: 0.85; }
  }

  &__tooltip {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    @include flex-col(0.25rem);
    padding: 0.6rem 0.8rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    box-shadow: 0 8px 24px color-mix(in srgb, black 35%, transparent);
    pointer-events: none;
    min-width: 9rem;
  }

  &__tooltip-name {
    @include mono-upper(var(--fs-xxs));
    color: var(--color-primary);
  }

  &__tooltip-row {
    @include flex-between(0.75rem);
    font-size: var(--fs-xs);
    color: var(--color-text);
    font-family: var(--font-mono);

    strong { color: var(--color-text-heading); }
  }
}
</style>
