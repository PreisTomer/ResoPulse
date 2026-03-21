<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="hmap__stats" v-tip="$t('heatmap.tipStats')">
    <span class="hmap__stats-label">{{ $t('heatmap.statsLabel') }}</span>

    <span class="hmap__stat">
      <span class="hmap__stat-k">{{ $t('heatmap.statTDr') }}</span>
      <span class="hmap__stat-v" :style="{ color: opZoneColor }">{{ tDrPct }}%</span>
    </span>

    <span class="hmap__stat">
      <span class="hmap__stat-k">{{ $t('heatmap.statHDr') }}</span>
      <span class="hmap__stat-v" :class="healthyDrClass">{{ hDrPct }}%</span>
    </span>

    <span class="hmap__stat">
      <span class="hmap__stat-k">{{ $t('heatmap.statTemp') }}</span>
      <span class="hmap__stat-v" :class="tempClass">{{ healthyTssStr }}</span>
    </span>

    <span class="hmap__stat" v-tip="$t('heatmap.tipPLysis')">
      <span class="hmap__stat-k">{{ $t('heatmap.statPLysis') }}</span>
      <span class="hmap__stat-v">{{ pLysisStr }}</span>
    </span>

    <span class="hmap__stat">
      <span class="hmap__stat-k">{{ $t('heatmap.statSel') }}</span>
      <span class="hmap__stat-v" :style="{ color: opZoneColor }">&times;{{ selStr }}</span>
    </span>

    <span class="hmap__stat" v-tip="$t('heatmap.tipRegime')">
      <span
        class="hmap__stat-badge hmap__stat-badge--regime"
        :class="`hmap__stat-badge--${store.freqRegime}`"
      >{{ $t(`slider.regime.${store.freqRegime}`) }}</span>
    </span>

    <span class="hmap__stat" v-if="showSkinDepth" v-tip="$t('heatmap.tipSkinDepth')">
      <span class="hmap__stat-k">&delta;</span>
      <span class="hmap__stat-v" :class="skinDepthClass">{{ skinDepthStr }}</span>
    </span>

    <button class="hmap__snap-btn" @click="snapToOptimal" v-tip="$t('heatmap.tipOptLine')">
      {{ $t('heatmap.snapBtn') }}
    </button>

    <span class="hmap__info-btn" v-tip="$t('heatmap.tipCanvas')">&#x2139;</span>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useCellStore } from '@/stores/cellStore'
import { broadcastStateSync } from '@/services/socket'
import { CHART_MODE, CELL_CATEGORY, FREQ_REGIME } from '@/constants/strings'
import { UNIT } from '@/constants/units'
import { HMAP_LYSIS_DR, HMAP_WARN_DR, HMAP_THERM_WARN_C, HMAP_THERM_CRIT_C } from '@/constants/heatmap'

