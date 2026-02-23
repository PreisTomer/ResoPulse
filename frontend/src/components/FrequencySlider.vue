<script lang="ts">
import { defineComponent } from 'vue'
import { useCellStore } from '../stores/cellStore'
import { broadcastFrequency } from '../services/socket'
import { resonanceProfiles } from '../mockData'

const MIN_HZ = 400
const MAX_HZ = 600

function hzToPercent(hz: number): number {
  return ((hz - MIN_HZ) / (MAX_HZ - MIN_HZ)) * 100
}

export default defineComponent({
  setup() {
    const store = useCellStore()
    return { store }
  },

  computed: {
    currentFreq(): number {
      return this.store.currentBroadcastFrequency
    },

    targetPos(): string {
      return hzToPercent(resonanceProfiles.target.naturalFrequency).toFixed(2) + '%'
    },

    healthyPos(): string {
      return hzToPercent(resonanceProfiles.healthy.naturalFrequency).toFixed(2) + '%'
    },

    targetImpact(): number {
      return this.store.targetResonanceImpact
    },

    healthyImpact(): number {
      return this.store.healthyResonanceImpact
    },

    // Gradient that lights up near resonance frequencies
    trackGradient(): string {
      const tp = hzToPercent(resonanceProfiles.target.naturalFrequency)
      const hp = hzToPercent(resonanceProfiles.healthy.naturalFrequency)
      const cp = hzToPercent(this.currentFreq)
      const ti = this.targetImpact
      const hi = this.healthyImpact
      const targetAlpha = (ti * 0.8).toFixed(2)
      const healthyAlpha = (hi * 0.8).toFixed(2)
      return [
        `rgba(var(--color-border-rgb, 60,60,80), 1) 0%`,
        `rgba(255,77,109,${targetAlpha}) ${(tp - 4).toFixed(1)}%`,
        `rgba(255,77,109,${targetAlpha}) ${(tp + 4).toFixed(1)}%`,
        `rgba(var(--color-border-rgb, 60,60,80), 1) ${(tp + 10).toFixed(1)}%`,
        `rgba(var(--color-border-rgb, 60,60,80), 1) ${(hp - 10).toFixed(1)}%`,
        `rgba(0,212,255,${healthyAlpha}) ${(hp - 4).toFixed(1)}%`,
        `rgba(0,212,255,${healthyAlpha}) ${(hp + 4).toFixed(1)}%`,
        `rgba(var(--color-border-rgb, 60,60,80), 1) 100%`,
        // thumb position line
        `rgba(255,255,255,0.15) ${(cp - 0.5).toFixed(1)}%`,
        `rgba(255,255,255,0.15) ${(cp + 0.5).toFixed(1)}%`,
      ].join(', ')
    },
  },

  methods: {
    onInput(e: Event) {
      const freq = Number((e.target as HTMLInputElement).value)
      broadcastFrequency(freq)
    },
  },
})
</script>

<template>
  <div class="freq-panel">
    <!-- Left: label + freq value -->
    <div class="freq-left">
      <span class="freq-panel-title">⚡ Signal Generator</span>
      <span class="freq-display">{{ currentFreq }}<span class="freq-unit"> Hz</span></span>
    </div>

    <!-- Center: slider + markers -->
    <div class="slider-wrap">
      <div class="track-wrap" :style="{ '--track-bg': `linear-gradient(to right, ${trackGradient})` }">
        <input
          class="freq-slider"
          type="range"
          :min="400"
          :max="600"
          step="1"
          :value="currentFreq"
          @input="onInput"
        />
      </div>
      <div class="markers">
        <span class="marker-edge">400</span>
        <div class="marker marker--target" :style="{ left: targetPos }">
          <div class="marker-line"></div>
          <span class="marker-label">417</span>
        </div>
        <div class="marker marker--healthy" :style="{ left: healthyPos }">
          <div class="marker-line"></div>
          <span class="marker-label">528</span>
        </div>
        <span class="marker-edge marker-edge--right">600</span>
      </div>
    </div>

    <!-- Right: impact indicators -->
    <div class="freq-right">
      <span class="impact-label impact-label--target">T {{ (targetImpact * 100).toFixed(0) }}%</span>
      <span class="impact-label impact-label--healthy">H {{ (healthyImpact * 100).toFixed(0) }}%</span>
    </div>
  </div>
</template>

<style scoped>
/* ── Panel — single horizontal strip ─────── */
.freq-panel {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.7rem 1.25rem 0.8rem;
  margin-top: 1.5rem;
}

/* ── Left: label + value ─────────────────── */
.freq-left {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.1rem;
  flex-shrink: 0;
  min-width: 7rem;
}

.freq-panel-title {
  font-size: 0.6rem;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
  white-space: nowrap;
}

.freq-display {
  font-size: 1.1rem;
  font-weight: 700;
  font-family: var(--font-mono);
  color: var(--color-text-heading);
  letter-spacing: -0.02em;
  line-height: 1;
}

.freq-unit {
  font-size: 0.65rem;
  font-weight: 400;
  color: var(--color-text-muted);
}

/* ── Center: slider + markers ─────────────── */
.slider-wrap {
  flex: 1;
  min-width: 0;
}

.track-wrap {
  position: relative;
  height: 20px;
  display: flex;
  align-items: center;
}

.track-wrap::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 3px;
  background: var(--track-bg);
  pointer-events: none;
}

.freq-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 3px;
  border-radius: 2px;
  background: transparent;
  outline: none;
  position: relative;
  z-index: 1;
}

.freq-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--color-text-heading);
  border: 2px solid var(--color-surface);
  box-shadow: 0 0 6px rgba(255, 255, 255, 0.25);
  cursor: pointer;
  transition: box-shadow 0.15s;
}

.freq-slider::-webkit-slider-thumb:hover {
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
}

.freq-slider::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--color-text-heading);
  border: 2px solid var(--color-surface);
  cursor: pointer;
}

/* ── Markers ─────────────────────────────── */
.markers {
  position: relative;
  height: 18px;
  margin-top: 0.15rem;
}

.marker-edge {
  position: absolute;
  bottom: 0;
  font-size: 0.58rem;
  font-family: var(--font-mono);
  color: var(--color-text-muted);
  opacity: 0.45;
  left: 0;
}

.marker-edge--right {
  left: auto;
  right: 0;
}

.marker {
  position: absolute;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  top: 0;
}

.marker-line {
  width: 1px;
  height: 6px;
  margin-bottom: 1px;
}

.marker--target .marker-line  { background-color: var(--color-danger); }
.marker--healthy .marker-line { background-color: var(--color-accent); }

.marker-label {
  font-size: 0.55rem;
  font-family: var(--font-mono);
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.marker--target  .marker-label { color: var(--color-danger); }
.marker--healthy .marker-label { color: var(--color-accent); }

/* ── Right: impact readouts ──────────────── */
.freq-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.2rem;
  flex-shrink: 0;
  min-width: 3.5rem;
}

.impact-label {
  font-size: 0.62rem;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  opacity: 0.8;
}

.impact-label--target  { color: var(--color-danger); }
.impact-label--healthy { color: var(--color-accent); }
</style>
