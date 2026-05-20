<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="instrument-hub">
    <header class="instrument-hub__header">
      <h1 class="instrument-hub__title">{{ $t('instrumentHub.viewTitle') }}</h1>
      <p class="instrument-hub__subtitle">{{ $t('instrumentHub.viewSubtitle') }}</p>
    </header>

    <div class="instrument-hub__grid">
      <article v-for="inst in instruments" :key="inst.id" class="instrument-hub__card" :class="{ 'instrument-hub__card--soon': inst.comingSoon }">
        <div class="instrument-hub__card-icon">{{ inst.icon }}</div>
        <div class="instrument-hub__card-body">
          <header class="instrument-hub__card-header">
            <h3 class="instrument-hub__card-name">{{ $t(inst.nameKey) }}</h3>
            <span class="instrument-hub__status" :data-status="inst.comingSoon ? 'soon' : 'disconnected'">
              {{ inst.comingSoon ? $t('instrumentHub.statusComingSoon') : $t('instrumentHub.statusDisconnected') }}
            </span>
          </header>
          <p class="instrument-hub__card-desc">{{ $t(inst.descKey) }}</p>
          <div class="instrument-hub__card-footer">
            <span class="instrument-hub__feed">{{ $t('instrumentHub.feedsLabel') }}: {{ $t(inst.feedKey) }}</span>
            <button class="instrument-hub__btn" disabled>
              {{ inst.comingSoon ? $t('instrumentHub.notifyBtn') : $t('instrumentHub.connectBtn') }}
            </button>
          </div>
        </div>
      </article>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { ICON } from '@/constants/icons'

interface InstrumentDef {
  id:         string
  icon:       string
  nameKey:    string
  descKey:    string
  feedKey:    string
  comingSoon: boolean
}

export default defineComponent({
  name: 'InstrumentHubView',
  computed: {
    instruments(): InstrumentDef[] {
      return [
        { id: 'pulse',   icon: ICON.LIGHTNING, nameKey: 'instrumentHub.instruments.pulseGenerator', descKey: 'instrumentHub.instruments.pulseGeneratorDesc', feedKey: 'instrumentHub.feedModule1', comingSoon: true },
        { id: 'bioreactor', icon: ICON.FLASK,  nameKey: 'instrumentHub.instruments.bioreactor',     descKey: 'instrumentHub.instruments.bioreactorDesc',     feedKey: 'instrumentHub.feedModule2', comingSoon: true },
        { id: 'chrom',   icon: ICON.ARROW_D,   nameKey: 'instrumentHub.instruments.chromatography', descKey: 'instrumentHub.instruments.chromatographyDesc', feedKey: 'instrumentHub.feedModule3', comingSoon: true },
        { id: 'hplc',    icon: ICON.WAVE,      nameKey: 'instrumentHub.instruments.hplc',           descKey: 'instrumentHub.instruments.hplcDesc',           feedKey: 'instrumentHub.feedQuality', comingSoon: true },
        { id: 'counter', icon: ICON.CELL,      nameKey: 'instrumentHub.instruments.cellCounter',    descKey: 'instrumentHub.instruments.cellCounterDesc',    feedKey: 'instrumentHub.feedModule2', comingSoon: true },
      ]
    },
  },
})
</script>

<style lang="scss" scoped>
.instrument-hub {
  padding: 2rem 2.5rem;
  max-width: 1100px;
  margin: 0 auto;

  @media (max-width: 768px) { padding: 1.25rem 1rem; }

  &__header { margin-bottom: 1.5rem; }
  &__title { margin: 0 0 0.35rem; font-size: 1.6rem; font-weight: 600; color: var(--color-text-heading); }
  &__subtitle { margin: 0; font-size: var(--fs-lg); opacity: var(--op-partial); max-width: 46rem; line-height: 1.5; }

  &__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1rem; }

  &__card {
    @include flex-row(1rem); align-items: flex-start; padding: 1.25rem;
    background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-lg);
    &--soon { opacity: var(--op-strong); }
  }
  &__card-icon {
    @include inline-flex-center; width: 2.75rem; height: 2.75rem; flex-shrink: 0;
    font-size: 1.4rem; border-radius: var(--radius);
    background: color-mix(in srgb, var(--color-primary) 12%, transparent); color: var(--color-primary);
  }
  &__card-body { flex: 1; @include flex-col(0.5rem); min-width: 0; }
  &__card-header { @include flex-between(0.5rem); align-items: baseline; }
  &__card-name { margin: 0; font-size: 1.05rem; font-weight: 600; color: var(--color-text-heading); }
  &__card-desc { margin: 0; font-size: var(--fs-sm); opacity: var(--op-partial); line-height: 1.5; }
  &__card-footer { @include flex-between(0.5rem); align-items: center; margin-top: 0.25rem; }
  &__feed { @include mono-upper(var(--fs-xxs)); opacity: var(--op-muted); }

  &__status {
    @include mono-upper(var(--fs-xxs)); padding: 0.15rem 0.5rem; border-radius: 999px;
    &[data-status="soon"]         { background: color-mix(in srgb, var(--color-primary) 12%, transparent); color: var(--color-primary); }
    &[data-status="disconnected"] { background: color-mix(in srgb, var(--color-text) 10%, transparent); color: var(--color-text-muted); }
  }

  &__btn {
    @include mono-upper(var(--fs-xs)); background: transparent; border: 1px solid var(--color-border);
    color: var(--color-text); padding: 0.4rem 0.8rem; border-radius: var(--radius); cursor: not-allowed; opacity: var(--op-dim);
  }
}
</style>
