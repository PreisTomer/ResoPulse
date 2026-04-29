<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <section id="validation" class="protocol__section protocol-validate">
    <h2 class="protocol__section-title" v-html="$t('protocol.validation.title')"></h2>
    <p class="protocol-validate__intro" v-html="$t('protocol.validation.intro')"></p>
    <ValidateSection />
  </section>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import ValidateSection from '@/components/ValidationWorkflows/index.vue'

export default defineComponent({
  name: 'ProtocolSectionValidation',
  components: { ValidateSection },
})
</script>

<style lang="scss" scoped>
.protocol-validate {
  &__intro {
    font-size: var(--fs-lg);
    color: var(--color-text-muted);
    line-height: 1.75;
    max-width: 72ch;
    margin: 0 0 2rem;
  }
}
</style>
