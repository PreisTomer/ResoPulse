<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <section class="datasets__card">
    <div class="datasets__card-hdr">
      <h2 class="datasets__card-title">{{ $t('datasets.cellLib.sectionTitle') }}</h2>
      <span class="datasets__card-tag">{{ $t('datasets.cellLib.sectionTag', { n: presets.length }) }}</span>
    </div>
    <div class="datasets__table-wrap">
      <table class="datasets__table">
        <thead>
          <tr>
            <th>{{ $t('datasets.cellLib.colGroup') }}</th>
            <th>{{ $t('datasets.cellLib.colCell') }}</th>
            <th>{{ $t('datasets.cellLib.colR') }}</th>
            <th>{{ $t('datasets.cellLib.colD') }}</th>
            <th v-tip="$t('datasets.tip.colEr')" v-html="$t('datasets.cellLib.colEr')"></th>
            <th v-tip="$t('datasets.tip.colSigI')" v-html="$t('datasets.cellLib.colSigI')"></th>
            <th v-tip="$t('datasets.tip.colCm')" v-html="$t('datasets.cellLib.colCm')"></th>
            <th v-tip="$t('datasets.tip.colFc')" v-html="$t('datasets.cellLib.colFc')"></th>
            <th v-tip="$t('datasets.tip.colFcross')" v-html="$t('datasets.cellLib.colFcross')"></th>
            <th v-tip="$t('datasets.tip.colFcross2')" v-html="$t('datasets.cellLib.colFcross2')"></th>
            <th v-tip="$t('datasets.tip.colVmThr')" v-html="$t('datasets.cellLib.colVmThr')"></th>
            <th v-tip="$t('datasets.tip.colRnuc')" v-html="$t('datasets.cellLib.colRnuc')"></th>
            <th v-tip="$t('datasets.tip.colRho')">{{ $t('datasets.cellLib.colRho') }}</th>
            <th v-tip="$t('datasets.tip.colFres')" v-html="$t('datasets.cellLib.colFres')"></th>
            <th v-tip="$t('datasets.tip.colQ')">{{ $t('datasets.cellLib.colQ') }}</th>
            <th v-tip="$t('datasets.tip.colEthr')" v-html="$t('datasets.cellLib.colEthr')"></th>
            <th>{{ $t('datasets.cellLib.colNotes') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in presets" :key="p.presetId">
            <td>
              <span
                class="datasets__group-badge"
                :style="{
                  color: p.color,
                  borderColor: p.color + '55',
                  background: p.color + '11',
                }"
              >{{ p.groupLabel }}</span>
            </td>
            <td class="datasets__cell-name">{{ p.label }}</td>
            <td class="datasets__mono">{{ p.radius }}</td>
            <td class="datasets__mono">{{ p.membraneThickness }}</td>
            <td class="datasets__mono">{{ p.dielectricConstant.toFixed(1) }}</td>
            <td class="datasets__mono">{{ p.conductivity }}</td>
            <td class="datasets__mono datasets__primary-val">{{ p.cmDisplay }}</td>
            <td class="datasets__mono datasets__primary-val">{{ p.fcDisplay }}</td>
            <td class="datasets__mono" :class="p.fcrossDisplay !== nullDisplay ? 'datasets__dep-val' : 'datasets__muted'">{{ p.fcrossDisplay }}</td>
            <td class="datasets__mono" :class="p.fcross2Display !== nullDisplay ? 'datasets__dep-val' : 'datasets__muted'">{{ p.fcross2Display }}</td>
            <td
              class="datasets__mono"
              :class="p.group === cellGroupReference ? 'datasets__ref-val' : 'datasets__cancer-val'"
            >{{ p.thresholdVoltage.toFixed(2) }}</td>
            <td class="datasets__mono" :class="p.hasNuclear ? 'datasets__nuc-val' : 'datasets__muted'">{{ p.nucRDisplay }}</td>
            <td class="datasets__mono datasets__muted">{{ p.density }}</td>
            <td class="datasets__mono" :class="p.hasResonance ? 'datasets__primary-val' : 'datasets__muted'">{{ p.resFreqDisplay }}</td>
            <td class="datasets__mono" :class="p.hasResonance ? '' : 'datasets__muted'">{{ p.resQDisplay }}</td>
            <td class="datasets__mono" :class="p.hasResonance ? 'datasets__warn-val' : 'datasets__muted'">{{ p.resEthrDisplay }}</td>
            <td class="datasets__notes-cell" v-tip="p.techNotes ?? p.notes">{{ p.notes }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="datasets__formula-strip">
      <div class="datasets__formula-block">
        <div class="datasets__formula-label">{{ $t('datasets.cellLib.fLabel1') }}</div>
        <div class="datasets__formula-eq">{{ $t('datasets.cellLib.fEq1') }}</div>
      </div>
      <div class="datasets__formula-block">
        <div class="datasets__formula-label">{{ $t('datasets.cellLib.fLabel2') }}</div>
        <div class="datasets__formula-eq">{{ $t('datasets.cellLib.fEq2') }}</div>
      </div>
      <div class="datasets__formula-block">
        <div class="datasets__formula-label">{{ $t('datasets.cellLib.fLabel3') }}</div>
        <div class="datasets__formula-eq">{{ $t('datasets.cellLib.fEq3') }}</div>
      </div>
      <div class="datasets__formula-block datasets__formula-block--wide">
        <div class="datasets__formula-label">{{ $t('datasets.cellLib.fLabel4') }}</div>
        <div class="datasets__formula-eq">{{ $t('datasets.cellLib.fEq4') }}</div>
        <div class="datasets__formula-note">{{ $t('datasets.cellLib.fNote4') }}</div>
      </div>
    </div>
  </section>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import { CELL_GROUP, NULL_DISPLAY } from '@/constants/strings'
import type { AugmentedPreset } from './types'

export default defineComponent({
  name: 'DatasetsCellTable',

  props: {
    presets: {
      type: Array as PropType<AugmentedPreset[]>,
      default: () => [],
    },
  },

  computed: {
    nullDisplay(): string {
      return NULL_DISPLAY
    },
    cellGroupReference(): string {
      return CELL_GROUP.REFERENCE
    },
  },
})
</script>

<style lang="scss" scoped>

@use './shared' as ds;

@include ds.datasets-card();
@include ds.datasets-table();
@include ds.datasets-formula-strip();
@include ds.datasets-utils();
</style>
