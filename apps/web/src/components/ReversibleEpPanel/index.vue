<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="rev-ep">
    <AccordionPanel
      :icon="ICON.NUCLEUS"
      :title="$t('revEp.title')"
      :subtitle="subtitle"
    >
      <div class="rev-ep__body">

        <p class="rev-ep__hint">{{ $t('revEp.hint') }}</p>

        <!-- Cargo MW selector: preset chips + custom field -->
        <div class="rev-ep__row">
          <span class="rev-ep__row-label">{{ $t('revEp.cargoLabel') }}</span>
          <div class="rev-ep__chips">
            <button
              v-for="preset in CARGO_PRESETS"
              :key="preset.mw"
              type="button"
              class="rev-ep__chip"
              :class="{ 'rev-ep__chip--active': isActivePreset(preset.mw) }"
              v-tip="$t(preset.tipKey)"
              @click="setCargo(preset.mw)"
            >
              <span class="rev-ep__chip-name">{{ $t(preset.labelKey) }}</span>
              <span class="rev-ep__chip-mw">{{ formatMw(preset.mw) }}</span>
            </button>
          </div>
        </div>
        <div class="rev-ep__row rev-ep__row--custom">
          <span class="rev-ep__row-label">{{ $t('revEp.cargoCustom') }}</span>
          <input
            class="rev-ep__custom-input"
            type="number"
            min="100"
            max="10000000"
            step="100"
            :value="cellStore.cargoMolecularWeightDa"
            @input="onCustomMw"
          />
          <span class="rev-ep__custom-unit">Da</span>
        </div>

        <!-- Live uptake + resealing readouts -->
        <div class="rev-ep__readouts">
          <StatCard
            :label="$t('revEp.targetUptakeLabel')"
            :value="formatPct(targetUptake)"
            :sub="targetSubLabel"
            :variant="targetUptakeVariant"
            :tooltip="$t('revEp.targetUptakeTip')"
          />
          <StatCard
            :label="$t('revEp.healthyUptakeLabel')"
            :value="formatPct(healthyUptake)"
            :sub="$t('revEp.healthyUptakeSub')"
            :variant="healthyUptakeVariant"
            :tooltip="$t('revEp.healthyUptakeTip')"
          />
          <StatCard
            :label="$t('revEp.resealLabel')"
            :value="formatReseal(cellStore.targetResealingTimeS)"
            :sub="$t('revEp.resealSub')"
            variant="info"
            :tooltip="$t('revEp.resealTip')"
          />
        </div>

        <!-- Uptake bell curve with operating-point marker -->
        <div class="rev-ep__chart-wrap" v-tip="$t('revEp.chartTip')">
          <svg viewBox="0 0 320 110" class="rev-ep__chart" preserveAspectRatio="none">
            <!-- Window shading: reversible-EP zone -->
            <rect :x="xWindowLow" y="6" :width="xWindowHigh - xWindowLow" height="86" class="rev-ep__chart-window" />
            <!-- Curve -->
            <path :d="curvePath" class="rev-ep__chart-curve" />
            <!-- Lysis-zone marker -->
            <line :x1="xLysis" :x2="xLysis" y1="6" y2="92" class="rev-ep__chart-lysis" />
            <text :x="xLysis - 4" y="20" class="rev-ep__chart-axis-end">{{ $t('revEp.chartLysis') }}</text>
            <!-- Operating-point marker -->
            <circle :cx="xTarget" :cy="yTarget" r="4" class="rev-ep__chart-target" />
            <text :x="xTarget + 6" :y="Math.max(14, yTarget - 4)" class="rev-ep__chart-target-label">T</text>
            <circle :cx="xHealthy" :cy="yHealthy" r="3" class="rev-ep__chart-healthy" />
            <!-- Axis labels -->
            <text x="6"   y="105" class="rev-ep__chart-axis">DR 40%</text>
            <text x="160" y="105" class="rev-ep__chart-axis-mid">DR 65%</text>
            <text x="294" y="105" class="rev-ep__chart-axis-end">90%</text>
          </svg>
        </div>

        <p class="rev-ep__caveat">{{ $t('revEp.caveat') }}</p>
      </div>
    </AccordionPanel>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'

import { useCellStore } from '@/stores/cellStore'

