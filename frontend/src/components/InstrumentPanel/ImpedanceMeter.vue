<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="imp-meter">
    <div class="imp-meter__header">
      <div class="imp-meter__title-group">
        <div class="imp-meter__title">{{ $t('instrument.meter.title') }}</div>
        <div class="imp-meter__sub">{{ $t('instrument.meter.sub') }}</div>
      </div>
      <!-- Lysis progress pill -->
      <div
        class="imp-meter__lysis-pill"
        :class="{
          'imp-meter__lysis-pill--warn': lysedPct > 0 && lysedPct < 100,
          'imp-meter__lysis-pill--full': lysedPct >= 100,
        }"
      >
        {{ $t('instrument.meter.lysedPctLabel', { pct: lysedPct.toFixed(0) }) }}
      </div>
    </div>

    <!-- Stat grid -->
    <div class="imp-meter__grid">
      <!-- Nominal Z (DC) -->
      <div class="imp-meter__stat" v-tip="$t('instrument.meter.tipNominal')">
        <div class="imp-meter__stat-label">{{ $t('instrument.meter.nominalZ') }}</div>
        <div class="imp-meter__stat-value">{{ nominalDisplay }} <span class="imp-meter__stat-unit">{{ UNIT.OHM }}</span></div>
      </div>

      <!-- |Z(f)| at broadcast frequency -->
      <div class="imp-meter__stat imp-meter__stat--live" v-tip="tipZAtFreq">
        <div class="imp-meter__stat-label">{{ $t('instrument.meter.zAtFreq') }}</div>
        <div class="imp-meter__stat-value imp-meter__stat-value--primary">
          {{ zAtFreqDisplay }} <span class="imp-meter__stat-unit">{{ UNIT.OHM }}</span>
        </div>
      </div>

      <!-- σ_e base -->
      <div class="imp-meter__stat" v-tip="$t('instrument.meter.tipSigmaBase')">
        <div class="imp-meter__stat-label">{{ $t('instrument.meter.sigmaBase') }}</div>
        <div class="imp-meter__stat-value">{{ sigmaBaseDisplay }} <span class="imp-meter__stat-unit">{{ UNIT.S_PER_M }}</span></div>
      </div>

      <!-- σ_e live -->
      <div class="imp-meter__stat imp-meter__stat--live" v-tip="$t('instrument.meter.tipSigmaLive')">
        <div class="imp-meter__stat-label">{{ $t('instrument.meter.sigmaLive') }}</div>
        <div class="imp-meter__stat-value imp-meter__stat-value--primary">
          {{ sigmaLiveDisplay }} <span class="imp-meter__stat-unit">{{ UNIT.S_PER_M }}</span>
        </div>
      </div>
    </div>

    <!-- Relaxation frequency note -->
    <div class="imp-meter__relax-note" v-tip="$t('instrument.meter.tipRelax')">
      <span class="imp-meter__relax-label">{{ $t('instrument.meter.relaxFreq') }}</span>
      <span class="imp-meter__relax-value">{{ $t('instrument.meter.relaxFreqValue', { freq: relaxFreqDisplay }) }}</span>
    </div>

    <!-- Drift bar -->
    <div class="imp-meter__drift-section" v-tip="$t('instrument.meter.tipDrift')">
      <div class="imp-meter__drift-label">
        <span>{{ $t('instrument.meter.drift') }}</span>
        <span
          class="imp-meter__drift-value"
          :class="{
            'imp-meter__drift-value--warn':  driftPct < -DRIFT_WARN_PCT,
            'imp-meter__drift-value--danger': driftPct < -DRIFT_DANGER_PCT,
          }"
        >{{ driftSign }}{{ Math.abs(driftPct).toFixed(1) }}{{ UNIT.PERCENT }}</span>
      </div>
      <div class="imp-meter__drift-track">
        <div
          class="imp-meter__drift-fill"
          :class="{
            'imp-meter__drift-fill--warn':   Math.abs(driftPct) > DRIFT_WARN_PCT,
            'imp-meter__drift-fill--danger': Math.abs(driftPct) > DRIFT_DANGER_PCT,
          }"
          :style="{ width: `${Math.min(100, Math.abs(driftPct) * DRIFT_BAR_SCALE)}%` }"
        ></div>
      </div>
    </div>

    <!-- φ + field distortion -->
    <div
      class="imp-meter__phi-row"
      :class="{ 'imp-meter__phi-row--warn': impedanceStore.fieldDistortionLevel !== 'none' }"
      v-tip="tipFieldDistortion"
    >
      <span class="imp-meter__phi-label">{{ $t('instrument.meter.volFraction') }}</span>
      <span class="imp-meter__phi-value">
        φ = {{ (impedanceStore.cellVolumeFraction * 100).toFixed(3) }}{{ UNIT.PERCENT }}
        <span
          v-if="impedanceStore.fieldDistortionLevel !== 'none'"
          class="imp-meter__phi-factor"
          :class="{ 'imp-meter__phi-factor--warn': impedanceStore.fieldDistortionLevel === 'significant' }"
        > · E ×{{ impedanceStore.fieldDistortionFactor.toFixed(3) }}</span>
      </span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'
import { useImpedanceStore } from '@/stores/impedanceStore'
import { useCellStore } from '@/stores/cellStore'
import { UNIT } from '@/constants/units'
import { ICON } from '@/constants/icons'
import { DRIFT_WARN_PCT, DRIFT_DANGER_PCT, DRIFT_BAR_SCALE } from '@/constants/physics'

