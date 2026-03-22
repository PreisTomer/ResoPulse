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

    <div class="ccm-footer__actions">
      <button class="ccm-footer__btn ccm-footer__btn--cancel" @click="$emit('cancel')">
        {{ $t('userPresets.cancelBtn') }}
      </button>
      <button
        class="ccm-footer__btn ccm-footer__btn--save"
        :disabled="!canSave"
        @click="$emit('save')"
      >
        {{ $t('userPresets.saveBtn') }}
      </button>
    </div>

  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'CcmFooter',

  props: {
    canSave:          { type: Boolean, required: true },
    validationErrors: { type: Array as () => string[], default: () => [] },
  },

  emits: ['save', 'cancel'],
})
</script>

<style lang="scss" scoped>
.ccm-footer {
  display:        flex;
  flex-direction: column;
  gap:            0.5rem;
  padding:        0.85rem 1.25rem;
  border-top:     1px solid var(--color-border, rgba(255,255,255,0.1));

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
      border-color: rgba(255,255,255,0.15);
      color:        var(--color-text-muted);

      &:hover { background: rgba(255,255,255,0.05); }
    }

    &--save {
      background: var(--color-primary);
      color:      var(--color-btn-dark);

      &:hover:not(:disabled) { filter: brightness(1.1); }
      &:disabled { opacity: 0.4; cursor: not-allowed; }
    }
  }
}
</style>
