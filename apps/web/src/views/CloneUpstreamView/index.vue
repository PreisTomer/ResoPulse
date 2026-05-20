<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="clone-up">
    <header class="clone-up__header">
      <div>
        <h1 class="clone-up__title">{{ $t('cloneUp.viewTitle') }}</h1>
        <p class="clone-up__subtitle">{{ $t('cloneUp.viewSubtitle') }}</p>
      </div>
      <span class="clone-up__badge" v-tip="$t('cloneUp.predictionBadgeHelp')">
        {{ ICON.INFO }} {{ $t('cloneUp.predictionBadge') }}
      </span>
    </header>

    <nav class="clone-up__tabs" role="tablist">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="clone-up__tab"
        :class="{ 'clone-up__tab--active': activeTab === tab.id }"
        role="tab"
        :aria-selected="activeTab === tab.id"
        @click="activeTab = tab.id"
      >{{ $t(tab.labelKey) }}</button>
    </nav>

    <!-- Clone Screening -->
    <template v-if="activeTab === 'screening'">
      <div v-if="!activeCampaign" class="clone-up__no-campaign">{{ $t('cloneUp.screening.needCampaign') }}</div>
      <CloneScreeningPanel
        v-else
        :clones="clones"
        @add-clone="onAddClone"
        @load-demo="onLoadDemo"
        @remove-clone="onRemoveClone"
        @update-clone="onUpdateClone"
      />
    </template>

    <!-- Media & Feed -->
    <MediaFeedPanel v-else-if="activeTab === 'media'" />

    <!-- Bioreactor Design -->
    <div v-else-if="activeTab === 'bioreactor'" class="clone-up__body">
      <div class="clone-up__chart-card">
        <h3 class="clone-up__chart-title">{{ $t('cloneUp.chartTitle') }}</h3>
        <BioreactorGrowthChart :curve="bioreactorPrediction.curve" :temp-shift-day="bioreactorParams.tempShiftDay" />
        <div class="clone-up__results">
          <div class="clone-up__result">
            <span class="clone-up__result-label">{{ $t('cloneUp.results.peakVcd') }}</span>
            <span class="clone-up__result-value clone-up__result-value--vcd">{{ bioreactorPrediction.peakVcdE6 }} <small>{{ $t('cloneUp.results.vcdUnit') }}</small></span>
          </div>
          <div class="clone-up__result">
            <span class="clone-up__result-label">{{ $t('cloneUp.results.peakVcdDay') }}</span>
            <span class="clone-up__result-value">{{ bioreactorPrediction.peakVcdDay }}</span>
          </div>
          <div class="clone-up__result clone-up__result--hero">
            <span class="clone-up__result-label">{{ $t('cloneUp.results.finalTiter') }}</span>
            <span class="clone-up__result-value clone-up__result-value--titer">{{ bioreactorPrediction.finalTiterGL }} <small>{{ $t('cloneUp.results.titerUnit') }}</small></span>
          </div>
        </div>
      </div>

      <div class="clone-up__params">
        <h3 class="clone-up__params-title">{{ $t('cloneUp.params.title') }}</h3>
        <label class="clone-up__param">
          <span class="clone-up__param-label">{{ $t('cloneUp.params.seeding') }}<span class="clone-up__param-value">{{ bioreactorParams.seedingDensityE5 }} {{ $t('cloneUp.params.seedingUnit') }}</span></span>
          <input type="range" min="1" max="20" step="1" v-model.number="bioreactorParams.seedingDensityE5" class="clone-up__slider" />
        </label>
        <label class="clone-up__param">
          <span class="clone-up__param-label">{{ $t('cloneUp.params.maxVcd') }}<span class="clone-up__param-value">{{ bioreactorParams.maxVcdE6 }} {{ $t('cloneUp.params.maxVcdUnit') }}</span></span>
          <input type="range" min="5" max="40" step="1" v-model.number="bioreactorParams.maxVcdE6" class="clone-up__slider" />
        </label>
        <label class="clone-up__param">
          <span class="clone-up__param-label">{{ $t('cloneUp.params.growthRate') }}<span class="clone-up__param-value">{{ bioreactorParams.growthRatePerDay.toFixed(2) }} {{ $t('cloneUp.params.growthRateUnit') }}</span></span>
          <input type="range" min="0.2" max="1.2" step="0.05" v-model.number="bioreactorParams.growthRatePerDay" class="clone-up__slider" />
        </label>
        <label class="clone-up__param">
          <span class="clone-up__param-label">{{ $t('cloneUp.params.tempShift') }}<span class="clone-up__param-value">{{ bioreactorParams.tempShiftDay }} {{ $t('cloneUp.params.tempShiftUnit') }}</span></span>
          <input type="range" min="2" max="12" step="1" v-model.number="bioreactorParams.tempShiftDay" class="clone-up__slider" />
        </label>
        <label class="clone-up__param">
          <span class="clone-up__param-label">{{ $t('cloneUp.params.duration') }}<span class="clone-up__param-value">{{ bioreactorParams.durationDays }} {{ $t('cloneUp.params.durationUnit') }}</span></span>
          <input type="range" min="7" max="21" step="1" v-model.number="bioreactorParams.durationDays" class="clone-up__slider" />
        </label>
        <label class="clone-up__param">
          <span class="clone-up__param-label">{{ $t('cloneUp.params.qP') }}<span class="clone-up__param-value">{{ bioreactorParams.specificProductivity }} {{ $t('cloneUp.params.qPUnit') }}</span></span>
          <input type="range" min="5" max="40" step="1" v-model.number="bioreactorParams.specificProductivity" class="clone-up__slider" />
        </label>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'

