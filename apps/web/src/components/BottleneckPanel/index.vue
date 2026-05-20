<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="bottleneck-overlay" @click.self="$emit('close')">
    <div class="bottleneck" role="dialog" aria-labelledby="bottleneck-title">
      <header class="bottleneck__header">
        <h3 id="bottleneck-title" class="bottleneck__title">{{ ICON.WARNING }} {{ $t('downstream.bottleneck.title') }}</h3>
        <button class="bottleneck__close" :aria-label="$t('downstream.bottleneck.close')" @click="$emit('close')">{{ ICON.CLOSE }}</button>
      </header>

      <div class="bottleneck__body">
        <template v-if="analysis">
          <div class="bottleneck__limiting">
            <span class="bottleneck__limiting-label">{{ $t('downstream.bottleneck.limitingStep') }}</span>
            <span class="bottleneck__limiting-name">{{ analysis.stepName }}</span>
            <span class="bottleneck__limiting-yield">{{ analysis.currentYieldPct.toFixed(1) }}%</span>
          </div>

          <section class="bottleneck__section">
            <h4 class="bottleneck__section-title">{{ $t('downstream.bottleneck.whyTitle') }}</h4>
            <p class="bottleneck__why">{{ analysis.stepDescription }}</p>
          </section>

          <section v-if="analysis.suggestions.length" class="bottleneck__section">
            <h4 class="bottleneck__section-title">{{ $t('downstream.bottleneck.suggestionsTitle') }}</h4>
            <ul class="bottleneck__suggestions">
              <li v-for="(s, i) in analysis.suggestions" :key="i" class="bottleneck__suggestion">
                <div class="bottleneck__suggestion-main">
                  <span class="bottleneck__suggestion-param">{{ s.paramLabel }}</span>
                  <span class="bottleneck__suggestion-change">{{ s.currentValue }} {{ s.unit }} → {{ s.suggestedValue }} {{ s.unit }}</span>
                </div>
                <span class="bottleneck__suggestion-gain">+{{ s.predictedGainPct.toFixed(1) }}%</span>
              </li>
            </ul>
          </section>
        </template>

        <p v-else class="bottleneck__none">{{ $t('downstream.bottleneck.noBottleneck') }}</p>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'

import { ICON } from '@/constants/icons'

import { analyzeBottleneck, type BottleneckAnalysis } from '@/utils/downstream/bottleneck'

export default defineComponent({
  name: 'BottleneckPanel',
  props: {
    stepType:    { type: String as PropType<string | null>, default: null },
    paramValues: { type: Object as PropType<Record<string, number>>, default: () => ({}) },
  },
  emits: ['close'],
  computed: {
    ICON() { return ICON },
    analysis(): BottleneckAnalysis | null {
      return this.stepType ? analyzeBottleneck(this.stepType, this.paramValues) : null
    },
  },
})
</script>

<style lang="scss" scoped>
.bottleneck-overlay {
  position: fixed;
  inset: 0;
  background: color-mix(in srgb, black 60%, transparent);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
  padding: 1.5rem;
}

.bottleneck {
  width: 100%;
  max-width: 520px;
  background: var(--color-surface);
  border: 1px solid color-mix(in srgb, var(--color-amber) 35%, var(--color-border));
  border-radius: var(--radius-lg);
  box-shadow: 0 24px 64px color-mix(in srgb, black 50%, transparent);

  &__header {
    @include flex-between();
    padding: 1.25rem 1.5rem;
    border-bottom: 1px solid var(--color-border);
  }

  &__title {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
    color: var(--color-amber);
  }

  &__close {
    background: transparent;
    border: none;
    color: var(--color-text-muted);
    font-size: 1.2rem;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius);

    &:hover { background: color-mix(in srgb, var(--color-text) 6%, transparent); color: var(--color-text); }
  }

  &__body {
    padding: 1.5rem;
    @include flex-col(1.25rem);
  }

  &__limiting {
    @include flex-row(0.75rem);
    align-items: center;
    padding: 0.9rem 1.1rem;
    background: color-mix(in srgb, var(--color-amber) 8%, transparent);
    border-radius: var(--radius);
  }

  &__limiting-label {
    @include mono-upper(var(--fs-xxs));
    opacity: var(--op-muted);
  }

  &__limiting-name {
    font-weight: 600;
    color: var(--color-text-heading);
    flex: 1;
  }

  &__limiting-yield {
    font-family: var(--font-mono);
    font-weight: 700;
    color: var(--color-amber);
  }

  &__section-title {
    margin: 0 0 0.5rem;
    @include mono-upper(var(--fs-xs));
    opacity: var(--op-partial);
  }

  &__why {
    margin: 0;
    font-size: var(--fs-sm);
    opacity: var(--op-partial);
    line-height: 1.55;
  }

  &__suggestions {
    list-style: none;
    margin: 0;
    padding: 0;
    @include flex-col(0.5rem);
  }

  &__suggestion {
    @include flex-between(0.75rem);
    align-items: center;
    padding: 0.7rem 0.9rem;
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
  }

  &__suggestion-main {
    @include flex-col(0.2rem);
  }

  &__suggestion-param {
    font-size: var(--fs-sm);
    font-weight: 600;
    color: var(--color-text);
  }

  &__suggestion-change {
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    opacity: var(--op-partial);
  }

  &__suggestion-gain {
    font-family: var(--font-mono);
    font-weight: 700;
    color: var(--color-ok);
  }

  &__none {
    margin: 0;
    text-align: center;
    opacity: var(--op-partial);
    line-height: 1.5;
  }
}
</style>
