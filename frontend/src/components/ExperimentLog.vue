<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="exp-log">

    <AccordionPanel
      :icon="ICON.LINES"
      :title="$t('exp.logTitle')"
      :subtitle="hasEntries ? $t('exp.logReadingsCount', { n: expStore.entries.length }) : $t('exp.logNoReadings')"
      :border-on-toggle="true"
    >
    <div>

    <!-- Header row -->
    <div class="exp-log__header">
      <input
        v-model="expStore.sessionName"
        class="exp-log__name-input"
        :placeholder="$t('exp.logSessionPlaceholder')"
        spellcheck="false"
      />
      <!-- Dosimetry badge -->
      <div class="exp-log__dose" v-tip="tipDose">
        <span class="exp-log__dose-label">{{ $t('log.doseLabel') }}</span>
        <span class="exp-log__dose-val">{{ doseBadge }}</span>
      </div>
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
            <th v-if="!isResonanceMode" v-tip="tipThDepH">{{ $t('log.logThDepH') }}</th>
            <th v-if="!isResonanceMode" v-tip="tipThDepT">{{ $t('log.logThDepT') }}</th>
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
            <td class="exp-log__td-mono" v-tip="tipCellFreq(e)">{{ formatFreqKHz(e.freqKHz) }}</td>
            <td class="exp-log__td-mono" v-tip="tipCellField(e)">{{ e.fieldVcm }}</td>
            <td class="exp-log__td-target" v-tip="tipCellTargetVm(e)">{{ e.targetVm }}</td>
            <td class="exp-log__td-healthy" v-tip="tipCellHealthyVm(e)">{{ e.healthyVm }}</td>
            <td class="exp-log__td-sel" v-tip="tipCellSel(e)">{{ e.selectivity.toFixed(2) }}</td>
            <td v-if="!isResonanceMode" class="exp-log__td-dep" :class="depKClass(e.depHealthyK)" v-tip="tipCellDepH(e)">{{ depKDisplay(e.depHealthyK) }}</td>
            <td v-if="!isResonanceMode" class="exp-log__td-dep" :class="depKClass(e.depTargetK)" v-tip="tipCellDepT(e)">{{ depKDisplay(e.depTargetK) }}</td>
            <td class="exp-log__td-event">
              <StatusBadge :label="e.event" :variant="eventVariant(e.event)" :tooltip="tipCellEvent(e)" />
            </td>
          </tr>
          <tr v-if="!hasEntries">
            <td :colspan="isResonanceMode ? 8 : 10" class="exp-log__td-empty">{{ $t('exp.logEmpty') }}</td>
          </tr>
        </tbody>
      </table>
    </div><!-- /exp-log__table-wrap -->

    </div>
    </AccordionPanel>
  </div><!-- /exp-log -->
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import AccordionPanel from '@/components/AccordionPanel.vue'
import StatusBadge from '@/components/StatusBadge.vue'
import { useExperimentStore } from '@/stores/experimentStore'
import { useCellStore } from '@/stores/cellStore'
import { broadcastLogEntry } from '@/services/socket'
import { LOG_EVENT } from '@/constants/strings'
import { ICON } from '@/constants/icons'
import { THRESHOLDS } from '@/constants/physics'
import { formatFreqKHz } from '@/utils/format'
import { UNIT } from '@/constants/units'

