<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="vrf">
    <AccordionPanel
      :icon="ICON.VIRUS"
      :title="$t('viralRf.title')"
      :subtitle="subtitle"
    >
      <div class="vrf__body">

        <div class="vrf__caveat" role="alert">
          <span class="vrf__caveat-icon" aria-hidden="true">{{ ICON.WARNING }}</span>
          <p class="vrf__caveat-text">{{ $t('viralRf.caveat') }}</p>
        </div>

        <div class="vrf__row">
          <span class="vrf__row-label">{{ $t('viralRf.modeLabel') }}</span>
          <label class="vrf__toggle">
            <input
              type="checkbox"
              :checked="cellStore.viralRfModeEnabled"
              @change="cellStore.setViralRfModeEnabled(($event.target as HTMLInputElement).checked)"
            />
            <span class="vrf__toggle-text">{{ cellStore.viralRfModeEnabled ? $t('viralRf.modeOn') : $t('viralRf.modeOff') }}</span>
          </label>
        </div>

        <p v-if="isMissingMetadata" class="vrf__missing">
          <span class="vrf__missing-icon" aria-hidden="true">{{ ICON.WARNING }}</span>
          {{ $t('viralRf.presetWarning') }}
        </p>

        <fieldset class="vrf__inputs" :disabled="!isInteractive">
          <div class="vrf__grid">
            <label class="vrf__label">{{ $t('viralRf.freqLabel') }}</label>
            <input
              class="vrf__input"
              type="number"
              :min="freqMin"
              :max="freqMax"
              step="0.1"
              :value="cellStore.viralRfFreqGHz"
              @input="onFreq"
            />
            <span class="vrf__unit">GHz</span>

            <label class="vrf__label">{{ $t('viralRf.fieldLabel') }}</label>
            <input
              class="vrf__input"
              type="number"
              :min="fieldMin"
              :max="fieldMax"
              step="1"
              :value="cellStore.viralRfFieldVcm"
              @input="onField"
            />
            <span class="vrf__unit">V/cm</span>

            <label class="vrf__label">{{ $t('viralRf.durationLabel') }}</label>
            <input
              class="vrf__input"
              type="number"
              :min="durMin"
              :max="durMax"
              step="1"
              :value="cellStore.viralRfDurationS"
              @input="onDuration"
            />
            <span class="vrf__unit">s</span>
          </div>
        </fieldset>

        <p class="vrf__verdict" :class="verdictClass">
          <span class="vrf__verdict-icon" aria-hidden="true">{{ verdictIcon }}</span>
          {{ verdictMessage }}
        </p>

        <div class="vrf__readouts">
          <StatCard
            :label="$t('viralRf.drLabel')"
            :value="formatDr(cellStore.viralRfPredictedDR)"
            :sub="drSub"
            :variant="drVariant"
            :tooltip="$t('viralRf.drTip')"
          />
          <StatCard
            :label="$t('viralRf.sarLabel')"
            :value="formatSar(cellStore.viralRfMediumSAR)"
            :sub="$t('viralRf.sarSub', { limit: publicLimit })"
            :variant="sarVariant"
            :tooltip="$t('viralRf.sarTip')"
          />
          <StatCard
            :label="$t('viralRf.sarMarginLabel')"
            :value="formatMargin(cellStore.viralRfPublicMargin)"
            :sub="$t('viralRf.sarMarginSub')"
            :variant="marginVariant(cellStore.viralRfPublicMargin)"
            :tooltip="$t('viralRf.sarMarginTip')"
          />
          <StatCard
            :label="$t('viralRf.occMarginLabel')"
            :value="formatMargin(cellStore.viralRfOccupationalMargin)"
            :sub="$t('viralRf.occMarginSub')"
            :variant="marginVariant(cellStore.viralRfOccupationalMargin)"
            :tooltip="$t('viralRf.sarMarginTip')"
          />
        </div>

        <p class="vrf__hint">{{ $t('viralRf.hint') }}</p>
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
import {
  VIRAL_RF_FREQ_MIN_GHZ,
  VIRAL_RF_FREQ_MAX_GHZ,
  VIRAL_RF_FIELD_MIN_VCM,
  VIRAL_RF_FIELD_MAX_VCM,
  VIRAL_RF_DURATION_MIN_S,
  VIRAL_RF_DURATION_MAX_S,
  IEEE_PUBLIC_SAR_LIMIT_W_KG,
} from '@/constants/physics'

import type { CellConfig } from '@/types/cell'

