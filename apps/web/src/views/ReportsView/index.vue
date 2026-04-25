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
          <span v-if="hasDuplicateImportIds" class="reports__import-banner-line reports__import-banner-line--warn">
            {{ $t('reports.importSummaryDuplicates', { ids: importSummary.duplicateIds.join(', ') }) }}
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

      <!-- ── Closed-Loop Hero: calibration insights front and centre ────── -->
      <section class="reports__loop-hero">
        <header class="reports__loop-hero-header">
          <span class="reports__loop-hero-eyebrow">{{ $t('reports.loopHeroEyebrow') }}</span>
          <h2 class="reports__loop-hero-title">{{ $t('reports.loopHeroTitle') }}</h2>
          <p class="reports__loop-hero-subtitle">{{ $t('reports.loopHeroSubtitle') }}</p>
        </header>

        <CalibrationBadge class="reports__loop-hero-badge" :clickable="false" />

        <div v-if="showPresetDriftBanner" class="reports__preset-banner" role="alert">
          <span class="reports__preset-banner-icon" aria-hidden="true">{{ ICON.INFO }}</span>
          <div class="reports__preset-banner-body">
            <span class="reports__preset-banner-title">{{ $t('reports.presetDriftTitle') }}</span>
            <p class="reports__preset-banner-text">{{ $t('reports.presetDriftBody', { n: presetDriftCount }) }}</p>
          </div>
          <button
            class="reports__preset-banner-btn"
            v-tip="$t('reports.clearMeasuredTip')"
            @click="confirmClearMeasured"
          >{{ $t('reports.clearMeasured') }}</button>
        </div>

        <div v-if="isDriftTier" class="reports__drift-banner" role="alert">
          <div class="reports__drift-banner-body">
            <span class="reports__drift-banner-title">
              <span class="reports__drift-banner-icon" aria-hidden="true">{{ ICON.WARNING }}</span>
              {{ $t('reports.loopHeroDriftBannerTitle') }}
            </span>
            <p class="reports__drift-banner-text">
              {{ $t('reports.loopHeroDriftBannerBody', { pp: calibrationSummary.worstResidualPct?.toFixed(1) ?? NULL_DISPLAY, n: calibrationSummary.sampleCount }) }}
            </p>
          </div>
          <div class="reports__drift-banner-actions">
            <RouterLink
              :to="ROUTE.EXPERIMENT"
              class="reports__drift-banner-btn reports__drift-banner-btn--primary"
              @click="requestRetrain"
            >
              {{ $t('reports.loopHeroDriftBannerRetrain') }}
            </RouterLink>
            <RouterLink
              :to="ROUTE.EXPERIMENT"
              class="reports__drift-banner-btn reports__drift-banner-btn--secondary"
            >
              {{ $t('reports.loopHeroDriftBannerLab') }} {{ ICON.ARROW_SHORT }}
            </RouterLink>
          </div>
        </div>

        <template v-if="hasMeasuredResiduals">
          <ReportsCalibrationTrend :residuals="calibrationResiduals" />

          <div class="reports__loop-hero-residuals">
            <div class="reports__loop-hero-residuals-hdr">
              <span class="reports__loop-hero-residuals-title">{{ $t('reports.loopHeroResidualsTitle') }}</span>
              <span class="reports__loop-hero-residuals-hint">{{ $t('reports.loopHeroResidualsHint') }}</span>
            </div>
            <div class="reports__loop-hero-residuals-grid">
              <StatCard
                v-for="card in residualCards"
                :key="card.label"
                :label="card.label"
                :value="card.value"
                :sub="card.sub"
                :variant="card.variant"
                :tooltip="card.tooltip"
              />
            </div>
          </div>

          <div class="reports__loop-hero-actions">
            <span class="reports__loop-hero-actions-title">{{ $t('reports.loopHeroActionsTitle') }}</span>
            <div class="reports__loop-hero-actions-row">
              <RouterLink
                :to="ROUTE.EXPERIMENT"
                class="reports__loop-hero-action reports__loop-hero-action--primary"
                v-tip="$t('reports.loopHeroActionLabTip')"
              >
                {{ $t('reports.loopHeroActionLabRun') }} {{ ICON.ARROW_SHORT }}
              </RouterLink>
              <button
                class="reports__loop-hero-action reports__loop-hero-action--secondary"
                :disabled="totalReadings === 0 || isImporting"
                @click="triggerImportPicker()"
              >
                {{ $t('reports.loopHeroActionImport') }}
              </button>
            </div>
          </div>
        </template>

        <div v-else class="reports__loop-hero-empty">
          <h3 class="reports__loop-hero-empty-title">{{ $t('reports.loopHeroEmptyTitle') }}</h3>
          <p class="reports__loop-hero-empty-desc">{{ $t('reports.loopHeroEmptyDesc') }}</p>
          <div class="reports__loop-hero-empty-actions">
            <button
              class="reports__loop-hero-action reports__loop-hero-action--primary"
              :disabled="totalReadings === 0 || isImporting"
              @click="triggerImportPicker()"
            >
              {{ $t('reports.loopHeroCtaImport') }}
            </button>
            <RouterLink :to="ROUTE.EXPERIMENT" class="reports__loop-hero-action reports__loop-hero-action--secondary">
              {{ $t('reports.loopHeroCtaLab') }} {{ ICON.ARROW_SHORT }}
            </RouterLink>
          </div>
          <button
            class="reports__loop-hero-sample"
            v-tip="$t('reports.sampleCsvTip')"
            @click="downloadSampleCsv()"
          >{{ $t('reports.sampleCsvCta') }}</button>
        </div>
      </section>

      <!-- ── Session stats (compact inline pills) ───────────────────────── -->
      <div class="reports__session-stats" :aria-label="$t('reports.sessionStatsLabel')">
        <span class="reports__session-stats-label">{{ $t('reports.sessionStatsLabel') }}</span>
        <div class="reports__session-stats-row">
          <span
            v-for="pill in sessionStatsPills"
            :key="pill.label"
            class="reports__session-stat-pill"
            :class="pill.variant ? `reports__session-stat-pill--${pill.variant}` : undefined"
            v-tip="pill.tooltip"
          >
            <span class="reports__session-stat-pill-label">{{ pill.label }}</span>
            <span class="reports__session-stat-pill-val">{{ pill.value }}</span>
          </span>
        </div>
        <span v-if="sampleDescription" class="reports__session-stats-note">
          {{ $t('reports.sampleDescLabel') }} {{ sampleDescription }}
        </span>
        <span v-if="sessionNotes" class="reports__session-stats-note">
          {{ $t('reports.sessionNotesLabel') }} {{ sessionNotes }}
        </span>
      </div>

      <!-- Log card -->
      <div class="reports__log-card">
        <div class="reports__log-card-hdr">
          <div class="reports__log-card-hdr-title">
            <span class="reports__log-title">{{ $t('reports.logTitle') }}</span>
            <span class="reports__log-count">{{ totalReadings }} {{ countLabel }}</span>
          </div>
          <div id="hl-reports-export" class="reports__log-card-actions" :aria-label="$t('reports.toolbarLabel')">
            <button
              class="reports__btn reports__btn--export"
              :disabled="totalReadings === 0 || isExporting"
              @click="handleExportCSV()"
            >
              <span v-if="isExporting" class="reports__btn-spinner"></span>
              <template v-else>{{ $t('reports.exportCsv') }}</template>
            </button>

            <div class="reports__import-group">
              <button
                class="reports__btn reports__btn--import reports__btn--import-grouped"
                :disabled="totalReadings === 0 || isImporting"
                v-tip="$t('reports.importCsvTitle')"
                @click="triggerImportPicker()"
              >
                <span v-if="isImporting" class="reports__btn-spinner"></span>
                <template v-else>{{ $t('reports.importCsv') }}</template>
              </button>
              <button
                class="reports__btn-mapping"
                :disabled="totalReadings === 0"
                v-tip="$t('reports.mappingBtnTip')"
                @click="csvMappingOpen = true"
              >
                <span class="reports__btn-mapping-icon" aria-hidden="true">{{ ICON.PLUG }}</span>
                {{ csvMappingStore.hasMapping ? $t('reports.mappingBtnEdit') : $t('reports.mappingBtnEmpty') }}
              </button>
              <button
                class="reports__btn-mapping reports__btn-sample"
                v-tip="$t('reports.sampleCsvTip')"
                @click="downloadSampleCsv()"
              >{{ $t('reports.sampleCsvBtn') }}</button>
            </div>

            <button
              class="reports__btn reports__btn--clear-measured"
              :disabled="measuredEntryCount === 0"
              v-tip="$t('reports.clearMeasuredTip')"
              @click="confirmClearMeasured"
            >
              {{ $t('reports.clearMeasured') }}
            </button>
            <button
              class="reports__btn reports__btn--clear"
              :disabled="totalReadings === 0"
              @click="store.clearLog()"
            >
              {{ $t('reports.clearLog') }}
            </button>
            <input
              ref="importFileInput"
              type="file"
              accept=".csv,text/csv"
              class="reports__file-input"
              @change="onImportFileChosen($event)"
            />
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

    <CsvMappingModal :is-open="csvMappingOpen" @close="csvMappingOpen = false" />
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { broadcastLogMeasuredOutcome } from '@/services/socket'

