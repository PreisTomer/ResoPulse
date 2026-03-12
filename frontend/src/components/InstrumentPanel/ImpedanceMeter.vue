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
        {{ lysedPct.toFixed(0) }}{{ UNIT.PERCENT }} lysed
      </div>
    </div>

    <!-- Stat grid -->
    <div class="imp-meter__grid">
      <!-- Nominal Z -->
      <div class="imp-meter__stat" v-tip="$t('instrument.meter.tipNominal')">
        <div class="imp-meter__stat-label">{{ $t('instrument.meter.nominalZ') }}</div>
        <div class="imp-meter__stat-value">{{ nominalDisplay }} <span class="imp-meter__stat-unit">{{ UNIT.OHM }}</span></div>
      </div>

      <!-- Current Z -->
      <div class="imp-meter__stat imp-meter__stat--live" v-tip="$t('instrument.meter.tipCurrent')">
        <div class="imp-meter__stat-label">{{ $t('instrument.meter.currentZ') }}</div>
        <div class="imp-meter__stat-value imp-meter__stat-value--primary">
          {{ currentDisplay }} <span class="imp-meter__stat-unit">{{ UNIT.OHM }}</span>
        </div>
      </div>

      <!-- σ_e base -->
      <div class="imp-meter__stat" v-tip="$t('instrument.meter.tipSigmaLive')">
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

    <!-- Drift bar -->
    <div class="imp-meter__drift-section" v-tip="$t('instrument.meter.tipDrift')">
      <div class="imp-meter__drift-label">
        <span>{{ $t('instrument.meter.drift') }}</span>
        <span
          class="imp-meter__drift-value"
          :class="{
            'imp-meter__drift-value--warn':  driftPct < -5,
            'imp-meter__drift-value--danger': driftPct < -15,
          }"
        >{{ driftSign }}{{ Math.abs(driftPct).toFixed(1) }}{{ UNIT.PERCENT }}</span>
      </div>
      <div class="imp-meter__drift-track">
        <div
          class="imp-meter__drift-fill"
          :class="{
            'imp-meter__drift-fill--warn':   Math.abs(driftPct) > 5,
            'imp-meter__drift-fill--danger': Math.abs(driftPct) > 15,
          }"
          :style="{ width: `${Math.min(100, Math.abs(driftPct) * 3)}%` }"
        ></div>
      </div>
    </div>

    <!-- φ detail -->
    <div class="imp-meter__phi-row">
      <span class="imp-meter__phi-label">{{ $t('instrument.meter.volFraction') }}</span>
      <span class="imp-meter__phi-value">φ = {{ (store.cellVolumeFraction * 100).toFixed(3) }}{{ UNIT.PERCENT }}</span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useImpedanceStore } from '@/stores/impedanceStore'
import { useCellStore } from '@/stores/cellStore'
import { UNIT } from '@/constants/units'
import { ICON } from '@/constants/icons'

export default defineComponent({
  name: 'ImpedanceMeter',
  setup() {
    return {
      store:     useImpedanceStore(),
      cellStore: useCellStore(),
      UNIT,
      ICON,
    }
  },
  computed: {
    lysedPct(): number {
      return this.store.lysedFraction * 100
    },
    nominalDisplay(): string {
      return this.store.nominalImpedanceOhm.toFixed(1)
    },
    currentDisplay(): string {
      return this.store.currentImpedanceOhm.toFixed(1)
    },
    sigmaBaseDisplay(): string {
      return this.cellStore.effectiveSigmaE.toFixed(3)
    },
    sigmaLiveDisplay(): string {
      return this.store.sigmaEWithLysis.toFixed(3)
    },
    driftPct(): number {
      return this.store.impedanceDriftPct
    },
    driftSign(): string {
      return this.driftPct < 0 ? '−' : this.driftPct > 0 ? '+' : ''
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
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text);
  }

  &__sub {
    font-size: 0.7rem;
    color: var(--color-text-muted);
    margin-top: 0.15rem;
  }

  &__lysis-pill {
    font-size: 0.65rem;
    font-family: var(--font-mono);
    padding: 0.2rem 0.55rem;
    border-radius: 1rem;
    background: var(--color-surface-2);
    color: var(--color-text-muted);
    border: 1px solid var(--color-border);
    white-space: nowrap;
    flex-shrink: 0;

    &--warn   { color: var(--color-amber-warm); border-color: var(--color-amber-warm); }
    &--full   { color: var(--color-danger, #ff4444); border-color: var(--color-danger, #ff4444); }
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
      border-color: rgba(0, 212, 255, 0.25);
      background: rgba(0, 212, 255, 0.04);
    }

    &-label {
      font-size: 0.65rem;
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
      font-size: 0.65rem;
      font-weight: 400;
      color: var(--color-text-muted);
    }
  }

  &__drift-section {
    cursor: default;
  }

  &__drift-label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.75rem;
    color: var(--color-text-muted);
    margin-bottom: 0.35rem;
  }

  &__drift-value {
    font-family: var(--font-mono);
    font-size: 0.8rem;
    color: var(--color-text);

    &--warn   { color: var(--color-amber-warm); }
    &--danger { color: var(--color-danger, #ff4444); }
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
    transition: width 0.3s ease;

    &--warn   { background: var(--color-amber-warm); }
    &--danger { background: var(--color-danger, #ff4444); }
  }

  &__phi-row {
    display: flex;
    justify-content: space-between;
    font-size: 0.7rem;
    color: var(--color-text-muted);
    padding-top: 0.25rem;
    border-top: 1px solid var(--color-border);
  }

  &__phi-value {
    font-family: var(--font-mono);
    color: var(--color-text);
  }
}
</style>
