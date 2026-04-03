<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="load-monitor">

    <!-- Header -->
    <div class="load-monitor__header">
      <div class="load-monitor__title-group">
        <div class="load-monitor__title">{{ $t('instrument.loadMonitor.title') }}</div>
        <div class="load-monitor__sub">{{ $t('instrument.loadMonitor.sub') }}</div>
      </div>
      <div
        class="load-monitor__state-badge"
        :class="`load-monitor__state-badge--${impedanceStore.loadState}`"
        v-tip="$t('instrument.loadMonitor.tipState')"
      >
        {{ $t(`instrument.loadMonitor.state${capitalize(impedanceStore.loadState)}`) }}
      </div>
    </div>

    <!-- Stat row -->
    <div class="load-monitor__stats">
      <div class="load-monitor__stat" v-tip="$t('instrument.loadMonitor.tipMediumSAR')">
        <span class="load-monitor__stat-label">{{ $t('instrument.loadMonitor.statMediumSAR') }}</span>
        <span class="load-monitor__stat-value">{{ mediumSARDisplay }} <span class="load-monitor__stat-unit">{{ UNIT.W_PER_KG }}</span></span>
      </div>
      <div class="load-monitor__stat" v-tip="$t('instrument.loadMonitor.tipSigmaBase')">
        <span class="load-monitor__stat-label">{{ $t('instrument.loadMonitor.statSigmaBase') }}</span>
        <span class="load-monitor__stat-value">{{ sigmaBaseDisplay }} <span class="load-monitor__stat-unit">{{ UNIT.S_PER_M }}</span></span>
      </div>
      <div class="load-monitor__stat load-monitor__stat--live" v-tip="$t('instrument.loadMonitor.tipSigmaLive')">
        <span class="load-monitor__stat-label">{{ $t('instrument.loadMonitor.statSigmaLive') }}</span>
        <span class="load-monitor__stat-value load-monitor__stat-value--primary">{{ sigmaLiveDisplay }} <span class="load-monitor__stat-unit">{{ UNIT.S_PER_M }}</span></span>
      </div>
      <div
        class="load-monitor__stat"
        :class="{ 'load-monitor__stat--warn': Math.abs(impedanceStore.conductivityDeltaAbs) > CONDUCTIVITY_DELTA_WARN }"
        v-tip="$t('instrument.loadMonitor.tipDelta')"
      >
        <span class="load-monitor__stat-label">{{ $t('instrument.loadMonitor.statDelta') }}</span>
        <span class="load-monitor__stat-value">{{ deltaDisplay }} <span class="load-monitor__stat-unit">{{ UNIT.S_PER_M }}</span></span>
      </div>
      <div
        class="load-monitor__stat"
        :class="{
          'load-monitor__stat--warn':   Math.abs(impedanceStore.impedanceDriftPct) > DRIFT_WARN_PCT,
          'load-monitor__stat--danger': Math.abs(impedanceStore.impedanceDriftPct) > DRIFT_DANGER_PCT,
        }"
        v-tip="$t('instrument.loadMonitor.tipDrift')"
      >
        <span class="load-monitor__stat-label">{{ $t('instrument.loadMonitor.statDrift') }}</span>
        <span class="load-monitor__stat-value">{{ driftDisplay }}</span>
      </div>
    </div>

    <!-- Chart area -->
    <div v-if="samples.length < 3" class="load-monitor__empty">
      {{ $t('instrument.loadMonitor.noData') }}
    </div>

    <div v-else class="load-monitor__chart-wrap">
      <!-- Left Y-axis: σ_e -->
      <div class="load-monitor__axis-y load-monitor__axis-y--left">
        <span>{{ sigmaYMax.toFixed(3) }}</span>
        <span>{{ sigmaYMid.toFixed(3) }}</span>
        <span>{{ sigmaYMin.toFixed(3) }}</span>
        <span class="load-monitor__axis-unit">{{ UNIT.S_PER_M }}</span>
      </div>

      <!-- SVG chart -->
      <svg
        class="load-monitor__svg"
        :viewBox="`0 0 ${SVG_W} ${SVG_H}`"
        preserveAspectRatio="none"
        aria-label="Medium conductivity and cuvette impedance over time"
      >
        <!-- Background zones based on drift severity -->
        <defs>
          <linearGradient id="lm-warn-grad" x1="0" y1="0" x2="0" y2="1">
            <stop class="lm-grad-stop--warn" offset="0%" />
            <stop offset="100%" stop-color="transparent" />
          </linearGradient>
          <linearGradient id="lm-danger-grad" x1="0" y1="0" x2="0" y2="1">
            <stop class="lm-grad-stop--danger" offset="0%" />
            <stop offset="100%" stop-color="transparent" />
          </linearGradient>
        </defs>

        <!-- Drift zone fills behind chart -->
        <rect
          v-if="Math.abs(impedanceStore.impedanceDriftPct) > DRIFT_DANGER_PCT"
          :x="0" :y="0" :width="SVG_W" :height="SVG_H"
          fill="url(#lm-danger-grad)"
        />
        <rect
          v-else-if="Math.abs(impedanceStore.impedanceDriftPct) > DRIFT_WARN_PCT"
          :x="0" :y="0" :width="SVG_W" :height="SVG_H"
          fill="url(#lm-warn-grad)"
        />

        <!-- Horizontal grid lines -->
        <line
          v-for="yFrac in [0.25, 0.5, 0.75]"
          :key="yFrac"
          class="load-monitor__grid-line"
          :x1="0" :y1="yFrac * SVG_H" :x2="SVG_W" :y2="yFrac * SVG_H"
          stroke-width="1"
        />

        <!-- Nominal σ_e reference line (dashed cyan) -->
        <line
          class="load-monitor__sigma-ref-line"
          :x1="0" :y1="sigmaToY(sigmaBase)" :x2="SVG_W" :y2="sigmaToY(sigmaBase)"
          stroke-width="1"
          stroke-dasharray="4 3"
        />

        <!-- Nominal Z reference line (dashed amber) -->
        <line
          :x1="0" :y1="zToY(zNominal)" :x2="SVG_W" :y2="zToY(zNominal)"
          class="load-monitor__z-ref-line"
          stroke-width="1"
          stroke-dasharray="4 3"
        />

        <!-- σ_e area fill -->
        <polygon class="load-monitor__sigma-area" :points="sigmaAreaPoints" />

        <!-- σ_e polyline -->
        <polyline
          :points="sigmaPolyline"
          fill="none"
          stroke="var(--color-primary)"
          stroke-width="1.8"
          stroke-linejoin="round"
          stroke-linecap="round"
        />

        <!-- Z polyline (dashed amber) -->
        <polyline
          :points="zPolyline"
          fill="none"
          class="load-monitor__z-polyline"
          stroke-width="1.5"
          stroke-linejoin="round"
          stroke-linecap="round"
          stroke-dasharray="5 2"
        />

        <!-- Latest value dots -->
        <circle :cx="SVG_W" :cy="sigmaToY(samples[samples.length-1]!.sigmaE)" r="3" fill="var(--color-primary)" />
        <circle :cx="SVG_W" :cy="zToY(samples[samples.length-1]!.zOhm)" r="3" class="load-monitor__z-dot" />
      </svg>

      <!-- Right Y-axis: Z [Ω] -->
      <div class="load-monitor__axis-y load-monitor__axis-y--right">
        <span>{{ zYMax.toFixed(1) }}</span>
        <span>{{ zYMid.toFixed(1) }}</span>
        <span>{{ zYMin.toFixed(1) }}</span>
        <span class="load-monitor__axis-unit">{{ UNIT.OHM }}</span>
      </div>
    </div>

    <!-- X-axis time labels -->
    <div v-if="samples.length >= 3" class="load-monitor__axis-x">
      <span>{{ formatTime(samples[0]!.ts) }}</span>
      <span class="load-monitor__axis-x-label">{{ $t('instrument.loadMonitor.axisTime') }}</span>
      <span>{{ formatTime(samples[samples.length - 1]!.ts) }}</span>
    </div>

    <!-- Legend + clear -->
    <div class="load-monitor__legend">
      <span class="load-monitor__legend-sigma">{{ ICON.SQUARE }} {{ $t('instrument.loadMonitor.legendSigma') }}</span>
      <span class="load-monitor__legend-z">{{ ICON.SQUARE }} {{ $t('instrument.loadMonitor.legendZ') }}</span>
      <span class="load-monitor__legend-ref">- - {{ $t('instrument.loadMonitor.legendRef') }}</span>
      <button class="load-monitor__clear-btn" @click="clearSamples">{{ $t('instrument.loadMonitor.clear') }}</button>
    </div>

    <!-- Feedback chain strip -->
    <div class="load-monitor__chain" v-tip="$t('instrument.loadMonitor.tipChain')">
      <div class="load-monitor__chain-step" :class="{ 'load-monitor__chain-step--active': impedanceStore.lysedFraction > 0 }">
        <span class="load-monitor__chain-label">{{ $t('instrument.loadMonitor.chainLysed') }}</span>
        <span class="load-monitor__chain-value">{{ (impedanceStore.lysedFraction * 100).toFixed(0) }}%</span>
      </div>
      <span class="load-monitor__chain-arrow">{{ ICON.ARROW_SHORT }}</span>
      <div class="load-monitor__chain-step" :class="{ 'load-monitor__chain-step--active': Math.abs(impedanceStore.conductivityDeltaAbs) > CONDUCTIVITY_DELTA_WARN }">
        <span class="load-monitor__chain-label">{{ $t('instrument.loadMonitor.chainDeltaSigma') }}</span>
        <span class="load-monitor__chain-value">{{ deltaDisplay }}</span>
      </div>
      <span class="load-monitor__chain-arrow">{{ ICON.ARROW_SHORT }}</span>
      <div
        class="load-monitor__chain-step"
        :class="{
          'load-monitor__chain-step--warn':   Math.abs(impedanceStore.impedanceDriftPct) > DRIFT_WARN_PCT,
          'load-monitor__chain-step--danger': Math.abs(impedanceStore.impedanceDriftPct) > DRIFT_DANGER_PCT,
        }"
      >
        <span class="load-monitor__chain-label">{{ $t('instrument.loadMonitor.chainZDrift') }}</span>
        <span class="load-monitor__chain-value">{{ driftDisplay }}</span>
      </div>
      <span class="load-monitor__chain-arrow">{{ ICON.ARROW_SHORT }}</span>
      <div
        class="load-monitor__chain-step"
        :class="{ 'load-monitor__chain-step--warn': impedanceStore.voltageCorrectionFactor > 1 + CORRECTION_PCT_WARN / 100 }"
      >
        <span class="load-monitor__chain-label">{{ $t('instrument.loadMonitor.chainCorrection') }}</span>
        <span class="load-monitor__chain-value">{{ ICON.TIMES }}{{ impedanceStore.voltageCorrectionFactor.toFixed(3) }}</span>
      </div>
    </div>

  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'

