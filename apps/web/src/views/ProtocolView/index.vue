<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
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

      <!-- Two-column layout: TOC + content (+ validation indicator on wide screens) -->
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

          <ProtocolSectionValidation />

          <ProtocolSectionPhysics
            :schwan-params="schwanParams"
            :resonance-rows="resonanceRows"
            :doubleshell-rows="doubleshellRows"
            :dep-rows="depRows"
            :uncertainty-rows="uncertaintyRows"
            :sonification-mappings="sonificationMappings"
            :electrosensitization-examples="electrosensitizationExamples"
          />

          <ProtocolSectionSteps :step-keys="protocolStepKeys" />

          <ProtocolSectionSafety :rows="safetyRows" />

          <ProtocolSectionRefs :ref-list="refList" />
        </article>

        <!-- Validation indicator panel — shown only on very wide screens where space is available -->
        <aside class="protocol__validate-aside">
          <div class="protocol__validate-card">
            <span class="protocol__validate-icon">{{ ICON.FLASK }}</span>
            <span class="protocol__validate-tag">{{ $t('protocol.validateAside.tag') }}</span>
            <h3 class="protocol__validate-card-title">{{ $t('protocol.validateAside.title') }}</h3>
            <p class="protocol__validate-card-desc">{{ $t('protocol.validateAside.desc') }}</p>
            <a
              class="protocol__validate-btn"
              href="#validation"
              @click.prevent="scrollToValidation"
            >{{ $t('protocol.validateAside.cta') }}</a>
            <div class="protocol__validate-scenarios">
              <span class="protocol__validate-scenario-label">{{ $t('protocol.validateAside.scenariosLabel') }}</span>
              <span
                v-for="s in validateScenarios"
                :key="s"
                class="protocol__validate-scenario-pill"
              >{{ s }}</span>
            </div>
          </div>
        </aside>

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

import PageHeader from '@/components/PageHeader/index.vue'

import { ICON } from '@/constants/icons'

import { scrollAndHighlight } from '@/utils/highlight'

import ProtocolToc from './ProtocolToc.vue'
import ProtocolSectionOverview from './ProtocolSectionOverview.vue'
import ProtocolSectionValidation from './ProtocolSectionValidation.vue'
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
  ElectrosensitizationRow,
} from './types'

const TOC_ITEMS: TocItem[] = [
  { id: 'overview',       key: 'overview',      indent: false },
  { id: 'validation',     key: 'validate',      indent: false },
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
  { id: 'sonification',          key: 'sonification',          indent: true },
  { id: 'electrosensitization',  key: 'electrosensitization',  indent: true },
  { id: 'closedloop',            key: 'closedloop',            indent: true },
  { id: 'protocol-steps', key: 'protocol',      indent: false },
  { id: 'safety',         key: 'safety',        indent: false },
  { id: 'refs',           key: 'refs',          indent: false },
]

const ALL_SECTION_IDS = [
  'overview',
  'validation',
  'physics', 'schwan', 'thermal', 'maxwell', 'disruption',
  'resonance', 'nsep', 'doubleshell', 'dep', 'uncertainty', 'biomodulation',
  'impedance', 'sonification', 'electrosensitization', 'closedloop',
  'protocol-steps', 'safety', 'refs',
] as const

const PHYSICS_IDS = new Set(['physics', 'schwan', 'thermal', 'maxwell', 'disruption', 'resonance', 'nsep', 'doubleshell', 'dep', 'uncertainty', 'biomodulation', 'impedance', 'sonification', 'electrosensitization', 'closedloop'])

