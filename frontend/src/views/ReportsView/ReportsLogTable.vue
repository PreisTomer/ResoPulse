<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="reports-log-table__table-wrap">
    <table class="reports-log-table__table">
      <thead>
        <tr>
          <!-- Reticle column — communicates "select a row" -->
          <th class="reports-log-table__col-select" v-tip="$t('reports.colMethodsTitle')">
            <svg class="reports-log-table__reticle-icon" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <circle cx="8" cy="8" r="5.5" stroke="currentColor" stroke-width="1" opacity="0.5"/>
              <circle cx="8" cy="8" r="2.5" stroke="currentColor" stroke-width="1"/>
              <circle cx="8" cy="8" r="1" fill="currentColor"/>
              <line x1="8" y1="1" x2="8" y2="4"   stroke="currentColor" stroke-width="1" opacity="0.6"/>
              <line x1="8" y1="12" x2="8" y2="15" stroke="currentColor" stroke-width="1" opacity="0.6"/>
              <line x1="1" y1="8" x2="4"  y2="8"  stroke="currentColor" stroke-width="1" opacity="0.6"/>
              <line x1="12" y1="8" x2="15" y2="8" stroke="currentColor" stroke-width="1" opacity="0.6"/>
            </svg>
          </th>
          <th v-for="col in TABLE_COLS" :key="col.key" v-tip="col.tip">{{ col.label }}</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="e in entries"
          :key="e.id"
          class="reports-log-table__row--selectable"
          :class="{
            'reports-log-table__row--lysis':    e.event === LOG_EVENT.LYSIS,
            'reports-log-table__row--selected': selectedEntry?.id === e.id,
          }"
          @click="$emit('select', e)"
        >
          <td class="reports-log-table__td-select">
            <span
              class="reports-log-table__row-radio"
              :class="{ 'reports-log-table__row-radio--on': selectedEntry?.id === e.id }"
            ></span>
          </td>
          <td class="reports-log-table__session-val" v-tip="tipCellSession(e)">{{ e.sessionName ?? NULL_DISPLAY }}</td>
          <td class="reports-log-table__muted">{{ e.id }}</td>
          <td class="reports-log-table__timestamp">{{ e.timestamp }}</td>
          <td>{{ e.targetPreset }}</td>
          <td v-tip="tipCellFreq(e)">{{ formatFreqKHz(e.freqKHz, 1) }}</td>
          <td v-tip="tipCellField(e)">{{ formatFieldVcm(e.fieldVcm) }}</td>
          <td class="reports-log-table__muted">{{ e.medium }}</td>
          <td class="reports-log-table__cancer-val" v-tip="tipCellTargetVm(e)">{{ e.targetVm.toFixed(3) }}</td>
          <td class="reports-log-table__ref-val" v-tip="tipCellHealthyVm(e)">{{ e.healthyVm.toFixed(3) }}</td>
          <td :class="selClass(e.selectivity)" v-tip="tipCellSel(e)">{{ e.selectivity.toFixed(3) }}</td>
          <td
            :class="e.targetRatio >= THRESHOLDS.LYSIS_PROB_CENTER ? 'reports-log-table__cancer-val' : e.targetRatio >= THRESHOLDS.HEALTHY_APPROACHING ? 'reports-log-table__warn-val' : ''"
            v-tip="tipCellTRatio(e)"
          >{{ (e.targetRatio * 100).toFixed(1) }}%</td>
          <td class="reports-log-table__ref-val" v-tip="tipCellHRatio(e)">{{ (e.healthyRatio * 100).toFixed(1) }}%</td>
          <td :class="e.targetTemp > THRESHOLDS.TEMP_WARN ? 'reports-log-table__warn-val' : ''" v-tip="tipCellTemp(e.targetTemp, 'target')">{{ e.targetTemp.toFixed(1) }}</td>
          <td :class="e.healthyTemp > THRESHOLDS.TEMP_WARN ? 'reports-log-table__warn-val' : ''" v-tip="tipCellTemp(e.healthyTemp, 'healthy')">{{ e.healthyTemp.toFixed(1) }}</td>
          <td :class="depKClass(e.depHealthyK)" v-tip="tipCellDepH(e)">{{ depKDisplay(e.depHealthyK) }}</td>
          <td :class="depKClass(e.depTargetK)" v-tip="tipCellDepT(e)">{{ depKDisplay(e.depTargetK) }}</td>
          <td>
            <StatusBadge :label="e.event" :variant="eventVariant(e.event)" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import type { LogEntry } from '@/stores/experimentStore'
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
import { formatFreqKHz, formatFieldVcm } from '@/utils/format'
import { LOG_EVENT, NULL_DISPLAY } from '@/constants/strings'
import { THRESHOLDS } from '@/constants/physics'
import { ICON } from '@/constants/icons'
import StatusBadge from '@/components/StatusBadge.vue'

