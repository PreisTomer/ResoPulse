<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div v-if="hasCollateralDamage" class="pop-note">
    <span class="pop-note__warn">{{ $t('population.warnIcon') }}</span>
    {{ $t('population.warnCollateral', { pct: healthyPctLysed }) }}
  </div>
  <div v-else-if="hasSuccessWindow" class="pop-note pop-note--ok">
    <span class="pop-note__ok">{{ $t('population.okIcon') }}</span>
    {{ $t('population.okWindow', { pct: targetPctLysed }) }}
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

const GOOD_TARGET_LYSIS_THRESHOLD = 50

export default defineComponent({
  props: {
    healthyPctLysed: { type: Number, required: true },
    targetPctLysed:  { type: Number, required: true },
  },

  computed: {
    hasCollateralDamage(): boolean {
      return this.healthyPctLysed > 0
    },

    hasSuccessWindow(): boolean {
      return this.targetPctLysed > GOOD_TARGET_LYSIS_THRESHOLD
    },
  },
})
</script>

<style lang="scss" scoped>


.pop-note {
  @include flex-row(0.5rem);
  align-items: flex-start;
  padding: 0.55rem 0.75rem;
  border-radius: var(--radius);
  font-size: var(--fs-md);
  color: var(--color-text-muted);
  border: 1px solid color-mix(in srgb, var(--color-amber) 30%, transparent);
  background: color-mix(in srgb, var(--color-amber) 5%, transparent);

  &--ok {
    border-color: color-mix(in srgb, var(--color-ok) 30%, transparent);
    background: color-mix(in srgb, var(--color-ok) 5%, transparent);
  }

  &__warn { color: var(--color-amber); flex-shrink: 0; }
  &__ok   { color: var(--color-ok); flex-shrink: 0; }
}
</style>
