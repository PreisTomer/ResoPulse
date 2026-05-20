<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="switcher-overlay" @click.self="$emit('close')">
    <div class="switcher" role="dialog" aria-labelledby="switcher-title">
      <header class="switcher__header">
        <h3 id="switcher-title" class="switcher__title">{{ $t('campaign.switcher.title') }}</h3>
        <button class="switcher__close" :aria-label="$t('campaign.wizard.cancel')" @click="$emit('close')">{{ ICON.CLOSE }}</button>
      </header>

      <div class="switcher__body">
        <section v-if="recentCampaigns.length > 0" class="switcher__section">
          <span class="switcher__section-label">{{ $t('campaign.switcher.recent') }}</span>
          <ul class="switcher__list">
            <li v-for="c in recentCampaigns" :key="c.id" class="switcher__item">
              <button
                class="switcher__campaign-btn"
                :class="{ 'switcher__campaign-btn--active': c.id === productionCampaignStore.activeCampaignId }"
                @click="selectCampaign(c.id)"
              >
                <span class="switcher__molecule" :data-category="categoryFor(c.moleculeType)">{{ moleculeShortLabelFor(c.moleculeType) }}</span>
                <span class="switcher__name">{{ c.name }}</span>
                <span v-if="c.id === productionCampaignStore.activeCampaignId" class="switcher__active-mark">{{ ICON.CHECK }}</span>
              </button>
            </li>
          </ul>
        </section>

        <p v-else class="switcher__empty">{{ $t('campaign.switcher.noCampaigns') }}</p>
      </div>

      <footer class="switcher__footer">
        <button class="switcher__action switcher__action--secondary" @click="goToAll">
          {{ ICON.FOLDER }} {{ $t('campaign.switcher.viewAll') }}
        </button>
        <button class="switcher__action switcher__action--primary" @click="openWizard">
          + {{ $t('campaign.switcher.newCampaign') }}
        </button>
      </footer>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'

import { ROUTE } from '@/constants/routes'
import { ICON } from '@/constants/icons'
import { MOLECULE_TYPE_META, type MoleculeType } from '@/constants/moleculeTypes'

import { useProductionCampaignStore } from '@/stores/productionCampaignStore'

const RECENT_LIMIT = 5

export default defineComponent({
  name: 'CampaignSwitcher',
  emits: ['close', 'openWizard'],
  computed: {
    ...mapStores(useProductionCampaignStore),
    ICON() { return ICON },

    recentCampaigns() {
      const store = useProductionCampaignStore()
      return store.sortedCampaigns.slice(0, RECENT_LIMIT)
    },
  },
  methods: {
    moleculeShortLabelFor(type: MoleculeType): string {
      return MOLECULE_TYPE_META[type].shortLabel
    },
    categoryFor(type: MoleculeType): string {
      return MOLECULE_TYPE_META[type].category
    },
    selectCampaign(id: string) {
      const store = useProductionCampaignStore()
      store.setActive(id)
      this.$emit('close')
      // If user is on a generic route, no navigation; otherwise stay where they are.
    },
    goToAll() {
      this.$emit('close')
      this.$router.push(ROUTE.CAMPAIGNS)
    },
    openWizard() {
      this.$emit('close')
      this.$emit('openWizard')
    },
  },
})
</script>

<style lang="scss" scoped>
.switcher-overlay {
  position: fixed;
  inset: 0;
  background: color-mix(in srgb, black 50%, transparent);
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 80px;
  z-index: 150;
  animation: switcherFade 160ms ease-out;
}

.switcher {
  width: 100%;
  max-width: 460px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: 0 20px 48px color-mix(in srgb, black 50%, transparent);
  display: flex;
  flex-direction: column;
  max-height: 70vh;
  animation: switcherLift 200ms ease-out;

  &__header {
    @include flex-between();
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--color-border);
  }

  &__title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
  }

  &__close {
    background: transparent;
    border: none;
    color: var(--color-text-muted);
    font-size: 1.1rem;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    border-radius: var(--radius);

    &:hover { background: color-mix(in srgb, var(--color-text) 6%, transparent); color: var(--color-text); }
  }

  &__body {
    padding: 0.75rem;
    overflow-y: auto;
    flex: 1;
    min-height: 60px;
  }

  &__section {
    @include flex-col(0.4rem);
  }

  &__section-label {
    @include mono-upper(var(--fs-xxs));
    opacity: var(--op-muted);
    padding: 0 0.5rem;
  }

  &__list {
    list-style: none;
    margin: 0;
    padding: 0;
    @include flex-col(0.2rem);
  }

  &__campaign-btn {
    @include flex-row(0.6rem);
    width: 100%;
    padding: 0.5rem 0.6rem;
    background: transparent;
    border: 1px solid transparent;
    border-radius: var(--radius);
    cursor: pointer;
    text-align: left;
    color: var(--color-text);
    transition: background var(--tr-fast), border-color var(--tr-fast);

    &:hover {
      background: color-mix(in srgb, var(--color-primary) 6%, transparent);
    }

    &--active {
      background: color-mix(in srgb, var(--color-primary) 12%, transparent);
      border-color: color-mix(in srgb, var(--color-primary) 30%, transparent);
    }
  }

  &__molecule {
    @include mono-upper(var(--fs-xxs));
    padding: 0.15rem 0.5rem;
    border-radius: 999px;
    background: color-mix(in srgb, var(--color-primary) 18%, transparent);
    color: var(--color-primary);
    flex-shrink: 0;

    &[data-category="antibody"]     { background: color-mix(in srgb, var(--color-primary) 18%, transparent); color: var(--color-primary); }
    &[data-category="protein"]      { background: color-mix(in srgb, var(--color-amber) 18%, transparent);   color: var(--color-amber); }
    &[data-category="viral-vector"] { background: color-mix(in srgb, var(--color-danger) 18%, transparent);  color: var(--color-danger); }
    &[data-category="nucleic-acid"] { background: color-mix(in srgb, var(--color-ok) 18%, transparent); color: var(--color-ok); }
    &[data-category="antigen"]      { background: color-mix(in srgb, var(--color-primary) 18%, transparent); color: var(--color-primary); }
  }

  &__name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: var(--fs-md);
  }

  &__active-mark {
    color: var(--color-primary);
    font-size: var(--fs-sm);
  }

  &__empty {
    text-align: center;
    padding: 1.5rem 1rem;
    opacity: var(--op-muted);
    font-size: var(--fs-md);
    margin: 0;
  }

  &__footer {
    @include flex-between();
    padding: 0.75rem;
    border-top: 1px solid var(--color-border);
    gap: 0.5rem;
  }

  &__action {
    flex: 1;
    @include mono-upper(var(--fs-xs));
    padding: 0.55rem 0.8rem;
    border-radius: var(--radius);
    cursor: pointer;
    border: 1px solid transparent;
    transition: background var(--tr-fast), border-color var(--tr-fast);

    &--secondary {
      background: transparent;
      border-color: var(--color-border);
      color: var(--color-text);

      &:hover { background: color-mix(in srgb, var(--color-text) 6%, transparent); }
    }

    &--primary {
      background: var(--color-primary);
      color: var(--color-bg);

      &:hover { background: color-mix(in srgb, var(--color-primary) 90%, white); }
    }
  }
}

@keyframes switcherFade {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes switcherLift {
  from { opacity: 0; transform: translateY(-10px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
</style>
