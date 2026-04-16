<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="upgrade-modal__overlay" @click.self="$emit('close')">
    <div class="upgrade-modal">

      <div class="upgrade-modal__header">
        <div class="upgrade-modal__header-text">
          <h2 class="upgrade-modal__title">{{ $t('upgrade.modalTitle') }}</h2>
          <p class="upgrade-modal__subtitle">{{ $t('upgrade.modalSubtitle') }}</p>
        </div>
        <button class="upgrade-modal__close" @click="$emit('close')">{{ ICON.CLOSE }}</button>
      </div>

      <div v-if="isExhausted" class="upgrade-modal__alert upgrade-modal__alert--danger">
        {{ $t('upgrade.tokenExhaustedWarning') }}
      </div>
      <div v-else-if="isLow" class="upgrade-modal__alert upgrade-modal__alert--warn">
        {{ $t('upgrade.tokenLowWarning') }}
      </div>

      <div class="upgrade-modal__balance-bar">
        <span class="upgrade-modal__balance-label">
          {{ $t('upgrade.currentPlanLabel') }}: <strong>{{ planLabel }}</strong>
        </span>
        <span class="upgrade-modal__balance-label">
          {{ $t('upgrade.balanceLabel') }}: <strong>{{ tokenStore.balance }} / {{ tokenStore.quota }}</strong>
        </span>
        <span class="upgrade-modal__balance-label">
          {{ $t('upgrade.resetsLabel') }}: <strong>{{ tokenStore.resetDateLabel }}</strong>
        </span>
      </div>

      <div class="upgrade-modal__plans">
        <div
          v-for="plan in PLANS"
          :key="plan.id"
          class="upgrade-modal__plan"
          :class="{
            'upgrade-modal__plan--current': plan.id === tokenStore.plan,
            'upgrade-modal__plan--featured': plan.id === 'pro',
          }"
        >
          <div v-if="plan.id === 'pro'" class="upgrade-modal__plan-badge">Popular</div>
          <div class="upgrade-modal__plan-name">{{ $t(plan.nameKey) }}</div>
          <div class="upgrade-modal__plan-price">{{ $t(plan.priceKey) }}</div>
          <div class="upgrade-modal__plan-quota">{{ $t(plan.quotaKey) }}</div>
          <div v-if="plan.seatsKey" class="upgrade-modal__plan-seats">{{ $t(plan.seatsKey) }}</div>
          <button
            class="upgrade-modal__plan-cta"
            :class="{
              'upgrade-modal__plan-cta--current': plan.id === tokenStore.plan,
              'upgrade-modal__plan-cta--contact': plan.id === 'enterprise',
            }"
            :disabled="plan.id === tokenStore.plan"
            @click="handleCta(plan.id)"
          >
            {{ plan.id === tokenStore.plan ? $t('upgrade.ctaFree') : $t(plan.ctaKey) }}
          </button>
        </div>
      </div>

      <div class="upgrade-modal__pricing-link">
        <RouterLink :to="ROUTE.PRICING" class="upgrade-modal__pricing-anchor" @click="$emit('close')">
          {{ $t('upgrade.viewFullPricing') }} →
        </RouterLink>
      </div>

      <div class="upgrade-modal__costs">
        <div class="upgrade-modal__costs-title">Token costs per operation</div>
        <div class="upgrade-modal__costs-grid">
          <div v-for="row in COST_ROWS" :key="row.labelKey" class="upgrade-modal__cost-row">
            <span class="upgrade-modal__cost-label">{{ $t(row.labelKey) }}</span>
            <span class="upgrade-modal__cost-value">{{ row.cost }} {{ row.cost === 1 ? 'token' : 'tokens' }}</span>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'

import { useTokenStore } from '@/stores/tokenStore'

import { ROUTE } from '@/constants/routes'
import { ICON } from '@/constants/icons'
import { PLAN_LABEL } from '@/types/token'
import type { TokenPlan } from '@/types/token'

