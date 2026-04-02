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
          {{ ICON.TIMES }}{{ selectivity.toFixed(2) }}
        </span>
        <div class="sel-panel__ratio-labels">
          <span class="sel-panel__ratio-label">{{ $t('selectivity.ratioLabel') }}</span>
          <span class="sel-panel__ti-label">{{ $t('selectivity.vmSelLabel') }} {{ ICON.TIMES }}<span>{{ vmSelectivityRatio >= 99 ? ICON.INFINITY : vmSelectivityRatio.toFixed(2) }}</span></span>
        </div>
      </div>

      <!-- ── Population window score (lysis prob × healthy survival) ── -->
      <div class="sel-panel__ws-row" v-tip="tipWindowScore">
        <span class="sel-panel__ws-label">{{ $t('selectivity.windowScoreLabel') }}</span>
        <span class="sel-panel__ws-val" :class="windowScoreClass">{{ windowScorePct }}</span>
        <span class="sel-panel__ws-formula">{{ $t('selectivity.wsFormula') }}</span>
      </div>

      <!-- ── σ_i uncertainty band on TI (Schwan mode only) ─────── -->
      <div v-if="showTiUncertainty" class="sel-panel__ti-range" v-tip="tipTiRange">
        <span class="sel-panel__ti-range-label">{{ $t('selectivity.sigmaIRange') }}</span>
        <span class="sel-panel__ti-range-val">
          [{{ ICON.TIMES }}{{ tiRange.low.toFixed(2) }} - {{ ICON.TIMES }}{{ tiRange.high >= 99 ? ICON.INFINITY : tiRange.high.toFixed(2) }}]
        </span>
      </div>

      <!-- ── Small-cell selectivity disadvantage note ───────────── -->
      <div v-if="smallCellNote" class="sel-panel__size-note" :class="{ 'sel-panel__size-note--inverted': selectionInverted }" v-tip="smallCellNoteTip">
        <span class="sel-panel__size-note-icon">{{ ICON.WARNING }}</span>
        <span class="sel-panel__size-note-label">{{ $t('selectivity.smallCellNoteLabel') }}</span>
        <span class="sel-panel__size-note-val">R_T/R_H = {{ smallCellRadiusRatio }}</span>
        <span class="sel-panel__size-note-limit">TI_DC ≤ {{ smallCellTiDcLimit }}</span>
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

      <!-- ── Population + size distribution lysis fraction ─────── -->
      <div class="sel-panel__orient-row sel-panel__orient-row--popdist" v-tip="$t('selectivity.tipPopDist')">
        <span class="sel-panel__orient-label">{{ $t('selectivity.popDistLabel') }}</span>
        <div class="sel-panel__orient-vals">
          <span class="sel-panel__orient-t">T {{ targetPopDistPct }}</span>
          <span class="sel-panel__orient-h">H {{ healthyPopDistPct }}</span>
        </div>
      </div>

      <!-- ── DEP (Schwan mode only) ─────────────────────────────── -->
      <template v-if="!cellStore.isResonanceMode">
        <div class="sel-panel__sep"></div>
        <DepSection />
      </template>

      <!-- ── Vm / SAR readout ───────────────────────────────────── -->
      <div class="sel-panel__sep"></div>
      <VmSarGrid />

      <!-- ── Resonance physics (resonance mode + resonance target) ─ -->
      <ResonanceInfo v-if="isResonanceSectionVisible" />

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
import { mapStores } from 'pinia'
import { useCellStore } from '@/stores/cellStore'
import { THRESHOLDS, NEAR_ZERO_VM, H_FIRE_THRESHOLD_MULTIPLIER } from '@/constants/physics'
import { CELL_CATEGORY, CHART_MODE, WAVEFORM } from '@/constants/strings'
import { ICON } from '@/constants/icons'
import { safeRatio, tempCorrectedVth } from '@/utils/physics'
import { formatPct } from '@/utils/format'
import { tipTiRange, tipSelectivity, tipSmallCellNote } from '@/tooltips/selectivityTooltips'
import AccordionPanel from '@/components/AccordionPanel.vue'
import DisruptionBars from './DisruptionBars.vue'
import ComparisonTable from './ComparisonTable.vue'
import DepSection from './DepSection.vue'
import VmSarGrid from './VmSarGrid.vue'
import ResonanceInfo from './ResonanceInfo.vue'
import ModeBadge from './ModeBadge.vue'

