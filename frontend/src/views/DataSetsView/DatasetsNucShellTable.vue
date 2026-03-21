<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <section class="datasets__card">
    <div class="datasets__card-hdr">
      <h2 class="datasets__card-title">{{ $t('datasets.nucShell.sectionTitle') }}</h2>
      <span class="datasets__card-tag" v-html="$t('datasets.nucShell.sectionTag')"></span>
    </div>
    <div class="datasets__table-wrap">
      <table class="datasets__table datasets__table--nuclear">
        <thead>
          <tr>
            <th>{{ $t('datasets.nucShell.colCell') }}</th>
            <th v-tip="$t('datasets.tip.nucColRnuc')" v-html="$t('datasets.nucShell.colRnuc')"></th>
            <th v-tip="$t('datasets.tip.nucColDne')" v-html="$t('datasets.nucShell.colDne')"></th>
            <th v-tip="$t('datasets.tip.nucColEpsNe')" v-html="$t('datasets.nucShell.colEpsNe')"></th>
            <th v-tip="$t('datasets.tip.nucColSigNp')" v-html="$t('datasets.nucShell.colSigNp')"></th>
            <th v-tip="$t('datasets.tip.nucColVthrNuc')" v-html="$t('datasets.nucShell.colVthrNuc')"></th>
            <th v-tip="$t('datasets.tip.nucColFpeak')" v-html="$t('datasets.nucShell.colFpeak')"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="p in nuclearPresets" :key="p.presetId">
            <td>
              <span class="datasets__cell-with-badge">
                <span
                  class="datasets__group-badge"
                  :style="{ color: p.color, borderColor: p.color + '55', background: p.color + '11' }"
                >{{ p.groupLabel }}</span>
                <span class="datasets__cell-with-badge__name">{{ p.label }}</span>
              </span>
            </td>
            <td class="datasets__mono datasets__nuc-val">{{ p.nuclearRadius }}</td>
            <td class="datasets__mono">{{ p.nuclearMembraneThickness ?? nuclearMembThicknessDefault }}</td>
            <td class="datasets__mono">{{ p.nuclearMembraneEps ?? nuclearMembEpsDefault }}</td>
            <td class="datasets__mono">{{ p.nucleoplasmConductivity ?? nucleoplasmCondDefault }}</td>
            <td
              class="datasets__mono"
              :class="p.group === cellGroupReference ? 'datasets__ref-val' : 'datasets__cancer-val'"
            >{{ p.nuclearThresholdVoltage ?? nuclearVmDefault }}</td>
            <td class="datasets__mono datasets__nuc-val">{{ p.nucFpeakDisplay }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="datasets__formula-strip datasets__formula-strip--nuc">
      <div class="datasets__formula-block">
        <div class="datasets__formula-label">{{ $t('datasets.nucShell.fLabel1') }}</div>
        <div class="datasets__formula-eq">{{ $t('datasets.nucShell.fEq1') }}</div>
      </div>
      <div class="datasets__formula-block">
        <div class="datasets__formula-label">{{ $t('datasets.nucShell.fLabel2') }}</div>
        <div class="datasets__formula-eq">{{ $t('datasets.nucShell.fEq2') }}</div>
      </div>
      <div class="datasets__formula-block">
        <div class="datasets__formula-label">{{ $t('datasets.nucShell.fLabel3') }}</div>
        <div class="datasets__formula-eq">{{ $t('datasets.nucShell.fEq3') }}</div>
      </div>
      <div class="datasets__formula-block datasets__formula-block--wide">
        <div class="datasets__formula-label">{{ $t('datasets.nucShell.fLabel4') }}</div>
        <div class="datasets__formula-eq">{{ $t('datasets.nucShell.fEq4') }}</div>
        <div class="datasets__formula-note">{{ $t('datasets.nucShell.fNote4') }}</div>
      </div>
    </div>
  </section>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import { CELL_GROUP } from '@/constants/strings'
import { THRESHOLDS } from '@/constants/physics'
import type { AugmentedPreset } from './types'

export default defineComponent({
  name: 'DatasetsNucShellTable',

  props: {
    nuclearPresets: {
      type: Array as PropType<AugmentedPreset[]>,
      default: () => [],
    },
  },

  computed: {
    cellGroupReference(): string {
      return CELL_GROUP.REFERENCE
    },
    nuclearMembThicknessDefault(): number {
      return THRESHOLDS.NUCLEAR_MEMBRANE_THICKNESS_NM
    },
    nuclearMembEpsDefault(): number {
      return THRESHOLDS.NUCLEAR_MEMBRANE_EPS
    },
    nucleoplasmCondDefault(): number {
      return THRESHOLDS.NUCLEOPLASM_CONDUCTIVITY
    },
    nuclearVmDefault(): number {
      return THRESHOLDS.NUCLEAR_VM_DEFAULT
    },
  },
})
</script>

<style lang="scss" scoped>
@use '../../styles/mixins' as *;
@use './shared' as ds;

@include ds.datasets-card();
@include ds.datasets-table();
@include ds.datasets-formula-strip();
@include ds.datasets-utils();
</style>