import type { LogEntry } from '@/stores/experimentStore'
import { useCellStore } from '@/stores/cellStore'
import { useExperimentStore } from '@/stores/experimentStore'
import { useTokenStore } from '@/stores/tokenStore'
import { useCsvMappingStore } from '@/stores/csvMappingStore'
import { useUiStore } from '@/stores/uiStore'

import StatCard from '@/components/StatCard/index.vue'
import PageHeader from '@/components/PageHeader/index.vue'
import CalibrationBadge from '@/components/CalibrationBadge/index.vue'

import { formatFreqKHz, formatFieldVcm, formatRange } from '@/utils/format'
import { parseMeasuredCsv } from '@/utils/experimentImport'
import { downloadSampleMeasuredCsv } from '@/utils/sampleMeasuredCsv'

import { LOG_EVENT, NULL_DISPLAY } from '@/constants/strings'
import { ICON } from '@/constants/icons'
import { ROUTE } from '@/constants/routes'
import { THRESHOLDS } from '@/constants/physics'

import ReportsLogEmpty from './ReportsLogEmpty.vue'
import ReportsMethodsBar from './ReportsMethodsBar.vue'
import ReportsLogTable from './ReportsLogTable.vue'
import ReportsLogLegend from './ReportsLogLegend.vue'
import ReportsCalibrationTrend from './ReportsCalibrationTrend.vue'
import CsvMappingModal from './CsvMappingModal.vue'

