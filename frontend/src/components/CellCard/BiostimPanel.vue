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
import { tipBiomod } from '@/utils/biostimTooltips'

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
