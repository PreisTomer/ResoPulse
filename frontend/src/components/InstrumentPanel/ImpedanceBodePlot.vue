<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="bode-plot">
    <div class="bode-plot__header">
      <div class="bode-plot__title-group">
        <div class="bode-plot__title">{{ $t('instrument.bode.title') }}</div>
        <div class="bode-plot__sub">{{ $t('instrument.bode.sub') }}</div>
      </div>
      <!-- Legend -->
      <div class="bode-plot__legend">
        <span class="bode-plot__legend-item bode-plot__legend-item--z">{{ $t('instrument.bode.legendZ') }}</span>
        <span class="bode-plot__legend-item bode-plot__legend-item--freq">{{ $t('instrument.bode.legendFreq') }}</span>
        <span class="bode-plot__legend-item bode-plot__legend-item--relax">{{ $t('instrument.bode.legendRelax') }}</span>
      </div>
    </div>

    <svg
      class="bode-plot__svg"
      :viewBox="`0 0 ${SVG_W} ${SVG_H}`"
    >
      <!-- DC valid region shading -->
      <rect
        :x="0"
        :y="0"
        :width="relaxX"
        :height="SVG_H - MARGIN.bottom"
        class="bode-plot__dc-region"
      />

      <!-- Grid lines -->
      <g class="bode-plot__grid">
        <line
          v-for="g in yGridLines"
          :key="g.y"
          :x1="MARGIN.left" :y1="g.y"
          :x2="SVG_W - MARGIN.right" :y2="g.y"
          class="bode-plot__grid-line"
        />
        <line
          v-for="g in xGridLines"
          :key="g.x"
          :x1="g.x" :y1="0"
          :x2="g.x" :y2="SVG_H - MARGIN.bottom"
          class="bode-plot__grid-line"
        />
      </g>

      <!-- |Z(f)| curve -->
      <polyline
        :points="curvePoints"
        class="bode-plot__curve"
        fill="none"
      />

      <!-- Relaxation frequency marker -->
      <line
        :x1="relaxX" :y1="0"
        :x2="relaxX" :y2="SVG_H - MARGIN.bottom"
        class="bode-plot__relax-line"
        stroke-dasharray="4 3"
      />
      <text
        :x="relaxX + 3"
        :y="14"
        class="bode-plot__relax-label"
      >f_relax</text>

      <!-- Current broadcast frequency marker -->
      <line
        :x1="broadcastX" :y1="0"
        :x2="broadcastX" :y2="SVG_H - MARGIN.bottom"
        class="bode-plot__freq-line"
      />
      <text
        :x="broadcastLabelX"
        :y="SVG_H - MARGIN.bottom - 4"
        :text-anchor="broadcastLabelAnchor"
        class="bode-plot__freq-label"
      >{{ freqLabel }}</text>

      <!-- Z_DC reference line -->
      <line
        :x1="MARGIN.left" :y1="zDCy"
        :x2="relaxX" :y2="zDCy"
        class="bode-plot__dc-line"
        stroke-dasharray="2 3"
      />

      <!-- X axis labels -->
      <text v-for="g in xGridLines" :key="`xl${g.x}`"
        :x="g.x" :y="SVG_H - MARGIN.bottom + 11"
        text-anchor="middle"
        class="bode-plot__axis-label"
      >{{ g.label }}</text>

      <!-- Y axis labels -->
      <text v-for="g in yGridLines" :key="`yl${g.y}`"
        :x="MARGIN.left - 3" :y="g.y + 4"
        text-anchor="end"
        class="bode-plot__axis-label"
      >{{ g.label }}</text>

      <!-- Axis labels -->
      <text :x="SVG_W / 2" :y="SVG_H - MARGIN.bottom + 26" text-anchor="middle" class="bode-plot__axis-title">
        {{ $t('instrument.bode.axisX') }}
      </text>
      <text
        :x="7"
        :y="(SVG_H - MARGIN.bottom) / 2"
        text-anchor="middle"
        transform="rotate(-90, 7, 60)"
        class="bode-plot__axis-title"
      >{{ $t('instrument.bode.axisY') }}</text>
    </svg>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useImpedanceStore } from '@/stores/impedanceStore'
import { useCellStore }      from '@/stores/cellStore'
import { computeCuvetteComplexImpedanceMag } from '@/utils/impedance'
import { UNIT } from '@/constants/units'

const SVG_W  = 560
const SVG_H  = 176
const MARGIN = { left: 38, right: 12, bottom: 38 }
const N_POINTS = 200
const FREQ_MIN_HZ = 1e3      // 1 kHz
const FREQ_MAX_HZ = 1e10     // 10 GHz

/** Map a frequency [Hz] to an SVG x coordinate (log scale). */
function freqToX(hz: number): number {
  const logMin = Math.log10(FREQ_MIN_HZ)
  const logMax = Math.log10(FREQ_MAX_HZ)
  return MARGIN.left + (Math.log10(hz) - logMin) / (logMax - logMin) * (SVG_W - MARGIN.left - MARGIN.right)
}

/** Map an impedance value [Ω] to an SVG y coordinate (log scale). */
function zToY(z: number, zMin: number, zMax: number): number {
  const logMin = Math.log10(Math.max(zMin, 1e-3))
  const logMax = Math.log10(Math.max(zMax, 1))
  if (logMax === logMin) return SVG_H - MARGIN.bottom
  const t = (Math.log10(Math.max(z, 1e-3)) - logMin) / (logMax - logMin)
  return (SVG_H - MARGIN.bottom) * (1 - t)
}

const X_DECADES = [1e3, 1e4, 1e5, 1e6, 1e7, 1e8, 1e9, 1e10]
const X_LABELS  = ['1k', '10k', '100k', '1M', '10M', '100M', '1G', '10G']

