<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="campaigns-view">
    <header class="campaigns-view__header">
      <div>
        <h1 class="campaigns-view__title">{{ $t('campaign.viewTitle') }}</h1>
        <p class="campaigns-view__subtitle">{{ $t('campaign.viewSubtitle') }}</p>
      </div>
      <button v-if="campaigns.length > 0" class="campaigns-view__new-btn" @click="openWizard">
        {{ $t('campaign.newButton') }}
      </button>
    </header>

    <div v-if="campaigns.length === 0" class="campaigns-view__empty">
      <div class="campaigns-view__empty-inner">
        <span class="campaigns-view__empty-icon" aria-hidden="true">{{ ICON.FOLDER }}</span>
        <h2 class="campaigns-view__empty-title">{{ $t('campaign.emptyTitle') }}</h2>
        <p class="campaigns-view__empty-description">{{ $t('campaign.emptyDescription') }}</p>
        <button class="campaigns-view__empty-cta" @click="openWizard">
          {{ $t('campaign.emptyCta') }} {{ ICON.ARROW_SHORT }}
        </button>
      </div>
    </div>

    <div v-else class="campaigns-view__grid">
      <CampaignCard
        v-for="c in campaigns"
        :key="c.id"
        :campaign="c"
        :active="c.id === campaignStore.activeCampaignId"
        @open="openCampaign(c.id)"
      />
    </div>

    <CampaignWizard v-if="wizardOpen" @close="wizardOpen = false" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'

import { ROUTE } from '@/constants/routes'
import { ICON } from '@/constants/icons'

import { useProductionCampaignStore } from '@/stores/productionCampaignStore'

import { MODULE_ID, MODULE_STATUS, type ModuleId } from '@/types/campaign'

import CampaignCard from '@/components/CampaignCard/index.vue'
import CampaignWizard from '@/components/CampaignWizard/index.vue'

export default defineComponent({
  name: 'CampaignsView',
  components: { CampaignCard, CampaignWizard },
  data() {
    return {
      wizardOpen: false,
    }
  },
  computed: {
    ...mapStores(useProductionCampaignStore),
    ICON() { return ICON },

    campaigns() {
      return this.productionCampaignStore.sortedCampaigns
    },

    campaignStore() {
      return this.productionCampaignStore
    },
  },
  methods: {
    openWizard() {
      this.wizardOpen = true
    },
    openCampaign(id: string) {
      this.productionCampaignStore.setActive(id)
      const c = this.productionCampaignStore.campaigns.find(x => x.id === id)
      if (!c) return
      const target = this.routeForCampaign(c.modules)
      this.$router.push(target)
    },
    routeForCampaign(modules: Record<ModuleId, { status: string }>): string {
      // Resume on the first in-progress module; fall back to cell engineering for new campaigns.
      if (modules[MODULE_ID.DOWNSTREAM].status === MODULE_STATUS.IN_PROGRESS)       return ROUTE.DOWNSTREAM
      if (modules[MODULE_ID.CELL_ENGINEERING].status === MODULE_STATUS.IN_PROGRESS) return ROUTE.CELL_ENGINEERING
      if (modules[MODULE_ID.CLONE_UPSTREAM].status === MODULE_STATUS.IN_PROGRESS)   return ROUTE.CLONE_UPSTREAM
      return ROUTE.CELL_ENGINEERING
    },
  },
})
</script>

<style lang="scss" scoped>
.campaigns-view {
  padding: 2rem 2.5rem;
  max-width: 1200px;
  margin: 0 auto;

  @media (max-width: 768px) {
    padding: 1.25rem 1rem;
  }

  &__header {
    @include flex-between(1rem);
    align-items: flex-end;
    margin-bottom: 2rem;
  }

  &__title {
    margin: 0 0 0.4rem;
    font-size: 1.75rem;
    font-weight: 600;
    color: var(--color-text-heading);
  }

  &__subtitle {
    margin: 0;
    font-size: var(--fs-lg);
    opacity: var(--op-partial);
    max-width: 42rem;
    line-height: 1.5;
  }

  &__new-btn {
    @include mono-upper(var(--fs-sm));
    background: var(--color-primary);
    color: var(--color-bg);
    border: none;
    padding: 0.7rem 1.2rem;
    border-radius: var(--radius);
    cursor: pointer;
    flex-shrink: 0;
    transition: background var(--tr-fast), transform var(--tr-fast);

    &:hover {
      background: color-mix(in srgb, var(--color-primary) 88%, white);
      transform: translateY(-1px);
    }
  }

  &__empty {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4rem 1rem;
  }

  &__empty-inner {
    @include flex-col(1rem);
    align-items: center;
    text-align: center;
    max-width: 28rem;
  }

  &__empty-icon {
    font-size: 3rem;
    opacity: var(--op-muted);
    margin-bottom: 0.5rem;
  }

  &__empty-title {
    margin: 0;
    font-size: 1.4rem;
    font-weight: 600;
    color: var(--color-text-heading);
  }

  &__empty-description {
    margin: 0;
    opacity: var(--op-partial);
    line-height: 1.6;
    font-size: var(--fs-lg);
  }

  &__empty-cta {
    @include mono-upper(var(--fs-sm));
    background: var(--color-primary);
    color: var(--color-bg);
    border: none;
    padding: 0.8rem 1.4rem;
    border-radius: var(--radius);
    cursor: pointer;
    margin-top: 0.5rem;
    transition: background var(--tr-fast), transform var(--tr-fast);

    &:hover {
      background: color-mix(in srgb, var(--color-primary) 88%, white);
      transform: translateY(-1px);
    }
  }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 1.25rem;
  }
}
</style>
