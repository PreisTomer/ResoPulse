<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="lab-runs">

    <!-- ── List mode ──────────────────────────────────────────────── -->
    <template v-if="!selectedRun">
      <header class="lab-runs__header">
        <div>
          <h1 class="lab-runs__title">{{ $t('labRuns.viewTitle') }}</h1>
          <p class="lab-runs__subtitle">{{ $t('labRuns.viewSubtitle') }}</p>
        </div>
        <button class="lab-runs__new-btn" :disabled="!activeCampaign" @click="createRun">
          {{ $t('labRuns.newRun') }}
        </button>
      </header>

      <p v-if="!activeCampaign" class="lab-runs__need-campaign">{{ $t('labRuns.needCampaign') }}</p>

      <div v-if="runs.length === 0" class="lab-runs__empty">
        <span class="lab-runs__empty-icon" aria-hidden="true">{{ ICON.FLASK }}</span>
        <h2 class="lab-runs__empty-title">{{ $t('labRuns.emptyTitle') }}</h2>
        <p class="lab-runs__empty-text">{{ $t('labRuns.emptyText') }}</p>
      </div>

      <div v-else class="lab-runs__grid">
        <article v-for="run in runs" :key="run.id" class="lab-runs__card" @click="selectedRunId = run.id">
          <header class="lab-runs__card-header">
            <h3 class="lab-runs__card-name">{{ run.name }}</h3>
            <span class="lab-runs__status" :data-status="run.status">{{ statusLabel(run.status) }}</span>
          </header>
          <span class="lab-runs__card-campaign">{{ campaignName(run.campaignId) }}</span>
          <div class="lab-runs__card-footer">
            <span class="lab-runs__card-date">{{ $t('labRuns.card.created') }}: {{ dateOf(run.createdAt) }}</span>
            <button class="lab-runs__card-view" @click.stop="selectedRunId = run.id">{{ $t('labRuns.card.view') }} {{ ICON.ARROW_SHORT }}</button>
          </div>
        </article>
      </div>
    </template>

    <!-- ── Detail mode ────────────────────────────────────────────── -->
    <template v-else>
      <button class="lab-runs__back" @click="selectedRunId = null">{{ ICON.ARROW_SHORT }} {{ $t('labRuns.detail.back') }}</button>

      <header class="lab-runs__detail-header">
        <h1 class="lab-runs__title">{{ selectedRun.name }}</h1>
        <span class="lab-runs__status" :data-status="selectedRun.status">{{ statusLabel(selectedRun.status) }}</span>
      </header>

      <div class="lab-runs__detail-body">
        <!-- Predicted vs actual table -->
        <section class="lab-runs__pva">
          <h3 class="lab-runs__section-title">{{ $t('labRuns.detail.predictedVsActual') }}</h3>
          <div class="lab-runs__pva-head">
            <span>{{ $t('labRuns.detail.metric') }}</span>
            <span>{{ $t('labRuns.detail.predicted') }}</span>
            <span>{{ $t('labRuns.detail.actual') }}</span>
            <span>{{ $t('labRuns.detail.delta') }}</span>
          </div>
          <div v-for="row in metricRows" :key="row.key" class="lab-runs__pva-row">
            <span class="lab-runs__pva-metric">{{ row.label }}</span>
            <span class="lab-runs__pva-predicted">{{ row.predicted !== null ? `${row.predicted}${row.unit}` : '—' }}</span>
            <span class="lab-runs__pva-actual">
              <input
                type="number"
                class="lab-runs__actual-input"
                :value="row.actual ?? ''"
                :placeholder="$t('labRuns.detail.enterActual')"
                @input="onActual(row.key, $event)"
              />
              <span class="lab-runs__actual-unit">{{ row.unit }}</span>
            </span>
            <span class="lab-runs__pva-delta" :data-tone="row.deltaTone">{{ row.deltaDisplay }}</span>
          </div>
        </section>

        <!-- Notes -->
        <section class="lab-runs__notes">
          <h3 class="lab-runs__section-title">{{ $t('labRuns.detail.notes') }}</h3>
          <textarea
            class="lab-runs__notes-input"
            :value="selectedRun.outcomes.notes"
            :placeholder="$t('labRuns.detail.notesPlaceholder')"
            rows="4"
            @input="onNotes"
          ></textarea>
        </section>

        <!-- Actions -->
        <div class="lab-runs__actions">
          <button v-if="selectedRun.status !== 'complete'" class="lab-runs__action lab-runs__action--primary" @click="markComplete">
            {{ $t('labRuns.detail.markComplete') }}
          </button>
          <button v-else class="lab-runs__action" @click="reopen">{{ $t('labRuns.detail.reopen') }}</button>
          <button class="lab-runs__action lab-runs__action--danger" @click="remove">{{ $t('labRuns.detail.deleteRun') }}</button>
        </div>
      </div>
    </template>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'