import { useImpedanceStore } from '@/stores/impedanceStore'
import type { ConductivitySample } from '@/stores/impedanceStore'
import { useCellStore } from '@/stores/cellStore'

import { UNIT } from '@/constants/units'
import { ICON } from '@/constants/icons'
import { CONDUCTIVITY_SAMPLE_INTERVAL_MS } from '@/constants/cuvette'
import { DRIFT_WARN_PCT, DRIFT_DANGER_PCT, CONDUCTIVITY_DELTA_WARN_S_M, CORRECTION_PCT_WARN } from '@/constants/physics'
const SVG_W = 400
const SVG_H = 110
const Y_PAD = 4

export default defineComponent({
  name: 'LoadMonitor',

  data() {
    return {
      SVG_W,
      SVG_H,
      _timer: null as ReturnType<typeof setInterval> | null,
    }
  },

  mounted() {
    this.impedanceStore.addConductivitySample()
    this._timer = setInterval(() => {
      this.impedanceStore.addConductivitySample()
    }, CONDUCTIVITY_SAMPLE_INTERVAL_MS)
  },

  beforeUnmount() {
    if (this._timer !== null) clearInterval(this._timer)
  },

  computed: {
    ICON()                    { return ICON },
    UNIT()                    { return UNIT },
    DRIFT_WARN_PCT()          { return DRIFT_WARN_PCT },
    DRIFT_DANGER_PCT()        { return DRIFT_DANGER_PCT },
    CONDUCTIVITY_DELTA_WARN() { return CONDUCTIVITY_DELTA_WARN_S_M },
    CORRECTION_PCT_WARN()     { return CORRECTION_PCT_WARN },
    ...mapStores(useImpedanceStore, useCellStore),

    samples(): ConductivitySample[] {
      return this.impedanceStore.conductivitySamples
    },

    sigmaBase(): number {
      return this.cellStore.effectiveSigmaE
    },

    zNominal(): number {
      return this.impedanceStore.nominalImpedanceOhm
    },

    /* ── σ_e Y-axis range ── */
    sigmaYMin(): number {
      const vals = this.samples.map(s => s.sigmaE)
      const rawMin = Math.min(...vals)
      const rawMax = Math.max(...vals)
      const span   = Math.max(0.05, rawMax - rawMin)
      return rawMin - span * 0.08
    },
    sigmaYMax(): number {
      const vals = this.samples.map(s => s.sigmaE)
      const rawMin = Math.min(...vals)
      const rawMax = Math.max(...vals)
      const span   = Math.max(0.05, rawMax - rawMin)
      return rawMax + span * 0.08
    },
    sigmaYMid(): number {
      return (this.sigmaYMin + this.sigmaYMax) / 2
    },

    /* ── Z Y-axis range ── */
    zYMin(): number {
      const vals = this.samples.map(s => s.zOhm)
      const rawMin = Math.min(...vals)
      const rawMax = Math.max(...vals)
      const span   = Math.max(5, rawMax - rawMin)
      return rawMin - span * 0.08
    },
    zYMax(): number {
      const vals = this.samples.map(s => s.zOhm)
      const rawMin = Math.min(...vals)
      const rawMax = Math.max(...vals)
      const span   = Math.max(5, rawMax - rawMin)
      return rawMax + span * 0.08
    },
    zYMid(): number {
      return (this.zYMin + this.zYMax) / 2
    },

    /* ── SVG polylines ── */
    sigmaPolyline(): string {
      const n = this.samples.length
      if (n < 2) return ''
      return this.samples.map((s, i) => {
        const x = (i / (n - 1)) * SVG_W
        const y = this.sigmaToY(s.sigmaE)
        return `${x.toFixed(1)},${y.toFixed(1)}`
      }).join(' ')
    },

    sigmaAreaPoints(): string {
      const n = this.samples.length
      if (n < 2) return ''
      const line = this.samples.map((s, i) => {
        const x = (i / (n - 1)) * SVG_W
        const y = this.sigmaToY(s.sigmaE)
        return `${x.toFixed(1)},${y.toFixed(1)}`
      }).join(' ')
      const baseline = SVG_H - Y_PAD
      return `0,${baseline} ${line} ${SVG_W},${baseline}`
    },

    zPolyline(): string {
      const n = this.samples.length
      if (n < 2) return ''
      return this.samples.map((s, i) => {
        const x = (i / (n - 1)) * SVG_W
        const y = this.zToY(s.zOhm)
        return `${x.toFixed(1)},${y.toFixed(1)}`
      }).join(' ')
    },

    mediumSARDisplay(): string {
      const sar = this.cellStore.mediumJouleHeatingSAR
      if (sar >= 1000) return (sar / 1000).toFixed(2) + 'k'
      if (sar >= 10)   return sar.toFixed(1)
      return sar.toFixed(3)
    },

    /* ── Display helpers ── */
    sigmaBaseDisplay(): string {
      return this.sigmaBase.toFixed(4)
    },
    sigmaLiveDisplay(): string {
      return this.impedanceStore.sigmaEWithLysis.toFixed(4)
    },
    deltaDisplay(): string {
      const d = this.impedanceStore.conductivityDeltaAbs
      const sign = d > 0 ? '+' : ''
      return `${sign}${d.toFixed(4)}`
    },
    driftDisplay(): string {
      const d = this.impedanceStore.impedanceDriftPct
      const sign = d > 0 ? '+' : d < 0 ? '−' : ''
      return `${sign}${Math.abs(d).toFixed(1)}%`
    },
  },

  methods: {
    sigmaToY(sigma: number): number {
      const range = this.sigmaYMax - this.sigmaYMin
      if (range === 0) return SVG_H / 2
      return SVG_H - Y_PAD - ((sigma - this.sigmaYMin) / range) * (SVG_H - Y_PAD * 2)
    },

    zToY(z: number): number {
      const range = this.zYMax - this.zYMin
      if (range === 0) return SVG_H / 2
      return SVG_H - Y_PAD - ((z - this.zYMin) / range) * (SVG_H - Y_PAD * 2)
    },

    formatTime(ts: number): string {
      return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    },

    capitalize(s: string): string {
      return s.charAt(0).toUpperCase() + s.slice(1)
    },

    clearSamples() {
      this.impedanceStore.clearConductivitySamples()
    },
  },
})
</script>

