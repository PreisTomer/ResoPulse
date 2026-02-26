<script lang="ts">
import { defineComponent, computed } from 'vue'
import { useExperimentStore } from '../stores/experimentStore'

export default defineComponent({
  setup() {
    const store = useExperimentStore()

    const totalReadings = computed(() => store.entries.length)
    const lysisEvents = computed(() => store.entries.filter((e) => e.event === 'lysis').length)
    const manualReadings = computed(() => store.entries.filter((e) => e.event === 'manual').length)

    const avgSelectivity = computed(() => {
      if (!store.entries.length) return null
      const sum = store.entries.reduce((acc, e) => acc + e.selectivity, 0)
      return (sum / store.entries.length).toFixed(3)
    })

    const peakSelectivity = computed(() => {
      if (!store.entries.length) return null
      return Math.max(...store.entries.map((e) => e.selectivity)).toFixed(3)
    })

    const freqRange = computed(() => {
      if (!store.entries.length) return null
      const freqs = store.entries.map((e) => e.freqKHz)
      const lo = Math.min(...freqs)
      const hi = Math.max(...freqs)
      return lo === hi ? `${lo} kHz` : `${lo} – ${hi} kHz`
    })

    const fieldRange = computed(() => {
      if (!store.entries.length) return null
      const fields = store.entries.map((e) => e.fieldVcm)
      const lo = Math.min(...fields)
      const hi = Math.max(...fields)
      return lo === hi ? `${lo} V/cm` : `${lo} – ${hi} V/cm`
    })

    const peakTargetRatio = computed(() => {
      if (!store.entries.length) return null
      return (Math.max(...store.entries.map((e) => e.targetRatio)) * 100).toFixed(1) + '%'
    })

    function eventClass(event: string) {
      return event === 'lysis' ? 'ev-lysis' : 'ev-manual'
    }

    function selClass(sel: number) {
      if (sel >= 1.5) return 'green-val'
      if (sel >= 1.0) return 'warn-val'
      return 'cancer-val'
    }

    return {
      store,
      totalReadings,
      lysisEvents,
      manualReadings,
      avgSelectivity,
      peakSelectivity,
      freqRange,
      fieldRange,
      peakTargetRatio,
      eventClass,
      selClass,
    }
  },
})
</script>

