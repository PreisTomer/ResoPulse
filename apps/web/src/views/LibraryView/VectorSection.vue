<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="lib-vector">
    <div class="lib-vector__legend">
      <span class="lib-vector__legend-title">{{ $t('library.vector.featuresLegend') }}</span>
      <span v-for="f in features" :key="f.key" class="lib-vector__legend-item">
        <span class="lib-vector__legend-swatch" :style="{ background: f.color }"></span>
        {{ $t(f.labelKey) }}
      </span>
    </div>

    <article v-for="v in catalog" :key="v.id" class="lib-vector__card">
      <div class="lib-vector__visual">
        <PlasmidMap :vector="v" :size="150" :legend="false" :aria-label="`${v.shortLabel} plasmid map`" />
      </div>
      <div class="lib-vector__body">
        <header class="lib-vector__header">
          <h3 class="lib-vector__name">{{ v.name }}</h3>
          <span class="lib-vector__vendor">{{ v.vendor }}</span>
        </header>
        <p class="lib-vector__desc">{{ v.description }}</p>
        <dl class="lib-vector__facts">
          <div><dt>{{ $t('library.vector.promoter') }}</dt><dd>{{ v.promoter }}</dd></div>
          <div><dt>{{ $t('library.vector.selectionMarker') }}</dt><dd>{{ v.selectionMarker }}</dd></div>
          <div><dt>{{ $t('library.vector.secretionSignal') }}</dt><dd>{{ v.secretionSignal ?? $t('library.vector.none') }}</dd></div>
          <div><dt>{{ $t('library.vector.size') }}</dt><dd>{{ v.sizeKb }} kb</dd></div>
        </dl>
        <div class="lib-vector__hosts">
          <span class="lib-vector__hosts-label">{{ $t('library.vector.hostCells') }}</span>
          <span class="lib-vector__host-chips">
            <span v-for="h in v.compatibleHostCells" :key="h" class="lib-vector__host-chip">{{ h }}</span>
          </span>
        </div>
      </div>
    </article>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { VECTOR_CATALOG } from '@/constants/vectorCatalog'
import { PLASMID_FEATURES } from '@/constants/plasmidFeatures'

import PlasmidMap from '@/components/PlasmidMap/index.vue'

export default defineComponent({
  name: 'VectorSection',
  components: { PlasmidMap },
  computed: {
    catalog() { return VECTOR_CATALOG },
    features() { return PLASMID_FEATURES },
  },
})
</script>

<style lang="scss" scoped>
.lib-vector {
  @include flex-col(1rem);

  &__legend {
    position: sticky;
    top: 56px;                 // clear the sticky app top bar
    z-index: 2;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem 1.1rem;
    padding: 0.6rem 0.9rem;
    background: color-mix(in srgb, var(--color-surface) 94%, var(--color-bg));
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    backdrop-filter: blur(4px);
  }

  &__legend-title {
    @include mono-upper(var(--fs-xxs));
    opacity: var(--op-muted);
  }

  &__legend-item {
    @include flex-row(0.4rem);
    align-items: center;
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    color: var(--color-text);
    opacity: var(--op-partial);
  }

  &__legend-swatch {
    flex-shrink: 0;
    width: 0.7rem;
    height: 0.7rem;
    border-radius: 3px;
  }

  &__card {
    @include flex-row(1.25rem);
    align-items: flex-start;
    padding: 1.25rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    transition: border-color var(--tr-fast);

    &:hover { border-color: color-mix(in srgb, var(--color-primary) 30%, var(--color-border)); }

    @media (max-width: 600px) { flex-direction: column; align-items: center; }
  }

  &__visual { flex-shrink: 0; width: 150px; }
  &__body { flex: 1; @include flex-col(0.6rem); min-width: 0; }

  &__header { @include flex-between(0.5rem); align-items: baseline; }
  &__name { margin: 0; font-size: 1.05rem; font-weight: 600; color: var(--color-text-heading); }
  &__vendor { @include mono-upper(var(--fs-xxs)); opacity: var(--op-muted); }

  &__desc { margin: 0; font-size: var(--fs-md); opacity: var(--op-partial); line-height: 1.5; }

  &__facts {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 0.6rem;
    margin: 0;
    div { @include flex-col(0.15rem); }
    dt { @include mono-upper(0.55rem); opacity: var(--op-muted); margin: 0; }
    dd { font-family: var(--font-mono); font-size: var(--fs-sm); color: var(--color-text); margin: 0; }
  }

  &__hosts { @include flex-col(0.4rem); }
  &__hosts-label { @include mono-upper(var(--fs-xxs)); opacity: var(--op-muted); }
  &__host-chips { display: flex; flex-wrap: wrap; gap: 0.35rem; }
  &__host-chip {
    @include mono-upper(0.55rem);
    padding: 0.15rem 0.5rem;
    background: color-mix(in srgb, var(--color-primary) 10%, transparent);
    color: var(--color-primary);
    border-radius: 999px;
  }
}
</style>
