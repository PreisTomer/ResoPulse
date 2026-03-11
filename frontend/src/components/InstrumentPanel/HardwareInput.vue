<template>
  <div class="hw-input">
    <div class="hw-input__header">
      <div class="hw-input__title-group">
        <div class="hw-input__title">{{ $t('instrument.hardware.title') }}</div>
        <div class="hw-input__sub">{{ $t('instrument.hardware.sub') }}</div>
      </div>
      <!-- Mode toggle -->
      <div class="hw-input__mode-toggle" v-tip="$t('instrument.hardware.tipMode')">
        <button
          class="hw-input__mode-btn"
          :class="{ 'hw-input__mode-btn--active': !store.hardwareModeEnabled }"
          @click="store.hardwareModeEnabled && store.toggleHardwareMode()"
          type="button"
        >
          {{ $t('instrument.hardware.modeSimulated') }}
        </button>
        <button
          class="hw-input__mode-btn hw-input__mode-btn--live"
          :class="{ 'hw-input__mode-btn--active': store.hardwareModeEnabled }"
          @click="!store.hardwareModeEnabled && store.toggleHardwareMode()"
          type="button"
        >
          {{ ICON.PLUG }} {{ $t('instrument.hardware.modeLive') }}
        </button>
      </div>
    </div>

    <!-- Live readings (when hardware mode enabled) -->
    <template v-if="store.hardwareModeEnabled">
      <!-- Status banner -->
      <div
        class="hw-input__status"
        :class="{
          'hw-input__status--connected': hasReading && !store.hardwareReadingIsStale,
          'hw-input__status--stale':     hasReading && store.hardwareReadingIsStale,
          'hw-input__status--waiting':   !hasReading,
        }"
      >
        <span class="hw-input__status-dot"></span>
        <span>{{
          !hasReading
            ? $t('instrument.hardware.statusDisconnected')
            : store.hardwareReadingIsStale
              ? $t('instrument.hardware.statusStale')
              : $t('instrument.hardware.statusFresh')
        }}</span>
        <span v-if="hasReading" class="hw-input__status-age">{{ store.hardwareReadingAgeLabel }}</span>
      </div>

      <!-- Reading data -->
      <div v-if="hasReading" class="hw-input__readings">
        <div class="hw-input__reading-row">
          <span class="hw-input__reading-label">{{ $t('instrument.hardware.zReal') }}</span>
          <span class="hw-input__reading-value">{{ store.hardwareZReal!.toFixed(2) }} {{ UNIT.OHM }}</span>
        </div>
        <div class="hw-input__reading-row">
          <span class="hw-input__reading-label">{{ $t('instrument.hardware.zImag') }}</span>
          <span class="hw-input__reading-value">{{ store.hardwareZImag!.toFixed(2) }} {{ UNIT.OHM }}</span>
        </div>
        <div class="hw-input__reading-row">
          <span class="hw-input__reading-label">{{ $t('instrument.hardware.freqHz') }}</span>
          <span class="hw-input__reading-value">{{ freqDisplay }}</span>
        </div>
        <div class="hw-input__reading-row">
          <span class="hw-input__reading-label">{{ $t('instrument.hardware.sigmaDerived') }}</span>
          <span class="hw-input__reading-value">{{ derivedSigma }} {{ UNIT.S_PER_M }}</span>
        </div>
      </div>
    </template>

    <!-- Integration guide (collapsible) -->
    <details class="hw-input__guide">
      <summary class="hw-input__guide-summary">
        {{ ICON.INFO }} {{ $t('instrument.hardware.socketEvent') }}: <code>impedanceReading</code>
      </summary>
      <div class="hw-input__guide-body">
        <p class="hw-input__guide-note">{{ $t('instrument.hardware.schemaNote') }}</p>
        <pre class="hw-input__schema">{{ schemaExample }}</pre>
        <p class="hw-input__guide-note" v-html="$t('instrument.hardware.tipSocket').replace(/\n/g, '<br>')"></p>
      </div>
    </details>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useImpedanceStore } from '@/stores/impedanceStore'
import { computeSigmaEFromImpedance } from '@/utils/impedance'
import { ICON } from '@/constants/icons'
import { UNIT } from '@/constants/units'

