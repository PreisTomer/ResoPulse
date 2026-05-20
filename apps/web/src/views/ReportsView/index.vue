<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="report">
    <header class="report__toolbar">
      <div>
        <h1 class="report__title">{{ $t('reports.viewTitle') }}</h1>
        <p class="report__subtitle">{{ $t('reports.viewSubtitle') }}</p>
      </div>
      <button v-if="campaign" class="report__print-btn" @click="print">{{ ICON.MAIL }} {{ $t('reports.printBtn') }}</button>
    </header>

    <div v-if="!campaign" class="report__no-campaign">
      <p class="report__no-campaign-text">{{ $t('reports.noCampaign') }}</p>
      <RouterLink :to="ROUTE.CAMPAIGNS" class="report__no-campaign-btn">{{ $t('reports.openCampaigns') }} {{ ICON.ARROW_SHORT }}</RouterLink>
    </div>

    <article v-else class="report__sheet">
      <div class="report__sheet-head">
        <div class="report__sheet-molecule">
          <TargetProteinVisual :molecule-type="campaign.moleculeType" :size="64" />
        </div>
        <div>
          <h2 class="report__sheet-name">{{ campaign.name }}</h2>
          <span class="report__sheet-molecule-label">{{ moleculeLabel }}</span>
        </div>
      </div>

      <section class="report__section">
        <h3 class="report__section-title">{{ $t('reports.section.overview') }}</h3>
        <dl class="report__facts">
          <div><dt>{{ $t('reports.overview.molecule') }}</dt><dd>{{ moleculeLabel }}</dd></div>
          <div><dt>{{ $t('reports.overview.created') }}</dt><dd>{{ dateOf(campaign.createdAt) }}</dd></div>
          <div><dt>{{ $t('reports.overview.status') }}</dt><dd>{{ campaign.status }}</dd></div>
          <div><dt>{{ $t('reports.overview.modulesComplete') }}</dt><dd>{{ modulesComplete }} / 3</dd></div>
        </dl>
      </section>

      <section class="report__section">
        <h3 class="report__section-title">{{ $t('reports.section.cellEngineering') }}</h3>
        <div v-if="cellLine" class="report__cellline">
          <HostCellVisual :host-species="cellLine.hostSpecies" :size="64" />
          <dl class="report__facts">
            <div><dt>{{ $t('reports.cellEng.selectedCellLine') }}</dt><dd>{{ cellLine.name }}</dd></div>
            <div><dt>{{ $t('reports.cellEng.hostSpecies') }}</dt><dd>{{ cellLine.hostSpecies }}</dd></div>
            <div v-if="predictedTiter !== null"><dt>{{ $t('reports.cellEng.predictedTiter') }}</dt><dd>{{ predictedTiter }} g/L</dd></div>
          </dl>
        </div>
        <p v-else class="report__empty-note">{{ $t('reports.cellEng.noneSelected') }}</p>
      </section>

      <section class="report__section">
        <h3 class="report__section-title">{{ $t('reports.section.downstream') }}</h3>
        <template v-if="hasDownstream">
          <YieldWaterfallChart :steps="downstreamPrediction.steps" :target-yield-pct="0" />
          <dl class="report__facts">
            <div><dt>{{ $t('reports.downstream.stepCount') }}</dt><dd>{{ downstreamPrediction.steps.length }}</dd></div>
            <div><dt>{{ $t('reports.downstream.startingTiter') }}</dt><dd>{{ train.startingTiterGL }} g/L</dd></div>
            <div><dt>{{ $t('reports.downstream.overallYield') }}</dt><dd>{{ downstreamPrediction.cumulativeYieldPct.toFixed(1) }}%</dd></div>
            <div><dt>{{ $t('reports.downstream.finalProduct') }}</dt><dd>{{ downstreamPrediction.finalMassG.toFixed(2) }} g</dd></div>
          </dl>
        </template>
        <p v-else class="report__empty-note">{{ $t('reports.downstream.noSteps') }}</p>
      </section>

      <section v-if="hasDownstream" class="report__section report__section--highlight">
        <h3 class="report__section-title">{{ $t('reports.endToEnd.title') }}</h3>
        <p class="report__e2e">
          {{ $t('reports.endToEnd.fromTiter', { titer: train.startingTiterGL, volume: train.volumeL }) }}
          {{ $t('reports.endToEnd.toProduct', { product: downstreamPrediction.finalMassG.toFixed(2) }) }}
          {{ $t('reports.endToEnd.atYield', { yield: downstreamPrediction.cumulativeYieldPct.toFixed(1) }) }}
        </p>
        <div v-if="yieldCalibration.sampleCount > 0" class="report__calibrated">
          <span class="report__calibrated-title">{{ ICON.AI }} {{ $t('reports.endToEnd.calibratedTitle') }}
            <span class="report__calibrated-conf">{{ $t('reports.endToEnd.calibrationConfidence', { confidence: Math.round(yieldCalibration.confidence * 100) }) }}</span>
          </span>
          <p class="report__calibrated-note">
            {{ $t('reports.endToEnd.calibratedNote', { count: yieldCalibration.sampleCount, yield: calibratedYield.toFixed(1), product: calibratedProduct.toFixed(2) }) }}
          </p>
        </div>
      </section>

      <section class="report__section">
        <h3 class="report__section-title">{{ $t('reports.section.labRuns') }}</h3>
        <p class="report__empty-note">
          {{ campaignLabRuns.length > 0 ? $t('reports.labRuns.count', { count: campaignLabRuns.length }) : $t('reports.labRuns.none') }}
        </p>
      </section>

      <footer class="report__disclaimer">{{ ICON.INFO }} {{ $t('reports.predictionDisclaimer') }}</footer>
    </article>

    <CampaignAdvisorPanel v-if="campaign" class="report__advisor" :advice-list="adviceList" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'

