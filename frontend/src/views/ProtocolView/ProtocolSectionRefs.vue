<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <section id="refs" class="protocol__section">
    <h2 class="protocol__section-title" v-html="$t('protocol.refs.title')"></h2>
    <ol class="protocol__refs-list">
      <li v-for="(ref, i) in refList" :key="i" :id="'ref-' + (i + 1)" class="protocol__ref-item">
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

@use './protocol' as proto;

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
  font-size: var(--fs-md);
  line-height: 1.55;
  color: var(--color-text-muted);
  align-items: flex-start;
}

.protocol__ref-num {
  font-family: var(--font-mono);
  font-size: var(--fs-sm);
  color: var(--color-primary);
  opacity: 0.75; // intentional: secondary reference link
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
  font-size: var(--fs-xs);
  color: var(--color-primary);
  text-decoration: none;
  opacity: var(--op-partial);
  transition: opacity var(--tr-fast);

  &:hover { opacity: 1; text-decoration: underline; }
}

.protocol__ref-note {
  font-family: var(--font-mono);
  font-size: var(--fs-xs);
  color: var(--color-text-muted);
  opacity: 0.6; // intentional: muted italic annotation
  font-style: italic;
}
</style>
