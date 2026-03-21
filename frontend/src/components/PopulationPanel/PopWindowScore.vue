<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="pop-window-score" :class="scoreClass" v-tip="tipText">
    <span class="pop-window-score__label">{{ $t('population.windowScoreLabel') }}</span>
    <span class="pop-window-score__score">{{ score.toFixed(2) }}</span>
    <span class="pop-window-score__verdict">{{ verdict }}</span>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  props: {
    score:     { type: Number,  required: true },
    scoreClass:{ type: String,  required: true },
    verdict:   { type: String,  required: true },
    tipText:   { type: String,  required: true },
  },
})
</script>

<style lang="scss" scoped>
@use '../../styles/mixins' as *;

.pop-window-score {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.45rem 0.8rem;
  border-radius: var(--radius);
  border: 1px solid var(--color-border);
  cursor: help;

  &--good     { border-color: color-mix(in srgb, var(--color-ok) 35%, transparent);  background: color-mix(in srgb, var(--color-ok) 5%, transparent); }
  &--marginal { border-color: color-mix(in srgb, var(--color-amber) 35%, transparent); background: color-mix(in srgb, var(--color-amber) 5%, transparent); }
  &--poor     { border-color: color-mix(in srgb, var(--color-danger) 25%, transparent);  background: color-mix(in srgb, var(--color-danger) 4%, transparent); }

  &__label {
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.07em;
    white-space: nowrap;
  }

  &__score {
    font-size: 1.05rem;
    font-family: var(--font-mono);
    font-weight: 700;
    color: var(--color-text-heading);
    letter-spacing: 0.02em;
  }

  &__verdict {
    font-size: var(--fs-sm);
    font-family: var(--font-mono);
    font-weight: 600;

    .pop-window-score--good &     { color: rgb(34,197,94); }
    .pop-window-score--marginal & { color: var(--color-amber); }
    .pop-window-score--poor &     { color: var(--color-danger); }
  }
}
</style>
