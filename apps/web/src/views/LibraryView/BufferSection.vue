<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="lib-buffer">
    <article v-for="b in catalog" :key="b.id" class="lib-buffer__card">
      <header class="lib-buffer__header">
        <h3 class="lib-buffer__name">{{ b.name }}</h3>
        <div class="lib-buffer__ranges">
          <span class="lib-buffer__range">{{ $t('library.buffer.phRange') }} {{ b.pHRange[0] }}–{{ b.pHRange[1] }}</span>
          <span class="lib-buffer__range">{{ b.conductivityMsCm[0] }}–{{ b.conductivityMsCm[1] }} mS/cm</span>
        </div>
      </header>
      <p class="lib-buffer__desc">{{ b.description }}</p>
      <div class="lib-buffer__composition">
        <span class="lib-buffer__composition-label">{{ $t('library.buffer.composition') }}</span>
        <ul class="lib-buffer__component-list">
          <li v-for="(c, i) in b.components" :key="i" class="lib-buffer__component">
            <span>{{ c.name }}</span>
            <span class="lib-buffer__component-conc">{{ c.concentrationMM }} {{ $t('library.buffer.concUnit') }}</span>
          </li>
        </ul>
      </div>
    </article>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { BUFFER_CATALOG } from '@/constants/bufferCatalog'

export default defineComponent({
  name: 'BufferSection',
  computed: {
    catalog() { return BUFFER_CATALOG },
  },
})
</script>

<style lang="scss" scoped>
.lib-buffer {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;

  &__card {
    @include flex-col(0.75rem);
    padding: 1.25rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    transition: border-color var(--tr-fast);

    &:hover { border-color: color-mix(in srgb, var(--color-primary) 30%, var(--color-border)); }
  }

  &__header { @include flex-col(0.4rem); }
  &__name { margin: 0; font-size: 1.05rem; font-weight: 600; color: var(--color-text-heading); }
  &__ranges { @include flex-row(0.75rem); flex-wrap: wrap; }
  &__range { @include mono-upper(0.55rem); color: var(--color-primary); opacity: var(--op-partial); }

  &__desc { margin: 0; font-size: var(--fs-sm); opacity: var(--op-partial); line-height: 1.5; }

  &__composition-label { @include mono-upper(var(--fs-xxs)); opacity: var(--op-muted); display: block; margin-bottom: 0.4rem; }
  &__component-list { list-style: none; margin: 0; padding: 0; @include flex-col(0.3rem); }
  &__component {
    @include flex-between(0.5rem);
    font-size: var(--fs-sm);
    padding: 0.3rem 0.5rem;
    background: color-mix(in srgb, var(--color-text) 4%, transparent);
    border-radius: var(--radius);
  }
  &__component-conc { font-family: var(--font-mono); font-size: var(--fs-xs); color: var(--color-primary); }
}
</style>
