<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="reports">
    <div class="reports__inner">

      <!-- Page header -->
      <PageHeader :eyebrow="$t('reports.eyebrow')" :title="$t('reports.title')">
        <p class="reports__subtitle">{{ $t('reports.subtitle') }}</p>
      </PageHeader>

      <!-- Import summary banner (dismissable) -->
      <div v-if="importSummary" class="reports__import-banner" :class="importBannerVariantClass">
        <div class="reports__import-banner-body">
          <span class="reports__import-banner-title">{{ $t('reports.importSummaryHeading') }}</span>
          <span v-if="importSummary.matched > 0" class="reports__import-banner-line">
            {{ $t('reports.importSummaryMatched', { n: importSummary.matched }) }}
          </span>
          <span v-if="importSummary.ignored > 0" class="reports__import-banner-line">
            {{ $t('reports.importSummaryIgnored', { n: importSummary.ignored }) }}
          </span>
          <span v-if="isImportSummaryEmpty" class="reports__import-banner-line">
            {{ $t('reports.importSummaryNoneApplied') }}
          </span>
        </div>
        <button class="reports__import-banner-dismiss" @click="dismissImportSummary()">
          {{ $t('reports.importSummaryDismiss') }}
        </button>
      </div>

      <div v-if="importError" class="reports__import-banner reports__import-banner--error">
        <div class="reports__import-banner-body">
          <span class="reports__import-banner-title">{{ importError }}</span>
        </div>
        <button class="reports__import-banner-dismiss" @click="importError = null">
          {{ $t('reports.importSummaryDismiss') }}
        </button>
      </div>

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
          <div class="reports__log-card-hdr-title">
            <span class="reports__log-title">{{ $t('reports.logTitle') }}</span>
            <span class="reports__log-count">
              {{ totalReadings }} {{ countLabel }}
            </span>
          </div>
          <div id="hl-reports-export" class="reports__log-card-actions" :aria-label="$t('reports.toolbarLabel')">
            <div class="reports__log-card-action">
              <button
                class="reports__btn reports__btn--export"
                :disabled="totalReadings === 0 || isExporting"
                @click="handleExportCSV()"
              >
                <span v-if="isExporting" class="reports__btn-spinner"></span>
                <template v-else>{{ $t('reports.exportCsv') }}</template>
              </button>
            </div>
            <div class="reports__log-card-action">
              <button
                class="reports__btn reports__btn--import"
                :disabled="totalReadings === 0 || isImporting"
                v-tip="$t('reports.importCsvTitle')"
                @click="triggerImportPicker()"
              >
                <span v-if="isImporting" class="reports__btn-spinner"></span>
                <template v-else>{{ $t('reports.importCsv') }}</template>
              </button>
              <span class="reports__btn-caption">{{ $t('reports.importCsvCaption') }}</span>
              <input
                ref="importFileInput"
                type="file"
                accept=".csv,text/csv"
                class="reports__file-input"
                @change="onImportFileChosen($event)"
              />
            </div>
            <div class="reports__log-card-action">
              <button
                class="reports__btn reports__btn--clear"
                :disabled="totalReadings === 0"
                @click="store.clearLog()"
              >
                {{ $t('reports.clearLog') }}
              </button>
            </div>
          </div>
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
          :recently-imported-ids="recentlyImportedIds"
          @select="selectEntry"
          @delete="deleteEntry"
        />

        <ReportsLogLegend v-if="totalReadings > 0" />
      </div>

    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { broadcastLogMeasuredOutcome } from '@/services/socket'

import type { LogEntry } from '@/stores/experimentStore'
import { useExperimentStore } from '@/stores/experimentStore'
import { useTokenStore } from '@/stores/tokenStore'

import StatCard from '@/components/StatCard/index.vue'
import PageHeader from '@/components/PageHeader/index.vue'

