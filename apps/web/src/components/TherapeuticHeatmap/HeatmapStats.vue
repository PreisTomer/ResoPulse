<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="hmap__stats" v-tip="tipStats" :style="{ '--op-zone-color': opZoneColor }">
    <span class="hmap__stats-label">{{ $t('heatmap.statsLabel') }}</span>

    <span class="hmap__stat">
      <span class="hmap__stat-k">{{ $t('heatmap.statTDr') }}</span>
      <span class="hmap__stat-v hmap__stat-v--zone">{{ tDrPct }}%</span>
    </span>

    <span class="hmap__stat">
      <span class="hmap__stat-k">{{ $t('heatmap.statHDr') }}</span>
      <span class="hmap__stat-v" :class="healthyDrClass">{{ hDrPct }}%</span>
    </span>

    <span class="hmap__stat">
      <span class="hmap__stat-k">{{ $t('heatmap.statTemp') }}</span>
      <span class="hmap__stat-v" :class="tempClass">{{ healthyTssStr }}</span>
    </span>

    <span class="hmap__stat" v-tip="tipPLysis">
      <span class="hmap__stat-k">{{ $t('heatmap.statPLysis') }}</span>
      <span class="hmap__stat-v">{{ pLysisStr }}</span>
    </span>

    <span class="hmap__stat">
      <span class="hmap__stat-k">{{ $t('heatmap.statSel') }}</span>
      <span class="hmap__stat-v hmap__stat-v--zone">&times;{{ selStr }}</span>
    </span>

    <span class="hmap__stat" v-tip="tipRegime">
      <span
        class="hmap__stat-badge hmap__stat-badge--regime"
        :class="`hmap__stat-badge--${cellStore.freqRegime}`"
      >{{ $t(`slider.regime.${cellStore.freqRegime}`) }}</span>
    </span>

    <span class="hmap__stat" v-if="showSkinDepth" v-tip="tipSkinDepth">
      <span class="hmap__stat-k">&delta;</span>
      <span class="hmap__stat-v" :class="skinDepthClass">{{ skinDepthStr }}</span>
    </span>

    <button class="hmap__snap-btn" @click="snapToOptimal" v-tip="tipOptLine">
      {{ $t('heatmap.snapBtn') }}
    </button>

    <span class="hmap__info-btn" v-tip="tipCanvas">{{ ICON.INFO }}</span>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'

import { useCellStore } from '@/stores/cellStore'

import { broadcastStateSync } from '@/services/socket'

import { CELL_CATEGORY, FREQ_REGIME } from '@/constants/strings'
import { ICON } from '@/constants/icons'
import { UNIT } from '@/constants/units'
import { HMAP_LYSIS_DR, HMAP_WARN_DR, HMAP_THERM_WARN_C, HMAP_THERM_CRIT_C, HMAP_DR_DISPLAY_CAP, HMAP_SEL_INFINITY_CAP, HMAP_SKIN_DEPTH_OK_MM, HMAP_SKIN_DEPTH_WARN_MM } from '@/constants/heatmap'

