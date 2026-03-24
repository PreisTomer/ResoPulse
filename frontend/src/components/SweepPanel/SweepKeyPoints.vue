<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <table class="sweep-kp">
    <thead>
      <tr>
        <th v-tip="tipThThreshold">{{ $t('sweep.tableThreshold') }}</th>
        <th v-tip="$t('sweep.tipThDrT')" v-html="$t('sweep.tableDrT')"></th>
        <th v-tip="$t('sweep.tipThDrH')" v-html="$t('sweep.tableDrH')"></th>
        <th v-tip="tipThTI">{{ $t('sweep.tableTI') }}</th>
        <th v-tip="tipThTemp" v-html="$t('sweep.tableTemp')"></th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="kp in keyPoints" :key="kp.label">
        <td class="sweep-kp__td-label" v-tip="tipKpLabel(kp)">{{ kp.label }}</td>
        <td
          :class="kp.drT >= 1 ? 'sweep-kp__td--danger' : kp.drT >= THRESHOLDS.DISRUPTION_WARN ? 'sweep-kp__td--warn' : ''"
          v-tip="tipKpDrT(kp)"
        >{{ kp.drT.toFixed(2) }}</td>
        <td
          :class="kp.drH >= THRESHOLDS.HEALTHY_APPROACHING ? 'sweep-kp__td--warn' : ''"
          v-tip="tipKpDrH(kp)"
        >{{ kp.drH.toFixed(2) }}</td>
        <td
          :class="kp.ti >= THRESHOLDS.TI_STRONG ? 'sweep-kp__td--ok' : kp.ti >= THRESHOLDS.TI_MARGINAL ? 'sweep-kp__td--warn' : 'sweep-kp__td--danger'"
          v-tip="tipKpTI(kp)"
        >{{ kp.ti.toFixed(2) }}×</td>
        <td
          :class="kp.tT >= THRESHOLDS.TEMP_DENATURING ? 'sweep-kp__td--danger' : kp.tT >= THRESHOLDS.TEMP_WARN ? 'sweep-kp__td--warn' : ''"
          v-tip="tipKpTemp(kp)"
        >{{ kp.tT.toFixed(1) }}°C</td>
      </tr>
    </tbody>
  </table>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import { THRESHOLDS } from '@/constants/physics'
import {
  tipThThreshold, tipThTI, tipThTemp,
  tipKpLabel, tipKpDrT, tipKpDrH, tipKpTI, tipKpTemp,
} from '@/tooltips/sweepTooltips'

interface KeyPoint {
  label: string; x: number; drH: number; drT: number; ti: number; tH: number; tT: number
}

export default defineComponent({
  props: {
    keyPoints:  { type: Array as PropType<KeyPoint[]>, required: true },
    sweepParam: { type: String as () => 'field' | 'freq', required: true },
  },

  setup() {
    return { THRESHOLDS }
  },

  computed: {
    tipThThreshold(): string { return tipThThreshold(this.sweepParam === 'field') },
    tipThTI():        string { return tipThTI() },
    tipThTemp():      string { return tipThTemp() },
  },

  methods: {
    tipKpLabel(kp: KeyPoint): string { return tipKpLabel(kp.label) },
    tipKpDrT(kp: KeyPoint):   string { return tipKpDrT(kp.drT) },
    tipKpDrH(kp: KeyPoint):   string { return tipKpDrH(kp.drH) },
    tipKpTI(kp: KeyPoint):    string { return tipKpTI(kp.ti) },
    tipKpTemp(kp: KeyPoint):  string { return tipKpTemp(kp.tT) },
  },
})
</script>

<style lang="scss" scoped>


.sweep-kp {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--fs-md);

  th {
    text-align: left;
    padding: 0.35rem 0.6rem;
    @include mono-upper(var(--fs-xxs));
    color: var(--color-text-muted);
    border-bottom: 1px solid var(--color-border);
    cursor: help;
  }

  td {
    padding: 0.38rem 0.6rem;
    color: var(--color-text);
    border-bottom: 1px solid color-mix(in srgb, white 4%, transparent);
    font-family: var(--font-mono);
    cursor: help;
  }

  tr:last-child td { border-bottom: none; }

  &__td-label  { color: var(--color-text-muted); font-family: inherit; font-size: var(--fs-sm); }
  &__td--ok    { color: rgb(34, 197, 94); }
  &__td--warn  { color: var(--color-amber); }
  &__td--danger { color: var(--color-danger); }
}
</style>
