<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <Transition name="ote">
    <div v-if="isOpen" class="ote" role="dialog" aria-modal="true" @click.self="onClose">
      <div class="ote__panel">

        <div class="ote__header">
          <span class="ote__eyebrow">{{ ICON.FLASK }} {{ $t('exp.opentronsTitle') }}</span>
          <h2 class="ote__subtitle">{{ $t('exp.opentronsSubtitle') }}</h2>
          <p class="ote__hint">{{ $t('exp.opentronsHint') }}</p>
        </div>

        <div class="ote__body">

          <section class="ote__section">
            <h3 class="ote__section-title">{{ $t('exp.opentronsRobotSection') }}</h3>
            <div class="ote__grid">
              <label class="ote__label">{{ $t('exp.opentronsRobotType') }}</label>
              <select class="ote__input" v-model="form.robotType">
                <option value="OT-2">OT-2</option>
                <option value="Flex">Flex</option>
              </select>

              <label class="ote__label">{{ $t('exp.opentronsPipetteName') }}</label>
              <input class="ote__input" type="text" v-model="form.pipetteName" placeholder="p300_single_gen2" />

              <label class="ote__label">{{ $t('exp.opentronsPipetteMount') }}</label>
              <select class="ote__input" v-model="form.pipetteMount">
                <option value="left">left</option>
                <option value="right">right</option>
              </select>
            </div>
          </section>

          <section class="ote__section">
            <h3 class="ote__section-title">{{ $t('exp.opentronsLabwareSection') }}</h3>
            <div class="ote__grid">
              <label class="ote__label">{{ $t('exp.opentronsTipRack') }}</label>
              <input class="ote__input" type="text" v-model="form.tipRackLoadName" placeholder="opentrons_96_tiprack_300ul" />
              <label class="ote__label-narrow">{{ $t('exp.opentronsSlot') }}</label>
              <input class="ote__input ote__input--narrow" type="text" v-model="form.tipRackSlot" placeholder="1" />

              <label class="ote__label">{{ $t('exp.opentronsSourceLabware') }}</label>
              <input class="ote__input" type="text" v-model="form.sourceLoadName" placeholder="opentrons_24_aluminumblock_nest_2ml_screwcap" />
              <label class="ote__label-narrow">{{ $t('exp.opentronsSlot') }}</label>
              <input class="ote__input ote__input--narrow" type="text" v-model="form.sourceSlot" placeholder="2" />

              <label class="ote__label">{{ $t('exp.opentronsSourceWell') }}</label>
              <input class="ote__input ote__input--narrow" type="text" v-model="form.sourceWell" placeholder="A1" />
              <span class="ote__spacer"></span>
              <span class="ote__spacer"></span>

              <label class="ote__label">{{ $t('exp.opentronsDestLabware') }}</label>
              <input class="ote__input" type="text" v-model="form.destLoadName" placeholder="nest_96_wellplate_200ul_flat" />
              <label class="ote__label-narrow">{{ $t('exp.opentronsSlot') }}</label>
              <input class="ote__input ote__input--narrow" type="text" v-model="form.destSlot" placeholder="3" />
            </div>
            <p class="ote__caption">{{ $t('exp.opentronsLabwareCaption') }}</p>
          </section>

          <section class="ote__section">
            <h3 class="ote__section-title">{{ $t('exp.opentronsWetLabSection') }}</h3>
            <div class="ote__grid">
              <label class="ote__label">{{ $t('exp.opentronsCellDensity') }}</label>
              <input class="ote__input" type="number" min="1e3" step="1e5" v-model.number="form.cellDensityCellsPerMl" />

              <label class="ote__label">{{ $t('exp.opentronsVolume') }}</label>
              <input class="ote__input" type="number" min="1" max="500" step="1" v-model.number="form.volumeUlPerWell" />

              <label class="ote__label">{{ $t('exp.opentronsReplicates') }}</label>
              <input class="ote__input" type="number" min="1" max="96" step="1" v-model.number="form.replicateCount" />
            </div>
          </section>

          <section class="ote__section ote__section--summary">
            <h3 class="ote__section-title">{{ $t('exp.opentronsCurrentProtocolSection') }}</h3>
            <div class="ote__protocol">
              <span class="ote__protocol-pill">{{ formatFreq(cellStore.currentBroadcastFrequency) }}</span>
              <span class="ote__protocol-pill">{{ formatField(cellStore.fieldIntensity) }}</span>
              <span class="ote__protocol-pill">{{ cellStore.waveform.toUpperCase() }}</span>
              <span v-if="!isCw" class="ote__protocol-pill">{{ (cellStore.dutyCycle * 100).toFixed(3) }}% DC</span>
              <span v-if="!isCw" class="ote__protocol-pill">{{ cellStore.pulseWidthNs }} ns</span>
              <span v-if="!isCw" class="ote__protocol-pill">N={{ cellStore.lysisNPulses }}</span>
              <span class="ote__protocol-pill ote__protocol-pill--target">{{ cellStore.target.label }}</span>
            </div>
            <p class="ote__caption">{{ $t('exp.opentronsCurrentProtocolHint') }}</p>
          </section>

        </div>

        <div class="ote__footer">
          <button class="ote__btn ote__btn--ghost" @click="onClose" :disabled="busy">{{ $t('exp.opentronsCancel') }}</button>
          <button class="ote__btn" :disabled="busy || !isFormValid" @click="onDownload">
            <span v-if="busy" class="ote__btn-spinner" aria-hidden="true"></span>
            <span v-else>{{ ICON.ARROW_D }}</span>
            {{ $t('exp.opentronsDownload') }}
          </button>
        </div>

      </div>
    </div>
  </Transition>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'