<style lang="scss" scoped>
.load-monitor {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;

  /* ── Header ── */
  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.5rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--color-border);
  }

  &__title {
    font-size: var(--fs-lg);
    font-weight: 600;
    color: var(--color-text);
  }

  &__sub {
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
    margin-top: 0.15rem;
  }

  &__state-badge {
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.07em;
    padding: 0.2rem 0.6rem;
    border-radius: 1rem;
    border: 1px solid var(--color-border);
    background: var(--color-surface-2, var(--color-surface));
    color: var(--color-text-muted);
    white-space: nowrap;
    flex-shrink: 0;
    cursor: default;

    &--nominal  { color: var(--color-primary);        border-color: color-mix(in srgb, var(--color-primary) 40%, transparent);     background: color-mix(in srgb, var(--color-primary) 6%, transparent); }
    &--warning  { color: var(--color-amber-warm);     border-color: color-mix(in srgb, var(--color-amber) 45%, transparent);   background: color-mix(in srgb, var(--color-amber) 8%, transparent); }
    &--critical { color: var(--color-danger); border-color: color-mix(in srgb, var(--color-danger) 45%, transparent);  background: color-mix(in srgb, var(--color-danger) 8%, transparent); }
  }

  /* ── Stat row ── */
  &__stats {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 0.5rem;

    @media (max-width: 900px) { grid-template-columns: repeat(3, 1fr); }
    @media (max-width: 700px) { grid-template-columns: repeat(2, 1fr); }
  }

  &__stat {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    padding: 0.5rem 0.65rem;
    cursor: default;

    &--live   { border-color: color-mix(in srgb, var(--color-primary) 25%, transparent);   background: color-mix(in srgb, var(--color-primary) 4%, transparent); }
    &--warn   { border-color: color-mix(in srgb, var(--color-amber) 30%, transparent);   background: color-mix(in srgb, var(--color-amber) 5%, transparent); }
    &--danger { border-color: color-mix(in srgb, var(--color-danger) 30%, transparent);   background: color-mix(in srgb, var(--color-danger) 5%, transparent); }

    &-label {
      font-size: var(--fs-xxs);
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 0.2rem;
    }

    &-value {
      font-family: var(--font-mono);
      font-size: var(--fs-lg);
      font-weight: 600;
      color: var(--color-text);
      &--primary { color: var(--color-primary); }
    }

    &-unit {
      font-size: var(--fs-xxs);
      font-weight: 400;
      color: var(--color-text-muted);
    }
  }

  /* ── Chart ── */
  &__empty {
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
    text-align: center;
    padding: 2rem;
    border: 1px dashed var(--color-border);
    border-radius: var(--radius);
  }

  &__chart-wrap {
    display: flex;
    gap: 0.35rem;
    align-items: stretch;
  }

  &__axis-y {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    font-size: var(--fs-xs);
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    flex-shrink: 0;
    padding-bottom: 1rem;

    &--left  { text-align: right; width: 3.2rem; }
    &--right { text-align: left;  width: 2.8rem; }
  }

  &__axis-unit {
    font-size: var(--fs-xxs);
    opacity: 0.6;
    margin-top: 0.1rem;
  }

  &__svg {
    flex: 1;
    height: 110px;
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    display: block;
    overflow: visible;
  }

  &__grid-line { stroke: color-mix(in srgb, white 5%, transparent); }

  &__axis-x {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: var(--fs-xs);
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    padding: 0 3.55rem;

    &-label {
      opacity: 0.5;
      font-size: var(--fs-xxs);
    }
  }

  /* ── Legend ── */
  &__legend {
    display: flex;
    align-items: center;
    gap: 0.85rem;
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    flex-wrap: wrap;
  }

  &__legend-sigma { color: var(--color-primary); }
  &__legend-z     { color: color-mix(in srgb, var(--color-amber) 90%, transparent); }
  &__legend-ref   { color: var(--color-text-muted); letter-spacing: 0.04em; }

  &__clear-btn {
    margin-left: auto;
    background: transparent;
    border: 1px solid var(--color-border);
    color: var(--color-text-muted);
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    padding: 0.2rem 0.6rem;
    border-radius: var(--radius);
    cursor: pointer;
    transition: border-color var(--tr-fast), color var(--tr-fast);

    &:hover { border-color: var(--color-primary); color: var(--color-primary); }
  }

  /* ── Feedback chain ── */
  &__chain {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    padding: 0.6rem 0.9rem;
    flex-wrap: wrap;
    row-gap: 0.5rem;
    cursor: default;
  }

  &__chain-step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.1rem;
    padding: 0.2rem 0.5rem;
    border-radius: 4px;
    border: 1px solid transparent;
    min-width: 64px;
    text-align: center;
    transition: border-color var(--tr-normal), background var(--tr-normal);

    &--active  { border-color: color-mix(in srgb, var(--color-primary) 30%, transparent);   background: color-mix(in srgb, var(--color-primary) 6%, transparent); }
    &--warn    { border-color: color-mix(in srgb, var(--color-amber) 35%, transparent);  background: color-mix(in srgb, var(--color-amber) 7%, transparent); }
    &--danger  { border-color: color-mix(in srgb, var(--color-danger) 35%, transparent);  background: color-mix(in srgb, var(--color-danger) 7%, transparent); }
  }

  &__chain-label {
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  &__chain-value {
    font-family: var(--font-mono);
    font-size: var(--fs-md);
    font-weight: 600;
    color: var(--color-text);
  }

  &__chain-arrow {
    font-size: var(--fs-xl);
    color: var(--color-primary);
    opacity: 0.3;
    flex-shrink: 0;
  }

  &__sigma-ref-line { stroke: color-mix(in srgb, var(--color-primary) 35%, transparent); }
  &__sigma-area     { fill: color-mix(in srgb, var(--color-primary) 7%, transparent); }
}

.lm-grad-stop {
  &--warn   { stop-color: color-mix(in srgb, var(--color-amber)  8%, transparent); }
  &--danger { stop-color: color-mix(in srgb, var(--color-danger) 10%, transparent); }
}
</style>
