<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="reports">
    <div class="reports__inner">

      <!-- Page header -->
      <PageHeader :eyebrow="$t('reports.eyebrow')" :title="$t('reports.title')">
        <div class="reports__header-row">
          <p class="reports__subtitle">{{ $t('reports.subtitle') }}</p>
          <div class="reports__header-actions">
            <button
              class="reports__btn reports__btn--export"
              :disabled="totalReadings === 0"
              @click="store.exportCSV()"
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
        <span class="reports__session-name">{{ store.sessionName }}</span>
        <span class="reports__session-meta">
          {{ totalReadings }} {{ countLabel }}
          <template v-if="distinctSessionCount > 1">
            · {{ $t('reports.sessionMultiple', { n: distinctSessionCount }) }}
          </template>
        </span>
        <span class="reports__session-hint">{{ $t('reports.sessionEditHint') }}</span>
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

      <!-- Log table -->
      <div class="reports__log-card">
        <div class="reports__log-card-hdr">
          <span class="reports__log-title">{{ $t('reports.logTitle') }}</span>
          <span class="reports__log-count">
            {{ totalReadings }} {{ countLabel }}
          </span>
        </div>

        <!-- Empty state -->
        <div v-if="totalReadings === 0" class="reports__log-empty">
          <div class="reports__empty-icon">{{ $t('reports.emptyIcon') }}</div>
          <div class="reports__empty-text">{{ $t('reports.emptyText') }}</div>
          <p class="reports__empty-sub">
            {{ $t('reports.emptySub') }}
          </p>
          <RouterLink to="/experiment" class="reports__empty-btn">
            {{ $t('reports.emptyBtn') }}
          </RouterLink>
        </div>

        <!-- Methods action bar — slides in when a row is selected -->
        <Transition name="methods-bar">
          <div v-if="selectedEntry" class="reports__methods-bar">
            <div class="reports__methods-bar-info">
              <span class="reports__methods-bar-label">{{ ICON.RETICLE }} {{ $t('reports.actionBarEntry', { id: selectedEntry.id }) }}</span>
              <span class="reports__methods-bar-chip">{{ selectedEntry.targetPreset }}</span>
              <span class="reports__methods-bar-chip">{{ formatFreqKHz(selectedEntry.freqKHz, 1) }}</span>
              <span class="reports__methods-bar-chip">{{ formatFieldVcm(selectedEntry.fieldVcm) }}</span>
              <span class="reports__methods-bar-chip">{{ selectedEntry.waveform }}</span>
            </div>
            <div class="reports__methods-bar-actions">
              <span v-if="!selectedEntry.healthySnap" class="reports__methods-bar-legacy">
                {{ $t('reports.actionBarLegacy') }}
              </span>
              <button
                v-else
                class="reports__methods-bar-btn"
                @click.stop="downloadSelectedMethods"
              >{{ $t('reports.actionBarDownload') }}</button>
              <button
                class="reports__methods-bar-dismiss"
                :title="$t('reports.actionBarDismiss')"
                @click.stop="dismissSelection"
              >×</button>
            </div>
          </div>
        </Transition>

        <!-- Data table -->
        <div v-if="totalReadings > 0" class="reports__table-wrap">
          <table class="reports__table">
            <thead>
              <tr>
                <th class="reports__col-select" v-tip="$t('reports.colMethodsTitle')">
                  <!-- Animated reticle: communicates "select a row" -->
                  <svg class="reports__reticle-icon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1" opacity="0.5"/>
                    <circle cx="8" cy="8" r="2.5" stroke="currentColor" stroke-width="1"/>
                    <circle cx="8" cy="8" r="1" fill="currentColor"/>
                    <line x1="8" y1="1" x2="8" y2="4"   stroke="currentColor" stroke-width="1" opacity="0.6"/>
                    <line x1="8" y1="12" x2="8" y2="15" stroke="currentColor" stroke-width="1" opacity="0.6"/>
                    <line x1="1" y1="8" x2="4"  y2="8"  stroke="currentColor" stroke-width="1" opacity="0.6"/>
                    <line x1="12" y1="8" x2="15" y2="8" stroke="currentColor" stroke-width="1" opacity="0.6"/>
                  </svg>
                </th>
                <th v-tip="$t('reports.colSessionTitle')">{{ $t('reports.colSession') }}</th>
                <th>{{ $t('reports.colId') }}</th>
                <th>{{ $t('reports.colTime') }}</th>
                <th>{{ $t('reports.colTarget') }}</th>
                <th v-tip="$t('log.tipThFreq')">{{ $t('reports.colFreq') }}</th>
                <th v-tip="$t('log.tipThField')">{{ $t('reports.colField') }}</th>
                <th>{{ $t('reports.colMedium') }}</th>
                <th v-tip="$t('reports.colTVmTitle')">{{ $t('reports.colTVm') }}</th>
                <th v-tip="$t('reports.colHVmTitle')">{{ $t('reports.colHVm') }}</th>
                <th v-tip="$t('reports.colSelectivityTitle')">{{ $t('reports.colSelectivity') }}</th>
                <th v-tip="$t('reports.colTRatioTitle')">{{ $t('reports.colTRatio') }}</th>
                <th v-tip="$t('reports.colHRatioTitle')">{{ $t('reports.colHRatio') }}</th>
                <th v-tip="$t('reports.colTTempTitle')">{{ $t('reports.colTTemp') }}</th>
                <th v-tip="$t('reports.colHTempTitle')">{{ $t('reports.colHTemp') }}</th>
                <th v-tip="$t('log.tipThDepH')">{{ $t('log.logThDepH') }}</th>
                <th v-tip="$t('log.tipThDepT')">{{ $t('log.logThDepT') }}</th>
                <th v-tip="$t('reports.colEventTitle')">{{ $t('reports.colEvent') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="e in reversedEntries"
                :key="e.id"
                class="reports__row--selectable"
                :class="{
                  'reports__row--lysis':    e.event === LOG_EVENT.LYSIS,
                  'reports__row--selected': selectedEntry?.id === e.id,
                }"
                @click="selectEntry(e)"
              >
                <td class="reports__td-select">
                  <span
                    class="reports__row-radio"
                    :class="{ 'reports__row-radio--on': selectedEntry?.id === e.id }"
                  ></span>
                </td>
                <td class="reports__session-val" v-tip="tipCellSession(e)">{{ e.sessionName ?? NULL_DISPLAY }}</td>
                <td class="reports__muted">{{ e.id }}</td>
                <td class="reports__timestamp">{{ e.timestamp }}</td>
                <td>{{ e.targetPreset }}</td>
                <td v-tip="tipCellFreq(e)">{{ formatFreqKHz(e.freqKHz, 1) }}</td>
                <td v-tip="tipCellField(e)">{{ formatFieldVcm(e.fieldVcm) }}</td>
                <td class="reports__muted">{{ e.medium }}</td>
                <td class="reports__cancer-val" v-tip="tipCellTargetVm(e)">{{ e.targetVm.toFixed(3) }}</td>
                <td class="reports__ref-val" v-tip="tipCellHealthyVm(e)">{{ e.healthyVm.toFixed(3) }}</td>
                <td :class="selClass(e.selectivity)" v-tip="tipCellSel(e)">{{ e.selectivity.toFixed(3) }}</td>
                <td
                  :class="e.targetRatio >= THRESHOLDS.LYSIS_PROB_CENTER ? 'reports__cancer-val' : e.targetRatio >= THRESHOLDS.HEALTHY_APPROACHING ? 'reports__warn-val' : ''"
                  v-tip="tipCellTRatio(e)"
                >{{ (e.targetRatio * 100).toFixed(1) }}%</td>
                <td class="reports__ref-val" v-tip="tipCellHRatio(e)">{{ (e.healthyRatio * 100).toFixed(1) }}%</td>
                <td :class="e.targetTemp > THRESHOLDS.TEMP_WARN ? 'reports__warn-val' : ''" v-tip="tipCellTemp(e.targetTemp, 'target')">{{ e.targetTemp.toFixed(1) }}</td>
                <td :class="e.healthyTemp > THRESHOLDS.TEMP_WARN ? 'reports__warn-val' : ''" v-tip="tipCellTemp(e.healthyTemp, 'healthy')">{{ e.healthyTemp.toFixed(1) }}</td>
                <td :class="depKClass(e.depHealthyK)" v-tip="tipCellDepH(e)">{{ depKDisplay(e.depHealthyK) }}</td>
                <td :class="depKClass(e.depTargetK)" v-tip="tipCellDepT(e)">{{ depKDisplay(e.depTargetK) }}</td>
                <td>
                  <StatusBadge :label="e.event" :variant="eventVariant(e.event)" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Legend -->
        <div v-if="totalReadings > 0" class="reports__legend">
          <span class="reports__legend-item">
            <span class="reports__legend-color reports__cancer-val">{{ ICON.SQUARE }}</span> {{ $t('reports.legendTarget') }}
          </span>
          <span class="reports__legend-item">
            <span class="reports__legend-color reports__ref-val">{{ ICON.SQUARE }}</span> {{ $t('reports.legendHealthy') }}
          </span>
          <span class="reports__legend-item">
            <span class="reports__legend-color reports__green-val">{{ ICON.SQUARE }}</span> {{ $t('reports.legendSelectivity', { strong: THRESHOLDS.SEL_STRONG }) }}
          </span>
          <span class="reports__legend-item">
            <span class="reports__legend-color reports__warn-val">{{ ICON.SQUARE }}</span> {{ $t('reports.legendWarning', { marginal: THRESHOLDS.SEL_MARGINAL, strong: THRESHOLDS.SEL_STRONG }) }}
          </span>
          <span class="reports__legend-item reports__footnote">
            {{ $t('reports.footnote') }}
          </span>
          <RouterLink to="/instrument" class="reports__legend-item reports__instrument-link" :title="$t('reports.instrumentLinkTitle')">
            {{ $t('reports.instrumentLink') }}
          </RouterLink>
        </div>
      </div>

    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { LogEntry } from '@/stores/experimentStore'
import { useExperimentStore } from '@/stores/experimentStore'
import { formatFreqKHz, formatFieldVcm, formatRange } from '@/utils/format'
import { eventVariant as sharedEventVariant, depKDisplay } from '@/utils/experimentUtils'
import {
  tipCellSession as sharedTipCellSession,
  tipCellFreq as sharedTipCellFreq,
  tipCellField as sharedTipCellField,
  tipCellTargetVm as sharedTipCellTargetVm,
  tipCellHealthyVm as sharedTipCellHealthyVm,
  tipCellSel as sharedTipCellSel,
  tipCellDepH as sharedTipCellDepH,
  tipCellDepT as sharedTipCellDepT,
} from '@/utils/logTooltips'
import { LOG_EVENT, NULL_DISPLAY } from '@/constants/strings'
import { THRESHOLDS } from '@/constants/physics'
import { ICON } from '@/constants/icons'
import StatusBadge from '@/components/StatusBadge.vue'
import StatCard from '@/components/StatCard.vue'
import PageHeader from '@/components/PageHeader.vue'

export default defineComponent({
  components: { StatusBadge, StatCard, PageHeader },

  setup() {
    const store = useExperimentStore()
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
      selectedEntry,
      totalReadings,
      reversedEntries,
      distinctSessionCount,
      lysisEvents,
      manualReadings,
      countLabel,
      statCards,
      selClass,
      formatFreqKHz,
      formatFieldVcm,
      depKDisplay,
      LOG_EVENT,
      NULL_DISPLAY,
      THRESHOLDS,
      ICON,
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

    eventVariant(event: string): string {
      return sharedEventVariant(event)
    },
    depKClass(k: number | undefined): string {
      if (k == null) return 'reports__muted'
      return k > 0 ? 'reports__green-val' : 'reports__warn-val'
    },
    tipCellSession(e: { sessionName?: string; id: number }): string {
      return sharedTipCellSession(this.$t.bind(this), e)
    },
    tipCellFreq(e: { freqKHz: number }): string {
      return sharedTipCellFreq(this.$t.bind(this), e)
    },
    tipCellField(e: { fieldVcm: number }): string {
      return sharedTipCellField(this.$t.bind(this), e)
    },
    tipCellTargetVm(e: { targetVm: number; targetPreset: string; targetRatio: number }): string {
      return sharedTipCellTargetVm(this.$t.bind(this), e)
    },
    tipCellHealthyVm(e: { healthyVm: number; healthyRatio: number }): string {
      return sharedTipCellHealthyVm(this.$t.bind(this), e)
    },
    tipCellSel(e: { selectivity: number; targetTemp: number; healthyTemp: number }): string {
      return sharedTipCellSel(this.$t.bind(this), e)
    },
    tipCellTRatio(e: { targetRatio: number }): string {
      return this.$t('log.tipCellTRatio', { ratio: (e.targetRatio * 100).toFixed(1) })
    },
    tipCellHRatio(e: { healthyRatio: number }): string {
      return this.$t('log.tipCellHRatio', { ratio: (e.healthyRatio * 100).toFixed(1) })
    },
    tipCellTemp(temp: number, cell: 'target' | 'healthy'): string {
      return this.$t('reports.tipCellTemp', {
        temp: temp.toFixed(1),
        cell,
        warn: temp > THRESHOLDS.TEMP_WARN ? ` ⚠ above ${THRESHOLDS.TEMP_WARN}°C hyperthermic limit` : '',
      })
    },
    tipCellDepH(e: { depHealthyK?: number }): string {
      return sharedTipCellDepH(this.$t.bind(this), e)
    },
    tipCellDepT(e: { depTargetK?: number }): string {
      return sharedTipCellDepT(this.$t.bind(this), e)
    },
  },
})
</script>

<style lang="scss" scoped>
@use '../styles/mixins' as *;

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
    font-size: 0.875rem;
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
    font-size: 0.82rem;
    font-family: var(--font-mono);
    font-weight: 600;
    border: 1px solid;
    cursor: pointer;
    transition: all 0.15s;
    background: transparent;

    &:disabled { opacity: 0.3; cursor: not-allowed; }

    &--export {
      color: var(--color-primary);
      border-color: rgba(0, 212, 255, 0.35);
      background: var(--color-primary-dim);

      &:hover:not(:disabled) {
        background: rgba(0, 212, 255, 0.2);
        border-color: var(--color-primary);
      }
    }

    &--clear {
      color: var(--color-danger);
      border-color: rgba(255, 77, 109, 0.35);

      &:hover:not(:disabled) {
        background: rgba(255, 77, 109, 0.1);
      }
    }
  }

  /* ── Session summary (read-only) ──────────────────────────────────────────── */
  &__session-summary {
    @include flex-row(0.75rem);
    align-items: baseline;
    flex-wrap: wrap;
  }

  &__session-name {
    font-family: var(--font-mono);
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--color-text-heading);
  }

  &__session-meta {
    @include mono-upper(0.68rem, 0.06em);
    color: var(--color-primary);
  }

  &__session-hint {
    font-size: 0.68rem;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    margin-left: auto;
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
    &__session-hint { margin-left: 0; }
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
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--color-text-heading);
  }

  &__log-count {
    font-size: 0.68rem;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 0.15rem 0.5rem;
  }

  /* ── Empty state ──────────────────────────────────────────────────────────── */
  &__log-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    gap: 0.75rem;
    text-align: center;
  }

  &__empty-icon {
    font-size: 2.5rem;
    color: var(--color-border);
  }

  &__empty-text {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text-muted);
  }

  &__empty-sub {
    font-size: 0.82rem;
    color: var(--color-text-muted);
    opacity: 0.65;
    max-width: 380px;
    line-height: 1.6;
    margin: 0;
  }

  &__empty-btn {
    margin-top: 0.5rem;
    display: inline-flex;
    padding: 0.55rem 1.25rem;
    background: var(--color-primary-dim);
    color: var(--color-primary);
    border: 1px solid rgba(0, 212, 255, 0.3);
    border-radius: var(--radius);
    text-decoration: none;
    font-size: 0.85rem;
    font-weight: 600;
    transition: all 0.15s;

    &:hover {
      background: rgba(0, 212, 255, 0.15);
      border-color: var(--color-primary);
    }
  }

  /* ── Log table ────────────────────────────────────────────────────────────── */
  &__table-wrap {
    overflow-x: auto;
  }

  &__table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.78rem;
    min-width: 1400px;

    th {
      text-align: left;
      padding: 0.5rem 0.75rem;
      font-size: 0.62rem;
      font-family: var(--font-mono);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--color-text-muted);
      background: rgba(255, 255, 255, 0.02);
      border-bottom: 1px solid var(--color-border);
      white-space: nowrap;
    }

    td {
      padding: 0.52rem 0.75rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      white-space: nowrap;
      font-family: var(--font-mono);
    }

    tr:last-child td { border-bottom: none; }
    tr:hover td { background: rgba(255, 255, 255, 0.025); }
  }

  &__row--lysis td { background: rgba(255, 77, 109, 0.04); }
  &__row--lysis:hover td { background: rgba(255, 77, 109, 0.08) !important; }

  &__timestamp {
    font-size: 0.72rem;
    letter-spacing: 0.02em;
    opacity: 0.8;
  }

  /* Utility colours — mixin generates __muted, __cancer-val, __warn-val */
  @include data-value-classes();
  &__ref-val   { color: var(--color-primary); }
  &__green-val { color: var(--color-lime);   }
  &__session-val {
    color: var(--color-text-muted);
    font-size: 0.62rem;
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Event type labels - plain colored text, not styled as buttons */
  &__ev-badge {
    font-size: 0.7rem;
    font-family: var(--font-mono);
    font-weight: 600;

    &--manual {
      color: var(--color-primary);
      opacity: 0.85;
    }

    &--lysis {
      color: var(--color-danger);
    }
  }

  /* ── Row selection ────────────────────────────────────────────────────────── */
  &__row--selectable {
    cursor: pointer;
    user-select: none;
  }

  &__row--selected td {
    background: rgba(167, 139, 250, 0.10) !important;
    border-bottom-color: rgba(167, 139, 250, 0.12) !important;
  }
  &__row--selected:hover td { background: rgba(167, 139, 250, 0.16) !important; }

  &__col-select {
    width: 28px;
    min-width: 28px;
    padding: 0.5rem 0.5rem !important;
    color: #a78bfa !important;
    text-align: center !important;
  }

  &__reticle-icon {
    width: 14px;
    height: 14px;
    color: #a78bfa;
    display: inline-block;
    vertical-align: middle;
    // Outer ring pulses opacity; inner crosshairs stay steady
    circle:first-child {
      animation: reticle-pulse 2.8s ease-in-out infinite;
    }
  }

  @keyframes reticle-pulse {
    0%, 100% { opacity: 0.25; }
    50%       { opacity: 0.65; }
  }

  &__td-select {
    text-align: center;
    padding: 0.52rem 0.5rem !important;
    cursor: pointer;
  }

  &__row-radio {
    display: inline-block;
    cursor: pointer;
    width: 11px;
    height: 11px;
    border-radius: 50%;
    border: 1.5px solid rgba(255, 255, 255, 0.2);
    transition: all 0.15s;
    vertical-align: middle;

    &--on {
      background: #a78bfa;
      border-color: #a78bfa;
      box-shadow: 0 0 6px rgba(167, 139, 250, 0.55);
    }
  }

  /* ── Methods action bar ───────────────────────────────────────────────────── */
  &__methods-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 0.75rem 1.5rem;
    background: linear-gradient(90deg, rgba(167, 139, 250, 0.10) 0%, rgba(167, 139, 250, 0.05) 100%);
    border-bottom: 1px solid rgba(167, 139, 250, 0.25);
    flex-wrap: wrap;
  }

  &__methods-bar-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  &__methods-bar-label {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    font-weight: 700;
    color: #c4b5fd;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    margin-right: 0.25rem;
  }

  &__methods-bar-chip {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    color: rgba(255, 255, 255, 0.65);
    background: rgba(167, 139, 250, 0.10);
    border: 1px solid rgba(167, 139, 250, 0.22);
    border-radius: 3px;
    padding: 0.1rem 0.4rem;
  }

  &__methods-bar-actions {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    flex-shrink: 0;
  }

  &__methods-bar-legacy {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    color: var(--color-text-muted);
    opacity: 0.7;
    font-style: italic;
  }

  &__methods-bar-btn {
    padding: 0.45rem 1.1rem;
    font-size: 0.78rem;
    font-family: var(--font-mono);
    font-weight: 700;
    letter-spacing: 0.05em;
    color: #e9d5ff;
    background: rgba(167, 139, 250, 0.18);
    border: 1px solid rgba(167, 139, 250, 0.55);
    border-radius: var(--radius);
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;

    &:hover {
      background: rgba(167, 139, 250, 0.32);
      border-color: #a78bfa;
      box-shadow: 0 0 14px rgba(167, 139, 250, 0.25);
    }
  }

  &__methods-bar-dismiss {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    line-height: 1;
    color: var(--color-text-muted);
    background: transparent;
    border: 1px solid transparent;
    border-radius: 50%;
    cursor: pointer;
    transition: all 0.15s;
    padding: 0;

    &:hover {
      color: var(--color-text-heading);
      border-color: var(--color-border);
      background: rgba(255, 255, 255, 0.06);
    }
  }

  /* ── Legend ───────────────────────────────────────────────────────────────── */
  &__legend {
    display: flex;
    gap: 1.25rem;
    flex-wrap: wrap;
    padding: 0.75rem 1.5rem;
    border-top: 1px solid var(--color-border);
    font-size: 0.7rem;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
  }

  &__legend-item {
    display: flex;
    align-items: center;
    gap: 0.35rem;
  }

  &__legend-color {
    font-size: 0.85rem;
  }

  &__footnote {
    width: 100%;
    font-size: 0.65rem;
    color: var(--color-text-muted);
    opacity: 0.65;
    margin-top: 0.15rem;
    line-height: 1.5;
  }

  &__instrument-link {
    width: 100%;
    font-size: 0.65rem;
    font-family: var(--font-mono);
    color: var(--color-primary);
    opacity: 0.7;
    text-decoration: none;
    margin-top: 0.1rem;
    transition: opacity 0.15s;

    &:hover {
      opacity: 1;
    }
  }
}

// ── Methods bar transition ─────────────────────────────────────────────────
.methods-bar-enter-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.methods-bar-leave-active { transition: opacity 0.15s ease; }
.methods-bar-enter-from   { opacity: 0; transform: translateY(-6px); }
.methods-bar-leave-to     { opacity: 0; }

// Media queries → _responsive.scss
</style>
