<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <section class="datasets__card">
    <div class="datasets__card-hdr">
      <h2 class="datasets__card-title">{{ $t('datasets.media.sectionTitle') }}</h2>
      <span class="datasets__card-tag" v-html="$t('datasets.media.sectionTag')"></span>
    </div>
    <div class="datasets__table-wrap">
      <table class="datasets__table">
        <thead>
          <tr>
            <th>{{ $t('datasets.media.colKey') }}</th>
            <th>{{ $t('datasets.media.colMedium') }}</th>
            <th v-html="$t('datasets.media.colSigE')"></th>
            <th v-tip="$t('datasets.media.colEpsRTip')" v-html="$t('datasets.media.colEpsR')"></th>
            <th v-tip="$t('datasets.media.colAlphaTip')" v-html="$t('datasets.media.colAlpha')"></th>
            <th v-html="$t('datasets.media.colEffect')"></th>
            <th>{{ $t('datasets.media.colUse') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="m in mediaRows" :key="m.id">
            <td class="datasets__mono" :class="m.keyClass">{{ $t(`datasets.media.${m.id}Key`) }}</td>
            <td v-tip="$t(`datasets.tip.media${capitalise(m.id)}`)">{{ $t(`datasets.media.${m.id}Name`) }}</td>
            <td class="datasets__mono">{{ m.sigma }}</td>
            <td class="datasets__mono">{{ m.epsilonR }}</td>
            <td class="datasets__mono">{{ m.alphaT }}</td>
            <td v-html="$t(`datasets.media.${m.id}Effect`)"></td>
            <td>{{ $t(`datasets.media.${m.id}Use`) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="datasets__formula-strip">
      <div class="datasets__formula-block datasets__formula-block--wide">
        <div class="datasets__formula-label">{{ $t('datasets.media.fLabel1') }}</div>
        <div class="datasets__formula-eq">{{ $t('datasets.media.fEq1') }}</div>
      </div>
      <div class="datasets__formula-block">
        <div class="datasets__formula-label">{{ $t('datasets.media.fLabel2') }}</div>
        <div class="datasets__formula-eq">{{ $t('datasets.media.fEq2') }}</div>
        <div class="datasets__formula-note">{{ $t('datasets.media.fNote2') }}</div>
      </div>
      <div class="datasets__formula-block">
        <div class="datasets__formula-label">{{ $t('datasets.media.fLabel3') }}</div>
        <div class="datasets__formula-eq">{{ $t('datasets.media.fEq3') }}</div>
        <div class="datasets__formula-note">{{ $t('datasets.media.fNote3') }}</div>
      </div>
    </div>
  </section>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'

interface MediaRow {
  id: string
  sigma: string
  epsilonR: number
  alphaT: string
  keyClass: string
}

export default defineComponent({
  name: 'DatasetsMediaTable',

  props: {
    mediaRows: {
      type: Array as PropType<MediaRow[]>,
      default: () => [],
    },
  },

  methods: {
    capitalise(str: string): string {
      return str.charAt(0).toUpperCase() + str.slice(1)
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