import AccordionPanel from '@/components/AccordionPanel/index.vue'
import StatCard from '@/components/StatCard/index.vue'

import { ICON } from '@/constants/icons'

interface CargoPreset {
  mw:       number
  labelKey: string
  tipKey:   string
}

const CARGO_PRESETS: ReadonlyArray<CargoPreset> = [
  { mw:       668, labelKey: 'revEp.cargoPiName',     tipKey: 'revEp.cargoPiTip'     },
  { mw:     5_000, labelKey: 'revEp.cargoSmallPepName', tipKey: 'revEp.cargoSmallPepTip' },
  { mw:    13_000, labelKey: 'revEp.cargoSiRnaName',   tipKey: 'revEp.cargoSiRnaTip'  },
  { mw:    50_000, labelKey: 'revEp.cargoMidPepName',  tipKey: 'revEp.cargoMidPepTip' },
  { mw:   150_000, labelKey: 'revEp.cargoIggName',     tipKey: 'revEp.cargoIggTip'    },
  { mw: 3_000_000, labelKey: 'revEp.cargoPlasmidName', tipKey: 'revEp.cargoPlasmidTip' },
]

export default defineComponent({
  name: 'ReversibleEpPanel',

  components: { AccordionPanel, StatCard },

  computed: {
    ICON() { return ICON },
    CARGO_PRESETS() { return CARGO_PRESETS },
    ...mapStores(useCellStore),

    targetUptake(): number  { return this.cellStore.targetUptakeFraction },
    healthyUptake(): number { return this.cellStore.healthyUptakeFraction },

    subtitle(): string {
      const pct = (this.targetUptake * 100).toFixed(0)
      return this.$t('revEp.subtitle', { pct })
    },

    // ── Operating-point classes ───────────────────────────────────────────────

    targetSubLabel(): string {
      const dr = this.cellStore.targetDisruptionRatio
      if (dr < 0.50) return this.$t('revEp.targetSubBelow')
      if (dr >= 0.85) return this.$t('revEp.targetSubLysis')
      return this.$t('revEp.targetSubInWindow')
    },

    targetUptakeVariant(): string {
      if (this.targetUptake >= 0.50) return 'good'
      if (this.targetUptake >= 0.20) return 'warn'
      return 'muted'
    },

    healthyUptakeVariant(): string {
      // For healthy cells UPTAKE means off-target damage — invert the colour scale.
      if (this.healthyUptake <= 0.05) return 'good'
      if (this.healthyUptake <= 0.20) return 'warn'
      return 'danger'
    },

    // ── Chart geometry ────────────────────────────────────────────────────────

    curvePath(): string {
      const pts = this.cellStore.uptakeWindowCurve
      if (pts.length === 0) return ''
      let d = ''
      for (let i = 0; i < pts.length; i++) {
        const x = this._xFromDr(pts[i]!.dr)
        const y = this._yFromUptake(pts[i]!.uptake)
        d += (i === 0 ? 'M' : ' L') + ' ' + x.toFixed(1) + ' ' + y.toFixed(1)
      }
      return d
    },

    xWindowLow(): number  { return this._xFromDr(0.50) },
    xWindowHigh(): number { return this._xFromDr(0.85) },
    xLysis(): number      { return this._xFromDr(0.85) },

    xTarget(): number  { return this._xFromDr(this.cellStore.targetDisruptionRatio) },
    yTarget(): number  { return this._yFromUptake(this.targetUptake) },
    xHealthy(): number { return this._xFromDr(this.cellStore.healthyDisruptionRatio) },
    yHealthy(): number { return this._yFromUptake(this.healthyUptake) },
  },

  methods: {
    isActivePreset(mw: number): boolean {
      return Math.abs(this.cellStore.cargoMolecularWeightDa - mw) < 1
    },

    setCargo(mw: number): void {
      this.cellStore.setCargoMolecularWeightDa(mw)
    },

    onCustomMw(evt: Event): void {
      const v = Number((evt.target as HTMLInputElement).value)
      if (Number.isFinite(v)) this.cellStore.setCargoMolecularWeightDa(v)
    },

    formatMw(da: number): string {
      if (da >= 1_000_000) return `${(da / 1_000_000).toFixed(1)} MDa`
      if (da >=     1_000) return `${(da /     1_000).toFixed(0)} kDa`
      return `${da} Da`
    },

    formatPct(v: number): string {
      return `${(v * 100).toFixed(0)}%`
    },

    formatReseal(s: number): string {
      if (s <= 0) return '—'
      if (s < 1)  return `${(s * 1000).toFixed(0)} ms`
      return `${s.toFixed(1)} s`
    },

    _xFromDr(dr: number): number {
      const d = Math.max(0.40, Math.min(0.90, dr))
      return 8 + ((d - 0.40) / 0.50) * 304
    },

    _yFromUptake(u: number): number {
      const v = Math.max(0, Math.min(1, u))
      // Pad top by 8 px so peak isn't flush with the chart frame.
      return 92 - v * 80
    },
  },
})
</script>