import { ICON } from '@/constants/icons'

import { predictBioreactor, type BioreactorInputs, type BioreactorPrediction } from '@/utils/bioreactor/growth'

import { useProductionCampaignStore } from '@/stores/productionCampaignStore'
import { useCloneScreeningStore } from '@/stores/cloneScreeningStore'

import { MODULE_ID } from '@/types/campaign'
import type { CloneScreeningData } from '@/types/clone'

import BioreactorGrowthChart from '@/components/BioreactorGrowthChart/index.vue'
import CloneScreeningPanel   from '@/components/CloneScreeningPanel/index.vue'
import MediaFeedPanel        from '@/components/MediaFeedPanel/index.vue'

type TabId = 'screening' | 'media' | 'bioreactor'

const TABS: { id: TabId; labelKey: string }[] = [
  { id: 'screening',  labelKey: 'cloneUp.tab.screening' },
  { id: 'media',      labelKey: 'cloneUp.tab.media' },
  { id: 'bioreactor', labelKey: 'cloneUp.tab.bioreactor' },
]

export default defineComponent({
  name: 'CloneUpstreamView',
  components: { BioreactorGrowthChart, CloneScreeningPanel, MediaFeedPanel },
  data() {
    return {
      activeTab: 'screening' as TabId,
      tabs: TABS,
      bioreactorParams: {
        seedingDensityE5:     5,
        maxVcdE6:             20,
        growthRatePerDay:     0.6,
        tempShiftDay:         6,
        durationDays:         14,
        specificProductivity: 20,
      } as BioreactorInputs,
    }
  },
  computed: {
    ...mapStores(useProductionCampaignStore, useCloneScreeningStore),
    ICON() { return ICON },

    activeCampaign() { return this.productionCampaignStore.activeCampaign },
    campaignId(): string { return this.activeCampaign?.id ?? '' },
    clones(): CloneScreeningData[] { return this.cloneScreeningStore.clonesFor(this.campaignId) },

    bioreactorPrediction(): BioreactorPrediction {
      return predictBioreactor(this.bioreactorParams)
    },
  },
  watch: {
    'bioreactorPrediction.finalTiterGL': {
      immediate: true,
      handler(titer: number) {
        if (this.activeCampaign) this.productionCampaignStore.setModulePrediction(this.activeCampaign.id, MODULE_ID.CLONE_UPSTREAM, { titerGperL: titer })
      },
    },
  },
  mounted() {
    const c = this.activeCampaign
    if (!c) return
    this.productionCampaignStore.markModuleStarted(c.id, MODULE_ID.CLONE_UPSTREAM)
    if (this.clones.length > 0) this.markScreeningDone()
  },
  methods: {
    markScreeningDone() {
      if (this.activeCampaign) this.productionCampaignStore.markModuleComplete(this.activeCampaign.id, MODULE_ID.CLONE_UPSTREAM)
    },
    onAddClone() {
      this.cloneScreeningStore.addClone(this.campaignId)
      this.markScreeningDone()
    },
    onLoadDemo() {
      this.cloneScreeningStore.seed(this.campaignId)
      this.markScreeningDone()
    },
    onRemoveClone(id: string) { this.cloneScreeningStore.removeClone(this.campaignId, id) },
    onUpdateClone(id: string, patch: Partial<CloneScreeningData>) { this.cloneScreeningStore.updateClone(this.campaignId, id, patch) },
  },
})
</script>