<template>
  <div class="reports-page">
    <div class="reports-inner">

      <!-- Page header -->
      <div class="page-header">
        <div class="page-eyebrow">
          <span class="eyebrow-dot"></span>
          Session History
        </div>
        <div class="header-row">
          <div>
            <h1 class="page-title">Experiment Reports</h1>
            <p class="page-subtitle">
              Session log · recorded readings · lysis events · CSV export
            </p>
          </div>
          <div class="header-actions">
            <button
              class="btn-action btn-export"
              :disabled="totalReadings === 0"
              @click="store.exportCSV()"
            >
              ↓ Export CSV
            </button>
            <button
              class="btn-action btn-clear"
              :disabled="totalReadings === 0"
              @click="store.clearLog()"
            >
              Clear Log
            </button>
          </div>
        </div>
      </div>

      <!-- Session name -->
      <div class="session-row">
        <label class="session-label">Session Name</label>
        <input
          v-model="store.sessionName"
          class="session-input"
          placeholder="Session 001"
          spellcheck="false"
        />
      </div>

      <!-- Stats row -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-value" :class="{ 'stat-empty': totalReadings === 0 }">
            {{ totalReadings }}
          </div>
          <div class="stat-label">Total Readings</div>
        </div>
        <div class="stat-card">
          <div class="stat-value stat-lysis">{{ lysisEvents }}</div>
          <div class="stat-label">Lysis Events</div>
        </div>
        <div class="stat-card">
          <div class="stat-value">{{ manualReadings }}</div>
          <div class="stat-label">Manual Logs</div>
        </div>
        <div class="stat-card">
          <div class="stat-value stat-primary">{{ avgSelectivity ?? '—' }}</div>
          <div class="stat-label">Avg Selectivity</div>
        </div>
        <div class="stat-card">
          <div class="stat-value stat-green">{{ peakSelectivity ?? '—' }}</div>
          <div class="stat-label">Peak Selectivity</div>
        </div>
        <div class="stat-card">
          <div class="stat-value stat-red">{{ peakTargetRatio ?? '—' }}</div>
          <div class="stat-label">Peak T-Disruption</div>
        </div>
        <div class="stat-card stat-card--wide">
          <div class="stat-value stat-small">{{ freqRange ?? '—' }}</div>
          <div class="stat-label">Frequency Range</div>
        </div>
        <div class="stat-card stat-card--wide">
          <div class="stat-value stat-small">{{ fieldRange ?? '—' }}</div>
          <div class="stat-label">Field Range</div>
        </div>
      </div>

      <!-- Log table -->
      <div class="log-card">
        <div class="log-card-hdr">
          <span class="log-title">Experiment Log</span>
          <span class="log-count">
            {{ totalReadings }} {{ totalReadings === 1 ? 'entry' : 'entries' }}
          </span>
        </div>

        <!-- Empty state -->
        <div v-if="totalReadings === 0" class="log-empty">
          <div class="empty-icon">◎</div>
          <div class="empty-text">No readings recorded yet</div>
          <p class="empty-sub">
            Go to the Experiment Lab and click "Log Reading", or trigger a lysis event to
            automatically record a session entry.
          </p>
          <RouterLink to="/experiment" class="empty-btn">
            Open Experiment Lab →
          </RouterLink>
        </div>

        <!-- Data table -->
        <div v-else class="table-wrap">
          <table class="log-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Time</th>
                <th>Target</th>
                <th>Freq (kHz)</th>
                <th>Field (V/cm)</th>
                <th>Medium</th>
                <th title="Schwan transmembrane potential — ≈0 in Resonance mode (see T-Ratio %)">T-Vm (mV) ¹</th>
                <th title="Schwan transmembrane potential — ≈0 in Resonance mode (see H-Ratio %)">H-Vm (mV) ¹</th>
                <th title="Selectivity = targetDisruptionRatio / healthyDisruptionRatio — valid in both IRE and Resonance mode">Selectivity</th>
                <th title="Target disruption ratio — uses acoustic resonance model for bacteria/virus, Schwan model for cancer">T-Ratio %</th>
                <th title="Healthy cell disruption ratio — always Schwan-based (≈0 at GHz for Resonance mode)">H-Ratio %</th>
                <th>T-Temp (°C)</th>
                <th>H-Temp (°C)</th>
                <th>Event</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="e in store.entries"
                :key="e.id"
                :class="{ 'row-lysis': e.event === 'lysis' }"
              >
                <td class="mono muted">{{ e.id }}</td>
                <td class="mono">{{ e.timestamp }}</td>
                <td class="mono">{{ e.targetPreset }}</td>
                <td class="mono">{{ e.freqKHz }}</td>
                <td class="mono">{{ e.fieldVcm }}</td>
                <td class="mono muted">{{ e.medium }}</td>
                <td class="mono cancer-val">{{ e.targetVm.toFixed(3) }}</td>
                <td class="mono ref-val">{{ e.healthyVm.toFixed(3) }}</td>
                <td class="mono" :class="selClass(e.selectivity)">
                  {{ e.selectivity.toFixed(3) }}
                </td>
                <td
                  class="mono"
                  :class="e.targetRatio >= 1 ? 'cancer-val' : e.targetRatio >= 0.5 ? 'warn-val' : ''"
                >{{ (e.targetRatio * 100).toFixed(1) }}%</td>
                <td class="mono ref-val">{{ (e.healthyRatio * 100).toFixed(1) }}%</td>
                <td class="mono" :class="e.targetTemp > 42 ? 'warn-val' : ''">
                  {{ e.targetTemp.toFixed(1) }}
                </td>
                <td class="mono" :class="e.healthyTemp > 42 ? 'warn-val' : ''">
                  {{ e.healthyTemp.toFixed(1) }}
                </td>
                <td>
                  <span class="ev-badge" :class="eventClass(e.event)">{{ e.event }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Legend -->
        <div v-if="totalReadings > 0" class="log-legend">
          <span class="legend-item">
            <span class="lc cancer-val">■</span> Target value / high disruption
          </span>
          <span class="legend-item">
            <span class="lc ref-val">■</span> Healthy / reference value
          </span>
          <span class="legend-item">
            <span class="lc green-val">■</span> Selectivity ≥ 1.5× (therapeutic window)
          </span>
          <span class="legend-item">
            <span class="lc warn-val">■</span> Selectivity 1.0–1.5× or temperature warning
          </span>
          <span class="legend-item footnote-item">
            ¹ T-Vm / H-Vm: Schwan transmembrane potential (mV). In Resonance mode (bacteria/virus at GHz), these are ≈ 0 — use T-Ratio % / H-Ratio % as the primary disruption metrics.
          </span>
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
/* ── Page shell ───────────────────────────────────────────────────────────── */
.reports-page {
  flex: 1;
  overflow-y: auto;
  background-color: var(--color-bg);
}

.reports-inner {
  max-width: 1600px;
  margin: 0 auto;
  padding: 2rem 2rem 4rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* ── Page header ──────────────────────────────────────────────────────────── */
.page-eyebrow {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.72rem;
  color: var(--color-primary);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-family: var(--font-mono);
  margin-bottom: 0.75rem;
}

.eyebrow-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background-color: var(--color-primary);
  box-shadow: 0 0 8px var(--color-primary);
}

.header-row {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.page-title {
  font-size: 2rem;
  font-weight: 800;
  color: var(--color-text-heading);
  margin: 0 0 0.5rem;
}

.page-subtitle {
  font-size: 0.875rem;
  color: var(--color-text-muted);
  margin: 0;
  font-family: var(--font-mono);
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  flex-shrink: 0;
}

.btn-action {
  padding: 0.5rem 1.1rem;
  border-radius: var(--radius);
  font-size: 0.82rem;
  font-family: var(--font-mono);
  font-weight: 600;
  border: 1px solid;
  cursor: pointer;
  transition: all 0.15s;
  background: transparent;
}

.btn-action:disabled { opacity: 0.3; cursor: not-allowed; }

.btn-export {
  color: var(--color-primary);
  border-color: rgba(0, 212, 255, 0.35);
  background: var(--color-primary-dim);
}

.btn-export:hover:not(:disabled) {
  background: rgba(0, 212, 255, 0.2);
  border-color: var(--color-primary);
}

.btn-clear {
  color: var(--color-danger);
  border-color: rgba(255, 77, 109, 0.35);
}

.btn-clear:hover:not(:disabled) {
  background: rgba(255, 77, 109, 0.1);
}

/* ── Session name ─────────────────────────────────────────────────────────── */
.session-row {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.session-label {
  font-size: 0.72rem;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
  flex-shrink: 0;
}

.session-input {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.45rem 0.85rem;
  font-size: 0.9rem;
  font-family: var(--font-mono);
  color: var(--color-text-heading);
  width: 240px;
  transition: border-color 0.15s;
}

.session-input:focus {
  outline: none;
  border-color: var(--color-primary);
}

/* ── Stats ────────────────────────────────────────────────────────────────── */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 0.75rem;
}

.stat-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.stat-card--wide {
  grid-column: span 1;
}

.stat-value {
  font-size: 1.55rem;
  font-weight: 800;
  font-family: var(--font-mono);
  color: var(--color-text-heading);
  line-height: 1;
}

.stat-value.stat-empty   { color: var(--color-text-muted); opacity: 0.35; }
.stat-value.stat-lysis   { color: var(--color-danger); }
.stat-value.stat-primary { color: var(--color-primary); }
.stat-value.stat-green   { color: var(--color-lime);   }
.stat-value.stat-red     { color: var(--color-danger); }
.stat-value.stat-small {
  font-size: 0.82rem;
  line-height: 1.4;
  padding-top: 0.2rem;
  color: var(--color-text);
}

.stat-label {
  font-size: 0.64rem;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--color-text-muted);
}

/* ── Log card ─────────────────────────────────────────────────────────────── */
.log-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.log-card-hdr {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.log-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-heading);
}