import { ROUTE } from '@/constants/routes'
import { ICON } from '@/constants/icons'
import { MOLECULE_TYPE_META } from '@/constants/moleculeTypes'
import { getCellLineById, getProductivityFor } from '@/constants/cellLineCatalog'

import { useProductionCampaignStore } from '@/stores/productionCampaignStore'
import { useDownstreamStore } from '@/stores/downstreamStore'
import { useLabRunsStore } from '@/stores/labRunsStore'
import { useCalibrationStore } from '@/stores/calibrationStore'

import { MODULE_STATUS } from '@/types/campaign'

import { adviseCampaign, type Advice } from '@/utils/advisor/campaignAdvisor'

import TargetProteinVisual from '@/components/TargetProteinVisual/index.vue'
import HostCellVisual from '@/components/HostCellVisual/index.vue'
import YieldWaterfallChart from '@/components/YieldWaterfallChart/index.vue'
import CampaignAdvisorPanel from '@/components/CampaignAdvisorPanel/index.vue'

export default defineComponent({
  name: 'ReportsView',
  components: { TargetProteinVisual, HostCellVisual, YieldWaterfallChart, CampaignAdvisorPanel },
  computed: {
    ...mapStores(useProductionCampaignStore, useDownstreamStore, useLabRunsStore, useCalibrationStore),
    ROUTE() { return ROUTE },
    ICON()  { return ICON },

    yieldCalibration() {
      return this.calibrationStore.yieldCalibration
    },

    calibratedYield(): number {
      return this.calibrationStore.calibrateYield(this.downstreamPrediction.cumulativeYieldPct)
    },

    calibratedProduct(): number {
      const factor = this.downstreamPrediction.cumulativeYieldPct > 0
        ? this.calibratedYield / this.downstreamPrediction.cumulativeYieldPct
        : 1
      return this.downstreamPrediction.finalMassG * factor
    },

    campaign() { return this.productionCampaignStore.activeCampaign },

    moleculeLabel(): string {
      return this.campaign ? MOLECULE_TYPE_META[this.campaign.moleculeType].label : ''
    },

    modulesComplete(): number {
      if (!this.campaign) return 0
      return Object.values(this.campaign.modules).filter(m => m.status === MODULE_STATUS.COMPLETE).length
    },

    cellLine() {
      const id = this.campaign?.selectedCellLineId
      return id ? getCellLineById(id) : undefined
    },

    predictedTiter(): number | null {
      if (!this.campaign || !this.cellLine) return null
      const prof = getProductivityFor(this.cellLine, this.campaign.moleculeType)
      return prof ? Number(((prof.titerRange[0] + prof.titerRange[1]) / 2).toFixed(2)) : null
    },

    train() {
      return this.downstreamStore.trainFor(this.campaign?.id ?? '')
    },

    downstreamPrediction() {
      return this.downstreamStore.prediction(this.campaign?.id ?? '')
    },

    hasDownstream(): boolean {
      return this.downstreamPrediction.steps.length > 0
    },

    campaignLabRuns() {
      return this.campaign ? this.labRunsStore.runsForCampaign(this.campaign.id) : []
    },

    adviceList(): Advice[] {
      if (!this.campaign) return []
      return adviseCampaign({
        campaign:             this.campaign,
        downstreamSteps:      this.train.steps,
        downstreamPrediction: this.downstreamPrediction,
        labRunCount:          this.campaignLabRuns.length,
      })
    },
  },
  methods: {
    dateOf(ts: number): string {
      return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
    },
    print() {
      window.print()
    },
  },
})
</script>