export default defineComponent({
  name: 'ImpedanceMeter',

  computed: {
    ...mapStores(useImpedanceStore, useCellStore),
    UNIT()            { return UNIT },
    ICON()            { return ICON },
    DRIFT_WARN_PCT()  { return DRIFT_WARN_PCT },
    DRIFT_DANGER_PCT() { return DRIFT_DANGER_PCT },
    DRIFT_BAR_SCALE() { return DRIFT_BAR_SCALE },

    lysedPct(): number {
      return this.impedanceStore.lysedFraction * 100
    },
    nominalDisplay(): string {
      return this.impedanceStore.nominalImpedanceOhm.toFixed(1)
    },
    zAtFreqDisplay(): string {
      return this.impedanceStore.currentImpedanceMagAtFreqOhm.toFixed(1)
    },
    sigmaBaseDisplay(): string {
      return this.cellStore.effectiveSigmaE.toFixed(3)
    },
    sigmaLiveDisplay(): string {
      return this.impedanceStore.sigmaEWithLysis.toFixed(3)
    },
    driftPct(): number {
      return this.impedanceStore.impedanceDriftPct
    },
    driftSign(): string {
      return this.driftPct < 0 ? '−' : this.driftPct > 0 ? '+' : ''
    },
    relaxFreqDisplay(): string {
      return this.impedanceStore.relaxationFreqMHz.toFixed(0)
    },
    tipFieldDistortion(): string {
      return this.$t('instrument.meter.tipFieldDistortion', {
        phi:    (this.impedanceStore.cellVolumeFraction * 100).toFixed(3),
        factor: this.impedanceStore.fieldDistortionFactor.toFixed(4),
        level:  this.impedanceStore.fieldDistortionLevel,
      })
    },
    tipZAtFreq(): string {
      const freqKHz = this.cellStore.currentBroadcastFrequency
      const freqLabel = freqKHz >= 1e6
        ? `${(freqKHz / 1e6).toFixed(3)} ${this.UNIT.GHZ}`
        : freqKHz >= 1000
          ? `${(freqKHz / 1000).toFixed(3)} ${this.UNIT.MHZ}`
          : `${freqKHz.toFixed(1)} ${this.UNIT.KHZ}`
      return this.$t('instrument.meter.tipZAtFreq', {
        freq:    freqLabel,
        relax:   this.impedanceStore.relaxationFreqMHz.toFixed(0),
        zDC:     this.impedanceStore.nominalImpedanceOhm.toFixed(1),
        zF:      this.impedanceStore.currentImpedanceMagAtFreqOhm.toFixed(1),
      })
    },
  },
})
</script>

<style lang="scss" scoped>


.imp-meter {
  display: flex;
  flex-direction: column;
  gap: 1rem;

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--color-border);
    gap: 0.5rem;
  }

  &__title {
    font-size: var(--fs-lg);
    font-weight: 600;
    color: var(--color-text);
  }

  &__sub {
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
    margin-top: 0.15rem;
  }

  &__lysis-pill {
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    padding: 0.2rem 0.55rem;
    border-radius: 1rem;
    background: var(--color-surface-2);
    color: var(--color-text-muted);
    border: 1px solid var(--color-border);
    white-space: nowrap;
    flex-shrink: 0;

    &--warn   { color: var(--color-amber-warm); border-color: var(--color-amber-warm); }
    &--full   { color: var(--color-danger); border-color: var(--color-danger); }
  }

  &__grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  &__stat {
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    padding: 0.6rem 0.75rem;
    cursor: default;

    &--live {
      border-color: color-mix(in srgb, var(--color-primary) 25%, transparent);
      background: color-mix(in srgb, var(--color-primary) 4%, transparent);
    }

    &-label {
      font-size: var(--fs-xxs);
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 0.25rem;
    }

    &-value {
      font-family: var(--font-mono);
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--color-text);

      &--primary { color: var(--color-primary); }
    }

    &-unit {
      font-size: var(--fs-xxs);
      font-weight: 400;
      color: var(--color-text-muted);
    }
  }

  &__drift-section {
    cursor: default;
  }

  &__drift-label {
    @include flex-between();
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
    margin-bottom: 0.35rem;
  }

  &__drift-value {
    font-family: var(--font-mono);
    font-size: var(--fs-md);
    color: var(--color-text);

    &--warn   { color: var(--color-amber-warm); }
    &--danger { color: var(--color-danger); }
  }

  &__drift-track {
    height: 5px;
    background: var(--color-border);
    border-radius: 3px;
    overflow: hidden;
  }

  &__drift-fill {
    height: 100%;
    border-radius: 3px;
    background: var(--color-primary);
    transition: width var(--tr-slow);

    &--warn   { background: var(--color-amber-warm); }
    &--danger { background: var(--color-danger); }
  }

  &__phi-row {
    @include flex-between();
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
    padding-top: 0.25rem;
    border-top: 1px solid var(--color-border);
    cursor: default;

    &--warn { border-top-color: color-mix(in srgb, var(--color-amber) 35%, transparent); }
  }

  &__phi-value {
    font-family: var(--font-mono);
    color: var(--color-text);
  }

  &__phi-factor {
    color: var(--color-primary);
    &--warn { color: var(--color-amber-warm); }
  }

  &__relax-note {
    @include flex-between();
    font-size: var(--fs-xxs);
    color: var(--color-text-muted);
    padding: 0.3rem 0.5rem;
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    cursor: default;
  }

  &__relax-label {
    @include mono-upper(0.6rem, 0.06em);
    opacity: var(--op-dim);
    color: var(--color-text-muted);
  }

  &__relax-value {
    font-family: var(--font-mono);
    color: var(--color-text);
  }
}
</style>