import { tipCanvas, tipStats, tipOptLine, tipPLysis, tipRegime, tipSkinDepth } from '@/tooltips/heatmapTooltips'
export default defineComponent({
  props: {
    opZoneColor: { type: String, default: 'var(--color-text)' },
  },

  computed: {
    ...mapStores(useCellStore),
    ICON() { return ICON },
    tDrPct(): string {
      return (Math.min(this.cellStore.targetDisruptionRatio,  HMAP_DR_DISPLAY_CAP) * 100).toFixed(1)
    },

    hDrPct(): string {
      return (Math.min(this.cellStore.healthyDisruptionRatio, HMAP_DR_DISPLAY_CAP) * 100).toFixed(1)
    },

    healthyTssStr(): string {
      return `${this.cellStore.healthySteadyStateTemp.toFixed(1)} ${UNIT.DEG_C}`
    },

    pLysisStr(): string {
      if (this.cellStore.isResonanceMode) {
        if (this.cellStore.targetCellCategory !== CELL_CATEGORY.MAMMALIAN) return '\u2014'
      }
      return `${(this.cellStore.targetLysisProbabilityRandom * 100).toFixed(0)}%`
    },

    selStr(): string {
      const sel = this.cellStore.selectivityRatio
      return sel >= HMAP_SEL_INFINITY_CAP ? ICON.INFINITY : sel.toFixed(2)
    },

    healthyDrClass(): string {
      const dr = this.cellStore.healthyDisruptionRatio
      if (dr >= HMAP_LYSIS_DR) return 'hmap__stat-v--danger'
      if (dr >= HMAP_WARN_DR)  return 'hmap__stat-v--warn'
      return ''
    },

    tempClass(): string {
      const T = this.cellStore.healthySteadyStateTemp
      if (T >= HMAP_THERM_CRIT_C) return 'hmap__stat-v--danger'
      if (T >= HMAP_THERM_WARN_C) return 'hmap__stat-v--warn'
      return ''
    },

    showSkinDepth(): boolean {
      return this.cellStore.freqRegime === FREQ_REGIME.NEARFIELD_RF || this.cellStore.freqRegime === FREQ_REGIME.MICROWAVE
    },

    skinDepthStr(): string {
      const d = this.cellStore.skinDepthMm
      if (!isFinite(d)) return '\u221e'
      return d >= 10 ? `${d.toFixed(0)} ${UNIT.MM}` : `${d.toFixed(1)} ${UNIT.MM}`
    },

    skinDepthClass(): string {
      const d = this.cellStore.skinDepthMm
      if (d >= HMAP_SKIN_DEPTH_OK_MM)   return 'hmap__stat-v--ok'
      if (d >= HMAP_SKIN_DEPTH_WARN_MM) return 'hmap__stat-v--warn'
      return 'hmap__stat-v--danger'
    },

    tipCanvas():    string { return tipCanvas() },
    tipStats():     string { return tipStats() },
    tipOptLine():   string { return tipOptLine() },
    tipPLysis():    string { return tipPLysis() },
    tipRegime():    string { return tipRegime() },
    tipSkinDepth(): string { return tipSkinDepth() },
  },

  methods: {
    snapToOptimal() {
      const { freqMin, freqMax } = this.cellStore.sliderRanges
      const clamped = Math.round(Math.max(freqMin, Math.min(freqMax, this.cellStore.optimalFreqResult.khz)))
      this.cellStore.setBroadcastFreqKHz(clamped)
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
  background: color-mix(in srgb, black 20%, transparent);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  cursor: default;
}

.hmap__stats-label {
  font-size: var(--fs-xxs);
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
  font-size: var(--fs-xxs);
  font-family: var(--font-mono);
  color: var(--color-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  flex-shrink: 0;
}

.hmap__stat-v {
  font-size: var(--fs-sm);
  font-family: var(--font-mono);
  font-weight: 700;
  color: var(--color-text);
  transition: color var(--tr-slow);

  &--warn   { color: var(--color-amber); }
  &--danger { color: var(--color-danger); }
  &--ok     { color: var(--color-lime); }
  &--zone   { color: var(--op-zone-color, var(--color-text)); }
}

.hmap__stat-badge {
  font-size: var(--fs-xxs);
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  padding: 0.15rem 0.45rem;
  border-radius: 3px;
  border: 1px solid;

  &--regime {
    &--electrolytic { color: var(--color-primary); border-color: color-mix(in srgb, var(--color-primary) 35%, transparent); background: color-mix(in srgb, var(--color-primary) 7%, transparent); }
    &--nearfield_rf { color: var(--color-amber);   border-color: color-mix(in srgb, var(--color-amber) 35%, transparent); background: color-mix(in srgb, var(--color-amber) 7%, transparent); }
    &--microwave    { color: var(--color-danger);  border-color: color-mix(in srgb, var(--color-danger) 35%, transparent); background: color-mix(in srgb, var(--color-danger) 7%, transparent); }
  }
}

.hmap__info-btn {
  font-size: var(--fs-xs);
  color: var(--color-text-muted);
  opacity: var(--op-muted);
  cursor: default;
  flex-shrink: 0;
  transition: opacity var(--tr-fast);

  &:hover { opacity: 1; }
}

.hmap__snap-btn {
  margin-left: auto;
  background: color-mix(in srgb, var(--color-amber) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-amber) 35%, transparent);
  border-radius: 3px;
  color: var(--color-amber);
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  letter-spacing: 0.06em;
  padding: 0.18rem 0.55rem;
  cursor: pointer;
  transition: background var(--tr-fast), border-color var(--tr-fast);
  white-space: nowrap;

  &:hover {
    background: color-mix(in srgb, var(--color-amber) 20%, transparent);
    border-color: color-mix(in srgb, var(--color-amber) 65%, transparent);
  }
}
</style>
