<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <section class="media-feed">
    <header class="media-feed__header">
      <h2 class="media-feed__title">{{ $t('cloneUp.media.title') }}</h2>
      <p class="media-feed__subtitle">{{ $t('cloneUp.media.subtitle') }}</p>
    </header>

    <div class="media-feed__body">
      <div class="media-feed__results">
        <div class="media-feed__result media-feed__result--hero">
          <span class="media-feed__result-label">{{ $t('cloneUp.media.projectedTiter') }}</span>
          <span class="media-feed__result-value media-feed__result-value--titer">{{ prediction.projectedTiterGL }} <small>{{ $t('cloneUp.media.glucoseUnit') }}</small></span>
        </div>
        <div class="media-feed__result">
          <span class="media-feed__result-label">{{ $t('cloneUp.media.projectedPeakVcd') }}</span>
          <span class="media-feed__result-value media-feed__result-value--vcd">{{ prediction.projectedPeakVcdE6 }}</span>
        </div>
        <div class="media-feed__result">
          <span class="media-feed__result-label">{{ $t('cloneUp.media.integralVcd') }}</span>
          <span class="media-feed__result-value">{{ prediction.integralVcd }}</span>
        </div>
        <p class="media-feed__note">{{ $t('cloneUp.media.note') }}</p>
      </div>

      <div class="media-feed__params">
        <label class="media-feed__param">
          <span class="media-feed__param-label">{{ $t('cloneUp.media.basalRichness') }}<span class="media-feed__param-value">{{ params.basalRichness.toFixed(2) }}x</span></span>
          <input type="range" min="0.5" max="2.2" step="0.05" v-model.number="params.basalRichness" class="media-feed__slider" />
        </label>
        <label class="media-feed__param">
          <span class="media-feed__param-label">{{ $t('cloneUp.media.feedStartDay') }}<span class="media-feed__param-value">{{ params.feedStartDay }}</span></span>
          <input type="range" min="0" max="10" step="1" v-model.number="params.feedStartDay" class="media-feed__slider" />
        </label>
        <label class="media-feed__param">
          <span class="media-feed__param-label">{{ $t('cloneUp.media.feedRatePct') }}<span class="media-feed__param-value">{{ params.feedRatePct }} {{ $t('cloneUp.media.feedRateUnit') }}</span></span>
          <input type="range" min="0" max="25" step="1" v-model.number="params.feedRatePct" class="media-feed__slider" />
        </label>
        <label class="media-feed__param">
          <span class="media-feed__param-label">{{ $t('cloneUp.media.glucoseSetpoint') }}<span class="media-feed__param-value">{{ params.glucoseSetpoint.toFixed(1) }} {{ $t('cloneUp.media.glucoseUnit') }}</span></span>
          <input type="range" min="1" max="12" step="0.5" v-model.number="params.glucoseSetpoint" class="media-feed__slider" />
        </label>
      </div>
    </div>
  </section>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { predictMedia, type MediaInputs, type MediaPrediction } from '@/utils/media/mediaModel'

export default defineComponent({
  name: 'MediaFeedPanel',
  data() {
    return {
      params: {
        basalRichness:   1.0,
        feedStartDay:    3,
        feedRatePct:     10,
        glucoseSetpoint: 5,
        durationDays:    14,
        baseQpPgCellDay: 20,
      } as MediaInputs,
    }
  },
  computed: {
    prediction(): MediaPrediction {
      return predictMedia(this.params)
    },
  },
})
</script>

<style lang="scss" scoped>
.media-feed {
  @include flex-col(1.5rem);

  &__header { @include flex-col(0.3rem); }
  &__title { margin: 0; font-size: 1.25rem; font-weight: 600; color: var(--color-text-heading); }
  &__subtitle { margin: 0; font-size: var(--fs-md); opacity: var(--op-partial); line-height: 1.5; max-width: 44rem; }

  &__body { display: grid; grid-template-columns: 1fr 1fr; gap: 1.25rem; align-items: start; @media (max-width: 800px) { grid-template-columns: 1fr; } }

  &__results {
    @include flex-col(1rem); padding: 1.25rem;
    background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg);
  }
  &__result { @include flex-col(0.2rem); &--hero .media-feed__result-value { font-size: 2rem; } }
  &__result-label { @include mono-upper(var(--fs-xxs)); opacity: var(--op-muted); }
  &__result-value {
    font-family: var(--font-mono); font-size: 1.1rem; font-weight: 700; color: var(--color-text);
    small { font-size: 0.5em; opacity: var(--op-muted); }
    &--titer { color: var(--color-ok); }
    &--vcd { color: var(--color-primary); }
  }
  &__note { margin: 0.25rem 0 0; font-size: var(--fs-sm); opacity: var(--op-partial); line-height: 1.5; }

  &__params {
    @include flex-col(1rem); padding: 1.25rem;
    background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg);
  }
  &__param { @include flex-col(0.4rem); }
  &__param-label { @include flex-between(0.5rem); align-items: baseline; font-size: var(--fs-sm); color: var(--color-text); }
  &__param-value { font-family: var(--font-mono); font-size: var(--fs-xs); font-weight: 600; color: var(--color-primary); }
  &__slider { width: 100%; accent-color: var(--color-primary); }
}
</style>
