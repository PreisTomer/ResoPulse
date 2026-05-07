<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="ccm-identity">

    <!-- Name + short label row -->
    <div class="ccm-identity__row ccm-identity__row--double">
      <div class="ccm-identity__field">
        <label class="ccm-identity__label">{{ $t('userPresets.fieldLabel') }} *</label>
        <input
          :value="form.label"
          class="ccm-identity__input"
          type="text"
          placeholder="e.g. HeLa cervical carcinoma"
          maxlength="60"
          @input="onInput('label', ($event.target as HTMLInputElement).value)"
        />
      </div>
      <div class="ccm-identity__field">
        <label class="ccm-identity__label">{{ $t('userPresets.fieldShortLabel') }} *</label>
        <input
          :value="form.shortLabel"
          class="ccm-identity__input"
          type="text"
          placeholder="e.g. HeLa"
          maxlength="12"
          @input="onInput('shortLabel', ($event.target as HTMLInputElement).value)"
        />
      </div>
    </div>

    <!-- Role selector: target vs reference/healthy -->
    <div class="ccm-identity__field">
      <label class="ccm-identity__label">{{ $t('userPresets.roleLabel') }}</label>
      <div class="ccm-identity__role-pills">
        <button
          v-for="r in roles"
          :key="r.value"
          type="button"
          class="ccm-identity__role-pill"
          :class="[
            `ccm-identity__role-pill--${r.value}`,
            { 'ccm-identity__role-pill--active': form.role === r.value },
          ]"
          @click="onInput('role', r.value)"
        >
          <span class="ccm-identity__role-pill-name">{{ $t(r.labelKey) }}</span>
          <span class="ccm-identity__role-pill-sub">{{ $t(r.subKey) }}</span>
        </button>
      </div>
    </div>

    <!-- Cell type selector -->
    <div class="ccm-identity__field">
      <label class="ccm-identity__label">
        {{ $t('userPresets.cellTypeLabel') }}
        <button class="ccm-identity__tip-btn" @click="$emit(EMIT.SHOW_TIP, 'cellType')">?</button>
      </label>
      <div class="ccm-identity__type-pills">
        <button
          v-for="ct in cellTypes"
          :key="ct"
          type="button"
          class="ccm-identity__type-pill"
          :class="{ 'ccm-identity__type-pill--active': form.cellType === ct }"
          @click="$emit(EMIT.CELL_TYPE_CHANGE, ct)"
        >{{ $t(`userPresets.cellType${capitalize(ct)}`) }}</button>
      </div>
    </div>

    <!-- Parameter confidence selector -->
    <div class="ccm-identity__field">
      <label class="ccm-identity__label">{{ $t('userPresets.confidenceLabel') }}</label>
      <div class="ccm-identity__confidence-pills">
        <button
          v-for="c in confidenceLevels"
          :key="c.value"
          type="button"
          class="ccm-identity__confidence-pill"
          :class="[
            `ccm-identity__confidence-pill--${c.value}`,
            { 'ccm-identity__confidence-pill--active': form.parameterConfidence === c.value },
          ]"
          @click="onInput('parameterConfidence', c.value)"
        >
          <span class="ccm-identity__confidence-pill-name">{{ $t(c.labelKey) }}</span>
          <span class="ccm-identity__confidence-pill-sub">{{ $t(c.subKey) }}</span>
        </button>
      </div>
    </div>

    <!-- Parameter source (required citation / measurement method) -->
    <div class="ccm-identity__field">
      <label class="ccm-identity__label">{{ $t('userPresets.fieldSource') }}</label>
      <input
        :value="form.notes"
        class="ccm-identity__input ccm-identity__input--source"
        type="text"
        :placeholder="sourcePlaceholder"
        maxlength="300"
        @input="onInput('notes', ($event.target as HTMLInputElement).value)"
      />
      <span class="ccm-identity__source-hint">{{ $t('userPresets.fieldSourceSub') }}</span>
    </div>

  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { EMIT } from '@/constants/emitEvents'

type CellFormType        = 'mammalian' | 'bacteria' | 'virus'
type ParameterConfidence = 'literature' | 'measured' | 'estimated'

const SOURCE_PLACEHOLDERS: Record<ParameterConfidence, string> = {
  literature: 'e.g. Kotnik & Miklavcic (2000) Biophys J 79:670 · or · DOI: 10.1016/...',
  measured:   'e.g. Electrorotation crossover fit, passage 12, RPMI, 37 °C',
  estimated:  'e.g. Extrapolated from CHO baseline; sigma_i adjusted for smaller radius',
}

