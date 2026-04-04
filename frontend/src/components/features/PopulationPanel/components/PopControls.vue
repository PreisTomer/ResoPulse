<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="pop-controls">
    <div class="pop-controls__ctrl-group">
      <span class="pop-controls__ctrl-label" v-tip="$t('population.tipPopSize')">{{ $t('population.ctrlSizeLabel') }}</span>
      <div class="pop-controls__pills">
        <button
          v-for="n in N_PILL_OPTIONS"
          :key="n"
          class="pop-controls__pill"
          :class="{ 'pop-controls__pill--active': nCells === n }"
          v-tip="tipNPill(n)"
          @click="$emit(EMIT.UPDATE_N_CELLS, n); $emit(EMIT.RESAMPLE)"
        >N={{ n }}</button>
      </div>
    </div>

    <div class="pop-controls__ctrl-group">
      <span class="pop-controls__ctrl-label" v-tip="$t('population.tipRVariance')">{{ $t('population.ctrlVarianceLabel') }}</span>
      <input
        class="pop-controls__input"
        type="number"
        :value="rVariancePct"
        min="1" max="30" step="1"
        v-tip="$t('population.tipRVariance')"
        @input="$emit(EMIT.UPDATE_R_VARIANCE_PCT, +($event.target as HTMLInputElement).value)"
      />
      <span class="pop-controls__ctrl-unit">{{ $t('population.varianceUnit') }}</span>
    </div>

    <div class="pop-controls__ctrl-group">
      <span class="pop-controls__ctrl-label" v-tip="$t('population.tipVThVariance')">{{ $t('population.ctrlVThVarianceLabel') }}</span>
      <input
        class="pop-controls__input"
        type="number"
        :value="vThVariancePct"
        min="0" max="35" step="1"
        v-tip="$t('population.tipVThVariance')"
        @input="$emit(EMIT.UPDATE_VTH_VARIANCE_PCT, +($event.target as HTMLInputElement).value)"
      />
      <span class="pop-controls__ctrl-unit">{{ $t('population.varianceUnit') }}</span>
    </div>

    <button
      class="pop-controls__resample-btn"
      v-tip="$t('population.tipResample')"
      @click="$emit(EMIT.RESAMPLE)"
    >{{ $t('population.resampleBtn') }}</button>

    <!-- Histogram Y-axis mode toggle -->
    <div class="pop-controls__norm-toggle" v-tip="$t('population.tipNormalize')">
      <button
        class="pop-controls__norm-btn"
        :class="{ 'pop-controls__norm-btn--active': !normalizeChart }"
        @click="$emit(EMIT.UPDATE_NORMALIZE_CHART, false); $emit(EMIT.REDRAW)"
      >{{ $t('population.normCount') }}</button>
      <button
        class="pop-controls__norm-btn"
        :class="{ 'pop-controls__norm-btn--active': normalizeChart }"
        @click="$emit(EMIT.UPDATE_NORMALIZE_CHART, true); $emit(EMIT.REDRAW)"
      >{{ $t('population.normFraction') }}</button>
    </div>

    <button
      class="pop-controls__export-btn"
      v-tip="$t('population.tipExport')"
      @click="$emit(EMIT.EXPORT_CSV)"
    >{{ $t('population.exportBtn') }}</button>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { EMIT } from '@/constants/emitEvents'
import { buildPopulationSizeTooltip } from '../lib'
const N_PILL_OPTIONS = [100, 300, 1000] as const

export default defineComponent({
  props: {
    nCells:         { type: Number, required: true },
    rVariancePct:   { type: Number, required: true },
    vThVariancePct: { type: Number, required: true },
    normalizeChart: { type: Boolean, required: true },
  },

  emits: [
    EMIT.UPDATE_N_CELLS,
    EMIT.UPDATE_R_VARIANCE_PCT,
    EMIT.UPDATE_VTH_VARIANCE_PCT,
    EMIT.UPDATE_NORMALIZE_CHART,
    EMIT.RESAMPLE,
    EMIT.EXPORT_CSV,
    EMIT.REDRAW,
  ],

  computed: {
    N_PILL_OPTIONS() { return N_PILL_OPTIONS },
    EMIT() { return EMIT },
  },

  methods: {
    tipNPill(n: number): string {
      return buildPopulationSizeTooltip(this.$t.bind(this), n)
    },
  },
})
</script>

<style lang="scss" scoped>


.pop-controls {
  @include flex-row(0.7rem);
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem 0.9rem;

  &__ctrl-group {
    @include flex-row(0.45rem);
    align-items: center;
  }

  &__ctrl-label {
    font-size: var(--fs-sm);
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    white-space: nowrap;
    cursor: help;
  }

  &__ctrl-unit {
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
    font-family: var(--font-mono);
  }

  &__pills { @include flex-row(0.3rem); }

  &__pill {
    font-size: var(--fs-sm);
    font-family: var(--font-mono);
    padding: 0.22rem 0.55rem;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: all 0.15s;

    &--active { border-color: var(--color-primary); color: var(--color-primary); background: var(--color-primary-dim); }
    &:hover:not(&--active) { border-color: color-mix(in srgb, white 20%, transparent); }
  }

  &__input {
    width: 52px;
    padding: 0.22rem 0.4rem;
    font-size: var(--fs-sm);
    font-family: var(--font-mono);
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    color: var(--color-text);
    text-align: right;
    outline: none;

    &:focus { border-color: var(--color-primary); }
  }

  &__resample-btn,
  &__export-btn {
    font-size: var(--fs-sm);
    font-family: var(--font-mono);
    padding: 0.28rem 0.65rem;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: all 0.15s;

    &:hover { border-color: var(--color-primary); color: var(--color-primary); }
  }

  &__export-btn { margin-left: auto; }

  &__norm-toggle {
    @include flex-row(0);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    overflow: hidden;
    cursor: help;
  }

  &__norm-btn {
    font-size: var(--fs-xs);
    font-family: var(--font-mono);
    padding: 0.22rem 0.5rem;
    border: none;
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: all 0.15s;

    &--active {
      background: var(--color-primary-dim);
      color: var(--color-primary);
    }

    &:hover:not(&--active) { background: color-mix(in srgb, white 4%, transparent); }
  }
}
</style>
