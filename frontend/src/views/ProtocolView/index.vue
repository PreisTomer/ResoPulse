<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="protocol">
    <div class="protocol__inner">

      <!-- Page header -->
      <div class="protocol__header">
        <PageHeader :eyebrow="$t('protocol.header.eyebrow')" :title="$t('protocol.header.title')">
          <p class="protocol__subtitle" v-html="$t('protocol.header.subtitle')"></p>
        </PageHeader>
      </div>

      <!-- Mobile-only contents toggle -->
      <button
        class="protocol__toc-mobile-btn"
        :class="{ 'protocol__toc-mobile-btn--open': tocMobileOpen }"
        @click="tocMobileOpen = !tocMobileOpen"
      >
        <span class="protocol__toc-mobile-icon">{{ ICON.MENU }}</span>
        <span class="protocol__toc-mobile-label">{{ tocMobileOpen ? $t('protocol.toc.close') : $t('protocol.toc.contents') }}</span>
        <span class="protocol__toc-mobile-caret" :class="{ 'protocol__toc-mobile-caret--open': tocMobileOpen }">{{ ICON.CARET_DOWN }}</span>
      </button>

      <!-- Two-column layout: TOC + content -->
      <div class="protocol__layout">

        <!-- Sidebar TOC -->
        <ProtocolToc
          :items="tocItems"
          :active-section="activeSection"
          :is-mobile-open="tocMobileOpen"
          @close="tocMobileOpen = false"
          @feedback="showFeedbackModal = true"
        />

        <!-- Main document -->
        <article class="protocol__doc">
          <ProtocolSectionOverview />

          <ProtocolSectionPhysics
            :schwan-params="schwanParams"
            :resonance-rows="resonanceRows"
            :doubleshell-rows="doubleshellRows"
            :dep-rows="depRows"
            :uncertainty-rows="uncertaintyRows"
            :sonification-mappings="sonificationMappings"
          />

          <ProtocolSectionSteps :step-keys="protocolStepKeys" />

          <ProtocolSectionSafety :rows="safetyRows" />

          <ProtocolSectionRefs :ref-list="refList" />
        </article>
      </div>
    </div>

    <ProtocolFeedbackModal
      v-if="showFeedbackModal"
      @close="showFeedbackModal = false"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { PageHeader } from '@/components/ui'

import { ICON } from '@/constants/icons'

import ProtocolToc from './ProtocolToc.vue'
import ProtocolSectionOverview from './ProtocolSectionOverview.vue'
import ProtocolSectionPhysics from './ProtocolSectionPhysics.vue'
import ProtocolSectionSteps from './ProtocolSectionSteps.vue'
import ProtocolSectionSafety from './ProtocolSectionSafety.vue'
import ProtocolSectionRefs from './ProtocolSectionRefs.vue'
import ProtocolFeedbackModal from './ProtocolFeedbackModal.vue'
import type {
  TocItem,
  SchwanParamRow,
  ResonanceRow,
  DoubleshellRow,
  DepRow,
  UncertaintyRow,
  SafetyRow,
  RawRefItem,
  RefItem,
  SonificationRow,
} from './types'

const TOC_ITEMS: TocItem[] = [
  { id: 'overview',       key: 'overview',      indent: false },
  { id: 'physics',        key: 'physics',       indent: false, physicsParent: true },
  { id: 'schwan',         key: 'schwan',        indent: true },
  { id: 'thermal',        key: 'thermal',       indent: true },
  { id: 'maxwell',        key: 'maxwell',       indent: true },
  { id: 'disruption',     key: 'disruption',    indent: true },
  { id: 'resonance',      key: 'resonance',     indent: true },
  { id: 'nsep',           key: 'nsep',          indent: true },
  { id: 'doubleshell',    key: 'doubleshell',   indent: true },
  { id: 'dep',            key: 'dep',           indent: true },
  { id: 'uncertainty',    key: 'uncertainty',   indent: true },
  { id: 'biomodulation',  key: 'biomodulation', indent: true },
  { id: 'impedance',      key: 'impedance',     indent: true },
  { id: 'sonification',   key: 'sonification',  indent: true },
  { id: 'protocol-steps', key: 'protocol',      indent: false },
  { id: 'safety',         key: 'safety',        indent: false },
  { id: 'refs',           key: 'refs',          indent: false },
]

const ALL_SECTION_IDS = [
  'overview',
  'physics', 'schwan', 'thermal', 'maxwell', 'disruption',
  'resonance', 'nsep', 'doubleshell', 'dep', 'uncertainty', 'biomodulation',
  'impedance', 'sonification',
  'protocol-steps', 'safety', 'refs',
] as const

const PHYSICS_IDS = new Set(['physics', 'schwan', 'thermal', 'maxwell', 'disruption', 'resonance', 'nsep', 'doubleshell', 'dep', 'uncertainty', 'biomodulation', 'impedance', 'sonification'])

