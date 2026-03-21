<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <section id="refs" class="protocol__section">
    <h2 class="protocol__section-title" v-html="$t('protocol.refs.title')"></h2>
    <ol class="protocol__refs-list">
      <li v-for="(ref, i) in refList" :key="i" class="protocol__ref-item">
        <span class="protocol__ref-num">[{{ i + 1 }}]</span>
        <span class="protocol__ref-body">
          <span v-html="ref.body"></span>
          <a
            v-if="ref.url"
            class="protocol__ref-link"
            :href="ref.url"
            target="_blank"
            rel="noopener"
          >{{ ref.urlLabel }}</a>
          <span v-if="ref.note" class="protocol__ref-note" v-html="ref.note"></span>
        </span>
      </li>
    </ol>
  </section>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'
import type { RefItem } from './types'

export default defineComponent({
  name: 'ProtocolSectionRefs',

  props: {
    refList: {
      type: Array as PropType<RefItem[]>,
      required: true,
    },
  },
})
</script>

<style lang="scss" scoped>
@use '../../styles/mixins' as *;
@use './shared' as proto;

@include proto.protocol-section();

.protocol__refs-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
}

.protocol__ref-item {
  display: flex;
  gap: 0.65rem;
  font-size: 0.82rem;
  line-height: 1.55;
  color: var(--color-text-muted);
  align-items: flex-start;
}

.protocol__ref-num {
  font-family: var(--font-mono);
  font-size: 0.72rem;
  color: var(--color-primary);
  opacity: 0.75;
  flex-shrink: 0;
  min-width: 2.2rem;
  padding-top: 0.1rem;
}

.protocol__ref-body {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.protocol__ref-link {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--color-primary);
  text-decoration: none;
  opacity: 0.8;
  transition: opacity 0.15s;

  &:hover { opacity: 1; text-decoration: underline; }
}

.protocol__ref-note {
  font-family: var(--font-mono);
  font-size: 0.68rem;
  color: var(--color-text-muted);
  opacity: 0.6;
  font-style: italic;
}
</style>
