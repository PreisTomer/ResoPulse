<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="ccm-footer">

    <!-- Validation errors -->
    <div v-if="validationErrors.length" class="ccm-footer__errors">
      <span
        v-for="err in validationErrors"
        :key="err"
        class="ccm-footer__error-item"
      >{{ err }}</span>
    </div>

    <!-- Save error -->
    <div v-if="saveError" class="ccm-footer__save-error">{{ saveError }}</div>

    <div class="ccm-footer__actions">
      <button class="ccm-footer__btn ccm-footer__btn--cancel" :disabled="saving" @click="$emit(EMIT.CANCEL)">
        {{ $t('userPresets.cancelBtn') }}
      </button>
      <button
        class="ccm-footer__btn ccm-footer__btn--save"
        :disabled="!canSave || saving"
        @click="$emit(EMIT.SAVE)"
      >
        <span v-if="saving" class="ccm-footer__spinner" aria-hidden="true"></span>
        {{ saving ? $t('userPresets.savingBtn') : $t('userPresets.saveBtn') }}
      </button>
    </div>

  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { EMIT } from '@/constants/emitEvents'
export default defineComponent({
  name: 'CcmFooter',

  props: {
    canSave:          { type: Boolean, required: true },
    validationErrors: { type: Array as () => string[], default: () => [] },
    saving:           { type: Boolean, default: false },
    saveError:        { type: String,  default: '' },
  },

  emits: [EMIT.SAVE, EMIT.CANCEL],

  computed: {
    EMIT() { return EMIT },
  },
})
</script>

<style lang="scss" scoped>
.ccm-footer {
  display:        flex;
  flex-direction: column;
  gap:            0.5rem;
  padding:        0.85rem 1.25rem;
  border-top:     1px solid var(--color-border);

  &__errors {
    display:        flex;
    flex-direction: column;
    gap:            0.2rem;
  }

  &__error-item {
    font-size: var(--fs-sm);
    color:     var(--color-danger);
  }

  &__actions {
    display:         flex;
    justify-content: flex-end;
    gap:             0.75rem;
  }

  &__btn {
    padding:       0.45rem 1.2rem;
    border-radius: 5px;
    border:        1px solid transparent;
    font-size:     0.84rem;
    font-weight:   600;
    cursor:        pointer;
    transition:    background var(--tr-fast), opacity var(--tr-fast);

    &--cancel {
      background:   transparent;
      border-color: color-mix(in srgb, white 15%, transparent);
      color:        var(--color-text-muted);

      &:hover { background: color-mix(in srgb, white 5%, transparent); }
    }

    &--save {
      @include flex-row(0.45rem);
      background: var(--color-primary);
      color:      var(--color-btn-dark);

      &:hover:not(:disabled) { filter: brightness(1.1); }
      &:disabled { opacity: 0.4; cursor: not-allowed; }
    }
  }

  &__save-error {
    font-size:   var(--fs-sm);
    color:       var(--color-danger);
    font-family: var(--font-mono);
    text-align:  right;
  }

  &__spinner {
    display:       inline-block;
    width:         11px;
    height:        11px;
    border:        2px solid color-mix(in srgb, var(--color-btn-dark) 30%, transparent);
    border-top:    2px solid var(--color-btn-dark);
    border-radius: 50%;
    animation:     ccm-spin 0.6s linear infinite;
    flex-shrink:   0;
  }
}

@keyframes ccm-spin {
  to { transform: rotate(360deg); }
}
</style>
