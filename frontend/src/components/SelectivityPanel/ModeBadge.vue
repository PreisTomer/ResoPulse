<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="mode-badge">

    <!-- ── Mode label + optimal snap button ─────────────────────── -->
    <span class="mode-badge__pill" :class="badgeClass" v-tip="$t('selectivity.tipModeBadge')">
      {{ badge.label }}
    </span>
    <button
      type="button"
      class="mode-badge__snap-btn"
      :class="{ 'mode-badge__snap-btn--beyond': isBeyondSliderRange }"
      @click="snapToOptimal"
      v-tip="tipOptimal"
    >{{ optimalNote }}</button>

    <!-- ── Model / physics warning ───────────────────────────────── -->
    <div v-if="warning" class="mode-badge__warning">
      {{ warning }}
      <button
        v-if="showResonanceSwitchBtn"
        type="button"
        class="mode-badge__warning-btn"
        @click="cellStore.setChartMode(CHART_MODE.RESONANCE)"
      >{{ $t('selectivity.switchToResonanceBtn') }}</button>
    </div>

  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'

import { useCellStore } from '@/stores/cellStore'

import { broadcastStateSync } from '@/services/socket'

import { formatFreqKHz } from '@/utils/format'
import { tipOptimal } from '@/tooltips/selectivityTooltips'

import { THRESHOLDS } from '@/constants/physics'
import { CELL_CATEGORY, CHART_MODE } from '@/constants/strings'
import { ICON } from '@/constants/icons'

