<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="equation-strip" role="region" :aria-label="$t('exp.equationStripTitle')">

    <div class="equation-strip__header">
      <span class="equation-strip__title" v-tip="$t('exp.equationStripTip')">{{ $t('exp.equationStripTitle') }}</span>
      <span class="equation-strip__mode">{{ modeLabel }}</span>
      <span class="equation-strip__formula">{{ symbolicFormula }}</span>
      <span class="equation-strip__cite">{{ citation }}</span>
      <button
        type="button"
        class="equation-strip__derivation"
        v-tip="$t('exp.equationStripDerivationTip')"
        @click="openDerivation"
      >{{ $t('exp.equationStripDerivationBtn') }}</button>
    </div>

    <div class="equation-strip__lines">
      <div class="equation-strip__line equation-strip__line--target">
        <span class="equation-strip__badge equation-strip__badge--target">{{ labelTarget }}</span>
        <span class="equation-strip__eq">{{ targetSubstituted }}</span>
        <span class="equation-strip__equals">=</span>
        <span class="equation-strip__result equation-strip__result--target">{{ targetResult }}</span>
      </div>
      <div class="equation-strip__line equation-strip__line--healthy">
        <span class="equation-strip__badge equation-strip__badge--healthy">{{ labelHealthy }}</span>
        <span class="equation-strip__eq">{{ healthySubstituted }}</span>
        <span class="equation-strip__equals">=</span>
        <span class="equation-strip__result equation-strip__result--healthy">{{ healthyResult }}</span>
      </div>
    </div>

  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'

import { useCellStore } from '@/stores/cellStore'

import { computeTau } from '@/utils/physics'

import { CELL_LABEL, CHART_MODE } from '@/constants/strings'
import { ROUTE } from '@/constants/routes'

export default defineComponent({
  name: 'EquationStrip',

  computed: {
    ...mapStores(useCellStore),

    labelTarget(): string  { return CELL_LABEL.TARGET },
    labelHealthy(): string { return CELL_LABEL.HEALTHY },

    isResonance(): boolean { return this.cellStore.chartMode === CHART_MODE.RESONANCE },

    modeLabel(): string {
      return this.isResonance
        ? this.$t('exp.equationStripModeResonance')
        : this.$t('exp.equationStripModeSchwan')
    },

    symbolicFormula(): string {
      return this.isResonance
        ? 'DR(f) = 1 / (1 + (2·Q·(f − f₀)/f₀)²)'
        : 'V_m = 1.5 · E · R · cosθ / √(1 + (ω·τ)²)'
    },

    citation(): string {
      return this.isResonance
        ? this.$t('exp.equationStripCiteResonance')
        : this.$t('exp.equationStripCiteSchwan')
    },

    fieldVcm(): number  { return this.cellStore.fieldIntensity },
    freqKHz(): number   { return this.cellStore.currentBroadcastFrequency },
    cosTheta(): number  { return this.cellStore.cosThetaFactor },

    targetTauUs(): number {
      const s = computeTau(this.cellStore.effectiveTarget, this.cellStore.effectiveSigmaE)
      return s * 1e6
    },
    healthyTauUs(): number {
      const s = computeTau(this.cellStore.effectiveHealthy, this.cellStore.effectiveSigmaE)
      return s * 1e6
    },

    targetSubstituted(): string {
      if (this.isResonance) return this.lorentzianSubstituted(this.cellStore.target)
      return this.schwanSubstituted(this.cellStore.target.radius, this.targetTauUs)
    },

    healthySubstituted(): string {
      if (this.isResonance) return this.lorentzianSubstituted(this.cellStore.healthy)
      return this.schwanSubstituted(this.cellStore.healthy.radius, this.healthyTauUs)
    },

    targetResult(): string {
      if (this.isResonance) {
        return `${(this.cellStore.targetDisruptionRatio * 100).toFixed(1)} %`
      }
      return `${this.cellStore.targetVm.toFixed(3)} V`
    },

    healthyResult(): string {
      if (this.isResonance) {
        return `${(this.cellStore.healthyDisruptionRatio * 100).toFixed(1)} %`
      }
      return `${this.cellStore.healthyVm.toFixed(3)} V`
    },
  },

  methods: {
    schwanSubstituted(radiusUm: number, tauUs: number): string {
      const E    = this.fieldVcm.toFixed(0)
      const R    = radiusUm.toFixed(2)
      const cosT = this.cosTheta.toFixed(3)
      const f    = this.formatFreq(this.freqKHz)
      const tau  = this.formatTau(tauUs)
      return `1.5 · ${E} V/cm · ${R} µm · ${cosT} / √(1 + (2π · ${f} · ${tau})²)`
    },

    lorentzianSubstituted(cell: { resonantFreqGHz?: number, capsidQ?: number }): string {
      const f0 = cell.resonantFreqGHz
      const Q  = cell.capsidQ
      if (f0 == null || Q == null) return this.$t('exp.equationStripNoResonance')
      const fGHz = this.freqKHz / 1e6
      return `1 / (1 + (2 · ${Q.toFixed(1)} · (${fGHz.toFixed(3)} GHz − ${f0.toFixed(2)} GHz) / ${f0.toFixed(2)} GHz)²)`
    },

    formatFreq(khz: number): string {
      if (khz >= 1e6) return `${(khz / 1e6).toFixed(3)} GHz`
      if (khz >= 1e3) return `${(khz / 1e3).toFixed(2)} MHz`
      return `${khz.toFixed(1)} kHz`
    },

    formatTau(us: number): string {
      if (us >= 1) return `${us.toFixed(3)} µs`
      if (us >= 1e-3) return `${(us * 1e3).toFixed(2)} ns`
      return `${(us * 1e6).toFixed(1)} ps`
    },

    openDerivation() {
      this.$router.push({ path: ROUTE.PROTOCOL, hash: this.isResonance ? '#resonance' : '#schwan' })
    },
  },
})
</script>

