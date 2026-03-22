<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="snap-bar">
    <span class="snap-bar__label">{{ $t('slider.snapBarLabel') }}</span>
    <div class="snap-bar__pills">
      <button class="snap-bar__pill snap-bar__pill--dc"        type="button" v-tip="$t('slider.tipSnapQuasiDC')"   @click="applyQuasiDC">{{ $t('slider.snapQuasiDC') }}</button>
      <button class="snap-bar__pill snap-bar__pill--selective" type="button" v-tip="$t('slider.tipSnapSelective')" @click="applySelective">{{ $t('slider.snapSelective') }}</button>
      <button class="snap-bar__pill snap-bar__pill--nsep"      type="button" v-tip="$t('slider.tipSnapNsEP')"      @click="applyNsEP">{{ $t('slider.snapNsEP') }}</button>
      <button class="snap-bar__pill snap-bar__pill--thermal"   type="button" v-tip="$t('slider.tipSnapThermal')"   @click="applyThermal">{{ $t('slider.snapThermal') }}</button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import type { PropType } from 'vue'
import { useCellStore } from '@/stores/cellStore'
import { broadcastStateSync } from '@/services/socket'
import { WAVEFORM } from '@/constants/strings'
import type { SliderRange } from '@/constants/sliderBounds'

const QUASI_DC_FIELD_FRACTION  = 0.50   // 50% of target lysis field
const SELECTIVE_FIELD_FRACTION = 0.85   // 85% of target lysis field
const NSEP_FIELD_FRACTION      = 2.00   // 200% of target lysis field (supralytic)
const THERMAL_FIELD_FRACTION   = 0.25   // 25% of target lysis field (mild heating)
const QUASI_DC_FREQ_DIVISOR    = 20     // f = targetFc / 20 (well below fc)
const SELECTIVE_DC             = 0.01   // 1%  duty cycle
const NSEP_DC                  = 1e-5   // 0.001% duty cycle
const SELECTIVE_PW_NS          = 100_000 // 100 µs
const NSEP_PW_NS               = 10     // 10 ns
const NSEP_FREQ_KHZ            = 1_000  // 1 MHz

export default defineComponent({
  props: {
    sliderRanges: { type: Object as PropType<SliderRange>, required: true },
  },

  setup() {
    return { store: useCellStore() }
  },

  methods: {
    clampFreq(khz: number): number {
      return Math.round(Math.max(this.sliderRanges.freqMin, Math.min(this.sliderRanges.freqMax, khz)))
    },

    clampField(vcm: number): number {
      return Math.max(this.sliderRanges.fieldMin, Math.min(this.sliderRanges.fieldMax, vcm))
    },

    applyQuasiDC() {
      const freqKhz = this.clampFreq(Math.max(this.sliderRanges.freqMin, this.store.targetFc / QUASI_DC_FREQ_DIVISOR))
      const fieldVcm = this.clampField(this.store.targetLysisField * QUASI_DC_FIELD_FRACTION)
      this.store.setBroadcastFreqKHz(freqKhz)
      this.store.setFieldIntensity(fieldVcm)
      this.store.setWaveform(WAVEFORM.CW)
      broadcastStateSync()
    },

    applySelective() {
      const freqKhz = this.clampFreq(this.store.optimalFreqResult.khz)
      const fieldVcm = this.clampField(this.store.targetLysisField * SELECTIVE_FIELD_FRACTION)
      this.store.setBroadcastFreqKHz(freqKhz)
      this.store.setFieldIntensity(fieldVcm)
      this.store.setWaveform(WAVEFORM.PULSED)
      this.store.setDutyCycle(SELECTIVE_DC)
      this.store.setPulseWidthNs(SELECTIVE_PW_NS)
      broadcastStateSync()
    },

    applyNsEP() {
      const freqKhz = this.clampFreq(NSEP_FREQ_KHZ)
      const fieldVcm = this.clampField(this.store.targetLysisField * NSEP_FIELD_FRACTION)
      this.store.setBroadcastFreqKHz(freqKhz)
      this.store.setFieldIntensity(fieldVcm)
      this.store.setWaveform(WAVEFORM.PULSED)
      this.store.setDutyCycle(NSEP_DC)
      this.store.setPulseWidthNs(NSEP_PW_NS)
      broadcastStateSync()
    },

    applyThermal() {
      const freqKhz = this.clampFreq(this.store.optimalFreqResult.khz)
      const fieldVcm = this.clampField(this.store.targetLysisField * THERMAL_FIELD_FRACTION)
      this.store.setBroadcastFreqKHz(freqKhz)
      this.store.setFieldIntensity(fieldVcm)
      this.store.setWaveform(WAVEFORM.CW)
      broadcastStateSync()
    },
  },
})
</script>

<style lang="scss" scoped>


.snap-bar {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;

  &__label {
    @include mono-upper();
    color: var(--color-text-muted);
    opacity: 0.65; // intentional between-tier value
    white-space: nowrap;
    flex-shrink: 0;
  }

  &__pills {
    display: flex;
    gap: 0.3rem;
    flex-wrap: wrap;
  }

  &__pill {
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    font-weight: 600;
    letter-spacing: 0.06em;
    padding: 0.2rem 0.55rem;
    border-radius: 4px;
    border: 1px solid transparent;
    cursor: pointer;
    white-space: nowrap;
    transition: background var(--tr-fast), border-color var(--tr-fast), color var(--tr-fast), box-shadow var(--tr-fast);

    &--dc {
      color: var(--color-primary);
      background: color-mix(in srgb, var(--color-primary) 7%, transparent);
      border-color: color-mix(in srgb, var(--color-primary) 22%, transparent);
      &:hover {
        background: color-mix(in srgb, var(--color-primary) 15%, transparent);
        border-color: color-mix(in srgb, var(--color-primary) 50%, transparent);
        box-shadow: 0 0 6px color-mix(in srgb, var(--color-primary) 20%, transparent);
      }
    }

    &--selective {
      color: var(--color-lime);
      background: color-mix(in srgb, var(--color-lime) 6%, transparent);
      border-color: color-mix(in srgb, var(--color-lime) 22%, transparent);
      &:hover {
        background: color-mix(in srgb, var(--color-lime) 13%, transparent);
        border-color: color-mix(in srgb, var(--color-lime) 50%, transparent);
        box-shadow: 0 0 6px color-mix(in srgb, var(--color-lime) 18%, transparent);
      }
    }

    &--nsep {
      color: var(--color-orange);
      background: color-mix(in srgb, var(--color-orange) 7%, transparent);
      border-color: color-mix(in srgb, var(--color-orange) 22%, transparent);
      &:hover {
        background: color-mix(in srgb, var(--color-orange) 15%, transparent);
        border-color: color-mix(in srgb, var(--color-orange) 50%, transparent);
        box-shadow: 0 0 6px color-mix(in srgb, var(--color-orange) 20%, transparent);
      }
    }

    &--thermal {
      color: var(--color-amber);
      background: color-mix(in srgb, var(--color-amber) 7%, transparent);
      border-color: color-mix(in srgb, var(--color-amber) 22%, transparent);
      &:hover {
        background: color-mix(in srgb, var(--color-amber) 15%, transparent);
        border-color: color-mix(in srgb, var(--color-amber) 50%, transparent);
        box-shadow: 0 0 6px color-mix(in srgb, var(--color-amber) 18%, transparent);
      }
    }
  }
}
</style>
