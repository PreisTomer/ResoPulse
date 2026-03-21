<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="ccm-derived">

    <div class="ccm-derived__item">
      <span class="ccm-derived__label">{{ $t('userPresets.derivedCm') }}</span>
      <span class="ccm-derived__val">{{ derivedCm }}</span>
    </div>

    <div class="ccm-derived__item">
      <span class="ccm-derived__label">{{ $t('userPresets.derivedTau') }}</span>
      <span class="ccm-derived__val">{{ derivedTau }}</span>
    </div>

    <div class="ccm-derived__item ccm-derived__item--fc">
      <span class="ccm-derived__label">
        {{ $t('userPresets.derivedFc') }}
        <button class="ccm-derived__tip-btn" @click="$emit('show-tip', 'derivedFc')">?</button>
      </span>
      <span class="ccm-derived__val ccm-derived__val--highlight">{{ derivedFc }}</span>
    </div>

  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'

export default defineComponent({
  name: 'CcmDerivedPreview',

  props: {
    derivedCm:  { type: String, required: true },
    derivedTau: { type: String, required: true },
    derivedFc:  { type: String, required: true },
  },

  emits: ['show-tip'],
})
</script>

<style lang="scss" scoped>
@use '../../styles/mixins' as *;

.ccm-derived {
  display:       flex;
  gap:           0.75rem;
  background:    color-mix(in srgb, var(--color-primary) 6%, transparent);
  border:        1px solid color-mix(in srgb, var(--color-primary) 15%, transparent);
  border-radius: 6px;
  padding:       0.6rem 0.9rem;
  flex-wrap:     wrap;

  &__item {
    @include flex-col(0.15rem);
    flex:      1;
    min-width: 120px;

    &--fc { flex: 1.2; }
  }

  &__label {
    @include flex-row(0.3rem);
    font-size:      0.68rem;
    color:          var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  &__val {
    font-size:   0.92rem;
    font-weight: 600;
    color:       var(--color-text);
    font-family: 'Courier New', monospace;

    &--highlight { color: var(--color-primary); }
  }

  &__tip-btn {
    @include inline-flex-center();
    width:         14px;
    height:        14px;
    border-radius: 50%;
    border:        1px solid rgba(136,153,170,0.45);
    background:    transparent;
    color:         rgba(136,153,170,0.75);
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
}
</style>
