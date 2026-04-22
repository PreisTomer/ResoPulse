<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <Transition name="log-measured-modal">
    <div v-if="isOpen" class="lmm" role="dialog" aria-modal="true" @click.self="onCancel">
      <div class="lmm__panel">

        <div class="lmm__header">
          <span class="lmm__eyebrow">{{ ICON.FLASK }} {{ $t('log.measuredModalTitle') }}</span>
          <h2 class="lmm__title">{{ $t('log.measuredModalSubtitle', { id: entry.id, time: entry.timestamp }) }}</h2>
          <p class="lmm__hint">{{ $t('log.measuredModalHint') }}</p>
        </div>

        <div class="lmm__body">

          <section class="lmm__section">
            <h3 class="lmm__section-title">{{ $t('log.measuredSectionPopulations') }}</h3>

            <div class="lmm__grid">

              <label class="lmm__field">
                <span class="lmm__field-label">{{ $t('log.measuredModalTargetLysis') }}</span>
                <div class="lmm__row">
                  <span class="lmm__predicted">{{ $t('log.measuredModalPredicted') }}: {{ predictedTargetLysis }}</span>
                  <input
                    v-model.number="form.targetLysisPct"
                    class="lmm__input"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    inputmode="decimal"
                  />
                </div>
              </label>

              <label class="lmm__field">
                <span class="lmm__field-label">{{ $t('log.measuredModalHealthyLysis') }}</span>
                <div class="lmm__row">
                  <span class="lmm__predicted">{{ $t('log.measuredModalPredicted') }}: {{ predictedHealthyLysis }}</span>
                  <input
                    v-model.number="form.healthyLysisPct"
                    class="lmm__input"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    inputmode="decimal"
                  />
                </div>
              </label>

              <label class="lmm__field">
                <span class="lmm__field-label">{{ $t('log.measuredModalViability') }}</span>
                <div class="lmm__row">
                  <span class="lmm__predicted">{{ $t('log.measuredModalPredicted') }}: {{ predictedViability }}</span>
                  <input
                    v-model.number="form.viabilityPct"
                    class="lmm__input"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    inputmode="decimal"
                  />
                </div>
              </label>

              <label class="lmm__field">
                <span class="lmm__field-label">{{ $t('log.measuredModalPermeabilized') }}</span>
                <div class="lmm__row">
                  <span class="lmm__predicted lmm__predicted--ghost">{{ $t('log.measuredModalNoPrediction') }}</span>
                  <input
                    v-model.number="form.permeabilizedPct"
                    class="lmm__input"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    inputmode="decimal"
                  />
                </div>
              </label>

              <label class="lmm__field">
                <span class="lmm__field-label">{{ $t('log.measuredModalTransfection') }}</span>
                <div class="lmm__row">
                  <span class="lmm__predicted lmm__predicted--ghost">{{ $t('log.measuredModalNoPrediction') }}</span>
                  <input
                    v-model.number="form.transfectionPct"
                    class="lmm__input"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    inputmode="decimal"
                  />
                </div>
              </label>

              <label class="lmm__field">
                <span class="lmm__field-label">{{ $t('log.measuredModalAssay') }}</span>
                <div class="lmm__row lmm__row--full">
                  <select v-model="form.viabilityAssay" class="lmm__select">
                    <option :value="null">{{ $t('log.measuredAssayUnspecified') }}</option>
                    <option value="trypan">{{ $t('log.measuredAssayTrypan') }}</option>
                    <option value="mtt">{{ $t('log.measuredAssayMtt') }}</option>
                    <option value="flowPi">{{ $t('log.measuredAssayFlowPi') }}</option>
                    <option value="resazurin">{{ $t('log.measuredAssayResazurin') }}</option>
                    <option value="cellTiterGlo">{{ $t('log.measuredAssayCellTiterGlo') }}</option>
                    <option value="other">{{ $t('log.measuredAssayOther') }}</option>
                  </select>
                </div>
              </label>

              <label class="lmm__field">
                <span class="lmm__field-label">{{ $t('log.measuredModalTimepoint') }}</span>
                <div class="lmm__row">
                  <span class="lmm__predicted lmm__predicted--ghost">{{ $t('log.measuredModalTimepointHint') }}</span>
                  <input
                    v-model.number="form.assayTimepointH"
                    class="lmm__input"
                    type="number"
                    min="0"
                    step="0.5"
                    inputmode="decimal"
                  />
                </div>
              </label>

            </div>
          </section>

          <section class="lmm__section">
            <h3 class="lmm__section-title">{{ $t('log.measuredSectionConditions') }}</h3>

            <div class="lmm__grid">

              <label class="lmm__field">
                <span class="lmm__field-label">{{ $t('log.measuredModalTemp') }}</span>
                <div class="lmm__row">
                  <span class="lmm__predicted">{{ $t('log.measuredModalPredicted') }}: {{ predictedTemp }}</span>
                  <input
                    v-model.number="form.tempC"
                    class="lmm__input"
                    type="number"
                    step="0.1"
                    inputmode="decimal"
                  />
                </div>
              </label>

              <label class="lmm__field">
                <span class="lmm__field-label">{{ $t('log.measuredModalActualField') }}</span>
                <div class="lmm__row">
                  <span class="lmm__predicted">{{ $t('log.measuredModalPredicted') }}: {{ predictedField }}</span>
                  <input
                    v-model.number="form.actualFieldVcm"
                    class="lmm__input"
                    type="number"
                    min="0"
                    step="1"
                    inputmode="decimal"
                  />
                </div>
              </label>

              <label class="lmm__field lmm__field--full">
                <span class="lmm__field-label">{{ $t('log.measuredModalLysisDelay') }}</span>
                <div class="lmm__row">
                  <span class="lmm__predicted lmm__predicted--ghost">{{ $t('log.measuredModalLysisDelayHint') }}</span>
                  <input
                    v-model.number="form.observedLysisDelayMs"
                    class="lmm__input"
                    type="number"
                    min="0"
                    step="1"
                    inputmode="decimal"
                  />
                </div>
              </label>

            </div>
          </section>

          <section class="lmm__section">
            <h3 class="lmm__section-title">{{ $t('log.measuredSectionNotes') }}</h3>
            <label class="lmm__field lmm__field--full">
              <textarea
                v-model="form.notes"
                class="lmm__textarea"
                rows="2"
                :placeholder="$t('log.measuredModalNotesPlaceholder')"
              />
            </label>
          </section>

        </div>

        <div class="lmm__actions">
          <button class="lmm__btn lmm__btn--ghost" @click="onCancel">
            {{ $t('log.measuredModalCancel') }}
          </button>
          <button class="lmm__btn lmm__btn--primary" @click="onSave">
            {{ $t('log.measuredModalSave') }}
          </button>
        </div>

      </div>
    </div>
  </Transition>
