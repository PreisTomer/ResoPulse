<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="lib-cellline">
    <article v-for="cl in catalog" :key="cl.id" class="lib-cellline__card">
      <div class="lib-cellline__visual">
        <HostCellVisual :host-species="cl.hostSpecies" :size="88" :aria-label="`${cl.shortLabel} visualization`" />
      </div>
      <div class="lib-cellline__body">
        <header class="lib-cellline__header">
          <h3 class="lib-cellline__name">{{ cl.name }}</h3>
          <span class="lib-cellline__species">{{ cl.hostSpecies }}</span>
        </header>
        <p class="lib-cellline__desc">{{ cl.description }}</p>
        <dl class="lib-cellline__facts">
          <div><dt>{{ $t('library.cellLine.doublingTime') }}</dt><dd>{{ cl.doublingTimeHrs[0] }}–{{ cl.doublingTimeHrs[1] }} {{ $t('library.cellLine.hours') }}</dd></div>
          <div><dt>{{ $t('library.cellLine.expressionMode') }}</dt><dd>{{ cl.expressionMode }}</dd></div>
          <div><dt>{{ $t('library.cellLine.glycosylation') }}</dt><dd>{{ cl.glycosylation }}</dd></div>
          <div><dt>{{ $t('library.cellLine.approvedProducts') }}</dt><dd>{{ cl.numApprovedProducts }}</dd></div>
        </dl>
        <div class="lib-cellline__refs">
          <span v-for="(r, i) in cl.references" :key="i" class="lib-cellline__ref">{{ r }}</span>
        </div>
      </div>
    </article>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { CELL_LINE_CATALOG } from '@/constants/cellLineCatalog'

import HostCellVisual from '@/components/HostCellVisual/index.vue'

export default defineComponent({
  name: 'CellLineSection',
  components: { HostCellVisual },
  computed: {
    catalog() { return CELL_LINE_CATALOG },
  },
})
</script>

<style lang="scss" scoped>
.lib-cellline {
  @include flex-col(1rem);

  &__card {
    @include flex-row(1.25rem);
    align-items: flex-start;
    padding: 1.25rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    transition: border-color var(--tr-fast);

    &:hover { border-color: color-mix(in srgb, var(--color-primary) 30%, var(--color-border)); }

    @media (max-width: 600px) { flex-direction: column; }
  }

  &__visual { flex-shrink: 0; width: 88px; height: 88px; }
  &__body { flex: 1; @include flex-col(0.6rem); min-width: 0; }

  &__header { @include flex-between(0.5rem); align-items: baseline; }
  &__name { margin: 0; font-size: 1.1rem; font-weight: 600; color: var(--color-text-heading); }
  &__species { @include mono-upper(var(--fs-xxs)); color: var(--color-primary); opacity: var(--op-partial); }

  &__desc { margin: 0; font-size: var(--fs-md); opacity: var(--op-partial); line-height: 1.5; }

  &__facts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 0.6rem;
    margin: 0;

    div { @include flex-col(0.15rem); }
    dt { @include mono-upper(0.55rem); opacity: var(--op-muted); margin: 0; }
    dd { font-family: var(--font-mono); font-size: var(--fs-sm); color: var(--color-text); margin: 0; }
  }

  &__refs { @include flex-col(0.2rem); }
  &__ref { font-size: var(--fs-xs); opacity: var(--op-muted); font-style: italic; }
}
</style>