const PLANS = [
  { id: 'free',       nameKey: 'upgrade.planFree',       priceKey: 'upgrade.priceFree',       quotaKey: 'upgrade.quotaFree',       seatsKey: null,                  ctaKey: 'upgrade.ctaFree'       },
  { id: 'pro',        nameKey: 'upgrade.planPro',        priceKey: 'upgrade.pricePro',        quotaKey: 'upgrade.quotaPro',        seatsKey: null,                  ctaKey: 'upgrade.ctaPro'        },
  { id: 'team',       nameKey: 'upgrade.planTeam',       priceKey: 'upgrade.priceTeam',       quotaKey: 'upgrade.quotaTeam',       seatsKey: 'upgrade.seatsTeam',   ctaKey: 'upgrade.ctaTeam'       },
  { id: 'enterprise', nameKey: 'upgrade.planEnterprise', priceKey: 'upgrade.priceEnterprise', quotaKey: 'upgrade.quotaEnterprise', seatsKey: 'upgrade.seatsEnterprise', ctaKey: 'upgrade.ctaEnterprise' },
]

const COST_ROWS = [
  { labelKey: 'upgrade.featuresCellCard',  cost: 1  },
  { labelKey: 'upgrade.featuresSweep',     cost: 12 },
  { labelKey: 'upgrade.featuresImpedance', cost: 25 },
  { labelKey: 'upgrade.featuresReport',    cost: 15 },
  { labelKey: 'upgrade.featuresAcoustic',  cost: 40 },
  { labelKey: 'upgrade.featuresHeatmap',   cost: 8  },
  { labelKey: 'upgrade.featuresAi',        cost: 5  },
]

export default defineComponent({
  name: 'UpgradeModal',

  emits: ['close'],

  computed: {
    ...mapStores(useTokenStore),

    ICON()  { return ICON  },
    ROUTE() { return ROUTE },
    PLANS() { return PLANS },
    COST_ROWS() { return COST_ROWS },

    planLabel(): string {
      return PLAN_LABEL[this.tokenStore.plan as TokenPlan] ?? this.tokenStore.plan
    },

    isExhausted(): boolean {
      return this.tokenStore.isExhausted
    },

    isLow(): boolean {
      return this.tokenStore.isLowBalance && !this.tokenStore.isExhausted
    },
  },

  methods: {
    handleCta(planId: string): void {
      if (planId === 'enterprise') {
        window.open(`mailto:${this.$t('upgrade.ctaContact')}?subject=ResoPulse Enterprise Inquiry`, '_blank')
        return
      }
      // TODO: open Stripe checkout for pro/team plans when billing is wired up.
      // For now, open contact email as the upgrade path.
      window.open(`mailto:${this.$t('upgrade.ctaContact')}?subject=ResoPulse ${planId} Upgrade`, '_blank')
    },
  },
})
</script>

