<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
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
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'DatasetsAcousticRes',
})
</script>

<style lang="scss" scoped>

@use './datasets' as ds;

@include ds.datasets-card();
@include ds.datasets-formula-strip();
@include ds.datasets-utils();
@include ds.datasets-ref-grid();
</style>