export default defineComponent({
  computed: {
    ...mapStores(useCellStore),
    CHART_MODE() { return CHART_MODE },
    ICON()       { return ICON },

    isResonanceTarget(): boolean {
      const cat = this.cellStore.targetCellCategory
      const t = this.cellStore.target as { resonantFreqGHz?: number; resonantThresholdVcm?: number }
      return (cat === CELL_CATEGORY.VIRUS || cat === CELL_CATEGORY.BACTERIA) && !!t.resonantFreqGHz && !!t.resonantThresholdVcm
    },

    badge(): { label: string } {
      const t = this.cellStore.targetDisruptionRatio
      const h = this.cellStore.healthyDisruptionRatio
      if (h >= THRESHOLDS.DISRUPTION_WARN)                                        return { label: this.$t('selectivity.modeAblative')    }
      if (t >= THRESHOLDS.DISRUPTION_WARN && h < THRESHOLDS.HEALTHY_APPROACHING) return { label: this.$t('selectivity.modeTherapeutic') }
      if (t >= THRESHOLDS.DISRUPTION_WARN)                                        return { label: this.$t('selectivity.modeMarginal')    }
      if (t >= THRESHOLDS.HEALTHY_APPROACHING)                                    return { label: this.$t('selectivity.modeApproaching') }
      return                                                                              { label: this.$t('selectivity.modeSubThreshold') }
    },

    badgeClass(): string {
      const t = this.cellStore.targetDisruptionRatio, h = this.cellStore.healthyDisruptionRatio
      if (h >= THRESHOLDS.DISRUPTION_WARN)                                        return 'mode-badge__pill--ablative'
      if (t >= THRESHOLDS.DISRUPTION_WARN && h < THRESHOLDS.HEALTHY_APPROACHING) return 'mode-badge__pill--therapeutic'
      if (t >= THRESHOLDS.DISRUPTION_WARN)                                        return 'mode-badge__pill--marginal'
      if (t >= THRESHOLDS.HEALTHY_APPROACHING)                                    return 'mode-badge__pill--approaching'
      return                                                                              'mode-badge__pill--subthreshold'
    },

    optimalFreqResult(): { khz: number; sel: number } { return this.cellStore.optimalFreqResult },

    isBeyondSliderRange(): boolean {
      const { khz } = this.optimalFreqResult
      const { freqMin, freqMax } = this.cellStore.sliderRanges
      // Also flag as beyond-range when both fc values are below slider min: optimal is at the
      // scan floor (freqMin) but the true maximum lies below the accessible frequency range.
      if (this.cellStore.fcBelowSliderMin) return true
      return khz > freqMax || khz < freqMin
    },

    optimalNote(): string {
      const { khz, sel } = this.optimalFreqResult
      const label = formatFreqKHz(khz)
      if (this.isResonanceTarget) {
        return `${ICON.STAR} f_res: ${label} · ×${sel >= 99 ? ICON.INFINITY : sel.toFixed(2)} (resonance peak)`
      }
      if (this.isBeyondSliderRange) return `${ICON.STAR} Optimal: ${label} · ×${sel.toFixed(2)} ${ICON.BEYOND}`
      return `${ICON.STAR} Optimal: ${label} · ×${sel.toFixed(2)}`
    },

    warning(): string | null {
      const cat = this.cellStore.targetCellCategory
      const ti  = this.cellStore.therapeuticIndex
      const t = this.cellStore.target as { resonantFreqGHz?: number; resonantThresholdVcm?: number }
      const ghzCaveat = ' · f_res from fs-laser experiments (Tsen et al. [10]); RF delivery at GHz faces EM penetration limits in aqueous media (Debye relaxation above 1 GHz)'
      if (this.cellStore.isResonanceMode && cat === CELL_CATEGORY.MAMMALIAN) {
        return `${ICON.WARNING} Resonance mode has no physical meaning for mammalian cells, they have no rigid protein capsid or peptidoglycan cell wall. Switch back to IRE/Vm mode.`
      }
      if (cat === CELL_CATEGORY.VIRUS) {
        if (t.resonantFreqGHz) {
          return `${ICON.WARNING} IRE model inapplicable for virions (R < 0.1 µm) · Acoustic capsid disruption at ${t.resonantFreqGHz} GHz${ghzCaveat}`
        }
        const tLysis = this.cellStore.targetLysisField
        return `${ICON.WARNING} IRE not applicable to virions, E_lysis ≈ ${(tLysis / 1000).toFixed(0)} kV/cm · Use Resonance mode`
      }
      if (cat === CELL_CATEGORY.BACTERIA) {
        const tLysis = this.cellStore.targetLysisField
        if (tLysis > 3000) {
          const res = t.resonantFreqGHz ? ` · Resonance mode (${t.resonantFreqGHz} GHz) available${ghzCaveat}` : ''
          return `${ICON.WARNING} E_lysis ≈ ${(tLysis / 1000).toFixed(1)} kV/cm, standard IRE impractical · Consider nsEP (pulse width slider)${res}`
        }
      }
      if (this.cellStore.fcBelowSliderMin) {
        const fcT = this.cellStore.targetFc
        const fcH = this.cellStore.healthyFc
        const tiDc = this.cellStore.tiQuasiDc
        return `${ICON.WARNING} fc(T) = ${formatFreqKHz(fcT)}, fc(H) = ${formatFreqKHz(fcH)} — both below slider minimum. Displayed TI is rolled-off and underestimates true quasi-DC selectivity (TI_DC = ${tiDc.toFixed(2)}×). Switch to saline or a higher-conductivity medium for accurate protocol calibration, then switch back to verify.`
      }
      if ((this.cellStore.healthy as { id?: string }).id === 'rbc') {
        return `${ICON.WARNING} RBC modelled as sphere (R = 4 µm equatorial). Biconcave disk geometry overestimates Vm by ~43%, so displayed TI underestimates true selectivity. Use spheroid Schwan correction for quantitative lysis-field calibration.`
      }
      if (ti > 0 && ti < 1.0) {
        return `${ICON.WARNING} TI = ${ti.toFixed(2)}×, healthy cell DR exceeds target at current settings · Adjust frequency or field to find a selective window`
      }
      return null
    },

    showResonanceSwitchBtn(): boolean {
      const cat = this.cellStore.targetCellCategory
      const t = this.cellStore.target as { resonantFreqGHz?: number }
      return !!(cat === CELL_CATEGORY.VIRUS || cat === CELL_CATEGORY.BACTERIA) &&
        !!t.resonantFreqGHz &&
        !this.cellStore.isResonanceMode
    },

    tipOptimal(): string {
      const { khz, sel } = this.optimalFreqResult
      const t = this.cellStore.target as { resonantFreqGHz?: number; resonantThresholdVcm?: number; capsidQ?: number }
      return tipOptimal({
        isResonanceTarget:    this.isResonanceTarget,
        resonantFreqGHz:      t.resonantFreqGHz,
        resonantThresholdVcm: t.resonantThresholdVcm,
        capsidQ:              t.capsidQ,
        optKhz:               khz,
        optSel:               sel,
        beyondRange:          this.isBeyondSliderRange,
        tiHighFreqLimit:      this.cellStore.tiHighFreqLimit,
        healthyRadius:        this.cellStore.healthy.radius,
        healthyLabel:         this.cellStore.healthy.label,
        targetCategory:       this.cellStore.targetCellCategory,
        targetFcDisplay:      formatFreqKHz(this.cellStore.targetFc),
      })
    },
  },

  methods: {
    snapToOptimal() {
      const { khz } = this.optimalFreqResult
      const { freqMin, freqMax } = this.cellStore.sliderRanges
      this.cellStore.setBroadcastFreqKHz(Math.round(Math.max(freqMin, Math.min(freqMax, khz))))
      broadcastStateSync()
    },
  },
})
</script>

