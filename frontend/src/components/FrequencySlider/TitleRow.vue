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

import { tipScopeNote } from '@/tooltips/sliderTooltips'
export default defineComponent({
  computed: {
    tipScopeNote(): string { return tipScopeNote() },
  },
})
</script>

<style lang="scss" scoped>


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
    font-size: var(--fs-xxs);
    font-weight: 700;
    letter-spacing: 0.06em;
    padding: 0.08rem 0.32rem;
    border-radius: 2px;

    &--both {
      background: color-mix(in srgb, var(--color-primary) 10%, transparent);
      color: var(--color-accent);
      border: 1px solid color-mix(in srgb, var(--color-primary) 20%, transparent);
    }

    &--card {
      background: var(--color-purple-dim);
      color: var(--color-purple);
      border: 1px solid color-mix(in srgb, var(--color-purple) 20%, transparent);
    }
  }

  &__scope-sep {
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    color: var(--color-text-muted);
    opacity: 0.75;
    white-space: nowrap;
  }
}
</style>
