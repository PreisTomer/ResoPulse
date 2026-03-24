<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
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

    <!-- Cell type selector -->
    <div class="ccm-identity__field">
      <label class="ccm-identity__label">
        {{ $t('userPresets.cellTypeLabel') }}
        <button class="ccm-identity__tip-btn" @click="$emit('show-tip', 'cellType')">?</button>
      </label>
      <div class="ccm-identity__type-pills">
        <button
          v-for="ct in cellTypes"
          :key="ct"
          type="button"
          class="ccm-identity__type-pill"
          :class="{ 'ccm-identity__type-pill--active': form.cellType === ct }"
          @click="$emit('cell-type-change', ct)"
        >{{ $t(`userPresets.cellType${capitalize(ct)}`) }}</button>
      </div>
    </div>

    <!-- Notes / citation -->
    <div class="ccm-identity__field">
      <label class="ccm-identity__label">{{ $t('userPresets.fieldNotes') }}</label>
      <input
        :value="form.notes"
        class="ccm-identity__input"
        type="text"
        placeholder="e.g. Teissie &amp; Rols (1993) Biophys J 65(1):409"
        maxlength="200"
        @input="onInput('notes', ($event.target as HTMLInputElement).value)"
      />
    </div>

  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

type CellFormType = 'mammalian' | 'bacteria' | 'virus'

export default defineComponent({
  name: 'CcmIdentitySection',

  props: {
    form: { type: Object as () => Record<string, unknown>, required: true },
  },

  emits: ['field-change', 'show-tip', 'cell-type-change'],

  data() {
    return {
      cellTypes: ['mammalian', 'bacteria', 'virus'] as CellFormType[],
    }
  },

  methods: {
    capitalize(s: string): string {
      return s.charAt(0).toUpperCase() + s.slice(1)
    },

    onInput(key: string, value: string) {
      this.$emit('field-change', { key, value })
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
    background:    var(--color-bg);
    border:        1px solid var(--color-border, rgba(255,255,255,0.12));
    border-radius: 5px;
    color:         var(--color-text);
    font-size:     0.88rem;
    padding:       0.38rem 0.6rem;
    width:         100%;
    box-sizing:    border-box;
    outline:       none;
    transition:    border-color var(--tr-fast);

    &:focus { border-color: var(--color-primary); }
    &::placeholder { color: color-mix(in srgb, var(--color-text-muted) 45%, transparent); }
  }

  &__tip-btn {
    @include inline-flex-center();
    width:         14px;
    height:        14px;
    border-radius: 50%;
    border:        1px solid color-mix(in srgb, var(--color-text-muted) 45%, transparent);
    background:    transparent;
    color:         color-mix(in srgb, var(--color-text-muted) 75%, transparent);
    font-size:     0.6rem;
    font-weight:   700;
    cursor:        pointer;
    padding:       0;
    line-height:   1;
    flex-shrink:   0;

    &:hover {
      border-color: var(--color-primary);
      color:        var(--color-primary);
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
    border:        1px solid var(--color-border, rgba(255,255,255,0.12));
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
}
</style>
