<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="ttf">
    <AccordionPanel
      :icon="ICON.DEP"
      :title="$t('ttFields.title')"
      :subtitle="subtitle"
    >
      <div class="ttf__body">

        <div class="ttf__caveat" role="alert">
          <span class="ttf__caveat-icon" aria-hidden="true">{{ ICON.WARNING }}</span>
          <p class="ttf__caveat-text">
            <strong class="ttf__caveat-lead">{{ $t('ttFields.caveatLead') }}</strong>{{ $t('ttFields.caveatBody') }}
          </p>
        </div>

        <div class="ttf__row">
          <span class="ttf__row-label">{{ $t('ttFields.modeLabel') }}</span>
          <label class="ttf__toggle">
            <input
              type="checkbox"
              :checked="cellStore.ttfModeEnabled"
              @change="cellStore.setTtfModeEnabled(($event.target as HTMLInputElement).checked)"
            />
            <span class="ttf__toggle-text">{{ cellStore.ttfModeEnabled ? $t('ttFields.modeOn') : $t('ttFields.modeOff') }}</span>
          </label>
        </div>

        <fieldset class="ttf__inputs" :disabled="!cellStore.ttfModeEnabled">
          <div class="ttf__grid">
            <label class="ttf__label">{{ $t('ttFields.freqLabel') }}</label>
            <input
              class="ttf__input"
              type="number"
              :min="freqMin"
              :max="freqMax"
              step="10"
              :value="cellStore.ttfFreqKHz"
              @input="onFreq"
            />
            <span class="ttf__unit">kHz</span>

            <label class="ttf__label">{{ $t('ttFields.fieldLabel') }}</label>
            <input
              class="ttf__input"
              type="number"
              :min="fieldMin"
              :max="fieldMax"
              step="0.1"
              :value="cellStore.ttfFieldVcm"
              @input="onField"
            />
            <span class="ttf__unit">V/cm</span>

            <label class="ttf__label">{{ $t('ttFields.durationLabel') }}</label>
            <input
              class="ttf__input"
              type="number"
              :min="durMin"
              :max="durMax"
              step="1"
              :value="cellStore.ttfDurationHr"
              @input="onDuration"
            />
            <span class="ttf__unit">hr</span>
          </div>
        </fieldset>

        <p class="ttf__threshold" :class="thresholdClass">
          <span class="ttf__threshold-icon" aria-hidden="true">{{ thresholdIcon }}</span>
          {{ thresholdMessage }}
        </p>

        <div class="ttf__readouts">
          <span class="ttf__readouts-col-header ttf__readouts-col-header--target">{{ $t('ttFields.colHeaderTarget') }}</span>
          <span class="ttf__readouts-col-header ttf__readouts-col-header--ref">{{ $t('ttFields.colHeaderRef') }}</span>
          <StatCard
            :label="$t('ttFields.reKLabelT')"
            :value="formatRek(cellStore.ttfTargetReK)"
            :sub="reKSign(cellStore.ttfTargetReK)"
            :variant="reKVariant(cellStore.ttfTargetReK)"
            :tooltip="$t('ttFields.reKTip')"
          />
          <StatCard
            :label="$t('ttFields.reKLabelH')"
            :value="formatRek(cellStore.ttfHealthyReK)"
            :sub="reKSign(cellStore.ttfHealthyReK)"
            :variant="reKVariant(cellStore.ttfHealthyReK)"
            :tooltip="$t('ttFields.reKTip')"
          />
          <StatCard
            :label="$t('ttFields.depLabelT')"
            :value="formatPN(cellStore.ttfTargetForceN)"
            :sub="$t('ttFields.forceLabel')"
            variant="info"
            :tooltip="$t('ttFields.forceTip')"
          />
          <StatCard
            :label="$t('ttFields.depLabelH')"
            :value="formatPN(cellStore.ttfHealthyForceN)"
            :sub="$t('ttFields.forceLabel')"
            variant="info"
            :tooltip="$t('ttFields.forceTip')"
          />
          <StatCard
            :label="$t('ttFields.meiLabelT')"
            :value="formatIndex(cellStore.ttfTargetIndex)"
            :sub="$t('ttFields.indexSub')"
            :variant="indexVariant(cellStore.ttfTargetIndex)"
            :tooltip="$t('ttFields.indexTip')"
          />
          <StatCard
            :label="$t('ttFields.meiLabelH')"
            :value="formatIndex(cellStore.ttfHealthyIndex)"
            :sub="$t('ttFields.indexSub')"
            :variant="indexVariant(cellStore.ttfHealthyIndex)"
            :tooltip="$t('ttFields.indexTip')"
          />
        </div>

        <p class="ttf__hint">{{ $t('ttFields.hint') }}</p>
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
  TTF_FREQ_MIN_KHZ,
  TTF_FREQ_MAX_KHZ,
  TTF_FIELD_MIN_VCM,
  TTF_FIELD_MAX_VCM,
  TTF_DURATION_MIN_HR,
  TTF_DURATION_MAX_HR,
} from '@/constants/physics'

