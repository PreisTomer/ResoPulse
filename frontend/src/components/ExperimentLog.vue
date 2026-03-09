<template>
  <div class="exp-log">

    <!-- Accordion toggle -->
    <button class="exp-log__toggle" @click="open = !open">
      <span class="exp-log__toggle-left">
        <span class="exp-log__toggle-icon">{{ ICON.LINES }}</span>
        <span class="exp-log__toggle-title">{{ $t('exp.logTitle') }}</span>
        <span class="exp-log__toggle-sub">{{ hasEntries ? $t('exp.logReadingsCount', { n: expStore.entries.length }) : $t('exp.logNoReadings') }}</span>
      </span>
      <span class="exp-log__chevron" :class="{ 'exp-log__chevron--open': open }">{{ ICON.CHEVRON }}</span>
    </button>

    <div v-show="open">

    <!-- Header row -->
    <div class="exp-log__header">
      <input
        v-model="expStore.sessionName"
        class="exp-log__name-input"
        :placeholder="$t('exp.logSessionPlaceholder')"
        spellcheck="false"
      />
      <div class="exp-log__actions">
        <button
          class="exp-log__btn exp-log__btn--primary"
          v-tip="tipLogReading"
          @click="logReading"
        >{{ $t('exp.logReadingBtn') }}</button>
        <button
          class="exp-log__btn"
          :disabled="!hasEntries"
          v-tip="tipExportCsv"
          @click="exportCSV"
        >{{ $t('exp.logCsvBtn') }}</button>
        <button
          class="exp-log__btn"
          :disabled="!hasEntries"
          v-tip="tipClearLog"
          @click="clearLog"
        >{{ $t('exp.logClearBtn') }}</button>
      </div>
    </div>

    <!-- Table -->
    <div class="exp-log__table-wrap">
      <table class="exp-log__table">
        <thead>
          <tr>
            <th v-tip="tipThNumber">{{ $t('exp.logThNumber') }}</th>
            <th v-tip="tipThTime">{{ $t('exp.logThTime') }}</th>
            <th v-tip="tipThFreq">{{ $t('exp.logThFreq') }}</th>
            <th v-tip="tipThField">{{ $t('exp.logThField') }}</th>
            <th v-tip="tipThTargetVm">{{ $t('exp.logThTargetVm') }}</th>
            <th v-tip="tipThHealthyVm">{{ $t('exp.logThHealthyVm') }}</th>
            <th v-tip="tipThSel">{{ $t('exp.logThSel') }}</th>
            <th v-tip="tipThEvent">{{ $t('exp.logThEvent') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="e in entries"
            :key="e.id"
            :class="{ 'exp-log__row--lysis': e.event === LOG_EVENT.LYSIS }"
          >
            <td class="exp-log__td-id">{{ e.id }}</td>
            <td class="exp-log__td-mono">{{ e.timestamp }}</td>
            <td class="exp-log__td-mono" v-tip="tipCellFreq(e)">{{ e.freqKHz }}k</td>
            <td class="exp-log__td-mono" v-tip="tipCellField(e)">{{ e.fieldVcm }}</td>
            <td class="exp-log__td-target" v-tip="tipCellTargetVm(e)">{{ e.targetVm }}</td>
            <td class="exp-log__td-healthy" v-tip="tipCellHealthyVm(e)">{{ e.healthyVm }}</td>
            <td class="exp-log__td-sel" v-tip="tipCellSel(e)">{{ e.selectivity.toFixed(2) }}</td>
            <td class="exp-log__td-event" v-tip="tipCellEvent(e)">{{ e.event }}</td>
          </tr>
          <tr v-if="!hasEntries">
            <td colspan="8" class="exp-log__td-empty">{{ $t('exp.logEmpty') }}</td>
          </tr>
        </tbody>
      </table>
    </div><!-- /exp-log__table-wrap -->

    </div><!-- /v-show="open" -->
  </div><!-- /exp-log -->
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useExperimentStore } from '@/stores/experimentStore'
import { useCellStore } from '@/stores/cellStore'
import { LOG_EVENT } from '@/constants/strings'
import { ICON } from '@/constants/icons'
import { THRESHOLDS } from '@/constants/cellCard'

export default defineComponent({
  setup() {
    return {
      expStore: useExperimentStore(),
      cellStore: useCellStore(),
      LOG_EVENT,
      ICON,
      THRESHOLDS,
    }
  },

  data() {
    return { open: false }
  },

  computed: {
    entries() {
      return [...this.expStore.entries].reverse().slice(0, 20)
    },
    hasEntries(): boolean { return this.expStore.entries.length > 0 },

    // ── Button tooltips ────────────────────────────────────────────────────────
    tipLogReading(): string {
      return `<strong>Log Reading</strong>
Capture a snapshot of the current experiment state:
RF frequency, field intensity, transmembrane potentials (Vm),
selectivity ratio, cell temperatures, and disruption ratios.
Auto-logged on lysis events.`
    },
    tipExportCsv(): string {
      return `<strong>Export CSV</strong>
Download all log entries as a comma-separated file.
Columns: #, timestamp, frequency (kHz), field (V/cm),
target Vm (mV), healthy Vm (mV), selectivity, event type.`
    },
    tipClearLog(): string {
      return `<strong>Clear Log</strong>
Remove all readings from this session.
This action cannot be undone.`
    },

    // ── Column header tooltips ─────────────────────────────────────────────────
    tipThNumber(): string {
      return `<strong>#  — Entry Index</strong>
Sequential reading number (newest first).`
    },
    tipThTime(): string {
      return `<strong>Time — Timestamp</strong>
Local time (HH:MM:SS) when the reading was logged.`
    },
    tipThFreq(): string {
      return `<strong>Freq — RF Frequency (kHz)</strong>
Broadcast frequency at the time of reading.
Below fc → quasi-DC regime, Vm is at its maximum.
Above fc → Schwan roll-off reduces Vm.`
    },
    tipThField(): string {
      return `<strong>Field — Applied Electric Field (V/cm)</strong>
Field intensity at the time of reading.
Transmembrane potential Vm scales linearly with E.`
    },
    tipThTargetVm(): string {
      return `<strong>T-Vm — Target Transmembrane Potential (mV)</strong>
Peak voltage induced across the target cell membrane,
computed via the Schwan equation.
Higher values → greater disruption potential.`
    },
    tipThHealthyVm(): string {
      return `<strong>H-Vm — Healthy Transmembrane Potential (mV)</strong>
Peak voltage induced across the healthy reference
cell membrane. Should remain below 50% of threshold
for a safe therapeutic window.`
    },
    tipThSel(): string {
      const { SEL_STRONG: s, SEL_MARGINAL: m } = THRESHOLDS
      return `<strong>Sel× — Vm Selectivity Ratio</strong>
T-Vm / H-Vm — raw membrane potential ratio.
<span class="tip-ok">≥ ${s}×</span> Strong therapeutic window
<span class="tip-val">${m}–${s}×</span> Marginal window
<span class="tip-warn">&lt; ${m}×</span> Non-selective`
    },
    tipThEvent(): string {
      return `<strong>Event Type</strong>
manual — snapshot triggered by user
lysis — target membrane disrupted (auto-logged)`
    },
  },

  methods: {
    logReading() {
      this.expStore.logReading(this.cellStore as Parameters<typeof this.expStore.logReading>[0], LOG_EVENT.MANUAL)
    },
    exportCSV()  { this.expStore.exportCSV() },
    clearLog()   { this.expStore.clearLog() },

    // ── Row cell tooltips ──────────────────────────────────────────────────────
    tipCellFreq(e: { freqKHz: number }): string {
      return `<strong>Frequency: ${e.freqKHz} kHz</strong>
Carrier frequency at the time of this reading.`
    },
    tipCellField(e: { fieldVcm: number }): string {
      return `<strong>Field Intensity: ${e.fieldVcm} V/cm</strong>
Applied electric field at the time of this reading.`
    },
    tipCellTargetVm(e: { targetVm: number; targetPreset: string; targetRatio: number }): string {
      return `<strong>Target Vm: ${e.targetVm} mV</strong>
Cell: ${e.targetPreset}
Disruption ratio: ${(e.targetRatio * 100).toFixed(1)}% of lysis threshold`
    },
    tipCellHealthyVm(e: { healthyVm: number; healthyRatio: number }): string {
      return `<strong>Healthy Vm: ${e.healthyVm} mV</strong>
Disruption ratio: ${(e.healthyRatio * 100).toFixed(1)}% of lysis threshold`
    },
    tipCellSel(e: { selectivity: number; targetTemp: number; healthyTemp: number }): string {
      return `<strong>Selectivity: ×${e.selectivity.toFixed(2)}</strong>
T-Vm / H-Vm ratio at this reading.
Target temp: ${e.targetTemp}°C  ·  Healthy temp: ${e.healthyTemp}°C`
    },
    tipCellEvent(e: { event: string }): string {
      return e.event === LOG_EVENT.LYSIS
        ? `<span class="tip-warn">⚡ Lysis event</span>
Target membrane was irreversibly disrupted.
Automatically logged when the lysis countdown completed.`
        : `Manual snapshot
Logged by user click at this timestamp.`
    },
  },
})
</script>

<style lang="scss" scoped>
@use '../styles/mixins' as *;

.exp-log {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1;
  min-height: 0;

  &__toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--color-border);
    padding: 0.65rem 0.85rem;
    cursor: pointer;
    gap: 0.5rem;
    flex-shrink: 0;

    &:hover .exp-log__toggle-title { color: var(--color-primary); }
  }

  &__toggle-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    min-width: 0;
  }

  &__toggle-icon {
    font-size: 0.8rem;
    color: var(--color-primary);
    flex-shrink: 0;
    opacity: 0.7;
  }

  &__toggle-title {
    @include mono-upper(0.62rem, 0.1em);
    color: var(--color-text);
    flex-shrink: 0;
    transition: color 0.15s;
  }

  &__toggle-sub {
    font-size: 0.58rem;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    opacity: 0.65;
  }

  &__chevron {
    font-size: 1rem;
    color: var(--color-text-muted);
    opacity: 0.5;
    flex-shrink: 0;
    transition: transform 0.2s;

    &--open { transform: rotate(90deg); }
  }

  &__header {
    @include flex-row(0.6rem);
    padding: 0.65rem 0.85rem;
    border-bottom: 1px solid var(--color-border);
    flex-wrap: wrap;
  }

  &__name-input {
    flex: 1;
    min-width: 100px;
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--color-border);
    color: var(--color-text-heading);
    font-family: var(--font-mono);
    font-size: 0.68rem;
    padding: 0.1rem 0.2rem;
    outline: none;
    letter-spacing: 0.06em;

    &:focus { border-bottom-color: var(--color-primary); }
  }

  &__actions { @include flex-row(0.35rem); flex-shrink: 0; }

  &__btn {
    @include mono-upper(0.58rem);
    padding: 0.22rem 0.6rem;
    border: 1px solid var(--color-border);
    border-radius: 3px;
    background: transparent;
    color: var(--color-text);
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;

    &:hover:not(:disabled) { border-color: var(--color-primary); color: var(--color-primary); }
    &:disabled { opacity: 0.3; cursor: not-allowed; }

    &--primary {
      border-color: var(--color-primary);
      color: var(--color-primary);

      &:hover { background: var(--color-primary-dim); }
    }
  }

  &__table-wrap {
    overflow-y: auto;
    flex: 1;
    max-height: 220px;
  }

  &__table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.58rem;
    font-family: var(--font-mono);

    thead th {
      position: sticky;
      top: 0;
      background: var(--color-surface-2);
      padding: 0.3rem 0.45rem;
      text-align: right;
      color: var(--color-text);
      font-weight: 400;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      white-space: nowrap;
      border-bottom: 1px solid var(--color-border);

      &:first-child { text-align: left; }
    }

    tbody {
      td {
        padding: 0.28rem 0.45rem;
        text-align: right;
        color: var(--color-text);
        border-bottom: 1px solid rgba(255,255,255,0.04);
        white-space: nowrap;
      }
      tr:hover td { background: rgba(255,255,255,0.025); }
    }
  }

  &__row--lysis {
    td { background: rgba(255,77,109,0.06); }
    &:hover td { background: rgba(255,77,109,0.10); }
  }

  &__td-id     { text-align: left; opacity: 0.6; }
  &__td-mono   { text-align: left; }
  &__td-target  { color: var(--color-danger); }
  &__td-healthy { color: var(--color-primary); }
  &__td-sel    { color: var(--color-text-heading); font-weight: 600; }
  &__td-event  { text-transform: uppercase; opacity: 0.8; }
  &__td-empty  { text-align: center; opacity: 0.6; padding: 1rem; }
}
</style>
