<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div class="field-panel__row field-panel__row--medium">
    <span class="field-panel__row-label" v-tip="tipMediumLabel">{{ $t('slider.medium') }}</span>
    <select
      class="field-panel__medium-select"
      :value="currentMedium"
      v-tip="tipMediumKeys[currentMedium]"
      @change="onMediumChange(($event.target as HTMLSelectElement).value as typeof currentMedium)"
    >
      <optgroup :label="$t('slider.mediumGroupPhysio')">
        <option value="saline">{{ $t('slider.mediums.saline') }}</option>
        <option value="blood">{{ $t('slider.mediums.blood') }}</option>
        <option value="tissue">{{ $t('slider.mediums.tissue') }}</option>
      </optgroup>
      <optgroup :label="$t('slider.mediumGroupCulture')">
        <option value="dmem">{{ $t('slider.mediums.dmem') }}</option>
        <option value="rpmi">{{ $t('slider.mediums.rpmi') }}</option>
      </optgroup>
      <optgroup :label="$t('slider.mediumGroupMicro')">
        <option value="mhb">{{ $t('slider.mediums.mhb') }}</option>
      </optgroup>
      <optgroup :label="$t('slider.mediumGroupRef')">
        <option value="water">{{ $t('slider.mediums.water') }}</option>
      </optgroup>
    </select>
    <span class="field-panel__row-meta" v-tip="tipSigmaELabel">σ_e {{ MEDIA[currentMedium].conductivity }} S/m</span>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { useCellStore } from '@/stores/cellStore'
import { broadcastStateSync } from '@/services/socket'
import { MEDIA } from '@/constants/media'
import type { MediumKey } from '@/types/media'
import { tipMedium, tipMediumKeys, tipSigmaE } from '@/tooltips/sliderTooltips'

export default defineComponent({
  setup() {
    return { store: useCellStore(), MEDIA }
  },

  computed: {
    currentMedium(): MediumKey                   { return this.store.medium },
    tipMediumLabel(): string                     { return tipMedium(this.currentMedium) },
    tipMediumKeys(): Record<string, string>      { return tipMediumKeys() },
    tipSigmaELabel(): string                     { return tipSigmaE(this.MEDIA[this.currentMedium].conductivity) },
  },

  methods: {
    onMediumChange(key: MediumKey) {
      this.store.setMedium(key)
      broadcastStateSync()
    },
  },
})
</script>

<style lang="scss" scoped>


.field-panel {
  &__row {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 0.85rem;
  }

  &__row-label { @include row-label(); }

  &__row-meta {
    font-size: var(--fs-xs);
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    white-space: nowrap;
    opacity: 0.65; // intentional between-tier value
    text-align: right;
    justify-self: end;
  }

  &__medium-select {
    flex: 1;
    min-width: 0;
    padding: 0.26rem 0.55rem;
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    border-radius: 4px;
    color: var(--color-primary);
    cursor: pointer;
    outline: none;
    -moz-appearance: none;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='rgba(148,163,184,0.5)'/%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 0.5rem center;
    padding-right: 1.6rem;
    transition: border-color var(--tr-fast);

    &:focus, &:hover { border-color: var(--color-primary); }

    option, optgroup { background: var(--color-surface-2); color: var(--color-text); }
    optgroup { color: var(--color-text-muted); font-style: normal; }
  }
}
</style>
