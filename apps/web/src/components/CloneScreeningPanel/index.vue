<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <section class="clone-screen">
    <header class="clone-screen__header">
      <div>
        <h2 class="clone-screen__title">{{ $t('cloneUp.screening.title') }}</h2>
        <p class="clone-screen__subtitle">{{ $t('cloneUp.screening.subtitle') }}</p>
      </div>
      <div class="clone-screen__actions">
        <button class="clone-screen__btn" @click="$emit('addClone')">{{ $t('cloneUp.screening.addClone') }}</button>
        <button class="clone-screen__btn clone-screen__btn--ghost" @click="$emit('loadDemo')">{{ $t('cloneUp.screening.loadDemo') }}</button>
      </div>
    </header>

    <div v-if="clones.length === 0" class="clone-screen__empty">
      <span class="clone-screen__empty-icon" aria-hidden="true">{{ ICON.CELL }}</span>
      <h3 class="clone-screen__empty-title">{{ $t('cloneUp.screening.emptyTitle') }}</h3>
      <p class="clone-screen__empty-text">{{ $t('cloneUp.screening.emptyText') }}</p>
    </div>

    <template v-else>
      <!-- Winner card -->
      <div v-if="winner" class="clone-screen__winner">
        <div class="clone-screen__winner-head">
          <span class="clone-screen__winner-badge">{{ ICON.STAR }} {{ $t('cloneUp.screening.topPick') }}</span>
          <div>
            <h3 class="clone-screen__winner-title">{{ $t('cloneUp.screening.winnerTitle') }}: {{ winnerLabel }}</h3>
            <p class="clone-screen__winner-subtitle">{{ $t('cloneUp.screening.winnerSubtitle') }}</p>
          </div>
          <span class="clone-screen__winner-score">{{ Math.round(winner.composite * 100) }}<small>%</small></span>
        </div>
        <div class="clone-screen__breakdown">
          <div v-for="b in winnerBreakdown" :key="b.key" class="clone-screen__bd">
            <span class="clone-screen__bd-label">{{ b.label }}</span>
            <div class="clone-screen__bd-bar"><div class="clone-screen__bd-fill" :style="{ width: `${b.pct}%` }"></div></div>
            <span class="clone-screen__bd-pct">{{ b.pct }}%</span>
          </div>
        </div>
        <div class="clone-screen__winner-projection">
          {{ $t('cloneUp.screening.predictedLongTerm') }}: <strong>{{ winner.predictedLongTermTiterGL }} {{ $t('cloneUp.screening.gLUnit') }}</strong>
        </div>
      </div>

      <!-- Ranked editable table -->
      <div class="clone-screen__table-wrap">
        <table class="clone-screen__table">
          <thead>
            <tr>
              <th>{{ $t('cloneUp.screening.rankLabel') }}</th>
              <th>{{ $t('cloneUp.screening.cloneLabel') }}</th>
              <th>{{ $t('cloneUp.screening.titerDay3') }}</th>
              <th>{{ $t('cloneUp.screening.titerDay7') }}</th>
              <th>{{ $t('cloneUp.screening.titerDay14') }}</th>
              <th>{{ $t('cloneUp.screening.peakVcd') }}</th>
              <th>{{ $t('cloneUp.screening.viability') }}</th>
              <th>{{ $t('cloneUp.screening.stability') }}</th>
              <th>{{ $t('cloneUp.screening.aggregate') }}</th>
              <th>{{ $t('cloneUp.screening.scoreLabel') }}</th>
              <th>{{ $t('cloneUp.screening.riskLabel') }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in rankedRows" :key="row.clone.id" :class="{ 'clone-screen__row--top': i === 0 }">
              <td class="clone-screen__rank">#{{ i + 1 }}</td>
              <td><input class="clone-screen__text" :value="row.clone.label" @input="patch(row.clone.id, 'label', $event)" /></td>
              <td><input class="clone-screen__num" type="number" step="0.1" :value="row.clone.titerDay3GL" @input="patchNum(row.clone.id, 'titerDay3GL', $event)" /></td>
              <td><input class="clone-screen__num" type="number" step="0.1" :value="row.clone.titerDay7GL" @input="patchNum(row.clone.id, 'titerDay7GL', $event)" /></td>
              <td><input class="clone-screen__num" type="number" step="0.1" :value="row.clone.titerDay14GL" @input="patchNum(row.clone.id, 'titerDay14GL', $event)" /></td>
              <td><input class="clone-screen__num" type="number" step="1" :value="row.clone.peakVcdE6" @input="patchNum(row.clone.id, 'peakVcdE6', $event)" /></td>
              <td><input class="clone-screen__num" type="number" step="1" :value="row.clone.viabilityPct" @input="patchNum(row.clone.id, 'viabilityPct', $event)" /></td>
              <td>
                <select class="clone-screen__select" :value="row.clone.geneticStability" @change="patch(row.clone.id, 'geneticStability', $event)">
                  <option value="stable">{{ $t('cloneUp.screening.stabilityStable') }}</option>
                  <option value="moderate">{{ $t('cloneUp.screening.stabilityModerate') }}</option>
                  <option value="unstable">{{ $t('cloneUp.screening.stabilityUnstable') }}</option>
                </select>
              </td>
              <td><input class="clone-screen__num" type="number" step="0.1" :value="row.clone.aggregatePct" @input="patchNum(row.clone.id, 'aggregatePct', $event)" /></td>
              <td class="clone-screen__score" :data-tier="scoreTier(row.score.composite)">{{ Math.round(row.score.composite * 100) }}%</td>
              <td><span class="clone-screen__risk" :data-risk="row.score.stabilityRisk">{{ riskLabel(row.score.stabilityRisk) }}</span></td>
              <td><button class="clone-screen__remove" :aria-label="$t('cloneUp.screening.remove')" @click="$emit('removeClone', row.clone.id)">{{ ICON.CLOSE }}</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>
  </section>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'

import { ICON } from '@/constants/icons'

import { rankClones } from '@/utils/clone/cloneScoring'

import { type CloneScreeningData, type CloneScore, type StabilityRisk } from '@/types/clone'

interface RankedRow {
  clone: CloneScreeningData
  score: CloneScore
}

export default defineComponent({
  name: 'CloneScreeningPanel',
  props: {
    clones: { type: Array as PropType<CloneScreeningData[]>, default: () => [] },
  },
  emits: ['addClone', 'loadDemo', 'removeClone', 'updateClone'],
  computed: {
    ICON() { return ICON },

    ranked(): CloneScore[] {
      return rankClones(this.clones)
    },

    rankedRows(): RankedRow[] {
      return this.ranked
        .map(score => ({ score, clone: this.clones.find(c => c.id === score.cloneId)! }))
        .filter(r => r.clone)
    },

    winner(): CloneScore | null {
      return this.ranked[0] ?? null
    },

    winnerLabel(): string {
      return this.winner ? (this.clones.find(c => c.id === this.winner!.cloneId)?.label ?? '') : ''
    },

    winnerBreakdown() {
      if (!this.winner) return []
      return [
        { key: 'prod',  label: this.$t('cloneUp.screening.breakdownProductivity'), pct: Math.round(this.winner.productivityScore * 100) },
        { key: 'stab',  label: this.$t('cloneUp.screening.breakdownStability'),    pct: Math.round(this.winner.stabilityScore * 100) },
        { key: 'grow',  label: this.$t('cloneUp.screening.breakdownGrowth'),       pct: Math.round(this.winner.growthScore * 100) },
        { key: 'qual',  label: this.$t('cloneUp.screening.breakdownQuality'),      pct: Math.round(this.winner.qualityScore * 100) },
      ]
    },
  },
  methods: {
    scoreTier(c: number): string {
      if (c >= 0.75) return 'high'
      if (c >= 0.5)  return 'mid'
      return 'low'
    },
    riskLabel(r: StabilityRisk): string {
      const map: Record<StabilityRisk, string> = {
        low:    this.$t('cloneUp.screening.riskLow'),
        medium: this.$t('cloneUp.screening.riskMedium'),
        high:   this.$t('cloneUp.screening.riskHigh'),
      }
      return map[r]
    },
    patch(id: string, key: keyof CloneScreeningData, e: Event) {
      this.$emit('updateClone', id, { [key]: (e.target as HTMLInputElement | HTMLSelectElement).value })
    },
    patchNum(id: string, key: keyof CloneScreeningData, e: Event) {
      this.$emit('updateClone', id, { [key]: parseFloat((e.target as HTMLInputElement).value) || 0 })
    },
  },
})
</script>

<style lang="scss" scoped>
.clone-screen {
  @include flex-col(1.5rem);

  &__header { @include flex-between(1rem); align-items: flex-start; }
  &__title { margin: 0 0 0.3rem; font-size: 1.25rem; font-weight: 600; color: var(--color-text-heading); }
  &__subtitle { margin: 0; font-size: var(--fs-md); opacity: var(--op-partial); line-height: 1.5; max-width: 44rem; }
  &__actions { @include flex-row(0.5rem); flex-shrink: 0; }
  &__btn {
    @include mono-upper(var(--fs-xs)); background: var(--color-primary); color: var(--color-bg); border: none;
    padding: 0.55rem 0.9rem; border-radius: var(--radius); cursor: pointer; transition: background var(--tr-fast);
    &:hover { background: color-mix(in srgb, var(--color-primary) 90%, white); }
    &--ghost { background: transparent; border: 1px solid var(--color-border); color: var(--color-text);
      &:hover { background: color-mix(in srgb, var(--color-text) 6%, transparent); } }
  }

  &__empty {
    @include flex-col(0.75rem); align-items: center; text-align: center; padding: 3rem 1.5rem;
    background: var(--color-surface); border: 1px dashed var(--color-border); border-radius: var(--radius-lg);
  }
  &__empty-icon { font-size: 2.5rem; opacity: var(--op-muted); }
  &__empty-title { margin: 0; font-size: 1.2rem; font-weight: 600; color: var(--color-text-heading); }
  &__empty-text { margin: 0; opacity: var(--op-partial); max-width: 28rem; line-height: 1.5; }

  &__winner {
    @include flex-col(1rem); padding: 1.25rem;
    background: linear-gradient(135deg, color-mix(in srgb, var(--color-ok) 10%, var(--color-surface)) 0%, var(--color-surface) 70%);
    border: 1px solid color-mix(in srgb, var(--color-ok) 35%, transparent); border-radius: var(--radius-lg);
  }
  &__winner-head { @include flex-row(1rem); align-items: center; }
  &__winner-badge {
    @include mono-upper(var(--fs-xxs)); background: var(--color-ok); color: var(--color-bg);
    padding: 0.25rem 0.6rem; border-radius: 999px; flex-shrink: 0; align-self: flex-start;
  }
  &__winner-title { margin: 0 0 0.2rem; font-size: 1.1rem; font-weight: 600; color: var(--color-text-heading); }
  &__winner-subtitle { margin: 0; font-size: var(--fs-sm); opacity: var(--op-partial); }
  &__winner-score { margin-left: auto; font-family: var(--font-mono); font-size: 2rem; font-weight: 700; color: var(--color-ok); small { font-size: 0.5em; opacity: var(--op-muted); } }
  &__breakdown { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 0.6rem; }
  &__bd { @include flex-col(0.25rem); }
  &__bd-label { @include mono-upper(0.55rem); opacity: var(--op-muted); }
  &__bd-bar { height: 5px; background: color-mix(in srgb, var(--color-text) 10%, transparent); border-radius: 999px; overflow: hidden; }
  &__bd-fill { height: 100%; background: var(--color-ok); border-radius: 999px; transition: width 400ms ease-out; }
  &__bd-pct { font-family: var(--font-mono); font-size: var(--fs-xs); color: var(--color-text); }
  &__winner-projection { font-size: var(--fs-md); color: var(--color-text); strong { color: var(--color-ok); font-family: var(--font-mono); } }

  &__table-wrap { overflow-x: auto; border: 1px solid var(--color-border); border-radius: var(--radius-lg); }
  &__table {
    width: 100%; border-collapse: collapse; font-size: var(--fs-sm);
    th { @include mono-upper(0.55rem); opacity: var(--op-muted); text-align: left; padding: 0.6rem 0.5rem; border-bottom: 1px solid var(--color-border); white-space: nowrap; }
    td { padding: 0.4rem 0.5rem; border-bottom: 1px solid color-mix(in srgb, var(--color-text) 5%, transparent); }
  }
  &__row--top { background: color-mix(in srgb, var(--color-ok) 5%, transparent); }
  &__rank { font-family: var(--font-mono); font-weight: 700; color: var(--color-primary); }
  &__text, &__num, &__select {
    background: var(--color-surface-2); border: 1px solid var(--color-border); border-radius: var(--radius);
    color: var(--color-text); font-family: var(--font-mono); font-size: var(--fs-xs); padding: 0.3rem 0.4rem;
    &:focus { outline: none; border-color: var(--color-primary); }
  }
  &__text { width: 5.5rem; }
  &__num { width: 3.5rem; }
  &__score {
    font-family: var(--font-mono); font-weight: 700;
    &[data-tier="high"] { color: var(--color-ok); }
    &[data-tier="mid"]  { color: var(--color-primary); }
    &[data-tier="low"]  { color: var(--color-amber); }
  }
  &__risk {
    @include mono-upper(0.55rem); padding: 0.1rem 0.4rem; border-radius: 999px;
    &[data-risk="low"]    { background: color-mix(in srgb, var(--color-ok) 18%, transparent); color: var(--color-ok); }
    &[data-risk="medium"] { background: color-mix(in srgb, var(--color-amber) 18%, transparent); color: var(--color-amber); }
    &[data-risk="high"]   { background: color-mix(in srgb, var(--color-danger) 18%, transparent); color: var(--color-danger); }
  }
  &__remove {
    background: transparent; border: none; color: var(--color-text-muted); cursor: pointer; font-size: 0.9rem;
    &:hover { color: var(--color-danger); }
  }
}
</style>
