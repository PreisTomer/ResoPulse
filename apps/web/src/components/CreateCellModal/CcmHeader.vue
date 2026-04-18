<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="ccm-header">
    <div class="ccm-header__row">
      <span class="ccm-header__title">{{ isEditMode ? $t('userPresets.modalTitleEdit') : $t('userPresets.modalTitle') }}</span>
      <button class="ccm-header__close" @click="$emit(EMIT.CANCEL)">{{ ICON.CLOSE }}</button>
    </div>
    <p class="ccm-header__sub">{{ $t('userPresets.modalSub') }}</p>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

import { ICON } from '@/constants/icons'
import { EMIT } from '@/constants/emitEvents'
export default defineComponent({
  name: 'CcmHeader',

  props: {
    isEditMode: { type: Boolean, default: false },
  },

  emits: [EMIT.CANCEL],

  computed: {
    ICON() { return ICON },
    EMIT() { return EMIT },
  },
})
</script>

<style lang="scss" scoped>


.ccm-header {
  &__row {
    @include flex-between();
    padding:       1rem 1.25rem 0.5rem;
    border-bottom: 1px solid var(--color-border);
  }

  &__title {
    font-size:      1.05rem;
    font-weight:    600;
    color:          var(--color-primary);
    letter-spacing: 0.02em;
  }

  &__close {
    background:  transparent;
    border:      none;
    color:       var(--color-text-muted);
    font-size:   1rem;
    cursor:      pointer;
    padding:     0.2rem 0.4rem;
    line-height: 1;

    &:hover { color: var(--color-text); }
  }

  &__sub {
    padding:   0.5rem 1.25rem 0;
    font-size: var(--fs-md);
    color:     var(--color-text-muted);
    margin:    0;
  }
}
</style>