<style lang="scss" scoped>
.rev-ep {
  &__body {
    @include flex-col(0.85rem);
    padding: 0.85rem 1rem 1rem;
  }

  &__hint {
    margin: 0;
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
    line-height: 1.45;
  }

  &__row {
    @include flex-row(0.7rem);
    align-items: center;
    flex-wrap: wrap;

    &--custom {
      gap: 0.5rem;
    }
  }

  &__row-label {
    @include mono-upper(var(--fs-xxs), 0.06em);
    color: var(--color-text-muted);
    flex-shrink: 0;
  }

  &__chips {
    @include flex-row(0.4rem);
    flex-wrap: wrap;
  }

  &__chip {
    @include flex-col(0.05rem);
    padding: 0.3rem 0.55rem;
    background: color-mix(in srgb, var(--color-text) 5%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-text) 18%, transparent);
    border-radius: var(--radius);
    color: var(--color-text-muted);
    cursor: pointer;
    transition: border-color var(--tr-fast), background var(--tr-fast), color var(--tr-fast);

    &:hover { border-color: color-mix(in srgb, var(--color-primary) 35%, transparent); }

    &--active {
      @include color-variant(primary, 50%, 10%);
    }
  }

  &__chip-name {
    font-size: var(--fs-xxs);
    font-weight: 500;
  }

  &__chip-mw {
    @include mono-upper(var(--fs-xxs), 0.04em);
    opacity: var(--op-dim);
  }

  &__custom-input {
    width: 7rem;
    padding: 0.3rem 0.5rem;
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    color: var(--color-text);
    background: color-mix(in srgb, var(--color-text) 5%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-text) 18%, transparent);
    border-radius: var(--radius);
    outline: none;

    &:focus { border-color: var(--color-primary); }
  }

  &__custom-unit {
    @include mono-upper(var(--fs-xxs), 0.04em);
    color: var(--color-text-muted);
  }

  &__readouts {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.55rem;

    @media (min-width: 720px) { grid-template-columns: repeat(3, 1fr); }
  }

  &__chart-wrap {
    width: 100%;
    aspect-ratio: 320 / 110;
    background: color-mix(in srgb, var(--color-text) 4%, transparent);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    padding: 0.3rem;
  }

  &__chart {
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  &__chart-window {
    fill: color-mix(in srgb, var(--color-primary) 10%, transparent);
  }

  &__chart-curve {
    fill: none;
    stroke: var(--color-primary);
    stroke-width: 1.5;
  }

  &__chart-lysis {
    stroke: color-mix(in srgb, var(--color-danger) 60%, transparent);
    stroke-width: 1;
    stroke-dasharray: 3 3;
  }

  &__chart-target {
    fill: var(--color-danger);
    stroke: var(--color-bg);
    stroke-width: 1;
  }

  &__chart-target-label {
    fill: var(--color-danger);
    font-family: var(--font-mono);
    font-size: 9px;
    font-weight: 600;
  }

  &__chart-healthy {
    fill: var(--color-primary);
    stroke: var(--color-bg);
    stroke-width: 1;
  }

  &__chart-axis,
  &__chart-axis-mid,
  &__chart-axis-end {
    fill: var(--color-text-muted);
    font-family: var(--font-mono);
    font-size: 8px;
  }

  &__chart-axis-mid { text-anchor: middle; }
  &__chart-axis-end { text-anchor: end; }

  &__caveat {
    margin: 0;
    font-size: var(--fs-xxs);
    color: var(--color-text-muted);
    opacity: var(--op-dim);
    line-height: 1.5;
  }
}
</style>
