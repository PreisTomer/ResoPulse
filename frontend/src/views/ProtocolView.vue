<template>
  <div class="protocol">
    <div class="protocol__inner">

      <!-- Page header -->
      <div class="protocol__header">
        <div class="protocol__eyebrow">
          <span class="protocol__eyebrow-dot"></span>
          {{ $t('protocol.header.eyebrow') }}
        </div>
        <h1 class="protocol__title">{{ $t('protocol.header.title') }}</h1>
        <p class="protocol__subtitle" v-html="$t('protocol.header.subtitle')"></p>
      </div>

      <!-- Mobile-only contents toggle -->
      <button class="protocol__toc-mobile-btn" :class="{ 'protocol__toc-mobile-btn--open': tocMobileOpen }" @click="tocMobileOpen = !tocMobileOpen">
        <span class="protocol__toc-mobile-icon">☰</span>
        <span class="protocol__toc-mobile-label">{{ tocMobileOpen ? 'Close' : 'Contents' }}</span>
        <span class="protocol__toc-mobile-caret" :class="{ 'protocol__toc-mobile-caret--open': tocMobileOpen }">▼</span>
      </button>

      <!-- Two-column layout: TOC + content -->
      <div class="protocol__layout">

        <!-- Sidebar TOC -->
        <nav class="protocol__toc" :class="{ 'protocol__toc--mobile-open': tocMobileOpen }" aria-label="Table of contents">
          <div class="protocol__toc-title" v-html="$t('protocol.toc.title')"></div>
          <a
            v-for="item in tocItems"
            :key="item.id"
            :href="`#${item.id}`"
            class="protocol__toc-link"
            :class="{
              'protocol__toc-indent':        item.indent,
              'protocol__toc-link--active':  isTocActive(item),
            }"
            @click="tocMobileOpen = false"
            v-html="$t(`protocol.toc.${item.key}`)"
          ></a>
        </nav>

        <!-- Main document -->
        <article class="protocol__doc">

          <!-- 1. Overview -->
          <section id="overview" class="protocol__section">
            <h2 class="protocol__section-title" v-html="$t('protocol.overview.title')"></h2>
            <p class="protocol__body-text" v-html="$t('protocol.overview.p1')"></p>
            <p class="protocol__body-text" v-html="$t('protocol.overview.p2')"></p>
            <div class="protocol__info-box">
              <span class="protocol__info-icon">ℹ</span>
              <span v-html="$t('protocol.overview.disclaimer')"></span>
            </div>
          </section>

          <!-- 2. Physical Model -->
          <section id="physics" class="protocol__section">
            <h2 class="protocol__section-title" v-html="$t('protocol.physics.title')"></h2>

            <!-- 2.1 Schwan Equation -->
            <h3 id="schwan" class="protocol__subsection-title" v-html="$t('protocol.physics.schwan.title')"></h3>
            <p class="protocol__body-text" v-html="$t('protocol.physics.schwan.p1')"></p>
            <div class="protocol__eq-block">
              <div class="protocol__eq-main" v-html="$t('protocol.physics.schwan.eqMain')"></div>
              <div class="protocol__eq-divider"></div>
              <div class="protocol__eq-sub" v-html="$t('protocol.physics.schwan.eqSub1')"></div>
              <div class="protocol__eq-sub" v-html="$t('protocol.physics.schwan.eqSub2')"></div>
              <div class="protocol__eq-sub" v-html="$t('protocol.physics.schwan.eqSub3')"></div>
              <div class="protocol__eq-note" v-html="$t('protocol.physics.schwan.eqNote')"></div>
            </div>
            <p class="protocol__body-text" v-html="$t('protocol.physics.schwan.p2')"></p>

            <table class="protocol__param-table">
              <thead>
                <tr>
                  <th v-html="$t('protocol.physics.schwan.thSym')"></th>
                  <th v-html="$t('protocol.physics.schwan.thParam')"></th>
                  <th v-html="$t('protocol.physics.schwan.thUnit')"></th>
                  <th v-html="$t('protocol.physics.schwan.thNote')"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in schwanParams" :key="row.sym">
                  <td class="protocol__mono" v-html="row.sym"></td>
                  <td v-html="row.param"></td>
                  <td class="protocol__mono" v-html="row.unit"></td>
                  <td v-html="row.note"></td>
                </tr>
              </tbody>
            </table>

            <!-- 2.2 SAR & Pennes Bioheat -->
            <h3 id="thermal" class="protocol__subsection-title" v-html="$t('protocol.physics.thermal.title')"></h3>
            <p class="protocol__body-text" v-html="$t('protocol.physics.thermal.p1')"></p>
            <div class="protocol__eq-block">
              <div class="protocol__eq-main" v-html="$t('protocol.physics.thermal.eqSar')"></div>
              <div class="protocol__eq-sub" v-html="$t('protocol.physics.thermal.eqSarSub1')"></div>
              <div class="protocol__eq-sub" v-html="$t('protocol.physics.thermal.eqSarSub2')"></div>
              <div class="protocol__eq-divider"></div>
              <div class="protocol__eq-main" v-html="$t('protocol.physics.thermal.eqTss')"></div>
              <div class="protocol__eq-sub" v-html="$t('protocol.physics.thermal.eqTssSub1')"></div>
              <div class="protocol__eq-sub" v-html="$t('protocol.physics.thermal.eqTssSub2')"></div>
              <div class="protocol__eq-note" v-html="$t('protocol.physics.thermal.eqNote')"></div>
            </div>
            <p class="protocol__body-text" v-html="$t('protocol.physics.thermal.p2')"></p>
            <div class="protocol__note">
              <span v-html="$t('protocol.physics.thermal.scope')"></span>
            </div>

            <!-- 2.3 Maxwell-Garnett -->
            <h3 id="maxwell" class="protocol__subsection-title" v-html="$t('protocol.physics.maxwell.title')"></h3>
            <p class="protocol__body-text" v-html="$t('protocol.physics.maxwell.p1')"></p>
            <div class="protocol__eq-block">
              <div class="protocol__eq-main" v-html="$t('protocol.physics.maxwell.eqMain')"></div>
              <div class="protocol__eq-sub" v-html="$t('protocol.physics.maxwell.eqSub1')"></div>
              <div class="protocol__eq-sub" v-html="$t('protocol.physics.maxwell.eqSub2')"></div>
              <div class="protocol__eq-note" v-html="$t('protocol.physics.maxwell.eqNote')"></div>
            </div>
            <p class="protocol__body-text" v-html="$t('protocol.physics.maxwell.p2')"></p>

            <!-- 2.4 Disruption Criterion -->
            <h3 id="disruption" class="protocol__subsection-title" v-html="$t('protocol.physics.disruption.title')"></h3>
            <p class="protocol__body-text" v-html="$t('protocol.physics.disruption.p1')"></p>
            <div class="protocol__eq-block">
              <div class="protocol__eq-main" v-html="$t('protocol.physics.disruption.eqMain')"></div>
              <div class="protocol__eq-sub" v-html="$t('protocol.physics.disruption.eqSub1')"></div>
              <div class="protocol__eq-sub" v-html="$t('protocol.physics.disruption.eqSub2')"></div>
              <div class="protocol__eq-sub" v-html="$t('protocol.physics.disruption.eqSub3')"></div>
              <div class="protocol__eq-sub" v-html="$t('protocol.physics.disruption.eqSub4')"></div>
              <div class="protocol__eq-sub" v-html="$t('protocol.physics.disruption.eqSub5')"></div>
              <div class="protocol__eq-note" v-html="$t('protocol.physics.disruption.eqNote')"></div>
            </div>
            <p class="protocol__body-text" v-html="$t('protocol.physics.disruption.p2')"></p>
            <p class="protocol__body-text" v-html="$t('protocol.physics.disruption.revEp')"></p>

            <!-- 2.5 Acoustic Resonance -->
            <h3 id="resonance" class="protocol__subsection-title" v-html="$t('protocol.physics.resonance.title')"></h3>
            <p class="protocol__body-text" v-html="$t('protocol.physics.resonance.p1')"></p>
            <div class="protocol__eq-block">
              <div class="protocol__eq-main" v-html="$t('protocol.physics.resonance.eqMain')"></div>
              <div class="protocol__eq-divider"></div>
              <div class="protocol__eq-sub" v-html="$t('protocol.physics.resonance.eqSub1')"></div>
              <div class="protocol__eq-sub" v-html="$t('protocol.physics.resonance.eqSub2')"></div>
              <div class="protocol__eq-sub" v-html="$t('protocol.physics.resonance.eqSub3')"></div>
              <div class="protocol__eq-note" v-html="$t('protocol.physics.resonance.eqNote')"></div>
            </div>

            <table class="protocol__param-table">
              <thead>
                <tr>
                  <th v-html="$t('protocol.physics.resonance.thTarget')"></th>
                  <th v-html="$t('protocol.physics.resonance.thFres')"></th>
                  <th v-html="$t('protocol.physics.resonance.thQ')"></th>
                  <th v-html="$t('protocol.physics.resonance.thEthr')"></th>
                  <th v-html="$t('protocol.physics.resonance.thBasis')"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in resonanceRows" :key="row.target">
                  <td v-html="row.target"></td>
                  <td class="protocol__mono" :class="row.fresClass ? 'protocol__' + row.fresClass : ''" v-html="row.fres"></td>
                  <td class="protocol__mono" v-html="row.q"></td>
                  <td class="protocol__mono" :class="row.ethrClass ? 'protocol__' + row.ethrClass : ''" v-html="row.ethr"></td>
                  <td v-html="row.basis"></td>
                </tr>
              </tbody>
            </table>

            <div class="protocol__info-box">
              <span class="protocol__info-icon">ℹ</span>
              <span v-html="$t('protocol.physics.resonance.infoBox')"></span>
            </div>

            <!-- Model basis notes -->
            <div class="protocol__note">
              <div class="protocol__note-label" v-html="$t('protocol.physics.resonance.noteLabel')"></div>
              <p v-html="$t('protocol.physics.resonance.rfBasis')"></p>
              <p class="protocol__body-text--spaced" v-html="$t('protocol.physics.resonance.envelopedBasis')"></p>
              <p class="protocol__body-text--spaced" v-html="$t('protocol.physics.resonance.bacteriaQ')"></p>
            </div>

            <!-- 2.6 nsEP -->
            <h3 id="nsep" class="protocol__subsection-title" v-html="$t('protocol.physics.nsep.title')"></h3>
            <p class="protocol__body-text" v-html="$t('protocol.physics.nsep.p1')"></p>
            <div class="protocol__eq-block">
              <div class="protocol__eq-main" v-html="$t('protocol.physics.nsep.eqMain')"></div>
              <div class="protocol__eq-sub" v-html="$t('protocol.physics.nsep.eqSub1')"></div>
              <div class="protocol__eq-note" v-html="$t('protocol.physics.nsep.eqNote')"></div>
            </div>
            <div class="protocol__info-box">
              <span class="protocol__info-icon">ℹ</span>
              <span v-html="$t('protocol.physics.nsep.scope')"></span>
            </div>

            <!-- 2.7 Double-Shell -->
            <h3 id="doubleshell" class="protocol__subsection-title" v-html="$t('protocol.physics.doubleshell.title')"></h3>
            <p class="protocol__body-text" v-html="$t('protocol.physics.doubleshell.p1')"></p>
            <div class="protocol__eq-block">
              <div class="protocol__eq-main" v-html="$t('protocol.physics.doubleshell.eqMain')"></div>
              <div class="protocol__eq-divider"></div>
              <div class="protocol__eq-sub" v-html="$t('protocol.physics.doubleshell.eqSub1')"></div>
              <div class="protocol__eq-sub" v-html="$t('protocol.physics.doubleshell.eqSub2')"></div>
              <div class="protocol__eq-note" v-html="$t('protocol.physics.doubleshell.eqNote')"></div>
            </div>
            <div class="protocol__note">
              <div class="protocol__note-label" v-html="$t('protocol.physics.doubleshell.noteLabel')"></div>
              <p v-html="$t('protocol.physics.doubleshell.fpeak')"></p>
              <p class="protocol__body-text--spaced" v-html="$t('protocol.physics.doubleshell.thinShell')"></p>
              <p class="protocol__body-text--spaced" v-html="$t('protocol.physics.doubleshell.sigmaNote')"></p>
            </div>
            <table class="protocol__param-table">
              <thead>
                <tr>
                  <th v-html="$t('protocol.physics.doubleshell.thCell')"></th>
                  <th v-html="$t('protocol.physics.doubleshell.thRnuc')"></th>
                  <th v-html="$t('protocol.physics.doubleshell.thDne')"></th>
                  <th v-html="$t('protocol.physics.doubleshell.thEne')"></th>
                  <th v-html="$t('protocol.physics.doubleshell.thVthr')"></th>
                  <th v-html="$t('protocol.physics.doubleshell.thFpeak')"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in doubleshellRows" :key="row.cell">
                  <td v-html="row.cell"></td>
                  <td class="protocol__mono" :class="row.rnucClass ? 'protocol__' + row.rnucClass : ''" v-html="row.rnuc"></td>
                  <td class="protocol__mono" :class="row.dneClass  ? 'protocol__' + row.dneClass  : ''" v-html="row.dne"></td>
                  <td class="protocol__mono" :class="row.eneClass  ? 'protocol__' + row.eneClass  : ''" v-html="row.ene"></td>
                  <td class="protocol__mono" :class="row.vThrClass ? 'protocol__' + row.vThrClass : ''" v-html="row.vthr"></td>
                  <td class="protocol__mono" :class="row.fpeakClass ? 'protocol__' + row.fpeakClass : ''" v-html="row.fpeak"></td>
                </tr>
              </tbody>
            </table>

            <!-- 2.8 Conductivity Uncertainty -->
            <h3 id="uncertainty" class="protocol__subsection-title" v-html="$t('protocol.physics.uncertainty.title')"></h3>
            <p class="protocol__body-text" v-html="$t('protocol.physics.uncertainty.p1')"></p>
            <p class="protocol__body-text" v-html="$t('protocol.physics.uncertainty.p2')"></p>
            <table class="protocol__param-table">
              <thead>
                <tr>
                  <th v-html="$t('protocol.physics.uncertainty.thCategory')"></th>
                  <th v-html="$t('protocol.physics.uncertainty.thBand')"></th>
                  <th v-html="$t('protocol.physics.uncertainty.thRange')"></th>
                  <th v-html="$t('protocol.physics.uncertainty.thSource')"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in uncertaintyRows" :key="row.category">
                  <td v-html="row.category"></td>
                  <td class="protocol__mono" :class="row.bandClass ? 'protocol__' + row.bandClass : ''" v-html="row.band"></td>
                  <td class="protocol__mono" v-html="row.range"></td>
                  <td v-html="row.source"></td>
                </tr>
              </tbody>
            </table>

            <!-- 2.9 Sub-threshold Biomodulation -->
            <h3 id="biomodulation" class="protocol__subsection-title" v-html="$t('protocol.physics.biomodulation.title')"></h3>
            <p class="protocol__body-text" v-html="$t('protocol.physics.biomodulation.p1')"></p>
            <p class="protocol__body-text" v-html="$t('protocol.physics.biomodulation.p2')"></p>
            <p class="protocol__body-text" v-html="$t('protocol.physics.biomodulation.p3')"></p>
            <p class="protocol__body-text" v-html="$t('protocol.physics.biomodulation.p4')"></p>

            <!-- 2.10 Impedance Feedback -->
            <h3 id="impedance" class="protocol__subsection-title" v-html="$t('protocol.physics.impedance.title')"></h3>
            <p class="protocol__body-text" v-html="$t('protocol.physics.impedance.p1')"></p>
            <p class="protocol__body-text" v-html="$t('protocol.physics.impedance.p2')"></p>
            <div class="protocol__eq-block">
              <div class="protocol__eq-main" v-html="$t('protocol.physics.impedance.eqMain')"></div>
              <div class="protocol__eq-sub" v-html="$t('protocol.physics.impedance.eqSub1')"></div>
              <div class="protocol__eq-sub" v-html="$t('protocol.physics.impedance.eqSub2')"></div>
              <div class="protocol__eq-sub" v-html="$t('protocol.physics.impedance.eqSub3')"></div>
              <div class="protocol__eq-divider"></div>
              <div class="protocol__eq-main" v-html="$t('protocol.physics.impedance.eqZ')"></div>
              <div class="protocol__eq-main" v-html="$t('protocol.physics.impedance.eqCorr')"></div>
              <div class="protocol__eq-note" v-html="$t('protocol.physics.impedance.eqNote')"></div>
            </div>
            <div class="protocol__note">
              <div class="protocol__note-label" v-html="$t('protocol.physics.impedance.hardwareTitle')"></div>
              <p v-html="$t('protocol.physics.impedance.hardwareP')"></p>
              <p class="protocol__body-text--spaced" v-html="$t('protocol.physics.impedance.hardwareSchema')"></p>
            </div>

            <!-- 2.11 Auditory Display (Sonification) -->
            <h3 id="sonification" class="protocol__subsection-title" v-html="$t('protocol.physics.sonification.title')"></h3>
            <p class="protocol__body-text" v-html="$t('protocol.physics.sonification.p1')"></p>
            <div class="protocol__warn-box" v-html="$t('protocol.physics.sonification.disclaimer')"></div>
            <p class="protocol__body-text" v-html="$t('protocol.physics.sonification.mappingsTitle')"></p>
            <table class="protocol__param-table">
              <thead>
                <tr>
                  <th v-html="$t('protocol.physics.sonification.thParam')"></th>
                  <th v-html="$t('protocol.physics.sonification.thMapping')"></th>
                  <th v-html="$t('protocol.physics.sonification.thNote')"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in sonificationMappings" :key="row.param">
                  <td v-html="row.param"></td>
                  <td class="protocol__mono protocol__primary-val" v-html="row.mapping"></td>
                  <td v-html="row.note"></td>
                </tr>
              </tbody>
            </table>
            <p class="protocol__body-text" v-html="$t('protocol.physics.sonification.p2')"></p>
            <div class="protocol__note">
              <span v-html="$t('protocol.physics.sonification.refNote')"></span>
            </div>

          </section>

          <!-- 3. Step-by-step protocol -->
          <section id="protocol-steps" class="protocol__section">
            <h2 class="protocol__section-title" v-html="$t('protocol.protocol.title')"></h2>
            <ol class="protocol__steps">

              <li v-for="(stepKey, i) in protocolStepKeys" :key="stepKey" class="protocol__step">
                <div class="protocol__step-num">{{ String(i + 1).padStart(2, '0') }}</div>
                <div class="protocol__step-body">
                  <div class="protocol__step-title" v-html="$t(`protocol.protocol.steps.${stepKey}.title`)"></div>
                  <p class="protocol__step-desc" v-html="$t(`protocol.protocol.steps.${stepKey}.desc`)"></p>
                </div>
              </li>

            </ol>
          </section>

          <!-- 4. Safety -->
          <section id="safety" class="protocol__section">
            <h2 class="protocol__section-title" v-html="$t('protocol.safety.title')"></h2>
            <p class="protocol__body-text" v-html="$t('protocol.safety.intro')"></p>
            <table class="protocol__param-table">
              <thead>
                <tr>
                  <th v-html="$t('protocol.safety.thParam')"></th>
                  <th v-html="$t('protocol.safety.thValue')"></th>
                  <th v-html="$t('protocol.safety.thSig')"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="row in safetyRows" :key="row.param">
                  <td v-html="row.param"></td>
                  <td class="protocol__mono" :class="row.valueClass ? 'protocol__' + row.valueClass : ''" v-html="row.value"></td>
                  <td v-html="row.sig"></td>
                </tr>
              </tbody>
            </table>
          </section>

          <!-- 5. References -->
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

        </article>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