export default defineComponent({
  components: { AccordionPanel, StatusBadge },

  setup() {
    return {
      expStore: useExperimentStore(),
      cellStore: useCellStore(),
      LOG_EVENT,
      ICON,
      THRESHOLDS,
      formatFreqKHz,
    }
  },

  computed: {
    entries() {
      return this.expStore.entries.slice(-20).reverse()
    },
    hasEntries(): boolean { return this.expStore.entries.length > 0 },
    isResonanceMode(): boolean { return this.cellStore.chartMode === 'resonance' },

    // ── Button tooltips ────────────────────────────────────────────────────────
    tipLogReading(): string { return this.$t('log.tipLogReading') },
    tipExportCsv(): string  { return this.$t('log.tipExportCsv') },
    tipClearLog(): string   { return this.$t('log.tipClearLog') },

    // ── Column header tooltips ─────────────────────────────────────────────────
    tipThNumber(): string   { return this.$t('log.tipThNumber') },
    tipThTime(): string     { return this.$t('log.tipThTime') },
    tipThFreq(): string     { return this.$t('log.tipThFreq') },
    tipThField(): string    { return this.$t('log.tipThField') },
    tipThTargetVm(): string { return this.$t('log.tipThTargetVm') },
    tipThHealthyVm(): string { return this.$t('log.tipThHealthyVm') },

    tipThSel(): string {
      const { SEL_STRONG: strong, SEL_MARGINAL: marginal } = THRESHOLDS
      return this.$t('log.tipThSel', { strong, marginal })
    },

    tipThDepH(): string { return this.$t('log.tipThDepH') },
    tipThDepT(): string { return this.$t('log.tipThDepT') },

    tipThEvent(): string { return this.$t('log.tipThEvent') },

    /** Formatted cumulative dose badge text */
    doseBadge(): string {
      const dose = this.expStore.cumulativeDoseJkg
      if (dose >= 1000) return `${(dose / 1000).toFixed(2)} ${UNIT.KJ_PER_KG}`
      if (dose >= 1)    return `${dose.toFixed(1)} ${UNIT.J_PER_KG}`
      return `${(dose * 1000).toFixed(0)} ${UNIT.MJ_PER_KG}`
    },

    tipDose(): string { return this.$t('log.tipDose') },
  },

  methods: {
    logReading() {
      this.expStore.logReading(this.cellStore as Parameters<typeof this.expStore.logReading>[0], LOG_EVENT.MANUAL)
      const last = this.expStore.entries[this.expStore.entries.length - 1]
      if (last) broadcastLogEntry(last)
    },
    exportCSV()  { this.expStore.exportCSV() },
    clearLog()   { this.expStore.clearLog() },
    eventVariant(event: string): string {
      return event === LOG_EVENT.LYSIS ? 'danger' : 'primary'
    },

    // ── Row cell tooltips ──────────────────────────────────────────────────────
    tipCellFreq(e: { freqKHz: number }): string {
      return this.$t('log.tipCellFreq', { freq: e.freqKHz })
    },
    tipCellField(e: { fieldVcm: number }): string {
      return this.$t('log.tipCellField', { field: e.fieldVcm })
    },
    tipCellTargetVm(e: { targetVm: number; targetPreset: string; targetRatio: number }): string {
      return this.$t('log.tipCellTargetVm', {
        vm:     e.targetVm,
        preset: e.targetPreset,
        ratio:  (e.targetRatio * 100).toFixed(1),
      })
    },
    tipCellHealthyVm(e: { healthyVm: number; healthyRatio: number }): string {
      return this.$t('log.tipCellHealthyVm', {
        vm:    e.healthyVm,
        ratio: (e.healthyRatio * 100).toFixed(1),
      })
    },
    tipCellSel(e: { selectivity: number; targetTemp: number; healthyTemp: number }): string {
      return this.$t('log.tipCellSel', {
        sel:         e.selectivity.toFixed(2),
        targetTemp:  e.targetTemp,
        healthyTemp: e.healthyTemp,
      })
    },
    tipCellEvent(e: { event: string }): string {
      return e.event === LOG_EVENT.LYSIS
        ? this.$t('log.tipCellLysis')
        : this.$t('log.tipCellManual')
    },
    depKDisplay(k: number | undefined): string {
      if (k == null) return '—'
      return k.toFixed(3)
    },
    depKClass(k: number | undefined): string {
      if (k == null) return ''
      return k > 0 ? 'exp-log__td-pdep' : 'exp-log__td-ndep'
    },
    tipCellDepH(e: { depHealthyK?: number }): string {
      return this.$t('log.tipCellDepH', { k: e.depHealthyK != null ? e.depHealthyK.toFixed(4) : '—' })
    },
    tipCellDepT(e: { depTargetK?: number }): string {
      return this.$t('log.tipCellDepT', { k: e.depTargetK != null ? e.depTargetK.toFixed(4) : '—' })
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

  &__dose {
    @include flex-row(0.4rem);
    align-items:   center;
    padding:       0.18rem 0.65rem;
    border:        1px solid rgba(251, 191, 36, 0.3);
    border-radius: 3px;
    background:    rgba(251, 191, 36, 0.06);
    cursor:        help;
    flex-shrink:   0;
  }

  &__dose-label {
    @include mono-upper(0.55rem, 0.08em);
    color: rgba(251, 191, 36, 0.65);
  }

  &__dose-val {
    font-family: var(--font-mono);
    font-size:   0.68rem;
    font-weight: 600;
    color:       var(--color-amber);
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
  &__td-dep    { opacity: 0.85; }
  &__td-pdep   { color: var(--color-lime); }
  &__td-ndep   { color: var(--color-amber); }
  &__td-event  { text-align: right; }
  &__td-empty  { text-align: center; opacity: 0.6; padding: 1rem; }
}
</style>