</template>

<script lang="ts">
import { defineComponent, type PropType } from 'vue'

import { ICON } from '@/constants/icons'
import { NULL_DISPLAY } from '@/constants/strings'

import type { LogEntry, MeasuredOutcome } from '@/types/experiment'
import type { ViabilityAssay } from '@resopulse/shared-types'

interface MeasuredForm {
  targetLysisPct:       number | null
  healthyLysisPct:      number | null
  viabilityPct:         number | null
  permeabilizedPct:     number | null
  transfectionPct:      number | null
  viabilityAssay:       ViabilityAssay | null
  assayTimepointH:      number | null
  tempC:                number | null
  actualFieldVcm:       number | null
  observedLysisDelayMs: number | null
  notes:                string
}

function emptyForm(): MeasuredForm {
  return {
    targetLysisPct:       null,
    healthyLysisPct:      null,
    viabilityPct:         null,
    permeabilizedPct:     null,
    transfectionPct:      null,
    viabilityAssay:       null,
    assayTimepointH:      null,
    tempC:                null,
    actualFieldVcm:       null,
    observedLysisDelayMs: null,
    notes:                '',
  }
}

export default defineComponent({
  name: 'LogMeasuredModal',

  props: {
    isOpen: { type: Boolean, required: true },
    entry:  { type: Object as PropType<LogEntry>, required: true },
  },

  emits: ['close', 'save'],

  data() {
    return { form: emptyForm() as MeasuredForm }
  },

  computed: {
    ICON() { return ICON },

    predictedTargetLysis(): string {
      const pct = (this.entry.targetRatio ?? 0) * 100
      return `${pct.toFixed(1)}%`
    },
    predictedHealthyLysis(): string {
      const pct = (this.entry.healthyRatio ?? 0) * 100
      return `${pct.toFixed(1)}%`
    },
    predictedViability(): string {
      const healthyLysisPct = (this.entry.healthyRatio ?? 0) * 100
      return `${Math.max(0, 100 - healthyLysisPct).toFixed(1)}%`
    },
    predictedTemp(): string {
      return this.entry.targetTemp != null ? `${this.entry.targetTemp.toFixed(1)} °C` : NULL_DISPLAY
    },
    predictedField(): string {
      return this.entry.fieldVcm != null ? `${this.entry.fieldVcm.toFixed(0)} V/cm` : NULL_DISPLAY
    },
  },

  watch: {
    isOpen(open: boolean) {
      if (!open) return
      const m = this.entry.measured
      this.form = m
        ? {
          targetLysisPct:       m.targetLysisPct       ?? null,
          healthyLysisPct:      m.healthyLysisPct      ?? null,
          viabilityPct:         m.viabilityPct         ?? null,
          permeabilizedPct:     m.permeabilizedPct     ?? null,
          transfectionPct:      m.transfectionPct      ?? null,
          viabilityAssay:       m.viabilityAssay       ?? null,
          assayTimepointH:      m.assayTimepointH      ?? null,
          tempC:                m.tempC                ?? null,
          actualFieldVcm:       m.actualFieldVcm       ?? null,
          observedLysisDelayMs: m.observedLysisDelayMs ?? null,
          notes:                m.notes                ?? '',
        }
        : emptyForm()
    },
  },

  methods: {
    onCancel() { this.$emit('close') },

    onSave() {
      const toNumber = (v: number | null) => (v === null || Number.isNaN(v) ? undefined : v)
      const payload: Omit<MeasuredOutcome, 'measuredAt'> = {
        targetLysisPct:       toNumber(this.form.targetLysisPct),
        healthyLysisPct:      toNumber(this.form.healthyLysisPct),
        viabilityPct:         toNumber(this.form.viabilityPct),
        permeabilizedPct:     toNumber(this.form.permeabilizedPct),
        transfectionPct:      toNumber(this.form.transfectionPct),
        viabilityAssay:       this.form.viabilityAssay ?? undefined,
        assayTimepointH:      toNumber(this.form.assayTimepointH),
        tempC:                toNumber(this.form.tempC),
        actualFieldVcm:       toNumber(this.form.actualFieldVcm),
        observedLysisDelayMs: toNumber(this.form.observedLysisDelayMs),
        notes:                this.form.notes.trim() || undefined,
      }
      this.$emit('save', payload)
    },
  },
})
</script>