<style lang="scss" scoped>
.upgrade-modal {
  &__overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    z-index: 500;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }

  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  width: 100%;
  max-width: 780px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 1.75rem;
  @include flex-col(1.25rem);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.5);

  &__header {
    @include flex-between();

    &-text { @include flex-col(0.25rem); }
  }

  &__title {
    font-size: var(--fs-xl);
    font-weight: 700;
    color: var(--color-text-heading);
    margin: 0;
  }

  &__subtitle {
    font-size: var(--fs-md);
    color: var(--color-text-muted);
    margin: 0;
  }

  &__close {
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    color: var(--color-text-muted);
    cursor: pointer;
    font-size: var(--fs-md);
    padding: 0.3rem 0.5rem;
    flex-shrink: 0;
    transition: border-color var(--tr-fast), color var(--tr-fast);

    &:hover { border-color: var(--color-text-muted); color: var(--color-text); }
  }

  &__alert {
    @include mono-upper(var(--fs-xxs), 0.05em);
    padding: 0.6rem 0.9rem;
    border-radius: var(--radius);
    border: 1px solid;

    &--danger {
      color: var(--color-amber);
      background: color-mix(in srgb, var(--color-amber) 8%, transparent);
      border-color: color-mix(in srgb, var(--color-amber) 30%, transparent);
    }

    &--warn {
      color: color-mix(in srgb, var(--color-amber) 75%, var(--color-text));
      background: color-mix(in srgb, var(--color-amber) 6%, transparent);
      border-color: color-mix(in srgb, var(--color-amber) 20%, transparent);
    }
  }

  &__balance-bar {
    @include flex-row(1.5rem);
    flex-wrap: wrap;
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    padding: 0.6rem 1rem;
  }

  &__balance-label {
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    color: var(--color-text-muted);

    strong { color: var(--color-text); font-weight: 600; }
  }

  &__plans {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
    gap: 0.75rem;

    @media (max-width: 600px) { grid-template-columns: 1fr 1fr; }
    @media (max-width: 400px) { grid-template-columns: 1fr; }
  }

  &__plan {
    position: relative;
    @include flex-col(0.5rem);
    @include surface-card(var(--radius), 1rem);
    border: 1px solid var(--color-border);
    transition: border-color var(--tr-normal);

    &:hover { border-color: var(--color-primary-border); }

    &--current {
      border-color: var(--color-primary-border);
      background: color-mix(in srgb, var(--color-primary) 5%, var(--color-surface));
    }

    &--featured {
      border-color: var(--color-primary-border);
      box-shadow: 0 0 0 1px var(--color-primary-border);
    }
  }

  &__plan-badge {
    position: absolute;
    top: -10px;
    left: 50%;
    transform: translateX(-50%);
    @include badge-pill(0.1rem 0.55rem, 10px);
    background: var(--color-primary);
    color: var(--color-bg);
    border-color: var(--color-primary);
    font-size: 0.55rem;
    white-space: nowrap;
  }

  &__plan-name {
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--color-text-heading);
  }

  &__plan-price {
    font-size: var(--fs-lg);
    font-weight: 700;
    color: var(--color-primary);
  }

  &__plan-quota {
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
  }

  &__plan-seats {
    font-size: var(--fs-xxs);
    color: var(--color-text-muted);
    opacity: var(--op-dim);
  }

  &__plan-cta {
    @include mono-upper(var(--fs-xxs), 0.06em);
    padding: 0.4rem 0.6rem;
    border-radius: var(--radius);
    border: 1px solid var(--color-primary-border);
    background: var(--color-primary-surface);
    color: var(--color-primary);
    cursor: pointer;
    transition: background var(--tr-fast), box-shadow var(--tr-fast);
    white-space: nowrap;
    margin-top: 0.25rem;

    &:hover:not(:disabled) {
      background: var(--color-primary-dim);
      box-shadow: var(--glow-sm);
    }

    &--current {
      background: transparent;
      border-color: var(--color-border);
      color: var(--color-text-muted);
      cursor: default;
    }

    &--contact {
      border-color: var(--color-border);
      background: transparent;
      color: var(--color-text-muted);

      &:hover { border-color: var(--color-primary-border); color: var(--color-primary); background: var(--color-primary-surface); }
    }

    &:disabled { opacity: var(--op-dim); cursor: default; }
  }

  &__pricing-link {
    text-align: right;
    margin-top: -0.25rem;
  }

  &__pricing-anchor {
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    color: var(--color-primary);
    text-decoration: none;
    opacity: var(--op-dim);
    transition: opacity var(--tr-fast);

    &:hover { opacity: 1; text-decoration: underline; }
  }

  &__costs {
    @include flex-col(0.6rem);
    border-top: 1px solid var(--color-border);
    padding-top: 1rem;
  }

  &__costs-title {
    @include section-title();
  }

  &__costs-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 0.35rem 1.5rem;
  }

  &__cost-row {
    @include flex-between();
    padding: 0.2rem 0;
    border-bottom: 1px solid color-mix(in srgb, var(--color-border) 50%, transparent);

    &:last-child { border-bottom: none; }
  }

  &__cost-label {
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
  }

  &__cost-value {
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    color: var(--color-primary);
    white-space: nowrap;
  }
}
</style>