export default defineComponent({
  name: 'ProtocolView',

  components: {
    PageHeader,
    ProtocolToc,
    ProtocolSectionOverview,
    ProtocolSectionPhysics,
    ProtocolSectionSteps,
    ProtocolSectionSafety,
    ProtocolSectionRefs,
    ProtocolFeedbackModal,
  },

  data() {
    return {
      activeSection:     'overview' as string,
      tocMobileOpen:     false,
      showFeedbackModal: false,
      _scrollHandler:    null as EventListener | null,
    }
  },

  computed: {
    ICON() { return ICON },
    tocItems(): TocItem[] {
      return TOC_ITEMS
    },

    isPhysicsActive(): boolean {
      return PHYSICS_IDS.has(this.activeSection)
    },

    protocolStepKeys(): string[] {
      return ['s01', 's02', 's03', 's04', 's05', 's06', 's07', 's08', 's09', 's10', 's11', 's12']
    },

    schwanParams(): SchwanParamRow[] {
      return (this.$tm as Function)('protocol.physics.schwan.params') as SchwanParamRow[]
    },

    resonanceRows(): ResonanceRow[] {
      return (this.$tm as Function)('protocol.physics.resonance.rows') as ResonanceRow[]
    },

    doubleshellRows(): DoubleshellRow[] {
      return (this.$tm as Function)('protocol.physics.doubleshell.rows') as DoubleshellRow[]
    },

    depRows(): DepRow[] {
      return (this.$tm as Function)('protocol.physics.dep.params') as DepRow[]
    },

    uncertaintyRows(): UncertaintyRow[] {
      return (this.$tm as Function)('protocol.physics.uncertainty.rows') as UncertaintyRow[]
    },

    safetyRows(): SafetyRow[] {
      return (this.$tm as Function)('protocol.safety.rows') as SafetyRow[]
    },

    sonificationMappings(): SonificationRow[] {
      return (this.$tm as Function)('protocol.physics.sonification.mappings') as SonificationRow[]
    },

    refList(): RefItem[] {
      const raw = (this.$tm as Function)('protocol.refs.list') as RawRefItem[]
      return raw.map((item) => ({
        body: item.body,
        note: item.note,
        url: item.doi  ? `https://doi.org/${item.doi}`
           : item.pmid ? `https://pubmed.ncbi.nlm.nih.gov/${item.pmid}/`
           : undefined,
        urlLabel: item.doi  ? `doi:${item.doi}`
               : item.pmid ? `PubMed:${item.pmid}`
               : undefined,
      }))
    },
  },

  mounted() {
    const handler = () => {
      let current: string = ALL_SECTION_IDS[0]
      for (const id of ALL_SECTION_IDS) {
        const el = document.getElementById(id)
        if (el && el.getBoundingClientRect().top <= 80) {
          current = id
        }
      }
      this.activeSection = current
    }
    window.addEventListener('scroll', handler, { passive: true })
    handler()
    this._scrollHandler = handler
  },

  beforeUnmount() {
    if (this._scrollHandler) window.removeEventListener('scroll', this._scrollHandler)
  },

  methods: {
    isTocActive(item: TocItem): boolean {
      return item.physicsParent ? this.isPhysicsActive : this.activeSection === item.id
    },
  },
})
</script>

<style lang="scss" scoped>


.protocol {
  flex: 1;
  background-color: var(--color-bg);

  &__inner {
    max-width: 1600px;
    margin: 0 auto;
    padding: 2rem 2rem 4rem;
  }

  &__header {
    margin-bottom: 2.5rem;
  }

  &__subtitle {
    font-size: var(--fs-lg);
    color: var(--color-text-muted);
    margin: 0;
    font-family: var(--font-mono);
  }

  &__layout {
    display: grid;
    grid-template-columns: 220px minmax(0, 1fr);
    gap: 2.5rem;
    align-items: start;
  }

  /* ── Document ──────────────────────────────────────────── */
  &__doc { @include flex-col(2.5rem); }

  // ── Mobile TOC toggle button (hidden on desktop) ────────────────────────────
  &__toc-mobile-btn {
    display: none;
  }

  &__toc-mobile-caret {
    font-size: var(--fs-xxs);
    opacity: var(--op-dim);
    transition: transform var(--tr-normal);
    margin-left: auto;

    &--open { transform: rotate(180deg); }
  }
}

// ── Mobile / phone layout ─────────────────────────────────────────────────────
@media (max-width: 768px) {
  .protocol__toc-mobile-btn {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    width: 100%;
    padding: 0.8rem 1.1rem;
    background: var(--color-surface);
    border: 1.5px solid color-mix(in srgb, var(--color-primary) 35%, transparent);
    border-radius: var(--radius);
    color: var(--color-primary);
    font-size: var(--fs-lg);
    font-family: var(--font-mono);
    font-weight: 600;
    letter-spacing: 0.04em;
    cursor: pointer;
    margin-bottom: 0.75rem;
    transition: border-color var(--tr-fast), background var(--tr-fast), box-shadow var(--tr-fast);
    box-shadow: 0 0 12px color-mix(in srgb, var(--color-primary) 8%, transparent);

    &:hover, &--open {
      border-color: var(--color-primary);
      background: color-mix(in srgb, var(--color-primary) 6%, transparent);
      box-shadow: 0 0 18px color-mix(in srgb, var(--color-primary) 18%, transparent);
    }
  }

  .protocol__toc-mobile-icon {
    font-size: 1.1rem;
    line-height: 1;
    flex-shrink: 0;
  }

  .protocol__toc-mobile-label {
    flex: 1;
    text-align: left;
  }

  // Full-width single column layout
  .protocol__layout {
    grid-template-columns: 1fr;
  }

  .protocol__inner {
    padding: 1rem 1rem 3rem;
  }

  // Keep tables scrollable on mobile
  .protocol__param-table,
  .protocol__doubleshell-table,
  .protocol__safety-table {
    font-size: var(--fs-sm);
    display: block;
    overflow-x: auto;
  }

  // Prevent doc from escaping its column
  .protocol__doc {
    min-width: 0;
    max-width: 100%;
    overflow-x: hidden;
  }
}

// Extra-small phones (up to 400px) - tighten further
@media (max-width: 400px) {
  .protocol__inner {
    padding: 0.75rem 0.75rem 3rem;
  }
}
</style>