export default defineComponent({
  props: {
    opZoneColor: { type: String, default: 'var(--color-text)' },
  },

  setup() {
    return { store: useCellStore(), FREQ_REGIME }
  },

  computed: {
    tDrPct(): string {
      return (Math.min(this.store.targetDisruptionRatio,  9.99) * 100).toFixed(1)
    },

    hDrPct(): string {
      return (Math.min(this.store.healthyDisruptionRatio, 9.99) * 100).toFixed(1)
    },

    healthyTssStr(): string {
      const T = (this.store as unknown as Record<string, number>)['healthySteadyStateTemp'] as number | undefined
      return T !== undefined ? `${T.toFixed(1)} ${UNIT.DEG_C}` : '\u2014'
    },

    pLysisStr(): string {
      if (this.store.chartMode === CHART_MODE.RESONANCE) {
        if (this.store.targetCellCategory !== CELL_CATEGORY.MAMMALIAN) return '\u2014'
      }
      return `${(this.store.targetLysisProbabilityRandom * 100).toFixed(0)}%`
    },

    selStr(): string {
      const sel = this.store.selectivityRatio
      return sel >= 99 ? '\u221e' : sel.toFixed(2)
    },

    healthyDrClass(): string {
      const dr = this.store.healthyDisruptionRatio
      if (dr >= HMAP_LYSIS_DR) return 'hmap__stat-v--danger'
      if (dr >= HMAP_WARN_DR)  return 'hmap__stat-v--warn'
      return ''
    },

    tempClass(): string {
      const T = (this.store as unknown as Record<string, number>)['healthySteadyStateTemp'] as number | undefined
      if (!T) return ''
      if (T >= HMAP_THERM_CRIT_C) return 'hmap__stat-v--danger'
      if (T >= HMAP_THERM_WARN_C) return 'hmap__stat-v--warn'
      return ''
    },

    showSkinDepth(): boolean {
      return this.store.freqRegime === FREQ_REGIME.NEARFIELD_RF || this.store.freqRegime === FREQ_REGIME.MICROWAVE
    },

    skinDepthStr(): string {
      const d = this.store.skinDepthMm
      if (!isFinite(d)) return '\u221e'
      return d >= 10 ? `${d.toFixed(0)} ${UNIT.MM}` : `${d.toFixed(1)} ${UNIT.MM}`
    },

    skinDepthClass(): string {
      const d = this.store.skinDepthMm
      if (d >= 20) return 'hmap__stat-v--ok'
      if (d >= 5)  return 'hmap__stat-v--warn'
      return 'hmap__stat-v--danger'
    },
  },

  methods: {
    snapToOptimal() {
      this.store.setBroadcastFreqKHz(Math.round(this.store.optimalFreqResult.khz))
      broadcastStateSync()
    },
  },
})
</script>

<style lang="scss" scoped>
.hmap__stats {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 1.2rem;
  padding: 0.35rem 0.65rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  cursor: default;
}

.hmap__stats-label {
  font-size: 0.63rem;
  font-family: var(--font-mono);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  flex-shrink: 0;
}

.hmap__stat {
  display: flex;
  align-items: baseline;
  gap: 0.3rem;
}

.hmap__stat-k {
  font-size: 0.63rem;
  font-family: var(--font-mono);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  flex-shrink: 0;
}

.hmap__stat-v {
  font-size: 0.72rem;
  font-family: var(--font-mono);
  font-weight: 700;
  color: var(--color-text);
  transition: color 0.3s;

  &--warn   { color: var(--color-amber); }
  &--danger { color: var(--color-danger); }
  &--ok     { color: var(--color-lime); }
}

.hmap__stat-badge {
  font-size: 0.56rem;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  padding: 0.15rem 0.45rem;
  border-radius: 3px;
  border: 1px solid;

  &--regime {
    &--electrolytic { color: var(--color-primary); border-color: rgba(0, 212, 255, 0.35); background: rgba(0, 212, 255, 0.07); }
    &--nearfield_rf { color: var(--color-amber);   border-color: rgba(251, 191, 36, 0.35); background: rgba(251, 191, 36, 0.07); }
    &--microwave    { color: var(--color-danger);  border-color: rgba(255, 77, 109, 0.35); background: rgba(255, 77, 109, 0.07); }
  }
}

.hmap__info-btn {
  font-size: 0.7rem;
  color: var(--color-text-muted);
  opacity: 0.55;
  cursor: default;
  flex-shrink: 0;
  transition: opacity 0.15s;

  &:hover { opacity: 1; }
}

.hmap__snap-btn {
  margin-left: auto;
  background: rgba(251, 191, 36, 0.10);
  border: 1px solid rgba(251, 191, 36, 0.35);
  border-radius: 3px;
  color: var(--color-amber);
  font-family: var(--font-mono);
  font-size: 0.58rem;
  letter-spacing: 0.06em;
  padding: 0.18rem 0.55rem;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
  white-space: nowrap;

  &:hover {
    background: rgba(251, 191, 36, 0.20);
    border-color: rgba(251, 191, 36, 0.65);
  }
}
</style>
