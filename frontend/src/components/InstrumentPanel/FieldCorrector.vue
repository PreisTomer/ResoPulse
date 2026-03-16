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
      <div class="field-corrector__arrow" aria-hidden="true">↓</div>

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
        ×{{ factorDisplay }}
      </span>
    </div>

    <!-- Formula note -->
    <div class="field-corrector__formula">
      E_gen = E_target × (1 + R_s / Z_cuvette)
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useImpedanceStore } from '@/stores/impedanceStore'
import { useCellStore } from '@/stores/cellStore'
import { UNIT } from '@/constants/units'

export default defineComponent({
  name: 'FieldCorrector',
  setup() {
    return {
      store:     useImpedanceStore(),
      cellStore: useCellStore(),
      UNIT,
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
  },
})
</script>

<style lang="scss" scoped>
@use '../../styles/mixins' as *;

.field-corrector {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;

  &__header {
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--color-border);
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

  &__status {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.4rem 0.65rem;
    border-radius: var(--radius);
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    border: 1px solid;

    &--ok      { color: var(--color-accent); border-color: var(--color-accent); background: rgba(0, 255, 100, 0.06); }
    &--minor   { color: var(--color-amber-warm); border-color: var(--color-amber-warm); background: rgba(255, 180, 50, 0.06); }
    &--needed  { color: var(--color-primary); border-color: var(--color-primary); background: rgba(0, 212, 255, 0.07); }

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
      background: rgba(0, 212, 255, 0.05);
      border: 1px solid rgba(0, 212, 255, 0.2);
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
    font-size: 0.72rem;
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
    font-size: 0.65rem;
    font-weight: 400;
    color: var(--color-text-muted);
    margin-left: 0.2rem;
  }

  &__factor-row {
    @include flex-between();
    font-size: 0.75rem;
    padding: 0.4rem 0;
    border-top: 1px solid var(--color-border);
    cursor: default;
  }

  &__factor-label {
    color: var(--color-text-muted);
  }

  &__factor-value {
    font-family: var(--font-mono);
    font-size: 0.9rem;
    color: var(--color-text);

    &--warn { color: var(--color-amber-warm); }
  }

  &__formula {
    font-family: var(--font-mono);
    font-size: 0.65rem;
    color: var(--color-text-muted);
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    padding: 0.4rem 0.6rem;
    letter-spacing: 0.02em;
  }
}
</style>