.log-count {
  font-size: 0.68rem;
  font-family: var(--font-mono);
  color: var(--color-text-muted);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  padding: 0.15rem 0.5rem;
}

/* ── Empty state ──────────────────────────────────────────────────────────── */
.log-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  gap: 0.75rem;
  text-align: center;
}

.empty-icon {
  font-size: 2.5rem;
  color: var(--color-border);
}

.empty-text {
  font-size: 1rem;
  font-weight: 600;
  color: var(--color-text-muted);
}

.empty-sub {
  font-size: 0.82rem;
  color: var(--color-text-muted);
  opacity: 0.65;
  max-width: 380px;
  line-height: 1.6;
  margin: 0;
}

.empty-btn {
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
}

.empty-btn:hover {
  background: rgba(0, 212, 255, 0.15);
  border-color: var(--color-primary);
}

/* ── Log table ────────────────────────────────────────────────────────────── */
.table-wrap { overflow-x: auto; }

.log-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.78rem;
  min-width: 1060px;
}

.log-table th {
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

.log-table td {
  padding: 0.52rem 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  white-space: nowrap;
}

.log-table tr:last-child td { border-bottom: none; }
.log-table tr:hover td { background: rgba(255, 255, 255, 0.025); }
.row-lysis td { background: rgba(255, 77, 109, 0.04); }
.row-lysis:hover td { background: rgba(255, 77, 109, 0.08) !important; }

/* Utility colours */
.mono       { font-family: var(--font-mono); }
.muted      { color: var(--color-text-muted); }
.cancer-val { color: var(--color-danger);  }
.ref-val    { color: var(--color-primary); }
.green-val  { color: var(--color-lime);   }
.warn-val   { color: var(--color-amber);  }

/* Event badges */
.ev-badge {
  font-size: 0.62rem;
  font-family: var(--font-mono);
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.15rem 0.45rem;
  border-radius: 3px;
  border: 1px solid;
}

.ev-manual {
  color: var(--color-primary);
  border-color: rgba(0, 212, 255, 0.35);
  background: rgba(0, 212, 255, 0.08);
}

.ev-lysis {
  color: var(--color-danger);
  border-color: rgba(255, 77, 109, 0.35);
  background: rgba(255, 77, 109, 0.08);
}

/* ── Legend ───────────────────────────────────────────────────────────────── */
.log-legend {
  display: flex;
  gap: 1.25rem;
  flex-wrap: wrap;
  padding: 0.75rem 1.5rem;
  border-top: 1px solid var(--color-border);
  font-size: 0.7rem;
  font-family: var(--font-mono);
  color: var(--color-text-muted);
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.lc { font-size: 0.85rem; }

.footnote-item {
  width: 100%;
  font-size: 0.65rem;
  color: var(--color-text-muted);
  opacity: 0.65;
  margin-top: 0.15rem;
  line-height: 1.5;
}

/* ── Responsive ───────────────────────────────────────────────────────────── */
@media (max-width: 1100px) {
  .stats-grid { grid-template-columns: repeat(4, 1fr); }
}

@media (max-width: 700px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .reports-inner { padding: 1rem 1rem 3rem; }
  .header-row { flex-direction: column; align-items: flex-start; }
}
</style>
