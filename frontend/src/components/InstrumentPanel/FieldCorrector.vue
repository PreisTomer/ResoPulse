<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="field-corrector">
    <div class="field-corrector__header">
      <div class="field-corrector__title">{{ $t('instrument.corrector.title') }}</div>
      <div class="field-corrector__sub">{{ $t('instrument.corrector.sub') }}</div>
    </div>

    <!-- Status badge -->
    <div
      class="field-corrector__status"
      :class="{
        'field-corrector__status--ok':     correctionPct < 2,
        'field-corrector__status--minor':  correctionPct >= 2 && correctionPct < 8,
        'field-corrector__status--needed': correctionPct >= 8,
      }"
    >
      <span class="field-corrector__status-dot"></span>
      <span class="field-corrector__status-label">
        {{ correctionPct < 2
          ? $t('instrument.corrector.statusOk')
          : correctionPct < 8
            ? $t('instrument.corrector.statusMinor')
            : $t('instrument.corrector.statusNeeded') }}
      </span>
    </div>

    <!-- Field comparison -->
    <div class="field-corrector__comparison">
      <!-- Target -->
      <div class="field-corrector__field-row" v-tip="$t('instrument.corrector.tipTarget')">
        <div class="field-corrector__field-label">{{ $t('instrument.corrector.targetField') }}</div>
        <div class="field-corrector__field-value">
          {{ targetFieldDisplay }}
          <span class="field-corrector__field-unit">{{ UNIT.V_PER_CM }}</span>
        </div>
      </div>

      <!-- Arrow -->
      <div class="field-corrector__arrow" aria-hidden="true">{{ ICON.ARROW_D }}</div>

      <!-- Corrected -->
      <div
        class="field-corrector__field-row field-corrector__field-row--corrected"
        v-tip="$t('instrument.corrector.tipCorrected')"
      >
        <div class="field-corrector__field-label">{{ $t('instrument.corrector.correctedField') }}</div>
        <div class="field-corrector__field-value field-corrector__field-value--corrected">
          {{ correctedFieldDisplay }}
          <span class="field-corrector__field-unit">{{ UNIT.V_PER_CM }}</span>
        </div>
      </div>
    </div>

    <!-- Factor row -->
    <div class="field-corrector__factor-row" v-tip="$t('instrument.corrector.tipFactor')">
      <span class="field-corrector__factor-label">{{ $t('instrument.corrector.factor') }}</span>
      <span
        class="field-corrector__factor-value"
        :class="{ 'field-corrector__factor-value--warn': correctionPct > 5 }"
      >
        {{ ICON.TIMES }}{{ factorDisplay }}
      </span>
    </div>

    <!-- VSWR / power delivery row (RF mode only) -->
    <div
      v-if="!store.isLowImpedanceSource"
      class="field-corrector__rf-section"
      v-tip="tipVSWR"
    >
      <div class="field-corrector__rf-row">
        <span class="field-corrector__rf-label">{{ $t('instrument.corrector.vswr') }}</span>
        <span
          class="field-corrector__rf-value"
          :class="{
            'field-corrector__rf-value--ok':   vswrNum <= 2,
            'field-corrector__rf-value--warn':  vswrNum > 2 && vswrNum <= 5,
            'field-corrector__rf-value--danger': vswrNum > 5,
          }"
        >{{ vswrDisplay }}</span>
      </div>
      <div class="field-corrector__rf-row">
        <span class="field-corrector__rf-label">{{ $t('instrument.corrector.powerEfficiency') }}</span>
        <span
          class="field-corrector__rf-value"
          :class="{
            'field-corrector__rf-value--ok':     powerEfficiency >= 0.90,
            'field-corrector__rf-value--warn':   powerEfficiency >= 0.75 && powerEfficiency < 0.90,
            'field-corrector__rf-value--danger': powerEfficiency < 0.75,
          }"
        >{{ powerEfficiencyDisplay }}</span>
      </div>
    </div>

    <!-- Pulse RC bandwidth check (pulsed mode only) -->
    <div
      v-if="store.pulseBandwidthStatus !== 'cw'"
      class="field-corrector__rc-row"
      :class="{
        'field-corrector__rc-row--ok':       store.pulseBandwidthStatus === 'ok',
        'field-corrector__rc-row--marginal': store.pulseBandwidthStatus === 'marginal',
        'field-corrector__rc-row--critical': store.pulseBandwidthStatus === 'critical',
      }"
      v-tip="tipRCBandwidth"
    >
      <span class="field-corrector__rc-icon">{{ rcIcon }}</span>
      <span class="field-corrector__rc-text">{{ rcStatusLabel }}</span>
      <span class="field-corrector__rc-ratio">t_p / τ_RC = {{ store.pulseToRCRatio.toFixed(1) }}</span>
    </div>

    <!-- Source impedance context note -->
    <div class="field-corrector__source-note" v-tip="$t('instrument.corrector.tipSourceNote')">
      <span class="field-corrector__source-label">{{ $t('instrument.corrector.sourceNote') }}</span>
      <span class="field-corrector__source-value">{{ store.sourceImpedanceOhm }} {{ UNIT.OHM }}</span>
    </div>

    <!-- Formula note -->
    <div class="field-corrector__formula">
      {{ $t('instrument.corrector.formula') }}
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
  name: 'FieldCorrector',
  setup() {
    return {
      store:     useImpedanceStore(),
      cellStore: useCellStore(),
      UNIT,
      ICON,
    }
  },
  computed: {
    correctionPct(): number {
      return Math.max(0, (this.store.voltageCorrectionFactor - 1) * 100)
    },
    targetFieldDisplay(): string {
      return this.cellStore.fieldIntensity.toFixed(0)
    },
    correctedFieldDisplay(): string {
      return this.store.correctedFieldVcm.toFixed(1)
    },
    factorDisplay(): string {
      return this.store.voltageCorrectionFactor.toFixed(4)
    },
    vswrNum(): number {
      return isFinite(this.store.vswr) ? this.store.vswr : 99
    },
    vswrDisplay(): string {
      return isFinite(this.store.vswr) ? this.store.vswr.toFixed(2) : '∞'
    },
    powerEfficiency(): number {
      return this.store.powerDeliveryEfficiency
    },
    powerEfficiencyDisplay(): string {
      return `${(this.store.powerDeliveryEfficiency * 100).toFixed(1)}${this.UNIT.PERCENT}`
    },
    rcIcon(): string {
      const s = this.store.pulseBandwidthStatus
      if (s === 'ok')       return this.ICON.CHECK
      if (s === 'critical') return this.ICON.WARNING
      return this.ICON.INFO
    },
    rcStatusLabel(): string {
      return this.$t(`instrument.corrector.rcStatus_${this.store.pulseBandwidthStatus}`)
    },
    tipRCBandwidth(): string {
      return this.$t('instrument.corrector.tipRCBandwidth', {
        tp:    this.cellStore.pulseWidthNs.toFixed(1),
        tau:   this.store.cuvetteRCTimeConstantNs.toFixed(2),
        ratio: this.store.pulseToRCRatio.toFixed(2),
        sigma: this.store.sigmaEWithLysis.toFixed(3),
      })
    },
    tipVSWR(): string {
      return this.$t('instrument.corrector.tipVSWR', {
        vswr:       this.vswrDisplay,
        efficiency: this.powerEfficiencyDisplay,
        gamma:      this.store.reflectionCoeff.toFixed(3),
        z0:         this.store.sourceImpedanceOhm,
        zLoad:      this.store.currentImpedanceMagAtFreqOhm.toFixed(1),
      })
    },
  },
})
</script>

