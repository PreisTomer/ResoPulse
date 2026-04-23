<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <Transition name="csvmap">
    <div v-if="isOpen" class="csvmap" role="dialog" aria-modal="true" @click.self="onClose">
      <div class="csvmap__panel">

        <div class="csvmap__header">
          <span class="csvmap__eyebrow">{{ $t('reports.mappingModalEyebrow') }}</span>
          <h2 class="csvmap__subtitle">{{ $t('reports.mappingModalTitle') }}</h2>
        </div>

        <div class="csvmap__body">
          <p class="csvmap__hint">{{ $t('reports.mappingModalHint') }}</p>
          <div class="csvmap__grid">
            <template v-for="field in MAPPABLE_FIELDS" :key="field.key">
              <label class="csvmap__label">{{ $t(field.labelKey) }}</label>
              <input
                class="csvmap__input"
                type="text"
                :placeholder="field.defaultHeader"
                :value="draft[field.key] ?? ''"
                @input="onInput(field.key, $event)"
              />
            </template>
          </div>
        </div>

        <div class="csvmap__footer">
          <button class="csvmap__btn csvmap__btn--ghost" @click="onClear">{{ $t('reports.mappingModalClear') }}</button>
          <button class="csvmap__btn" @click="onSave">{{ $t('reports.mappingModalSave') }}</button>
        </div>

      </div>
    </div>
  </Transition>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { mapStores } from 'pinia'

import { useCsvMappingStore, type CsvColumnMapping, type CsvMappingField } from '@/stores/csvMappingStore'

interface MappableField {
  key:            CsvMappingField
  labelKey:       string
  defaultHeader:  string
}

const MAPPABLE_FIELDS: MappableField[] = [
  { key: 'targetLysisPct',       labelKey: 'reports.mappingFieldTargetLysis',   defaultHeader: 't-lysis measured (%)' },
  { key: 'healthyLysisPct',      labelKey: 'reports.mappingFieldHealthyLysis',  defaultHeader: 'h-lysis measured (%)' },
  { key: 'viabilityPct',         labelKey: 'reports.mappingFieldViability',     defaultHeader: 'viability measured (%)' },
  { key: 'permeabilizedPct',     labelKey: 'reports.mappingFieldPermeabilized', defaultHeader: 'permeabilized measured (%)' },
  { key: 'transfectionPct',      labelKey: 'reports.mappingFieldTransfection',  defaultHeader: 'transfection measured (%)' },
  { key: 'assayTimepointH',      labelKey: 'reports.mappingFieldTimepoint',     defaultHeader: 'assay timepoint (h)' },
  { key: 'qpcrFoldChange',       labelKey: 'reports.mappingFieldQpcr',          defaultHeader: 'qpcr fold-change' },
  { key: 'qpcrTarget',           labelKey: 'reports.mappingFieldQpcrTarget',    defaultHeader: 'qpcr transcript' },
  { key: 'viabilityAssay',       labelKey: 'reports.mappingFieldAssayType',     defaultHeader: 'assay type' },
  { key: 'tempC',                labelKey: 'reports.mappingFieldTemp',          defaultHeader: 'temp measured (°c)' },
  { key: 'actualFieldVcm',       labelKey: 'reports.mappingFieldField',         defaultHeader: 'actual field measured (v/cm)' },
  { key: 'observedLysisDelayMs', labelKey: 'reports.mappingFieldLysisDelay',    defaultHeader: 'lysis delay measured (ms)' },
  { key: 'notes',                labelKey: 'reports.mappingFieldNotes',         defaultHeader: 'measured notes' },
  { key: 'measuredAt',           labelKey: 'reports.mappingFieldMeasuredAt',    defaultHeader: 'measured at' },
]

export default defineComponent({
  name: 'CsvMappingModal',

  props: {
    isOpen: { type: Boolean, required: true },
  },

  emits: ['close'],

  data() {
    return {
      draft: {} as CsvColumnMapping,
    }
  },

  computed: {
    MAPPABLE_FIELDS() { return MAPPABLE_FIELDS },
    ...mapStores(useCsvMappingStore),
  },

  watch: {
    isOpen(open: boolean) {
      if (open) this.draft = { ...this.csvMappingStore.mapping }
    },
  },

  methods: {
    onInput(key: CsvMappingField, evt: Event): void {
      const value = (evt.target as HTMLInputElement).value
      const trimmed = value.trim()
      if (trimmed.length === 0) {
        delete this.draft[key]
      } else {
        this.draft[key] = trimmed
      }
    },

    onSave(): void {
      this.csvMappingStore.setAll(this.draft)
      this.$emit('close')
    },

    onClear(): void {
      this.draft = {}
      this.csvMappingStore.clear()
      this.$emit('close')
    },

    onClose(): void {
      this.$emit('close')
    },
  },
})
</script>

<style lang="scss" scoped>
.csvmap {
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
    max-width: 560px;
    max-height: 90vh;
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

  &__body {
    padding: 0.9rem 1.4rem;
    overflow-y: auto;
  }

  &__hint {
    margin: 0 0 0.8rem;
    font-size: var(--fs-sm);
    color: var(--color-text-muted);
    line-height: 1.5;
  }

  &__grid {
    display: grid;
    grid-template-columns: minmax(140px, 1fr) 2fr;
    gap: 0.4rem 0.8rem;
    align-items: center;
  }

  &__label {
    @include mono-upper(var(--fs-xxs), 0.05em);
    color: var(--color-text-muted);
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
    transition: border-color var(--tr-fast);

    &:focus { border-color: var(--color-primary); }
  }

  &__footer {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    padding: 0.85rem 1.4rem 1.1rem;
    border-top: 1px solid color-mix(in srgb, var(--color-primary) 12%, transparent);
  }

  &__btn {
    @include mono-upper(var(--fs-xs), 0.06em);
    padding: 0.45rem 1rem;
    background: color-mix(in srgb, var(--color-primary) 16%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-primary) 45%, transparent);
    border-radius: var(--radius);
    color: var(--color-primary);
    cursor: pointer;
    transition: background var(--tr-fast);

    &:hover { background: color-mix(in srgb, var(--color-primary) 28%, transparent); }

    &--ghost {
      background: transparent;
      color: var(--color-text-muted);
      border-color: color-mix(in srgb, var(--color-text) 25%, transparent);

      &:hover { background: color-mix(in srgb, var(--color-text) 8%, transparent); }
    }
  }
}

.csvmap-enter-active, .csvmap-leave-active { transition: opacity 0.2s ease; }
.csvmap-enter-from,   .csvmap-leave-to     { opacity: 0; }
</style>
