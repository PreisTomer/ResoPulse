<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="cell-card__biostim" v-tip="tooltip">
    <div class="cell-card__biostim-header">
      <span class="cell-card__biostim-title">{{ ICON.NOURISH }} {{ $t('biostim.title') }}</span>
      <span class="cell-card__biostim-score" :class="scoreClass">
        {{ (biomodScore * 100).toFixed(0) }}{{ UNIT.PERCENT }}
      </span>
    </div>
    <div class="cell-card__biostim-bars">
      <div class="cell-card__biostim-row">
        <span class="cell-card__biostim-label">{{ $t('biostim.labelSI') }}</span>
        <div class="cell-card__biostim-track">
          <div
            class="cell-card__biostim-fill cell-card__biostim-fill--si"
            :style="{ width: (stimIndex * 100) + '%' }"
          ></div>
        </div>
        <span class="cell-card__biostim-val">{{ (stimIndex * 100).toFixed(0) }}{{ UNIT.PERCENT }}</span>
      </div>
      <div class="cell-card__biostim-row">
        <span class="cell-card__biostim-label">{{ $t('biostim.labelMTE') }}</span>
        <div class="cell-card__biostim-track">
          <div
            class="cell-card__biostim-fill cell-card__biostim-fill--mte"
            :style="{ width: (mechTransdEff * 100) + '%' }"
          ></div>
        </div>
        <span class="cell-card__biostim-val">{{ (mechTransdEff * 100).toFixed(0) }}{{ UNIT.PERCENT }}</span>
      </div>
      <div class="cell-card__biostim-row">
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
import { tipBiomod } from '@/tooltips/biostimTooltips'

export default defineComponent({
  setup() { return { ICON, UNIT } },

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

    /** Recommended max frequency for ≥70% coupling efficiency: f < fc/√2 */
    optCouplingFreqLabel(): string {
      const optKHz = this.fcKHz / Math.SQRT2
      return optKHz >= 1000
        ? `<${(optKHz / 1000).toFixed(1)} ${UNIT.MHZ}`
        : `<${optKHz.toFixed(0)} ${UNIT.KHZ}`
    },

    tooltip(): string {
      return tipBiomod({
        si:                   (this.stimIndex       * 100).toFixed(0),
        mte:                  (this.mechTransdEff   * 100).toFixed(0),
        ma:                   (this.mildThermal     * 100).toFixed(0),
        bms:                  (this.biomodScore     * 100).toFixed(0),
        dr:                   (this.disruptionRatio * 100).toFixed(0),
        T:                    this.steadyStateTemp.toFixed(1),
        freqLabel:            this.freqLabel,
        fcLabel:              this.fcLabel,
        optCouplingFreqLabel: this.optCouplingFreqLabel,
      })
    },
  },
})
</script>

<style lang="scss" scoped>
@use '../../styles/keyframes' as *;
@use '../../styles/mixins' as *;

@keyframes nourish-text-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.65; }
}

.cell-card {
  &__biostim {
    background: rgba(0, 212, 255, 0.045);
    border: 1px solid rgba(0, 212, 255, 0.13);
    border-radius: var(--radius);
    padding: 0.5rem 0.65rem;
    cursor: help;
    margin: 0 0.15rem;
    transition: border-color 0.3s, background 0.3s;

    &--nourishing {
      background: rgba(0, 212, 255, 0.08);
      border-color: rgba(0, 212, 255, 0.30);
    }
  }

  &__biostim-header {
    @include flex-between();
    margin-bottom: 0.4rem;
  }

  &__biostim-title {
    @include mono-upper(0.6rem, 0.09em);
    color: var(--color-accent);
    opacity: 0.80;
  }

  &__biostim-score {
    font-size: 0.68rem;
    font-family: var(--font-mono);
    font-weight: 700;
    transition: color 0.3s;

    &--low    { color: var(--color-accent); opacity: 0.40; }
    &--medium { color: var(--color-accent); opacity: 0.75; }
    &--high   { color: #39ff14; }
    &--active { animation: nourish-text-pulse 2.2s ease-in-out infinite; }
  }

  &__biostim-bars { @include flex-col(0.22rem); }

  &__biostim-row {
    display: grid;
    grid-template-columns: 4.8rem 1fr 2.2rem;
    align-items: center;
    gap: 0.4rem;
  }

  &__biostim-label {
    font-size: 0.54rem;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    white-space: nowrap;
    opacity: 0.80;
  }

  &__biostim-track {
    height: 3px;
    background: rgba(255, 255, 255, 0.06);
    border-radius: 2px;
    overflow: hidden;
  }

  &__biostim-fill {
    height: 100%;
    border-radius: 2px;
    transition: width 0.25s ease;

    &--si  { background: var(--color-accent); }
    &--mte { background: #7c6cff; }
    &--ma  { background: #fbbf24; }
  }

  &__biostim-val {
    font-size: 0.54rem;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    text-align: right;
    opacity: 0.75;
  }
}
</style>
