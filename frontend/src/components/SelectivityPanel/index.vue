<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="sel-panel">

    <AccordionPanel
      :icon="ICON.SELECTIVITY"
      :title="$t('selectivity.title')"
      :subtitle="toggleSubtitle"
      :initial-open="true"
      :compact="true"
    >
    <div class="sel-panel__body">

      <!-- ── Selectivity ratio + Vm selectivity ──────────────────── -->
      <div class="sel-panel__ratio-wrap" v-tip="tipSelectivity">
        <span class="sel-panel__ratio" :class="selectivityClass">
          ×{{ selectivity.toFixed(2) }}
        </span>
        <div class="sel-panel__ratio-labels">
          <span class="sel-panel__ratio-label">{{ $t('selectivity.ratioLabel') }}</span>
          <span class="sel-panel__ti-label">Vm ×<span>{{ vmSelectivityRatio >= 99 ? ICON.INFINITY : vmSelectivityRatio.toFixed(2) }}</span></span>
        </div>
      </div>

      <!-- ── σ_i uncertainty band on TI (Schwan mode only) ─────── -->
      <div v-if="showTiUncertainty" class="sel-panel__ti-range" v-tip="tipTiRange">
        <span class="sel-panel__ti-range-label">{{ $t('selectivity.sigmaIRange') }}</span>
        <span class="sel-panel__ti-range-val">
          [×{{ tiRange.low.toFixed(2) }} - ×{{ tiRange.high >= 99 ? ICON.INFINITY : tiRange.high.toFixed(2) }}]
        </span>
      </div>

      <!-- ── Disruption progress bars ──────────────────────────── -->
      <div class="sel-panel__sep"></div>
      <DisruptionBars />

      <!-- ── Random-orientation lysis fraction ─────────────────── -->
      <div class="sel-panel__orient-row" v-tip="$t('selectivity.tipOrientFrac')">
        <span class="sel-panel__orient-label">{{ $t('selectivity.orientFracLabel') }}</span>
        <div class="sel-panel__orient-vals">
          <span class="sel-panel__orient-t">T {{ targetOrientPct }}</span>
          <span class="sel-panel__orient-h">H {{ healthyOrientPct }}</span>
        </div>
      </div>

      <!-- ── DEP (Schwan mode only) ─────────────────────────────── -->
      <template v-if="store.chartMode !== 'resonance'">
        <div class="sel-panel__sep"></div>
        <DepSection />
      </template>

      <!-- ── Vm / SAR readout ───────────────────────────────────── -->
      <div class="sel-panel__sep"></div>
      <VmSarGrid />

      <!-- ── Resonance physics (resonance mode + resonance target) ─ -->
      <ResonanceInfo v-if="isResonanceTarget && store.chartMode === CHART_MODE.RESONANCE" />

      <!-- ── Mode badge + optimal snap + physics warning ────────── -->
      <ModeBadge />

      <!-- ── Preset selectivity comparison ─────────────────────── -->
      <div class="sel-panel__sep"></div>
      <ComparisonTable />

    </div><!-- /slot content -->
    </AccordionPanel>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useCellStore } from '@/stores/cellStore'
import { THRESHOLDS, NEAR_ZERO_VM } from '@/constants/physics'
import { CELL_CATEGORY, CHART_MODE } from '@/constants/strings'
import { ICON } from '@/constants/icons'
import { safeRatio } from '@/utils/physics'
import { tipTiRange, tipSelectivity } from '@/tooltips/selectivityTooltips'
import AccordionPanel from '@/components/AccordionPanel.vue'
import DisruptionBars from './DisruptionBars.vue'
import ComparisonTable from './ComparisonTable.vue'
import DepSection from './DepSection.vue'
import VmSarGrid from './VmSarGrid.vue'
import ResonanceInfo from './ResonanceInfo.vue'
import ModeBadge from './ModeBadge.vue'

