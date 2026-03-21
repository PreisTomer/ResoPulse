<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
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
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'DatasetsWindowCard',
})
</script>

<style lang="scss" scoped>
@use '../../styles/mixins' as *;
@use './shared' as ds;

@include ds.datasets-card();
@include ds.datasets-formula-strip();
@include ds.datasets-utils();
@include ds.datasets-ref-grid();
</style>
