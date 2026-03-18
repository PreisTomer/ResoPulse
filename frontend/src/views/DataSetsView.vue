<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="datasets">
    <div class="datasets__inner">

      <!-- Page header -->
      <div class="datasets__header">
        <div class="datasets__eyebrow">
          <span class="datasets__eyebrow-dot"></span>
          {{ $t('datasets.eyebrow') }}
        </div>
        <h1 class="datasets__title" v-html="$t('datasets.title')"></h1>
        <p class="datasets__subtitle">
          <span v-html="$t('datasets.subtitle')"></span>
          <br><span v-html="$t('datasets.subtitleNote')"></span>
        </p>
      </div>

      <!-- Group legend -->
      <div class="datasets__legend-row">
        <div
          v-for="g in GROUPS"
          :key="g"
          class="datasets__legend-item"
          :style="{ '--g-color': GROUP_COLORS[g] }"
          v-tip="$t(`datasets.tip.legend${g.charAt(0).toUpperCase() + g.slice(1)}`)"
        >
          <span class="datasets__legend-dot"></span>
          {{ GROUP_LABELS[g] }}
        </div>
      </div>

      <!-- Cell library table -->
      <section class="datasets__card">
        <div class="datasets__card-hdr">
          <h2 class="datasets__card-title">{{ $t('datasets.cellLib.sectionTitle') }}</h2>
          <span class="datasets__card-tag">{{ $t('datasets.cellLib.sectionTag', { n: presets.length }) }}</span>
        </div>
        <div class="datasets__table-wrap">
          <table class="datasets__table">
            <thead>
              <tr>
                <th>{{ $t('datasets.cellLib.colGroup') }}</th>
                <th>{{ $t('datasets.cellLib.colCell') }}</th>
                <th>{{ $t('datasets.cellLib.colR') }}</th>
                <th>{{ $t('datasets.cellLib.colD') }}</th>
                <th v-tip="$t('datasets.tip.colEr')" v-html="$t('datasets.cellLib.colEr')"></th>
                <th v-tip="$t('datasets.tip.colSigI')" v-html="$t('datasets.cellLib.colSigI')"></th>
                <th v-tip="$t('datasets.tip.colCm')" v-html="$t('datasets.cellLib.colCm')"></th>
                <th v-tip="$t('datasets.tip.colFc')" v-html="$t('datasets.cellLib.colFc')"></th>
                <th v-tip="$t('datasets.tip.colFcross')" v-html="$t('datasets.cellLib.colFcross')"></th>
                <th v-tip="$t('datasets.tip.colVmThr')" v-html="$t('datasets.cellLib.colVmThr')"></th>
                <th v-tip="$t('datasets.tip.colRnuc')" v-html="$t('datasets.cellLib.colRnuc')"></th>
                <th v-tip="$t('datasets.tip.colRho')">{{ $t('datasets.cellLib.colRho') }}</th>
                <th v-tip="$t('datasets.tip.colFres')" v-html="$t('datasets.cellLib.colFres')"></th>
                <th v-tip="$t('datasets.tip.colQ')">{{ $t('datasets.cellLib.colQ') }}</th>
                <th v-tip="$t('datasets.tip.colEthr')" v-html="$t('datasets.cellLib.colEthr')"></th>
                <th>{{ $t('datasets.cellLib.colNotes') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in presets" :key="p.presetId">
                <td>
                  <span
                    class="datasets__group-badge"
                    :style="{
                      color: p.color,
                      borderColor: p.color + '55',
                      background: p.color + '11',
                    }"
                  >{{ p.groupLabel }}</span>
                </td>
                <td class="datasets__cell-name">{{ p.label }}</td>
                <td class="datasets__mono">{{ p.radius }}</td>
                <td class="datasets__mono">{{ p.membraneThickness }}</td>
                <td class="datasets__mono">{{ p.dielectricConstant.toFixed(1) }}</td>
                <td class="datasets__mono">{{ p.conductivity }}</td>
                <td class="datasets__mono datasets__primary-val">{{ p.cmDisplay }}</td>
                <td class="datasets__mono datasets__primary-val">{{ p.fcDisplay }}</td>
                <td class="datasets__mono" :class="p.fcrossDisplay !== '—' ? 'datasets__dep-val' : 'datasets__muted'">{{ p.fcrossDisplay }}</td>
                <td
                  class="datasets__mono"
                  :class="p.group === CELL_GROUP.REFERENCE ? 'datasets__ref-val' : 'datasets__cancer-val'"
                >{{ p.thresholdVoltage.toFixed(2) }}</td>
                <td class="datasets__mono" :class="p.hasNuclear ? 'datasets__nuc-val' : 'datasets__muted'">{{ p.nucRDisplay }}</td>
                <td class="datasets__mono datasets__muted">{{ p.density }}</td>
                <td class="datasets__mono" :class="p.hasResonance ? 'datasets__primary-val' : 'datasets__muted'">{{ p.resFreqDisplay }}</td>
                <td class="datasets__mono" :class="p.hasResonance ? '' : 'datasets__muted'">{{ p.resQDisplay }}</td>
                <td class="datasets__mono" :class="p.hasResonance ? 'datasets__warn-val' : 'datasets__muted'">{{ p.resEthrDisplay }}</td>
                <td class="datasets__notes-cell" v-tip="p.techNotes ?? p.notes">{{ p.notes }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="datasets__formula-strip">
          <div class="datasets__formula-block">
            <div class="datasets__formula-label">{{ $t('datasets.cellLib.fLabel1') }}</div>
            <div class="datasets__formula-eq">{{ $t('datasets.cellLib.fEq1') }}</div>
          </div>
          <div class="datasets__formula-block">
            <div class="datasets__formula-label">{{ $t('datasets.cellLib.fLabel2') }}</div>
            <div class="datasets__formula-eq">{{ $t('datasets.cellLib.fEq2') }}</div>
          </div>
          <div class="datasets__formula-block">
            <div class="datasets__formula-label">{{ $t('datasets.cellLib.fLabel3') }}</div>
            <div class="datasets__formula-eq">{{ $t('datasets.cellLib.fEq3') }}</div>
          </div>
          <div class="datasets__formula-block datasets__formula-block--wide">
            <div class="datasets__formula-label">{{ $t('datasets.cellLib.fLabel4') }}</div>
            <div class="datasets__formula-eq">{{ $t('datasets.cellLib.fEq4') }}</div>
            <div class="datasets__formula-note">{{ $t('datasets.cellLib.fNote4') }}</div>
          </div>
        </div>
      </section>

      <!-- Propagation media -->
      <section class="datasets__card">
        <div class="datasets__card-hdr">
          <h2 class="datasets__card-title">{{ $t('datasets.media.sectionTitle') }}</h2>
          <span class="datasets__card-tag" v-html="$t('datasets.media.sectionTag')"></span>
        </div>
        <div class="datasets__table-wrap">
          <table class="datasets__table">
            <thead>
              <tr>
                <th>{{ $t('datasets.media.colKey') }}</th>
                <th>{{ $t('datasets.media.colMedium') }}</th>
                <th v-html="$t('datasets.media.colSigE')"></th>
                <th v-tip="$t('datasets.media.colEpsRTip')" v-html="$t('datasets.media.colEpsR')"></th>
                <th v-tip="$t('datasets.media.colAlphaTip')" v-html="$t('datasets.media.colAlpha')"></th>
                <th v-html="$t('datasets.media.colEffect')"></th>
                <th>{{ $t('datasets.media.colUse') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="m in mediaRows" :key="m.id">
                <td class="datasets__mono" :class="m.keyClass">{{ $t(`datasets.media.${m.id}Key`) }}</td>
                <td v-tip="$t(`datasets.tip.media${m.id.charAt(0).toUpperCase() + m.id.slice(1)}`)">{{ $t(`datasets.media.${m.id}Name`) }}</td>
                <td class="datasets__mono">{{ m.sigma }}</td>
                <td class="datasets__mono">{{ m.epsilonR }}</td>
                <td class="datasets__mono">{{ m.alphaT }}</td>
                <td v-html="$t(`datasets.media.${m.id}Effect`)"></td>
                <td>{{ $t(`datasets.media.${m.id}Use`) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="datasets__formula-strip">
          <div class="datasets__formula-block datasets__formula-block--wide">
            <div class="datasets__formula-label">{{ $t('datasets.media.fLabel1') }}</div>
            <div class="datasets__formula-eq">{{ $t('datasets.media.fEq1') }}</div>
          </div>
          <div class="datasets__formula-block">
            <div class="datasets__formula-label">{{ $t('datasets.media.fLabel2') }}</div>
            <div class="datasets__formula-eq">{{ $t('datasets.media.fEq2') }}</div>
            <div class="datasets__formula-note">{{ $t('datasets.media.fNote2') }}</div>
          </div>
          <div class="datasets__formula-block">
            <div class="datasets__formula-label">{{ $t('datasets.media.fLabel3') }}</div>
            <div class="datasets__formula-eq">{{ $t('datasets.media.fEq3') }}</div>
            <div class="datasets__formula-note">{{ $t('datasets.media.fNote3') }}</div>
          </div>
        </div>
      </section>

      <!-- Therapeutic window reference -->
      <section class="datasets__card">
        <div class="datasets__card-hdr">
          <h2 class="datasets__card-title">{{ $t('datasets.window.sectionTitle') }}</h2>
          <span class="datasets__card-tag" v-html="$t('datasets.window.sectionTag')"></span>
        </div>
        <div class="datasets__ref-grid">
          <div class="datasets__ref-block datasets__ref-block--cancer">
            <div class="datasets__ref-block-title">{{ $t('datasets.window.cancerTitle') }}</div>
            <div class="datasets__ref-block-params">
              <div class="datasets__rp-row"><span>{{ $t('datasets.window.paramRadius') }}</span><span class="datasets__mono">{{ $t('datasets.window.cancerR') }}</span></div>
              <div class="datasets__rp-row"><span v-html="$t('datasets.window.paramFc')"></span><span class="datasets__mono datasets__cancer-val">{{ $t('datasets.window.cancerFc') }}</span></div>
              <div class="datasets__rp-row"><span v-html="$t('datasets.window.paramVmThr')"></span><span class="datasets__mono">{{ $t('datasets.window.cancerVmThr') }}</span></div>
              <div class="datasets__rp-row"><span v-html="$t('datasets.window.paramCm')"></span><span class="datasets__mono">{{ $t('datasets.window.cancerCm') }}</span></div>
              <div class="datasets__rp-row"><span>{{ $t('datasets.window.paramLysis') }}</span><span class="datasets__mono datasets__cancer-val">{{ $t('datasets.window.cancerLysis') }}</span></div>
            </div>
          </div>
          <div class="datasets__ref-block datasets__ref-block--window">
            <div class="datasets__ref-block-title">{{ $t('datasets.window.windowTitle') }}</div>
            <div class="datasets__window-stat" v-tip="$t('datasets.tip.winVmSel')">
              <div class="datasets__window-ratio">{{ $t('datasets.window.ratioVmSel') }}</div>
              <div class="datasets__window-label" v-html="$t('datasets.window.labelVmSel')"></div>
            </div>
            <div class="datasets__window-stat datasets__window-stat--spaced" v-tip="$t('datasets.tip.winTI')">
              <div class="datasets__window-ratio datasets__window-ratio--sm">{{ $t('datasets.window.ratioTI') }}</div>
              <div class="datasets__window-label">{{ $t('datasets.window.labelTI') }}</div>
            </div>
            <div class="datasets__window-stat datasets__window-stat--spaced" v-tip="$t('datasets.tip.winFreqDown')">
              <div class="datasets__window-ratio datasets__window-ratio--sm datasets__window-ratio--muted">{{ $t('datasets.window.ratioFreqDown') }}</div>
              <div class="datasets__window-label" v-html="$t('datasets.window.labelFreqDown')"></div>
            </div>
            <div class="datasets__window-note">
              {{ $t('datasets.window.windowNote') }}
            </div>
            <div class="datasets__window-range">
              {{ $t('datasets.window.windowRange') }} <span class="datasets__mono datasets__primary-val">{{ $t('datasets.window.windowRangeVal') }}</span>
            </div>
          </div>
          <div class="datasets__ref-block datasets__ref-block--healthy">
            <div class="datasets__ref-block-title">{{ $t('datasets.window.healthyTitle') }}</div>
            <div class="datasets__ref-block-params">
              <div class="datasets__rp-row"><span>{{ $t('datasets.window.paramRadius') }}</span><span class="datasets__mono">{{ $t('datasets.window.healthyR') }}</span></div>
              <div class="datasets__rp-row"><span v-html="$t('datasets.window.paramFc')"></span><span class="datasets__mono datasets__ref-val">{{ $t('datasets.window.healthyFc') }}</span></div>
              <div class="datasets__rp-row"><span v-html="$t('datasets.window.paramVmThr')"></span><span class="datasets__mono">{{ $t('datasets.window.healthyVmThr') }}</span></div>
              <div class="datasets__rp-row"><span v-html="$t('datasets.window.paramCm')"></span><span class="datasets__mono">{{ $t('datasets.window.healthyCm') }}</span></div>
              <div class="datasets__rp-row"><span>{{ $t('datasets.window.paramLysis') }}</span><span class="datasets__mono datasets__ref-val">{{ $t('datasets.window.healthyLysis') }}</span></div>
            </div>
          </div>
        </div>
        <div class="datasets__formula-strip">
          <div class="datasets__formula-block">
            <div class="datasets__formula-label">{{ $t('datasets.window.fLabel1') }}</div>
            <div class="datasets__formula-eq">{{ $t('datasets.window.fEq1') }}</div>
            <div class="datasets__formula-note">{{ $t('datasets.window.fNote1') }}</div>
          </div>
          <div class="datasets__formula-block">
            <div class="datasets__formula-label">{{ $t('datasets.window.fLabel2') }}</div>
            <div class="datasets__formula-eq">{{ $t('datasets.window.fEq2') }}</div>
          </div>
          <div class="datasets__formula-block datasets__formula-block--wide">
            <div class="datasets__formula-label">{{ $t('datasets.window.fLabel3') }}</div>
            <div class="datasets__formula-eq">{{ $t('datasets.window.fEq3') }}</div>
            <div class="datasets__formula-note">{{ $t('datasets.window.fNote3') }}</div>
          </div>
        </div>
      </section>

      <!-- Double-shell nuclear envelope parameters -->
      <section class="datasets__card">
        <div class="datasets__card-hdr">
          <h2 class="datasets__card-title">{{ $t('datasets.nucShell.sectionTitle') }}</h2>
          <span class="datasets__card-tag" v-html="$t('datasets.nucShell.sectionTag')"></span>
        </div>
        <div class="datasets__table-wrap">
          <table class="datasets__table datasets__table--nuclear">
            <thead>
              <tr>
                <th>{{ $t('datasets.nucShell.colCell') }}</th>
                <th v-tip="$t('datasets.tip.nucColRnuc')" v-html="$t('datasets.nucShell.colRnuc')"></th>
                <th v-tip="$t('datasets.tip.nucColDne')" v-html="$t('datasets.nucShell.colDne')"></th>
                <th v-tip="$t('datasets.tip.nucColEpsNe')" v-html="$t('datasets.nucShell.colEpsNe')"></th>
                <th v-tip="$t('datasets.tip.nucColSigNp')" v-html="$t('datasets.nucShell.colSigNp')"></th>
                <th v-tip="$t('datasets.tip.nucColVthrNuc')" v-html="$t('datasets.nucShell.colVthrNuc')"></th>
                <th v-tip="$t('datasets.tip.nucColFpeak')" v-html="$t('datasets.nucShell.colFpeak')"></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in nuclearPresets" :key="p.presetId">
                <td>
                  <span class="datasets__cell-with-badge">
                    <span
                      class="datasets__group-badge"
                      :style="{ color: p.color, borderColor: p.color + '55', background: p.color + '11' }"
                    >{{ p.groupLabel }}</span>
                    <span class="datasets__cell-with-badge__name">{{ p.label }}</span>
                  </span>
                </td>
                <td class="datasets__mono datasets__nuc-val">{{ p.nuclearRadius }}</td>
                <td class="datasets__mono">{{ p.nuclearMembraneThickness ?? 15 }}</td>
                <td class="datasets__mono">{{ p.nuclearMembraneEps ?? 10 }}</td>
                <td class="datasets__mono">{{ p.nucleoplasmConductivity ?? 0.9 }}</td>
                <td
                  class="datasets__mono"
                  :class="p.group === CELL_GROUP.REFERENCE ? 'datasets__ref-val' : 'datasets__cancer-val'"
                >{{ p.nuclearThresholdVoltage ?? 0.50 }}</td>
                <td class="datasets__mono datasets__nuc-val">{{ p.nucFpeakDisplay }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="datasets__formula-strip datasets__formula-strip--nuc">
          <div class="datasets__formula-block">
            <div class="datasets__formula-label">{{ $t('datasets.nucShell.fLabel1') }}</div>
            <div class="datasets__formula-eq">{{ $t('datasets.nucShell.fEq1') }}</div>
          </div>
          <div class="datasets__formula-block">
            <div class="datasets__formula-label">{{ $t('datasets.nucShell.fLabel2') }}</div>
            <div class="datasets__formula-eq">{{ $t('datasets.nucShell.fEq2') }}</div>
          </div>
          <div class="datasets__formula-block">
            <div class="datasets__formula-label">{{ $t('datasets.nucShell.fLabel3') }}</div>
            <div class="datasets__formula-eq">{{ $t('datasets.nucShell.fEq3') }}</div>
          </div>
          <div class="datasets__formula-block datasets__formula-block--wide">
            <div class="datasets__formula-label">{{ $t('datasets.nucShell.fLabel4') }}</div>
            <div class="datasets__formula-eq">{{ $t('datasets.nucShell.fEq4') }}</div>
            <div class="datasets__formula-note">{{ $t('datasets.nucShell.fNote4') }}</div>
          </div>
        </div>
      </section>

      <!-- Acoustic resonance reference -->
      <section class="datasets__card">
        <div class="datasets__card-hdr">
          <h2 class="datasets__card-title">{{ $t('datasets.acousticRes.sectionTitle') }}</h2>
          <span class="datasets__card-tag" v-html="$t('datasets.acousticRes.sectionTag')"></span>
        </div>
        <div class="datasets__ref-grid datasets__ref-grid--res">
          <div class="datasets__ref-block datasets__ref-block--virus">
            <div class="datasets__ref-block-title">{{ $t('datasets.acousticRes.virusTitle') }}</div>
            <div class="datasets__ref-block-params">
              <div class="datasets__rp-row"><span v-html="$t('datasets.acousticRes.virusInfluFres')"></span><span class="datasets__mono datasets__primary-val">{{ $t('datasets.acousticRes.virusInfluFresVal') }}</span></div>
              <div class="datasets__rp-row"><span v-html="$t('datasets.acousticRes.virusSarsFres')"></span><span class="datasets__mono datasets__primary-val">{{ $t('datasets.acousticRes.virusSarsFresVal') }}</span></div>
              <div class="datasets__rp-row"><span v-html="$t('datasets.acousticRes.virusEthrRange')"></span><span class="datasets__mono datasets__warn-val">{{ $t('datasets.acousticRes.virusEthrRangeVal') }}</span></div>
              <div class="datasets__rp-row">
                <span>{{ $t('datasets.acousticRes.virusQ') }}</span>
                <span class="datasets__mono">{{ $t('datasets.acousticRes.virusQVal') }} <span class="datasets__muted">{{ $t('datasets.acousticRes.virusQNote') }}</span></span>
              </div>
            </div>
          </div>
          <div class="datasets__ref-block datasets__ref-block--window">
            <div class="datasets__ref-block-title">{{ $t('datasets.acousticRes.windowTitle') }}</div>
            <div class="datasets__window-stat" v-tip="$t('datasets.tip.acousticSel')">
              <div class="datasets__window-ratio">{{ $t('datasets.acousticRes.selRatioVal') }}</div>
              <div class="datasets__window-label" v-html="$t('datasets.acousticRes.selRatioLabel')"></div>
            </div>
            <div class="datasets__window-stat datasets__window-stat--spaced" v-tip="$t('datasets.tip.acousticLorentz')">
              <div class="datasets__window-ratio datasets__window-ratio--sm">{{ $t('datasets.acousticRes.selLorentzian') }}</div>
              <div class="datasets__window-label" v-html="$t('datasets.acousticRes.selLorentzianLabel')"></div>
            </div>
            <div class="datasets__window-note datasets__window-note--spaced" v-html="$t('datasets.acousticRes.selRef')"></div>
          </div>
          <div class="datasets__ref-block datasets__ref-block--bacteria">
            <div class="datasets__ref-block-title">{{ $t('datasets.acousticRes.bacteriaTitle') }}</div>
            <div class="datasets__ref-block-params">
              <div class="datasets__rp-row"><span v-html="$t('datasets.acousticRes.bacteriaEcoliF')"></span><span class="datasets__mono datasets__primary-val">{{ $t('datasets.acousticRes.bacteriaEcoliFVal') }}</span></div>
              <div class="datasets__rp-row"><span v-html="$t('datasets.acousticRes.bacteriaMrsaF')"></span><span class="datasets__mono datasets__primary-val">{{ $t('datasets.acousticRes.bacteriaMrsaFVal') }}</span></div>
              <div class="datasets__rp-row"><span v-html="$t('datasets.acousticRes.bacteriaEthrRange')"></span><span class="datasets__mono datasets__warn-val">{{ $t('datasets.acousticRes.bacteriaEthrRangeVal') }}</span></div>
              <div class="datasets__rp-row">
                <span>{{ $t('datasets.acousticRes.bacteriaQ') }}</span>
                <span class="datasets__mono">{{ $t('datasets.acousticRes.bacteriaQVal') }} <span class="datasets__muted">{{ $t('datasets.acousticRes.bacteriaQNote') }}</span></span>
              </div>
            </div>
          </div>
        </div>
        <div class="datasets__formula-strip datasets__formula-strip--res">
          <div class="datasets__formula-block">
            <div class="datasets__formula-label">{{ $t('datasets.acousticRes.fLabel1') }}</div>
            <div class="datasets__formula-eq">{{ $t('datasets.acousticRes.fEq1') }}</div>
            <div class="datasets__formula-note">{{ $t('datasets.acousticRes.fNote1') }}</div>
          </div>
          <div class="datasets__formula-block">
            <div class="datasets__formula-label">{{ $t('datasets.acousticRes.fLabel2') }}</div>
            <div class="datasets__formula-eq">{{ $t('datasets.acousticRes.fEq2') }}</div>
            <div class="datasets__formula-note">{{ $t('datasets.acousticRes.fNote2') }}</div>
          </div>
          <div class="datasets__formula-block datasets__formula-block--wide">
            <div class="datasets__formula-label">{{ $t('datasets.acousticRes.fLabel3') }}</div>
            <div class="datasets__formula-eq">{{ $t('datasets.acousticRes.fEq3') }}</div>
            <div class="datasets__formula-note">{{ $t('datasets.acousticRes.fNote3') }}</div>
          </div>
        </div>
      </section>

      <!-- Electrode / field geometry note -->
      <section class="datasets__card datasets__card--flat">
        <div class="datasets__card-hdr">
          <h2 class="datasets__card-title">{{ $t('datasets.fieldGeo.sectionTitle') }}</h2>
        </div>
        <div class="datasets__geo-body">
          <p class="datasets__geo-text" v-html="$t('datasets.fieldGeo.geoParagraph')"></p>
          <!-- Core model constraints — compact chips -->
          <div class="datasets__geo-assumptions">
            <div v-for="n in 5" :key="n" class="datasets__geo-item">
              <span class="datasets__geo-icon">◈</span>
              <span v-html="$t(`datasets.fieldGeo.assumption${n}`)"></span>
            </div>
          </div>
          <!-- Divider -->
          <div class="datasets__geo-sep">
            <span class="datasets__geo-sep-label">{{ $t('datasets.fieldGeo.correctionsLabel') }}</span>
          </div>
          <!-- Quantitative corrections — formula blocks -->
          <div class="datasets__geo-corrections">
            <div v-for="n in [6, 7, 8]" :key="n" class="datasets__geo-item datasets__geo-item--formula">
              <span class="datasets__geo-icon">◈</span>
              <span v-html="$t(`datasets.fieldGeo.assumption${n}`)"></span>
            </div>
          </div>
        </div>
      </section>

      <!-- Simulation thresholds & classification -->
      <section class="datasets__card">
        <div class="datasets__card-hdr">
          <h2 class="datasets__card-title" v-html="$t('datasets.thresholds.sectionTitle')"></h2>
          <span class="datasets__card-tag">{{ $t('datasets.thresholds.sectionTag') }}</span>
        </div>
        <div class="datasets__threshold-grid">

          <!-- Disruption ratio states -->
          <div class="datasets__thr-block">
            <div class="datasets__thr-title">{{ $t('datasets.thresholds.drTitle') }}</div>
            <table class="datasets__table datasets__table--compact">
              <thead>
                <tr>
                  <th>{{ $t('datasets.thresholds.drColRange') }}</th>
                  <th>{{ $t('datasets.thresholds.drColState') }}</th>
                  <th>{{ $t('datasets.thresholds.drColDesc') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="datasets__mono datasets__primary-val">&lt; {{ (THRESHOLDS.VIBRATING_MIN * 100).toFixed(0) }}%</td>
                  <td v-tip="$t('datasets.tip.drStable')">{{ $t('datasets.thresholds.drStableState') }}</td>
                  <td>{{ $t('datasets.thresholds.drStableDesc') }}</td>
                </tr>
                <tr>
                  <td class="datasets__mono datasets__primary-val">{{ (THRESHOLDS.VIBRATING_MIN * 100).toFixed(0) }} - {{ (THRESHOLDS.NOURISHING * 100).toFixed(0) }}%</td>
                  <td class="datasets__primary-val" v-tip="$t('datasets.tip.drNourishing')">{{ $t('datasets.thresholds.drNourishingState') }}</td>
                  <td>{{ $t('datasets.thresholds.drNourishingDesc') }}</td>
                </tr>
                <tr>
                  <td class="datasets__mono datasets__warn-val">{{ (THRESHOLDS.NOURISHING * 100).toFixed(0) }} - {{ (THRESHOLDS.HEALTHY_APPROACHING * 100).toFixed(0) }}%</td>
                  <td class="datasets__warn-val" v-tip="$t('datasets.tip.drApproaching')">{{ $t('datasets.thresholds.drApproachingState') }}</td>
                  <td>{{ $t('datasets.thresholds.drApproachingDesc') }}</td>
                </tr>
                <tr>
                  <td class="datasets__mono datasets__warn-val">{{ (THRESHOLDS.HEALTHY_APPROACHING * 100).toFixed(0) }} - {{ (THRESHOLDS.DISRUPTION_WARN * 100).toFixed(0) }}%</td>
                  <td class="datasets__warn-val" v-tip="$t('datasets.tip.drRevEp')">{{ $t('datasets.thresholds.drRevEpState') }}</td>
                  <td v-html="$t('datasets.thresholds.drRevEpDesc')"></td>
                </tr>
                <tr>
                  <td class="datasets__mono datasets__cancer-val">{{ (THRESHOLDS.DISRUPTION_WARN * 100).toFixed(0) }} - {{ (THRESHOLDS.LYSIS_PROB_CENTER * 100).toFixed(0) }}%</td>
                  <td class="datasets__cancer-val" v-tip="$t('datasets.tip.drVibrating')">{{ $t('datasets.thresholds.drVibratingState') }}</td>
                  <td>{{ $t('datasets.thresholds.drVibratingDesc') }}</td>
                </tr>
                <tr>
                  <td class="datasets__mono datasets__cancer-val">≥ {{ (THRESHOLDS.LYSIS_PROB_CENTER * 100).toFixed(0) }}%</td>
                  <td class="datasets__cancer-val" v-tip="$t('datasets.tip.drLysing')">{{ $t('datasets.thresholds.drLysingState') }}</td>
                  <td v-html="$t('datasets.thresholds.drLysingDesc')"></td>
                </tr>
              </tbody>
            </table>
            <div class="datasets__thr-note" v-html="$t('datasets.thresholds.drSigmoidNote')"></div>
          </div>

          <!-- Temperature thresholds -->
          <div class="datasets__thr-block">
            <div class="datasets__thr-title">{{ $t('datasets.thresholds.tempTitle') }}</div>
            <table class="datasets__table datasets__table--compact">
              <thead>
                <tr>
                  <th>{{ $t('datasets.thresholds.tempColT') }}</th>
                  <th>{{ $t('datasets.thresholds.tempColEvent') }}</th>
                  <th>{{ $t('datasets.thresholds.tempColRef') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="datasets__mono datasets__primary-val">37</td>
                  <td>{{ $t('datasets.thresholds.tempNormoEvent') }}</td>
                  <td>{{ $t('datasets.thresholds.tempNormoRef') }}</td>
                </tr>
                <tr>
                  <td class="datasets__mono datasets__warn-val">{{ THRESHOLDS.TEMP_WARN }}</td>
                  <td class="datasets__warn-val" v-tip="$t('datasets.tip.tempHyper')">{{ $t('datasets.thresholds.tempHyperEvent') }}</td>
                  <td>{{ $t('datasets.thresholds.tempHyperRef') }}</td>
                </tr>
                <tr>
                  <td class="datasets__mono datasets__warn-val">{{ THRESHOLDS.TEMP_DENATURING }}</td>
                  <td class="datasets__warn-val" v-tip="$t('datasets.tip.tempDenat')">{{ $t('datasets.thresholds.tempDenatEvent') }}</td>
                  <td>{{ $t('datasets.thresholds.tempDenatRef') }}</td>
                </tr>
                <tr>
                  <td class="datasets__mono datasets__cancer-val">{{ THRESHOLDS.TEMP_VAPORIZING }}</td>
                  <td class="datasets__cancer-val" v-tip="$t('datasets.tip.tempLysis')">{{ $t('datasets.thresholds.tempLysisEvent') }}</td>
                  <td>{{ $t('datasets.thresholds.tempLysisRef') }}</td>
                </tr>
                <tr>
                  <td class="datasets__mono datasets__muted">{{ THRESHOLDS.TEMP_CAP }}</td>
                  <td class="datasets__muted" v-tip="$t('datasets.tip.tempCeil')">{{ $t('datasets.thresholds.tempCeilEvent') }}</td>
                  <td>{{ $t('datasets.thresholds.tempCeilRef') }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Selectivity & TI thresholds -->
          <div class="datasets__thr-block">
            <div class="datasets__thr-title" v-html="$t('datasets.thresholds.tiTitle')"></div>
            <table class="datasets__table datasets__table--compact">
              <thead>
                <tr>
                  <th v-html="$t('datasets.thresholds.tiColTI')"></th>
                  <th>{{ $t('datasets.thresholds.tiColBadge') }}</th>
                  <th>{{ $t('datasets.thresholds.tiColMode') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="datasets__mono datasets__cancer-val">&lt; {{ THRESHOLDS.TI_MARGINAL }}×</td>
                  <td class="datasets__cancer-val" v-tip="$t('datasets.tip.tiPoor')">{{ $t('datasets.thresholds.tiPoorBadge') }}</td>
                  <td>{{ $t('datasets.thresholds.tiPoorMode') }}</td>
                </tr>
                <tr>
                  <td class="datasets__mono datasets__warn-val">{{ THRESHOLDS.TI_MARGINAL }} - {{ THRESHOLDS.TI_STRONG }}×</td>
                  <td class="datasets__warn-val" v-tip="$t('datasets.tip.tiMarginal')">{{ $t('datasets.thresholds.tiMarginalBadge') }}</td>
                  <td>{{ $t('datasets.thresholds.tiMarginalMode') }}</td>
                </tr>
                <tr>
                  <td class="datasets__mono datasets__primary-val">≥ {{ THRESHOLDS.TI_STRONG }}×</td>
                  <td class="datasets__primary-val" v-tip="$t('datasets.tip.tiStrong')">{{ $t('datasets.thresholds.tiStrongBadge') }}</td>
                  <td>{{ $t('datasets.thresholds.tiStrongMode') }}</td>
                </tr>
                <tr>
                  <td class="datasets__mono datasets__cancer-val">H ≥ {{ (THRESHOLDS.DISRUPTION_WARN * 100).toFixed(0) }}%</td>
                  <td class="datasets__cancer-val" v-tip="$t('datasets.tip.tiAblative')">{{ $t('datasets.thresholds.tiAblativeBadge') }}</td>
                  <td>{{ $t('datasets.thresholds.tiAblativeMode') }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Cell classification -->
          <div class="datasets__thr-block">
            <div class="datasets__thr-title">{{ $t('datasets.thresholds.classTitle') }}</div>
            <table class="datasets__table datasets__table--compact">
              <thead>
                <tr>
                  <th>{{ $t('datasets.thresholds.classColR') }}</th>
                  <th>{{ $t('datasets.thresholds.classColCat') }}</th>
                  <th :title="$t('datasets.thresholds.classColModeTitle')">{{ $t('datasets.thresholds.classColMode') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="datasets__mono">&lt; {{ THRESHOLDS.RADIUS_VIRUS_MAX }} µm</td>
                  <td class="datasets__primary-val" v-tip="$t('datasets.tip.classVirus')">{{ $t('datasets.thresholds.classVirusCat') }}</td>
                  <td>{{ $t('datasets.thresholds.classVirusMode') }}</td>
                </tr>
                <tr>
                  <td class="datasets__mono">{{ THRESHOLDS.RADIUS_VIRUS_MAX }} - {{ THRESHOLDS.RADIUS_BACTERIA_MAX }} µm</td>
                  <td class="datasets__warn-val" v-tip="$t('datasets.tip.classBacteria')">{{ $t('datasets.thresholds.classBacteriaCat') }}</td>
                  <td>{{ $t('datasets.thresholds.classBacteriaMode') }}</td>
                </tr>
                <tr>
                  <td class="datasets__mono">≥ {{ THRESHOLDS.RADIUS_BACTERIA_MAX }} µm</td>
                  <td class="datasets__ref-val" v-tip="$t('datasets.tip.classMammal')">{{ $t('datasets.thresholds.classMammalCat') }}</td>
                  <td>{{ $t('datasets.thresholds.classMammalMode') }}</td>
                </tr>
              </tbody>
            </table>
            <div class="datasets__thr-note">
              {{ $t('datasets.thresholds.classNote') }}
            </div>
          </div>

          <!-- Model uncertainty by cell category -->
          <div class="datasets__thr-block">
            <div class="datasets__thr-title">{{ $t('datasets.thresholds.uncTitle') }}</div>
            <table class="datasets__table datasets__table--compact">
              <thead>
                <tr>
                  <th>{{ $t('datasets.thresholds.uncColCat') }}</th>
                  <th>{{ $t('datasets.thresholds.uncColBand') }}</th>
                  <th>{{ $t('datasets.thresholds.uncColEffect') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="datasets__primary-val">{{ $t('datasets.thresholds.uncVirusCat') }}</td>
                  <td class="datasets__mono datasets__warn-val">{{ $t('datasets.thresholds.uncVirusBand') }}</td>
                  <td>{{ $t('datasets.thresholds.uncVirusEffect') }}</td>
                </tr>
                <tr>
                  <td class="datasets__warn-val">{{ $t('datasets.thresholds.uncBactCat') }}</td>
                  <td class="datasets__mono datasets__warn-val">{{ $t('datasets.thresholds.uncBactBand') }}</td>
                  <td>{{ $t('datasets.thresholds.uncBactEffect') }}</td>
                </tr>
                <tr>
                  <td class="datasets__ref-val">{{ $t('datasets.thresholds.uncMammalCat') }}</td>
                  <td class="datasets__mono datasets__primary-val">{{ $t('datasets.thresholds.uncMammalBand') }}</td>
                  <td>{{ $t('datasets.thresholds.uncMammalEffect') }}</td>
                </tr>
              </tbody>
            </table>
            <div class="datasets__thr-note">{{ $t('datasets.thresholds.uncNote') }}</div>
          </div>

          <!-- Biomodulation Score components -->
          <div class="datasets__thr-block">
            <div class="datasets__thr-title" v-html="$t('datasets.thresholds.bmsTitle')"></div>
            <table class="datasets__table datasets__table--compact">
              <thead>
                <tr>
                  <th>{{ $t('datasets.thresholds.bmsColComp') }}</th>
                  <th>{{ $t('datasets.thresholds.bmsColWeight') }}</th>
                  <th>{{ $t('datasets.thresholds.bmsColBasis') }}</th>
                  <th>{{ $t('datasets.thresholds.bmsColRange') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="datasets__primary-val">{{ $t('datasets.thresholds.bmsSiComp') }}</td>
                  <td class="datasets__mono datasets__primary-val">{{ $t('datasets.thresholds.bmsSiWeight') }}</td>
                  <td>{{ $t('datasets.thresholds.bmsSiBasis') }}</td>
                  <td class="datasets__mono">{{ $t('datasets.thresholds.bmsSiRange') }}</td>
                </tr>
                <tr>
                  <td>{{ $t('datasets.thresholds.bmsMteComp') }}</td>
                  <td class="datasets__mono">{{ $t('datasets.thresholds.bmsMteWeight') }}</td>
                  <td>{{ $t('datasets.thresholds.bmsMteBasis') }}</td>
                  <td class="datasets__mono">{{ $t('datasets.thresholds.bmsMteRange') }}</td>
                </tr>
                <tr>
                  <td>{{ $t('datasets.thresholds.bmsMaComp') }}</td>
                  <td class="datasets__mono">{{ $t('datasets.thresholds.bmsMaWeight') }}</td>
                  <td>{{ $t('datasets.thresholds.bmsMaBasis') }}</td>
                  <td class="datasets__mono">{{ $t('datasets.thresholds.bmsMaRange') }}</td>
                </tr>
              </tbody>
            </table>
            <div class="datasets__thr-note">{{ $t('datasets.thresholds.bmsNote') }}</div>
          </div>

        </div>
      </section>

      <!-- CTA -->
      <div class="datasets__open-lab">
        <RouterLink to="/experiment" class="datasets__btn-lab">
          {{ $t('datasets.cta.btnLab') }}
        </RouterLink>
        <span class="datasets__open-lab-note">{{ $t('datasets.cta.note') }}</span>
      </div>

    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed } from 'vue'
import { CELL_PRESETS, GROUP_COLORS, GROUP_LABELS, type CellGroup, type CellPreset } from '@/constants/cellLibrary'
import { MEDIA } from '@/constants/media'
import { CELL_GROUP } from '@/constants/strings'
import { membraneCm, computeFc, computeTau, computeNuclearTau, computeDepCrossoverKHz } from '@/utils/physics'
import { THRESHOLDS } from '@/constants/physics'
import { UNIT } from '@/constants/units'

const SIGMA_SALINE      = MEDIA.saline.conductivity  // 1.5 S/m
const EPS_R_SALINE      = MEDIA.saline.permittivity  // 80

const GROUPS: CellGroup[] = [CELL_GROUP.REFERENCE, CELL_GROUP.CANCER, CELL_GROUP.BACTERIA, CELL_GROUP.VIRUS] as CellGroup[]

type ResonantPreset = CellPreset & {
  resonantFreqGHz?: number
  capsidQ?: number
  resonantThresholdVcm?: number
  nuclearRadius?: number
  nuclearMembraneThickness?: number
  nuclearMembraneEps?: number
  nucleoplasmConductivity?: number
  nuclearThresholdVoltage?: number
}

export default defineComponent({
  setup() {
    // Augment each preset with computed Cm, fc in saline, and resonance params
    const presets = computed(() =>
      CELL_PRESETS.map((p) => {
        const pr = p as ResonantPreset
        const cm = membraneCm(p) * 1e3               // F/m² → mF/m²
        const fc = computeFc(p, SIGMA_SALINE)         // kHz
        const fcDisplay =
          fc >= 1000
            ? `${(fc / 1000).toFixed(2)} ${UNIT.MHZ}`
            : `${fc.toFixed(1)} ${UNIT.KHZ}`
        // Resonance parameters (bacteria/virus only)
        const resFreqDisplay = pr.resonantFreqGHz
          ? `${pr.resonantFreqGHz} ${UNIT.GHZ}`
          : '—'
        const resQDisplay = pr.capsidQ ? `${pr.capsidQ}` : '—'
        const resEthrDisplay = pr.resonantThresholdVcm
          ? `${pr.resonantThresholdVcm}`
          : '—'
        // DEP crossover frequency in saline
        const fcross = computeDepCrossoverKHz(p, SIGMA_SALINE, EPS_R_SALINE)
        const fcrossDisplay = fcross > 0
          ? (fcross >= 1000
              ? `${(fcross / 1000).toFixed(2)} ${UNIT.MHZ}`
              : `${fcross.toFixed(1)} ${UNIT.KHZ}`)
          : '—'
        // Nuclear envelope parameters (mammalian nucleated cells)
        const hasNuclear = !!pr.nuclearRadius
        const nucRDisplay = pr.nuclearRadius ? `${pr.nuclearRadius}` : '—'
        // f_peak for nuclear section: 1 / (2π × √(τ_out × τ_ne))
        let nucFpeakDisplay = '—'
        if (hasNuclear) {
          const tau_out = computeTau(p, SIGMA_SALINE)
          const tau_ne  = computeNuclearTau(p, SIGMA_SALINE)
          if (tau_out > 0 && tau_ne > 0) {
            const fpeak_Hz  = 1 / (2 * Math.PI * Math.sqrt(tau_out * tau_ne))
            const fpeak_MHz = fpeak_Hz / 1e6
            nucFpeakDisplay = `${fpeak_MHz.toFixed(2)} ${UNIT.MHZ}`
          }
        }
        return {
          ...p,
          cmDisplay: cm.toFixed(2),
          fcDisplay,
          fcrossDisplay,
          resFreqDisplay,
          resQDisplay,
          resEthrDisplay,
          hasResonance: !!pr.resonantFreqGHz,
          hasNuclear,
          nucRDisplay,
          nucFpeakDisplay,
          color: GROUP_COLORS[p.group],
          groupLabel: GROUP_LABELS[p.group],
        }
      })
    )

    const nuclearPresets = computed(() => presets.value.filter(p => p.hasNuclear))

    const mediaRows = [
      { id: 'saline', sigma: MEDIA.saline.conductivity.toFixed(3), epsilonR: MEDIA.saline.permittivity, alphaT: (MEDIA.saline.tempCoeff * 100).toFixed(1), keyClass: 'datasets__primary-val' },
      { id: 'blood',  sigma: MEDIA.blood.conductivity.toFixed(3),  epsilonR: MEDIA.blood.permittivity,  alphaT: (MEDIA.blood.tempCoeff  * 100).toFixed(1), keyClass: '' },
      { id: 'tissue', sigma: MEDIA.tissue.conductivity.toFixed(3), epsilonR: MEDIA.tissue.permittivity, alphaT: (MEDIA.tissue.tempCoeff * 100).toFixed(1), keyClass: '' },
      { id: 'water',  sigma: MEDIA.water.conductivity.toFixed(3),  epsilonR: MEDIA.water.permittivity,  alphaT: (MEDIA.water.tempCoeff  * 100).toFixed(1), keyClass: 'datasets__warn-val' },
      { id: 'dmem',   sigma: MEDIA.dmem.conductivity.toFixed(3),   epsilonR: MEDIA.dmem.permittivity,   alphaT: (MEDIA.dmem.tempCoeff   * 100).toFixed(1), keyClass: 'datasets__primary-val' },
      { id: 'rpmi',   sigma: MEDIA.rpmi.conductivity.toFixed(3),   epsilonR: MEDIA.rpmi.permittivity,   alphaT: (MEDIA.rpmi.tempCoeff   * 100).toFixed(1), keyClass: '' },
      { id: 'mhb',    sigma: MEDIA.mhb.conductivity.toFixed(3),    epsilonR: MEDIA.mhb.permittivity,    alphaT: (MEDIA.mhb.tempCoeff    * 100).toFixed(1), keyClass: '' },
    ]

    return { presets, nuclearPresets, mediaRows, GROUPS, GROUP_COLORS, GROUP_LABELS, CELL_GROUP, THRESHOLDS }
  },
})
</script>

<style lang="scss" scoped>
@use '../styles/mixins' as *;

/* ── Page shell ───────────────────────────────────────────────────────────── */
.datasets {
  flex: 1;
  overflow-y: auto;
  background-color: var(--color-bg);

  &__inner {
    max-width: 1600px;
    margin: 0 auto;
    padding: 2rem 2rem 4rem;
    @include flex-col(1.75rem);
  }

  /* ── Page header ──────────────────────────────────────────────────────────── */
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
    line-height: 1.6;
  }

  /* ── Legend ───────────────────────────────────────────────────────────────── */
  &__legend-row {
    display: flex;
    gap: 1.25rem;
    flex-wrap: wrap;
  }

  &__legend-item {
    @include flex-row(0.45rem);
    font-size: 0.78rem;
    color: var(--color-text-muted);
    font-family: var(--font-mono);
  }

  &__legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background-color: var(--g-color);
    box-shadow: 0 0 6px var(--g-color);
  }

  /* ── Card ─────────────────────────────────────────────────────────────────── */
  &__card {
    @include surface-card(var(--radius-lg));
    overflow: hidden;

    &--flat .datasets__geo-body {
      padding: 1.5rem;
    }
  }

  &__card-hdr {
    @include flex-row(1rem);
    padding: 1.1rem 1.5rem;
    border-bottom: 1px solid var(--color-border);
    flex-wrap: wrap;
  }

  &__card-title {
    font-size: 1rem;
    font-weight: 700;
    color: var(--color-text-heading);
    margin: 0;
  }

  &__card-tag {
    font-size: 0.68rem;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    background: var(--color-surface-2, #0a1628);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    padding: 0.2rem 0.55rem;
  }

  /* ── Data table ───────────────────────────────────────────────────────────── */
  &__table-wrap {
    overflow-x: auto;
  }

  &__table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.8rem;
    min-width: 820px;

    th {
      text-align: left;
      padding: 0.55rem 0.8rem;
      font-size: 0.63rem;
      font-family: var(--font-mono);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--color-text-muted);
      background: rgba(255, 255, 255, 0.02);
      border-bottom: 1px solid var(--color-border);
      white-space: nowrap;
    }

    td {
      padding: 0.6rem 0.8rem;
      color: var(--color-text);
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      vertical-align: middle;
    }

    tr:last-child td { border-bottom: none; }
    tr:hover td { background: rgba(255, 255, 255, 0.025); }
  }

  &__mono        { font-family: var(--font-mono); font-size: 0.78rem; }
  &__primary-val { color: var(--color-primary); }
  &__cancer-val  { color: var(--color-danger);  }
  &__ref-val     { color: var(--color-primary); }
  &__warn-val    { color: var(--color-amber);   }
  &__nuc-val     { color: #a78bfa; }
  &__dep-val     { color: #ff9900; }
  &__muted       { color: var(--color-text-muted); }
  &__cell-name   { font-weight: 500; color: var(--color-text-heading); }
  &__notes-cell  { font-size: 0.71rem; color: var(--color-text-muted); min-width: 160px; }

  &__cell-with-badge {
    display: inline-flex;
    align-items: center;
    gap: 0.45rem;
    white-space: nowrap;

    &__name {
      font-weight: 500;
      color: var(--color-text-heading);
    }
  }

  &__group-badge {
    font-size: 0.63rem;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 0.15rem 0.5rem;
    border-radius: 3px;
    border: 1px solid;
    white-space: nowrap;
  }

  /* ── Nuclear table column constraint ──────────────────────────────────────── */
  &__table--nuclear {
    th:first-child,
    td:first-child {
      width: 1%;
    }
  }

  /* ── Formula strip (all sections) ────────────────────────────────────────── */
  &__formula-strip {
    display: flex;
    flex-wrap: wrap;
    align-items: flex-start;
    gap: 0;
    padding: 1.1rem 1.5rem;
    border-top: 1px solid var(--color-border);
    background: rgba(255, 255, 255, 0.012);

    &--nuc  { background: rgba(167, 139, 250, 0.03); }
    &--res  { background: rgba(251, 191,  36, 0.02); }
  }

  &__formula-block {
    @include flex-col(0.3rem);
    padding: 0.35rem 1rem;
    flex: 1;
    min-width: 190px;

    &--wide { flex: 1.4; }

    &:first-child { padding-left: 0; }
  }

  &__formula-label {
    @include mono-upper(0.58rem, 0.08em);
    color: var(--color-primary);
    opacity: 0.75;

    .datasets__formula-strip--nuc & { color: #a78bfa; }
    .datasets__formula-strip--res & { color: var(--color-amber-warm); }
  }

  &__formula-eq {
    font-family: var(--font-mono);
    font-size: 0.82rem;
    color: var(--color-text);
    line-height: 1.55;
  }

  &__formula-note {
    font-size: 0.64rem;
    color: var(--color-text-muted);
    margin-top: 0.2rem;
    line-height: 1.45;
  }

  /* ── Therapeutic window ───────────────────────────────────────────────────── */
  &__ref-grid {
    display: grid;
    grid-template-columns: 1fr 1.2fr 1fr;
    gap: 0;

    &--res { grid-template-columns: 1fr 1.2fr 1fr; }
  }

  &__ref-block {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1rem;

    & + & {
      border-left: 1px solid var(--color-border);
    }

    &--cancer &-title   { color: var(--color-danger);  }
    &--healthy &-title  { color: var(--color-primary); }
    &--window &-title   { color: var(--color-lime);    }
    &--virus &-title    { color: var(--color-purple);  }
    &--bacteria &-title { color: var(--color-amber);   }
  }

  &__ref-block-title {
    font-size: 0.7rem;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--color-text-muted);
  }

  &__ref-block-params {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
  }

  &__rp-row {
    @include flex-between(0.5rem);
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  &__window-ratio {
    font-size: 2.5rem;
    font-weight: 800;
    font-family: var(--font-mono);
    color: var(--color-lime);
    line-height: 1;

    &--sm    { font-size: 1.1rem; }
    &--muted { color: var(--color-text-muted); }
  }

  &__window-stat {
    &--spaced { margin-top: 0.4rem; }
  }

  &__window-label {
    font-size: 0.7rem;
    color: var(--color-text-muted);
    line-height: 1.4;
  }

  &__window-note {
    font-size: 0.78rem;
    color: var(--color-text-muted);
    line-height: 1.5;

    &--spaced { margin-top: 0.6rem; }
  }

  &__window-range {
    font-size: 0.78rem;
    color: var(--color-text-muted);
  }

  /* ── Geometry note ────────────────────────────────────────────────────────── */
  &__geo-text {
    font-size: 0.88rem;
    color: var(--color-text);
    line-height: 1.8;
    margin: 0 0 1.25rem;

    strong { color: var(--color-text-heading); }
  }

  &__geo-assumptions {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem 0.75rem;
  }

  &__geo-item {
    display: flex;
    align-items: flex-start;
    gap: 0.55rem;
    font-size: 0.79rem;
    color: var(--color-text-muted);
    line-height: 1.5;

    /* Core model constraints: subtle chip */
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--color-border);
    border-radius: calc(var(--radius) / 2);
    padding: 0.45rem 0.65rem;

    /* Quantitative correction rows */
    &--formula {
      background: rgba(0, 212, 255, 0.03);
      border: none;
      border-left: 2px solid rgba(0, 212, 255, 0.3);
      border-radius: 0 calc(var(--radius) / 2) calc(var(--radius) / 2) 0;
      padding: 0.55rem 0.85rem;
      font-family: var(--font-mono);
      font-size: 0.77rem;
    }
  }

  &__geo-sep {
    display: flex;
    align-items: center;
    gap: 0.65rem;
    margin: 0.9rem 0 0.4rem;

    &::after {
      content: '';
      flex: 1;
      height: 1px;
      background: var(--color-border);
    }
  }

  &__geo-sep-label {
    @include mono-upper(0.58rem, 0.1em);
    color: var(--color-text-muted);
    opacity: 0.55;
    white-space: nowrap;
    flex-shrink: 0;
  }

  &__geo-corrections {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  &__geo-icon {
    color: var(--color-primary);
    flex-shrink: 0;
    margin-top: 0.15rem;
  }

  /* ── Open lab CTA ─────────────────────────────────────────────────────────── */
  &__open-lab {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
  }

  &__btn-lab {
    display: inline-flex;
    align-items: center;
    padding: 0.65rem 1.5rem;
    background-color: var(--color-primary);
    color: #060e1a;
    font-weight: 600;
    font-size: 0.9rem;
    border-radius: var(--radius);
    text-decoration: none;
    box-shadow: 0 0 20px rgba(0, 212, 255, 0.3);
    transition: all 0.18s;

    &:hover {
      filter: brightness(1.1);
      box-shadow: 0 0 32px rgba(0, 212, 255, 0.5);
    }
  }

  &__open-lab-note {
    font-size: 0.78rem;
    color: var(--color-text-muted);
    font-family: var(--font-mono);
  }

  /* ── Threshold tables grid ────────────────────────────────────────────────── */
  &__threshold-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0;
  }

  &__thr-block {
    padding: 1.25rem 1.5rem;
    @include flex-col(0.75rem);

    & + & {
      border-left: 1px solid var(--color-border);
    }

    &:nth-child(n+3) {
      border-top: 1px solid var(--color-border);
    }
  }

  &__thr-title {
    font-size: 0.7rem;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--color-text-muted);
  }

  &__thr-note {
    font-size: 0.7rem;
    color: var(--color-text-muted);
    line-height: 1.5;
  }

  &__table--compact {
    min-width: unset;

    th, td {
      padding: 0.32rem 0.55rem;
      font-size: 0.74rem;
    }
  }

}

// Media queries → _responsive.scss
</style>