const TABLE_COLS_DEFS: Array<{ key: string; labelKey: string; tipKey?: string }> = [
  { key: 'session',  labelKey: 'reports.colSession',     tipKey: 'reports.colSessionTitle' },
  { key: 'id',       labelKey: 'reports.colId' },
  { key: 'time',     labelKey: 'reports.colTime' },
  { key: 'target',   labelKey: 'reports.colTarget' },
  { key: 'freq',     labelKey: 'reports.colFreq',        tipKey: 'log.tipThFreq' },
  { key: 'field',    labelKey: 'reports.colField',       tipKey: 'log.tipThField' },
  { key: 'medium',   labelKey: 'reports.colMedium' },
  { key: 'tVm',      labelKey: 'reports.colTVm',         tipKey: 'reports.colTVmTitle' },
  { key: 'hVm',      labelKey: 'reports.colHVm',         tipKey: 'reports.colHVmTitle' },
  { key: 'sel',      labelKey: 'reports.colSelectivity', tipKey: 'reports.colSelectivityTitle' },
  { key: 'tRatio',   labelKey: 'reports.colTRatio',      tipKey: 'reports.colTRatioTitle' },
  { key: 'hRatio',   labelKey: 'reports.colHRatio',      tipKey: 'reports.colHRatioTitle' },
  { key: 'tTemp',    labelKey: 'reports.colTTemp',       tipKey: 'reports.colTTempTitle' },
  { key: 'hTemp',    labelKey: 'reports.colHTemp',       tipKey: 'reports.colHTempTitle' },
  { key: 'depH',     labelKey: 'log.logThDepH',          tipKey: 'log.tipThDepH' },
  { key: 'depT',     labelKey: 'log.logThDepT',          tipKey: 'log.tipThDepT' },
  { key: 'event',    labelKey: 'reports.colEvent',       tipKey: 'reports.colEventTitle' },
]

export default defineComponent({
  name: 'ReportsLogTable',

  components: { StatusBadge },

  props: {
    entries: {
      type: Array as PropType<LogEntry[]>,
      required: true,
    },
    selectedEntry: {
      type: Object as PropType<LogEntry | null>,
      default: null,
    },
  },

  emits: ['select'],

  setup() {
    const { t } = useI18n()

    const TABLE_COLS = TABLE_COLS_DEFS.map((col) => ({
      key: col.key,
      label: t(col.labelKey),
      tip: col.tipKey ? t(col.tipKey) : undefined,
    }))

    return {
      TABLE_COLS,
      LOG_EVENT,
      NULL_DISPLAY,
      THRESHOLDS,
      ICON,
      formatFreqKHz,
      formatFieldVcm,
      depKDisplay,
    }
  },

  methods: {
    selClass(sel: number): string {
      if (sel >= THRESHOLDS.SEL_STRONG)   return 'reports-log-table__green-val'
      if (sel >= THRESHOLDS.SEL_MARGINAL) return 'reports-log-table__warn-val'
      return 'reports-log-table__cancer-val'
    },
    depKClass(k: number | undefined): string {
      if (k == null) return 'reports-log-table__muted'
      return k > 0 ? 'reports-log-table__green-val' : 'reports-log-table__warn-val'
    },
    eventVariant(event: string): string {
      return sharedEventVariant(event)
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
@use '../../styles/mixins' as *;

.reports-log-table {
  &__table-wrap {
    overflow-x: auto;
  }

  &__table {
    width: 100%;
    border-collapse: collapse;
    font-size: var(--fs-md);
    min-width: 1400px;

    th {
      text-align: left;
      padding: 0.5rem 0.75rem;
      font-size: var(--fs-xxs);
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

  &__row--lysis td { background: color-mix(in srgb, var(--color-danger) 4%, transparent); }
  &__row--lysis:hover td { background: color-mix(in srgb, var(--color-danger) 8%, transparent) !important; }

  &__row--selected td {
    background: color-mix(in srgb, var(--color-purple) 10%, transparent) !important;
    border-bottom-color: color-mix(in srgb, var(--color-purple) 12%, transparent) !important;
  }
  &__row--selected:hover td { background: color-mix(in srgb, var(--color-purple) 16%, transparent) !important; }

  &__row--selectable {
    cursor: pointer;
    user-select: none;
  }

  &__col-select {
    width: 28px;
    min-width: 28px;
    padding: 0.5rem 0.5rem !important;
    color: var(--color-purple) !important;
    text-align: center !important;
  }

  &__reticle-icon {
    width: 14px;
    height: 14px;
    color: var(--color-purple);
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
      background: var(--color-purple);
      border-color: var(--color-purple);
      box-shadow: 0 0 6px color-mix(in srgb, var(--color-purple) 55%, transparent);
    }
  }

  &__timestamp {
    font-size: var(--fs-sm);
    letter-spacing: 0.02em;
    opacity: 0.8;
  }

  &__session-val {
    color: var(--color-text-muted);
    font-size: var(--fs-xxs);
    max-width: 100px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  // Utility colours — mixin generates __muted, __cancer-val, __warn-val
  @include data-value-classes();
  &__ref-val   { color: var(--color-primary); }
  &__green-val { color: var(--color-lime); }
}
</style>
