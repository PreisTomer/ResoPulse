<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="outcome-strip" role="status" :aria-label="$t('exp.outcomeStripTitle')">

    <div class="outcome-strip__title" v-tip="$t('exp.outcomeStripTip')">
      <span class="outcome-strip__title-pulse"></span>
      <span class="outcome-strip__title-label">{{ $t('exp.outcomeStripTitle') }}</span>
    </div>

    <div class="outcome-strip__sep" aria-hidden="true"></div>

    <div
      class="outcome-strip__verdict"
      :class="`outcome-strip__verdict--${verdictClass}`"
      v-tip="$t('exp.outcomeWindowTip')"
    >
      <span class="outcome-strip__verdict-dot"></span>
      <span class="outcome-strip__verdict-label">{{ verdictLabel }}</span>
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
      class="outcome-strip__chip"
      :class="`outcome-strip__chip--${tssClass}`"
      v-tip="$t('exp.outcomeTssTip')"
      @click="scrollTo('hl-disruption-chart')"
    >
      <span class="outcome-strip__chip-label">{{ $t('exp.outcomeTssLabel') }}</span>
      <span class="outcome-strip__chip-val">{{ tssDisplay }}</span>
    </button>

    <button
      type="button"
      class="outcome-strip__chip"
      :class="`outcome-strip__chip--${biomodClass}`"
      v-tip="$t('exp.outcomeBiomodTip')"
      @click="scrollTo('hl-cell-cards')"
    >
      <span class="outcome-strip__chip-label">{{ $t('exp.outcomeBiomodLabel') }}</span>
      <span class="outcome-strip__chip-val">{{ biomodDisplay }}</span>
    </button>

  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'

import { useCellStore } from '@/stores/cellStore'

import { THRESHOLDS, THERMAL_MA_PEAK_C, THERM_NOURISH_ENTER_C } from '@/constants/physics'
import { ICON } from '@/constants/icons'
import { UNIT } from '@/constants/units'

export default defineComponent({
  name: 'OutcomeStrip',

  computed: {
    ...mapStores(useCellStore),

    selectivity(): number { return this.cellStore.selectivityRatio },
    drT(): number         { return this.cellStore.targetDisruptionRatio },
    drH(): number         { return this.cellStore.healthyDisruptionRatio },
    tss(): number         { return Math.max(this.cellStore.healthySteadyStateTemp, this.cellStore.targetSteadyStateTemp) },
    biomod(): number      { return this.cellStore.healthyBiomodScore },

    windowOpen(): boolean {
      return this.drT >= THRESHOLDS.DISRUPTION_WARN && this.drH < THRESHOLDS.HEALTHY_APPROACHING
    },

    verdictLabel(): string {
      return this.windowOpen ? this.$t('exp.outcomeWindowOpen') : this.$t('exp.outcomeWindowClosed')
    },

    verdictClass(): string { return this.windowOpen ? 'open' : 'closed' },

    tiDisplay(): string {
      const sel = this.selectivity
      return sel >= 99 ? ICON.INFINITY : `${ICON.TIMES}${sel.toFixed(2)}`
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

    tssDisplay(): string { return `${this.tss.toFixed(1)}${UNIT.DEG_C}` },

    tssClass(): string {
      const t = this.tss
      if (t >= THRESHOLDS.TEMP_WARN)       return 'weak'
      if (t >= THERMAL_MA_PEAK_C)          return 'marginal'
      if (t >= THERM_NOURISH_ENTER_C)      return 'strong'
      return 'muted'
    },

    biomodDisplay(): string { return this.biomod.toFixed(2) },

    biomodClass(): string {
      if (this.biomod >= THRESHOLDS.BMS_NOURISHING) return 'strong'
      if (this.biomod >= 0.25)                      return 'marginal'
      return 'muted'
    },
  },

  methods: {
    scrollTo(id: string) {
      const el = document.getElementById(id)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },
  },
})
</script>

<style lang="scss" scoped>

.outcome-strip {
  @include flex-row(0.5rem);
  align-items: stretch;
  flex-wrap: wrap;
  padding: 0.4rem 0.6rem;
  background: color-mix(in srgb, var(--color-surface) 88%, transparent);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  margin-bottom: 0.2rem;

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

  &__sep {
    width: 1px;
    align-self: stretch;
    background: color-mix(in srgb, var(--color-border) 70%, transparent);
    margin: 0.15rem 0.25rem;
    flex-shrink: 0;

    @media (max-width: 768px) { display: none; }
  }

  &__verdict {
    @include flex-row(0.35rem);
    align-items: center;
    padding: 0.16rem 0.45rem;
    border-radius: 999px;
    flex-shrink: 0;
    cursor: help;

    &--open   { @include color-variant(lime, 25%, 6%); }
    &--closed { @include tinted-surface(text-muted, 20%, 3%); color: var(--color-text-muted); }
  }

  &__verdict-dot {
    width: 0.45rem;
    height: 0.45rem;
    border-radius: 50%;
    background: currentColor;
    flex-shrink: 0;
  }

  &__verdict-label { @include mono-upper(var(--fs-xxs), 0.08em); font-weight: 600; }

  &__chip {
    @include flex-row(0.4rem);
    align-items: baseline;
    padding: 0.22rem 0.55rem;
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

  @media (max-width: 768px) {
    padding: 0.35rem 0.45rem;
    gap: 0.35rem;

    &__chip {
      padding: 0.18rem 0.4rem;
      gap: 0.3rem;
    }

    &__chip-val { font-size: var(--fs-sm); }
  }
}

</style>
