<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <article
    class="cell-line-card"
    :class="{ 'cell-line-card--selected': selected, 'cell-line-card--top': topMatch }"
    @click="$emit('select')"
  >
    <header class="cell-line-card__header">
      <span v-if="topMatch" class="cell-line-card__top-badge">{{ $t('cellEng.selector.topMatch') }}</span>
      <span class="cell-line-card__rank">#{{ rankIndex + 1 }}</span>
    </header>

    <div class="cell-line-card__visual-row">
      <HostCellVisual
        :host-species="result.cellLine.hostSpecies"
        :active="selected"
        :size="96"
        :aria-label="`${result.cellLine.shortLabel} cell visualization`"
      />

      <div class="cell-line-card__fit">
        <svg class="cell-line-card__fit-ring" viewBox="0 0 60 60" aria-hidden="true">
          <circle class="cell-line-card__fit-track" cx="30" cy="30" r="26" />
          <circle
            class="cell-line-card__fit-fill"
            cx="30" cy="30" r="26"
            :stroke-dasharray="ringCircumference"
            :stroke-dashoffset="ringDashOffset"
          />
        </svg>
        <span class="cell-line-card__fit-value">{{ fitPercent }}<span class="cell-line-card__fit-unit">%</span></span>
        <span class="cell-line-card__fit-label" v-tip="$t('cellEng.selector.tipFitScore')">{{ $t('cellEng.card.fitScoreLabel') }}</span>
      </div>
    </div>

    <h3 class="cell-line-card__name">{{ result.cellLine.shortLabel }}</h3>
    <p class="cell-line-card__description">{{ result.cellLine.description }}</p>

    <ul class="cell-line-card__reasons">
      <li v-for="(reason, i) in result.reasons" :key="i" class="cell-line-card__reason" :data-tone="reasonTone(reason.kind)">
        <span class="cell-line-card__reason-dot" aria-hidden="true">{{ ICON.DOT }}</span>
        <span class="cell-line-card__reason-text">{{ reasonText(reason) }}</span>
      </li>
    </ul>

    <dl class="cell-line-card__metrics">
      <div class="cell-line-card__metric">
        <dt class="cell-line-card__metric-label">{{ $t('cellEng.card.titerLabel') }}</dt>
        <dd class="cell-line-card__metric-value">
          <template v-if="result.productivity">{{ result.productivity.titerRange[0] }} to {{ result.productivity.titerRange[1] }} {{ result.productivity.units }}</template>
          <template v-else>—</template>
        </dd>
      </div>
      <div class="cell-line-card__metric">
        <dt class="cell-line-card__metric-label">{{ $t('cellEng.card.regulatoryLabel') }}</dt>
        <dd class="cell-line-card__metric-value">{{ result.cellLine.numApprovedProducts }}</dd>
      </div>
    </dl>

    <footer class="cell-line-card__footer">
      <button
        class="cell-line-card__select-btn"
        :class="{ 'cell-line-card__select-btn--selected': selected }"
        @click.stop="$emit('select')"
      >
        <span v-if="selected">{{ ICON.CHECK }} {{ $t('cellEng.card.selectedBtn') }}</span>
        <span v-else>{{ $t('cellEng.card.selectBtn') }}</span>
      </button>
      <button class="cell-line-card__detail-btn" @click.stop="$emit('viewDetail')">
        {{ $t('cellEng.card.viewDetail') }}
      </button>
    </footer>
  </article>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'

import HostCellVisual from '@/components/HostCellVisual/index.vue'

import { ICON } from '@/constants/icons'

import type { CellLineRankResult, CellLineRankReason } from '@/utils/cellLine/ranking'

const RING_R = 26
const RING_C = 2 * Math.PI * RING_R

export default defineComponent({
  name: 'CellLineCard',
  components: { HostCellVisual },
  props: {
    result:    { type: Object as PropType<CellLineRankResult>, required: true },
    rankIndex: { type: Number,  required: true },
    selected:  { type: Boolean, default: false },
    topMatch:  { type: Boolean, default: false },
  },
  emits: ['select', 'viewDetail'],
  computed: {
    ICON() { return ICON },

    fitPercent(): number {
      return Math.round(this.result.fitScore * 100)
    },

    ringCircumference(): number {
      return RING_C
    },

    ringDashOffset(): number {
      return RING_C * (1 - this.result.fitScore)
    },
  },
  methods: {
    reasonText(reason: CellLineRankReason): string {
      const map: Record<CellLineRankReason['kind'], string> = {
        'productivity-high':       'cellEng.card.reasonProductivityHigh',
        'productivity-mid':        'cellEng.card.reasonProductivityMid',
        'productivity-low':        'cellEng.card.reasonProductivityLow',
        'regulatory-strong':       'cellEng.card.reasonRegulatoryStrong',
        'regulatory-moderate':     'cellEng.card.reasonRegulatoryModerate',
        'regulatory-limited':      'cellEng.card.reasonRegulatoryLimited',
        'platform-established':    'cellEng.card.reasonPlatformEstablished',
        'platform-emerging':       'cellEng.card.reasonPlatformEmerging',
        'speed-fast':              'cellEng.card.reasonSpeedFast',
        'speed-slow':              'cellEng.card.reasonSpeedSlow',
        'glycosylation-required':  'cellEng.card.reasonGlycosylationRequired',
        'glycosylation-not-required': 'cellEng.card.reasonGlycosylationNotRequired',
      }
      const params: Record<string, string | number> = {}
      if (reason.titerLow      !== undefined) params.low     = reason.titerLow
      if (reason.titerHigh     !== undefined) params.high    = reason.titerHigh
      if (reason.titerUnits    !== undefined) params.units   = reason.titerUnits
      if (reason.approvedCount !== undefined) params.count   = reason.approvedCount
      return this.$t(map[reason.kind], params)
    },

    reasonTone(kind: CellLineRankReason['kind']): string {
      if (kind === 'productivity-high' || kind === 'regulatory-strong' || kind === 'platform-established' || kind === 'speed-fast') return 'positive'
      if (kind === 'productivity-low'  || kind === 'regulatory-limited' || kind === 'platform-emerging'   || kind === 'speed-slow') return 'caution'
      return 'neutral'
    },
  },
})
</script>