export default defineComponent({
  name: 'ImpedanceBodePlot',

  setup() {
    return {
      store:     useImpedanceStore(),
      cellStore: useCellStore(),
      UNIT,
      SVG_W,
      SVG_H,
      MARGIN,
    }
  },

  computed: {
    sigmaE(): number    { return this.store.sigmaEWithLysis },
    gapMm(): number     { return this.store.cuvetteGapMm },
    areaCm2(): number   { return this.store.cuvetteCrossSectionCm2 },
    freqHz(): number    { return this.cellStore.currentBroadcastFrequency * 1e3 },
    relaxHz(): number   { return this.store.relaxationFreqMHz * 1e6 },

    /** Compute |Z(f)| for N logarithmically spaced frequencies. */
    zValues(): { hz: number; z: number }[] {
      const points: { hz: number; z: number }[] = []
      for (let i = 0; i <= N_POINTS; i++) {
        const t  = i / N_POINTS
        const hz = FREQ_MIN_HZ * (FREQ_MAX_HZ / FREQ_MIN_HZ) ** t
        const z  = computeCuvetteComplexImpedanceMag(this.gapMm, this.areaCm2, this.sigmaE, hz)
        points.push({ hz, z })
      }
      return points
    },

    zMin(): number { return Math.min(...this.zValues.map(p => p.z)) },
    zMax(): number { return Math.max(...this.zValues.map(p => p.z)) },

    curvePoints(): string {
      return this.zValues
        .map(p => `${freqToX(p.hz).toFixed(1)},${zToY(p.z, this.zMin, this.zMax).toFixed(1)}`)
        .join(' ')
    },

    relaxX(): number    { return freqToX(Math.min(this.relaxHz, FREQ_MAX_HZ)) },
    broadcastX(): number { return freqToX(Math.max(FREQ_MIN_HZ, Math.min(this.freqHz, FREQ_MAX_HZ))) },

    broadcastLabelX(): number {
      return this.broadcastX > SVG_W * 0.75 ? this.broadcastX - 4 : this.broadcastX + 4
    },
    broadcastLabelAnchor(): string {
      return this.broadcastX > SVG_W * 0.75 ? 'end' : 'start'
    },

    freqLabel(): string {
      const khz = this.cellStore.currentBroadcastFrequency
      if (khz >= 1e6)  return `${(khz / 1e6).toFixed(2)} ${this.UNIT.GHZ}`
      if (khz >= 1000) return `${(khz / 1000).toFixed(2)} ${this.UNIT.MHZ}`
      return `${khz.toFixed(0)} ${this.UNIT.KHZ}`
    },

    zDCy(): number {
      const zDC = this.zValues[0]?.z ?? 1
      return zToY(zDC, this.zMin, this.zMax)
    },

    xGridLines(): { x: number; label: string }[] {
      return X_DECADES.map((hz, i) => ({ x: freqToX(hz), label: X_LABELS[i] ?? '' }))
    },

    yGridLines(): { y: number; label: string }[] {
      const steps = 4
      const lines: { y: number; label: string }[] = []
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const logMin = Math.log10(Math.max(this.zMin, 1e-3))
        const logMax = Math.log10(Math.max(this.zMax, 1))
        const z = 10 ** (logMin + t * (logMax - logMin))
        const y = zToY(z, this.zMin, this.zMax)
        const label = z >= 1000 ? `${(z / 1000).toFixed(0)}k` : z >= 1 ? z.toFixed(0) : z.toFixed(2)
        lines.push({ y, label })
      }
      return lines
    },
  },
})
</script>

<style lang="scss" scoped>


.bode-plot {
  @include flex-col(0.75rem);

  &__header {
    @include flex-between(0.5rem);
    flex-wrap: wrap;
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

  &__legend {
    @include flex-row(0.85rem);
    flex-shrink: 0;
  }

  &__legend-item {
    @include mono-upper(var(--fs-xs), 0.06em);
    color: var(--color-text-muted);

    &::before {
      content: ', ';
      margin-right: 0.3em;
    }

    &--z     { color: var(--color-primary);     &::before { color: var(--color-primary); } }
    &--freq  { color: var(--color-accent);      &::before { color: var(--color-accent); } }
    &--relax { color: var(--color-amber-warm);  &::before { color: var(--color-amber-warm); } }
  }

  &__svg {
    width: 100%;
    height: auto;
    display: block;
  }

  &__dc-region {
    fill: color-mix(in srgb, var(--color-primary) 4%, transparent);
  }

  &__grid-line {
    stroke: var(--color-border);
    stroke-width: 0.5;
  }

  &__curve {
    stroke: var(--color-primary);
    stroke-width: 1.5;
  }

  &__relax-line {
    stroke: var(--color-amber-warm);
    stroke-width: 1;
    opacity: var(--op-dim);
  }

  &__relax-label {
    fill: var(--color-amber-warm);
    font-family: var(--font-mono);
    font-size: 7px;
    opacity: var(--op-partial);
  }

  &__freq-line {
    stroke: var(--color-accent);
    stroke-width: 1.5;
    opacity: 0.85;
  }

  &__freq-label {
    fill: var(--color-accent);
    font-family: var(--font-mono);
    font-size: 7px;
  }

  &__dc-line {
    stroke: var(--color-text-muted);
    stroke-width: 1;
    opacity: 0.45;
  }

  &__axis-label {
    fill: var(--color-text-muted);
    font-family: var(--font-mono);
    font-size: 7px;
  }

  &__axis-title {
    fill: var(--color-text-muted);
    font-family: var(--font-mono);
    font-size: 7px;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
}
</style>