<style lang="scss" scoped>
.report {
  padding: 2rem 2.5rem;
  max-width: 900px;
  margin: 0 auto;

  @media (max-width: 768px) { padding: 1.25rem 1rem; }

  &__toolbar { @include flex-between(1rem); align-items: flex-end; margin-bottom: 1.5rem; }
  &__title { margin: 0 0 0.35rem; font-size: 1.6rem; font-weight: 600; color: var(--color-text-heading); }
  &__subtitle { margin: 0; font-size: var(--fs-md); opacity: var(--op-partial); max-width: 42rem; line-height: 1.5; }

  &__print-btn {
    @include mono-upper(var(--fs-sm)); background: var(--color-primary); color: var(--color-bg); border: none;
    padding: 0.7rem 1.2rem; border-radius: var(--radius); cursor: pointer; flex-shrink: 0;
    transition: background var(--tr-fast);
    &:hover { background: color-mix(in srgb, var(--color-primary) 90%, white); }
  }

  &__no-campaign {
    @include flex-col(1rem); align-items: center; text-align: center; padding: 4rem 1.5rem;
    background: var(--color-surface); border: 1px dashed var(--color-border); border-radius: var(--radius-lg);
  }
  &__no-campaign-text { margin: 0; opacity: var(--op-partial); font-size: var(--fs-lg); }
  &__no-campaign-btn {
    @include mono-upper(var(--fs-sm)); background: var(--color-primary); color: var(--color-bg);
    padding: 0.7rem 1.2rem; border-radius: var(--radius); text-decoration: none;
    &:hover { background: color-mix(in srgb, var(--color-primary) 90%, white); }
  }

  &__sheet {
    @include flex-col(1.75rem); padding: 2rem;
    background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg);
  }

  &__sheet-head { @include flex-row(1rem); align-items: center; padding-bottom: 1.25rem; border-bottom: 1px solid var(--color-border); }
  &__sheet-molecule { width: 64px; height: 64px; flex-shrink: 0; }
  &__sheet-name { margin: 0 0 0.2rem; font-size: 1.4rem; font-weight: 600; color: var(--color-text-heading); }
  &__sheet-molecule-label { @include mono-upper(var(--fs-xxs)); color: var(--color-primary); }

  &__section { @include flex-col(0.75rem); }
  &__section--highlight {
    padding: 1.1rem 1.25rem; background: color-mix(in srgb, var(--color-ok) 7%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-ok) 25%, transparent); border-radius: var(--radius);
  }
  &__section-title { margin: 0; @include mono-upper(var(--fs-xs)); color: var(--color-primary); opacity: var(--op-partial); }

  &__facts {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.75rem; margin: 0;
    div { @include flex-col(0.15rem); }
    dt { @include mono-upper(0.55rem); opacity: var(--op-muted); margin: 0; }
    dd { font-family: var(--font-mono); font-size: var(--fs-sm); color: var(--color-text); margin: 0; }
  }

  &__cellline { @include flex-row(1rem); align-items: center; }

  &__empty-note { margin: 0; font-size: var(--fs-sm); opacity: var(--op-muted); font-style: italic; }

  &__e2e { margin: 0; font-size: var(--fs-lg); line-height: 1.6; color: var(--color-text); }

  &__disclaimer {
    @include mono-upper(var(--fs-xxs)); opacity: var(--op-muted); line-height: 1.5;
    padding-top: 1.25rem; border-top: 1px solid var(--color-border);
  }
}

.report__calibrated {
  margin-top: 1rem;
  padding: 0.9rem 1.1rem;
  background: color-mix(in srgb, var(--color-primary) 8%, transparent);
  border: 1px solid color-mix(in srgb, var(--color-primary) 30%, transparent);
  border-radius: var(--radius);
}
.report__calibrated-title {
  @include flex-between(0.5rem);
  @include mono-upper(var(--fs-xxs));
  color: var(--color-primary);
}
.report__calibrated-conf { opacity: var(--op-muted); }
.report__calibrated-note { margin: 0.4rem 0 0; font-size: var(--fs-sm); line-height: 1.5; color: var(--color-text); }

.report__advisor { margin-top: 1.5rem; }

@media print {
  .report__toolbar, .report__print-btn { display: none; }
  .report__sheet { border: none; }
}
</style>
