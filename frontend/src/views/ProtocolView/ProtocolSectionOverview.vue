<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <section id="overview" class="protocol__section">
    <h2 class="protocol__section-title" v-html="$t('protocol.overview.title')"></h2>
    <p class="protocol__body-text" v-html="$t('protocol.overview.p1')"></p>
    <p class="protocol__body-text" v-html="$t('protocol.overview.p2')"></p>
    <div class="protocol__info-box">
      <span class="protocol__info-icon">{{ ICON.INFO }}</span>
      <span v-html="$t('protocol.overview.disclaimer')"></span>
    </div>
  </section>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { ICON } from '@/constants/icons'

export default defineComponent({
  name: 'ProtocolSectionOverview',

  computed: {
    ICON() { return ICON },
  },
})
</script>

<style lang="scss" scoped>

@use './protocol' as proto;

@include proto.protocol-section();
@include proto.protocol-utils();
</style>
