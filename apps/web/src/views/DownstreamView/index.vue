<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="downstream-view">

    <header class="downstream-view__header">
      <div>
        <h1 class="downstream-view__title">{{ $t('downstream.viewTitle') }}</h1>
        <p class="downstream-view__subtitle">{{ $t('downstream.viewSubtitle') }}</p>
      </div>
      <span class="downstream-view__pred-badge" v-tip="$t('downstream.predictionBadgeHelp')">
        {{ ICON.INFO }} {{ $t('downstream.predictionBadge') }}
      </span>
    </header>

    <div v-if="!activeCampaign" class="downstream-view__no-campaign">
      <p class="downstream-view__no-campaign-text">{{ $t('downstream.noCampaign') }}</p>
      <RouterLink :to="ROUTE.CAMPAIGNS" class="downstream-view__no-campaign-btn">
        {{ $t('downstream.openCampaigns') }} {{ ICON.ARROW_SHORT }}
      </RouterLink>
    </div>

    <template v-else>
      <!-- Three-zone layout -->
      <div class="downstream-view__body">
        <div class="downstream-view__sequencer">
          <ProcessStepSequencer
            :steps="train.steps"
            :results="prediction.steps"
            :selected-id="selectedId"
            :bottleneck-id="prediction.bottleneckInstanceId"
            @select="selectedId = $event"
            @move="onMove"
            @duplicate="onDuplicate"
            @remove="onRemove"
            @add-step="pickerOpen = true"
            @load-template="loadTemplate"
          />
        </div>

        <div class="downstream-view__chart">
          <h3 class="downstream-view__chart-title">{{ $t('downstream.chart.title') }}</h3>
          <YieldWaterfallChart :steps="prediction.steps" :target-yield-pct="targetYield" />
        </div>

        <div class="downstream-view__detail">
          <StepDetailPanel
            :step-type="selectedStepType"
            :param-values="selectedParamValues"
            @set-param="onSetParam"
          />
        </div>
      </div>

      <!-- Summary bar -->
      <DownstreamSummaryBar
        :starting-titer-g-l="train.startingTiterGL"
        :volume-l="train.volumeL"
        :starting-mass-g="prediction.startingMassG"
        :final-mass-g="prediction.finalMassG"
        :overall-yield-pct="prediction.cumulativeYieldPct"
        :total-hcp="prediction.totalHcpLogReduction"
        :has-bottleneck="prediction.bottleneckInstanceId !== null"
        @set-titer="onSetTiter"
        @set-volume="onSetVolume"
        @open-bottleneck="openBottleneck"
      />
    </template>

    <!-- Modals -->
    <StepTypePicker
      v-if="pickerOpen && activeCampaign"
      :molecule-type="activeCampaign.moleculeType"
      @close="pickerOpen = false"
      @pick="onPickStep"
    />
    <BottleneckPanel
      v-if="bottleneckOpen"
      :step-type="bottleneckStepType"
      :param-values="bottleneckParamValues"
      @close="bottleneckOpen = false"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'

import { ROUTE } from '@/constants/routes'
import { ICON } from '@/constants/icons'
import { DEFAULT_PROCESS_TRAIN } from '@/constants/processStepCatalog'

import { useProductionCampaignStore } from '@/stores/productionCampaignStore'
import { useDownstreamStore } from '@/stores/downstreamStore'

import { MODULE_ID } from '@/types/campaign'

import ProcessStepSequencer from '@/components/ProcessStepSequencer/index.vue'
import YieldWaterfallChart   from '@/components/YieldWaterfallChart/index.vue'
import StepDetailPanel       from '@/components/StepDetailPanel/index.vue'
import DownstreamSummaryBar  from '@/components/DownstreamSummaryBar/index.vue'
import StepTypePicker        from '@/components/StepTypePicker/index.vue'
import BottleneckPanel       from '@/components/BottleneckPanel/index.vue'

const TARGET_YIELD_PCT = 50