export default defineComponent({
  name: 'ViralRfSafetyPanel',

  components: { AccordionPanel, StatCard },

  computed: {
    ICON() { return ICON },
    ...mapStores(useCellStore),

    freqMin():  number { return VIRAL_RF_FREQ_MIN_GHZ },
    freqMax():  number { return VIRAL_RF_FREQ_MAX_GHZ },
    fieldMin(): number { return VIRAL_RF_FIELD_MIN_VCM },
    fieldMax(): number { return VIRAL_RF_FIELD_MAX_VCM },
    durMin():   number { return VIRAL_RF_DURATION_MIN_S },
    durMax():   number { return VIRAL_RF_DURATION_MAX_S },

    publicLimit(): string { return IEEE_PUBLIC_SAR_LIMIT_W_KG.toFixed(1) },

    isMissingMetadata(): boolean {
      return this.cellStore.viralRfModeEnabled && !this.cellStore.viralRfHasResonanceMetadata
    },

    isInteractive(): boolean {
      return this.cellStore.viralRfModeEnabled && this.cellStore.viralRfHasResonanceMetadata
    },

    subtitle(): string {
      if (!this.cellStore.viralRfModeEnabled) return this.$t('viralRf.subtitleOff')
      const dr  = this.formatDr(this.cellStore.viralRfPredictedDR)
      const sar = (this.cellStore.viralRfPublicMargin * 100).toFixed(0)
      return this.$t('viralRf.subtitleOn', { dr, sar })
    },

    drSub(): string {
      if (!this.cellStore.viralRfHasResonanceMetadata) return this.$t('viralRf.drSubMissing')
      const t = this.cellStore.target as CellConfig & { resonantFreqGHz?: number; capsidQ?: number }
      const fres = (t.resonantFreqGHz ?? 0).toFixed(2)
      const q    = (t.capsidQ ?? 0).toFixed(0)
      return this.$t('viralRf.drSub', { fres, q })
    },

    drVariant(): string {
      const dr = this.cellStore.viralRfPredictedDR
      if (dr >= 0.50) return 'danger'
      if (dr >= 0.10) return 'warn'
      return 'good'
    },

    sarVariant(): string {
      const m = this.cellStore.viralRfPublicMargin
      if (m < 0)    return 'danger'
      if (m < 0.50) return 'warn'
      return 'good'
    },

    verdictClass(): string {
      return `vrf__verdict--${this.cellStore.viralRfVerdict}`
    },

    verdictIcon(): string {
      return this.cellStore.viralRfVerdict === 'safe' ? ICON.CHECK : ICON.WARNING
    },

    verdictMessage(): string {
      const v = this.cellStore.viralRfVerdict
      if (v === 'safe')       return this.$t('viralRf.verdictSafe')
      if (v === 'borderline') return this.$t('viralRf.verdictBorderline')
      return this.$t('viralRf.verdictUnsafe')
    },
  },

  methods: {
    formatDr(v: number):     string { return v.toFixed(3) },
    formatSar(v: number):    string { return `${v.toFixed(2)} W/kg` },
    formatMargin(v: number): string {
      const pct = (v * 100).toFixed(0)
      return v >= 0 ? `+${pct}%` : `${pct}%`
    },

    marginVariant(v: number): string {
      if (v < 0)    return 'danger'
      if (v < 0.50) return 'warn'
      return 'good'
    },

    onFreq(e: Event):     void { this.cellStore.setViralRfFreqGHz(Number((e.target as HTMLInputElement).value)) },
    onField(e: Event):    void { this.cellStore.setViralRfFieldVcm(Number((e.target as HTMLInputElement).value)) },
    onDuration(e: Event): void { this.cellStore.setViralRfDurationS(Number((e.target as HTMLInputElement).value)) },
  },
})
</script>

<style lang="scss" scoped>
.vrf {
  &__body {
    @include flex-col(0.85rem);
    padding: 0.85rem 1rem 1rem;
  }

  &__caveat {
    @include flex-row(0.55rem);
    align-items: flex-start;
    padding: 0.55rem 0.7rem;
    @include color-variant(amber, 40%, 8%);
    border-radius: var(--radius);
  }

  &__caveat-icon { font-size: var(--fs-md); margin-top: 0.05rem; }

  &__caveat-text {
    margin: 0;
    font-size: var(--fs-xs);
    line-height: 1.45;
  }

  &__row {
    @include flex-row(0.7rem);
    align-items: center;
  }

  &__row-label {
    @include mono-upper(var(--fs-xxs), 0.06em);
    color: var(--color-text-muted);
  }

  &__toggle {
    @include flex-row(0.4rem);
    align-items: center;
    cursor: pointer;
    color: var(--color-text);
    font-size: var(--fs-xs);

    input[type="checkbox"] { accent-color: var(--color-primary); }
  }

  &__missing {
    @include flex-row(0.45rem);
    align-items: flex-start;
    margin: 0;
    padding: 0.5rem 0.65rem;
    @include color-variant(danger, 40%, 8%);
    border-radius: var(--radius);
    font-size: var(--fs-xs);
    line-height: 1.45;
  }

  &__missing-icon { margin-top: 0.05rem; flex-shrink: 0; }

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

  &__verdict {
    @include flex-row(0.45rem);
    align-items: flex-start;
    margin: 0;
    padding: 0.5rem 0.65rem;
    border-radius: var(--radius);
    font-size: var(--fs-xs);
    line-height: 1.45;

    &--safe       { @include color-variant(success, 35%, 7%); }
    &--borderline { @include color-variant(amber,   40%, 8%); }
    &--unsafe     { @include color-variant(danger,  40%, 8%); }
  }

  &__verdict-icon { margin-top: 0.05rem; flex-shrink: 0; }

  &__readouts {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.55rem;

    @media (min-width: 720px) { grid-template-columns: repeat(2, 1fr); }
  }

  &__hint {
    margin: 0;
    font-size: var(--fs-xxs);
    color: var(--color-text-muted);
    opacity: var(--op-dim);
    line-height: 1.5;
  }
}
</style>
