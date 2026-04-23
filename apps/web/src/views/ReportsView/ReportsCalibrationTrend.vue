<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <section class="calib-trend">
    <header class="calib-trend__header">
      <span class="calib-trend__title">{{ $t('reports.calibTrendTitle') }}</span>
      <div class="calib-trend__header-actions">
        <div v-if="hasMultipleSessions" class="calib-trend__filter" role="radiogroup">
          <button
            type="button"
            class="calib-trend__filter-btn"
            :class="{ 'calib-trend__filter-btn--active': filterMode === 'all' }"
            v-tip="$t('reports.calibFilterAllTip')"
            @click="filterMode = 'all'"
          >{{ $t('reports.calibFilterAll') }}</button>
          <button
            type="button"
            class="calib-trend__filter-btn"
            :class="{ 'calib-trend__filter-btn--active': filterMode === 'session' }"
            v-tip="$t('reports.calibFilterSessionTip')"
            @click="filterMode = 'session'"
          >{{ $t('reports.calibFilterSession') }}</button>
        </div>
        <span v-if="hasData" class="calib-trend__mean">{{ $t('reports.calibTrendMean', { v: meanAbsFormatted }) }}</span>
      </div>
    </header>
    <p class="calib-trend__subtitle">{{ $t('reports.calibTrendSubtitle') }}</p>
    <p
      v-if="shouldShowDirection"
      class="calib-trend__direction"
      :class="`calib-trend__direction--${directionClass}`"
    >{{ directionLabel }}</p>

    <div v-if="!hasData" class="calib-trend__empty">
      {{ $t('reports.calibTrendEmpty') }}
    </div>

    <svg
      v-else
      ref="chartSvg"
      class="calib-trend__chart"
      :viewBox="`0 0 ${VIEWBOX_W} ${VIEWBOX_H}`"
      role="img"
      :aria-label="$t('reports.calibTrendTitle')"
    >
      <!-- Mean line -->
      <line
        :x1="PADDING_X"
        :x2="VIEWBOX_W - PADDING_X"
        :y1="meanY"
        :y2="meanY"
        class="calib-trend__mean-line"
      />

      <!-- Data line -->
      <polyline :points="polyPoints" class="calib-trend__line" />

      <!-- Data points -->
      <circle
        v-for="(pt, i) in points"
        :key="i"
        :cx="pt.x"
        :cy="pt.y"
        r="3"
        class="calib-trend__dot"
        :class="dotVariantClass(pt.value)"
      />

      <!-- Y-axis tick values -->
      <text :x="PADDING_X - 6" :y="PADDING_Y + 4" text-anchor="end" class="calib-trend__axis-value">
        {{ maxAbsFormatted }}
      </text>
      <text :x="PADDING_X - 6" :y="axisY" text-anchor="end" class="calib-trend__axis-value">
        0
      </text>
      <!-- Y-axis rotated label -->
      <text
        :x="12"
        :y="axisY / 2 + PADDING_Y / 2"
        text-anchor="middle"
        class="calib-trend__axis-label"
        :transform="`rotate(-90, 12, ${axisY / 2 + PADDING_Y / 2})`"
      >{{ $t('reports.calibTrendAxisResidual') }}</text>
      <!-- X-axis label -->
      <text :x="axisXLabelX" :y="VIEWBOX_H - 6" text-anchor="middle" class="calib-trend__axis-label">
        {{ $t('reports.calibTrendAxisEntry') }}
      </text>
    </svg>
  </section>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import { mapStores } from 'pinia'

import { useExperimentStore } from '@/stores/experimentStore'
import type { EntryResidual } from '@/stores/experimentStore'

type FilterMode = 'all' | 'session'

interface Point { x: number; y: number; value: number }

const VIEWBOX_W_DEFAULT = 520
const VIEWBOX_H = 170
const PADDING_X = 44
const PADDING_Y = 18
const PADDING_BOTTOM = 30