import { ICON } from '@/constants/icons'
import { getCellLineById, getProductivityFor } from '@/constants/cellLineCatalog'

import { useProductionCampaignStore } from '@/stores/productionCampaignStore'
import { useDownstreamStore } from '@/stores/downstreamStore'
import { useLabRunsStore } from '@/stores/labRunsStore'

import { LAB_RUN_STATUS, type LabRunStatus, type LabRunOutcomes } from '@/types/labRun'

interface MetricRow {
  key:          keyof LabRunOutcomes
  label:        string
  unit:         string
  predicted:    number | null
  actual:       number | null
  deltaDisplay: string
  deltaTone:    'good' | 'warn' | 'neutral'
}

export default defineComponent({
  name: 'LabRunsView',
  data() {
    return { selectedRunId: null as string | null }
  },
  computed: {
    ...mapStores(useProductionCampaignStore, useDownstreamStore, useLabRunsStore),
    ICON() { return ICON },

    activeCampaign() { return this.productionCampaignStore.activeCampaign },
    runs() { return this.labRunsStore.sortedRuns },
    selectedRun() { return this.selectedRunId ? this.labRunsStore.runById(this.selectedRunId) ?? null : null },

    predictedTiter(): number | null {
      const c = this.runCampaign
      if (!c?.selectedCellLineId) return null
      const cl = getCellLineById(c.selectedCellLineId)
      if (!cl) return null
      const prof = getProductivityFor(cl, c.moleculeType)
      if (!prof) return null
      return Number(((prof.titerRange[0] + prof.titerRange[1]) / 2).toFixed(2))
    },

    predictedDownstreamYield(): number | null {
      const c = this.runCampaign
      if (!c) return null
      const pred = this.downstreamStore.prediction(c.id)
      return pred.steps.length > 0 ? Number(pred.cumulativeYieldPct.toFixed(1)) : null
    },

    predictedFinalProduct(): number | null {
      const c = this.runCampaign
      if (!c) return null
      const pred = this.downstreamStore.prediction(c.id)
      return pred.steps.length > 0 ? Number(pred.finalMassG.toFixed(2)) : null
    },

    runCampaign() {
      if (!this.selectedRun) return null
      return this.productionCampaignStore.campaigns.find(c => c.id === this.selectedRun!.campaignId) ?? null
    },

    metricRows(): MetricRow[] {
      const o = this.selectedRun?.outcomes
      if (!o) return []
      return [
        this.buildRow('actualTransfectionEfficiencyPct', this.$t('labRuns.detail.transfectionEfficiency'), '%', null, o.actualTransfectionEfficiencyPct),
        this.buildRow('actualViabilityPct',              this.$t('labRuns.detail.viability'),              '%', null, o.actualViabilityPct),
        this.buildRow('actualTiterGL',                   this.$t('labRuns.detail.titer'),                  ' g/L', this.predictedTiter, o.actualTiterGL),
        this.buildRow('actualDownstreamYieldPct',        this.$t('labRuns.detail.downstreamYield'),        '%', this.predictedDownstreamYield, o.actualDownstreamYieldPct),
        this.buildRow('actualFinalProductG',             this.$t('labRuns.detail.finalProduct'),           ' g', this.predictedFinalProduct, o.actualFinalProductG),
      ]
    },
  },
  methods: {
    statusLabel(s: LabRunStatus): string {
      const map: Record<LabRunStatus, string> = {
        planned:       this.$t('labRuns.status.planned'),
        'in-progress': this.$t('labRuns.status.inProgress'),
        complete:      this.$t('labRuns.status.complete'),
      }
      return map[s]
    },
    campaignName(campaignId: string): string {
      return this.productionCampaignStore.campaigns.find(c => c.id === campaignId)?.name ?? '—'
    },
    dateOf(ts: number): string {
      return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    },
    buildRow(key: keyof LabRunOutcomes, label: string, unit: string, predicted: number | null, actual: number | null): MetricRow {
      let deltaDisplay = '—'
      let deltaTone: MetricRow['deltaTone'] = 'neutral'
      if (predicted !== null && actual !== null && typeof actual === 'number') {
        const delta = actual - predicted
        const pct = predicted !== 0 ? Math.abs(delta / predicted) : 1
        deltaDisplay = `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}`
        deltaTone = pct <= 0.15 ? 'good' : 'warn'
      }
      return { key, label, unit, predicted, actual: typeof actual === 'number' ? actual : null, deltaDisplay, deltaTone }
    },
    createRun() {
      if (!this.activeCampaign) return
      const name = `${this.activeCampaign.name} — run ${this.runs.length + 1}`
      const run = this.labRunsStore.createRun(this.activeCampaign.id, name)
      this.selectedRunId = run.id
    },
    onActual(key: keyof LabRunOutcomes, e: Event) {
      if (!this.selectedRun) return
      const raw = (e.target as HTMLInputElement).value
      const value = raw === '' ? null : parseFloat(raw)
      const patch: Partial<LabRunOutcomes> = { [key]: value }
      // Snapshot the matching prediction so the calibration loop has a (predicted, actual) pair.
      if (key === 'actualTiterGL' && this.predictedTiter !== null) {
        patch.predictedTiterGL = this.predictedTiter
      }
      if (key === 'actualDownstreamYieldPct' && this.predictedDownstreamYield !== null) {
        patch.predictedDownstreamYieldPct = this.predictedDownstreamYield
      }
      this.labRunsStore.updateOutcomes(this.selectedRun.id, patch)
    },
    onNotes(e: Event) {
      if (!this.selectedRun) return
      this.labRunsStore.updateOutcomes(this.selectedRun.id, { notes: (e.target as HTMLTextAreaElement).value })
    },
    markComplete() {
      if (this.selectedRun) this.labRunsStore.setStatus(this.selectedRun.id, LAB_RUN_STATUS.COMPLETE)
    },
    reopen() {
      if (this.selectedRun) this.labRunsStore.setStatus(this.selectedRun.id, LAB_RUN_STATUS.IN_PROGRESS)
    },
    remove() {
      if (!this.selectedRun) return
      this.labRunsStore.deleteRun(this.selectedRun.id)
      this.selectedRunId = null
    },
  },
})
</script>