export default defineComponent({
  name: 'ReportsView',

  components: { StatCard, PageHeader, CalibrationBadge, ReportsLogEmpty, ReportsMethodsBar, ReportsLogTable, ReportsLogLegend, ReportsCalibrationTrend, CsvMappingModal },

  setup() {
    const store      = useExperimentStore()
    const cellStore  = useCellStore()
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

    const sessionStatsPills = computed(() => [
      { label: t('reports.totalReadings'),   value: String(totalReadings.value),                        variant: totalReadings.value === 0 ? 'muted' : undefined, tooltip: t('reports.totalReadingsTitle') },
      { label: t('reports.lysisEvents'),     value: String(lysisEvents.value),                          variant: 'danger',                                        tooltip: t('reports.lysisEventsTitle') },
      { label: t('reports.manualReadings'),  value: String(manualReadings.value),                       variant: undefined,                                       tooltip: t('reports.manualReadingsTitle') },
      { label: t('reports.avgSelectivity'),  value: avgSelectivity.value  ?? NULL_DISPLAY,              variant: 'primary',                                       tooltip: t('reports.avgSelectivityTitle') },
      { label: t('reports.peakSelectivity'), value: peakSelectivity.value ?? NULL_DISPLAY,              variant: 'ok',                                            tooltip: t('reports.peakSelectivityTitle') },
      { label: t('reports.peakTargetRatio'), value: peakTargetRatio.value ?? NULL_DISPLAY,              variant: 'danger',                                        tooltip: t('reports.peakTargetRatioTitle') },
      { label: t('reports.freqRange'),       value: freqRange.value  ?? NULL_DISPLAY,                   variant: undefined,                                       tooltip: t('reports.freqRangeTitle')  },
      { label: t('reports.fieldRange'),      value: fieldRange.value ?? NULL_DISPLAY,                   variant: undefined,                                       tooltip: t('reports.fieldRangeTitle') },
    ])

    function pctDescriptor(delta: number | null): { variant: string; sub: string } {
      if (delta === null) return { variant: 'muted',   sub: '' }
      const a = Math.abs(delta)
      if (a < 5)  return { variant: 'ok',      sub: t('reports.resDescStrong') }
      if (a < 15) return { variant: 'primary', sub: t('reports.resDescModerate') }
      return {
        variant: 'danger',
        sub: delta < 0 ? t('reports.resDescDriftOver') : t('reports.resDescDriftUnder'),
      }
    }

    function vcmDescriptor(delta: number | null): { variant: string; sub: string } {
      if (delta === null) return { variant: 'muted', sub: '' }
      const a = Math.abs(delta)
      if (a < 200)  return { variant: 'ok',      sub: t('reports.resDescFieldStrong') }
      if (a < 1000) return { variant: 'primary', sub: t('reports.resDescField')       }
      return           { variant: 'danger',  sub: t('reports.resDescFieldDrift')  }
    }

    const residualCards = computed(() => {
      const c = calibration.value
      if (c.sampleCount === 0) return []
      const tDesc = pctDescriptor(c.meanTargetResidualPct)
      const hDesc = pctDescriptor(c.meanHealthyResidualPct)
      const fDesc = vcmDescriptor(c.meanFieldResidualVcm)
      return [
        { label: t('reports.measuredRows'),     value: String(c.sampleCount),                            variant: 'primary',      sub: '',         tooltip: t('reports.measuredRowsTitle') },
        { label: t('reports.meanTargetDelta'),  value: formatSignedPct(c.meanTargetResidualPct),         variant: tDesc.variant,  sub: tDesc.sub,  tooltip: t('reports.meanTargetDeltaTitle') },
        { label: t('reports.meanHealthyDelta'), value: formatSignedPct(c.meanHealthyResidualPct),        variant: hDesc.variant,  sub: hDesc.sub,  tooltip: t('reports.meanHealthyDeltaTitle') },
        { label: t('reports.meanFieldDelta'),   value: formatSignedVcm(c.meanFieldResidualVcm),          variant: fDesc.variant,  sub: fDesc.sub,  tooltip: t('reports.meanFieldDeltaTitle') },
      ]
    })

    const isDriftTier = computed(() => calibration.value.tier === 'drift')

    const presetDriftCount = computed(() => {
      const currentTarget = cellStore.target.id
      return store.allMeasuredEntries.filter(e => e.targetPreset && e.targetPreset !== currentTarget).length
    })
    const showPresetDriftBanner = computed(() => presetDriftCount.value > 0)

    function selClass(sel: number): string {
      if (sel >= THRESHOLDS.SEL_STRONG)   return 'reports__green-val'
      if (sel >= THRESHOLDS.SEL_MARGINAL) return 'reports__warn-val'
      return 'reports__cancer-val'
    }

    const isExporting = ref(false)
    const isImporting = ref(false)
    const importSummary = ref<{ matched: number; ignored: number; duplicateIds: number[] } | null>(null)
    const importError   = ref<string | null>(null)
    const recentlyImportedIds = ref<number[]>([])
    const csvMappingStore = useCsvMappingStore()
    const csvMappingOpen  = ref(false)

    return {
      store,
      tokenStore,
      csvMappingStore,
      csvMappingOpen,
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
      sessionStatsPills,
      residualCards,
      selClass,
      calibrationResiduals: computed(() => store.measuredResiduals),
      hasMeasuredResiduals: computed(() => store.measuredResiduals.some(r => r.targetResidualPct !== null)),
      calibrationSummary:   calibration,
      isDriftTier,
      measuredEntryCount:   computed(() => store.allMeasuredEntries.length),
      presetDriftCount,
      showPresetDriftBanner,
      NULL_DISPLAY,
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
    ICON() { return ICON },
    ROUTE() { return ROUTE },
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
    hasDuplicateImportIds(): boolean {
      return (this.importSummary?.duplicateIds.length ?? 0) > 0
    },
  },

  methods: {
    requestRetrain() {
      useUiStore().setAiPanelOpen(true)
    },

    confirmClearMeasured() {
      const n = this.measuredEntryCount
      if (n === 0) return
      const msg = this.$t('reports.clearMeasuredConfirm', { n }) as string
      if (!window.confirm(msg)) return
      this.store.clearAllMeasuredOutcomes()
    },

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
      const canProceed = await this.tokenStore.consumeOperation('EXPERIMENT_REPORT', { allowGuest: true })
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

    downloadSampleCsv() {
      downloadSampleMeasuredCsv()
    },

    async onImportFileChosen(evt: Event) {
      const input = evt.target as HTMLInputElement
      const file  = input.files?.[0]
      input.value = ''   // allow re-selecting the same file later
      if (!file) return

      this.isImporting = true
      const canProceed = await this.tokenStore.consumeOperation('IMPORT_MEASURED', { allowGuest: true })
      if (!canProceed) {
        this.isImporting = false
        return
      }

      try {
        const text   = await file.text()
        const report = parseMeasuredCsv(text, this.csvMappingStore.mapping)
        const knownIds = new Set(this.store.entries.map((e) => e.id))
        const matchedIds: number[] = []
        let ignored = report.ignoredRows.length
        for (const row of report.matchable) {
          if (!knownIds.has(row.id)) { ignored++; continue }
          const entry = this.store.logMeasuredOutcome(row.id, row.measured, 'merge')
          if (entry?.measured && this.store.aiConsentGiven && entry.sessionName) {
            broadcastLogMeasuredOutcome(entry.sessionName, entry.timestamp, entry.measured)
          }
          matchedIds.push(row.id)
        }
        this.importSummary = {
          matched:      matchedIds.length,
          ignored,
          duplicateIds: report.duplicateIds,
        }
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

    &--clear-measured {
      color: var(--color-text-muted);
      border-color: var(--color-border);

      &:hover:not(:disabled) {
        color: var(--color-text);
        border-color: color-mix(in srgb, var(--color-amber) 45%, transparent);
        background: color-mix(in srgb, var(--color-amber) 8%, transparent);
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

  /* ── Closed-Loop Hero ─────────────────────────────────────────────────────── */
  &__loop-hero {
    @include flex-col(1.1rem);
    padding: 1.4rem 1.6rem 1.6rem;
    border: 1px solid color-mix(in srgb, var(--color-primary) 30%, transparent);
    border-radius: var(--radius-lg);
    background:
      linear-gradient(180deg,
        color-mix(in srgb, var(--color-primary) 10%, transparent),
        color-mix(in srgb, var(--color-primary) 2%, transparent)
      );
    position: relative;
    overflow: hidden;
  }

  &__loop-hero-header {
    @include flex-col(0.35rem);
    max-width: 860px;
  }

  &__loop-hero-eyebrow {
    @include mono-upper(var(--fs-xxs), 0.14em);
    color: var(--color-primary);
    align-self: flex-start;
    padding: 0.2rem 0.7rem;
    border: 1px solid color-mix(in srgb, var(--color-primary) 45%, transparent);
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  }

  &__loop-hero-title {
    margin: 0;
    font-size: clamp(1.4rem, 2.4vw, 1.8rem);
    font-weight: 600;
    color: var(--color-text);
    line-height: 1.25;
  }

  &__loop-hero-subtitle {
    margin: 0;
    font-size: var(--fs-md);
    color: var(--color-text-muted);
    line-height: 1.55;
  }

  &__loop-hero-badge {
    max-width: 560px;
  }

  /* ── Preset-drift (informational) banner ─────────────────────────────────── */
  &__preset-banner {
    @include flex-row(0.75rem);
    align-items: center;
    padding: 0.7rem 1rem;
    border: 1px solid color-mix(in srgb, var(--color-amber) 40%, transparent);
    border-radius: var(--radius);
    background: color-mix(in srgb, var(--color-amber)  8%, transparent);
    flex-wrap: wrap;
  }

  &__preset-banner-icon {
    font-size: var(--fs-lg);
    color: var(--color-amber);
    flex-shrink: 0;
  }

  &__preset-banner-body {
    @include flex-col(0.2rem);
    flex: 1 1 auto;
    min-width: 0;
  }

  &__preset-banner-title {
    @include mono-upper(var(--fs-xs), 0.08em);
    color: var(--color-amber);
    font-weight: 700;
  }

  &__preset-banner-text {
    margin: 0;
    font-size: var(--fs-xs);
    color: var(--color-text);
    line-height: 1.5;
  }

  &__preset-banner-btn {
    @include mono-upper(var(--fs-xxs), 0.06em);
    padding: 0.45rem 0.85rem;
    border-radius: var(--radius);
    border: 1px solid color-mix(in srgb, var(--color-amber) 55%, transparent);
    background: color-mix(in srgb, var(--color-amber) 20%, transparent);
    color: var(--color-amber);
    cursor: pointer;
    transition: background var(--tr-fast);
    flex-shrink: 0;

    &:hover { background: color-mix(in srgb, var(--color-amber) 34%, transparent); }
  }

  /* ── Drift alert banner ───────────────────────────────────────────────────── */
  &__drift-banner {
    @include flex-col(0.7rem);
    padding: 0.85rem 1.05rem;
    border-radius: var(--radius);
    border: 1px solid color-mix(in srgb, var(--color-danger) 45%, transparent);
    background: color-mix(in srgb, var(--color-danger) 10%, transparent);

    @media (min-width: 900px) {
      @include flex-row(1rem);
      align-items: center;
    }
  }

  &__drift-banner-body {
    @include flex-col(0.25rem);
    flex: 1 1 auto;
    min-width: 0;
  }

  &__drift-banner-title {
    @include flex-row(0.45rem);
    @include mono-upper(var(--fs-xs), 0.08em);
    color: var(--color-danger);
    font-weight: 700;
  }

  &__drift-banner-icon {
    font-size: var(--fs-md);
  }

  &__drift-banner-text {
    margin: 0;
    font-size: var(--fs-sm);
    color: var(--color-text);
    line-height: 1.5;
  }

  &__drift-banner-actions {
    @include flex-row(0.6rem);
    flex-wrap: wrap;
    flex-shrink: 0;
  }

  &__drift-banner-btn {
    @include mono-upper(var(--fs-xs), 0.06em);
    padding: 0.5rem 0.95rem;
    border-radius: var(--radius);
    border: 1px solid;
    text-decoration: none;
    cursor: pointer;
    transition: background var(--tr-fast), border-color var(--tr-fast);

    &--primary {
      color: var(--color-danger);
      border-color: color-mix(in srgb, var(--color-danger) 60%, transparent);
      background: color-mix(in srgb, var(--color-danger) 22%, transparent);

      &:hover { background: color-mix(in srgb, var(--color-danger) 34%, transparent); }
    }

    &--secondary {
      color: var(--color-text);
      border-color: var(--color-border);
      background: transparent;

      &:hover { border-color: var(--color-text-muted); background: color-mix(in srgb, white 4%, transparent); }
    }
  }

  &__loop-hero-residuals {
    @include flex-col(0.6rem);
  }

  &__loop-hero-residuals-hdr {
    @include flex-col(0.2rem);
  }

  &__loop-hero-residuals-title {
    @include mono-upper(var(--fs-xs), 0.1em);
    color: var(--color-primary);
  }

  &__loop-hero-residuals-hint {
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
    opacity: var(--op-dim);
    line-height: 1.5;
  }

  &__loop-hero-residuals-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.75rem;

    @media (max-width: 900px) { grid-template-columns: repeat(2, 1fr); }
  }

  &__loop-hero-actions {
    @include flex-col(0.45rem);
    padding-top: 0.4rem;
    border-top: 1px dashed color-mix(in srgb, var(--color-primary) 25%, transparent);
  }

  &__loop-hero-actions-title {
    @include mono-upper(var(--fs-xxs), 0.12em);
    color: var(--color-primary);
    opacity: var(--op-partial);
  }

  &__loop-hero-actions-row {
    @include flex-row(0.6rem);
    flex-wrap: wrap;
  }

  &__loop-hero-action {
    @include mono-upper(var(--fs-xs), 0.06em);
    padding: 0.55rem 1rem;
    border-radius: var(--radius);
    border: 1px solid;
    text-decoration: none;
    cursor: pointer;
    transition: background var(--tr-fast), border-color var(--tr-fast);

    &--primary {
      color: var(--color-primary);
      border-color: color-mix(in srgb, var(--color-primary) 55%, transparent);
      background: color-mix(in srgb, var(--color-primary) 18%, transparent);

      &:hover { background: color-mix(in srgb, var(--color-primary) 30%, transparent); }
    }

    &--secondary {
      color: var(--color-text-muted);
      border-color: var(--color-border);
      background: transparent;

      &:hover { color: var(--color-text); border-color: var(--color-text-muted); }
    }

    &:disabled { opacity: var(--op-muted); cursor: not-allowed; }
  }

  &__loop-hero-empty {
    @include flex-col(0.6rem);
    padding: 1rem 1.1rem 1.2rem;
    border: 1px dashed color-mix(in srgb, var(--color-primary) 30%, transparent);
    border-radius: var(--radius);
    background: color-mix(in srgb, var(--color-primary) 4%, transparent);
  }

  &__loop-hero-empty-title {
    margin: 0;
    font-size: var(--fs-lg);
    font-weight: 600;
    color: var(--color-text);
  }

  &__loop-hero-empty-desc {
    margin: 0;
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
    line-height: 1.55;
    max-width: 720px;
  }

  &__loop-hero-empty-actions {
    @include flex-row(0.6rem);
    flex-wrap: wrap;
    margin-top: 0.3rem;
  }

  &__loop-hero-sample {
    margin-top: 0.6rem;
    align-self: flex-start;
    padding: 0.25rem 0;
    background: transparent;
    border: 0;
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    text-decoration: underline;
    cursor: pointer;
    transition: color var(--tr-fast);
    &:hover { color: var(--color-text); }
  }

  /* ── Session stats pill row ───────────────────────────────────────────────── */
  &__session-stats {
    @include flex-col(0.5rem);
    padding: 0.6rem 0.9rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    background: color-mix(in srgb, white 1.5%, transparent);
  }

  &__session-stats-label {
    @include mono-upper(var(--fs-xxs), 0.12em);
    color: var(--color-text-muted);
    opacity: var(--op-muted);
  }

  &__session-stats-row {
    @include flex-row(0.5rem);
    flex-wrap: wrap;
  }

  &__session-stat-pill {
    @include flex-row(0.4rem);
    align-items: baseline;
    padding: 0.3rem 0.6rem;
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    background: color-mix(in srgb, white 2%, transparent);
    font-family: var(--font-mono);

    &--muted   { opacity: var(--op-muted); }
    &--primary { border-color: color-mix(in srgb, var(--color-primary) 40%, transparent); }
    &--ok      { border-color: color-mix(in srgb, var(--color-lime)    40%, transparent); }
    &--danger  { border-color: color-mix(in srgb, var(--color-danger)  40%, transparent); }
  }

  &__session-stat-pill-label {
    @include mono-upper(var(--fs-xxs), 0.06em);
    color: var(--color-text-muted);
  }

  &__session-stat-pill-val {
    font-size: var(--fs-sm);
    color: var(--color-text);
    font-variant-numeric: tabular-nums;
  }

  &__session-stats-note {
    font-size: var(--fs-xs);
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    opacity: var(--op-dim);
  }

  /* ── Mobile layout ────────────────────────────────────────────────────────── */
  @media (max-width: 700px) {
    &__inner { padding: 1rem 0.85rem 3rem; }
  }

  /* ── Log card ─────────────────────────────────────────────────────────────── */
  &__log-card {
    @include surface-card(var(--radius-lg));
    overflow: hidden;
  }

  &__log-card-hdr {
    @include flex-between(1rem);
    align-items: center;
    padding: 0.9rem 1.5rem;
    border-bottom: 1px solid var(--color-border);
    flex-wrap: wrap;

    @media (max-width: 700px) {
      flex-direction: column;
      align-items: stretch;
    }
  }

  &__log-card-hdr-title {
    @include flex-row(0.75rem);
    align-items: center;
    flex-wrap: wrap;
  }

  &__log-card-actions {
    @include flex-row(0.6rem);
    align-items: center;
    flex-shrink: 0;
    flex-wrap: wrap;

    @media (max-width: 700px) {
      width: 100%;

      .reports__btn { flex: 1 1 auto; }
    }
  }

  /* ── Import cluster (button + customise-columns attached) ─────────────────── */
  &__import-group {
    @include flex-row(0);
    align-items: stretch;
    border-radius: var(--radius);
  }

  &__btn--import-grouped {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
    border-right: 0;
  }

  &__btn-mapping {
    @include mono-upper(var(--fs-xxs), 0.08em);
    @include flex-row(0.3rem);
    align-items: center;
    padding: 0 0.7rem;
    background: color-mix(in srgb, var(--color-amber) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-amber) 35%, transparent);
    border-left: 1px dashed color-mix(in srgb, var(--color-amber) 45%, transparent);
    border-top-right-radius: var(--radius);
    border-bottom-right-radius: var(--radius);
    color: color-mix(in srgb, var(--color-amber) 90%, transparent);
    cursor: pointer;
    transition: background var(--tr-fast), border-color var(--tr-fast), color var(--tr-fast);

    &:hover:not(:disabled) {
      background: color-mix(in srgb, var(--color-amber) 16%, transparent);
      border-color: var(--color-amber);
      color: var(--color-amber);
    }

    &:disabled { opacity: var(--op-muted); cursor: not-allowed; }
  }

  &__btn-mapping-icon {
    font-size: var(--fs-sm);
    line-height: 1;
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