interface SchwanParamRow   { sym: string; param: string; unit: string; note: string }
interface ResonanceRow     { target: string; fres: string; fresClass: string; q: string; ethr: string; ethrClass: string; basis: string }
interface DoubleshellRow   { cell: string; rnuc: string; rnucClass?: string; dne: string; dneClass?: string; ene: string; eneClass?: string; vthr: string; vThrClass?: string; fpeak: string; fpeakClass: string }
interface UncertaintyRow   { category: string; band: string; bandClass: string; range: string; source: string }
interface SafetyRow        { param: string; value: string; valueClass: string; sig: string }
interface RawRefItem       { body: string; doi?: string; pmid?: string; note?: string }
interface RefItem          { body: string; url?: string; urlLabel?: string; note?: string }
interface TocItem          { id: string; key: string; indent: boolean; physicsParent?: boolean }

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
  'resonance', 'nsep', 'doubleshell', 'uncertainty', 'biomodulation',
  'impedance', 'sonification',
  'protocol-steps', 'safety', 'refs',
] as const

const PHYSICS_IDS = new Set(['physics', 'schwan', 'thermal', 'maxwell', 'disruption', 'resonance', 'nsep', 'doubleshell', 'uncertainty', 'biomodulation', 'impedance', 'sonification'])

export default defineComponent({
  data() {
    return {
      activeSection: 'overview' as string,
      tocMobileOpen: false,
    }
  },

  computed: {
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

    uncertaintyRows(): UncertaintyRow[] {
      return (this.$tm as Function)('protocol.physics.uncertainty.rows') as UncertaintyRow[]
    },

    safetyRows(): SafetyRow[] {
      return (this.$tm as Function)('protocol.safety.rows') as SafetyRow[]
    },

    sonificationMappings(): Array<{ param: string; mapping: string; note: string }> {
      return (this.$tm as Function)('protocol.physics.sonification.mappings') as Array<{ param: string; mapping: string; note: string }>
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

  methods: {
    isTocActive(item: TocItem): boolean {
      return item.physicsParent ? this.isPhysicsActive : this.activeSection === item.id
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
    ;(this as unknown as Record<string, unknown>)._scrollHandler = handler
  },

  beforeUnmount() {
    const handler = (this as unknown as Record<string, unknown>)._scrollHandler as EventListener | undefined
    if (handler) window.removeEventListener('scroll', handler)
  },
})
</script>

<style lang="scss" scoped>
@use '../styles/mixins' as *;

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

  &__eyebrow {
    @include flex-row(0.5rem);
    @include mono-upper(0.72rem, 0.14em);
    color: var(--color-primary);
    margin-bottom: 0.75rem;
  }

  &__eyebrow-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: var(--color-primary);
    box-shadow: 0 0 8px var(--color-primary);
  }

  &__title {
    font-size: 2rem;
    font-weight: 800;
    color: var(--color-text-heading);
    margin: 0 0 0.5rem;
  }

  &__subtitle {
    font-size: 0.875rem;
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

  &__toc {
    @include flex-col(0.05rem);
    position: sticky;
    top: 5rem;
    max-height: calc(100vh - 6rem);
    overflow-y: auto;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    padding: 1.25rem;
    scrollbar-width: thin;
    scrollbar-color: var(--color-border) transparent;
  }

  &__toc-title {
    @include mono-upper(0.65rem, 0.12em);
    color: var(--color-text-muted);
    margin-bottom: 0.65rem;
  }

  &__toc-link {
    font-size: 0.8rem;
    color: var(--color-text-muted);
    text-decoration: none;
    padding: 0.3rem 0.5rem;
    border-radius: 4px;
    transition: color 0.15s, background-color 0.15s;
    line-height: 1.4;

    &:hover {
      color: var(--color-primary);
      background-color: rgba(0, 212, 255, 0.06);
    }

    &--active {
      color: var(--color-primary);
      background-color: rgba(0, 212, 255, 0.08);
      border-left: 2px solid var(--color-primary);
      padding-left: calc(0.5rem - 2px);
    }
  }

  &__toc-indent {
    padding-left: 1.5rem;
    font-size: 0.73rem;

    &.protocol__toc-link--active {
      padding-left: calc(1.5rem - 2px);
    }
  }

  /* ── Document ──────────────────────────────────────────── */
  &__doc { @include flex-col(0rem); }

  &__section {
    @include flex-col(1rem);
    padding-bottom: 2.5rem;
    border-bottom: 1px solid var(--color-border);
    margin-bottom: 2.5rem;
    // Offset scroll-to-anchor by sticky navbar height so headings aren't hidden
    scroll-margin-top: 5rem;

    &:last-child { border-bottom: none; }
  }

  &__section-title {
    font-size: 1.15rem;
    font-weight: 700;
    color: var(--color-text-heading);
    margin: 0;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid var(--color-border);
  }

  &__subsection-title {
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--color-text-heading);
    margin: 0.5rem 0 0;
    padding-top: 1rem;
  }

  &__body-text {
    font-size: 0.875rem;
    line-height: 1.7;
    color: var(--color-text);
    margin: 0;

    &--spaced { margin-top: 0.6rem; }
  }

  /* ── Equation blocks ──────────────────────────────────── */
  &__eq-block {
    background: rgba(0, 0, 0, 0.25);
    border: 1px solid var(--color-border);
    border-left: 3px solid var(--color-primary);
    border-radius: var(--radius);
    padding: 0.85rem 1.15rem;
    display: flex;
    flex-direction: column;
    gap: 0.3rem;
  }

  &__eq-main {
    font-family: var(--font-mono);
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--color-text-heading);
    letter-spacing: 0.01em;
  }

  &__eq-sub {
    font-family: var(--font-mono);
    font-size: 0.78rem;
    color: var(--color-text-muted);
    padding-left: 0.5rem;
    line-height: 1.5;
  }

  &__eq-divider {
    height: 1px;
    background: var(--color-border);
    opacity: 0.5;
    margin: 0.2rem 0;
  }

  &__eq-note {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    color: var(--color-text-muted);
    opacity: 0.7;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    padding-top: 0.35rem;
    margin-top: 0.15rem;
  }

  /* ── Tables ───────────────────────────────────────────── */
  &__param-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8rem;

    th, td {
      padding: 0.45rem 0.7rem;
      text-align: left;
      border-bottom: 1px solid var(--color-border);
    }

    th {
      font-family: var(--font-mono);
      font-size: 0.68rem;
      text-transform: uppercase;
      letter-spacing: 0.07em;
      color: var(--color-text-muted);
      background: rgba(0, 0, 0, 0.2);
    }

    td { color: var(--color-text); line-height: 1.45; }

    tr:last-child td { border-bottom: none; }
    tr:hover td { background: rgba(255, 255, 255, 0.02); }
  }

  &__mono { font-family: var(--font-mono); font-size: 0.78rem; }

  &__primary-val  { color: var(--color-primary); }
  &__cancer-val   { color: var(--color-danger); }
  &__warn-val     { color: var(--color-amber); }
  &__ref-val      { color: var(--color-lime); }
  &__muted        { color: var(--color-text-muted); opacity: 0.6; }

  /* ── Info / note boxes ─────────────────────────────────── */
  &__info-box {
    display: flex;
    gap: 0.65rem;
    align-items: flex-start;
    background: rgba(0, 212, 255, 0.05);
    border: 1px solid rgba(0, 212, 255, 0.18);
    border-radius: var(--radius);
    padding: 0.65rem 0.85rem;
    font-size: 0.83rem;
    line-height: 1.6;
    color: var(--color-text);
  }

  &__info-icon {
    color: var(--color-primary);
    font-size: 0.85rem;
    flex-shrink: 0;
    margin-top: 0.05rem;
  }

  &__note {
    border-left: 3px solid var(--color-border);
    padding: 0.55rem 0.85rem;
    background: rgba(255, 255, 255, 0.02);
    font-size: 0.82rem;
    line-height: 1.6;
    color: var(--color-text-muted);
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  &__note-label {
    font-size: 0.62rem;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: var(--color-text-muted);
    opacity: 0.7;
    margin-bottom: 0.25rem;
  }

  /* ── Protocol steps ───────────────────────────────────── */
  &__steps {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
  }

  &__step {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    padding: 0.75rem 1rem;
    transition: border-color 0.15s;

    &:hover { border-color: rgba(0, 212, 255, 0.25); }
  }

  &__step-num {
    font-family: var(--font-mono);
    font-size: 1.1rem;
    font-weight: 800;
    color: var(--color-primary);
    opacity: 0.35;
    flex-shrink: 0;
    width: 2rem;
    line-height: 1.5;
  }

  &__step-body { @include flex-col(0.25rem); flex: 1; }

  &__step-title {
    font-size: 0.88rem;
    font-weight: 600;
    color: var(--color-text-heading);
  }

  &__step-desc {
    font-size: 0.83rem;
    line-height: 1.6;
    color: var(--color-text);
    margin: 0;
  }

  /* ── References ───────────────────────────────────────── */
  &__refs-list {
    list-style: none;
    padding: 0;
    margin: 0;
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
  }

  &__ref-item {
    display: flex;
    gap: 0.65rem;
    font-size: 0.82rem;
    line-height: 1.55;
    color: var(--color-text-muted);
    align-items: flex-start;
  }

  &__ref-num {
    font-family: var(--font-mono);
    font-size: 0.72rem;
    color: var(--color-primary);
    opacity: 0.75;
    flex-shrink: 0;
    min-width: 2.2rem;
    padding-top: 0.1rem;
  }

  &__ref-body {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
  }

  &__ref-link {
    font-family: var(--font-mono);
    font-size: 0.7rem;
    color: var(--color-primary);
    text-decoration: none;
    opacity: 0.8;
    transition: opacity 0.15s;

    &:hover { opacity: 1; text-decoration: underline; }
  }

  &__ref-note {
    font-family: var(--font-mono);
    font-size: 0.68rem;
    color: var(--color-text-muted);
    opacity: 0.6;
    font-style: italic;
  }

  &__ref-note-inline {
    font-size: 0.7rem;
    color: var(--color-text-muted);
    opacity: 0.75;
    font-style: italic;
  }

  /* ── Warn box (legacy — kept for forward compat) ─────── */
  &__warn-box {
    background: rgba(251, 191, 36, 0.06);
    border: 1px solid rgba(251, 191, 36, 0.25);
    border-radius: var(--radius);
    padding: 0.65rem 0.9rem;
    font-size: 0.82rem;
    line-height: 1.6;
    color: var(--color-amber);
  }

  // ── Mobile TOC toggle button (hidden on desktop) ────────────────────────────
  &__toc-mobile-btn {
    display: none;
  }

  &__toc-mobile-caret {
    font-size: 0.6rem;
    opacity: 0.7;
    transition: transform 0.2s;
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
    border: 1.5px solid rgba(0, 212, 255, 0.35);
    border-radius: var(--radius);
    color: var(--color-primary);
    font-size: 0.88rem;
    font-family: var(--font-mono);
    font-weight: 600;
    letter-spacing: 0.04em;
    cursor: pointer;
    margin-bottom: 0.75rem;
    transition: border-color 0.15s, background 0.15s, box-shadow 0.15s;
    box-shadow: 0 0 12px rgba(0, 212, 255, 0.08);

    &:hover, &--open {
      border-color: var(--color-primary);
      background: rgba(0, 212, 255, 0.06);
      box-shadow: 0 0 18px rgba(0, 212, 255, 0.18);
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

  // Hide sidebar TOC on mobile by default
  .protocol__toc {
    display: none;
    position: fixed;
    top: 60px;
    left: 0;
    right: 0;
    // Use dvh (dynamic viewport height) so overlay fills screen even as browser
    // chrome appears/disappears on scroll. Falls back to vh for older browsers.
    height: calc(100vh - 60px);
    height: calc(100dvh - 60px);
    z-index: 90;
    background: rgba(8, 14, 26, 0.97);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-top: 1px solid var(--color-border);
    padding: 1.5rem 1.25rem;
    overflow-y: auto;
    flex-direction: column;
    gap: 0.1rem;

    &--mobile-open {
      display: flex;
    }
  }

  // Full-width single column layout
  .protocol__layout {
    grid-template-columns: 1fr;
  }

  .protocol__inner {
    padding: 1rem 1rem 3rem;
  }

  .protocol__toc-link {
    font-size: 0.9rem;
    padding: 0.65rem 0.75rem;
    border-bottom: 1px solid rgba(30, 58, 95, 0.4);

    &:last-child { border-bottom: none; }
  }

  .protocol__toc-indent {
    padding-left: 1.75rem;
    font-size: 0.82rem;
  }

  // Keep tables scrollable
  .protocol__param-table,
  .protocol__doubleshell-table,
  .protocol__safety-table {
    font-size: 0.72rem;
    display: block;
    overflow-x: auto;
  }

  // Prevent doc from escaping its column
  .protocol__doc {
    min-width: 0;
    max-width: 100%;
    overflow-x: hidden;
  }

  // Equation blocks: scroll internally rather than pushing page width
  .protocol__eq-block {
    overflow-x: auto;
    padding: 0.65rem 0.85rem;
    // Shrink mono text so shorter formulas fit without any scroll
    font-size: 0.8rem;
  }

  .protocol__eq-main {
    font-size: 0.78rem;
    white-space: nowrap; // allow horizontal scroll within the block
  }

  .protocol__eq-sub {
    font-size: 0.68rem;
    white-space: nowrap;
    padding-left: 0.35rem;
  }

  .protocol__eq-note {
    font-size: 0.6rem;
    white-space: normal; // notes wrap normally
  }

  // Warn / info boxes: ensure they don't overflow
  .protocol__warn-box,
  .protocol__info-box {
    font-size: 0.78rem;
    overflow-wrap: break-word;
    word-break: break-word;
  }

  // Step numbers and body text: comfortable reading width
  .protocol__body-text {
    font-size: 0.88rem;
    overflow-wrap: break-word;
    word-break: break-word;
  }
}

// Extra-small phones (≤400px) — tighten further
@media (max-width: 400px) {
  .protocol__inner {
    padding: 0.75rem 0.75rem 3rem;
  }

  .protocol__eq-main { font-size: 0.72rem; }
  .protocol__eq-sub  { font-size: 0.62rem; }

  .protocol__section-title {
    font-size: 1rem;
  }

  .protocol__toc-link {
    font-size: 0.82rem;
    padding: 0.5rem 0.65rem;
  }
}
</style>