<style lang="scss" scoped>
.lab-runs {
  padding: 2rem 2.5rem;
  max-width: 1100px;
  margin: 0 auto;

  @media (max-width: 768px) { padding: 1.25rem 1rem; }

  &__header { @include flex-between(1rem); align-items: flex-end; margin-bottom: 1.5rem; }
  &__title { margin: 0 0 0.35rem; font-size: 1.6rem; font-weight: 600; color: var(--color-text-heading); }
  &__subtitle { margin: 0; font-size: var(--fs-lg); opacity: var(--op-partial); max-width: 46rem; line-height: 1.5; }

  &__new-btn {
    @include mono-upper(var(--fs-sm));
    background: var(--color-primary); color: var(--color-bg); border: none;
    padding: 0.7rem 1.2rem; border-radius: var(--radius); cursor: pointer; flex-shrink: 0;
    transition: background var(--tr-fast);
    &:hover:not(:disabled) { background: color-mix(in srgb, var(--color-primary) 90%, white); }
    &:disabled { opacity: var(--op-ghost); cursor: not-allowed; }
  }

  &__need-campaign { margin: 0 0 1rem; font-size: var(--fs-sm); color: var(--color-amber); }

  &__empty {
    @include flex-col(0.75rem); align-items: center; text-align: center; padding: 4rem 1.5rem;
    background: var(--color-surface); border: 1px dashed var(--color-border); border-radius: var(--radius-lg);
  }
  &__empty-icon { font-size: 2.5rem; opacity: var(--op-muted); }
  &__empty-title { margin: 0; font-size: 1.3rem; font-weight: 600; color: var(--color-text-heading); }
  &__empty-text { margin: 0; opacity: var(--op-partial); max-width: 30rem; line-height: 1.5; }

  &__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 1rem; }

  &__card {
    @include flex-col(0.6rem); padding: 1.1rem;
    background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg);
    cursor: pointer; transition: transform var(--tr-fast), border-color var(--tr-fast);
    &:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--color-primary) 35%, var(--color-border)); }
  }
  &__card-header { @include flex-between(0.5rem); align-items: baseline; }
  &__card-name { margin: 0; font-size: 1.05rem; font-weight: 600; color: var(--color-text-heading); }
  &__card-campaign { font-size: var(--fs-sm); opacity: var(--op-partial); }
  &__card-footer { @include flex-between(0.5rem); margin-top: auto; padding-top: 0.5rem; border-top: 1px solid color-mix(in srgb, var(--color-text) 6%, transparent); }
  &__card-date { @include mono-upper(var(--fs-xxs)); opacity: var(--op-muted); }
  &__card-view { @include mono-upper(var(--fs-xs)); background: transparent; border: none; color: var(--color-primary); cursor: pointer; }

  &__status {
    @include mono-upper(var(--fs-xxs)); padding: 0.15rem 0.5rem; border-radius: 999px;
    &[data-status="planned"]     { background: color-mix(in srgb, var(--color-text) 10%, transparent); color: var(--color-text-muted); }
    &[data-status="in-progress"] { background: color-mix(in srgb, var(--color-primary) 15%, transparent); color: var(--color-primary); }
    &[data-status="complete"]    { background: color-mix(in srgb, var(--color-ok) 18%, transparent); color: var(--color-ok); }
  }

  &__back {
    @include mono-upper(var(--fs-xs)); background: transparent; border: none; color: var(--color-primary);
    cursor: pointer; margin-bottom: 1rem; padding: 0.25rem 0;
  }
  &__detail-header { @include flex-between(1rem); align-items: center; margin-bottom: 1.5rem; }
  &__detail-body { @include flex-col(1.5rem); }

  &__section-title { margin: 0 0 0.75rem; font-size: 1rem; font-weight: 600; color: var(--color-text-heading); }

  &__pva { padding: 1.25rem; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); }
  &__pva-head, &__pva-row {
    display: grid; grid-template-columns: 1.5fr 1fr 1.5fr 0.8fr; gap: 0.75rem; align-items: center;
  }
  &__pva-head {
    @include mono-upper(var(--fs-xxs)); opacity: var(--op-muted);
    padding-bottom: 0.5rem; border-bottom: 1px solid var(--color-border); margin-bottom: 0.5rem;
  }
  &__pva-row { padding: 0.5rem 0; border-bottom: 1px solid color-mix(in srgb, var(--color-text) 5%, transparent); }
  &__pva-metric { font-size: var(--fs-sm); color: var(--color-text); }
  &__pva-predicted { font-family: var(--font-mono); font-size: var(--fs-sm); color: var(--color-primary); }
  &__pva-actual { @include flex-row(0.3rem); align-items: baseline; }
  &__actual-input {
    width: 5rem; padding: 0.35rem 0.5rem; background: var(--color-surface-2);
    border: 1px solid var(--color-border); border-radius: var(--radius); color: var(--color-text);
    font-family: var(--font-mono); font-size: var(--fs-sm);
    &:focus { outline: none; border-color: var(--color-primary); }
  }
  &__actual-unit { @include mono-upper(var(--fs-xxs)); opacity: var(--op-muted); }
  &__pva-delta {
    font-family: var(--font-mono); font-size: var(--fs-sm); font-weight: 700;
    &[data-tone="good"] { color: var(--color-ok); }
    &[data-tone="warn"] { color: var(--color-amber); }
    &[data-tone="neutral"] { opacity: var(--op-muted); }
  }

  &__notes { padding: 1.25rem; background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg); }
  &__notes-input {
    width: 100%; padding: 0.7rem 0.9rem; background: var(--color-surface-2);
    border: 1px solid var(--color-border); border-radius: var(--radius); color: var(--color-text);
    font-family: inherit; font-size: var(--fs-md); resize: vertical;
    &:focus { outline: none; border-color: var(--color-primary); }
  }

  &__actions { @include flex-row(0.75rem); }
  &__action {
    @include mono-upper(var(--fs-sm)); padding: 0.6rem 1.1rem; border-radius: var(--radius);
    background: transparent; border: 1px solid var(--color-border); color: var(--color-text); cursor: pointer;
    transition: border-color var(--tr-fast), background var(--tr-fast);
    &:hover { border-color: var(--color-primary); }
    &--primary { background: var(--color-primary); color: var(--color-bg); border-color: var(--color-primary); }
    &--danger:hover { border-color: var(--color-danger); color: var(--color-danger); }
  }
}
</style>
