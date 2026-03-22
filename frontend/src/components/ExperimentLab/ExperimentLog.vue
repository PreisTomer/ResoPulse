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
      <!-- Session group: name + cumulative dose badge (both session-level) -->
      <div class="exp-log__session-group">
        <input
          v-model="expStore.sessionName"
          class="exp-log__name-input"
          :placeholder="$t('exp.logSessionPlaceholder')"
          spellcheck="false"
        />
        <div class="exp-log__dose" v-tip="$t('log.tipDose')">
          <span class="exp-log__dose-label">{{ $t('log.doseLabel') }}</span>
          <span class="exp-log__dose-val">{{ doseBadge }}</span>
        </div>
      </div>
      <div class="exp-log__actions">
        <button
          class="exp-log__btn exp-log__btn--primary"
          v-tip="$t('log.tipLogReading')"
          @click="logReading"
        >{{ $t('exp.logReadingBtn') }}</button>
        <button
          class="exp-log__btn"
          :disabled="!hasEntries"
          v-tip="$t('log.tipExportMethods')"
          @click="exportLastEntryMethods"
        >{{ ICON.ARROW_D }} {{ $t('exp.logMethodsBtn') }}</button>
        <button
          class="exp-log__btn"
          :disabled="!hasEntries"
          v-tip="$t('log.tipExportCsv')"
          @click="exportCSV"
        >{{ ICON.ARROW_D }} {{ $t('exp.logCsvBtn') }}</button>
        <button
          class="exp-log__btn"
          :disabled="!hasEntries"
          v-tip="$t('log.tipClearLog')"
          @click="clearLog"
        >{{ $t('exp.logClearBtn') }}</button>
      </div>
    </div>

    <!-- Table -->
    <div class="exp-log__table-wrap">
      <table class="exp-log__table">
        <thead>
          <tr>
            <th v-if="showSessionCol" v-tip="$t('log.tipThSession')">{{ $t('log.colSession') }}</th>
            <th v-tip="$t('log.tipThNumber')">{{ $t('exp.logThNumber') }}</th>
            <th v-tip="$t('log.tipThTime')">{{ $t('exp.logThTime') }}</th>
            <th v-tip="$t('log.tipThFreq')">{{ $t('exp.logThFreq') }}</th>
            <th v-tip="$t('log.tipThField')">{{ $t('exp.logThField') }}</th>
            <!-- Schwan mode: membrane voltage + selectivity ratio -->
            <th v-if="!isResonanceMode" v-tip="$t('log.tipThTargetVm')">{{ $t('exp.logThTargetVm') }}</th>
            <th v-if="!isResonanceMode" v-tip="$t('log.tipThHealthyVm')">{{ $t('exp.logThHealthyVm') }}</th>
            <th v-if="!isResonanceMode" v-tip="tipThSel">{{ $t('exp.logThSel') }}</th>
            <!-- Resonance mode: disruption ratios (Lorentzian model) -->
            <th v-if="isResonanceMode" v-tip="$t('log.tipThTargetDR')">{{ $t('log.logThTargetDR') }}</th>
            <th v-if="isResonanceMode" v-tip="$t('log.tipThHealthyDR')">{{ $t('log.logThHealthyDR') }}</th>
            <th v-if="!isResonanceMode" v-tip="$t('log.tipThDepH')">{{ $t('log.logThDepH') }}</th>
            <th v-if="!isResonanceMode" v-tip="$t('log.tipThDepT')">{{ $t('log.logThDepT') }}</th>
            <th v-tip="$t('log.tipThEvent')">{{ $t('exp.logThEvent') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="e in entries"
            :key="e.id"
            :class="{ 'exp-log__row--lysis': e.event === LOG_EVENT.LYSIS }"
          >
            <td v-if="showSessionCol" class="exp-log__td-session" v-tip="tipCellSession(e)">{{ e.sessionName ?? NULL_DISPLAY }}</td>
            <td class="exp-log__td-id">{{ e.id }}</td>
            <td class="exp-log__td-mono">{{ e.timestamp }}</td>
            <td class="exp-log__td-mono" v-tip="tipCellFreq(e)">{{ formatFreqKHz(e.freqKHz) }}</td>
            <td class="exp-log__td-mono" v-tip="tipCellField(e)">{{ e.fieldVcm != null ? e.fieldVcm : NULL_DISPLAY }}</td>
            <!-- Schwan mode columns -->
            <td v-if="!isResonanceMode" class="exp-log__td-target" v-tip="tipCellTargetVm(e)">{{ e.targetVm }}</td>
            <td v-if="!isResonanceMode" class="exp-log__td-healthy" v-tip="tipCellHealthyVm(e)">{{ e.healthyVm }}</td>
            <td v-if="!isResonanceMode" class="exp-log__td-sel" v-tip="tipCellSel(e)">{{ e.selectivity.toFixed(2) }}</td>
            <td v-if="!isResonanceMode" class="exp-log__td-dep" :class="depKClass(e.depHealthyK)" v-tip="tipCellDepH(e)">{{ depKDisplay(e.depHealthyK) }}</td>
            <td v-if="!isResonanceMode" class="exp-log__td-dep" :class="depKClass(e.depTargetK)" v-tip="tipCellDepT(e)">{{ depKDisplay(e.depTargetK) }}</td>
            <!-- Resonance mode columns: disruption ratio replaces Vm (Schwan Vm ≈ 0 at GHz) -->
            <td v-if="isResonanceMode" class="exp-log__td-target" v-tip="$t('log.tipCellTRatio', { ratio: ((e.targetRatio ?? 0) * 100).toFixed(1) })">{{ e.targetRatio != null ? (e.targetRatio * 100).toFixed(1) + '%' : NULL_DISPLAY }}</td>
            <td v-if="isResonanceMode" class="exp-log__td-healthy-dr" v-tip="$t('log.tipCellHRatio', { ratio: ((e.healthyRatio ?? 0) * 100).toFixed(1) })">{{ e.healthyRatio != null ? (e.healthyRatio * 100).toFixed(1) + '%' : NULL_DISPLAY }}</td>
            <td class="exp-log__td-event">
              <StatusBadge :label="e.event" :variant="eventVariant(e.event)" :tooltip="tipCellEvent(e)" />
            </td>
          </tr>
          <tr v-if="!hasEntries">
            <td :colspan="emptyColspan" class="exp-log__td-empty">{{ $t('exp.logEmpty') }}</td>
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
import { LOG_EVENT, NULL_DISPLAY } from '@/constants/strings'
import { eventVariant as sharedEventVariant, depKDisplay, depKDisplayFull } from '@/utils/experimentUtils'
import {
  tipCellSession as sharedTipCellSession,
  tipCellFreq as sharedTipCellFreq,
  tipCellField as sharedTipCellField,
  tipCellTargetVm as sharedTipCellTargetVm,
  tipCellHealthyVm as sharedTipCellHealthyVm,
  tipCellSel as sharedTipCellSel,
  tipCellDepH as sharedTipCellDepH,
  tipCellDepT as sharedTipCellDepT,
} from '@/tooltips/logTooltips'
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
      NULL_DISPLAY,
      ICON,
      THRESHOLDS,
      formatFreqKHz,
      depKDisplay,
      depKDisplayFull,
    }
  },

  computed: {
    entries() {
      return this.expStore.entries.slice(-20).reverse()
    },
    hasEntries(): boolean { return this.expStore.entries.length > 0 },
    isResonanceMode(): boolean { return this.cellStore.isResonanceMode },
    /** Show the Session column only when entries span more than one named session. */
    showSessionCol(): boolean {
      const names = new Set(this.expStore.entries.map((e) => e.sessionName ?? ''))
      return names.size > 1
    },
    emptyColspan(): number {
      // Schwan: #, time, freq, field, T-Vm, H-Vm, sel, DEP-H, DEP-T, event = 10
      // Resonance: #, time, freq, field, T-DR%, H-DR%, event = 7
      const base = this.isResonanceMode ? 7 : 10
      return this.showSessionCol ? base + 1 : base
    },

    tipThSel(): string {
      const { SEL_STRONG: strong, SEL_MARGINAL: marginal } = THRESHOLDS
      return this.$t('log.tipThSel', { strong, marginal })
    },

    /** Formatted cumulative dose badge text */
    doseBadge(): string {
      const dose = this.expStore.cumulativeDoseJkg
      if (dose >= 1000) return `${(dose / 1000).toFixed(2)} ${UNIT.KJ_PER_KG}`
      if (dose >= 1)    return `${dose.toFixed(1)} ${UNIT.J_PER_KG}`
      return `${(dose * 1000).toFixed(0)} ${UNIT.MJ_PER_KG}`
    },
  },

  methods: {
    exportLastEntryMethods() {
      const last = this.expStore.entries[this.expStore.entries.length - 1]
      if (last) this.expStore.exportEntryMethods(last)
    },

    logReading() {
      this.expStore.logReading(this.cellStore as Parameters<typeof this.expStore.logReading>[0], LOG_EVENT.MANUAL)
      const last = this.expStore.entries[this.expStore.entries.length - 1]
      if (last) broadcastLogEntry(last)
    },
    exportCSV()  { this.expStore.exportCSV() },
    clearLog()   { this.expStore.clearLog() },
    eventVariant(event: string): string { return sharedEventVariant(event) },

    // ── Row cell tooltips ──────────────────────────────────────────────────────
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
    tipCellEvent(e: { event: string }): string {
      return e.event === LOG_EVENT.LYSIS
        ? this.$t('log.tipCellLysis')
        : this.$t('log.tipCellManual')
    },
    depKClass(k: number | undefined): string {
      if (k == null) return ''
      return k > 0 ? 'exp-log__td-pdep' : 'exp-log__td-ndep'
    },
    tipCellSession(e: { sessionName?: string; id: number }): string {
      return sharedTipCellSession(this.$t.bind(this), e)
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

  &__session-group {
    @include flex-row(0.5rem);
    flex: 1;
    min-width: 140px;
    align-items: center;
  }

  &__name-input {
    flex: 1;
    min-width: 80px;
    background: transparent;
    border: none;
    border-bottom: 1px solid var(--color-border);
    color: var(--color-text-heading);
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    padding: 0.1rem 0.2rem;
    outline: none;
    letter-spacing: 0.06em;

    &:focus { border-bottom-color: var(--color-primary); }
  }

  &__dose {
    @include flex-row(0.4rem);
    align-items:   center;
    padding:       0.18rem 0.65rem;
    border:        1px solid color-mix(in srgb, var(--color-amber) 30%, transparent);
    border-radius: 3px;
    background:    color-mix(in srgb, var(--color-amber) 6%, transparent);
    cursor:        help;
    flex-shrink:   0;
  }

  &__dose-label {
    @include mono-upper(0.55rem, 0.08em);
    color: color-mix(in srgb, var(--color-amber) 65%, transparent);
  }

  &__dose-val {
    font-family: var(--font-mono);
    font-size:   var(--fs-xs);
    font-weight: 600;
    color:       var(--color-amber);
  }

  &__actions { @include flex-row(0.35rem); flex-shrink: 0; }

  &__btn {
    @include mono-upper(0.7rem);
    padding: 0.22rem 0.6rem;
    border: 1px solid var(--color-border);
    border-radius: 3px;
    background: transparent;
    color: var(--color-text);
    cursor: pointer;
    transition: all var(--tr-fast);
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
    font-size: var(--fs-xs);
    font-family: var(--font-mono);

    thead th {
      position: sticky;
      top: 0;
      background: var(--color-surface-2);
      padding: 0.3rem 0.45rem;
      text-align: left;
      color: var(--color-text);
      font-weight: 400;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      white-space: nowrap;
      border-bottom: 1px solid var(--color-border);
    }

    tbody {
      td {
        padding: 0.28rem 0.45rem;
        text-align: left;
        color: var(--color-text);
        border-bottom: 1px solid rgba(255,255,255,0.04);
        white-space: nowrap;
      }
      tr:hover td { background: rgba(255,255,255,0.025); }
    }
  }

  &__row--lysis {
    td { background: color-mix(in srgb, var(--color-danger) 6%, transparent); }
    &:hover td { background: color-mix(in srgb, var(--color-danger) 10%, transparent); }
  }

  &__td-session {
    color: var(--color-text-muted);
    font-size: var(--fs-xs);
    max-width: 80px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  &__td-id   { opacity: 0.6; }
  &__td-mono { }
  &__td-target     { color: var(--color-danger); }
  &__td-healthy    { color: var(--color-primary); }
  &__td-healthy-dr { color: var(--color-primary); opacity: var(--op-dim); }
  &__td-sel        { color: var(--color-text-heading); font-weight: 600; }
  &__td-dep        { opacity: 0.85; }
  &__td-pdep       { color: var(--color-lime); }
  &__td-ndep       { color: var(--color-amber); }
  &__td-event      { }
  &__td-empty      { text-align: center; opacity: 0.6; padding: 1rem; }
}
</style>
