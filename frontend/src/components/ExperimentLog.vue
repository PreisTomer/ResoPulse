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

<template>
  <div class="log-panel">
    <!-- Header row -->
    <div class="log-header">
      <input
        v-model="expStore.sessionName"
        class="session-name-input"
        placeholder="Session name…"
        spellcheck="false"
      />
      <div class="log-actions">
        <button
          class="log-btn log-btn--primary"
          v-tip="'<strong>Log Reading</strong>\nCapture a snapshot of the current experiment state:\nfrequency, field, Vm values, selectivity ratio,\ncell temperatures, and disruption ratios.'"
          @click="logReading"
        >Log Reading</button>
        <button
          class="log-btn"
          :disabled="!hasEntries"
          v-tip="'<strong>Export CSV</strong>\nDownload all log entries as a comma-separated file.\nIncludes all columns: time, freq, field, Vm,\nselectivity, temps, ratios, and event type.'"
          @click="exportCSV"
        >CSV</button>
        <button
          class="log-btn"
          :disabled="!hasEntries"
          v-tip="'Clear all log entries from this session.\nThis cannot be undone.'"
          @click="clearLog"
        >Clear</button>
      </div>
    </div>

    <!-- Table -->
    <div class="log-table-wrap">
      <table class="log-table">
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
            :class="{ 'row--lysis': e.event === 'lysis' }"
          >
            <td class="td-id">{{ e.id }}</td>
            <td class="td-mono">{{ e.timestamp }}</td>
            <td
              class="td-mono"
              v-tip="`<strong>Frequency: ${e.freqKHz} kHz</strong>\nBroadcast frequency at time of reading`"
            >{{ e.freqKHz }}k</td>
            <td
              class="td-mono"
              v-tip="`<strong>Field: ${e.fieldVcm} V/cm</strong>\nApplied electric field intensity`"
            >{{ e.fieldVcm }}</td>
            <td
              class="td-target"
              v-tip="`<strong>Target Vm: ${e.targetVm} mV</strong>\nTransmembrane potential of ${e.targetPreset}\nT-ratio: ${(e.targetRatio * 100).toFixed(1)}% of lysis threshold`"
            >{{ e.targetVm }}</td>
            <td
              class="td-healthy"
              v-tip="`<strong>Healthy Vm: ${e.healthyVm} mV</strong>\nTransmembrane potential of healthy reference cell\nH-ratio: ${(e.healthyRatio * 100).toFixed(1)}% of lysis threshold`"
            >{{ e.healthyVm }}</td>
            <td
              class="td-sel"
              v-tip="`<strong>Selectivity: ×${e.selectivity.toFixed(3)}</strong>\nT-Vm / H-Vm ratio\nT-temp: ${e.targetTemp}°C  ·  H-temp: ${e.healthyTemp}°C`"
            >{{ e.selectivity.toFixed(2) }}</td>
            <td
              class="td-event"
              v-tip="e.event === 'lysis' ? '<span class=\'tip-warn\'>Lysis event</span>\nTarget membrane was irreversibly disrupted\n(auto-logged by system)' : 'Manual reading\nLogged by user at this timestamp'"
            >{{ e.event }}</td>
          </tr>
          <tr v-if="!hasEntries">
            <td colspan="8" class="td-empty">No readings yet — click Log Reading to record</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.log-panel {
  background-color: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1;
  min-height: 0;
}

/* ── Header ──────────────────────────────────────────────────── */
.log-header {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.65rem 0.85rem;
  border-bottom: 1px solid var(--color-border);
  flex-wrap: wrap;
}

.session-name-input {
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
}
.session-name-input:focus { border-bottom-color: var(--color-primary); }

.log-actions { display: flex; gap: 0.35rem; flex-shrink: 0; }

.log-btn {
  font-size: 0.58rem;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.22rem 0.6rem;
  border: 1px solid var(--color-border);
  border-radius: 3px;
  background: transparent;
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}
.log-btn:hover:not(:disabled) { border-color: var(--color-primary); color: var(--color-primary); }
.log-btn:disabled { opacity: 0.3; cursor: not-allowed; }
.log-btn--primary { border-color: var(--color-primary); color: var(--color-primary); }
.log-btn--primary:hover { background: var(--color-primary-dim); }

/* ── Table ───────────────────────────────────────────────────── */
.log-table-wrap {
  overflow-y: auto;
  flex: 1;
  max-height: 220px;
}

.log-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.58rem;
  font-family: var(--font-mono);
}

.log-table thead th {
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
}
.log-table thead th:first-child { text-align: left; }

.log-table tbody td {
  padding: 0.28rem 0.45rem;
  text-align: right;
  color: var(--color-text);
  border-bottom: 1px solid rgba(255,255,255,0.04);
  white-space: nowrap;
}
.log-table tbody tr:hover td { background: rgba(255,255,255,0.025); }

.row--lysis td { background: rgba(255,77,109,0.06); }
.row--lysis:hover td { background: rgba(255,77,109,0.10); }

.td-id     { text-align: left; opacity: 0.6; }
.td-mono   { text-align: left; }
.td-target { color: #ff4d6d; }
.td-healthy { color: #00d4ff; }
.td-sel    { color: var(--color-text-heading); font-weight: 600; }
.td-event  { text-transform: uppercase; opacity: 0.8; }
.td-empty  { text-align: center; opacity: 0.6; padding: 1rem; }
</style>
