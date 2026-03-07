<template>
  <div class="exp-log">
    <!-- Header row -->
    <div class="exp-log__header">
      <input
        v-model="expStore.sessionName"
        class="exp-log__name-input"
        placeholder="Session name…"
        spellcheck="false"
      />
      <div class="exp-log__actions">
        <button
          class="exp-log__btn exp-log__btn--primary"
          v-tip="'<strong>Log Reading</strong>\nCapture a snapshot of the current experiment state:\nfrequency, field, Vm values, selectivity ratio,\ncell temperatures, and disruption ratios.'"
          @click="logReading"
        >Log Reading</button>
        <button
          class="exp-log__btn"
          :disabled="!hasEntries"
          v-tip="'<strong>Export CSV</strong>\nDownload all log entries as a comma-separated file.\nIncludes all columns: time, freq, field, Vm,\nselectivity, temps, ratios, and event type.'"
          @click="exportCSV"
        >CSV</button>
        <button
          class="exp-log__btn"
          :disabled="!hasEntries"
          v-tip="'Clear all log entries from this session.\nThis cannot be undone.'"
          @click="clearLog"
        >Clear</button>
      </div>
    </div>

    <!-- Table -->
    <div class="exp-log__table-wrap">
      <table class="exp-log__table">
        <thead>
          <tr>
            <th v-tip="'Entry number\n(newest entries shown first)'">#</th>
            <th v-tip="'Timestamp of the reading\n(HH:MM:SS local time)'">Time</th>
            <th v-tip="'<strong>RF Frequency</strong>\nBroadcast frequency at time of reading (kHz)\nAffects transmembrane potential via Schwan eq.\nBelow fc → quasi-DC maximum Vm'">Freq</th>
            <th v-tip="'<strong>Field Intensity</strong>\nApplied electric field strength (V/cm)\nVm scales linearly with this value\nDefault 150 V/cm = sub-threshold'">Field</th>
            <th v-tip="'<strong>T-Vm — Target Transmembrane Potential</strong>\nPeak voltage induced across the target\n(cancer / pathogen) cell membrane (mV)\nComputed via Schwan equation\nHigher = greater disruption potential'">T-Vm</th>
            <th v-tip="'<strong>H-Vm — Healthy Transmembrane Potential</strong>\nPeak voltage induced across the healthy\nreference cell membrane (mV)\nShould be kept low for tissue safety'">H-Vm</th>
            <th v-tip="'<strong>Sel× — Selectivity Ratio</strong>\nT-Vm / H-Vm\n>1.5 = strong therapeutic window (green)\n1.0–1.5 = marginal window\n<1.0 = non-selective'">Sel×</th>
            <th v-tip="'<strong>Event type</strong>\nmanual — user clicked Log Reading\nlysis — target membrane was disrupted\n(auto-logged when lysis countdown completes)'">Event</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="e in entries"
            :key="e.id"
            :class="{ 'exp-log__row--lysis': e.event === 'lysis' }"
          >
            <td class="exp-log__td-id">{{ e.id }}</td>
            <td class="exp-log__td-mono">{{ e.timestamp }}</td>
            <td
              class="exp-log__td-mono"
              v-tip="`<strong>Frequency: ${e.freqKHz} kHz</strong>\nBroadcast frequency at time of reading`"
            >{{ e.freqKHz }}k</td>
            <td
              class="exp-log__td-mono"
              v-tip="`<strong>Field: ${e.fieldVcm} V/cm</strong>\nApplied electric field intensity`"
            >{{ e.fieldVcm }}</td>
            <td
              class="exp-log__td-target"
              v-tip="`<strong>Target Vm: ${e.targetVm} mV</strong>\nTransmembrane potential of ${e.targetPreset}\nT-ratio: ${(e.targetRatio * 100).toFixed(1)}% of lysis threshold`"
            >{{ e.targetVm }}</td>
            <td
              class="exp-log__td-healthy"
              v-tip="`<strong>Healthy Vm: ${e.healthyVm} mV</strong>\nTransmembrane potential of healthy reference cell\nH-ratio: ${(e.healthyRatio * 100).toFixed(1)}% of lysis threshold`"
            >{{ e.healthyVm }}</td>
            <td
              class="exp-log__td-sel"
              v-tip="`<strong>Selectivity: ×${e.selectivity.toFixed(3)}</strong>\nT-Vm / H-Vm ratio\nT-temp: ${e.targetTemp}°C  ·  H-temp: ${e.healthyTemp}°C`"
            >{{ e.selectivity.toFixed(2) }}</td>
            <td
              class="exp-log__td-event"
              v-tip="e.event === 'lysis' ? '<span class=\'tip-warn\'>Lysis event</span>\nTarget membrane was irreversibly disrupted\n(auto-logged by system)' : 'Manual reading\nLogged by user at this timestamp'"
            >{{ e.event }}</td>
          </tr>
          <tr v-if="!hasEntries">
            <td colspan="8" class="exp-log__td-empty">No readings yet — click Log Reading to record</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useExperimentStore } from '../stores/experimentStore'
import { useCellStore } from '../stores/cellStore'

export default defineComponent({
  setup() {
    return {
      expStore: useExperimentStore(),
      cellStore: useCellStore(),
    }
  },

  computed: {
    entries() {
      return [...this.expStore.entries].reverse().slice(0, 20)
    },
    hasEntries(): boolean { return this.expStore.entries.length > 0 },
  },

  methods: {
    logReading() {
      this.expStore.logReading(this.cellStore as Parameters<typeof this.expStore.logReading>[0], 'manual')
    },
    exportCSV()  { this.expStore.exportCSV() },
    clearLog()   { this.expStore.clearLog() },
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