<style lang="scss" scoped>
.cell-line-card {
  @include flex-col(0.75rem);
  position: relative;
  padding: 1.25rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  cursor: pointer;
  transition: transform var(--tr-fast), border-color var(--tr-fast), box-shadow var(--tr-fast);

  &:hover {
    transform: translateY(-3px);
    border-color: color-mix(in srgb, var(--color-primary) 45%, var(--color-border));
    box-shadow: 0 12px 32px color-mix(in srgb, black 30%, transparent);
  }

  &--selected {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 2px color-mix(in srgb, var(--color-primary) 40%, transparent);
  }

  &--top {
    background: linear-gradient(180deg, color-mix(in srgb, var(--color-primary) 6%, var(--color-surface)) 0%, var(--color-surface) 60%);
  }

  &__header {
    @include flex-between(0.5rem);
    min-height: 1.5rem;
  }

  &__top-badge {
    @include mono-upper(var(--fs-xxs));
    background: var(--color-primary);
    color: var(--color-bg);
    padding: 0.18rem 0.55rem;
    border-radius: 999px;
  }

  &__rank {
    @include mono-upper(var(--fs-xs));
    opacity: var(--op-muted);
    margin-left: auto;
  }

  &__visual-row {
    @include flex-between();
    align-items: center;
    padding: 0.25rem 0;
  }

  &__fit {
    position: relative;
    @include inline-flex-center;
    flex-direction: column;
    width: 70px;
    height: 70px;
  }

  &__fit-ring {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    transform: rotate(-90deg);
  }

  &__fit-track {
    fill: none;
    stroke: color-mix(in srgb, var(--color-text) 10%, transparent);
    stroke-width: 5;
  }

  &__fit-fill {
    fill: none;
    stroke: var(--color-primary);
    stroke-width: 5;
    stroke-linecap: round;
    transition: stroke-dashoffset 500ms ease-out;
  }

  &__fit-value {
    font-family: var(--font-mono);
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-primary);
    line-height: 1;
  }

  &__fit-unit {
    font-size: 0.7em;
    opacity: var(--op-muted);
  }

  &__fit-label {
    @include mono-upper(0.55rem);
    opacity: var(--op-muted);
    margin-top: 0.1rem;
  }

  &__name {
    margin: 0;
    font-size: 1.15rem;
    font-weight: 600;
    color: var(--color-text-heading);
    line-height: 1.2;
  }

  &__description {
    margin: 0;
    font-size: var(--fs-md);
    opacity: var(--op-partial);
    line-height: 1.45;
    min-height: 2.6em;
  }

  &__reasons {
    list-style: none;
    margin: 0;
    padding: 0;
    @include flex-col(0.3rem);
  }

  &__reason {
    @include flex-row(0.4rem);
    align-items: flex-start;
    font-size: var(--fs-sm);
    line-height: 1.4;

    &[data-tone="positive"] .cell-line-card__reason-dot { color: var(--color-ok); }
    &[data-tone="caution"]  .cell-line-card__reason-dot { color: var(--color-amber); }
    &[data-tone="neutral"]  .cell-line-card__reason-dot { color: var(--color-text-muted); }
  }

  &__reason-dot {
    flex-shrink: 0;
    font-size: 0.7rem;
    margin-top: 0.2rem;
  }

  &__reason-text {
    color: var(--color-text);
    opacity: var(--op-strong);
  }

  &__metrics {
    @include flex-row(1rem);
    margin: 0;
    padding: 0.5rem 0;
    border-top: 1px solid color-mix(in srgb, var(--color-text) 6%, transparent);
    border-bottom: 1px solid color-mix(in srgb, var(--color-text) 6%, transparent);
  }

  &__metric {
    @include flex-col(0.1rem);
    flex: 1;
  }

  &__metric-label {
    @include mono-upper(var(--fs-xxs));
    opacity: var(--op-muted);
    margin: 0;
  }

  &__metric-value {
    margin: 0;
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
    color: var(--color-text);
  }

  &__footer {
    @include flex-between(0.5rem);
    margin-top: auto;
  }

  &__select-btn {
    @include mono-upper(var(--fs-sm));
    background: var(--color-primary);
    color: var(--color-bg);
    border: none;
    padding: 0.5rem 1rem;
    border-radius: var(--radius);
    cursor: pointer;
    flex: 1;
    transition: background var(--tr-fast);

    &:hover { background: color-mix(in srgb, var(--color-primary) 90%, white); }

    &--selected {
      background: color-mix(in srgb, var(--color-ok) 25%, transparent);
      color: var(--color-ok);
      border: 1px solid var(--color-ok);
    }
  }

  &__detail-btn {
    @include mono-upper(var(--fs-xs));
    background: transparent;
    border: 1px solid var(--color-border);
    color: var(--color-text);
    padding: 0.5rem 0.8rem;
    border-radius: var(--radius);
    cursor: pointer;
    transition: border-color var(--tr-fast), color var(--tr-fast);

    &:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }
  }
}
</style>
