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
        <button class="log-btn log-btn--primary" @click="logReading">Log Reading</button>
        <button class="log-btn" :disabled="!hasEntries" @click="exportCSV">CSV</button>
        <button class="log-btn" :disabled="!hasEntries" @click="clearLog">Clear</button>
      </div>
    </div>

    <!-- Table -->
    <div class="log-table-wrap">
      <table class="log-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Time</th>
            <th>Freq</th>
            <th>Field</th>
            <th>T-Vm</th>
            <th>H-Vm</th>
            <th>Sel×</th>
            <th>Event</th>
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
            <td class="td-mono">{{ e.freqKHz }}k</td>
            <td class="td-mono">{{ e.fieldVcm }}</td>
            <td class="td-target">{{ e.targetVm }}</td>
            <td class="td-healthy">{{ e.healthyVm }}</td>
            <td class="td-sel">{{ e.selectivity.toFixed(2) }}</td>
            <td class="td-event">{{ e.event }}</td>
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
  color: var(--color-text-muted);
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
  color: var(--color-text-muted);
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
  color: var(--color-text-muted);
  border-bottom: 1px solid rgba(255,255,255,0.04);
  white-space: nowrap;
}
.log-table tbody tr:hover td { background: rgba(255,255,255,0.025); }

.row--lysis td { background: rgba(255,77,109,0.06); }
.row--lysis:hover td { background: rgba(255,77,109,0.10); }

.td-id     { text-align: left; opacity: 0.45; }
.td-mono   { text-align: left; }
.td-target { color: #ff4d6d; }
.td-healthy { color: #00d4ff; }
.td-sel    { color: var(--color-text-heading); font-weight: 600; }
.td-event  { text-transform: uppercase; opacity: 0.6; }
.td-empty  { text-align: center; opacity: 0.4; padding: 1rem; }
</style>