export default defineComponent({
  components: { AccordionPanel, DisruptionBars, ComparisonTable, DepSection, VmSarGrid, ResonanceInfo, ModeBadge },

  data() {
    return { CHART_MODE, ICON }
  },

  computed: {
    ...mapStores(useCellStore),
    selectivity(): number { return this.cellStore.selectivityRatio },

    isResonanceSectionVisible(): boolean { return this.isResonanceTarget && this.cellStore.isResonanceMode },

    isResonanceTarget(): boolean {
      const cat = this.cellStore.targetCellCategory
      const t = this.cellStore.target as { resonantFreqGHz?: number; resonantThresholdVcm?: number }
      return (cat === CELL_CATEGORY.VIRUS || cat === CELL_CATEGORY.BACTERIA) && !!t.resonantFreqGHz && !!t.resonantThresholdVcm
    },

    toggleSubtitle(): string {
      const sel = this.selectivity
      const selStr = sel >= 99 ? ICON.INFINITY : `×${sel.toFixed(2)}`
      const t = this.cellStore.targetDisruptionRatio, h = this.cellStore.healthyDisruptionRatio
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
      return safeRatio(this.cellStore.targetVm, this.cellStore.healthyVm, THRESHOLDS.TI_DISPLAY_CAP, NEAR_ZERO_VM)
    },

    tiRange(): { low: number; high: number } { return this.cellStore.tiUncertaintyRange },

    showTiUncertainty(): boolean {
      return !this.cellStore.isResonanceMode && Math.abs(this.tiRange.high - this.tiRange.low) > 0.01
    },

    tipTiRange(): string {
      const { low, high } = this.tiRange
      const { RADIUS_VIRUS_MAX: rv, RADIUS_BACTERIA_MAX: rb } = THRESHOLDS
      const uncH = this.cellStore.healthy.radius < rb
        ? `${(THRESHOLDS.UNCERTAINTY_BACTERIA  * 100).toFixed(0)}%`
        : `${(THRESHOLDS.UNCERTAINTY_MAMMALIAN * 100).toFixed(0)}%`
      const uncT = this.cellStore.target.radius < rv
        ? `${(THRESHOLDS.UNCERTAINTY_VIRUS    * 100).toFixed(0)}%`
        : this.cellStore.target.radius < rb
          ? `${(THRESHOLDS.UNCERTAINTY_BACTERIA  * 100).toFixed(0)}%`
          : `${(THRESHOLDS.UNCERTAINTY_MAMMALIAN * 100).toFixed(0)}%`
      return tipTiRange({ low, high, uncH, uncT })
    },

    tipSelectivity(): string {
      return tipSelectivity({
        sel:               this.selectivity,
        vmSel:             this.vmSelectivityRatio,
        isResonanceTarget: this.isResonanceTarget,
        tiDc:              this.cellStore.tiQuasiDc,
        tiHighFreqLimit:   this.cellStore.tiHighFreqLimit,
        targetLabel:       this.cellStore.target.label,
        healthyLabel:      this.cellStore.healthy.label,
      })
    },

    targetOrientPct(): string {
      if (this.cellStore.isResonanceMode && this.isResonanceTarget) return ', '
      return formatPct(this.cellStore.targetLysisProbabilityRandom)
    },

    healthyOrientPct(): string {
      return formatPct(this.cellStore.healthyLysisProbabilityRandom)
    },

    targetPopDistPct(): string {
      if (this.cellStore.isResonanceMode && this.isResonanceTarget) return ', '
      return formatPct(this.cellStore.targetPopulationLysisFraction)
    },

    healthyPopDistPct(): string {
      return formatPct(this.cellStore.healthyPopulationLysisFraction)
    },

    windowScore(): number {
      const pT = this.cellStore.targetLysisProbabilityRandom
      const pH = this.cellStore.healthyLysisProbabilityRandom
      return pT * (1 - pH)
    },

    windowScorePct(): string { return formatPct(this.windowScore) },

    cellSizeParams(): { rT: number; rH: number; vthT: number; vthH: number } {
      const hfireMult = this.cellStore.waveform === WAVEFORM.H_FIRE ? H_FIRE_THRESHOLD_MULTIPLIER : 1.0
      return {
        rT:   this.cellStore.target.radius,
        rH:   this.cellStore.healthy.radius,
        vthT: tempCorrectedVth(this.cellStore.target.thresholdVoltage,  this.cellStore.targetTemp)  * hfireMult,
        vthH: tempCorrectedVth(this.cellStore.healthy.thresholdVoltage, this.cellStore.healthyTemp) * hfireMult,
      }
    },

    windowScoreClass(): string {
      const s = this.windowScore
      if (s >= THRESHOLDS.WINDOW_SCORE_GOOD)     return 'sel-panel__ws-val--good'
      if (s >= THRESHOLDS.WINDOW_SCORE_MARGINAL) return 'sel-panel__ws-val--marginal'
      return 'sel-panel__ws-val--poor'
    },

    smallCellNote(): boolean {
      if (this.cellStore.isResonanceMode) return false
      const { rT, rH, vthT, vthH } = this.cellSizeParams
      if (rT >= rH) return false
      const tiDc = (rT * vthH) / (rH * vthT)
      return tiDc < THRESHOLDS.TI_STRONG
    },

    selectionInverted(): boolean {
      const { rT, rH, vthT, vthH } = this.cellSizeParams
      return (rT * vthH) / (rH * vthT) < 1.0
    },

    smallCellRadiusRatio(): string {
      const { rT, rH } = this.cellSizeParams
      return (rT / rH).toFixed(2)
    },

    smallCellTiDcLimit(): string {
      const { rT, rH, vthT, vthH } = this.cellSizeParams
      return ((rT * vthH) / (rH * vthT)).toFixed(2)
    },

    smallCellNoteTip(): string {
      return tipSmallCellNote(this.cellSizeParams)
    },

    tipWindowScore(): string {
      const pT = formatPct(this.cellStore.targetLysisProbabilityRandom)
      const pH = formatPct(this.cellStore.healthyLysisProbabilityRandom)
      return this.$t('selectivity.tipWindowScore', { score: this.windowScorePct, pT, pH })
    },
  },
})
</script>

