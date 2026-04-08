<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="lysis-overlay">
    <span class="lysis-overlay__text">{{ thermalLysis ? $t('cells.states.thermalLysis') : $t('cells.states.membraneLysed') }}</span>
    <span v-if="thermalLysis" class="lysis-overlay__sub">{{ $t('cells.states.vaporized') }}</span>
    <div class="lysis-overlay__reset-row">
      <button
        class="lysis-overlay__btn"
        v-tip="$t('cells.states.tipResetCell')"
        @click.stop="$emit('stableReset')"
      >{{ $t('cells.states.resetCell') }}</button>
      <button
        class="lysis-overlay__btn lysis-overlay__btn--full"
        v-tip="$t('cells.states.tipResetCellFull')"
        @click.stop="$emit('fullReset')"
      >{{ $t('cells.states.resetCellFull') }}</button>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  emits: ['stableReset', 'fullReset'],

  props: {
    thermalLysis: { type: Boolean, required: true },
  },
})
</script>

<style lang="scss" scoped>
.lysis-overlay {
  position: absolute;
  inset: 0;
  z-index: 2;
  @include flex-col(0.75rem);
  align-items: center;
  justify-content: center;
  background-color: color-mix(in srgb, black 90%, transparent);
  backdrop-filter: blur(3px);
  animation: lysis-overlay-appear 0.35s ease forwards;

  @keyframes lysis-overlay-appear {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  &__text {
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
    color: var(--color-danger);
    letter-spacing: 0.15em;
    text-transform: uppercase;
    animation: flicker 1.5s ease-in-out infinite;

    @keyframes flicker {
      0%, 100% { opacity: 1; }
      45%  { opacity: 0.6; }
      50%  { opacity: 0.2; }
      55%  { opacity: 0.8; }
    }
  }

  &__sub {
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    color: var(--color-vibrating);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    opacity: var(--op-partial);
  }

  &__reset-row {
    @include flex-row(0.5rem);
    justify-content: center;
    flex-wrap: wrap;
  }

  &__btn {
    background: transparent;
    border: 1px solid var(--color-danger);
    color: var(--color-danger);
    padding: 0.35rem 1rem;
    border-radius: var(--radius);
    font-size: var(--fs-sm);
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    cursor: pointer;
    transition: all var(--tr-fast);

    &:hover:not(:disabled) { background-color: color-mix(in srgb, var(--color-danger) 12%, transparent); }
    &:disabled { opacity: var(--op-ghost); cursor: not-allowed; border-color: var(--color-muted-border); color: var(--color-text-muted); }

    &--full {
      border-color: var(--color-primary);
      color: var(--color-primary);
      &:hover:not(:disabled) { background-color: color-mix(in srgb, var(--color-primary) 12%, transparent); }
    }
  }
}
</style>
