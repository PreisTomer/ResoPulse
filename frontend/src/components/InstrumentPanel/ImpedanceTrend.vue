<template>
  <div class="imp-trend">
    <div class="imp-trend__header">
      <div class="imp-trend__title">{{ $t('instrument.trend.title') }}</div>
      <div class="imp-trend__sub">{{ $t('instrument.trend.sub') }}</div>
    </div>

    <div v-if="points.length === 0" class="imp-trend__empty">
      {{ $t('instrument.trend.noData') }}
    </div>

    <template v-else>
      <!-- SVG sparkline -->
      <div class="imp-trend__chart-wrap">
        <div class="imp-trend__axis-y">
          <span>{{ yMax.toFixed(0) }}</span>
          <span>{{ yMid.toFixed(0) }}</span>
          <span>{{ yMin.toFixed(0) }}</span>
        </div>
        <svg
          class="imp-trend__svg"
          :viewBox="`0 0 ${SVG_W} ${SVG_H}`"
          preserveAspectRatio="none"
          aria-label="Impedance over time"
        >
          <!-- Grid lines -->
          <line
            v-for="y in gridYs"
            :key="y"
            :x1="0" :y1="y" :x2="SVG_W" :y2="y"
            stroke="rgba(255,255,255,0.06)"
            stroke-width="1"
          />
          <!-- Nominal Z reference line -->
          <line
            :x1="0" :y1="nominalY" :x2="SVG_W" :y2="nominalY"
            stroke="rgba(255,255,255,0.25)"
            stroke-width="1"
            stroke-dasharray="4 3"
          />
          <!-- Main polyline -->
          <polyline
            :points="polylinePoints"
            fill="none"
            stroke="var(--color-primary)"
            stroke-width="1.5"
            stroke-linejoin="round"
          />
          <!-- Dots for hardware readings -->
          <circle
            v-for="(pt, i) in hwPoints"
            :key="i"
            :cx="pt.cx"
            :cy="pt.cy"
            r="3"
            fill="var(--color-primary)"
            opacity="0.9"
          />
        </svg>
        <div class="imp-trend__axis-label">{{ $t('instrument.trend.axisZ') }}</div>
      </div>

      <!-- Recent readings table -->
      <div class="imp-trend__table-wrap">
        <table class="imp-trend__table">
          <thead>
            <tr>
              <th>{{ $t('instrument.trend.thNum') }}</th>
              <th>{{ $t('instrument.trend.thTime') }}</th>
              <th>{{ $t('instrument.trend.thZ') }} ({{ UNIT.OHM }})</th>
              <th>{{ $t('instrument.trend.thSigma') }} ({{ UNIT.S_PER_M }})</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(pt, i) in recentPoints" :key="i">
              <td>{{ totalPoints - recentPoints.length + i + 1 }}</td>
              <td>{{ formatTime(pt.ts) }}</td>
              <td class="imp-trend__table-z">{{ pt.zOhm.toFixed(1) }}</td>
              <td class="imp-trend__table-sigma">{{ pt.sigmaE.toFixed(4) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useImpedanceStore } from '@/stores/impedanceStore'
import type { ImpedanceHistoryPoint } from '@/stores/impedanceStore'
import { UNIT } from '@/constants/units'

const SVG_W = 400
const SVG_H = 80
const RECENT_N = 8

export default defineComponent({
  name: 'ImpedanceTrend',
  setup() {
    return { store: useImpedanceStore(), UNIT, SVG_W, SVG_H }
  },
  computed: {
    points(): ImpedanceHistoryPoint[] {
      return this.store.impedanceHistory
    },
    totalPoints(): number {
      return this.points.length
    },
    recentPoints(): ImpedanceHistoryPoint[] {
      return this.points.slice(-RECENT_N)
    },
    yMin(): number {
      return Math.min(...this.points.map(p => p.zOhm)) * 0.98
    },
    yMax(): number {
      return Math.max(...this.points.map(p => p.zOhm)) * 1.02
    },
    yMid(): number {
      return (this.yMin + this.yMax) / 2
    },
    nominalY(): number {
      const z = this.store.nominalImpedanceOhm
      return this.toSvgY(z)
    },
    gridYs(): number[] {
      const mid = SVG_H / 2
      return [10, mid, SVG_H - 10]
    },
    polylinePoints(): string {
      const pts = this.points
      if (pts.length < 2) return ''
      return pts.map((p, i) => {
        const x = (i / (pts.length - 1)) * SVG_W
        const y = this.toSvgY(p.zOhm)
        return `${x.toFixed(1)},${y.toFixed(1)}`
      }).join(' ')
    },
    hwPoints(): Array<{ cx: number; cy: number }> {
      // Mark the last hardware reading if hardware mode is on
      if (!this.store.hardwareModeEnabled || this.store.hardwareZReal === null) return []
      const last = this.points[this.points.length - 1]
      if (!last) return []
      return [{
        cx: SVG_W,
        cy: this.toSvgY(last.zOhm),
      }]
    },
  },
  methods: {
    toSvgY(z: number): number {
      const range = this.yMax - this.yMin
      if (range === 0) return SVG_H / 2
      return SVG_H - ((z - this.yMin) / range) * (SVG_H - 8) - 4
    },
    formatTime(ts: number): string {
      return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    },
  },
})
</script>

<style lang="scss" scoped>
.imp-trend {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;

  &__header {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  &__title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text);
  }

  &__sub {
    font-size: 0.7rem;
    color: var(--color-text-muted);
  }

  &__empty {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    text-align: center;
    padding: 2rem;
    border: 1px dashed var(--color-border);
    border-radius: var(--radius);
  }

  &__chart-wrap {
    position: relative;
    display: flex;
    gap: 0.5rem;
    align-items: stretch;
  }

  &__axis-y {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    font-size: 0.6rem;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    text-align: right;
    width: 2.8rem;
    flex-shrink: 0;
    padding: 2px 0;
  }

  &__svg {
    flex: 1;
    height: 80px;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    overflow: visible;
  }

  &__axis-label {
    position: absolute;
    left: -0.5rem;
    top: 50%;
    transform: translateY(-50%) rotate(-90deg);
    font-size: 0.55rem;
    color: var(--color-text-muted);
    white-space: nowrap;
  }

  &__table-wrap {
    overflow-x: auto;
  }

  &__table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.72rem;

    th {
      color: var(--color-text-muted);
      font-weight: 500;
      text-align: left;
      padding: 0.3rem 0.5rem;
      border-bottom: 1px solid var(--color-border);
    }

    td {
      padding: 0.3rem 0.5rem;
      color: var(--color-text-muted);
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    }
  }

  &__table-z {
    font-family: var(--font-mono);
    color: var(--color-primary) !important;
  }

  &__table-sigma {
    font-family: var(--font-mono);
    color: var(--color-text) !important;
  }
}
</style>
