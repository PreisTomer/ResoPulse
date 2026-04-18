<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
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
          :class="{ 'hw-input__mode-btn--active': !impedanceStore.hardwareModeEnabled }"
          @click="impedanceStore.hardwareModeEnabled && impedanceStore.toggleHardwareMode()"
          type="button"
        >
          {{ $t('instrument.hardware.modeSimulated') }}
        </button>
        <button
          class="hw-input__mode-btn hw-input__mode-btn--live"
          :class="{ 'hw-input__mode-btn--active': impedanceStore.hardwareModeEnabled }"
          @click="!impedanceStore.hardwareModeEnabled && impedanceStore.toggleHardwareMode()"
          type="button"
        >
          {{ ICON.PLUG }} {{ $t('instrument.hardware.modeLive') }}
        </button>
      </div>
    </div>

    <!-- Live readings (when hardware mode enabled) -->
    <template v-if="impedanceStore.hardwareModeEnabled">
      <!-- Status banner -->
      <div
        class="hw-input__status"
        :class="{
          'hw-input__status--connected': hasReading && !impedanceStore.hardwareReadingIsStale,
          'hw-input__status--stale':     hasReading && impedanceStore.hardwareReadingIsStale,
          'hw-input__status--waiting':   !hasReading,
        }"
      >
        <span class="hw-input__status-dot"></span>
        <span>{{
          !hasReading
            ? $t('instrument.hardware.statusDisconnected')
            : impedanceStore.hardwareReadingIsStale
              ? $t('instrument.hardware.statusStale')
              : $t('instrument.hardware.statusFresh')
        }}</span>
        <span v-if="hasReading" class="hw-input__status-age">{{ readingAgeLabel }}</span>
      </div>

      <!-- Reading data -->
      <div v-if="hasReading" class="hw-input__readings">
        <div class="hw-input__reading-row">
          <span class="hw-input__reading-label">{{ $t('instrument.hardware.zReal') }}</span>
          <span class="hw-input__reading-value">{{ impedanceStore.hardwareZReal!.toFixed(2) }} {{ UNIT.OHM }}</span>
        </div>
        <div class="hw-input__reading-row">
          <span class="hw-input__reading-label">{{ $t('instrument.hardware.zImag') }}</span>
          <span class="hw-input__reading-value">{{ impedanceStore.hardwareZImag!.toFixed(2) }} {{ UNIT.OHM }}</span>
        </div>
        <div class="hw-input__reading-row">
          <span class="hw-input__reading-label">{{ $t('instrument.hardware.freqHz') }}</span>
          <span class="hw-input__reading-value">{{ freqDisplay }}</span>
        </div>
        <div class="hw-input__reading-row">
          <span class="hw-input__reading-label">
            {{ impedanceStore.hardwareConductivity !== null
              ? $t('instrument.hardware.sigmaDirect')
              : $t('instrument.hardware.sigmaDerived') }}
          </span>
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

    <!-- Bridge setup guide button -->
    <button class="hw-input__guide-btn" @click="showSetupModal = true" type="button">
      {{ ICON.PLUG }} {{ $t('instrument.bridgeModal.btnOpen') }}
    </button>

    <BridgeSetupModal :visible="showSetupModal" @close="showSetupModal = false" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'

import { useImpedanceStore } from '@/stores/impedanceStore'

import BridgeSetupModal from '@/components/BridgeSetupModal/index.vue'

