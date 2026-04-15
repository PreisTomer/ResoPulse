<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="reports">
    <div class="reports__inner">

      <!-- Page header -->
      <PageHeader :eyebrow="$t('reports.eyebrow')" :title="$t('reports.title')">
        <div id="hl-reports-export" class="reports__header-row">
          <p class="reports__subtitle">{{ $t('reports.subtitle') }}</p>
          <div class="reports__header-actions">
            <button
              class="reports__btn reports__btn--export"
              :disabled="totalReadings === 0"
              @click="handleExportCSV()"
            >
              {{ $t('reports.exportCsv') }}
            </button>
            <button
              class="reports__btn reports__btn--clear"
              :disabled="totalReadings === 0"
              @click="store.clearLog()"
            >
              {{ $t('reports.clearLog') }}
            </button>
          </div>
        </div>
      </PageHeader>

      <!-- Session summary (read-only) -->
      <div class="reports__session-summary">
        <span class="reports__session-meta">
          {{ totalReadings }} {{ countLabel }}
          <template v-if="distinctSessionCount > 1">
            · {{ $t('reports.sessionMultiple', { n: distinctSessionCount }) }}
          </template>
        </span>
        <span v-if="sampleDescription" class="reports__session-sample">
          {{ $t('reports.sampleDescLabel') }} {{ sampleDescription }}
        </span>
        <span v-if="sessionNotes" class="reports__session-notes">
          {{ $t('reports.sessionNotesLabel') }} {{ sessionNotes }}
        </span>
      </div>

      <!-- Stats row -->
      <div class="reports__stats-grid">
        <StatCard
          v-for="card in statCards"
          :key="card.label"
          :class="{ 'reports__stat-card--wide': card.wide }"
          :label="card.label"
          :value="card.value"
          :variant="card.variant"
          :tooltip="card.tooltip"
        />
      </div>

      <!-- Log card -->
      <div class="reports__log-card">
        <div class="reports__log-card-hdr">
          <span class="reports__log-title">{{ $t('reports.logTitle') }}</span>
          <span class="reports__log-count">
            {{ totalReadings }} {{ countLabel }}
          </span>
        </div>

        <ReportsLogEmpty v-if="totalReadings === 0" />

        <ReportsMethodsBar
          v-if="totalReadings > 0"
          :entry="selectedEntry"
          @download="downloadSelectedMethods"
          @dismiss="dismissSelection"
        />

        <ReportsLogTable
          v-if="totalReadings > 0"
          :entries="reversedEntries"
          :selected-entry="selectedEntry"
          @select="selectEntry"
        />

        <ReportsLogLegend v-if="totalReadings > 0" />
      </div>

    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import type { LogEntry } from '@/stores/experimentStore'
import { useExperimentStore } from '@/stores/experimentStore'
import { useTokenStore } from '@/stores/tokenStore'

import StatCard from '@/components/StatCard.vue'
import PageHeader from '@/components/PageHeader.vue'

import { formatFreqKHz, formatFieldVcm, formatRange } from '@/utils/format'

import { LOG_EVENT, NULL_DISPLAY } from '@/constants/strings'
import { THRESHOLDS } from '@/constants/physics'

import ReportsLogEmpty from './ReportsLogEmpty.vue'
import ReportsMethodsBar from './ReportsMethodsBar.vue'
import ReportsLogTable from './ReportsLogTable.vue'
import ReportsLogLegend from './ReportsLogLegend.vue'

