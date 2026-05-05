<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="ferm">
    <AccordionPanel
      :icon="ICON.FLASK"
      :title="$t('fermenter.title')"
      :subtitle="subtitle"
    >
      <div class="ferm__body">

        <div class="ferm__caveat" role="alert">
          <span class="ferm__caveat-icon" aria-hidden="true">{{ ICON.WARNING }}</span>
          <p class="ferm__caveat-text">
            <strong class="ferm__caveat-lead">{{ $t('fermenter.caveatLead') }}</strong>{{ $t('fermenter.caveatBody') }}
          </p>
        </div>

        <div class="ferm__row">
          <span class="ferm__row-label">{{ $t('fermenter.modeLabel') }}</span>
          <label class="ferm__toggle">
            <input
              type="checkbox"
              :checked="cellStore.fermenterModeEnabled"
              @change="cellStore.setFermenterModeEnabled(($event.target as HTMLInputElement).checked)"
            />
            <span class="ferm__toggle-text">{{ cellStore.fermenterModeEnabled ? $t('fermenter.modeOn') : $t('fermenter.modeOff') }}</span>
          </label>
        </div>

        <fieldset class="ferm__inputs" :disabled="!cellStore.fermenterModeEnabled">
          <div class="ferm__grid">
            <label class="ferm__label">{{ $t('fermenter.volumeLabel') }}</label>
            <input
              class="ferm__input"
              type="number"
              min="1"
              max="100000"
              step="10"
              :value="cellStore.fermenterVolumeMl"
              @input="onVolumeInput"
            />
            <span class="ferm__unit">mL</span>

            <label class="ferm__label">{{ $t('fermenter.mixingLabel') }}</label>
            <input
              class="ferm__input"
              type="number"
              min="50"
              max="1500"
              step="10"
              :value="cellStore.fermenterMixingRpm"
              @input="onMixingInput"
            />
            <span class="ferm__unit">rpm</span>

            <label class="ferm__label">{{ $t('fermenter.durationLabel') }}</label>
            <input
              class="ferm__input"
              type="number"
              min="1"
              max="3600"
              step="5"
              :value="cellStore.fermenterDurationS"
              @input="onDurationInput"
            />
            <span class="ferm__unit">s</span>
          </div>
        </fieldset>

        <div class="ferm__readouts">
          <StatCard
            :label="$t('fermenter.activeFractionLabel')"
            :value="formatPct(cellStore.fermenterActiveFraction)"
            :sub="$t('fermenter.activeFractionSub')"
            :variant="activeVariant"
            :tooltip="$t('fermenter.activeFractionTip')"
          />
          <StatCard
            :label="$t('fermenter.exposureLabel')"
            :value="formatPct(cellStore.fermenterExposureProbability)"
            :sub="exposureSub"
            :variant="exposureVariant"
            :tooltip="$t('fermenter.exposureTip')"
          />
          <StatCard
            :label="$t('fermenter.effectiveTargetDrLabel')"
            :value="formatPct(cellStore.fermenterEffectiveTargetDR)"
            :sub="$t('fermenter.effectiveTargetDrSub', { raw: rawTargetDrPct })"
            variant="info"
            :tooltip="$t('fermenter.effectiveTargetDrTip')"
          />
        </div>

        <p class="ferm__hint">{{ $t('fermenter.hint') }}</p>
      </div>
    </AccordionPanel>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'

import { useCellStore } from '@/stores/cellStore'

import AccordionPanel from '@/components/AccordionPanel/index.vue'
import StatCard from '@/components/StatCard/index.vue'

import { ICON } from '@/constants/icons'

export default defineComponent({
  name: 'FermenterPanel',

  components: { AccordionPanel, StatCard },

  computed: {
    ICON() { return ICON },
    ...mapStores(useCellStore),

    subtitle(): string {
      if (!this.cellStore.fermenterModeEnabled) return this.$t('fermenter.subtitleOff')
      const pct = (this.cellStore.fermenterExposureProbability * 100).toFixed(0)
      return this.$t('fermenter.subtitleOn', { pct })
    },

    rawTargetDrPct(): string {
      return (this.cellStore.targetDisruptionRatio * 100).toFixed(0)
    },

    activeVariant(): string {
      const f = this.cellStore.fermenterActiveFraction
      if (f >= 0.5)  return 'good'    // small / bench scale — most of volume sees field
      if (f >= 0.05) return 'warn'    // pilot scale — partial coverage
      return 'danger'                  // scale-up regime — small electrode-zone fraction
    },

    exposureVariant(): string {
      const p = this.cellStore.fermenterExposureProbability
      if (p >= 0.85) return 'good'
      if (p >= 0.50) return 'warn'
      return 'danger'
    },

    exposureSub(): string {
      const p = this.cellStore.fermenterExposureProbability
      if (p < 0.5)  return this.$t('fermenter.exposureSubLow')
      if (p < 0.85) return this.$t('fermenter.exposureSubMid')
      return this.$t('fermenter.exposureSubHigh')
    },
  },

  methods: {
    formatPct(v: number): string { return `${(v * 100).toFixed(0)}%` },
    onVolumeInput(e: Event):   void { this.cellStore.setFermenterVolumeMl(Number((e.target as HTMLInputElement).value)) },
    onMixingInput(e: Event):   void { this.cellStore.setFermenterMixingRpm(Number((e.target as HTMLInputElement).value)) },
    onDurationInput(e: Event): void { this.cellStore.setFermenterDurationS(Number((e.target as HTMLInputElement).value)) },
  },
})
</script>

<style lang="scss" scoped>
.ferm {
  @include surface-card(var(--radius-lg));
  overflow: hidden;

  &__body {
    @include flex-col(0.85rem);
    padding: 0.85rem 1rem 1rem;
    border-top: 1px solid var(--color-border);
  }

  &__caveat {
    @include flex-row(0.55rem);
    align-items: flex-start;
    padding: 0.55rem 0.7rem;
    @include color-variant(amber, 40%, 8%);
    border-radius: var(--radius);
  }

  &__caveat-icon { font-size: var(--fs-md); margin-top: 0.05rem; flex-shrink: 0; }

  &__caveat-text {
    margin: 0;
    font-size: var(--fs-xs);
    line-height: 1.5;
  }

  &__caveat-lead {
    display: block;
    font-size: var(--fs-sm);
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  &__row {
    @include flex-row(0.7rem);
    align-items: center;
  }

  &__row-label {
    @include mono-upper(var(--fs-xxs), 0.06em);
    color: var(--color-text-muted);
  }

  &__toggle { @include panel-toggle(); }

  &__inputs {
    border: none;
    padding: 0;
    margin: 0;

    &:disabled { opacity: var(--op-muted); }
  }

  &__grid {
    display: grid;
    grid-template-columns: minmax(140px, 1fr) auto auto;
    gap: 0.4rem 0.6rem;
    align-items: center;
  }

  &__label {
    @include mono-upper(var(--fs-xxs), 0.05em);
    color: var(--color-text-muted);
  }

  &__input {
    width: 8rem;
    padding: 0.3rem 0.5rem;
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    color: var(--color-text);
    background: color-mix(in srgb, var(--color-text) 5%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-text) 18%, transparent);
    border-radius: var(--radius);
    outline: none;

    &:focus { border-color: var(--color-primary); }
  }

  &__unit {
    @include mono-upper(var(--fs-xxs), 0.04em);
    color: var(--color-text-muted);
  }

  &__readouts {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.55rem;

    @media (min-width: 720px) { grid-template-columns: repeat(3, 1fr); }
  }

  &__hint {
    margin: 0;
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
    line-height: 1.5;
  }
}
</style>