<style lang="scss" scoped>

.equation-strip {
  @include flex-col(0.35rem);
  padding: 0.45rem 0.65rem;
  background: color-mix(in srgb, var(--color-surface) 92%, transparent);
  border: 1px solid var(--color-border);
  border-left: 2px solid var(--color-primary);
  border-radius: var(--radius);
  margin-bottom: 0.35rem;

  &__header {
    @include flex-row(0.55rem);
    flex-wrap: wrap;
    align-items: baseline;
  }

  &__title {
    @include mono-upper(var(--fs-xxs), 0.1em);
    color: var(--color-text);
    font-weight: 700;
    cursor: help;
  }

  &__mode {
    @include mono-upper(var(--fs-xxs), 0.08em);
    color: var(--color-primary);
    font-weight: 600;
  }

  &__formula {
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
    color: var(--color-text);
    flex: 1 1 auto;
    min-width: 0;
  }

  &__cite {
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    color: var(--color-text-muted);
    opacity: var(--op-muted);
    white-space: nowrap;
  }

  &__derivation {
    @include mono-upper(var(--fs-xxs), 0.08em);
    padding: 0.18rem 0.5rem;
    border-radius: var(--radius);
    border: 1px solid var(--color-border);
    background: transparent;
    color: var(--color-primary);
    cursor: pointer;
    transition: color var(--tr-fast), border-color var(--tr-fast), background var(--tr-fast);

    &:hover {
      border-color: var(--color-primary);
      background: color-mix(in srgb, var(--color-primary) 10%, transparent);
    }
  }

  &__lines {
    @include flex-col(0.2rem);
    padding-top: 0.2rem;
    border-top: 1px solid color-mix(in srgb, var(--color-border) 60%, transparent);
  }

  &__line {
    @include flex-row(0.5rem);
    align-items: baseline;
    flex-wrap: wrap;
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    color: var(--color-text);
  }

  &__badge {
    @include mono-upper(var(--fs-xxs), 0.08em);
    padding: 0.08rem 0.38rem;
    border-radius: 3px;
    font-weight: 700;
    flex-shrink: 0;

    &--target  { @include color-variant(danger, 35%, 12%); }
    &--healthy { @include color-variant(primary, 35%, 12%); }
  }

  &__eq {
    flex: 1 1 auto;
    min-width: 0;
    color: color-mix(in srgb, var(--color-text) 90%, transparent);
  }

  &__equals {
    color: var(--color-text-muted);
    opacity: var(--op-muted);
    flex-shrink: 0;
  }

  &__result {
    font-size: var(--fs-md);
    font-weight: 700;
    flex-shrink: 0;

    &--target  { color: var(--color-danger); }
    &--healthy { color: var(--color-primary); }
  }

  @media (max-width: 900px) {
    padding: 0.35rem 0.5rem;

    &__formula,
    &__eq {
      font-size: var(--fs-xxs);
    }

    &__result { font-size: var(--fs-sm); }
  }
}

</style>
