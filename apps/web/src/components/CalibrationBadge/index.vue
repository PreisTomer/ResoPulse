<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
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
      <span v-if="showInlineProgress" class="calib__progress">{{ inlineProgressText }}</span>
      <span class="calib__subtitle">{{ subtitleText }}</span>
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

type BadgeVariant = 'compact' | 'full' | 'inline'

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

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

    isFullVariant(): boolean   { return this.variant === 'full' },
    isInlineVariant(): boolean { return this.variant === 'inline' },

    summary() { return this.experimentStore.calibrationSummary },

    tier(): string { return this.summary.tier },

    worstPpDisplay(): string {
      const v = this.summary.worstResidualPct
      return v === null ? '—' : v.toFixed(1)
    },

    rmsePpDisplay(): string {
      const v = this.summary.rmseResidualPct
      return v === null ? '—' : v.toFixed(1)
    },

    /** Per-tier i18n keys: [titleKey, inlineSubtitleKey, fullSubtitleKey]. */
    tierTexts(): { title: string; inline: string; full: string } {
      const tier = this.summary.tier
      const Title = `ai.calib${capitalize(tier)}`
      return {
        title:  Title,
        inline: tier === 'none' ? 'ai.calibNoneShort' : `ai.calib${capitalize(tier)}Short`,
        full:   tier === 'none' ? 'ai.calibNoneBody'  : `ai.calib${capitalize(tier)}Body`,
      }
    },

    titleText(): string {
      return this.$t(this.tierTexts.title, { pp: this.worstPpDisplay }) as string
    },

    subtitleText(): string {
      const key  = this.isInlineVariant ? this.tierTexts.inline : this.tierTexts.full
      const args = this.summary.tier === 'none'
        ? { have: this.summary.sampleCount, need: THRESHOLDS.CALIB_MIN_SAMPLES }
        : { pp: this.worstPpDisplay, n: this.summary.sampleCount }
      return this.$t(key, args) as string
    },

    tipText(): string {
      if (this.tier === 'none') {
        return this.$t('ai.calibTipNone', {
          have: this.summary.sampleCount,
          need: THRESHOLDS.CALIB_MIN_SAMPLES,
        }) as string
      }
      const current = this.$t('ai.calibTipCurrent', {
        pp:   this.worstPpDisplay,
        rmse: this.rmsePpDisplay,
        n:    this.summary.sampleCount,
      }) as string
      return `${this.$t('ai.calibTip')}\n\n${current}`
    },

    showActionCue(): boolean { return this.clickable },

    showInlineProgress(): boolean {
      return this.isInlineVariant && this.tier === 'none'
    },

    inlineProgressText(): string {
      return this.$t('ai.calibProgressShort', {
        have: this.summary.sampleCount,
        need: THRESHOLDS.CALIB_MIN_SAMPLES,
      }) as string
    },
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
    padding: 0.25rem 0.55rem;
    gap: 0.4rem;

    .calib__body {
      @include flex-row(0.4rem);
      flex-direction: row;
      flex-wrap: nowrap;
      align-items: baseline;
    }

    .calib__subtitle {
      font-size: var(--fs-xxs);
      line-height: 1.3;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 260px;

      &::before {
        content: '·';
        margin-right: 0.4rem;
        opacity: var(--op-muted);
      }
    }
  }

  &--full {
    width: 100%;
  }

  &--inline {
    padding: 0.38rem 0.75rem;
    gap: 0.4rem;
    height: 100%;

    .calib__body {
      @include flex-row(0.4rem);
      flex-direction: row;
      flex-wrap: nowrap;
      align-items: center;
      white-space: nowrap;
    }

    .calib__title {
      font-size: var(--fs-xxs);
    }

    /* Inline variant hides the subtitle — detail moves to the tooltip */
    .calib__subtitle { display: none; }

    .calib__progress {
      font-family: var(--font-mono);
      font-size: var(--fs-xxs);
      font-variant-numeric: tabular-nums;
      letter-spacing: 0;
      color: var(--color-text);
      opacity: var(--op-partial);
      padding: 0.1rem 0.4rem;
      border-radius: 3px;
      background: color-mix(in srgb, currentColor 16%, transparent);
      white-space: nowrap;
    }

    .calib__cue { opacity: var(--op-dim); }
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
