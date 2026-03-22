<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
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
              <td class="datasets__mono datasets__primary-val">&lt; {{ (vibratingMin * 100).toFixed(0) }}%</td>
              <td v-tip="$t('datasets.tip.drStable')">{{ $t('datasets.thresholds.drStableState') }}</td>
              <td>{{ $t('datasets.thresholds.drStableDesc') }}</td>
            </tr>
            <tr>
              <td class="datasets__mono datasets__primary-val">{{ (vibratingMin * 100).toFixed(0) }} - {{ (nourishing * 100).toFixed(0) }}%</td>
              <td class="datasets__primary-val" v-tip="$t('datasets.tip.drNourishing')">{{ $t('datasets.thresholds.drNourishingState') }}</td>
              <td>{{ $t('datasets.thresholds.drNourishingDesc') }}</td>
            </tr>
            <tr>
              <td class="datasets__mono datasets__warn-val">{{ (nourishing * 100).toFixed(0) }} - {{ (healthyApproaching * 100).toFixed(0) }}%</td>
              <td class="datasets__warn-val" v-tip="$t('datasets.tip.drApproaching')">{{ $t('datasets.thresholds.drApproachingState') }}</td>
              <td>{{ $t('datasets.thresholds.drApproachingDesc') }}</td>
            </tr>
            <tr>
              <td class="datasets__mono datasets__warn-val">{{ (healthyApproaching * 100).toFixed(0) }} - {{ (disruptionWarn * 100).toFixed(0) }}%</td>
              <td class="datasets__warn-val" v-tip="$t('datasets.tip.drRevEp')">{{ $t('datasets.thresholds.drRevEpState') }}</td>
              <td v-html="$t('datasets.thresholds.drRevEpDesc')"></td>
            </tr>
            <tr>
              <td class="datasets__mono datasets__cancer-val">{{ (disruptionWarn * 100).toFixed(0) }} - {{ (lysisProbCenter * 100).toFixed(0) }}%</td>
              <td class="datasets__cancer-val" v-tip="$t('datasets.tip.drVibrating')">{{ $t('datasets.thresholds.drVibratingState') }}</td>
              <td>{{ $t('datasets.thresholds.drVibratingDesc') }}</td>
            </tr>
            <tr>
              <td class="datasets__mono datasets__cancer-val">≥ {{ (lysisProbCenter * 100).toFixed(0) }}%</td>
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
              <td class="datasets__mono datasets__warn-val">{{ tempWarn }}</td>
              <td class="datasets__warn-val" v-tip="$t('datasets.tip.tempHyper')">{{ $t('datasets.thresholds.tempHyperEvent') }}</td>
              <td>{{ $t('datasets.thresholds.tempHyperRef') }}</td>
            </tr>
            <tr>
              <td class="datasets__mono datasets__warn-val">{{ tempDenaturing }}</td>
              <td class="datasets__warn-val" v-tip="$t('datasets.tip.tempDenat')">{{ $t('datasets.thresholds.tempDenatEvent') }}</td>
              <td>{{ $t('datasets.thresholds.tempDenatRef') }}</td>
            </tr>
            <tr>
              <td class="datasets__mono datasets__cancer-val">{{ tempVaporizing }}</td>
              <td class="datasets__cancer-val" v-tip="$t('datasets.tip.tempLysis')">{{ $t('datasets.thresholds.tempLysisEvent') }}</td>
              <td>{{ $t('datasets.thresholds.tempLysisRef') }}</td>
            </tr>
            <tr>
              <td class="datasets__mono datasets__muted">{{ tempCap }}</td>
              <td class="datasets__muted" v-tip="$t('datasets.tip.tempCeil')">{{ $t('datasets.thresholds.tempCeilEvent') }}</td>
              <td>{{ $t('datasets.thresholds.tempCeilRef') }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Selectivity and TI thresholds -->
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
              <td class="datasets__mono datasets__cancer-val">&lt; {{ tiMarginal }}×</td>
              <td class="datasets__cancer-val" v-tip="$t('datasets.tip.tiPoor')">{{ $t('datasets.thresholds.tiPoorBadge') }}</td>
              <td>{{ $t('datasets.thresholds.tiPoorMode') }}</td>
            </tr>
            <tr>
              <td class="datasets__mono datasets__warn-val">{{ tiMarginal }} - {{ tiStrong }}×</td>
              <td class="datasets__warn-val" v-tip="$t('datasets.tip.tiMarginal')">{{ $t('datasets.thresholds.tiMarginalBadge') }}</td>
              <td>{{ $t('datasets.thresholds.tiMarginalMode') }}</td>
            </tr>
            <tr>
              <td class="datasets__mono datasets__primary-val">≥ {{ tiStrong }}×</td>
              <td class="datasets__primary-val" v-tip="$t('datasets.tip.tiStrong')">{{ $t('datasets.thresholds.tiStrongBadge') }}</td>
              <td>{{ $t('datasets.thresholds.tiStrongMode') }}</td>
            </tr>
            <tr>
              <td class="datasets__mono datasets__cancer-val">H ≥ {{ (disruptionWarn * 100).toFixed(0) }}%</td>
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
              <td class="datasets__mono">&lt; {{ radiusVirusMax }} µm</td>
              <td class="datasets__primary-val" v-tip="$t('datasets.tip.classVirus')">{{ $t('datasets.thresholds.classVirusCat') }}</td>
              <td>{{ $t('datasets.thresholds.classVirusMode') }}</td>
            </tr>
            <tr>
              <td class="datasets__mono">{{ radiusVirusMax }} - {{ radiusBacteriaMax }} µm</td>
              <td class="datasets__warn-val" v-tip="$t('datasets.tip.classBacteria')">{{ $t('datasets.thresholds.classBacteriaCat') }}</td>
              <td>{{ $t('datasets.thresholds.classBacteriaMode') }}</td>
            </tr>
            <tr>
              <td class="datasets__mono">≥ {{ radiusBacteriaMax }} µm</td>
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
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { THRESHOLDS } from '@/constants/physics'

export default defineComponent({
  name: 'DatasetsThresholds',

  computed: {
    vibratingMin(): number    { return THRESHOLDS.VIBRATING_MIN },
    nourishing(): number      { return THRESHOLDS.NOURISHING },
    healthyApproaching(): number { return THRESHOLDS.HEALTHY_APPROACHING },
    disruptionWarn(): number  { return THRESHOLDS.DISRUPTION_WARN },
    lysisProbCenter(): number { return THRESHOLDS.LYSIS_PROB_CENTER },
    tempWarn(): number        { return THRESHOLDS.TEMP_WARN },
    tempDenaturing(): number  { return THRESHOLDS.TEMP_DENATURING },
    tempVaporizing(): number  { return THRESHOLDS.TEMP_VAPORIZING },
    tempCap(): number         { return THRESHOLDS.TEMP_CAP },
    tiMarginal(): number      { return THRESHOLDS.TI_MARGINAL },
    tiStrong(): number        { return THRESHOLDS.TI_STRONG },
    radiusVirusMax(): number  { return THRESHOLDS.RADIUS_VIRUS_MAX },
    radiusBacteriaMax(): number { return THRESHOLDS.RADIUS_BACTERIA_MAX },
  },
})
</script>

<style lang="scss" scoped>

@use './shared' as ds;

@include ds.datasets-card();
@include ds.datasets-table();
@include ds.datasets-utils();

.datasets {
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
    font-size: var(--fs-xs);
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--color-text-muted);
  }

  &__thr-note {
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
    line-height: 1.5;
  }
}
</style>
