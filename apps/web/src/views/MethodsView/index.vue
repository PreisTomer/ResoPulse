<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="methods-view">
    <header class="methods-view__header">
      <h1 class="methods-view__title">{{ $t('methods.viewTitle') }}</h1>
      <p class="methods-view__subtitle">{{ $t('methods.viewSubtitle') }}</p>
    </header>

    <div class="methods-view__grid">
      <article v-for="t in templates" :key="t.id" class="methods-view__card">
        <div class="methods-view__card-visual">
          <TargetProteinVisual :molecule-type="t.moleculeType" :size="80" />
        </div>

        <div class="methods-view__card-body">
          <header class="methods-view__card-header">
            <h3 class="methods-view__card-name">{{ t.name }}</h3>
            <span class="methods-view__complexity" :data-level="t.complexity">{{ complexityLabel(t.complexity) }}</span>
          </header>

          <p class="methods-view__card-desc">{{ t.description }}</p>

          <dl class="methods-view__card-facts">
            <div><dt>{{ $t('methods.cellLineLabel') }}</dt><dd>{{ cellLineName(t.cellLineId) }}</dd></div>
            <div><dt>{{ $t('methods.expectedYield') }}</dt><dd>{{ t.expectedYieldPct[0] }}–{{ t.expectedYieldPct[1] }}%</dd></div>
          </dl>

          <div class="methods-view__steps">
            <span class="methods-view__steps-label">{{ $t('methods.stepCount', { count: t.downstreamSteps.length }) }}</span>
            <div class="methods-view__step-flow">
              <template v-for="(s, i) in t.downstreamSteps" :key="s">
                <StepVisual class="methods-view__step-icon" :category="categoryFor(s)" />
                <span v-if="i < t.downstreamSteps.length - 1" class="methods-view__step-arrow" aria-hidden="true">{{ ICON.ARROW_SHORT }}</span>
              </template>
            </div>
          </div>

          <button class="methods-view__use-btn" @click="useTemplate(t.id)">
            {{ $t('methods.useTemplate') }} {{ ICON.ARROW_SHORT }}
          </button>
        </div>
      </article>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { ROUTE } from '@/constants/routes'
import { ICON } from '@/constants/icons'
import { METHOD_TEMPLATE_CATALOG, getTemplateById, type TemplateComplexity } from '@/constants/methodTemplateCatalog'
import { getCellLineById } from '@/constants/cellLineCatalog'
import { getStepById, STEP_CATEGORY, type StepCategory } from '@/constants/processStepCatalog'

import { useProductionCampaignStore } from '@/stores/productionCampaignStore'
import { useDownstreamStore } from '@/stores/downstreamStore'

import { MODULE_ID } from '@/types/campaign'

import TargetProteinVisual from '@/components/TargetProteinVisual/index.vue'
import StepVisual from '@/components/StepVisual/index.vue'

export default defineComponent({
  name: 'MethodsView',
  components: { TargetProteinVisual, StepVisual },
  computed: {
    ICON() { return ICON },
    templates() { return METHOD_TEMPLATE_CATALOG },
  },
  methods: {
    complexityLabel(c: TemplateComplexity): string {
      const map: Record<TemplateComplexity, string> = {
        standard: this.$t('methods.complexityStandard'),
        moderate: this.$t('methods.complexityModerate'),
        advanced: this.$t('methods.complexityAdvanced'),
      }
      return map[c]
    },
    cellLineName(id: string): string {
      return getCellLineById(id)?.shortLabel ?? id
    },
    categoryFor(stepType: string): StepCategory {
      return getStepById(stepType)?.category ?? STEP_CATEGORY.CAPTURE
    },
    useTemplate(templateId: string) {
      const template = getTemplateById(templateId)
      if (!template) return
      const campaignStore = useProductionCampaignStore()
      const downstreamStore = useDownstreamStore()

      const campaign = campaignStore.createCampaign({
        name: template.name,
        moleculeType: template.moleculeType,
        setActive: true,
      })
      campaignStore.setCellLine(campaign.id, template.cellLineId)
      campaignStore.markModuleStarted(campaign.id, MODULE_ID.CELL_ENGINEERING)
      downstreamStore.loadDefaultTrain(campaign.id, template.downstreamSteps)

      this.$router.push({ path: ROUTE.CELL_ENGINEERING, query: { campaign: campaign.id } })
    },
  },
})
</script>

<style lang="scss" scoped>
.methods-view {
  padding: 2rem 2.5rem;
  max-width: 1300px;
  margin: 0 auto;

  @media (max-width: 768px) { padding: 1.25rem 1rem; }

  &__header { margin-bottom: 1.5rem; }
  &__title { margin: 0 0 0.35rem; font-size: 1.6rem; font-weight: 600; color: var(--color-text-heading); }
  &__subtitle { margin: 0; font-size: var(--fs-lg); opacity: var(--op-partial); max-width: 48rem; line-height: 1.5; }

  &__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
    gap: 1.25rem;
  }

  &__card {
    @include flex-row(1.25rem);
    align-items: flex-start;
    padding: 1.25rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    transition: transform var(--tr-fast), border-color var(--tr-fast);

    &:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--color-primary) 35%, var(--color-border)); }

    @media (max-width: 500px) { flex-direction: column; }
  }

  &__card-visual { flex-shrink: 0; width: 80px; height: 80px; }
  &__card-body { flex: 1; @include flex-col(0.7rem); min-width: 0; }

  &__card-header { @include flex-between(0.5rem); align-items: baseline; }
  &__card-name { margin: 0; font-size: 1.1rem; font-weight: 600; color: var(--color-text-heading); }

  &__complexity {
    @include mono-upper(var(--fs-xxs));
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    &[data-level="standard"] { background: color-mix(in srgb, var(--color-ok) 15%, transparent); color: var(--color-ok); }
    &[data-level="moderate"] { background: color-mix(in srgb, var(--color-primary) 15%, transparent); color: var(--color-primary); }
    &[data-level="advanced"] { background: color-mix(in srgb, var(--color-amber) 18%, transparent); color: var(--color-amber); }
  }

  &__card-desc { margin: 0; font-size: var(--fs-sm); opacity: var(--op-partial); line-height: 1.5; }

  &__card-facts {
    @include flex-row(1.5rem); margin: 0;
    div { @include flex-col(0.15rem); }
    dt { @include mono-upper(0.55rem); opacity: var(--op-muted); margin: 0; }
    dd { font-family: var(--font-mono); font-size: var(--fs-sm); color: var(--color-text); margin: 0; }
  }

  &__steps { @include flex-col(0.4rem); }
  &__steps-label { @include mono-upper(var(--fs-xxs)); opacity: var(--op-muted); }
  &__step-flow { @include flex-row(0.2rem); flex-wrap: wrap; align-items: center; }
  &__step-icon { width: 26px; height: 30px; flex-shrink: 0; }
  &__step-arrow { font-size: 0.7rem; opacity: var(--op-muted); }

  &__use-btn {
    @include mono-upper(var(--fs-xs));
    align-self: flex-start;
    background: var(--color-primary);
    color: var(--color-bg);
    border: none;
    padding: 0.55rem 1rem;
    border-radius: var(--radius);
    cursor: pointer;
    margin-top: 0.25rem;
    transition: background var(--tr-fast);

    &:hover { background: color-mix(in srgb, var(--color-primary) 90%, white); }
  }
}
</style>
