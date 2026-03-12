<template>
  <div class="cuvette-setup">
    <div class="cuvette-setup__header">
      <span class="cuvette-setup__icon">{{ ICON.FLASK }}</span>
      <div>
        <div class="cuvette-setup__title">{{ $t('instrument.setup.title') }}</div>
        <div class="cuvette-setup__sub">{{ $t('instrument.setup.sub') }}</div>
      </div>
    </div>

    <!-- Preset selector -->
    <div class="cuvette-setup__row" v-tip="$t('instrument.setup.tipPreset')">
      <label class="cuvette-setup__label">{{ $t('instrument.setup.preset') }}</label>
      <select
        class="cuvette-setup__select"
        :value="store.cuvettePresetId"
        @change="store.setCuvettePreset(($event.target as HTMLSelectElement).value)"
      >
        <option v-for="p in CUVETTE_PRESETS" :key="p.id" :value="p.id">{{ p.label }}</option>
      </select>
    </div>

    <!-- Gap -->
    <div class="cuvette-setup__row" v-tip="$t('instrument.setup.tipGap')">
      <label class="cuvette-setup__label">
        {{ $t('instrument.setup.gap') }}
        <span class="cuvette-setup__sub-label">{{ $t('instrument.setup.gapSub') }}</span>
      </label>
      <div class="cuvette-setup__input-row">
        <input
          class="cuvette-setup__number"
          type="number"
          min="0.5"
          max="10"
          step="0.5"
          :value="store.cuvetteGapMm"
          @change="store.setCuvetteGapMm(Number(($event.target as HTMLInputElement).value))"
        />
        <span class="cuvette-setup__unit">{{ UNIT.MM }}</span>
      </div>
    </div>

    <!-- Cross-section -->
    <div class="cuvette-setup__row" v-tip="$t('instrument.setup.tipArea')">
      <label class="cuvette-setup__label">
        {{ $t('instrument.setup.area') }}
        <span class="cuvette-setup__sub-label">{{ $t('instrument.setup.areaSub') }}</span>
      </label>
      <div class="cuvette-setup__input-row">
        <input
          class="cuvette-setup__number"
          type="number"
          min="0.01"
          max="2"
          step="0.01"
          :value="store.cuvetteCrossSectionCm2"
          @change="store.setCuvetteCrossSectionCm2(Number(($event.target as HTMLInputElement).value))"
        />
        <span class="cuvette-setup__unit">{{ UNIT.CM2 }}</span>
      </div>
    </div>

    <!-- Source impedance -->
    <div class="cuvette-setup__row" v-tip="$t('instrument.setup.tipSourceR')">
      <label class="cuvette-setup__label">
        {{ $t('instrument.setup.sourceR') }}
        <span class="cuvette-setup__sub-label">{{ $t('instrument.setup.sourceRSub') }}</span>
      </label>
      <div class="cuvette-setup__input-row">
        <input
          class="cuvette-setup__slider"
          type="range"
          min="0"
          max="200"
          step="1"
          :value="store.sourceImpedanceOhm"
          @input="store.setSourceImpedanceOhm(Number(($event.target as HTMLInputElement).value))"
        />
        <span class="cuvette-setup__readout">{{ store.sourceImpedanceOhm }} {{ UNIT.OHM }}</span>
      </div>
    </div>

    <!-- Cell density -->
    <div class="cuvette-setup__row" v-tip="$t('instrument.setup.tipDensity')">
      <label class="cuvette-setup__label">
        {{ $t('instrument.setup.density') }}
        <span class="cuvette-setup__sub-label">{{ $t('instrument.setup.densitySub') }}</span>
      </label>
      <div class="cuvette-setup__input-row">
        <select
          class="cuvette-setup__select cuvette-setup__select--sm"
          :value="String(store.cellDensityPerMl)"
          @change="store.setCellDensityPerMl(Number(($event.target as HTMLSelectElement).value))"
        >
          <option value="1e5">10⁵ cells/mL</option>
          <option value="1e6">10⁶ cells/mL</option>
          <option value="1e7">10⁷ cells/mL</option>
          <option value="1e8">10⁸ cells/mL</option>
          <option value="1e9">10⁹ cells/mL</option>
        </select>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useImpedanceStore } from '@/stores/impedanceStore'
import { CUVETTE_PRESETS } from '@/constants/cuvette'
import { ICON } from '@/constants/icons'
import { UNIT } from '@/constants/units'

export default defineComponent({
  name: 'CuvetteSetup',
  setup() {
    return { store: useImpedanceStore(), CUVETTE_PRESETS, ICON, UNIT }
  },
})
</script>

<style lang="scss" scoped>
.cuvette-setup {
  display: flex;
  flex-direction: column;
  gap: 1rem;

  &__header {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid var(--color-border);
  }

  &__icon {
    font-size: 1.4rem;
    line-height: 1;
    margin-top: 0.1rem;
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

  &__row {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  &__label {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    display: flex;
    flex-direction: column;
    gap: 0.1rem;
    cursor: default;
  }

  &__sub-label {
    font-size: 0.65rem;
    color: var(--color-text-muted);
    opacity: 0.6;
  }

  &__input-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  &__number {
    width: 80px;
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    color: var(--color-text);
    font-size: 0.8rem;
    padding: 0.3rem 0.5rem;

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }
  }

  &__slider {
    flex: 1;
    -moz-appearance: none;
    appearance: none;
    height: 4px;
    border-radius: 2px;
    background: var(--color-border);
    outline: none;
    cursor: pointer;

    &::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: var(--color-primary);
      cursor: pointer;
    }
  }

  &__readout {
    font-size: 0.8rem;
    font-family: var(--font-mono);
    color: var(--color-primary);
    min-width: 3.5rem;
    text-align: right;
  }

  &__select {
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    color: var(--color-text);
    font-size: 0.8rem;
    padding: 0.35rem 0.5rem;
    cursor: pointer;
    width: 100%;

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    &--sm {
      width: auto;
    }
  }

  &__unit {
    font-size: 0.7rem;
    color: var(--color-text-muted);
  }
}
</style>
