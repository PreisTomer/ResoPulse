<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="field-panel__title-row">
    <span class="field-panel__title">{{ $t('slider.title') }}</span>
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
import { tipScopeNote } from '@/tooltips/sliderTooltips'

export default defineComponent({
  setup() {
    return { store: useCellStore() }
  },

  computed: {
    tipScopeNote(): string { return tipScopeNote() },
  },
})
</script>

<style lang="scss" scoped>
@use '../../styles/mixins' as *;

.field-panel {
  &__title-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
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
}
</style>