const SCHEMA_EXAMPLE = `{
  "zReal":       245.3,
  "zImag":       -12.1,
  "freqHz":      50000,
  "conductivity": 1.52,
  "timestamp":   1720000000000
}`

export default defineComponent({
  name: 'HardwareInput',
  setup() {
    return { store: useImpedanceStore(), ICON, UNIT, schemaExample: SCHEMA_EXAMPLE }
  },
  computed: {
    hasReading(): boolean {
      return this.store.hardwareZReal !== null
    },
    freqDisplay(): string {
      const hz = this.store.hardwareFreqHz
      if (hz === null) return '—'
      if (hz >= 1e6) return `${(hz / 1e6).toFixed(2)} MHz`
      if (hz >= 1e3) return `${(hz / 1e3).toFixed(1)} kHz`
      return `${hz} Hz`
    },
    derivedSigma(): string {
      const z = this.store.hardwareZReal
      if (z === null) return '—'
      return computeSigmaEFromImpedance(this.store.cuvetteGapMm, this.store.cuvetteCrossSectionCm2, z).toFixed(4)
    },
  },
})
</script>

<style lang="scss" scoped>
.hw-input {
  display: flex;
  flex-direction: column;
  gap: 0.9rem;

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.75rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--color-border);
    flex-wrap: wrap;
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

  &__mode-toggle {
    display: flex;
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    overflow: hidden;
    flex-shrink: 0;
  }

  &__mode-btn {
    font-size: 0.7rem;
    padding: 0.3rem 0.7rem;
    background: transparent;
    border: none;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: background-color 0.15s, color 0.15s;

    &:hover { background: var(--color-surface-2); color: var(--color-text); }

    &--active {
      background: var(--color-surface-2);
      color: var(--color-text);
    }

    &--live#{&}--active {
      background: rgba(0, 212, 255, 0.12);
      color: var(--color-primary);
    }
  }

  &__status {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    font-size: 0.72rem;
    padding: 0.4rem 0.65rem;
    border-radius: var(--radius);
    border: 1px solid var(--color-border);
    background: var(--color-surface-2);

    &--connected { border-color: var(--color-accent); color: var(--color-accent); background: rgba(0, 255, 100, 0.06); }
    &--stale     { border-color: var(--color-amber-warm); color: var(--color-amber-warm); background: rgba(255, 180, 50, 0.06); }
    &--waiting   { color: var(--color-text-muted); }

    &-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: currentColor;
      flex-shrink: 0;
    }

    &-age {
      margin-left: auto;
      font-family: var(--font-mono);
      font-size: 0.65rem;
    }
  }

  &__readings {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    padding: 0.65rem 0.75rem;
  }

  &__reading-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 0.75rem;
  }

  &__reading-label {
    color: var(--color-text-muted);
  }

  &__reading-value {
    font-family: var(--font-mono);
    color: var(--color-primary);
  }

  &__guide {
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    overflow: hidden;

    &-summary {
      font-size: 0.75rem;
      color: var(--color-text-muted);
      padding: 0.5rem 0.75rem;
      cursor: pointer;
      user-select: none;
      list-style: none;
      display: flex;
      align-items: center;
      gap: 0.4rem;

      &::-webkit-details-marker { display: none; }

      &:hover { color: var(--color-text); background: var(--color-surface-2); }

      code {
        font-family: var(--font-mono);
        font-size: 0.7rem;
        color: var(--color-primary);
        background: rgba(0, 212, 255, 0.08);
        padding: 0.1rem 0.35rem;
        border-radius: 3px;
      }
    }

    &-body {
      padding: 0.75rem;
      border-top: 1px solid var(--color-border);
      display: flex;
      flex-direction: column;
      gap: 0.6rem;
    }

    &-note {
      font-size: 0.7rem;
      color: var(--color-text-muted);
      line-height: 1.5;
      margin: 0;
    }
  }

  &__schema {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--color-primary);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    padding: 0.65rem 0.75rem;
    margin: 0;
    overflow-x: auto;
    line-height: 1.6;
    white-space: pre;
  }
}
</style>
