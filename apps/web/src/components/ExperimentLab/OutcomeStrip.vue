<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="outcome-strip" role="status" :aria-label="$t('exp.outcomeStripTitle')">

    <!-- ── Zone 1: Readouts (live physics state) ────────────────────── -->
    <div class="outcome-strip__zone outcome-strip__zone--readouts">

      <div class="outcome-strip__title" v-tip="$t('exp.outcomeStripTip')">
        <span class="outcome-strip__title-pulse"></span>
        <span class="outcome-strip__title-label">{{ $t('exp.outcomeStripTitle') }}</span>
        <span class="outcome-strip__title-sub">{{ $t('exp.loopStripEyebrow') }}</span>
      </div>

      <div
        class="outcome-strip__mode"
        :class="`outcome-strip__mode--${mode.classSuffix}`"
        v-tip="$t('exp.outcomeModeTip')"
      >
        <span class="outcome-strip__mode-dot"></span>
        <span class="outcome-strip__mode-label">{{ mode.label }}</span>
      </div>

      <button
        type="button"
        class="outcome-strip__chip"
        :class="`outcome-strip__chip--${tiClass}`"
        v-tip="$t('exp.outcomeTiTip')"
        @click="scrollTo('hl-selectivity-panel')"
      >
        <span class="outcome-strip__chip-label">{{ $t('exp.outcomeTiLabel') }}</span>
        <span class="outcome-strip__chip-val">{{ tiDisplay }}</span>
        <span v-if="tiRangeDisplay" class="outcome-strip__chip-range">{{ tiRangeDisplay }}</span>
      </button>

      <button
        type="button"
        class="outcome-strip__chip"
        :class="`outcome-strip__chip--${drTClass}`"
        v-tip="$t('exp.outcomeDrTTip')"
        @click="scrollTo('hl-disruption-chart')"
      >
        <span class="outcome-strip__chip-label">{{ $t('exp.outcomeDrTLabel') }}</span>
        <span class="outcome-strip__chip-val">{{ drTDisplay }}</span>
      </button>

      <button
        type="button"
        class="outcome-strip__chip"
        :class="`outcome-strip__chip--${drHClass}`"
        v-tip="$t('exp.outcomeDrHTip')"
        @click="scrollTo('hl-disruption-chart')"
      >
        <span class="outcome-strip__chip-label">{{ $t('exp.outcomeDrHLabel') }}</span>
        <span class="outcome-strip__chip-val">{{ drHDisplay }}</span>
      </button>

      <button
        type="button"
        class="outcome-strip__chip outcome-strip__chip--qpcr"
        :class="{ 'outcome-strip__chip--muted': qpcrPill.isPlaceholder }"
        v-tip="qpcrTip"
        @click="goToReports"
      >
        <span class="outcome-strip__chip-label">{{ $t('exp.outcomeQpcrLabel') }}</span>
        <span class="outcome-strip__chip-val">{{ qpcrPill.value }}</span>
        <span class="outcome-strip__chip-range">{{ qpcrPill.sublabel }}</span>
      </button>
    </div>

    <!-- ── Vertical divider between read-outs and the loop actions ─── -->
    <div class="outcome-strip__divider" aria-hidden="true"></div>

    <!-- ── Zone 2: Loop status + actions ────────────────────────────── -->
    <div class="outcome-strip__zone outcome-strip__zone--loop">
      <CalibrationBadge
        class="outcome-strip__calib"
        variant="inline"
        @click-log="openAiPanel"
        @click-details="openAiPanel"
      />

      <button
        type="button"
        class="outcome-strip__loop-btn outcome-strip__loop-btn--primary"
        v-tip="$t('exp.loopBtnOptimizeTip')"
        @click="openAiPanel"
      >
        <span class="outcome-strip__loop-btn-icon">{{ ICON.AI }}</span>
        <span class="outcome-strip__loop-btn-label">{{ $t('exp.loopBtnOptimize') }}</span>
      </button>

      <button
        type="button"
        class="outcome-strip__loop-btn outcome-strip__loop-btn--secondary"
        v-tip="$t('exp.loopBtnSuggestTip')"
        @click="openAiPanel"
      >
        <span class="outcome-strip__loop-btn-icon">{{ ICON.RETICLE }}</span>
        <span class="outcome-strip__loop-btn-label">{{ $t('exp.loopBtnSuggest') }}</span>
      </button>
    </div>

    <!-- ── Zone 3: Snap to optimal (distinct, not a loop action) ───── -->
    <button
      type="button"
      class="outcome-strip__snap"
      :class="{
        'outcome-strip__snap--no-window':  hasNoSelectivityWindow,
        'outcome-strip__snap--beyond':     isSnapBeyondOnly,
        'outcome-strip__snap--calibrated': isSnapCalibrated,
      }"
      v-tip="tipSnap"
      @click="snapToOptimal"
    >
      <span class="outcome-strip__snap-icon">{{ ICON.STAR }}</span>
      <span class="outcome-strip__snap-label">{{ snapLabel }}</span>
      <span class="outcome-strip__snap-val">{{ snapValue }}</span>
    </button>

  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'