<style lang="scss" scoped>
.clone-up {
  padding: 2rem 2.5rem;
  max-width: 1300px;
  margin: 0 auto;
  @include flex-col(1.25rem);

  @media (max-width: 768px) { padding: 1.25rem 1rem; }

  &__header { @include flex-between(1rem); align-items: flex-start; }
  &__title { margin: 0 0 0.35rem; font-size: 1.6rem; font-weight: 600; color: var(--color-text-heading); }
  &__subtitle { margin: 0; font-size: var(--fs-lg); opacity: var(--op-partial); max-width: 48rem; line-height: 1.5; }

  &__badge {
    @include mono-upper(var(--fs-xxs)); padding: 0.3rem 0.6rem; border-radius: 999px;
    background: color-mix(in srgb, var(--color-amber) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-amber) 35%, transparent);
    color: var(--color-amber); cursor: help; flex-shrink: 0;
  }

  &__tabs { @include flex-row(0.25rem); flex-wrap: wrap; border-bottom: 1px solid var(--color-border); }
  &__tab {
    @include mono-upper(var(--fs-xs), 0.04em); background: transparent; border: none; color: var(--color-text);
    opacity: var(--op-muted); padding: 0.7rem 0.8rem; cursor: pointer; border-bottom: 2px solid transparent;
    transition: opacity var(--tr-fast), color var(--tr-fast), border-color var(--tr-fast); white-space: nowrap;
    &:hover { opacity: var(--op-strong); }
    &--active { opacity: 1; color: var(--color-primary); border-bottom-color: var(--color-primary); }
  }

  &__no-campaign {
    padding: 3rem 1.5rem; text-align: center; opacity: var(--op-partial); font-size: var(--fs-lg);
    background: var(--color-surface); border: 1px dashed var(--color-border); border-radius: var(--radius-lg);
  }

  &__body { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); gap: 1.25rem; align-items: start; @media (max-width: 900px) { grid-template-columns: 1fr; } }

  &__chart-card {
    @include flex-col(1rem); padding: 1.25rem;
    background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg);
  }
  &__chart-title { margin: 0; @include mono-upper(var(--fs-xs)); opacity: var(--op-partial); }

  &__results { @include flex-row(1.5rem); flex-wrap: wrap; padding-top: 0.5rem; border-top: 1px solid color-mix(in srgb, var(--color-text) 8%, transparent); }
  &__result { @include flex-col(0.2rem); &--hero .clone-up__result-value { font-size: 1.5rem; } }
  &__result-label { @include mono-upper(var(--fs-xxs)); opacity: var(--op-muted); }
  &__result-value {
    font-family: var(--font-mono); font-size: 1.1rem; font-weight: 700; color: var(--color-text);
    small { font-size: 0.6em; opacity: var(--op-muted); }
    &--vcd { color: var(--color-primary); }
    &--titer { color: var(--color-ok); }
  }

  &__params {
    @include flex-col(1rem); padding: 1.25rem;
    background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg);
  }
  &__params-title { margin: 0; font-size: 1.05rem; font-weight: 600; color: var(--color-text-heading); }
  &__param { @include flex-col(0.4rem); }
  &__param-label { @include flex-between(0.5rem); align-items: baseline; font-size: var(--fs-sm); color: var(--color-text); }
  &__param-value { font-family: var(--font-mono); font-size: var(--fs-xs); font-weight: 600; color: var(--color-primary); }
  &__slider { width: 100%; accent-color: var(--color-primary); }
}
</style>