<style lang="scss" scoped>


.field-corrector {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;

  &__header {
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--color-border);
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

  &__status {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.4rem 0.65rem;
    border-radius: var(--radius);
    font-size: var(--fs-sm);
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    border: 1px solid;

    &--ok      { color: var(--color-accent); border-color: var(--color-accent); background: color-mix(in srgb, var(--color-accent) 6%, transparent); }
    &--minor   { color: var(--color-amber-warm); border-color: var(--color-amber-warm); background: color-mix(in srgb, var(--color-amber-warm) 6%, transparent); }
    &--needed  { color: var(--color-primary); border-color: var(--color-primary); background: color-mix(in srgb, var(--color-primary) 7%, transparent); }

    &-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
    }
  }

  &__comparison {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  &__field-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    cursor: default;

    &--corrected {
      background: color-mix(in srgb, var(--color-primary) 5%, transparent);
      border: 1px solid color-mix(in srgb, var(--color-primary) 20%, transparent);
      border-radius: var(--radius);
      padding: 0.5rem 0.7rem;
    }
  }

  &__arrow {
    text-align: center;
    color: var(--color-text-muted);
    font-size: 1rem;
  }

  &__field-label {
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
  }

  &__field-value {
    font-family: var(--font-mono);
    font-size: 1.25rem;
    font-weight: 700;
    color: var(--color-text);

    &--corrected { color: var(--color-primary); }
  }

  &__field-unit {
    font-size: var(--fs-xxs);
    font-weight: 400;
    color: var(--color-text-muted);
    margin-left: 0.2rem;
  }

  &__factor-row {
    @include flex-between();
    font-size: var(--fs-sm);
    padding: 0.4rem 0;
    border-top: 1px solid var(--color-border);
    cursor: default;
  }

  &__factor-label {
    color: var(--color-text-muted);
  }

  &__factor-value {
    font-family: var(--font-mono);
    font-size: var(--fs-xl);
    color: var(--color-text);

    &--warn { color: var(--color-amber-warm); }
  }

  &__rf-section {
    @include flex-col(0.4rem);
    padding: 0.55rem 0.7rem;
    background: color-mix(in srgb, var(--color-primary) 4%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-primary) 18%, transparent);
    border-radius: var(--radius);
    cursor: default;
  }

  &__rf-row {
    @include flex-between();
    font-size: var(--fs-sm);
  }

  &__rf-label {
    color: var(--color-text-muted);
  }

  &__rf-value {
    font-family: var(--font-mono);
    font-size: var(--fs-md);
    font-weight: 600;
    color: var(--color-text);

    &--ok     { color: var(--color-accent); }
    &--warn   { color: var(--color-amber-warm); }
    &--danger { color: var(--color-danger); }
  }

  &__rc-row {
    @include flex-row(0.45rem);
    font-size: var(--fs-xs);
    padding: 0.35rem 0.6rem;
    border-radius: var(--radius);
    border: 1px solid var(--color-border);

    &--ok       { border-color: color-mix(in srgb, var(--color-accent) 25%, transparent);  background: color-mix(in srgb, var(--color-accent) 4%, transparent); }
    &--marginal { border-color: color-mix(in srgb, var(--color-amber) 35%, transparent); background: color-mix(in srgb, var(--color-amber) 5%, transparent); }
    &--critical { border-color: color-mix(in srgb, var(--color-danger) 40%, transparent);  background: color-mix(in srgb, var(--color-danger) 6%, transparent); }
  }

  &__rc-icon {
    flex-shrink: 0;
    font-size: var(--fs-xs);
  }

  &__rc-text {
    flex: 1;
    color: var(--color-text-muted);
  }

  &__rc-ratio {
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    color: var(--color-text);
    white-space: nowrap;
  }

  &__source-note {
    @include flex-between();
    font-size: var(--fs-xxs);
    color: var(--color-text-muted);
    padding: 0.25rem 0;
    border-top: 1px solid var(--color-border);
    cursor: default;
  }

  &__source-label {
    @include mono-upper(0.6rem, 0.06em);
    opacity: var(--op-dim);
    color: var(--color-text-muted);
  }

  &__source-value {
    font-family: var(--font-mono);
    color: var(--color-text);
  }

  &__formula {
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    color: var(--color-text-muted);
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    padding: 0.4rem 0.6rem;
    letter-spacing: 0.02em;
  }
}
</style>
