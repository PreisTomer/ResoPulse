<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="cell-card__biostim">
    <div class="cell-card__biostim-header" v-tip="tooltipScore">
      <span class="cell-card__biostim-title">{{ ICON.NOURISH }} {{ $t('biostim.title') }}</span>
      <span class="cell-card__biostim-theoretical">{{ $t('biostim.theoreticalBadge') }}</span>
      <span class="cell-card__biostim-score" :class="scoreClass">
        {{ (biomodScore * 100).toFixed(0) }}{{ UNIT.PERCENT }}
      </span>
    </div>
    <div class="cell-card__biostim-bars">
      <div class="cell-card__biostim-row" v-tip="tooltipSI">
        <span class="cell-card__biostim-label">{{ $t('biostim.labelSI') }}</span>
        <div class="cell-card__biostim-track">
          <div
            class="cell-card__biostim-fill cell-card__biostim-fill--si"
            :style="{ width: (stimIndex * 100) + '%' }"
          ></div>
        </div>
        <span class="cell-card__biostim-val">{{ (stimIndex * 100).toFixed(0) }}{{ UNIT.PERCENT }}</span>
      </div>
      <div class="cell-card__biostim-row" v-tip="tooltipMTE">
        <span class="cell-card__biostim-label">{{ $t('biostim.labelMTE') }}</span>
        <div class="cell-card__biostim-track">
          <div
            class="cell-card__biostim-fill cell-card__biostim-fill--mte"
            :style="{ width: (mechTransdEff * 100) + '%' }"
          ></div>
        </div>
        <span class="cell-card__biostim-val">{{ (mechTransdEff * 100).toFixed(0) }}{{ UNIT.PERCENT }}</span>
      </div>
      <div class="cell-card__biostim-row" v-tip="tooltipMA">
        <span class="cell-card__biostim-label">{{ $t('biostim.labelMA') }}</span>
        <div class="cell-card__biostim-track">
          <div
            class="cell-card__biostim-fill cell-card__biostim-fill--ma"
            :style="{ width: (mildThermal * 100) + '%' }"
          ></div>
        </div>
        <span class="cell-card__biostim-val">{{ (mildThermal * 100).toFixed(0) }}{{ UNIT.PERCENT }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { ICON } from '@/constants/icons'
import { UNIT } from '@/constants/units'
import { tipBiomodScore, tipBiomodSI, tipBiomodMTE, tipBiomodMA } from '@/tooltips/biostimTooltips'

export default defineComponent({
  props: {
    stimIndex:       { type: Number, required: true },
    mechTransdEff:   { type: Number, required: true },
    mildThermal:     { type: Number, required: true },
    biomodScore:     { type: Number, required: true },
    disruptionRatio: { type: Number, required: true },
    freqKHz:         { type: Number, required: true },
    fcKHz:           { type: Number, required: true },
    steadyStateTemp: { type: Number, required: true },
  },

  computed: {
    ICON() { return ICON },
    UNIT() { return UNIT },

    scoreClass(): string {
      if (this.biomodScore < 0.25) return 'cell-card__biostim-score--low'
      if (this.biomodScore < 0.55) return 'cell-card__biostim-score--medium'
      return 'cell-card__biostim-score--high cell-card__biostim-score--active'
    },

    freqLabel(): string {
      return this.freqKHz >= 1000
        ? `${(this.freqKHz / 1000).toFixed(1)} ${UNIT.MHZ}`
        : `${this.freqKHz.toFixed(0)} ${UNIT.KHZ}`
    },

    fcLabel(): string {
      return this.fcKHz >= 1000
        ? `${(this.fcKHz / 1000).toFixed(1)} ${UNIT.MHZ}`
        : `${this.fcKHz.toFixed(0)} ${UNIT.KHZ}`
    },

    // Max frequency for >= 70% coupling efficiency: f < fc/sqrt(2)
    optCouplingFreqLabel(): string {
      const optKHz = this.fcKHz / Math.SQRT2
      return optKHz >= 1000
        ? `<${(optKHz / 1000).toFixed(1)} ${UNIT.MHZ}`
        : `<${optKHz.toFixed(0)} ${UNIT.KHZ}`
    },

    tooltipScore(): string {
      return tipBiomodScore({ bms: (this.biomodScore * 100).toFixed(0) })
    },

    tooltipSI(): string {
      return tipBiomodSI({
        si: (this.stimIndex       * 100).toFixed(0),
        dr: (this.disruptionRatio * 100).toFixed(0),
      })
    },

    tooltipMTE(): string {
      return tipBiomodMTE({
        mte:                  (this.mechTransdEff * 100).toFixed(0),
        freqLabel:            this.freqLabel,
        fcLabel:              this.fcLabel,
        optCouplingFreqLabel: this.optCouplingFreqLabel,
      })
    },

    tooltipMA(): string {
      return tipBiomodMA({
        ma: (this.mildThermal   * 100).toFixed(0),
        T:  this.steadyStateTemp.toFixed(1),
      })
    },
  },
})
</script>

<style lang="scss" scoped>



.cell-card {
  &__biostim {
    background: color-mix(in srgb, var(--color-primary) 4.5%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-primary) 13%, transparent);
    border-radius: var(--radius);
    padding: 0.5rem 0.65rem;
    margin: 0 0.15rem;
    transition: border-color var(--tr-slow), background var(--tr-slow);

    &--nourishing {
      background: color-mix(in srgb, var(--color-primary) 8%, transparent);
      border-color: color-mix(in srgb, var(--color-primary) 30%, transparent);
    }
  }

  &__biostim-header {
    @include flex-between();
    margin-bottom: 0.4rem;
    cursor: help;
  }

  &__biostim-title {
    @include mono-upper(0.6rem, 0.09em);
    color: var(--color-accent);
    opacity: var(--op-partial);
  }

  &__biostim-theoretical {
    @include mono-upper(0.52rem, 0.06em);
    color: var(--color-amber);
    opacity: 0.65;
    border: 1px solid color-mix(in srgb, var(--color-amber) 30%, transparent);
    border-radius: 2px;
    padding: 0.04rem 0.3rem;
    flex-shrink: 0;
  }

  &__biostim-score {
    font-size: var(--fs-xs);
    font-family: var(--font-mono);
    font-weight: 700;
    transition: color var(--tr-slow);

    &--low    { color: var(--color-accent); opacity: 0.40; }
    &--medium { color: var(--color-accent); opacity: 0.75; }
    &--high   { color: var(--color-lime); }
    &--active { animation: nourish-text-pulse 2.2s ease-in-out infinite; }
  }

  &__biostim-bars { @include flex-col(0.22rem); }

  &__biostim-row {
    display: grid;
    grid-template-columns: 4.8rem 1fr 2.2rem;
    align-items: center;
    gap: 0.4rem;
    cursor: help;
  }

  &__biostim-label {
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    white-space: nowrap;
    opacity: var(--op-partial);
  }

  &__biostim-track {
    height: 3px;
    background: color-mix(in srgb, white 6%, transparent);
    border-radius: 2px;
    overflow: hidden;
  }

  &__biostim-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.25s ease;

    &--si  { background: var(--color-accent); }
    &--mte { background: var(--color-purple); }
    &--ma  { background: var(--color-amber); }
  }

  &__biostim-val {
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    text-align: right;
    opacity: 0.75; // intentional between-tier value
  }
}
</style>