import { useCellStore } from '@/stores/cellStore'
import { useExperimentStore } from '@/stores/experimentStore'

import { formatFreqKHz } from '@/utils/format'

import { ICON } from '@/constants/icons'
import { WAVEFORM } from '@/constants/strings'

import type { OpentronsWetLabParams } from '@/utils/opentronsExport'

function defaultForm(): OpentronsWetLabParams {
  return {
    robotType:       'OT-2',
    pipetteMount:    'right',
    pipetteName:     'p300_single_gen2',
    tipRackLoadName: 'opentrons_96_tiprack_300ul',
    sourceLoadName:  'opentrons_24_aluminumblock_nest_2ml_screwcap',
    destLoadName:    'nest_96_wellplate_200ul_flat',
    tipRackSlot:     '1',
    sourceSlot:      '2',
    destSlot:        '3',
    sourceWell:      'A1',
    cellDensityCellsPerMl: 1e6,
    volumeUlPerWell:       100,
    replicateCount:        8,
  }
}

export default defineComponent({
  name: 'OpentronsExportModal',

  props: {
    isOpen: { type: Boolean, required: true },
  },

  emits: ['close'],

  data() {
    return {
      form: defaultForm(),
      busy: false,
    }
  },

  computed: {
    ICON() { return ICON },
    ...mapStores(useCellStore, useExperimentStore),

    isCw(): boolean { return this.cellStore.waveform === WAVEFORM.CW },

    isFormValid(): boolean {
      const f = this.form
      return f.pipetteName.trim().length > 0
        && f.tipRackLoadName.trim().length > 0
        && f.sourceLoadName.trim().length > 0
        && f.destLoadName.trim().length > 0
        && f.sourceWell.trim().length > 0
        && f.tipRackSlot.trim().length > 0
        && f.sourceSlot.trim().length > 0
        && f.destSlot.trim().length > 0
        && f.cellDensityCellsPerMl > 0
        && f.volumeUlPerWell > 0
        && f.replicateCount >= 1
    },
  },

  methods: {
    formatFreq(khz: number): string { return formatFreqKHz(khz) },
    formatField(vcm: number): string {
      return vcm >= 10000 ? `${(vcm / 1000).toFixed(1)} kV/cm` : `${vcm.toFixed(0)} V/cm`
    },

    onClose(): void {
      if (this.busy) return
      this.$emit('close')
    },

    async onDownload(): Promise<void> {
      if (this.busy || !this.isFormValid) return
      this.busy = true
      try {
        await this.experimentStore.exportOpentronsScript({ ...this.form })
        this.$emit('close')
      } finally {
        this.busy = false
      }
    },
  },
})
</script>

