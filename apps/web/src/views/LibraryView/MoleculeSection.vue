<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="lib-mol">
    <article v-for="m in catalog" :key="m.id" class="lib-mol__card">
      <div class="lib-mol__visual">
        <TargetProteinVisual :molecule-type="m.id" :size="96" />
      </div>
      <div class="lib-mol__body">
        <header class="lib-mol__header">
          <h3 class="lib-mol__name">{{ m.label }}</h3>
          <span class="lib-mol__cat">{{ m.category }}</span>
        </header>
        <p class="lib-mol__desc">{{ m.description }}</p>
        <dl class="lib-mol__facts">
          <div><dt>{{ $t('library.molecule.typicalSize') }}</dt><dd>{{ m.typicalSizeKDa[0] }}–{{ m.typicalSizeKDa[1] }} {{ $t('library.molecule.kDaUnit') }}</dd></div>
          <div><dt>{{ $t('library.molecule.secretion') }}</dt><dd>{{ m.secretion }}</dd></div>
          <div><dt>{{ $t('library.molecule.complexity') }}</dt><dd>{{ m.complexity }}</dd></div>
          <div><dt>{{ $t('library.molecule.endToEndYield') }}</dt><dd>{{ m.typicalEndToEndYieldPct[0] }}–{{ m.typicalEndToEndYieldPct[1] }}%</dd></div>
        </dl>
        <div v-if="m.exampleProducts.length" class="lib-mol__examples">
          <span class="lib-mol__examples-label">{{ $t('library.molecule.exampleProducts') }}</span>
          <span class="lib-mol__example-chips">
            <span v-for="(p, i) in m.exampleProducts" :key="i" class="lib-mol__example-chip">{{ p }}</span>
          </span>
        </div>
      </div>
    </article>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { ALL_MOLECULE_TYPES } from '@/constants/moleculeTypes'

import TargetProteinVisual from '@/components/TargetProteinVisual/index.vue'

export default defineComponent({
  name: 'MoleculeSection',
  components: { TargetProteinVisual },
  computed: {
    catalog() { return ALL_MOLECULE_TYPES },
  },
})
</script>

<style lang="scss" scoped>
.lib-mol {
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

  &__visual { flex-shrink: 0; width: 96px; height: 96px; }
  &__body { flex: 1; @include flex-col(0.6rem); min-width: 0; }

  &__header { @include flex-between(0.5rem); align-items: baseline; }
  &__name { margin: 0; font-size: 1.1rem; font-weight: 600; color: var(--color-text-heading); }
  &__cat { @include mono-upper(var(--fs-xxs)); color: var(--color-primary); opacity: var(--op-partial); }

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

  &__examples { @include flex-col(0.4rem); }
  &__examples-label { @include mono-upper(var(--fs-xxs)); opacity: var(--op-muted); }
  &__example-chips { display: flex; flex-wrap: wrap; gap: 0.35rem; }
  &__example-chip {
    @include mono-upper(0.55rem);
    padding: 0.15rem 0.5rem;
    background: color-mix(in srgb, var(--color-ok) 12%, transparent);
    color: var(--color-ok);
    border-radius: 999px;
  }
}
</style>