export default defineComponent({
  name: 'ProtocolView',

  components: {
    PageHeader,
    ProtocolToc,
    ProtocolSectionOverview,
    ProtocolSectionValidation,
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
      _refScrollTimer:   null as ReturnType<typeof setTimeout> | null,
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

    electrosensitizationExamples(): ElectrosensitizationRow[] {
      return (this.$tm as Function)('protocol.physics.electrosensitization.examples') as ElectrosensitizationRow[]
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

    validateScenarios(): string[] {
      return (this.$tm as Function)('protocol.validateAside.scenarios') as string[]
    },
  },

  watch: {
    '$route.hash'(hash: string) {
      this.scrollToRefHash(hash)
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

    // Deep-link from LiteratureStrip: scroll to and highlight the specific reference item.
    this.scrollToRefHash(this.$route.hash)
  },

  beforeUnmount() {
    if (this._scrollHandler) window.removeEventListener('scroll', this._scrollHandler)
    if (this._refScrollTimer) clearTimeout(this._refScrollTimer)
  },

  methods: {
    isTocActive(item: TocItem): boolean {
      return item.physicsParent ? this.isPhysicsActive : this.activeSection === item.id
    },

    scrollToValidation(): void {
      document.getElementById('validation')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    },

    scrollToRefHash(hash: string): void {
      if (!hash.startsWith('#')) return
      const id = hash.slice(1)

      if (!hash.startsWith('#ref')) {
        // Section anchor (e.g. #validation) — scroll only, no highlight.
        this._refScrollTimer = setTimeout(() => {
          this._refScrollTimer = null
          document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 400)
        return
      }

      if (id === 'refs') {
        // Section-level ref link — scroll only, no highlight animation.
        this._refScrollTimer = setTimeout(() => {
          this._refScrollTimer = null
          document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }, 400)
      } else {
        scrollAndHighlight(id, 400)
      }
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

    @media (min-width: 1540px) {
      grid-template-columns: 220px minmax(0, 1fr) 200px;
    }
  }

  // ── Validation aside panel — right column, wide screens only ─────────────────
  &__validate-aside {
    display: none;
    position: sticky;
    top: 5rem;

    @media (min-width: 1540px) {
      display: block;
    }
  }

  &__validate-card {
    @include flex-col(0.55rem);
    padding: 1rem 0.9rem 1.1rem;
    background: color-mix(in srgb, var(--color-primary) 5%, var(--color-surface));
    border: 1px solid color-mix(in srgb, var(--color-primary) 28%, transparent);
    border-radius: var(--radius);
    box-shadow: 0 2px 18px color-mix(in srgb, var(--color-primary) 6%, transparent);
  }

  &__validate-icon {
    font-size: 1.6rem;
    line-height: 1;
    opacity: var(--op-partial);
  }

  &__validate-tag {
    @include mono-upper(0.58rem, 0.1em);
    color: var(--color-primary);
    opacity: var(--op-dim);
  }

  &__validate-card-title {
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
    line-height: 1.35;
  }

  &__validate-card-desc {
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
    line-height: 1.6;
    margin: 0;
    opacity: var(--op-dim);
  }

  &__validate-btn {
    display: block;
    text-align: center;
    padding: 0.45rem 0.7rem;
    background: color-mix(in srgb, var(--color-primary) 14%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-primary) 45%, transparent);
    border-radius: var(--radius);
    color: var(--color-primary);
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    font-weight: 700;
    letter-spacing: 0.04em;
    text-decoration: none;
    transition: background var(--tr-normal), border-color var(--tr-normal), box-shadow var(--tr-normal);

    &:hover {
      background: color-mix(in srgb, var(--color-primary) 22%, transparent);
      border-color: var(--color-primary);
      box-shadow: 0 0 10px color-mix(in srgb, var(--color-primary) 20%, transparent);
    }
  }

  &__validate-scenarios {
    @include flex-col(0.3rem);
    margin-top: 0.1rem;
  }

  &__validate-scenario-label {
    @include mono-upper(0.58rem, 0.08em);
    color: var(--color-text-muted);
    opacity: var(--op-ghost);
  }

  &__validate-scenario-pill {
    font-family: var(--font-mono);
    font-size: 0.6rem; // deliberate micro below scale
    padding: 0.12rem 0.45rem;
    border-radius: 3px;
    border: 1px solid var(--color-border);
    color: var(--color-text-muted);
    opacity: var(--op-dim);
    line-height: 1.5;
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

  .protocol__layout {
    grid-template-columns: 1fr;
  }

  .protocol__inner {
    padding: 1rem 1rem 3rem;
  }

  .protocol__param-table,
  .protocol__doubleshell-table,
  .protocol__safety-table {
    font-size: var(--fs-sm);
    display: block;
    overflow-x: auto;
  }

  .protocol__doc {
    min-width: 0;
    max-width: 100%;
    overflow-x: hidden;
  }
}

@media (max-width: 400px) {
  .protocol__inner {
    padding: 0.75rem 0.75rem 3rem;
  }
}
</style>
