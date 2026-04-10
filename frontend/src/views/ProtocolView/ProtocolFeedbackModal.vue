<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="pfm-overlay" @click.self="$emit(EMIT.CLOSE)">
    <div class="pfm" role="dialog" aria-modal="true" aria-labelledby="pfm-title">

      <div class="pfm__header">
        <div class="pfm__header-left">
          <span class="pfm__icon">{{ ICON.WARNING }}</span>
          <span id="pfm-title" class="pfm__title">{{ $t('protocol.feedback.title') }}</span>
        </div>
        <button class="pfm__close" @click="$emit(EMIT.CLOSE)" :aria-label="$t('protocol.feedback.close')">{{ ICON.CLOSE }}</button>
      </div>

      <p class="pfm__subtitle">{{ $t('protocol.feedback.subtitle') }}</p>

      <form class="pfm__form" @submit.prevent="send">

        <div class="pfm__field">
          <label class="pfm__label" for="pfm-section">{{ $t('protocol.feedback.labelSection') }}</label>
          <select id="pfm-section" class="pfm__select" :class="{ 'pfm__select--placeholder': !form.section }" v-model="form.section">
            <option value="">{{ $t('protocol.feedback.sectionPlaceholder') }}</option>
            <option v-for="s in SECTIONS" :key="s.value" :value="s.value">{{ s.label }}</option>
          </select>
        </div>

        <div class="pfm__field">
          <label class="pfm__label" for="pfm-equation">{{ $t('protocol.feedback.labelEquation') }}</label>
          <input
            id="pfm-equation"
            class="pfm__input"
            type="text"
            v-model="form.equation"
            :placeholder="$t('protocol.feedback.equationPlaceholder')"
          />
        </div>

        <div class="pfm__field">
          <label class="pfm__label" for="pfm-discrepancy">{{ $t('protocol.feedback.labelDiscrepancy') }}</label>
          <textarea
            id="pfm-discrepancy"
            class="pfm__textarea"
            v-model="form.discrepancy"
            rows="4"
            :placeholder="$t('protocol.feedback.discrepancyPlaceholder')"
          ></textarea>
        </div>

        <div class="pfm__row-2">
          <div class="pfm__field">
            <label class="pfm__label" for="pfm-reference">{{ $t('protocol.feedback.labelReference') }}</label>
            <input
              id="pfm-reference"
              class="pfm__input"
              type="text"
              v-model="form.reference"
              :placeholder="$t('protocol.feedback.referencePlaceholder')"
            />
          </div>
          <div class="pfm__field">
            <label class="pfm__label" for="pfm-name">{{ $t('protocol.feedback.labelName') }}</label>
            <input
              id="pfm-name"
              class="pfm__input"
              type="text"
              v-model="form.name"
              :placeholder="$t('protocol.feedback.namePlaceholder')"
            />
          </div>
        </div>

        <div class="pfm__footer">
          <span class="pfm__note">{{ $t('protocol.feedback.note') }}</span>
          <button type="submit" class="pfm__send" :disabled="!form.discrepancy.trim()">
            {{ ICON.MAIL }} {{ $t('protocol.feedback.send') }}
          </button>
        </div>

      </form>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { ICON } from '@/constants/icons'
import { EMIT } from '@/constants/emitEvents'
const SECTIONS = [
  { value: '§2.1 Schwan Transmembrane Voltage',   label: '§2.1 Schwan Transmembrane Voltage' },
  { value: '§2.2 SAR and Thermal Model',           label: '§2.2 SAR and Thermal Model' },
  { value: '§2.3 Maxwell-Wagner Dispersion',       label: '§2.3 Maxwell-Wagner Dispersion' },
  { value: '§2.4 Electroporation / Disruption',    label: '§2.4 Electroporation / Disruption' },
  { value: '§2.5 Acoustic Resonance',              label: '§2.5 Acoustic Resonance' },
  { value: '§2.6 nsEP Pulse Selectivity',          label: '§2.6 nsEP Pulse Selectivity' },
  { value: '§2.7 Double-Shell Nuclear Model',      label: '§2.7 Double-Shell Nuclear Model' },
  { value: '§2.8 DEP / Clausius-Mossotti',         label: '§2.8 DEP / Clausius-Mossotti' },
  { value: '§2.9 Biomodulation Scoring',           label: '§2.9 Biomodulation Scoring' },
  { value: '§2.10 Impedance Tracking',             label: '§2.10 Impedance Tracking' },
  { value: 'Protocol Steps',                       label: 'Protocol Steps (§3)' },
  { value: 'Safety Notes',                         label: 'Safety Notes (§4)' },
  { value: 'References',                           label: 'References (§5)' },
  { value: 'Wording / Clarity',                    label: 'Wording or Clarity' },
  { value: 'Experiment Lab Behavior',              label: 'Experiment Lab Behavior' },
  { value: 'Other',                                label: 'Other / General' },
]

