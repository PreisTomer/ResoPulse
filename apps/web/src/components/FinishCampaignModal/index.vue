<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <Teleport to="body">
    <div class="finish-modal" @click.self="$emit('close')">
      <div class="finish-modal__card" role="dialog" aria-modal="true">
        <header class="finish-modal__header">
          <h2 class="finish-modal__title">{{ $t('campaign.finish.title') }}</h2>
          <p class="finish-modal__subtitle">{{ $t('campaign.finish.subtitle') }}</p>
        </header>

        <div class="finish-modal__rows">
          <div class="finish-modal__row">
            <span class="finish-modal__row-label">{{ $t('campaign.finish.titerLabel') }}</span>
            <span class="finish-modal__predicted">{{ $t('campaign.finish.predictedLabel') }}: {{ predictedTiter }} {{ $t('campaign.finish.titerUnit') }}</span>
            <label class="finish-modal__field">
              <span class="finish-modal__field-label">{{ $t('campaign.finish.actualLabel') }}</span>
              <input class="finish-modal__input" type="number" step="0.1" min="0" v-model.number="form.titer" :placeholder="$t('campaign.finish.titerUnit')" />
            </label>
          </div>

          <div class="finish-modal__row">
            <span class="finish-modal__row-label">{{ $t('campaign.finish.yieldLabel') }}</span>
            <span class="finish-modal__predicted">{{ $t('campaign.finish.predictedLabel') }}: {{ predictedYield }} {{ $t('campaign.finish.pctUnit') }}</span>
            <label class="finish-modal__field">
              <span class="finish-modal__field-label">{{ $t('campaign.finish.actualLabel') }}</span>
              <input class="finish-modal__input" type="number" step="0.1" min="0" max="100" v-model.number="form.yieldPct" :placeholder="$t('campaign.finish.pctUnit')" />
            </label>
          </div>

          <div class="finish-modal__row">
            <span class="finish-modal__row-label">{{ $t('campaign.finish.viabilityLabel') }}</span>
            <span class="finish-modal__predicted"></span>
            <label class="finish-modal__field">
              <span class="finish-modal__field-label">{{ $t('campaign.finish.actualLabel') }}</span>
              <input class="finish-modal__input" type="number" step="0.1" min="0" max="100" v-model.number="form.viability" :placeholder="$t('campaign.finish.pctUnit')" />
            </label>
          </div>
        </div>

        <p class="finish-modal__note">{{ $t('campaign.finish.noActualsNote') }}</p>

        <footer class="finish-modal__footer">
          <button class="finish-modal__btn finish-modal__btn--ghost" @click="$emit('close')">{{ $t('campaign.finish.cancelBtn') }}</button>
          <button class="finish-modal__btn finish-modal__btn--primary" @click="confirm">{{ $t('campaign.finish.confirmBtn') }}</button>
        </footer>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'

import { useProductionCampaignStore } from '@/stores/productionCampaignStore'

import { MODULE_ID } from '@/types/campaign'

const NO_VALUE = '—'

export default defineComponent({
  name: 'FinishCampaignModal',
  emits: ['close'],
  data() {
    return {
      form: { titer: null as number | null, yieldPct: null as number | null, viability: null as number | null },
    }
  },
  computed: {
    ...mapStores(useProductionCampaignStore),

    activeCampaign() {
      return this.productionCampaignStore.activeCampaign
    },

    predictedTiter(): string {
      const v = this.activeCampaign?.modules[MODULE_ID.CLONE_UPSTREAM].predictedTiterGperL
      return typeof v === 'number' ? v.toFixed(2) : NO_VALUE
    },

    predictedYield(): string {
      const v = this.activeCampaign?.modules[MODULE_ID.DOWNSTREAM].predictedYieldPct
      return typeof v === 'number' ? v.toFixed(1) : NO_VALUE
    },
  },
  methods: {
    confirm() {
      const c = this.activeCampaign
      if (!c) return
      this.productionCampaignStore.recordModuleActuals(c.id, MODULE_ID.CLONE_UPSTREAM, {
        titerGperL:   this.num(this.form.titer),
        viabilityPct: this.num(this.form.viability),
      })
      this.productionCampaignStore.recordModuleActuals(c.id, MODULE_ID.DOWNSTREAM, {
        yieldPct: this.num(this.form.yieldPct),
      })
      this.productionCampaignStore.finishCampaign(c.id)
      this.$emit('close')
    },

    num(v: number | null): number | undefined {
      return typeof v === 'number' && Number.isFinite(v) ? v : undefined
    },
  },
})
</script>

<style lang="scss" scoped>
.finish-modal {
  position: fixed;
  inset: 0;
  z-index: 200;
  @include inline-flex-center;
  padding: 1.5rem;
  background: color-mix(in srgb, black 70%, transparent);

  &__card {
    @include flex-col(1.25rem);
    width: 100%;
    max-width: 34rem;
    padding: 1.75rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
  }

  &__title {
    margin: 0 0 0.35rem;
    font-size: 1.3rem;
    font-weight: 600;
    color: var(--color-text-heading);
  }

  &__subtitle {
    margin: 0;
    font-size: var(--fs-md);
    opacity: var(--op-partial);
    line-height: 1.5;
  }

  &__rows {
    @include flex-col(0.85rem);
  }

  &__row {
    @include flex-col(0.3rem);
    padding: 0.85rem 1rem;
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
  }

  &__row-label {
    @include mono-upper(var(--fs-xs));
    color: var(--color-text-heading);
  }

  &__predicted {
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    color: var(--color-primary);
    opacity: var(--op-dim);
  }

  &__field {
    @include flex-between(0.75rem);
    align-items: center;
  }

  &__field-label {
    font-size: var(--fs-sm);
    opacity: var(--op-partial);
  }

  &__input {
    width: 9rem;
    padding: 0.45rem 0.6rem;
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
    color: var(--color-text);
    background: var(--color-bg);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }
  }

  &__note {
    margin: 0;
    font-size: var(--fs-xs);
    opacity: var(--op-muted);
    line-height: 1.5;
  }

  &__footer {
    @include flex-row(0.75rem);
    justify-content: flex-end;
  }

  &__btn {
    @include mono-upper(var(--fs-sm));
    padding: 0.6rem 1.1rem;
    border-radius: var(--radius);
    cursor: pointer;
    border: 1px solid transparent;
    transition: background var(--tr-fast), border-color var(--tr-fast), color var(--tr-fast);

    &--ghost {
      background: transparent;
      border-color: var(--color-border);
      color: var(--color-text);

      &:hover { border-color: var(--color-primary); color: var(--color-primary); }
    }

    &--primary {
      background: var(--color-primary);
      color: var(--color-bg);

      &:hover { background: color-mix(in srgb, var(--color-primary) 90%, white); }
    }
  }
}
</style>