import { computeSigmaEFromComplexImpedance } from '@/utils/impedance'

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
  components: { BridgeSetupModal },
  data() {
    return { showSetupModal: false }
  },

  computed: {
    ...mapStores(useImpedanceStore),
    ICON() { return ICON },
    UNIT() { return UNIT },
    schemaExample() { return SCHEMA_EXAMPLE },

    hasReading(): boolean {
      return this.impedanceStore.hardwareZReal !== null
    },
    readingAgeLabel(): string {
      const age = this.impedanceStore.hardwareReadingAgeMs
      if (!isFinite(age)) return this.$t('instrument.hardware.ageNoReading')
      if (age < 1000)     return this.$t('instrument.hardware.ageMs',  { ms: age })
      if (age < 60_000)   return this.$t('instrument.hardware.ageSec', { sec: (age / 1000).toFixed(1) })
      return this.$t('instrument.hardware.ageMin', { min: Math.floor(age / 60_000) })
    },
    freqDisplay(): string {
      const hz = this.impedanceStore.hardwareFreqHz
      if (hz === null) return '\u2014'
      if (hz >= 1e6) return `${(hz / 1e6).toFixed(2)} ${UNIT.MHZ}`
      if (hz >= 1e3) return `${(hz / 1e3).toFixed(1)} ${UNIT.KHZ}`
      return `${hz} ${UNIT.HZ}`
    },
    derivedSigma(): string {
      // Prefer direct conductivity from instrument — no geometry assumptions.
      const direct = this.impedanceStore.hardwareConductivity
      if (direct !== null) return direct.toFixed(4)
      const zReal = this.impedanceStore.hardwareZReal
      if (zReal === null) return '\u2014'
      // Use complex formula (Re[Y]·d/A) consistent with sigmaEForImpedance.
      return computeSigmaEFromComplexImpedance(
        this.impedanceStore.cuvetteGapMm,
        this.impedanceStore.cuvetteCrossSectionCm2,
        zReal,
        this.impedanceStore.hardwareZImag ?? 0,
      ).toFixed(4)
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
    font-size: var(--fs-lg);
    font-weight: 600;
    color: var(--color-text);
  }

  &__sub {
    font-size: var(--fs-xs);
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
    font-size: var(--fs-xs);
    padding: 0.3rem 0.7rem;
    background: transparent;
    border: none;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: background-color var(--tr-fast), color var(--tr-fast);

    &:hover { background: var(--color-surface-2); color: var(--color-text); }

    &--active {
      background: var(--color-surface-2);
      color: var(--color-text);
    }

    &--live#{&}--active {
      background: color-mix(in srgb, var(--color-primary) 12%, transparent);
      color: var(--color-primary);
    }
  }

  &__status {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    font-size: var(--fs-sm);
    padding: 0.4rem 0.65rem;
    border-radius: var(--radius);
    border: 1px solid var(--color-border);
    background: var(--color-surface-2);

    &--connected { border-color: var(--color-accent); color: var(--color-accent); background: color-mix(in srgb, var(--color-accent) 6%, transparent); }
    &--stale     { border-color: var(--color-amber-warm); color: var(--color-amber-warm); background: color-mix(in srgb, var(--color-amber-warm) 6%, transparent); }
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
      font-size: var(--fs-xxs);
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
    @include flex-between();
    font-size: var(--fs-sm);
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
      font-size: var(--fs-sm);
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
        font-size: var(--fs-xs);
        color: var(--color-primary);
        background: color-mix(in srgb, var(--color-primary) 8%, transparent);
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
      font-size: var(--fs-xs);
      color: var(--color-text-muted);
      line-height: 1.5;
      margin: 0;
    }
  }

  &__schema {
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
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

  &__guide-btn {
    @include flex-row(0.4rem);
    width: 100%;
    justify-content: center;
    background: color-mix(in srgb, var(--color-primary) 6%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-primary) 25%, transparent);
    border-radius: var(--radius);
    color: var(--color-primary);
    font-size: var(--fs-sm);
    padding: 0.5rem 0.75rem;
    cursor: pointer;
    transition: background var(--tr-fast), border-color var(--tr-fast);

    &:hover {
      background: color-mix(in srgb, var(--color-primary) 12%, transparent);
      border-color: color-mix(in srgb, var(--color-primary) 40%, transparent);
    }
  }
}
</style>