const RECIPIENT = 'preis.tomer@gmail.com'

export default defineComponent({
  name: 'ProtocolFeedbackModal',

  emits: [EMIT.CLOSE],

  computed: {
    ICON() { return ICON },
    EMIT() { return EMIT },
  },

  data() {
    return {
      SECTIONS,
      form: {
        section:     '',
        equation:    '',
        discrepancy: '',
        reference:   '',
        name:        '',
      },
    }
  },

  methods: {
    send() {
      const { section, equation, discrepancy, reference, name } = this.form
      const subject = encodeURIComponent(
        `Equation Variance Report${section ? ': ' + section : ''}`
      )
      const lines = [
        section    ? `Section: ${section}`              : '',
        equation   ? `Equation / Term: ${equation}`     : '',
        `\nDiscrepancy:\n${discrepancy}`,
        reference  ? `\nSupporting Reference: ${reference}` : '',
        name       ? `\nReported by: ${name}`           : '',
      ].filter(Boolean)
      const body = encodeURIComponent(lines.join('\n'))
      window.location.href = `mailto:${RECIPIENT}?subject=${subject}&body=${body}`
      this.$emit(EMIT.CLOSE)
    },
  },
})
</script>

<style lang="scss" scoped>
.pfm-overlay {
  position: fixed;
  inset: 0;
  z-index: 200;
  background: color-mix(in srgb, var(--color-bg) 60%, transparent);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.pfm {
  @include surface-card(var(--radius-lg), 1.5rem);
  width: 100%;
  max-width: 540px;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  box-shadow: 0 8px 40px color-mix(in srgb, var(--color-bg) 20%, transparent);

  &__header {
    @include flex-between();

    &-left { @include flex-row(0.5rem); }
  }

  &__icon { font-size: 1.15rem; color: var(--color-amber); }

  &__title {
    font-size: var(--fs-lg);
    font-weight: 700;
    color: white;
    letter-spacing: 0.01em;
  }

  &__close {
    background: none;
    border: none;
    cursor: pointer;
    color: white;
    font-size: 1rem;
    padding: 0.2rem;
    line-height: 1;
    opacity: var(--op-muted);
    transition: opacity var(--tr-fast);
    &:hover { opacity: 1; }
  }

  &__subtitle {
    font-size: var(--fs-md);
    color: white;
    line-height: 1.5;
    margin: 0;
  }

  &__form { display: flex; flex-direction: column; gap: 0.85rem; }

  &__field { display: flex; flex-direction: column; gap: 0.3rem; }

  &__row-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
    @media (max-width: 480px) { grid-template-columns: 1fr; }
  }

  &__label {
    @include mono-upper(var(--fs-xxs), 0.08em);
    color: white;
  }

  &__select,
  &__input,
  &__textarea {
    background: color-mix(in srgb, var(--color-primary) 3%, var(--color-bg));
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    color: var(--color-text);
    font-family: var(--font-body);
    font-size: var(--fs-md);
    padding: 0.5rem 0.75rem;
    width: 100%;
    transition: border-color var(--tr-fast);
    box-sizing: border-box;

    &:focus {
      outline: none;
      border-color: var(--color-primary);
    }

    &::placeholder { color: var(--color-text-muted); }
  }

  &__textarea { resize: vertical; min-height: 100px; line-height: 1.55; }

  &__select {
    -webkit-appearance: none;
    appearance: none;
    cursor: pointer;
    &--placeholder { color: var(--color-text-muted); }
  }

  &__footer {
    @include flex-between();
    margin-top: 0.25rem;
    gap: 1rem;
    flex-wrap: wrap;
  }

  &__note {
    font-size: var(--fs-xxs);
    color: white;
    font-family: var(--font-mono);
  }

  &__send {
    @include flex-row(0.4rem);
    background: color-mix(in srgb, var(--color-primary) 12%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-primary) 85%, white);
    border-radius: var(--radius);
    color: color-mix(in srgb, var(--color-primary) 85%, white);
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
    font-weight: 600;
    padding: 0.45rem 1rem;
    cursor: pointer;
    transition: background-color var(--tr-fast), opacity var(--tr-fast);

    &:hover:not(:disabled) { background: color-mix(in srgb, var(--color-primary) 20%, transparent); }
    &:disabled { opacity: var(--op-ghost); cursor: not-allowed; }
  }
}
</style>
