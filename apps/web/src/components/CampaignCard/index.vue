<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <article class="campaign-card" :class="{ 'campaign-card--active': active }" @click="$emit('open')">
    <header class="campaign-card__header">
      <span class="campaign-card__molecule" :data-category="moleculeCategory">{{ moleculeShortLabel }}</span>
      <span class="campaign-card__status" :data-status="campaign.status">{{ statusLabel }}</span>
    </header>

    <h3 class="campaign-card__name">{{ campaign.name }}</h3>

    <div class="campaign-card__progress">
      <span class="campaign-card__progress-label">{{ $t('campaign.card.moduleProgress') }}</span>
      <div class="campaign-card__progress-dots">
        <span
          v-for="step in moduleProgress"
          :key="step.module"
          class="campaign-card__dot"
          :class="{
            'campaign-card__dot--done': step.done,
            'campaign-card__dot--current': step.current,
          }"
          :title="`Module ${step.module}`"
        >{{ step.module }}</span>
      </div>
    </div>

    <div v-if="predictedYieldPct !== null" class="campaign-card__yield">
      <span class="campaign-card__yield-label">{{ $t('campaign.card.predictedYield') }}</span>
      <span class="campaign-card__yield-value">{{ predictedYieldPct }}%</span>
    </div>

    <footer class="campaign-card__footer">
      <span class="campaign-card__date">{{ $t('campaign.card.lastModified') }}: {{ lastModifiedDisplay }}</span>
      <button class="campaign-card__continue" @click.stop="$emit('open')">
        {{ $t('campaign.card.continue') }} {{ ICON.ARROW_SHORT }}
      </button>
    </footer>
  </article>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'

import { ICON } from '@/constants/icons'
import { MOLECULE_TYPE_META } from '@/constants/moleculeTypes'

import { MODULE_ID, MODULE_STATUS, type Campaign, type CampaignProgressStep } from '@/types/campaign'

export default defineComponent({
  name: 'CampaignCard',
  props: {
    campaign: { type: Object as PropType<Campaign>, required: true },
    active:   { type: Boolean, default: false },
  },
  emits: ['open'],
  computed: {
    ICON() { return ICON },

    moleculeShortLabel(): string {
      return MOLECULE_TYPE_META[this.campaign.moleculeType].shortLabel
    },

    moleculeCategory(): string {
      return MOLECULE_TYPE_META[this.campaign.moleculeType].category
    },

    statusLabel(): string {
      const map: Record<string, string> = {
        'draft':       this.$t('campaign.card.draft'),
        'in-progress': this.$t('campaign.card.inProgress'),
        'complete':    this.$t('campaign.card.complete'),
        'archived':    this.$t('campaign.card.archived'),
      }
      return map[this.campaign.status] ?? this.campaign.status
    },

    moduleProgress(): CampaignProgressStep[] {
      const order = [MODULE_ID.CELL_ENGINEERING, MODULE_ID.CLONE_UPSTREAM, MODULE_ID.DOWNSTREAM]
      return order.map((m, i) => ({
        module:  String(i + 1),
        done:    this.campaign.modules[m].status === MODULE_STATUS.COMPLETE,
        current: this.campaign.modules[m].status === MODULE_STATUS.IN_PROGRESS,
      }))
    },

    predictedYieldPct(): number | null {
      const v = this.campaign.modules[MODULE_ID.DOWNSTREAM].predictedYieldPct
      return v === undefined ? null : Math.round(v)
    },

    lastModifiedDisplay(): string {
      const d = new Date(this.campaign.modifiedAt)
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    },
  },
})
</script>

<style lang="scss" scoped>
.campaign-card {
  @include flex-col(0.75rem);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 1.25rem;
  cursor: pointer;
  transition: transform var(--tr-fast), border-color var(--tr-fast), box-shadow var(--tr-fast);

  &:hover {
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--color-primary) 40%, var(--color-border));
    box-shadow: 0 8px 24px color-mix(in srgb, black 25%, transparent);
  }

  &--active {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--color-primary) 40%, transparent);
  }

  &__header {
    @include flex-between(0.5rem);
  }

  &__molecule {
    @include mono-upper(var(--fs-xxs));
    padding: 0.2rem 0.55rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-primary) 18%, transparent);
    color: var(--color-primary);

    &[data-category="antibody"]     { background: color-mix(in srgb, var(--color-primary) 18%, transparent); color: var(--color-primary); }
    &[data-category="protein"]      { background: color-mix(in srgb, var(--color-amber) 18%, transparent);   color: var(--color-amber); }
    &[data-category="viral-vector"] { background: color-mix(in srgb, var(--color-danger) 18%, transparent);  color: var(--color-danger); }
    &[data-category="nucleic-acid"] { background: color-mix(in srgb, var(--color-ok) 18%, transparent); color: var(--color-ok); }
    &[data-category="antigen"]      { background: color-mix(in srgb, var(--color-primary) 18%, transparent); color: var(--color-primary); }
  }

  &__status {
    @include mono-upper(var(--fs-xxs));
    opacity: var(--op-muted);

    &[data-status="draft"]        { color: var(--color-text-muted); }
    &[data-status="in-progress"]  { color: var(--color-amber); }
    &[data-status="complete"]     { color: var(--color-ok); }
    &[data-status="archived"]     { opacity: var(--op-ghost); }
  }

  &__name {
    font-size: 1.1rem;
    font-weight: 600;
    margin: 0;
    color: var(--color-text-heading);
    line-height: 1.3;
  }

  &__progress {
    @include flex-between(0.5rem);
    align-items: center;
  }

  &__progress-label {
    @include mono-upper(var(--fs-xxs));
    opacity: var(--op-muted);
  }

  &__progress-dots {
    @include flex-row(0.35rem);
  }

  &__dot {
    width: 1.2rem;
    height: 1.2rem;
    border-radius: 50%;
    @include inline-flex-center;
    font-family: var(--font-mono);
    font-size: 0.6rem;
    font-weight: 600;
    background: color-mix(in srgb, var(--color-text) 8%, transparent);
    color: var(--color-text-muted);
    transition: background var(--tr-fast), color var(--tr-fast), transform var(--tr-fast);

    &--done {
      background: color-mix(in srgb, var(--color-ok) 20%, transparent);
      color: var(--color-ok);
    }

    &--current {
      background: color-mix(in srgb, var(--color-primary) 25%, transparent);
      color: var(--color-primary);
      transform: scale(1.1);
    }
  }

  &__yield {
    @include flex-between(0.5rem);
    padding: 0.5rem 0.75rem;
    background: color-mix(in srgb, var(--color-ok) 8%, transparent);
    border-radius: var(--radius);
    border: 1px solid color-mix(in srgb, var(--color-ok) 25%, transparent);
  }

  &__yield-label {
    @include mono-upper(var(--fs-xxs));
    color: var(--color-ok);
    opacity: var(--op-strong);
  }

  &__yield-value {
    font-family: var(--font-mono);
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--color-ok);
  }

  &__footer {
    @include flex-between(0.5rem);
    margin-top: auto;
    padding-top: 0.5rem;
    border-top: 1px solid color-mix(in srgb, var(--color-text) 6%, transparent);
  }

  &__date {
    @include mono-upper(var(--fs-xxs));
    opacity: var(--op-muted);
  }

  &__continue {
    @include mono-upper(var(--fs-xs));
    background: transparent;
    border: none;
    color: var(--color-primary);
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius);
    transition: background var(--tr-fast);

    &:hover {
      background: color-mix(in srgb, var(--color-primary) 10%, transparent);
    }
  }
}
</style>
