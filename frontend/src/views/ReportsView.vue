<template>
  <div class="reports">
    <div class="reports__inner">

      <!-- Page header -->
      <div class="reports__header">
        <div class="reports__eyebrow">
          <span class="reports__eyebrow-dot"></span>
          {{ $t('reports.eyebrow') }}
        </div>
        <div class="reports__header-row">
          <div>
            <h1 class="reports__title">{{ $t('reports.title') }}</h1>
            <p class="reports__subtitle">
              {{ $t('reports.subtitle') }}
            </p>
          </div>
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
      </div>

      <!-- Session name -->
      <div class="reports__session-row">
        <label class="reports__session-label">{{ $t('reports.sessionLabel') }}</label>
        <input
          v-model="store.sessionName"
          class="reports__session-input"
          :placeholder="$t('reports.sessionPlaceholder')"
          spellcheck="false"
        />
      </div>

      <!-- Stats row -->
      <div class="reports__stats-grid">
        <div class="reports__stat-card" :title="$t('reports.totalReadingsTitle')">
          <div class="reports__stat-value" :class="{ 'reports__stat-empty': totalReadings === 0 }">
            {{ totalReadings }}
          </div>
          <div class="reports__stat-label">{{ $t('reports.totalReadings') }}</div>
        </div>
        <div class="reports__stat-card" :title="$t('reports.lysisEventsTitle')">
          <div class="reports__stat-value reports__stat-lysis">{{ lysisEvents }}</div>
          <div class="reports__stat-label">{{ $t('reports.lysisEvents') }}</div>
        </div>
        <div class="reports__stat-card" :title="$t('reports.manualReadingsTitle')">
          <div class="reports__stat-value">{{ manualReadings }}</div>
          <div class="reports__stat-label">{{ $t('reports.manualReadings') }}</div>
        </div>
        <div class="reports__stat-card" :title="$t('reports.avgSelectivityTitle')">
          <div class="reports__stat-value reports__stat-primary">{{ avgSelectivity ?? '—' }}</div>
          <div class="reports__stat-label">{{ $t('reports.avgSelectivity') }}</div>
        </div>
        <div class="reports__stat-card" :title="$t('reports.peakSelectivityTitle')">
          <div class="reports__stat-value reports__stat-green">{{ peakSelectivity ?? '—' }}</div>
          <div class="reports__stat-label">{{ $t('reports.peakSelectivity') }}</div>
        </div>
        <div class="reports__stat-card" :title="$t('reports.peakTargetRatioTitle')">
          <div class="reports__stat-value reports__stat-red">{{ peakTargetRatio ?? '—' }}</div>
          <div class="reports__stat-label">{{ $t('reports.peakTargetRatio') }}</div>
        </div>
        <div class="reports__stat-card reports__stat-card--wide" :title="$t('reports.freqRangeTitle')">
          <div class="reports__stat-value reports__stat-small">{{ freqRange ?? '—' }}</div>
          <div class="reports__stat-label">{{ $t('reports.freqRange') }}</div>
        </div>
        <div class="reports__stat-card reports__stat-card--wide" :title="$t('reports.fieldRangeTitle')">
          <div class="reports__stat-value reports__stat-small">{{ fieldRange ?? '—' }}</div>
          <div class="reports__stat-label">{{ $t('reports.fieldRange') }}</div>
        </div>
      </div>

      <!-- Log table -->
      <div class="reports__log-card">
        <div class="reports__log-card-hdr">
          <span class="reports__log-title">{{ $t('reports.logTitle') }}</span>
          <span class="reports__log-count">
            {{ totalReadings }} {{ totalReadings === 1 ? $t('reports.countSingular') : $t('reports.countPlural') }}
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

        <!-- Data table -->
        <div v-else class="reports__table-wrap">
          <table class="reports__table">
            <thead>
              <tr>
                <th>{{ $t('reports.colId') }}</th>
                <th>{{ $t('reports.colTime') }}</th>
                <th>{{ $t('reports.colTarget') }}</th>
                <th>{{ $t('reports.colFreq') }}</th>
                <th>{{ $t('reports.colField') }}</th>
                <th>{{ $t('reports.colMedium') }}</th>
                <th :title="$t('reports.colTVmTitle')">{{ $t('reports.colTVm') }}</th>
                <th :title="$t('reports.colHVmTitle')">{{ $t('reports.colHVm') }}</th>
                <th :title="$t('reports.colSelectivityTitle')">{{ $t('reports.colSelectivity') }}</th>
                <th :title="$t('reports.colTRatioTitle')">{{ $t('reports.colTRatio') }}</th>
                <th :title="$t('reports.colHRatioTitle')">{{ $t('reports.colHRatio') }}</th>
                <th :title="$t('reports.colTTempTitle')">{{ $t('reports.colTTemp') }}</th>
                <th :title="$t('reports.colHTempTitle')">{{ $t('reports.colHTemp') }}</th>
                <th :title="$t('reports.colEventTitle')">{{ $t('reports.colEvent') }}</th>
                <th :title="$t('reports.colMethodsTitle')">{{ $t('reports.colMethods') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="e in reversedEntries"
                :key="e.id"
                :class="{ 'reports__row--lysis': e.event === LOG_EVENT.LYSIS }"
              >
                <td class="reports__mono reports__muted">{{ e.id }}</td>
                <td class="reports__mono reports__timestamp">{{ e.timestamp }}</td>
                <td class="reports__mono">{{ e.targetPreset }}</td>
                <td class="reports__mono">{{ formatFreqKHz(e.freqKHz, 1) }}</td>
                <td class="reports__mono">{{ formatFieldVcm(e.fieldVcm) }}</td>
                <td class="reports__mono reports__muted">{{ e.medium }}</td>
                <td class="reports__mono reports__cancer-val">{{ e.targetVm.toFixed(3) }}</td>
                <td class="reports__mono reports__ref-val">{{ e.healthyVm.toFixed(3) }}</td>
                <td class="reports__mono" :class="selClass(e.selectivity)">
                  {{ e.selectivity.toFixed(3) }}
                </td>
                <td
                  class="reports__mono"
                  :class="e.targetRatio >= THRESHOLDS.LYSIS_PROB_CENTER ? 'reports__cancer-val' : e.targetRatio >= THRESHOLDS.HEALTHY_APPROACHING ? 'reports__warn-val' : ''"
                >{{ (e.targetRatio * 100).toFixed(1) }}%</td>
                <td class="reports__mono reports__ref-val">{{ (e.healthyRatio * 100).toFixed(1) }}%</td>
                <td class="reports__mono" :class="e.targetTemp > THRESHOLDS.TEMP_WARN ? 'reports__warn-val' : ''">
                  {{ e.targetTemp.toFixed(1) }}
                </td>
                <td class="reports__mono" :class="e.healthyTemp > THRESHOLDS.TEMP_WARN ? 'reports__warn-val' : ''">
                  {{ e.healthyTemp.toFixed(1) }}
                </td>
                <td>
                  <span class="reports__ev-badge" :class="eventClass(e.event)">{{ e.event }}</span>
                </td>
                <td>
                  <button
                    class="reports__methods-row-btn"
                    :title="e.healthySnap ? $t('reports.colMethodsTitle') : $t('reports.colMethodsLegacy')"
                    @click="store.exportEntryMethods(e)"
                  >↓ Methods</button>
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
        </div>
      </div>

    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { useExperimentStore } from '@/stores/experimentStore'
import { formatFreqKHz, formatFieldVcm } from '@/utils/format'
import { LOG_EVENT } from '@/constants/strings'
import { THRESHOLDS } from '@/constants/cellCard'
import { ICON } from '@/constants/icons'

export default defineComponent({
  setup() {
    const store = useExperimentStore()

    const totalReadings   = computed(() => store.entries.length)
    const reversedEntries = computed(() => [...store.entries].reverse())
    const lysisEvents     = computed(() => store.entries.filter((e) => e.event === LOG_EVENT.LYSIS).length)
    const manualReadings  = computed(() => store.entries.filter((e) => e.event === LOG_EVENT.MANUAL).length)

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
      return lo === hi ? formatFreqKHz(lo) : `${formatFreqKHz(lo)} – ${formatFreqKHz(hi)}`
    })

    const fieldRange = computed(() => {
      if (!store.entries.length) return null
      const fields = store.entries.map((e) => e.fieldVcm)
      const lo = Math.min(...fields)
      const hi = Math.max(...fields)
      return lo === hi ? formatFieldVcm(lo) : `${formatFieldVcm(lo)} – ${formatFieldVcm(hi)}`
    })

    const peakTargetRatio = computed(() => {
      if (!store.entries.length) return null
      return (Math.max(...store.entries.map((e) => e.targetRatio)) * 100).toFixed(1) + '%'
    })

    function eventClass(event: string) {
      return event === LOG_EVENT.LYSIS ? 'reports__ev-badge--lysis' : 'reports__ev-badge--manual'
    }

    function selClass(sel: number) {
      if (sel >= THRESHOLDS.SEL_STRONG)   return 'reports__green-val'
      if (sel >= THRESHOLDS.SEL_MARGINAL) return 'reports__warn-val'
      return 'reports__cancer-val'
    }

    return {
      store,
      totalReadings,
      reversedEntries,
      lysisEvents,
      manualReadings,
      avgSelectivity,
      peakSelectivity,
      freqRange,
      fieldRange,
      peakTargetRatio,
      eventClass,
      selClass,
      formatFreqKHz,
      formatFieldVcm,
      LOG_EVENT,
      THRESHOLDS,
      ICON,
    }
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

  /* ── Page header ──────────────────────────────────────────────────────────── */
  &__eyebrow {
    @include flex-row(0.5rem);
    @include mono-upper(0.72rem, 0.14em);
    color: var(--color-primary);
    margin-bottom: 0.75rem;
  }

  &__eyebrow-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: var(--color-primary);
    box-shadow: 0 0 8px var(--color-primary);
  }

  &__header-row {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
  }

  &__title {
    font-size: 2rem;
    font-weight: 800;
    color: var(--color-text-heading);
    margin: 0 0 0.5rem;
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

  /* ── Session name ─────────────────────────────────────────────────────────── */
  &__session-row {
    @include flex-row(0.85rem);
  }

  &__session-label {
    @include mono-upper(0.72rem, 0.1em);
    color: var(--color-text-muted);
    flex-shrink: 0;
  }

  &__session-input {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    padding: 0.45rem 0.85rem;
    font-size: 0.9rem;
    font-family: var(--font-mono);
    color: var(--color-text-heading);
    width: 240px;
    transition: border-color 0.15s;

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }
  }

  /* ── Stats ────────────────────────────────────────────────────────────────── */
  &__stats-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: 0.75rem;
  }

  &__stat-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    padding: 1rem 1.1rem;
    display: flex;
    flex-direction: column;
    gap: 0.35rem;

    &--wide { grid-column: span 1; }
  }

  &__stat-value {
    font-size: 1.55rem;
    font-weight: 800;
    font-family: var(--font-mono);
    color: var(--color-text-heading);
    line-height: 1;

    &.reports__stat-empty   { color: var(--color-text-muted); opacity: 0.35; }
    &.reports__stat-lysis   { color: var(--color-danger); }
    &.reports__stat-primary { color: var(--color-primary); }
    &.reports__stat-green   { color: var(--color-lime);   }
    &.reports__stat-red     { color: var(--color-danger); }
  }

  &__stat-small {
    font-size: 0.82rem;
    line-height: 1.4;
    padding-top: 0.2rem;
    color: var(--color-text);
  }

  &__stat-label {
    font-size: 0.64rem;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-text-muted);
  }

  /* ── Log card ─────────────────────────────────────────────────────────────── */
  &__log-card {
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    overflow: hidden;
  }

  &__log-card-hdr {
    display: flex;
    align-items: center;
    justify-content: space-between;
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
    min-width: 1200px;

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

  /* Utility colours */
  &__mono       { font-family: var(--font-mono); }
  &__muted      { color: var(--color-text-muted); }
  &__cancer-val { color: var(--color-danger);  }
  &__ref-val    { color: var(--color-primary); }
  &__green-val  { color: var(--color-lime);   }
  &__warn-val   { color: var(--color-amber);  }

  /* Event badges */
  &__ev-badge {
    font-size: 0.62rem;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 0.15rem 0.45rem;
    border-radius: 3px;
    border: 1px solid;

    &--manual {
      color: var(--color-primary);
      border-color: rgba(0, 212, 255, 0.35);
      background: rgba(0, 212, 255, 0.08);
    }

    &--lysis {
      color: var(--color-danger);
      border-color: rgba(255, 77, 109, 0.35);
      background: rgba(255, 77, 109, 0.08);
    }
  }

  /* Per-row methods download button */
  &__methods-row-btn {
    padding: 0.18rem 0.45rem;
    font-size: 0.62rem;
    font-family: var(--font-mono);
    font-weight: 600;
    letter-spacing: 0.04em;
    color: #c4b5fd;
    background: rgba(167, 139, 250, 0.08);
    border: 1px solid rgba(167, 139, 250, 0.3);
    border-radius: 3px;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;

    &:hover {
      background: rgba(167, 139, 250, 0.2);
      border-color: rgba(167, 139, 250, 0.7);
      color: #e9d5ff;
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
}

// Media queries → _responsive.scss
</style>
