<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="summary-bar">
    <div class="summary-bar__inputs">
      <label class="summary-bar__input">
        <span class="summary-bar__input-label">{{ $t('downstream.summary.startingTiter') }}</span>
        <span class="summary-bar__input-field">
          <input type="number" min="0" step="0.5" :value="startingTiterGL" class="summary-bar__number" @input="onTiter" />
          <span class="summary-bar__unit">{{ $t('downstream.summary.titerUnit') }}</span>
        </span>
      </label>
      <label class="summary-bar__input">
        <span class="summary-bar__input-label">{{ $t('downstream.summary.volume') }}</span>
        <span class="summary-bar__input-field">
          <input type="number" min="0" step="1" :value="volumeL" class="summary-bar__number" @input="onVolume" />
          <span class="summary-bar__unit">{{ $t('downstream.summary.volumeUnit') }}</span>
        </span>
      </label>
    </div>

    <div class="summary-bar__metrics">
      <div class="summary-bar__metric">
        <span class="summary-bar__metric-label">{{ $t('downstream.summary.startingMass') }}</span>
        <span class="summary-bar__metric-value">{{ startingMassG.toFixed(0) }} {{ $t('downstream.summary.massUnit') }}</span>
      </div>
      <div class="summary-bar__metric summary-bar__metric--hero">
        <span class="summary-bar__metric-label">{{ $t('downstream.summary.overallYield') }}</span>
        <span class="summary-bar__metric-value" :data-tier="yieldTier">{{ overallYieldPct.toFixed(1) }}%</span>
      </div>
      <div class="summary-bar__metric summary-bar__metric--hero">
        <span class="summary-bar__metric-label">{{ $t('downstream.summary.finalProduct') }}</span>
        <span class="summary-bar__metric-value summary-bar__metric-value--product">{{ finalMassG.toFixed(2) }} {{ $t('downstream.summary.massUnit') }}</span>
      </div>
      <div class="summary-bar__metric">
        <span class="summary-bar__metric-label">{{ $t('downstream.summary.totalHcp') }}</span>
        <span class="summary-bar__metric-value">{{ totalHcp.toFixed(1) }} log</span>
      </div>
    </div>

    <button v-if="hasBottleneck" class="summary-bar__bottleneck" @click="$emit('openBottleneck')">
      {{ ICON.WARNING }} {{ $t('downstream.summary.bottleneckAlert') }}
    </button>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { ICON } from '@/constants/icons'

export default defineComponent({
  name: 'DownstreamSummaryBar',
  props: {
    startingTiterGL: { type: Number, required: true },
    volumeL:         { type: Number, required: true },
    startingMassG:   { type: Number, required: true },
    finalMassG:      { type: Number, required: true },
    overallYieldPct: { type: Number, required: true },
    totalHcp:        { type: Number, required: true },
    hasBottleneck:   { type: Boolean, default: false },
  },
  emits: ['setTiter', 'setVolume', 'openBottleneck'],
  computed: {
    ICON() { return ICON },
    yieldTier(): string {
      if (this.overallYieldPct >= 50) return 'high'
      if (this.overallYieldPct >= 30) return 'mid'
      return 'low'
    },
  },
  methods: {
    onTiter(e: Event) {
      this.$emit('setTiter', parseFloat((e.target as HTMLInputElement).value) || 0)
    },
    onVolume(e: Event) {
      this.$emit('setVolume', parseFloat((e.target as HTMLInputElement).value) || 0)
    },
  },
})
</script>

<style lang="scss" scoped>
.summary-bar {
  @include flex-row(1.5rem);
  flex-wrap: wrap;
  align-items: center;
  padding: 1rem 1.25rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);

  &__inputs {
    @include flex-row(1rem);
  }

  &__input {
    @include flex-col(0.3rem);
  }

  &__input-label {
    @include mono-upper(var(--fs-xxs));
    opacity: var(--op-muted);
  }

  &__input-field {
    @include flex-row(0.3rem);
    align-items: baseline;
  }

  &__number {
    width: 4.5rem;
    padding: 0.4rem 0.5rem;
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    color: var(--color-text);
    font-family: var(--font-mono);
    font-size: var(--fs-md);

    &:focus { outline: none; border-color: var(--color-primary); }
  }

  &__unit {
    @include mono-upper(var(--fs-xxs));
    opacity: var(--op-muted);
  }

  &__metrics {
    @include flex-row(1.5rem);
    flex-wrap: wrap;
    flex: 1;
  }

  &__metric {
    @include flex-col(0.2rem);

    &--hero .summary-bar__metric-value { font-size: 1.4rem; }
  }

  &__metric-label {
    @include mono-upper(var(--fs-xxs));
    opacity: var(--op-muted);
  }

  &__metric-value {
    font-family: var(--font-mono);
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--color-text);

    &--product { color: var(--color-ok); }

    &[data-tier="high"] { color: var(--color-ok); }
    &[data-tier="mid"]  { color: var(--color-primary); }
    &[data-tier="low"]  { color: var(--color-amber); }
  }

  &__bottleneck {
    @include mono-upper(var(--fs-xs));
    background: color-mix(in srgb, var(--color-amber) 14%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-amber) 40%, transparent);
    color: var(--color-amber);
    padding: 0.5rem 0.9rem;
    border-radius: var(--radius);
    cursor: pointer;
    transition: background var(--tr-fast);
    animation: bottleneckPulse 2.5s ease-in-out infinite;

    &:hover { background: color-mix(in srgb, var(--color-amber) 22%, transparent); }
  }
}

@keyframes bottleneckPulse {
  0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--color-amber) 30%, transparent); }
  50%      { box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-amber) 0%, transparent); }
}
</style>