export default defineComponent({
  name: 'CcmIdentitySection',

  props: {
    form: { type: Object as () => Record<string, unknown>, required: true },
  },

  emits: [EMIT.FIELD_CHANGE, EMIT.SHOW_TIP, EMIT.CELL_TYPE_CHANGE],

  data() {
    return {
      EMIT,
      cellTypes: ['mammalian', 'bacteria', 'virus'] as CellFormType[],
      roles: [
        { value: 'target',  labelKey: 'userPresets.roleTarget',  subKey: 'userPresets.roleTargetSub' },
        { value: 'healthy', labelKey: 'userPresets.roleHealthy', subKey: 'userPresets.roleHealthySub' },
      ],
      confidenceLevels: [
        { value: 'literature', labelKey: 'userPresets.confidenceLiterature', subKey: 'userPresets.confidenceLiteratureSub' },
        { value: 'measured',   labelKey: 'userPresets.confidenceMeasured',   subKey: 'userPresets.confidenceMeasuredSub' },
        { value: 'estimated',  labelKey: 'userPresets.confidenceEstimated',  subKey: 'userPresets.confidenceEstimatedSub' },
      ],
    }
  },

  computed: {
    sourcePlaceholder(): string {
      const conf = this.form.parameterConfidence as ParameterConfidence ?? 'literature'
      return SOURCE_PLACEHOLDERS[conf] ?? SOURCE_PLACEHOLDERS.literature
    },
  },

  methods: {
    capitalize(s: string): string {
      return s.charAt(0).toUpperCase() + s.slice(1)
    },

    onInput(key: string, value: string) {
      this.$emit(EMIT.FIELD_CHANGE, { key, value })
    },
  },
})
</script>

<style lang="scss" scoped>

.ccm-identity {
  @include flex-col(0.9rem);

  &__row {
    display: flex;
    gap:     0.75rem;

    &--double > .ccm-identity__field { flex: 1; }
  }

  &__field {
    @include flex-col(0.25rem);
  }

  &__label {
    @include flex-row(0.35rem);
    font-size:      var(--fs-sm);
    font-weight:    600;
    color:          var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  &__input {
    @include ccm-form-input();

    &::placeholder { color: color-mix(in srgb, var(--color-text-muted) 45%, transparent); }

    &--source {
      font-family: var(--font-mono);
      font-size:   var(--fs-xs);
    }
  }

  &__source-hint {
    font-family: var(--font-mono);
    font-size:   var(--fs-xs);
    color:       var(--color-text-muted);
    opacity:     var(--op-muted);
    line-height: 1.4;
  }

  &__tip-btn { @include ccm-tip-btn(); }

  &__role-pills {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }

  &__role-pill {
    @include flex-col(0.15rem);
    padding:       0.5rem 0.75rem;
    border-radius: var(--radius);
    border:        1px solid var(--color-border);
    background:    transparent;
    text-align:    left;
    cursor:        pointer;
    transition:    border-color var(--tr-fast), background var(--tr-fast);

    &:hover { border-color: color-mix(in srgb, white 20%, transparent); }

    &--target.ccm-identity__role-pill--active {
      border-color: color-mix(in srgb, var(--color-danger) 60%, transparent);
      background:   color-mix(in srgb, var(--color-danger) 7%, transparent);
    }

    &--healthy.ccm-identity__role-pill--active {
      border-color: color-mix(in srgb, var(--color-primary) 60%, transparent);
      background:   color-mix(in srgb, var(--color-primary) 7%, transparent);
    }

    &-name {
      font-size:   var(--fs-md);
      font-weight: 600;
      color:       var(--color-text);
    }

    &-sub {
      font-size:   var(--fs-xxs);
      color:       var(--color-text-muted);
      opacity:     var(--op-muted);
      line-height: 1.4;
    }
  }

  &__type-pills {
    display: flex;
    gap:     0.5rem;
  }

  &__type-pill {
    flex:          1;
    padding:       0.4rem 0.6rem;
    border-radius: 5px;
    border:        1px solid var(--color-border);
    background:    transparent;
    color:         var(--color-text-muted);
    font-size:     var(--fs-sm);
    cursor:        pointer;
    text-align:    center;
    transition:    border-color var(--tr-fast), color var(--tr-fast), background var(--tr-fast);

    &:hover {
      border-color: color-mix(in srgb, var(--color-primary) 40%, transparent);
      color:        var(--color-text);
    }

    &--active {
      border-color: var(--color-primary);
      color:        var(--color-primary);
      background:   color-mix(in srgb, var(--color-primary) 8%, transparent);
    }
  }

  // ── Confidence selector ───────────────────────────────────────────────────
  &__confidence-pills {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0.5rem;
  }

  &__confidence-pill {
    @include flex-col(0.1rem);
    padding:       0.4rem 0.55rem;
    border-radius: 5px;
    border:        1px solid var(--color-border);
    background:    transparent;
    text-align:    left;
    cursor:        pointer;
    transition:    border-color var(--tr-fast), background var(--tr-fast);

    &:hover { border-color: color-mix(in srgb, white 20%, transparent); }

    &--literature.ccm-identity__confidence-pill--active {
      border-color: color-mix(in srgb, var(--color-primary) 55%, transparent);
      background:   color-mix(in srgb, var(--color-primary) 7%, transparent);
    }

    &--measured.ccm-identity__confidence-pill--active {
      border-color: color-mix(in srgb, var(--color-accent) 55%, transparent);
      background:   color-mix(in srgb, var(--color-accent) 7%, transparent);
    }

    &--estimated.ccm-identity__confidence-pill--active {
      border-color: color-mix(in srgb, var(--color-amber) 55%, transparent);
      background:   color-mix(in srgb, var(--color-amber) 7%, transparent);
    }

    &-name {
      font-family: var(--font-mono);
      font-size:   var(--fs-xs);
      font-weight: 600;
      color:       var(--color-text);
      letter-spacing: 0.02em;
    }

    &-sub {
      font-size:   var(--fs-xxs);
      color:       var(--color-text-muted);
      opacity:     var(--op-muted);
      line-height: 1.35;
    }
  }
}
</style>