export default defineComponent({
  name: 'DownstreamView',
  components: {
    ProcessStepSequencer, YieldWaterfallChart, StepDetailPanel,
    DownstreamSummaryBar, StepTypePicker, BottleneckPanel,
  },
  data() {
    return {
      selectedId:     null as string | null,
      pickerOpen:     false,
      bottleneckOpen: false,
      targetYield:    TARGET_YIELD_PCT,
    }
  },
  computed: {
    ...mapStores(useProductionCampaignStore, useDownstreamStore),
    ROUTE() { return ROUTE },
    ICON()  { return ICON },

    activeCampaign() {
      return this.productionCampaignStore.activeCampaign
    },

    campaignId(): string {
      return this.activeCampaign?.id ?? ''
    },

    train() {
      return this.downstreamStore.trainFor(this.campaignId)
    },

    prediction() {
      return this.downstreamStore.prediction(this.campaignId)
    },

    selectedStepType(): string | null {
      return this.train.steps.find(s => s.id === this.selectedId)?.stepType ?? null
    },

    selectedParamValues(): Record<string, number> {
      return this.train.steps.find(s => s.id === this.selectedId)?.paramValues ?? {}
    },

    bottleneckStepType(): string | null {
      const id = this.prediction.bottleneckInstanceId
      return this.train.steps.find(s => s.id === id)?.stepType ?? null
    },

    bottleneckParamValues(): Record<string, number> {
      const id = this.prediction.bottleneckInstanceId
      return this.train.steps.find(s => s.id === id)?.paramValues ?? {}
    },
  },
  watch: {
    'prediction.cumulativeYieldPct': {
      immediate: true,
      handler(yieldPct: number) {
        if (this.activeCampaign) this.productionCampaignStore.setModulePrediction(this.activeCampaign.id, MODULE_ID.DOWNSTREAM, { yieldPct })
      },
    },
  },
  mounted() {
    const c = this.activeCampaign
    if (!c) return
    this.productionCampaignStore.markModuleStarted(c.id, MODULE_ID.DOWNSTREAM)
    if (this.train.steps.length > 0) this.markDownstreamDone()
  },
  methods: {
    markDownstreamDone() {
      if (this.activeCampaign) this.productionCampaignStore.markModuleComplete(this.activeCampaign.id, MODULE_ID.DOWNSTREAM)
    },
    onMove(from: number, to: number) {
      this.downstreamStore.moveStep(this.campaignId, from, to)
    },
    onDuplicate(instanceId: string) {
      this.downstreamStore.duplicateStep(this.campaignId, instanceId)
    },
    onRemove(instanceId: string) {
      this.downstreamStore.removeStep(this.campaignId, instanceId)
      if (this.selectedId === instanceId) this.selectedId = null
    },
    onPickStep(stepType: string) {
      this.downstreamStore.addStep(this.campaignId, stepType)
      this.pickerOpen = false
      this.markDownstreamDone()
    },
    onSetParam(key: string, value: number) {
      if (!this.selectedId) return
      this.downstreamStore.setParam(this.campaignId, this.selectedId, key, value)
    },
    onSetTiter(v: number) {
      this.downstreamStore.setStartingTiter(this.campaignId, v)
    },
    onSetVolume(v: number) {
      this.downstreamStore.setVolume(this.campaignId, v)
    },
    loadTemplate() {
      if (!this.activeCampaign) return
      const train = DEFAULT_PROCESS_TRAIN[this.activeCampaign.moleculeType]
      if (train) {
        this.downstreamStore.loadDefaultTrain(this.campaignId, train)
        this.markDownstreamDone()
      }
    },
    openBottleneck() {
      this.bottleneckOpen = true
    },
  },
})
</script>

<style lang="scss" scoped>
.downstream-view {
  padding: 2rem 2.5rem;
  max-width: 1500px;
  margin: 0 auto;
  @include flex-col(1.25rem);

  @media (max-width: 768px) {
    padding: 1.25rem 1rem;
  }

  &__header {
    @include flex-between(1rem);
    align-items: flex-start;
  }

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

  &__pred-badge {
    @include mono-upper(var(--fs-xxs));
    padding: 0.3rem 0.6rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-amber) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-amber) 35%, transparent);
    color: var(--color-amber);
    cursor: help;
    flex-shrink: 0;
  }

  &__no-campaign {
    @include flex-col(1rem);
    align-items: center;
    text-align: center;
    padding: 4rem 1.5rem;
    background: var(--color-surface);
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-lg);
  }

  &__no-campaign-text {
    margin: 0;
    opacity: var(--op-partial);
    font-size: var(--fs-lg);
  }

  &__no-campaign-btn {
    @include mono-upper(var(--fs-sm));
    background: var(--color-primary);
    color: var(--color-bg);
    padding: 0.7rem 1.2rem;
    border-radius: var(--radius);
    text-decoration: none;

    &:hover { background: color-mix(in srgb, var(--color-primary) 90%, white); }
  }

  &__body {
    display: grid;
    grid-template-columns: 280px minmax(0, 1fr) 320px;
    gap: 1.25rem;
    align-items: start;

    @media (max-width: 1200px) {
      grid-template-columns: 1fr;
    }
  }

  &__chart {
    @include flex-col(0.75rem);
    padding: 1.25rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
  }

  &__chart-title {
    margin: 0;
    @include mono-upper(var(--fs-xs));
    opacity: var(--op-partial);
  }
}
</style>
