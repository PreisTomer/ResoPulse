<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="lib-refs">
    <p class="lib-refs__intro">{{ $t('library.reference.intro') }}</p>

    <section v-for="group in groups" :key="group.category" class="lib-refs__group">
      <h3 class="lib-refs__group-title">{{ $t(group.labelKey) }}</h3>
      <ol class="lib-refs__list">
        <li v-for="(ref, i) in group.refs" :key="i" class="lib-refs__item">
          <p class="lib-refs__body" v-html="ref.body"></p>
          <p v-if="ref.note" class="lib-refs__note" v-html="ref.note"></p>
          <a
            v-if="linkFor(ref)"
            class="lib-refs__link"
            :href="linkFor(ref)"
            target="_blank"
            rel="noopener noreferrer"
          >{{ labelFor(ref) }}</a>
        </li>
      </ol>
    </section>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { SCIENTIFIC_REFERENCES, type ScientificReference, type ReferenceCategory } from '@/constants/scientificReferences'

interface ReferenceGroup {
  category: ReferenceCategory
  labelKey: string
  refs:     ScientificReference[]
}

const GROUP_LABELS: Record<ReferenceCategory, string> = {
  ep:       'library.reference.categoryEp',
  upstream: 'library.reference.categoryUpstream',
}

export default defineComponent({
  name: 'ReferenceSection',
  computed: {
    groups(): ReferenceGroup[] {
      return (Object.keys(GROUP_LABELS) as ReferenceCategory[])
        .map(category => ({
          category,
          labelKey: GROUP_LABELS[category],
          refs: SCIENTIFIC_REFERENCES.filter(r => r.category === category),
        }))
        .filter(group => group.refs.length > 0)
    },
  },
  methods: {
    linkFor(ref: ScientificReference): string {
      if (ref.doi)  return `https://doi.org/${ref.doi}`
      if (ref.pmid) return `https://pubmed.ncbi.nlm.nih.gov/${ref.pmid}/`
      return ref.url ?? ''
    },
    labelFor(ref: ScientificReference): string {
      if (ref.doi)  return `doi:${ref.doi}`
      if (ref.pmid) return `PMID: ${ref.pmid}`
      return this.$t('library.reference.sourceLink')
    },
  },
})
</script>

<style lang="scss" scoped>
.lib-refs {
  @include flex-col(1rem);

  &__intro {
    margin: 0;
    font-size: var(--fs-md);
    opacity: var(--op-partial);
    line-height: 1.55;
    max-width: 52rem;
  }

  &__group {
    @include flex-col(0.85rem);
  }

  &__group-title {
    margin: 0;
    font-size: var(--fs-xl);
    font-weight: 600;
    color: var(--color-text-heading);
  }

  &__list {
    @include flex-col(0.85rem);
    margin: 0;
    padding-left: 1.6rem;
    counter-reset: ref;
  }

  &__item {
    padding: 1rem 1.1rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    transition: border-color var(--tr-fast);

    &:hover { border-color: color-mix(in srgb, var(--color-primary) 30%, var(--color-border)); }
  }

  &__body {
    margin: 0;
    font-size: var(--fs-md);
    line-height: 1.5;
    color: var(--color-text);

    :deep(em) { color: var(--color-text-heading); font-style: italic; }
  }

  &__note {
    margin: 0.5rem 0 0;
    font-size: var(--fs-sm);
    opacity: var(--op-muted);
    line-height: 1.5;
    padding-left: 0.75rem;
    border-left: 2px solid color-mix(in srgb, var(--color-primary) 25%, transparent);
  }

  &__link {
    display: inline-block;
    margin-top: 0.6rem;
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    color: var(--color-primary);
    text-decoration: none;
    opacity: var(--op-strong);
    transition: opacity var(--tr-fast);

    &:hover { opacity: 1; text-decoration: underline; }
  }
}
</style>