<style lang="scss" scoped>
@use '@/styles/mixins' as *;

.lmm {
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
    max-width: 680px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    max-height: 92vh;
  }

  &__header {
    @include flex-col(0.3rem);
    padding: 1.25rem 1.5rem 0.85rem;
    border-bottom: 1px solid color-mix(in srgb, var(--color-primary) 12%, transparent);
    flex-shrink: 0;
  }

  &__eyebrow {
    @include mono-upper(var(--fs-xxs));
    color: var(--color-primary);
  }

  &__title {
    font-size: var(--fs-xl);
    font-weight: 600;
    color: var(--color-text-heading);
    margin: 0;
  }

  &__hint {
    font-size: var(--fs-xs);
    color: var(--color-text-heading);
    margin: 0;
    line-height: 1.45;
    opacity: var(--op-partial);
  }

  &__body {
    @include flex-col(1.1rem);
    padding: 1rem 1.5rem;
    overflow-y: auto;
  }

  &__section {
    @include flex-col(0.6rem);

    & + & {
      padding-top: 0.9rem;
      border-top: 1px solid color-mix(in srgb, var(--color-text-heading) 10%, transparent);
    }
  }

  &__section-title {
    @include mono-upper(var(--fs-xxs));
    color: var(--color-text-heading);
    margin: 0;
    letter-spacing: 0.1em;
  }

  &__grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.85rem;

    @media (max-width: 540px) {
      grid-template-columns: 1fr;
    }
  }

  &__field {
    @include flex-col(0.3rem);

    &--full { grid-column: 1 / -1; }
  }

  &__field-label {
    @include mono-upper(var(--fs-xxs));
    color: var(--color-text-heading);
  }

  &__row {
    @include flex-row(0.5rem);
    justify-content: space-between;

    &--full { width: 100%; }
  }

  &__predicted {
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    color: var(--color-text-heading);
    opacity: var(--op-partial);
    white-space: nowrap;

    &--ghost { opacity: var(--op-muted); }
  }

  &__input {
    @include number-input-reset();
    width: 6rem;
    padding: 0.25rem 0.4rem;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 3px;
    color: var(--color-text-heading);
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
    text-align: right;
    outline: none;
    transition: border-color var(--tr-fast);

    &:focus { border-color: var(--color-primary); }
  }

  &__select {
    width: 100%;
    padding: 0.35rem 0.5rem;
    background: color-mix(in srgb, var(--color-bg) 60%, transparent);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    color: var(--color-text-heading);
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
    -moz-appearance: none;
    appearance: none;
    outline: none;
    transition: border-color var(--tr-fast);

    &:focus { border-color: var(--color-primary); }
  }

  &__textarea {
    width: 100%;
    padding: 0.45rem 0.55rem;
    background: transparent;
    border: 1px solid var(--color-border);
    border-radius: 3px;
    color: var(--color-text-heading);
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    resize: vertical;
    outline: none;
    transition: border-color var(--tr-fast);

    &:focus { border-color: var(--color-primary); }
  }

  &__actions {
    @include flex-row(0.6rem);
    justify-content: flex-end;
    padding: 0.85rem 1.5rem;
    border-top: 1px solid color-mix(in srgb, var(--color-primary) 10%, transparent);
    flex-shrink: 0;
  }

  &__btn {
    @include mono-upper(var(--fs-xxs));
    padding: 0.45rem 1rem;
    border-radius: var(--radius);
    border: 1px solid;
    background: transparent;
    cursor: pointer;
    transition: background var(--tr-fast), color var(--tr-fast), border-color var(--tr-fast);

    &--ghost {
      color: var(--color-text-heading);
      border-color: color-mix(in srgb, var(--color-text-heading) 25%, transparent);
      opacity: var(--op-partial);

      &:hover { opacity: 1; }
    }

    &--primary {
      @include color-variant(primary, 40%, 15%);

      &:hover {
        background: color-mix(in srgb, var(--color-primary) 25%, transparent);
        border-color: var(--color-primary);
      }
    }
  }
}

.log-measured-modal-enter-active,
.log-measured-modal-leave-active {
  transition: opacity var(--tr-slow);

  .lmm__panel {
    transition: transform var(--tr-slow), opacity var(--tr-slow);
  }
}

.log-measured-modal-enter-from,
.log-measured-modal-leave-to {
  opacity: 0;

  .lmm__panel {
    transform: translateY(-16px);
    opacity: 0;
  }
}
</style>