import { useCellStore } from '@/stores/cellStore'
import { useExperimentStore } from '@/stores/experimentStore'
import { useUiStore } from '@/stores/uiStore'

import { broadcastStateSync } from '@/services/socket'

import CalibrationBadge from '@/components/CalibrationBadge/index.vue'

import { formatFreqKHz } from '@/utils/format'

import { THRESHOLDS } from '@/constants/physics'
import { NULL_DISPLAY } from '@/constants/strings'
import { ICON } from '@/constants/icons'
import { ROUTE } from '@/constants/routes'

export default defineComponent({
  name: 'OutcomeStrip',

  components: { CalibrationBadge },

  computed: {
    ...mapStores(useCellStore, useExperimentStore, useUiStore),
    ICON() { return ICON },

    selectivity(): number { return this.cellStore.selectivityRatio },
    drT(): number         { return this.cellStore.targetDisruptionRatio },
    drH(): number         { return this.cellStore.healthyDisruptionRatio },

    mode(): { label: string; classSuffix: string } {
      const t = this.drT, h = this.drH
      if (h >= THRESHOLDS.DISRUPTION_WARN)                                       return { label: this.$t('selectivity.modeAblative'),    classSuffix: 'ablative'    }
      if (t >= THRESHOLDS.DISRUPTION_WARN && h < THRESHOLDS.HEALTHY_APPROACHING) return { label: this.$t('selectivity.modeTherapeutic'), classSuffix: 'therapeutic' }
      if (t >= THRESHOLDS.DISRUPTION_WARN)                                       return { label: this.$t('selectivity.modeMarginal'),    classSuffix: 'marginal'    }
      if (t >= THRESHOLDS.HEALTHY_APPROACHING)                                   return { label: this.$t('selectivity.modeApproaching'), classSuffix: 'approaching' }
      return                                                                            { label: this.$t('selectivity.modeSubThreshold'), classSuffix: 'subthreshold' }
    },

    tiDisplay(): string {
      const sel = this.selectivity
      return sel >= 99 ? ICON.INFINITY : `${ICON.TIMES}${sel.toFixed(2)}`
    },

    tiRangeDisplay(): string {
      if (this.cellStore.isResonanceMode) return ''
      const { low, high } = this.cellStore.tiUncertaintyRange
      if (Math.abs(high - low) <= 0.01) return ''
      const hi = high >= 99 ? ICON.INFINITY : high.toFixed(2)
      return `[${low.toFixed(2)}-${hi}]`
    },

    tiClass(): string {
      if (this.selectivity >= THRESHOLDS.SEL_STRONG)   return 'strong'
      if (this.selectivity >= THRESHOLDS.SEL_MARGINAL) return 'marginal'
      return 'weak'
    },

    drTDisplay(): string { return `${(this.drT * 100).toFixed(0)}%` },

    drTClass(): string {
      if (this.drT >= THRESHOLDS.DISRUPTION_WARN)      return 'strong'
      if (this.drT >= THRESHOLDS.HEALTHY_APPROACHING)  return 'marginal'
      return 'weak'
    },

    drHDisplay(): string { return `${(this.drH * 100).toFixed(0)}%` },

    drHClass(): string {
      if (this.drH >= THRESHOLDS.DISRUPTION_WARN)     return 'weak'
      if (this.drH >= THRESHOLDS.HEALTHY_APPROACHING) return 'marginal'
      return 'strong'
    },

    qpcrPill(): { value: string; sublabel: string; isPlaceholder: boolean } {
      const latest = this.experimentStore.latestMeasuredQpcr
      if (!latest) {
        return {
          value:         NULL_DISPLAY,
          sublabel:      this.$t('exp.outcomeQpcrPending') as string,
          isPlaceholder: true,
        }
      }
      return {
        value:         `${latest.foldChange.toFixed(2)}${ICON.TIMES}`,
        sublabel:      latest.transcript ?? this.$t('exp.outcomeQpcrFallbackTranscript') as string,
        isPlaceholder: false,
      }
    },

    qpcrTip(): string {
      return this.qpcrPill.isPlaceholder
        ? this.$t('exp.outcomeQpcrTipPending') as string
        : this.$t('exp.outcomeQpcrTip', { transcript: this.qpcrPill.sublabel, fold: this.qpcrPill.value }) as string
    },

    optimalFreqResult(): { khz: number; sel: number } { return this.cellStore.optimalFreqResult },

    isResonanceTarget(): boolean { return this.cellStore.isResonanceTarget },

    isSnapBeyondRange(): boolean {
      const { khz } = this.optimalFreqResult
      const { freqMin, freqMax } = this.cellStore.sliderRanges
      if (this.cellStore.fcBelowSliderMin) return true
      return khz > freqMax || khz < freqMin
    },

    hasNoSelectivityWindow(): boolean {
      return !this.isResonanceTarget && this.optimalFreqResult.sel < THRESHOLDS.SEL_MARGINAL
    },

    isSnapBeyondOnly(): boolean {
      return !this.hasNoSelectivityWindow && this.isSnapBeyondRange
    },

    isSnapCalibrated(): boolean {
      if (this.hasNoSelectivityWindow) return false
      if (this.isSnapBeyondRange)      return false
      const tier = this.experimentStore.calibrationSummary.tier
      return tier === 'moderate' || tier === 'strong'
    },

    snapLabel(): string {
      if (this.hasNoSelectivityWindow) return this.$t('exp.outcomeSnapLabelNoWindow')
      return this.isResonanceTarget
        ? this.$t('exp.outcomeSnapLabelResonance')
        : this.$t('exp.outcomeSnapLabel')
    },

    snapValue(): string {
      const { khz, sel } = this.optimalFreqResult
      const freq = formatFreqKHz(khz)
      const selStr = sel >= 99 ? ICON.INFINITY : `${ICON.TIMES}${sel.toFixed(2)}`
      const beyond = this.isSnapBeyondRange ? ` ${ICON.BEYOND}` : ''
      return `${freq} · ${selStr}${beyond}`
    },

    tipSnap(): string {
      const { khz, sel } = this.optimalFreqResult
      const freq = formatFreqKHz(khz)
      const selStr = sel >= 99 ? ICON.INFINITY : `${ICON.TIMES}${sel.toFixed(2)}`
      if (this.hasNoSelectivityWindow) {
        return this.$t('exp.outcomeSnapTipNoWindow', { freq, sel: selStr })
      }
      if (this.isSnapBeyondRange) {
        return this.$t('exp.outcomeSnapTipBeyond', { freq, sel: selStr })
      }
      return this.$t('exp.outcomeSnapTip', { freq, sel: selStr })
    },
  },

  methods: {
    scrollTo(id: string) {
      const el = document.getElementById(id)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },

    goToReports() {
      this.$router.push(ROUTE.REPORTS)
    },

    openAiPanel() {
      this.uiStore.setAiPanelOpen(true)
    },

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

.outcome-strip {
  @include flex-row(0.6rem);
  align-items: center;
  flex-wrap: wrap;
  padding: 0.55rem 0.85rem;
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--color-surface) 92%, transparent) 0%,
    color-mix(in srgb, var(--color-surface) 86%, transparent) 60%,
    color-mix(in srgb, var(--color-primary)  7%, var(--color-surface)) 100%
  );
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  margin-bottom: 0.2rem;

  /* ── Zones: predictions on row 1, AI section (loop + snap) on row 2 ──────── */
  &__zone {
    @include flex-row(0.5rem);
    align-items: center;
    flex-wrap: wrap;

    &--readouts { flex: 1 1 100%; min-width: 0; }
    &--loop     { flex: 0 0 auto; }
  }

  /* Vertical divider belonged to the single-line layout; the two-row structure separates zones by row instead. */
  &__divider { display: none; }

  &__title {
    @include flex-row(0.4rem);
    align-items: center;
    padding: 0.16rem 0.2rem 0.16rem 0.1rem;
    flex-shrink: 0;
    cursor: help;
  }

  &__title-pulse {
    width: 0.45rem;
    height: 0.45rem;
    border-radius: 50%;
    background: var(--color-primary);
    animation: pulse-dot 2s ease-in-out infinite;
    flex-shrink: 0;
  }

  &__title-label {
    @include mono-upper(var(--fs-xxs), 0.1em);
    color: var(--color-text);
    font-weight: 700;
    white-space: nowrap;
  }

  &__title-sub {
    @include mono-upper(var(--fs-xxs), 0.12em);
    color: var(--color-primary);
    opacity: var(--op-dim);
    white-space: nowrap;
    padding-left: 0.45rem;
    border-left: 1px solid color-mix(in srgb, var(--color-primary) 30%, transparent);
  }

  &__sep {
    width: 1px;
    align-self: stretch;
    background: color-mix(in srgb, var(--color-border) 70%, transparent);
    margin: 0.15rem 0.25rem;
    flex-shrink: 0;

    @media (max-width: 768px) { display: none; }
  }

  &__mode {
    @include flex-row(0.4rem);
    align-items: center;
    padding: 0.35rem 0.75rem;
    border-radius: 999px;
    flex-shrink: 0;
    cursor: help;
    transition: color var(--tr-slow), border-color var(--tr-slow), background var(--tr-slow);

    &--therapeutic  { @include color-variant(lime,    35%, 10%); }
    &--ablative     { @include color-variant(danger,  35%, 10%); }
    &--marginal     { @include color-variant(amber,   35%, 10%); }
    &--approaching  { @include color-variant(amber,   25%, 6%); }
    &--subthreshold { @include color-variant(primary, 25%, 6%); }
  }

  &__mode-dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background: currentColor;
    flex-shrink: 0;
  }

  &__mode-label {
    @include mono-upper(var(--fs-xs), 0.08em);
    font-weight: 700;
    white-space: nowrap;
  }

  &__chip {
    @include flex-row(0.4rem);
    align-items: baseline;
    padding: 0.35rem 0.7rem;
    border-radius: var(--radius);
    border: 1px solid var(--color-border);
    background: transparent;
    cursor: pointer;
    transition: color var(--tr-fast), border-color var(--tr-fast), background var(--tr-fast);
    flex: 0 1 auto;

    &:hover { background: color-mix(in srgb, white 4%, transparent); }

    &--strong   { @include color-variant(lime,   35%, 10%); }
    &--marginal { @include color-variant(amber,  35%, 10%); }
    &--weak     { @include color-variant(danger, 35%, 10%); }
    &--muted    {
      color: var(--color-text-muted);
      border-color: var(--color-border);
      background: color-mix(in srgb, white 3%, transparent);
    }
    &--qpcr:not(&--muted) {
      @include color-variant(primary, 30%, 6%);
    }
  }

  &__chip-label {
    @include mono-upper(var(--fs-xxs), 0.08em);
    opacity: var(--op-muted);
  }

  &__chip-val {
    font-family: var(--font-mono);
    font-size: var(--fs-md);
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  &__chip-range {
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    opacity: var(--op-muted);
    letter-spacing: 0.02em;
  }

  &__calib {
    flex: 0 1 auto;
    align-self: center;
  }

  /* ── Loop Actions: unboxed, grouped by adjacency + gap ────────────── */
  &__loop-btn {
    @include flex-row(0.4rem);
    align-items: center;
    padding: 0.35rem 0.75rem;
    border-radius: var(--radius);
    border: 1px solid;
    cursor: pointer;
    transition: background var(--tr-fast), border-color var(--tr-fast),
                box-shadow var(--tr-fast), transform var(--tr-fast);

    &--primary {
      color: var(--color-primary);
      border-color: color-mix(in srgb, var(--color-primary) 55%, transparent);
      background: color-mix(in srgb, var(--color-primary) 22%, transparent);
      box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-primary) 14%, transparent),
                  0 6px 18px color-mix(in srgb, var(--color-primary) 18%, transparent);

      &:hover {
        background: color-mix(in srgb, var(--color-primary) 34%, transparent);
        border-color: var(--color-primary);
        transform: translateY(-1px);
      }
    }

    &--secondary {
      color: var(--color-text);
      border-color: color-mix(in srgb, var(--color-primary) 30%, transparent);
      background: color-mix(in srgb, var(--color-primary)  5%, transparent);

      &:hover {
        border-color: color-mix(in srgb, var(--color-primary) 55%, transparent);
        background: color-mix(in srgb, var(--color-primary) 12%, transparent);
        transform: translateY(-1px);
      }
    }
  }

  &__loop-btn-icon {
    font-size: var(--fs-md);
    line-height: 1;
  }

  &__loop-btn-label {
    @include mono-upper(var(--fs-xxs), 0.08em);
    font-weight: 700;
  }

  /* ── Snap-to-optimal CTA ────────────────────────────────────── */
  &__snap {
    @include flex-row(0.4rem);
    align-items: baseline;
    padding: 0.35rem 0.8rem;
    border: 1px solid;
    border-radius: var(--radius);
    cursor: pointer;
    margin-left: auto;
    flex-shrink: 0;
    transition: color var(--tr-fast), border-color var(--tr-fast), background var(--tr-fast);

    @include color-variant(amber, 35%, 10%);

    &:hover { @include color-variant(amber, 60%, 18%); }

    &--beyond,
    &--no-window {
      @include tinted-surface(text-muted, 25%, 3%);
      color: var(--color-text-muted);

      &:hover {
        color: var(--color-text);
        border-color: var(--color-text-muted);
        background: color-mix(in srgb, white 6%, transparent);
      }
    }

    &--calibrated {
      animation: snap-calibrated-glow 2.8s ease-in-out infinite;
    }
  }

  @keyframes snap-calibrated-glow {
    0%, 100% { box-shadow: 0 0 0   color-mix(in srgb, var(--color-primary) 0%,  transparent); }
    50%      { box-shadow: 0 0 16px color-mix(in srgb, var(--color-primary) 45%, transparent); }
  }

  &__snap-icon {
    font-size: var(--fs-xs);
    line-height: 1;
    flex-shrink: 0;
  }

  &__snap-label { @include mono-upper(var(--fs-xxs), 0.08em); opacity: var(--op-muted); }

  &__snap-val {
    font-family: var(--font-mono);
    font-size: var(--fs-md);
    font-weight: 700;
    letter-spacing: -0.01em;
  }

  @media (max-width: 768px) {
    padding: 0.35rem 0.45rem;
    gap: 0.35rem;

    &__chip {
      padding: 0.18rem 0.4rem;
      gap: 0.3rem;
    }

    &__chip-val { font-size: var(--fs-sm); }

    &__snap {
      margin-left: 0;
      padding: 0.18rem 0.45rem;
      gap: 0.3rem;
    }

    &__snap-val { font-size: var(--fs-sm); }
  }
}

</style>
