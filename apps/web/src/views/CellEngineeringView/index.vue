<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="cell-engineering">

    <header class="cell-engineering__header">
      <div>
        <h1 class="cell-engineering__title">{{ $t('cellEng.viewTitle') }}</h1>
        <p class="cell-engineering__subtitle">{{ $t('cellEng.viewSubtitle') }}</p>
      </div>
    </header>

    <!-- No active campaign state -->
    <div v-if="!activeCampaign" class="cell-engineering__no-campaign">
      <p class="cell-engineering__no-campaign-text">{{ $t('cellEng.noCampaign') }}</p>
      <RouterLink :to="ROUTE.CAMPAIGNS" class="cell-engineering__no-campaign-btn">
        {{ $t('cellEng.openCampaigns') }} {{ ICON.ARROW_SHORT }}
      </RouterLink>
    </div>

    <!-- Main layout -->
    <div v-else class="cell-engineering__layout">

      <!-- Left: tabs + active panel -->
      <div class="cell-engineering__main">

        <nav class="cell-engineering__tabs" role="tablist">
          <button
            v-for="tab in tabs"
            :key="tab.id"
            class="cell-engineering__tab"
            :class="{ 'cell-engineering__tab--active': activeTab === tab.id }"
            role="tab"
            :aria-selected="activeTab === tab.id"
            @click="activeTab = tab.id"
          >
            {{ $t(tab.labelKey) }}
          </button>
        </nav>

        <div class="cell-engineering__panel">

          <CellLineSelectorPanel
            v-if="activeTab === 'selection'"
            :active-molecule="activeCampaign.moleculeType"
            :selected-cell-line-id="activeCampaign.selectedCellLineId"
            @change-molecule="onChangeMolecule"
            @select="onSelectCellLine"
            @view-detail="onViewDetail"
          />

          <GeneticStrategyPanel
            v-else-if="activeTab === 'strategy'"
            :selected-cell-line-id="activeCampaign.selectedCellLineId"
            :molecule-type="activeCampaign.moleculeType"
            @open-selector="activeTab = 'selection'"
          />

          <TransfectionOptimizerPanel
            v-else-if="activeTab === 'transfection'"
            :selected-cell-line-id="activeCampaign.selectedCellLineId"
            :molecule-type="activeCampaign.moleculeType"
            @open-selector="activeTab = 'selection'"
          />

          <DevelopabilityScorePanel
            v-else-if="activeTab === 'developability'"
            :selected-cell-line-id="activeCampaign.selectedCellLineId"
            :molecule-type="activeCampaign.moleculeType"
            @open-selector="activeTab = 'selection'"
          />

        </div>
      </div>

      <!-- Right: campaign context sidebar -->
      <CampaignContextSidebar
        class="cell-engineering__sidebar"
        :campaign-name="activeCampaign.name"
        :molecule-type="activeCampaign.moleculeType"
        :selected-cell-line-id="activeCampaign.selectedCellLineId"
        :module-progress="moduleProgress"
        @open-switcher="onOpenSwitcher"
        @finish="finishOpen = true"
      />

    </div>

    <FinishCampaignModal v-if="finishOpen" @close="finishOpen = false" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'

import { ROUTE } from '@/constants/routes'
import { ICON } from '@/constants/icons'
import type { MoleculeType } from '@/constants/moleculeTypes'

import { useProductionCampaignStore } from '@/stores/productionCampaignStore'

import { MODULE_ID } from '@/types/campaign'

import CellLineSelectorPanel      from '@/components/CellLineSelectorPanel/index.vue'
import CampaignContextSidebar      from '@/components/CampaignContextSidebar/index.vue'
import FinishCampaignModal         from '@/components/FinishCampaignModal/index.vue'
import GeneticStrategyPanel        from '@/components/GeneticStrategyPanel/index.vue'
import TransfectionOptimizerPanel  from '@/components/TransfectionOptimizerPanel/index.vue'
import DevelopabilityScorePanel    from '@/components/DevelopabilityScorePanel/index.vue'

type TabId = 'selection' | 'strategy' | 'transfection' | 'developability'

const TABS: { id: TabId; labelKey: string }[] = [
  { id: 'selection',      labelKey: 'cellEng.tab.selection' },
  { id: 'strategy',       labelKey: 'cellEng.tab.strategy' },
  { id: 'transfection',   labelKey: 'cellEng.tab.transfection' },
  { id: 'developability', labelKey: 'cellEng.tab.developability' },
]

