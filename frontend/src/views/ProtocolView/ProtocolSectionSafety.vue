<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <section id="safety" class="protocol__section">
    <h2 class="protocol__section-title" v-html="$t('protocol.safety.title')"></h2>
    <p class="protocol__body-text" v-html="$t('protocol.safety.intro')"></p>
    <table class="protocol__param-table">
      <thead>
        <tr>
          <th v-html="$t('protocol.safety.thParam')"></th>
          <th v-html="$t('protocol.safety.thValue')"></th>
          <th v-html="$t('protocol.safety.thSig')"></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in rows" :key="row.param">
          <td v-html="row.param"></td>
          <td class="protocol__mono" :class="row.valueClass ? 'protocol__' + row.valueClass : ''" v-html="row.value"></td>
          <td v-html="row.sig"></td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import type { SafetyRow } from './types'

export default defineComponent({
  name: 'ProtocolSectionSafety',

  props: {
    rows: {
      type: Array as PropType<SafetyRow[]>,
      required: true,
    },
  },
})
</script>

<style lang="scss" scoped>

@use './protocol' as proto;

@include proto.protocol-section();
@include proto.protocol-utils();
@include proto.protocol-param-table();
</style>