export default defineComponent({
  name: 'ReportsView',

  components: { StatCard, PageHeader, ReportsLogEmpty, ReportsMethodsBar, ReportsLogTable, ReportsLogLegend },

  setup() {
    const store      = useExperimentStore()
    const tokenStore = useTokenStore()
    const { t } = useI18n()
    const selectedEntry = ref<LogEntry | null>(null)

    // ── Helper: returns fn() result or null when there are no entries ──────────
    function withEntries<T>(fn: () => T): T | null {
      return store.entries.length ? fn() : null
    }

    const totalReadings        = computed(() => store.entries.length)
    const reversedEntries      = computed(() => [...store.entries].reverse())
    const distinctSessionCount = computed(() => new Set(store.entries.map((e) => e.sessionName ?? store.sessionName)).size)
    const lysisEvents          = computed(() => store.entries.filter((e) => e.event === LOG_EVENT.LYSIS).length)
    const manualReadings       = computed(() => store.entries.filter((e) => e.event === LOG_EVENT.MANUAL).length)
    const countLabel           = computed(() => totalReadings.value === 1 ? t('reports.countSingular') : t('reports.countPlural'))

    const avgSelectivity  = computed(() => withEntries(() => {
      const sum = store.entries.reduce((acc, e) => acc + e.selectivity, 0)
      return (sum / store.entries.length).toFixed(3)
    }))
    const peakSelectivity = computed(() => withEntries(() =>
      Math.max(...store.entries.map((e) => e.selectivity)).toFixed(3)
    ))
    const freqRange       = computed(() => withEntries(() =>
      formatRange(store.entries.map((e) => e.freqKHz), formatFreqKHz)
    ))
    const fieldRange      = computed(() => withEntries(() =>
      formatRange(store.entries.map((e) => e.fieldVcm), formatFieldVcm)
    ))
    const peakTargetRatio = computed(() => withEntries(() =>
      (Math.max(...store.entries.map((e) => e.targetRatio)) * 100).toFixed(1) + '%'
    ))

    const statCards = computed(() => [
      { label: t('reports.totalReadings'),   value: String(totalReadings.value),        variant: totalReadings.value === 0 ? 'muted' : 'default', tooltip: t('reports.totalReadingsTitle') },
      { label: t('reports.lysisEvents'),     value: String(lysisEvents.value),          variant: 'danger',  tooltip: t('reports.lysisEventsTitle') },
      { label: t('reports.manualReadings'),  value: String(manualReadings.value),       variant: undefined, tooltip: t('reports.manualReadingsTitle') },
      { label: t('reports.avgSelectivity'),  value: avgSelectivity.value  ?? NULL_DISPLAY, variant: 'primary', tooltip: t('reports.avgSelectivityTitle') },
      { label: t('reports.peakSelectivity'), value: peakSelectivity.value ?? NULL_DISPLAY, variant: 'ok',      tooltip: t('reports.peakSelectivityTitle') },
      { label: t('reports.peakTargetRatio'), value: peakTargetRatio.value ?? NULL_DISPLAY, variant: 'danger',  tooltip: t('reports.peakTargetRatioTitle') },
      { label: t('reports.freqRange'),       value: freqRange.value  ?? NULL_DISPLAY,   variant: undefined, tooltip: t('reports.freqRangeTitle'),  wide: true },
      { label: t('reports.fieldRange'),      value: fieldRange.value ?? NULL_DISPLAY,   variant: undefined, tooltip: t('reports.fieldRangeTitle'), wide: true },
    ])

    function selClass(sel: number): string {
      if (sel >= THRESHOLDS.SEL_STRONG)   return 'reports__green-val'
      if (sel >= THRESHOLDS.SEL_MARGINAL) return 'reports__warn-val'
      return 'reports__cancer-val'
    }

    return {
      store,
      tokenStore,
      selectedEntry,
      totalReadings,
      reversedEntries,
      distinctSessionCount,
      lysisEvents,
      manualReadings,
      countLabel,
      sampleDescription: computed(() => store.sampleDescription),
      sessionNotes: computed(() => store.sessionNotes),
      statCards,
      selClass,
    }
  },

  methods: {
    selectEntry(e: LogEntry) {
      this.selectedEntry = this.selectedEntry?.id === e.id ? null : e
    },
    dismissSelection() {
      this.selectedEntry = null
    },
    downloadSelectedMethods() {
      if (this.selectedEntry) this.store.exportEntryMethods(this.selectedEntry)
    },
    async handleExportCSV() {
      const canProceed = await this.tokenStore.consumeOperation('EXPERIMENT_REPORT')
      if (!canProceed) return
      this.store.exportCSV()
    },
  },
})
</script>

<style lang="scss" scoped>

/* ── Page shell ───────────────────────────────────────────────────────────── */
.reports {
  flex: 1;
  overflow-y: auto;
  background-color: var(--color-bg);

  &__inner {
    max-width: 1600px;
    margin: 0 auto;
    padding: 2rem 2rem 4rem;
    @include flex-col(1.5rem);
  }

  &__header-row {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  &__subtitle {
    font-size: var(--fs-lg);
    color: var(--color-text-muted);
    margin: 0;
    font-family: var(--font-mono);
  }

  &__header-actions {
    display: flex;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  &__btn {
    padding: 0.5rem 1.1rem;
    border-radius: var(--radius);
    font-size: var(--fs-md);
    font-family: var(--font-mono);
    font-weight: 600;
    border: 1px solid;
    cursor: pointer;
    transition: all var(--tr-fast);
    background: transparent;

    &:disabled { opacity: 0.3; cursor: not-allowed; }

    &--export {
      color: var(--color-primary);
      border-color: color-mix(in srgb, var(--color-primary) 35%, transparent);
      background: var(--color-primary-dim);

      &:hover:not(:disabled) {
        background: color-mix(in srgb, var(--color-primary) 20%, transparent);
        border-color: var(--color-primary);
      }
    }

    &--clear {
      color: var(--color-danger);
      border-color: color-mix(in srgb, var(--color-danger) 35%, transparent);

      &:hover:not(:disabled) {
        background: color-mix(in srgb, var(--color-danger) 10%, transparent);
      }
    }
  }

  /* ── Session summary (read-only) ──────────────────────────────────────────── */
  &__session-summary {
    @include flex-row(0.75rem);
    align-items: baseline;
    flex-wrap: wrap;
  }

  &__session-meta {
    @include mono-upper(0.68rem, 0.06em);
    color: var(--color-primary);
  }

  &__session-sample,
  &__session-notes {
    font-size: var(--fs-xs);
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    opacity: var(--op-dim);
  }

  /* ── Stats ────────────────────────────────────────────────────────────────── */
  &__stats-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 0.75rem;

    @media (max-width: 1100px) { grid-template-columns: repeat(3, 1fr); }
    @media (max-width: 700px)  { grid-template-columns: repeat(2, 1fr); }
  }

  &__stat-card--wide { grid-column: span 1; }

  /* ── Mobile layout ────────────────────────────────────────────────────────── */
  @media (max-width: 700px) {
    &__inner      { padding: 1rem 0.85rem 3rem; }
    &__header-row { flex-direction: column; align-items: flex-start; }
    &__session-summary { flex-wrap: wrap; }
  }

  /* ── Log card ─────────────────────────────────────────────────────────────── */
  &__log-card {
    @include surface-card(var(--radius-lg));
    overflow: hidden;
  }

  &__log-card-hdr {
    @include flex-between();
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--color-border);
  }

  &__log-title {
    font-size: var(--fs-xl);
    font-weight: 600;
    color: var(--color-text-heading);
  }

  &__log-count {
    font-size: var(--fs-xs);
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    background: color-mix(in srgb, white 4%, transparent);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 0.15rem 0.5rem;
  }
}
</style>
