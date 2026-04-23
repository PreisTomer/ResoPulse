<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <component
    :is="rootTag"
    class="calib"
    :class="[`calib--${variant}`, `calib--${tier}`]"
    v-tip="tipText"
    @click="onClick"
  >
    <span class="calib__dot" aria-hidden="true"></span>

    <span class="calib__body">
      <span class="calib__title">{{ titleText }}</span>
      <span v-if="isFullVariant" class="calib__subtitle">{{ subtitleText }}</span>
    </span>

    <span v-if="showActionCue" class="calib__cue" aria-hidden="true">›</span>
  </component>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import type { PropType } from 'vue'
import { mapStores } from 'pinia'

import { useExperimentStore } from '@/stores/experimentStore'

import { THRESHOLDS } from '@/constants/physics'

type BadgeVariant = 'compact' | 'full'

export default defineComponent({
  name: 'CalibrationBadge',

  props: {
    variant:    { type: String as PropType<BadgeVariant>, default: 'full' },
    clickable:  { type: Boolean, default: true },
  },

  emits: ['click-log', 'click-details'],

  computed: {
    ...mapStores(useExperimentStore),

    rootTag(): string { return this.clickable ? 'button' : 'div' },

    isFullVariant(): boolean { return this.variant === 'full' },

    summary() { return this.experimentStore.calibrationSummary },

    tier(): string { return this.summary.tier },

    worstPpDisplay(): string {
      const v = this.summary.worstResidualPct
      return v === null ? '—' : v.toFixed(1)
    },

    titleText(): string {
      const s = this.summary
      const pp = this.worstPpDisplay
      switch (s.tier) {
        case 'none':     return this.$t('ai.calibNone')
        case 'drift':    return this.$t('ai.calibDrift')
        case 'moderate': return this.$t('ai.calibModerate', { pp })
        case 'strong':   return this.$t('ai.calibStrong',   { pp })
      }
      return ''
    },

    subtitleText(): string {
      const s  = this.summary
      const pp = this.worstPpDisplay
      const n  = s.sampleCount
      switch (s.tier) {
        case 'none':     return this.$t('ai.calibNoneBody',     { have: n, need: THRESHOLDS.CALIB_MIN_SAMPLES })
        case 'drift':    return this.$t('ai.calibDriftBody',    { pp, n })
        case 'moderate': return this.$t('ai.calibModerateBody', { pp, n })
        case 'strong':   return this.$t('ai.calibStrongBody',   { pp, n })
      }
      return ''
    },

    tipText(): string {
      if (this.tier === 'none') {
        return this.$t('ai.calibTipNone', {
          have: this.summary.sampleCount,
          need: THRESHOLDS.CALIB_MIN_SAMPLES,
        }) as string
      }
      return this.$t('ai.calibTip') as string
    },

    showActionCue(): boolean { return this.clickable },
  },

  methods: {
    onClick() {
      if (!this.clickable) return
      if (this.tier === 'none') this.$emit('click-log')
      else                       this.$emit('click-details')
    },
  },
})
</script>

<style lang="scss" scoped>
.calib {
  @include flex-row(0.5rem);
  align-items: center;
  padding: 0.35rem 0.6rem;
  border-radius: var(--radius);
  border: 1px solid;
  background: transparent;
  font-family: var(--font-mono);
  cursor: pointer;
  transition: border-color var(--tr-fast), background var(--tr-fast);

  &__dot {
    width:  6px;
    height: 6px;
    border-radius: 50%;
    background: currentColor;
    flex-shrink: 0;
  }

  &__body {
    @include flex-col(0.1rem);
    min-width: 0;
    text-align: left;
  }

  &__title {
    @include mono-upper(var(--fs-xxs), 0.06em);
    color: currentColor;
  }

  &__subtitle {
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
    opacity: var(--op-dim);
    line-height: 1.3;
  }

  &__cue {
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
    color: currentColor;
    opacity: var(--op-muted);
    flex-shrink: 0;
  }

  // ── Variants ─────────────────────────────────────────────────────────────
  &--compact {
    padding: 0.2rem 0.5rem;
    gap: 0.35rem;
  }

  &--full {
    width: 100%;
  }

  &:hover {
    background: color-mix(in srgb, currentColor 8%, transparent);
  }

  // ── Tier colour states ───────────────────────────────────────────────────
  &--none     { @include tinted-surface(amber,  25%, 4%); color: var(--color-text-muted); }
  &--drift    { @include color-variant(amber); }
  &--moderate { color: var(--color-text); border-color: var(--color-border); }
  &--strong   { @include color-variant(lime); }
}
</style>