export default defineComponent({
  name: 'TtFieldsPanel',

  components: { AccordionPanel, StatCard },

  computed: {
    ICON() { return ICON },
    ...mapStores(useCellStore),

    freqMin():  number { return TTF_FREQ_MIN_KHZ },
    freqMax():  number { return TTF_FREQ_MAX_KHZ },
    fieldMin(): number { return TTF_FIELD_MIN_VCM },
    fieldMax(): number { return TTF_FIELD_MAX_VCM },
    durMin():   number { return TTF_DURATION_MIN_HR },
    durMax():   number { return TTF_DURATION_MAX_HR },

    subtitle(): string {
      if (!this.cellStore.ttfModeEnabled) return this.$t('ttFields.subtitleOff')
      const tIdx = this.formatIndex(this.cellStore.ttfTargetIndex)
      const hIdx = this.formatIndex(this.cellStore.ttfHealthyIndex)
      return this.$t('ttFields.subtitleOn', { tIdx, hIdx })
    },

    thresholdMessage(): string {
      return this.cellStore.ttfIsSubThreshold
        ? this.$t('ttFields.subThresholdOk')
        : this.$t('ttFields.subThresholdWarn')
    },

    thresholdClass(): string {
      return this.cellStore.ttfIsSubThreshold ? 'ttf__threshold--ok' : 'ttf__threshold--warn'
    },

    thresholdIcon(): string {
      return this.cellStore.ttfIsSubThreshold ? ICON.CHECK : ICON.WARNING
    },
  },

  methods: {
    formatRek(v: number):   string { return v.toFixed(3) },
    formatPN(v: number):    string { return `${(v * 1e12).toFixed(2)} pN` },
    formatIndex(v: number): string { return v.toFixed(2) },
    reKSign(v: number):     string { return v >= 0 ? '+ pos. DEP' : '− neg. DEP' },

    reKVariant(v: number): string {
      const a = Math.abs(v)
      if (a >= 0.20) return 'good'
      if (a >= 0.05) return 'warn'
      return 'danger'
    },

    indexVariant(v: number): string {
      if (v >= 1.0)  return 'good'
      if (v >= 0.25) return 'warn'
      return 'danger'
    },

    onFreq(e: Event):     void { this.cellStore.setTtfFreqKHz(Number((e.target as HTMLInputElement).value)) },
    onField(e: Event):    void { this.cellStore.setTtfFieldVcm(Number((e.target as HTMLInputElement).value)) },
    onDuration(e: Event): void { this.cellStore.setTtfDurationHr(Number((e.target as HTMLInputElement).value)) },
  },
})
</script>

<style lang="scss" scoped>
.ttf {
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

  &__threshold {
    @include flex-row(0.45rem);
    align-items: flex-start;
    margin: 0;
    padding: 0.45rem 0.65rem;
    border-radius: var(--radius);
    font-size: var(--fs-xs);
    line-height: 1.45;

    &--ok   { @include color-variant(success, 35%, 7%); }
    &--warn { @include color-variant(danger,  40%, 8%); }
  }

  &__threshold-icon { margin-top: 0.05rem; flex-shrink: 0; }

  &__readouts {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.35rem 0.55rem;
  }

  &__readouts-col-header {
    @include mono-upper(var(--fs-xxs), 0.08em);
    color: var(--color-text-muted);
    padding: 0 0.25rem 0.1rem;

    &--target { color: var(--color-danger); opacity: var(--op-partial); }
    &--ref    { color: var(--color-primary); opacity: var(--op-partial); }
  }

  &__hint {
    margin: 0;
    font-size: var(--fs-xs);
    color: var(--color-text-muted);
    line-height: 1.5;
  }
}
</style>