<style lang="scss" scoped>


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
    opacity: 0.5; // intentional between-tier value
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
    transition: color 0.4s; // intentionally slower than --tr-slow for large TI number colour shift
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
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    opacity: var(--op-dim);
  }

  &__ti-range-val {
    font-size: var(--fs-xs);
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    letter-spacing: 0.02em;
    cursor: help;
  }

  /* ── Small-cell size disadvantage note ─────────────────────── */
  &__size-note {
    @include flex-row(0.35rem);
    align-items: center;
    flex-wrap: wrap;
    padding: 0.22rem 0.45rem;
    border-radius: 3px;
    background: color-mix(in srgb, var(--color-amber) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-amber) 30%, transparent);
    margin-top: -0.1rem;
    cursor: help;

    &--inverted {
      background: color-mix(in srgb, var(--color-danger) 10%, transparent);
      border-color: color-mix(in srgb, var(--color-danger) 40%, transparent);

      .sel-panel__size-note-label { color: var(--color-danger); }
      .sel-panel__size-note-val   { color: var(--color-danger); }
    }
  }

  &__size-note-icon {
    font-size: var(--fs-xxs);
    line-height: 1;
    flex-shrink: 0;
  }

  &__size-note-label {
    @include mono-upper(var(--fs-xxs));
    color: var(--color-amber);
    font-weight: 700;
    flex-shrink: 0;
  }

  &__size-note-val {
    font-size: var(--fs-xs);
    font-family: var(--font-mono);
    color: var(--color-amber);
    opacity: var(--op-dim);
  }

  &__size-note-limit {
    font-size: var(--fs-xs);
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    opacity: var(--op-muted);
  }

  /* ── Population window score ────────────────────────────────── */
  &__ws-row {
    @include flex-row(0.5rem);
    align-items: baseline;
    padding: 0.2rem 0;
    cursor: help;
  }

  &__ws-label { @include mono-upper(0.56rem, 0.07em); color: var(--color-text-muted); flex-shrink: 0; }

  &__ws-val {
    font-size: var(--fs-lg);
    font-family: var(--font-mono);
    font-weight: 700;

    &--good    { color: var(--color-lime); }
    &--marginal { color: var(--color-amber); }
    &--poor    { color: var(--color-danger); }
  }

  &__ws-formula {
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    opacity: 0.6;
  }

  /* ── Random-orientation lysis fraction ─────────────────────── */
  &__orient-row {
    @include flex-between(0.4rem);
    padding: 0.25rem 0.5rem;
    background: color-mix(in srgb, white 3%, transparent);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    cursor: default;
  }

  &__orient-label { @include mono-upper(0.56rem, 0.07em); color: var(--color-text-muted); flex-shrink: 0; }
  &__orient-vals  { @include flex-row(0.7rem); flex-shrink: 0; }

  &__orient-t { font-size: var(--fs-xs); font-family: var(--font-mono); font-weight: 600; color: var(--color-danger); }
  &__orient-h { font-size: var(--fs-xs); font-family: var(--font-mono); font-weight: 600; color: var(--color-primary); }

  &__orient-row--popdist {
    opacity: var(--op-partial);
    font-style: italic;
    border-top: 1px dotted color-mix(in srgb, var(--color-border) 50%, transparent);
    padding-top: 0.15rem;
  }
}
</style>