export default defineComponent({
  name: 'ReportsCalibrationTrend',

  props: {
    residuals: { type: Array as PropType<EntryResidual[]>, required: true },
  },

  data() {
    return {
      viewBoxW:         VIEWBOX_W_DEFAULT,
      resizeObserver:   null as ResizeObserver | null,
      filterMode:       'all' as FilterMode,
    }
  },

  mounted() {
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const e of entries) {
        const w = Math.max(Math.round(e.contentRect.width), 240)
        if (w !== this.viewBoxW) this.viewBoxW = w
      }
    })
    this.resizeObserver.observe(this.$el)
  },

  beforeUnmount() {
    this.resizeObserver?.disconnect()
    this.resizeObserver = null
  },

  computed: {
    ...mapStores(useExperimentStore),

    VIEWBOX_W(): number { return this.viewBoxW },
    VIEWBOX_H() { return VIEWBOX_H },
    PADDING_X() { return PADDING_X },
    PADDING_Y() { return PADDING_Y },

    activeSessionName(): string {
      return this.experimentStore.sessionName
    },

    hasMultipleSessions(): boolean {
      const seen = new Set<string>()
      for (const r of this.residuals) {
        if (r.targetResidualPct === null) continue
        seen.add(r.sessionName ?? '')
        if (seen.size > 1) return true
      }
      return false
    },

    filteredResiduals(): EntryResidual[] {
      const withTarget = this.residuals.filter(r => r.targetResidualPct !== null)
      if (this.filterMode === 'all') return withTarget
      return withTarget.filter(r => (r.sessionName ?? '') === this.activeSessionName)
    },

    absResiduals(): number[] {
      return this.filteredResiduals
        .map(r => Math.abs(r.targetResidualPct as number))
        .reverse()
    },

    hasData(): boolean {
      return this.absResiduals.length > 0
    },

    maxAbs(): number {
      const m = this.absResiduals.length ? Math.max(...this.absResiduals) : 0
      return Math.max(m, 1)
    },

    meanAbs(): number {
      if (!this.absResiduals.length) return 0
      const sum = this.absResiduals.reduce((a, b) => a + b, 0)
      return sum / this.absResiduals.length
    },

    meanAbsFormatted(): string  { return this.meanAbs.toFixed(1) },
    maxAbsFormatted(): string   { return this.maxAbs.toFixed(0) },

    axisY(): number { return VIEWBOX_H - PADDING_BOTTOM },

    points(): Point[] {
      const n = this.absResiduals.length
      if (n === 0) return []
      const innerW = this.viewBoxW - PADDING_X * 2
      const innerH = this.axisY - PADDING_Y
      const step   = n === 1 ? 0 : innerW / (n - 1)
      return this.absResiduals.map((v, i) => ({
        x: PADDING_X + i * step,
        y: PADDING_Y + innerH - (v / this.maxAbs) * innerH,
        value: v,
      }))
    },

    polyPoints(): string {
      return this.points.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
    },

    meanY(): number {
      const innerH = this.axisY - PADDING_Y
      return PADDING_Y + innerH - (this.meanAbs / this.maxAbs) * innerH
    },

    axisXLabelX(): number { return this.viewBoxW / 2 },

    trendDirection(): 'tightening' | 'drifting' | 'flat' | null {
      const n = this.absResiduals.length
      if (n < 5) return null
      const mid = Math.floor(n / 2)
      const firstHalf  = this.absResiduals.slice(0, mid)
      const secondHalf = this.absResiduals.slice(mid)
      const avg = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length
      const delta = avg(secondHalf) - avg(firstHalf)
      if (delta <= -2) return 'tightening'
      if (delta >=  2) return 'drifting'
      return 'flat'
    },

    shouldShowDirection(): boolean {
      return this.hasData && this.trendDirection !== null
    },

    directionClass(): string {
      return this.trendDirection ?? 'flat'
    },

    directionLabel(): string {
      switch (this.trendDirection) {
        case 'tightening': return this.$t('reports.calibTrendDirTightening') as string
        case 'drifting':   return this.$t('reports.calibTrendDirDrifting')   as string
        case 'flat':       return this.$t('reports.calibTrendDirFlat')       as string
        default:           return ''
      }
    },
  },

  methods: {
    dotVariantClass(v: number): string {
      if (v <= 5)  return 'calib-trend__dot--good'
      if (v <= 15) return 'calib-trend__dot--moderate'
      return 'calib-trend__dot--drift'
    },
  },
})
</script>

<style lang="scss" scoped>
.calib-trend {
  @include flex-col(0.45rem);
  padding: 0.9rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  background: color-mix(in srgb, white 2%, transparent);

  &__header {
    @include flex-between();
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  &__header-actions {
    @include flex-row(0.75rem);
    align-items: center;
    flex-wrap: wrap;
  }

  &__filter {
    @include flex-row(0);
    padding: 2px;
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    background: color-mix(in srgb, white 2%, transparent);
  }

  &__filter-btn {
    @include mono-upper(var(--fs-xxs), 0.08em);
    padding: 0.25rem 0.6rem;
    border: none;
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    border-radius: 4px;
    transition: background var(--tr-fast), color var(--tr-fast);

    &:hover { color: var(--color-text); }

    &--active {
      color: var(--color-primary);
      background: color-mix(in srgb, var(--color-primary) 14%, transparent);
    }
  }

  &__title {
    @include mono-upper(var(--fs-xs));
    color: var(--color-primary);
    letter-spacing: 0.1em;
  }

  &__mean {
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
  }

  &__subtitle {
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
    opacity: var(--op-muted);
    margin: 0;
    line-height: 1.45;
  }

  &__direction {
    @include mono-upper(var(--fs-xxs), 0.08em);
    margin: 0;
    padding: 0.35rem 0.55rem;
    border-radius: var(--radius);
    border: 1px solid;
    align-self: flex-start;

    &--tightening { @include color-variant(lime,    40%, 10%); }
    &--flat       { @include color-variant(primary, 30%, 8%);  }
    &--drifting   { @include color-variant(amber,   40%, 12%); }
  }

  &__empty {
    padding: 0.75rem 0.85rem;
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
    opacity: var(--op-muted);
    text-align: center;
  }

  &__chart {
    width: 100%;
    height: 170px;
    display: block;
  }

  &__line {
    fill: none;
    stroke: var(--color-primary);
    stroke-width: 1.5;
    vector-effect: non-scaling-stroke;
    opacity: var(--op-strong);
  }

  &__mean-line {
    stroke: var(--color-text-muted);
    stroke-width: 1;
    stroke-dasharray: 4 4;
    vector-effect: non-scaling-stroke;
    opacity: var(--op-dim);
  }

  &__dot {
    stroke: var(--color-bg);
    stroke-width: 1;
    vector-effect: non-scaling-stroke;

    &--good     { fill: var(--color-lime);   }
    &--moderate { fill: var(--color-amber);  }
    &--drift    { fill: var(--color-danger); }
  }

  &__axis-value {
    font-family: var(--font-mono);
    font-size: 12px;
    font-weight: 500;
    fill: var(--color-text);
    opacity: var(--op-partial);
  }

  &__axis-label {
    font-family: var(--font-mono);
    font-size: 12px;
    letter-spacing: 0.05em;
    fill: var(--color-text-muted);
    opacity: var(--op-partial);
  }
}
</style>