<style lang="scss" scoped>
.ote {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, var(--color-bg) 92%, transparent);
  padding: 1rem;

  &__panel {
    @include surface-card(var(--radius-lg), 0);
    width: 100%;
    max-width: 620px;
    max-height: 92vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  &__header {
    @include flex-col(0.3rem);
    padding: 1.1rem 1.4rem 0.75rem;
    border-bottom: 1px solid color-mix(in srgb, var(--color-primary) 12%, transparent);
  }

  &__eyebrow {
    @include mono-upper(var(--fs-xxs));
    color: var(--color-primary);
  }

  &__subtitle {
    margin: 0;
    font-size: var(--fs-lg);
    color: var(--color-text);
  }

  &__hint {
    margin: 0;
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
    line-height: 1.5;
  }

  &__body {
    @include flex-col(1rem);
    padding: 0.9rem 1.4rem;
    overflow-y: auto;
  }

  &__section { @include flex-col(0.5rem); }

  &__section-title {
    @include mono-upper(var(--fs-xxs), 0.08em);
    margin: 0;
    color: var(--color-primary);
  }

  &__grid {
    display: grid;
    grid-template-columns: minmax(140px, 1fr) 2fr auto auto;
    gap: 0.4rem 0.6rem;
    align-items: center;
  }

  &__label {
    @include mono-upper(var(--fs-xxs), 0.05em);
    color: var(--color-text-muted);
  }

  &__label-narrow {
    @include mono-upper(var(--fs-xxs), 0.05em);
    color: var(--color-text-muted);
    text-align: right;
  }

  &__input {
    width: 100%;
    padding: 0.35rem 0.55rem;
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    color: var(--color-text);
    background: color-mix(in srgb, var(--color-text) 5%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-text) 18%, transparent);
    border-radius: var(--radius);
    outline: none;
    -webkit-appearance: none;
    appearance: none;
    transition: border-color var(--tr-fast);

    &:focus { border-color: var(--color-primary); }

    &--narrow { width: 4.5rem; padding: 0.35rem 0.4rem; text-align: center; }
  }

  &__spacer { display: block; }

  &__caption {
    margin: 0.2rem 0 0;
    font-size: var(--fs-xxs);
    color: var(--color-text-muted);
    opacity: var(--op-dim);
    line-height: 1.5;
  }

  &__protocol {
    @include flex-row(0.4rem);
    flex-wrap: wrap;
  }

  &__protocol-pill {
    @include badge-pill();

    &--target {
      color: var(--color-danger);
      border-color: color-mix(in srgb, var(--color-danger) 35%, transparent);
      background: color-mix(in srgb, var(--color-danger) 6%, transparent);
    }
  }

  &__footer {
    @include flex-between();
    padding: 0.85rem 1.4rem 1.1rem;
    border-top: 1px solid color-mix(in srgb, var(--color-primary) 12%, transparent);
  }

  &__btn {
    @include flex-row(0.4rem);
    align-items: center;
    @include mono-upper(var(--fs-xs), 0.06em);
    padding: 0.45rem 1rem;
    background: color-mix(in srgb, var(--color-primary) 16%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-primary) 45%, transparent);
    border-radius: var(--radius);
    color: var(--color-primary);
    cursor: pointer;
    transition: background var(--tr-fast);

    &:hover:not(:disabled) { background: color-mix(in srgb, var(--color-primary) 28%, transparent); }
    &:disabled             { opacity: var(--op-muted); cursor: not-allowed; }

    &--ghost {
      background: transparent;
      color: var(--color-text-muted);
      border-color: color-mix(in srgb, var(--color-text) 25%, transparent);

      &:hover:not(:disabled) { background: color-mix(in srgb, var(--color-text) 8%, transparent); }
    }

    &-spinner {
      width: 14px;
      height: 14px;
      border-radius: 50%;
      border: 2px solid color-mix(in srgb, var(--color-primary) 30%, transparent);
      border-top-color: var(--color-primary);
      animation: ote-spin 0.6s linear infinite;
      flex-shrink: 0;
    }
  }
}

@keyframes ote-spin { to { transform: rotate(360deg); } }

.ote-enter-active, .ote-leave-active { transition: opacity var(--tr-normal); }
.ote-enter-from,   .ote-leave-to     { opacity: 0; }
</style>
