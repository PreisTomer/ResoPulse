<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="field-panel__title-row">
    <span class="field-panel__title">{{ $t('slider.title') }}</span>
    <div class="field-panel__safe-toggle">
      <label
        class="field-panel__pill field-panel__pill--sm"
        :class="{ 'field-panel__pill--active field-panel__pill--expert': !isSafeMode }"
        v-tip="tipExpertMode"
      >
        <input type="radio" name="safemode" :checked="!isSafeMode" @change="onSafeModeChange(false)" />
        {{ $t('slider.expert') }}
      </label>
      <label
        class="field-panel__pill field-panel__pill--sm"
        :class="{ 'field-panel__pill--active field-panel__pill--safe': isSafeMode }"
        v-tip="tipSafeMode"
      >
        <input type="radio" name="safemode" :checked="isSafeMode" @change="onSafeModeChange(true)" />
        {{ $t('slider.safe') }}
      </label>
    </div>
    <div class="field-panel__scope-note" v-tip="tipScopeNote">
      <span class="field-panel__scope-chip field-panel__scope-chip--both">{{ $t('labels.scopeBoth') }}</span>
      <span class="field-panel__scope-sep">·</span>
      <span class="field-panel__scope-chip field-panel__scope-chip--card">{{ $t('slider.cardParams') }}</span>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useCellStore } from '@/stores/cellStore'
import { broadcastStateSync } from '@/services/socket'
import { tipExpertMode, tipSafeMode, tipScopeNote } from '@/tooltips/sliderTooltips'

export default defineComponent({
  setup() {
    return { store: useCellStore() }
  },

  computed: {
    isSafeMode(): boolean       { return this.store.safeMode },
    tipExpertMode(): string     { return tipExpertMode() },
    tipSafeMode(): string       { return tipSafeMode() },
    tipScopeNote(): string      { return tipScopeNote() },
  },

  methods: {
    onSafeModeChange(on: boolean) {
      this.store.setSafeMode(on)
      broadcastStateSync()
    },
  },
})
</script>

<style lang="scss" scoped>
@use '../../styles/mixins' as *;

.field-panel {
  &__title-row {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    align-items: start;
    gap: 0.25rem 0.5rem;
    margin-bottom: 0.1rem;
  }

  &__title {
    @include mono-upper(0.62rem, 0.12em);
    color: var(--color-text);
  }

  &__scope-note {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    grid-column: 1;
    grid-row: 2;
    cursor: help;
  }

  &__scope-chip {
    font-family: var(--font-mono);
    font-size: 0.6rem;
    font-weight: 700;
    letter-spacing: 0.06em;
    padding: 0.08rem 0.32rem;
    border-radius: 2px;

    &--both {
      background: rgba(0, 212, 255, 0.10);
      color: var(--color-accent);
      border: 1px solid rgba(0, 212, 255, 0.20);
    }

    &--card {
      background: rgba(167, 139, 250, 0.10);
      color: #a78bfa;
      border: 1px solid rgba(167, 139, 250, 0.20);
    }
  }

  &__scope-sep {
    font-family: var(--font-mono);
    font-size: 0.6rem;
    color: var(--color-text-muted);
    opacity: 0.75;
    white-space: nowrap;
  }

  &__safe-toggle {
    display: flex;
    gap: 0.3rem;
    grid-column: 2;
    grid-row: 1 / 3;
    align-self: center;
  }

  &__pill {
    @include mono-upper(0.62rem, 0);
    text-transform: capitalize;
    padding: 0.18rem 0.55rem;
    border: 1px solid var(--color-border);
    border-radius: 12px;
    cursor: pointer;
    color: var(--color-text-muted);
    transition: border-color 0.15s, color 0.15s, background-color 0.15s;
    user-select: none;
    white-space: nowrap;

    input { display: none; }

    &--active { border-color: var(--color-primary); color: var(--color-primary); background-color: var(--color-primary-dim); }
    &--sm     { font-size: 0.58rem; padding: 0.14rem 0.45rem; }
    &--safe   { border-color: var(--color-lime)  !important; color: var(--color-lime)  !important; background-color: rgba(57, 255, 20, 0.08)   !important; }
    &--expert { border-color: var(--color-amber) !important; color: var(--color-amber) !important; background-color: rgba(251, 191, 36, 0.08) !important; }
  }
}
</style>