export default defineComponent({
  components: { AccordionPanel, DisruptionBars, ComparisonTable, DepSection, VmSarGrid, ResonanceInfo, ModeBadge },

  setup() {
    return { store: useCellStore(), CHART_MODE, ICON }
  },

  computed: {
    selectivity(): number { return this.store.selectivityRatio },

    isResonanceTarget(): boolean {
      const cat = this.store.targetCellCategory
      const t = this.store.target as { resonantFreqGHz?: number; resonantThresholdVcm?: number }
      return (cat === CELL_CATEGORY.VIRUS || cat === CELL_CATEGORY.BACTERIA) && !!t.resonantFreqGHz && !!t.resonantThresholdVcm
    },

    toggleSubtitle(): string {
      const sel = this.selectivity
      const selStr = sel >= 99 ? ICON.INFINITY : `×${sel.toFixed(2)}`
      const t = this.store.targetDisruptionRatio, h = this.store.healthyDisruptionRatio
      const modeLabel = (() => {
        if (h >= THRESHOLDS.DISRUPTION_WARN)                                        return this.$t('selectivity.modeAblative')
        if (t >= THRESHOLDS.DISRUPTION_WARN && h < THRESHOLDS.HEALTHY_APPROACHING) return this.$t('selectivity.modeTherapeutic')
        if (t >= THRESHOLDS.DISRUPTION_WARN)                                        return this.$t('selectivity.modeMarginal')
        if (t >= THRESHOLDS.HEALTHY_APPROACHING)                                    return this.$t('selectivity.modeApproaching')
        return this.$t('selectivity.modeSubThreshold')
      })()
      return `TI ${selStr} · ${modeLabel}`
    },

    selectivityClass(): string {
      if (this.selectivity >= THRESHOLDS.SEL_STRONG)   return 'sel-panel__ratio--strong'
      if (this.selectivity >= THRESHOLDS.SEL_MARGINAL) return 'sel-panel__ratio--marginal'
      return 'sel-panel__ratio--weak'
    },

    vmSelectivityRatio(): number {
      return safeRatio(this.store.targetVm, this.store.healthyVm, THRESHOLDS.TI_DISPLAY_CAP, NEAR_ZERO_VM)
    },

    tiRange(): { low: number; high: number } { return this.store.tiUncertaintyRange },

    showTiUncertainty(): boolean {
      return this.store.chartMode !== 'resonance' && Math.abs(this.tiRange.high - this.tiRange.low) > 0.01
    },

    tipTiRange(): string {
      const { low, high } = this.tiRange
      const { RADIUS_VIRUS_MAX: rv, RADIUS_BACTERIA_MAX: rb } = THRESHOLDS
      const uncH = this.store.healthy.radius < rb ? '35%' : '20%'
      const uncT = this.store.target.radius < rv ? '45%' : this.store.target.radius < rb ? '35%' : '20%'
      return tipTiRange({ low, high, uncH, uncT })
    },

    tipSelectivity(): string {
      return tipSelectivity({
        sel:               this.selectivity,
        vmSel:             this.vmSelectivityRatio,
        isResonanceTarget: this.isResonanceTarget,
      })
    },

    targetOrientPct(): string {
      if (this.store.chartMode === CHART_MODE.RESONANCE && this.isResonanceTarget) return ', '
      return `${(this.store.targetLysisProbabilityRandom * 100).toFixed(0)}%`
    },

    healthyOrientPct(): string {
      return `${(this.store.healthyLysisProbabilityRandom * 100).toFixed(0)}%`
    },
  },
})
</script>

<style lang="scss" scoped>
@use '../../styles/mixins' as *;

.sel-panel {
  @include surface-card(var(--radius));
  padding: 0 1.1rem;
  @include flex-col(0);

  /* ── Body ──────────────────────────────────────────────────── */
  &__body {
    @include flex-col(0.75rem);
    padding-bottom: 0.75rem;
  }

  /* ── Separator ─────────────────────────────────────────────── */
  &__sep {
    height: 1px;
    background: var(--color-border);
    opacity: 0.5;
    margin: 0.1rem 0;
    flex-shrink: 0;
  }

  /* ── Selectivity ratio ─────────────────────────────────────── */
  &__ratio-wrap { display: flex; align-items: baseline; gap: 0.6rem; }

  &__ratio {
    font-size: 2rem;
    font-weight: 800;
    font-family: var(--font-mono);
    letter-spacing: -0.04em;
    line-height: 1;
    transition: color 0.4s;
    flex-shrink: 0;

    &--strong   { color: var(--color-lime); }
    &--marginal { color: var(--color-amber); }
    &--weak     { color: var(--color-danger); }
  }

  &__ratio-labels { @include flex-col(0.1rem); }
  &__ratio-label  { @include mono-upper(0.6rem); color: var(--color-text); }
  &__ti-label     { @include mono-upper(0.6rem, 0.06em); color: var(--color-text-muted); }

  /* ── TI uncertainty range ──────────────────────────────────── */
  &__ti-range { @include flex-row(0.4rem); margin-top: -0.3rem; }

  &__ti-range-label {
    font-size: 0.56rem;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    opacity: 0.7;
  }

  &__ti-range-val {
    font-size: 0.58rem;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    letter-spacing: 0.02em;
    cursor: help;
  }

  /* ── Random-orientation lysis fraction ─────────────────────── */
  &__orient-row {
    @include flex-between(0.4rem);
    padding: 0.25rem 0.5rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    cursor: default;
  }

  &__orient-label { @include mono-upper(0.56rem, 0.07em); color: var(--color-text-muted); flex-shrink: 0; }
  &__orient-vals  { @include flex-row(0.7rem); flex-shrink: 0; }

  &__orient-t { font-size: 0.66rem; font-family: var(--font-mono); font-weight: 600; color: var(--color-danger); }
  &__orient-h { font-size: 0.66rem; font-family: var(--font-mono); font-weight: 600; color: var(--color-primary); }
}
</style>