export default defineComponent({
  name: 'CellEngineeringView',
  components: { CellLineSelectorPanel, CampaignContextSidebar, GeneticStrategyPanel, TransfectionOptimizerPanel, DevelopabilityScorePanel, FinishCampaignModal },
  data() {
    return {
      activeTab: 'selection' as TabId,
      tabs: TABS,
      finishOpen: false,
    }
  },
  computed: {
    ...mapStores(useProductionCampaignStore),
    ROUTE() { return ROUTE },
    ICON()  { return ICON },

    activeCampaign() {
      return this.productionCampaignStore.activeCampaign
    },

    moduleProgress() {
      return this.productionCampaignStore.moduleProgress
    },
  },
  mounted() {
    // Mark this module as in-progress when the user enters Cell Engineering with an active campaign.
    const c = this.activeCampaign
    if (!c) return
    this.productionCampaignStore.markModuleStarted(c.id, MODULE_ID.CELL_ENGINEERING)
    if (c.selectedCellLineId) this.productionCampaignStore.markModuleComplete(c.id, MODULE_ID.CELL_ENGINEERING)
  },
  methods: {
    onChangeMolecule(molecule: MoleculeType) {
      if (!this.activeCampaign) return
      // Changing molecule is non-destructive: clear the cell line selection since fit changes.
      const c = this.activeCampaign
      c.moleculeType = molecule
      this.productionCampaignStore.setCellLine(c.id, null)
      this.productionCampaignStore.persist()
    },
    onSelectCellLine(cellLineId: string) {
      if (!this.activeCampaign) return
      this.productionCampaignStore.setCellLine(this.activeCampaign.id, cellLineId)
      this.productionCampaignStore.markModuleComplete(this.activeCampaign.id, MODULE_ID.CELL_ENGINEERING)
    },
    onViewDetail(cellLineId: string) {
      // CellLineDetailModal in a later task; emit/log for now.
      console.info('view detail for', cellLineId)
    },
    onOpenSwitcher() {
      // The switcher is owned by App.vue; route through window event or store action.
      // For now, navigate to /campaigns as the simplest path.
      this.$router.push(ROUTE.CAMPAIGNS)
    },
  },
})
</script>

<style lang="scss" scoped>
.cell-engineering {
  padding: 2rem 2.5rem;
  max-width: 1400px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: 1.25rem 1rem;
  }

  &__header {
    margin-bottom: 1.5rem;
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
    max-width: 32rem;
  }

  &__no-campaign-btn {
    @include mono-upper(var(--fs-sm));
    background: var(--color-primary);
    color: var(--color-bg);
    padding: 0.7rem 1.2rem;
    border-radius: var(--radius);
    text-decoration: none;
    transition: background var(--tr-fast);

    &:hover { background: color-mix(in srgb, var(--color-primary) 90%, white); }
  }

  &__layout {
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 1.5rem;

    @media (max-width: 1100px) {
      grid-template-columns: 1fr;
    }
  }

  &__main {
    @include flex-col(1.25rem);
    min-width: 0;
  }

  &__tabs {
    @include flex-row(0.25rem);
    flex-wrap: wrap;
    border-bottom: 1px solid var(--color-border);
  }

  &__tab {
    @include mono-upper(var(--fs-xs), 0.04em);
    background: transparent;
    border: none;
    color: var(--color-text);
    opacity: var(--op-muted);
    padding: 0.7rem 0.8rem;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    transition: opacity var(--tr-fast), color var(--tr-fast), border-color var(--tr-fast);
    white-space: nowrap;

    &:hover {
      opacity: var(--op-strong);
    }

    &--active {
      opacity: 1;
      color: var(--color-primary);
      border-bottom-color: var(--color-primary);
    }
  }

  &__panel {
    min-height: 30rem;
  }

  &__placeholder {
    @include flex-col(1rem);
    align-items: center;
    text-align: center;
    padding: 4rem 1.5rem;
    background: var(--color-surface);
    border: 1px dashed var(--color-border);
    border-radius: var(--radius-lg);
  }

  &__placeholder-icon {
    font-size: 2rem;
    opacity: var(--op-muted);
    color: var(--color-primary);
  }

  &__placeholder-text {
    margin: 0;
    opacity: var(--op-partial);
    max-width: 36rem;
    line-height: 1.6;
  }

  &__sidebar {
    @media (max-width: 1100px) {
      order: -1;
    }
  }
}
</style>
