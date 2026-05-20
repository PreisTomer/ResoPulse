<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="library-view">
    <header class="library-view__header">
      <h1 class="library-view__title">{{ $t('library.viewTitle') }}</h1>
      <p class="library-view__subtitle">{{ $t('library.viewSubtitle') }}</p>
    </header>

    <div class="library-view__layout">
      <!-- Sidebar -->
      <aside class="library-view__sidebar">
        <span class="library-view__sidebar-label">{{ $t('library.sectionsLabel') }}</span>
        <nav class="library-view__nav">
          <button
            v-for="s in sections"
            :key="s.id"
            class="library-view__nav-btn"
            :class="{ 'library-view__nav-btn--active': activeSection === s.id }"
            @click="activeSection = s.id"
          >
            <span class="library-view__nav-icon">{{ s.icon }}</span>
            <span class="library-view__nav-text">{{ $t(s.labelKey) }}</span>
            <span class="library-view__nav-count">{{ s.count }}</span>
          </button>
        </nav>
      </aside>

      <!-- Section content -->
      <main class="library-view__content">
        <CellLineSection    v-if="activeSection === 'cellLines'" />
        <ProcessStepSection v-else-if="activeSection === 'processSteps'" />
        <VectorSection      v-else-if="activeSection === 'vectors'" />
        <BufferSection      v-else-if="activeSection === 'buffers'" />
        <MoleculeSection    v-else-if="activeSection === 'molecules'" />
        <ReferenceSection   v-else-if="activeSection === 'references'" />
      </main>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { ICON } from '@/constants/icons'
import { CELL_LINE_CATALOG } from '@/constants/cellLineCatalog'
import { PROCESS_STEP_CATALOG } from '@/constants/processStepCatalog'
import { VECTOR_CATALOG } from '@/constants/vectorCatalog'
import { BUFFER_CATALOG } from '@/constants/bufferCatalog'
import { ALL_MOLECULE_TYPES } from '@/constants/moleculeTypes'
import { SCIENTIFIC_REFERENCES } from '@/constants/scientificReferences'

import CellLineSection    from './CellLineSection.vue'
import ProcessStepSection from './ProcessStepSection.vue'
import VectorSection      from './VectorSection.vue'
import BufferSection      from './BufferSection.vue'
import MoleculeSection    from './MoleculeSection.vue'
import ReferenceSection   from './ReferenceSection.vue'

type SectionId = 'cellLines' | 'processSteps' | 'vectors' | 'buffers' | 'molecules' | 'references'

interface SectionDef {
  id:       SectionId
  labelKey: string
  icon:     string
  count:    number
}

export default defineComponent({
  name: 'LibraryView',
  components: { CellLineSection, ProcessStepSection, VectorSection, BufferSection, MoleculeSection, ReferenceSection },
  data() {
    return {
      activeSection: 'cellLines' as SectionId,
    }
  },
  computed: {
    sections(): SectionDef[] {
      return [
        { id: 'cellLines',    labelKey: 'library.section.cellLines',    icon: ICON.CELL,        count: CELL_LINE_CATALOG.length },
        { id: 'processSteps', labelKey: 'library.section.processSteps', icon: ICON.ARROW_D,     count: PROCESS_STEP_CATALOG.length },
        { id: 'vectors',      labelKey: 'library.section.vectors',      icon: ICON.NUCLEUS,     count: VECTOR_CATALOG.length },
        { id: 'buffers',      labelKey: 'library.section.buffers',      icon: ICON.FLASK,       count: BUFFER_CATALOG.length },
        { id: 'molecules',    labelKey: 'library.section.molecules',    icon: ICON.SELECTIVITY, count: ALL_MOLECULE_TYPES.length },
        { id: 'references',   labelKey: 'library.section.references',   icon: ICON.SECTION,     count: SCIENTIFIC_REFERENCES.length },
      ]
    },
  },
})
</script>

<style lang="scss" scoped>
.library-view {
  padding: 2rem 2.5rem;
  max-width: 1400px;
  margin: 0 auto;

  @media (max-width: 768px) { padding: 1.25rem 1rem; }

  &__header { margin-bottom: 1.5rem; }

  &__title {
    margin: 0 0 0.35rem;
    font-size: 1.6rem;
    font-weight: 600;
    color: var(--color-text-heading);
  }

  &__subtitle {
    margin: 0;
    font-size: var(--fs-lg);
    opacity: var(--op-partial);
    max-width: 48rem;
    line-height: 1.5;
  }

  &__layout {
    display: grid;
    grid-template-columns: 230px 1fr;
    gap: 1.5rem;
    align-items: start;

    @media (max-width: 900px) { grid-template-columns: 1fr; }
  }

  &__sidebar {
    @include flex-col(0.5rem);
    position: sticky;
    top: 1rem;
  }

  &__sidebar-label {
    @include mono-upper(var(--fs-xxs));
    opacity: var(--op-muted);
    padding: 0 0.5rem;
  }

  &__nav {
    @include flex-col(0.2rem);
  }

  &__nav-btn {
    @include flex-row(0.6rem);
    align-items: center;
    padding: 0.6rem 0.75rem;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius);
    color: var(--color-text);
    cursor: pointer;
    text-align: left;
    transition: background var(--tr-fast), border-color var(--tr-fast);

    &:hover { background: color-mix(in srgb, var(--color-primary) 6%, transparent); }

    &--active {
      background: color-mix(in srgb, var(--color-primary) 12%, transparent);
      border-color: color-mix(in srgb, var(--color-primary) 30%, transparent);
      color: var(--color-primary);
    }
  }

  &__nav-icon { font-size: 1.1rem; width: 1.4rem; text-align: center; }
  &__nav-text { flex: 1; font-size: var(--fs-md); }
  &__nav-count {
    @include mono-upper(var(--fs-xxs));
    opacity: var(--op-muted);
  }
}
</style>