<style lang="scss" scoped>


.mode-badge {
  @include flex-col(0.35rem);

  /* ── Mode label pill ─────────────────────────────────────────── */
  &__pill {
    @include mono-upper(0.68rem, 0.1em);
    padding: 0.2rem 0.55rem;
    border-radius: 3px;
    border: 1px solid transparent;
    align-self: flex-start;
    transition: color var(--tr-slow), border-color var(--tr-slow);

    &--therapeutic { color: var(--color-lime);    border-color: color-mix(in srgb, var(--color-lime)   33%, transparent); }
    &--ablative    { color: var(--color-danger);  border-color: color-mix(in srgb, var(--color-danger) 33%, transparent); }
    &--marginal    { color: var(--color-amber);   border-color: color-mix(in srgb, var(--color-amber) 33%, transparent); }
    &--approaching { color: var(--color-amber);   border-color: color-mix(in srgb, var(--color-amber) 33%, transparent); }
    &--subthreshold { color: var(--color-primary); border-color: var(--color-primary-border); }
  }

  /* ── Optimal frequency snap button ──────────────────────────── */
  &__snap-btn {
    @include mono-upper(0.62rem, 0.04em);
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.25rem 0.55rem;
    background: color-mix(in srgb, var(--color-amber) 7%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-amber) 30%, transparent);
    border-radius: var(--radius);
    color: var(--color-amber);
    cursor: pointer;
    line-height: 1.5;
    transition: background var(--tr-fast), border-color var(--tr-fast);

    &:hover {
      background: color-mix(in srgb, var(--color-amber) 14%, transparent);
      border-color: color-mix(in srgb, var(--color-amber) 60%, transparent);
    }

    &--beyond {
      color: var(--color-text-muted);
      border-color: var(--color-border);
      background: transparent;

      &:hover {
        color: var(--color-text);
        border-color: var(--color-text-muted);
        background: color-mix(in srgb, white 4%, transparent);
      }
    }
  }

  /* ── Physics / model warning strip ──────────────────────────── */
  &__warning {
    font-size: var(--fs-xs);
    font-family: var(--font-mono);
    color: var(--color-amber);
    background: color-mix(in srgb, var(--color-amber) 7%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-amber) 25%, transparent);
    border-radius: var(--radius);
    padding: 0.3rem 0.55rem;
    line-height: 1.55;
  }

  &__warning-btn {
    display: block;
    margin-top: 0.4rem;
    background: color-mix(in srgb, var(--color-amber) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-amber) 40%, transparent);
    border-radius: 3px;
    color: var(--color-amber);
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    letter-spacing: 0.08em;
    padding: 0.2rem 0.55rem;
    cursor: pointer;
    transition: background var(--tr-fast), border-color var(--tr-fast);

    &:hover {
      background: color-mix(in srgb, var(--color-amber) 22%, transparent);
      border-color: color-mix(in srgb, var(--color-amber) 65%, transparent);
    }
  }
}
</style>