import { formatFreqKHz, formatFieldVcm, formatRange } from '@/utils/format'
import { parseMeasuredCsv } from '@/utils/experimentImport'

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

    // Calibration summary is computed in the store — reuse it so the stats row
    // and the AI-tab badge always agree on n, mean residual, and tier.
    const calibration = computed(() => store.calibrationSummary)

    function formatSignedPct(delta: number | null): string {
      if (delta === null) return NULL_DISPLAY
      const sign = delta >= 0 ? '+' : ''
      return `${sign}${delta.toFixed(1)}%`
    }
    function formatSignedVcm(delta: number | null): string {
      if (delta === null) return NULL_DISPLAY
      const sign = delta >= 0 ? '+' : ''
      return `${sign}${delta.toFixed(0)} V/cm`
    }

    const statCards = computed(() => {
      const baseCards = [
        { label: t('reports.totalReadings'),   value: String(totalReadings.value),        variant: totalReadings.value === 0 ? 'muted' : 'default', tooltip: t('reports.totalReadingsTitle') },
        { label: t('reports.lysisEvents'),     value: String(lysisEvents.value),          variant: 'danger',  tooltip: t('reports.lysisEventsTitle') },
        { label: t('reports.manualReadings'),  value: String(manualReadings.value),       variant: undefined, tooltip: t('reports.manualReadingsTitle') },
        { label: t('reports.avgSelectivity'),  value: avgSelectivity.value  ?? NULL_DISPLAY, variant: 'primary', tooltip: t('reports.avgSelectivityTitle') },
        { label: t('reports.peakSelectivity'), value: peakSelectivity.value ?? NULL_DISPLAY, variant: 'ok',      tooltip: t('reports.peakSelectivityTitle') },
        { label: t('reports.peakTargetRatio'), value: peakTargetRatio.value ?? NULL_DISPLAY, variant: 'danger',  tooltip: t('reports.peakTargetRatioTitle') },
        { label: t('reports.freqRange'),       value: freqRange.value  ?? NULL_DISPLAY,   variant: undefined, tooltip: t('reports.freqRangeTitle'),  wide: true },
        { label: t('reports.fieldRange'),      value: fieldRange.value ?? NULL_DISPLAY,   variant: undefined, tooltip: t('reports.fieldRangeTitle'), wide: true },
      ]
      const c = calibration.value
      if (c.sampleCount === 0) return baseCards
      return [
        ...baseCards,
        { label: t('reports.measuredRows'),     value: String(c.sampleCount),                          variant: 'primary', tooltip: t('reports.measuredRowsTitle') },
        { label: t('reports.meanTargetDelta'),  value: formatSignedPct(c.meanTargetResidualPct),       variant: undefined, tooltip: t('reports.meanTargetDeltaTitle') },
        { label: t('reports.meanHealthyDelta'), value: formatSignedPct(c.meanHealthyResidualPct),      variant: undefined, tooltip: t('reports.meanHealthyDeltaTitle') },
        { label: t('reports.meanFieldDelta'),   value: formatSignedVcm(c.meanFieldResidualVcm),        variant: undefined, tooltip: t('reports.meanFieldDeltaTitle') },
      ]
    })

    function selClass(sel: number): string {
      if (sel >= THRESHOLDS.SEL_STRONG)   return 'reports__green-val'
      if (sel >= THRESHOLDS.SEL_MARGINAL) return 'reports__warn-val'
      return 'reports__cancer-val'
    }

    const isExporting = ref(false)
    const isImporting = ref(false)
    const importSummary = ref<{ matched: number; ignored: number } | null>(null)
    const importError   = ref<string | null>(null)
    const recentlyImportedIds = ref<number[]>([])

    return {
      store,
      tokenStore,
      selectedEntry,
      isExporting,
      isImporting,
      importSummary,
      importError,
      recentlyImportedIds,
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

  data() {
    return {
      flashTimer: null as ReturnType<typeof setTimeout> | null,
    }
  },

  beforeUnmount() {
    if (this.flashTimer !== null) clearTimeout(this.flashTimer)
  },

  computed: {
    importBannerVariantClass(): Record<string, boolean> {
      const s = this.importSummary
      if (!s) return {}
      return {
        'reports__import-banner--ok':   s.matched > 0,
        'reports__import-banner--warn': s.matched === 0,
      }
    },
    isImportSummaryEmpty(): boolean {
      const s = this.importSummary
      return s !== null && s.matched === 0 && s.ignored === 0
    },
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
      this.isExporting = true
      const canProceed = await this.tokenStore.consumeOperation('EXPERIMENT_REPORT')
      if (!canProceed) {
        this.isExporting = false
        return
      }
      this.store.exportCSV()
      this.isExporting = false
    },

    triggerImportPicker() {
      this.importError   = null
      this.importSummary = null
      const input = this.$refs.importFileInput as HTMLInputElement | undefined
      if (input) input.click()
    },

    async onImportFileChosen(evt: Event) {
      const input = evt.target as HTMLInputElement
      const file  = input.files?.[0]
      input.value = ''   // allow re-selecting the same file later
      if (!file) return

      this.isImporting = true
      const canProceed = await this.tokenStore.consumeOperation('IMPORT_MEASURED')
      if (!canProceed) {
        this.isImporting = false
        return
      }

      try {
        const text   = await file.text()
        const report = parseMeasuredCsv(text)
        const knownIds = new Set(this.store.entries.map((e) => e.id))
        const matchedIds: number[] = []
        let ignored = report.ignoredRows.length
        for (const row of report.matchable) {
          if (!knownIds.has(row.id)) { ignored++; continue }
          const entry = this.store.logMeasuredOutcome(row.id, row.measured)
          if (entry?.measured && this.store.aiConsentGiven && entry.sessionName) {
            broadcastLogMeasuredOutcome(entry.sessionName, entry.timestamp, entry.measured)
          }
          matchedIds.push(row.id)
        }
        this.importSummary = { matched: matchedIds.length, ignored }
        this.flashRecentlyImported(matchedIds)
      } catch {
        this.importError = this.$t('reports.importError')
      } finally {
        this.isImporting = false
      }
    },

    flashRecentlyImported(ids: number[]) {
      if (this.flashTimer !== null) clearTimeout(this.flashTimer)
      this.recentlyImportedIds = ids
      this.flashTimer = setTimeout(() => {
        this.recentlyImportedIds = []
        this.flashTimer = null
      }, 1900)
    },

    dismissImportSummary() {
      this.importSummary = null
    },

    deleteEntry(entryId: number) {
      if (this.selectedEntry?.id === entryId) this.selectedEntry = null
      this.store.deleteEntry(entryId)
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

  &__subtitle {
    font-size: var(--fs-lg);
    color: var(--color-text-muted);
    margin: 0;
    font-family: var(--font-mono);
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

    &-spinner {
      display: inline-block;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      border: 2px solid currentColor;
      border-top-color: transparent;
      animation: onboard-spin 0.6s linear infinite;
    }

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

    &--import {
      color: var(--color-amber);
      border-color: color-mix(in srgb, var(--color-amber) 35%, transparent);
      background: color-mix(in srgb, var(--color-amber) 8%, transparent);

      &:hover:not(:disabled) {
        background: color-mix(in srgb, var(--color-amber) 16%, transparent);
        border-color: var(--color-amber);
      }
    }
  }

  &__file-input {
    display: none;
  }

  /* ── Import summary banner ────────────────────────────────────────────────── */
  &__import-banner {
    @include flex-between(1rem);
    padding: 0.85rem 1.1rem;
    border-radius: var(--radius);
    border: 1px solid var(--color-border);
    background: var(--color-surface);
    font-family: var(--font-mono);
    font-size: var(--fs-md);
    color: var(--color-text);

    &--ok    { @include tinted-surface(primary); }
    &--warn  { @include tinted-surface(amber); }
    &--error { @include tinted-surface(danger); }
  }

  &__import-banner-body {
    @include flex-col(0.2rem);
    flex: 1;
    min-width: 0;
  }

  &__import-banner-title {
    @include mono-upper(var(--fs-xs), 0.08em);
    color: var(--color-text-heading);
  }

  &__import-banner-line {
    font-size: var(--fs-md);
    color: var(--color-text);
  }

  &__import-banner-dismiss {
    @include mono-upper(var(--fs-xxs), 0.06em);
    padding: 0.3rem 0.75rem;
    border-radius: var(--radius);
    border: 1px solid var(--color-border);
    background: transparent;
    color: var(--color-text-muted);
    cursor: pointer;
    transition: color var(--tr-fast), border-color var(--tr-fast);

    &:hover { color: var(--color-text); border-color: var(--color-text-muted); }
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
    &__inner           { padding: 1rem 0.85rem 3rem; }
    &__session-summary { flex-wrap: wrap; }
  }

  /* ── Log card ─────────────────────────────────────────────────────────────── */
  &__log-card {
    @include surface-card(var(--radius-lg));
    overflow: hidden;
  }

  &__log-card-hdr {
    @include flex-between(1rem);
    align-items: flex-start;
    padding: 1rem 1.5rem;
    border-bottom: 1px solid var(--color-border);
    flex-wrap: wrap;

    @media (max-width: 700px) {
      flex-direction: column;
      align-items: stretch;
    }
  }

  &__log-card-hdr-title {
    @include flex-row(0.75rem);
    flex-wrap: wrap;
  }

  &__log-card-actions {
    @include flex-row(0.75rem);
    align-items: flex-start;
    flex-shrink: 0;
    flex-wrap: wrap;
  }

  &__log-card-action {
    @include flex-col(0.3rem);
    align-items: stretch;
  }

  &__btn-caption {
    @include mono-upper(var(--fs-xxs), 0.06em);
    color: var(--color-text-muted);
    opacity: var(--op-dim);
    text-align: center;
    line-height: 1.3;
    width: 0;             // do not let caption drive column width
    min-width: 100%;      // but render at full button width and wrap
    white-space: normal;
    overflow-wrap: break-word;
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
