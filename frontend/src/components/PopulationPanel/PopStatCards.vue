<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="pop-stat-cards">
    <div class="pop-stat-cards__stat pop-stat-cards__stat--target" v-tip="tipTargetCard">
      <div class="pop-stat-cards__stat-label">{{ targetLabel }}</div>
      <div class="pop-stat-cards__stat-row">
        <span class="pop-stat-cards__stat-badge pop-stat-cards__stat-badge--lysed" v-tip="tipLysedTarget">
          {{ $t('population.badgeLysed', { pct: targetStats.pctLysed }) }}<span class="pop-stat-cards__badge-se"> ±{{ targetStats.seLysed }}%</span>
        </span>
        <span class="pop-stat-cards__stat-badge pop-stat-cards__stat-badge--revep" v-tip="tipRevEpTarget">
          {{ $t('population.badgeRevEp', { pct: targetStats.pctRevEp }) }}<span class="pop-stat-cards__badge-se"> ±{{ targetStats.seRevEp }}%</span>
        </span>
        <span class="pop-stat-cards__stat-badge pop-stat-cards__stat-badge--nour" v-tip="tipNourTarget">
          {{ $t('population.badgeNour', { pct: targetStats.pctNour }) }}<span class="pop-stat-cards__badge-se"> ±{{ targetStats.seNour }}%</span>
        </span>
      </div>
      <div class="pop-stat-cards__stat-sub" v-tip="tipMeanDrTarget">
        {{ $t('population.statMeanDr') }} {{ targetStats.meanDr.toFixed(2) }} ± {{ targetStats.stdDr.toFixed(2) }} &nbsp;·&nbsp;
        σ<sub>i</sub> ±{{ targetUncPct }}%
      </div>
    </div>

    <div class="pop-stat-cards__stat pop-stat-cards__stat--healthy" v-tip="tipHealthyCard">
      <div class="pop-stat-cards__stat-label">{{ healthyLabel }}</div>
      <div class="pop-stat-cards__stat-row">
        <span class="pop-stat-cards__stat-badge pop-stat-cards__stat-badge--lysed" v-tip="tipLysedHealthy">
          {{ $t('population.badgeLysed', { pct: healthyStats.pctLysed }) }}<span class="pop-stat-cards__badge-se"> ±{{ healthyStats.seLysed }}%</span>
        </span>
        <span class="pop-stat-cards__stat-badge pop-stat-cards__stat-badge--revep" v-tip="tipRevEpHealthy">
          {{ $t('population.badgeRevEp', { pct: healthyStats.pctRevEp }) }}<span class="pop-stat-cards__badge-se"> ±{{ healthyStats.seRevEp }}%</span>
        </span>
        <span class="pop-stat-cards__stat-badge pop-stat-cards__stat-badge--nour" v-tip="tipNourHealthy">
          {{ $t('population.badgeNour', { pct: healthyStats.pctNour }) }}<span class="pop-stat-cards__badge-se"> ±{{ healthyStats.seNour }}%</span>
        </span>
      </div>
      <div class="pop-stat-cards__stat-sub" v-tip="tipMeanDrHealthy">
        {{ $t('population.statMeanDr') }} {{ healthyStats.meanDr.toFixed(2) }} ± {{ healthyStats.stdDr.toFixed(2) }} &nbsp;·&nbsp;
        σ<sub>i</sub> ±{{ healthyUncPct }}%
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import type { PropType } from 'vue'
import type { PopStats } from './popPanelCompute'

export default defineComponent({
  props: {
    targetStats:  { type: Object as PropType<PopStats>, required: true },
    healthyStats: { type: Object as PropType<PopStats>, required: true },
    targetUncPct: { type: Number, required: true },
    healthyUncPct:{ type: Number, required: true },
    targetLabel:  { type: String, required: true },
    healthyLabel: { type: String, required: true },
  },

  computed: {
    tipTargetCard(): string {
      return this.$t('population.tipTargetCard', {
        label:  this.targetLabel,
        uncPct: this.targetUncPct,
      })
    },

    tipHealthyCard(): string {
      return this.$t('population.tipHealthyCard', {
        label:  this.healthyLabel,
        uncPct: this.healthyUncPct,
      })
    },

    tipLysedTarget(): string {
      return this.$t('population.tipLysedTarget', { pct: this.targetStats.pctLysed, se: this.targetStats.seLysed })
    },
    tipRevEpTarget(): string {
      return this.$t('population.tipRevEpTarget', { pct: this.targetStats.pctRevEp, se: this.targetStats.seRevEp })
    },
    tipNourTarget(): string {
      return this.$t('population.tipNourTarget',  { pct: this.targetStats.pctNour,  se: this.targetStats.seNour  })
    },
    tipLysedHealthy(): string {
      return this.$t('population.tipLysedHealthy', { pct: this.healthyStats.pctLysed, se: this.healthyStats.seLysed })
    },
    tipRevEpHealthy(): string {
      return this.$t('population.tipRevEpHealthy', { pct: this.healthyStats.pctRevEp, se: this.healthyStats.seRevEp })
    },
    tipNourHealthy(): string {
      return this.$t('population.tipNourHealthy',  { pct: this.healthyStats.pctNour,  se: this.healthyStats.seNour  })
    },

    tipMeanDrTarget(): string {
      return this.$t('population.tipMeanDr', {
        mean:   this.targetStats.meanDr.toFixed(3),
        std:    this.targetStats.stdDr.toFixed(3),
        uncPct: this.targetUncPct,
      })
    },

    tipMeanDrHealthy(): string {
      return this.$t('population.tipMeanDr', {
        mean:   this.healthyStats.meanDr.toFixed(3),
        std:    this.healthyStats.stdDr.toFixed(3),
        uncPct: this.healthyUncPct,
      })
    },
  },
})
</script>

<style lang="scss" scoped>
@use '../../styles/mixins' as *;

.pop-stat-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;

  &__stat {
    @include flex-col(0.35rem);
    padding: 0.65rem 0.8rem;
    border-radius: var(--radius);
    border: 1px solid var(--color-border);
    cursor: help;

    &--target  { border-color: color-mix(in srgb, var(--color-danger) 25%, transparent);  background: color-mix(in srgb, var(--color-danger) 4%, transparent); }
    &--healthy { border-color: color-mix(in srgb, var(--color-primary) 20%, transparent);   background: color-mix(in srgb, var(--color-primary) 3%, transparent); }
  }

  &__stat-label {
    font-size: var(--fs-sm);
    font-weight: 600;
    color: var(--color-text-heading);
    font-family: var(--font-mono);
    letter-spacing: 0.03em;
  }

  &__stat-row {
    @include flex-row(0.35rem);
    flex-wrap: wrap;
  }

  &__stat-badge {
    font-size: var(--fs-xs);
    font-family: var(--font-mono);
    padding: 0.15rem 0.4rem;
    border-radius: 3px;
    cursor: help;

    &--lysed { background: color-mix(in srgb, var(--color-danger) 15%, transparent);  color: var(--color-danger); }
    &--revep { background: color-mix(in srgb, var(--color-amber) 12%, transparent); color: var(--color-amber);  }
    &--nour  { background: color-mix(in srgb, var(--color-primary) 10%, transparent);   color: var(--color-primary); }
  }

  &__badge-se {
    font-size: 0.75em;
    opacity: 0.6;
  }

  &__stat-sub {
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    cursor: help;
  }
}
</style>
