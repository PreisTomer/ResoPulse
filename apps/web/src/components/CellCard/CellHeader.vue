<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div class="cell-card__header">
    <span :class="['cell-card__icon', `cell-card__icon--${type}`]">{{ ICON.CELL }}</span>
    <div class="cell-card__name">
      <div class="cell-card__sublabel-row">
        <div
          class="cell-card__sublabel"
          :class="{ 'cell-card__sublabel--has-tip': sublabelTip }"
          v-tip="sublabelTip || undefined"
        >{{ sublabel }}</div>
        <span
          v-if="provenanceChip"
          class="cell-card__provenance-chip"
          :class="`cell-card__provenance-chip--${provenanceChipVariant}`"
          v-tip="provenanceTip"
        >{{ provenanceChip }}</span>
        <span
          v-if="sigmaCalibration"
          class="cell-card__sigma-chip"
          :class="`cell-card__sigma-chip--${sigmaCalibration.state}`"
          v-tip="sigmaCalibration.tip"
        >{{ sigmaCalibration.label }}</span>
      </div>
      <div v-if="hasCellData" class="cell-card__meta">
        <span class="cell-card__meta-item" v-tip="tipVm">{{ vmDisplay }}</span>
        <span class="cell-card__meta-sep">·</span>
        <span
          class="cell-card__meta-item"
          :class="{ 'cell-card__meta-temp-warn': tempWarning }"
          v-tip="tipTemp"
        >{{ tempDisplay }}</span>
        <span class="cell-card__meta-sep">·</span>
        <span class="cell-card__meta-state" :class="metaStateClass" v-tip="tipState">{{ cellState }}</span>
      </div>
      <div v-if="isNuclearMetaVisible" class="cell-card__nuclear-meta">
        <span class="cell-card__nuclear-label">{{ ICON.NUCLEUS }} {{ $t('cellHeader.nucleusVm') }}</span>
        <span class="cell-card__nuclear-value">{{ nuclearVmMv.toFixed(3) }} {{ UNIT.MV }}</span>
        <span
          class="cell-card__nuclear-ratio"
          :class="nuclearDisruptionRatio >= THRESHOLDS.DISRUPTION_WARN ? 'cell-card__nuclear-ratio--warn' : nuclearDisruptionRatio >= THRESHOLDS.HEALTHY_APPROACHING ? 'cell-card__nuclear-ratio--caution' : ''"
        >{{ (nuclearDisruptionRatio * 100).toFixed(0) }}{{ UNIT.PERCENT }}</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import type { PropType } from 'vue'

import { ICON } from '@/constants/icons'
import { UNIT } from '@/constants/units'
import { THRESHOLDS } from '@/constants/cellCard'

import type { CellState } from '@/types/cell'

export default defineComponent({
  props: {
    type:               { type: String as PropType<'healthy' | 'target'>, required: true },
    sublabel:           { type: String, required: true },
    sublabelTip:        { type: String, default: '' },
    vmDisplay:          { type: String, required: true },
    tempDisplay:        { type: String, required: true },
    tempWarning:        { type: Boolean, required: true },
    cellState:          { type: String as PropType<CellState>, required: true },
    metaStateClass:     { type: String, required: true },
    tipVm:              { type: String, required: true },
    tipTemp:            { type: String, required: true },
    tipState:           { type: String, required: true },
    doubleShellEnabled: { type: Boolean, required: true },
    hasNuclearParams:   { type: Boolean, required: true },
    nuclearVmMv:        { type: Number, required: true },
    nuclearDisruptionRatio: { type: Number, required: true },
    hasCellData:        { type: Boolean, required: true },
    provenanceChip:        { type: String, default: '' },
    provenanceChipVariant: { type: String, default: 'literature' },
    provenanceTip:         { type: String, default: '' },
    sigmaCalibration:      { type: Object as PropType<{ label: string; tip: string; state: 'calibrated' | 'clamped' | 'unidentifiable' | 'collecting' | 'unknown' } | null>, default: null },
  },

  computed: {
    ICON()       { return ICON },
    UNIT()       { return UNIT },
    THRESHOLDS() { return THRESHOLDS },

    isNuclearMetaVisible(): boolean { return this.doubleShellEnabled && this.hasNuclearParams },
  },
})
</script>

<style lang="scss" scoped>



.cell-card {
  &__header {
    display: flex;
    align-items: flex-start;
    gap: 0.85rem;
    min-height: 5.5rem;
  }

  &__icon {
    font-size: 1.8rem;
    line-height: 1;
    flex-shrink: 0;

    &--healthy { color: var(--color-accent); }
    &--target  { color: var(--color-danger); }
  }

  &__name {
    flex: 1;
    min-width: 0;
    @include flex-col(0.15rem);
  }

  &__sublabel-row {
    @include flex-row(0.4rem);
    flex-wrap: wrap;
  }

  &__sublabel {
    @include mono-upper(0.72rem);
    color: var(--color-text-muted);
    line-height: 1.3;

    &--has-tip {
      cursor: help;
      border-bottom: 1px dotted color-mix(in srgb, white 25%, transparent);
      text-decoration-skip-ink: none;
    }
  }

  &__provenance-chip {
    @include badge-pill(0.05rem 0.3rem, 3px);
    font-size: 0.55rem;
    cursor: help;

    &--literature { @include color-variant(primary, 35%, 10%); }
    &--measured   { @include color-variant(accent,  35%, 10%); }
    &--estimated  { @include color-variant(amber,   35%, 10%); }
  }

  &__sigma-chip {
    @include badge-pill(0.1rem 0.4rem, 3px);
    font-family: var(--font-mono);
    font-size: 0.6rem;
    letter-spacing: 0.02em;
    text-transform: none;
    cursor: help;

    &--calibrated { @include color-variant(lime,   40%, 10%); }
    &--clamped    { @include color-variant(amber,  40%, 10%); }
    &--collecting { @include color-variant(primary, 30%, 6%); color: var(--color-text-muted); }
  }

  &__meta {
    @include flex-row(0.3rem);
    margin-top: 0.3rem;
    font-size: var(--fs-xs);
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    white-space: nowrap;
  }

  &__meta-sep       { opacity: 0.4; } // intentional: near-ghost separator
  &__meta-state     { text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }
  &__meta-temp-warn { color: var(--color-amber-warm); }

  &__nuclear-meta {
    @include flex-row(0.35rem);
    font-family: var(--font-mono);
    font-size: var(--fs-xs);
    color: var(--color-purple);
    margin-top: 0.1rem;
  }

  &__nuclear-label { opacity: 0.65; letter-spacing: 0.06em; } // intentional between-tier value
  &__nuclear-value { font-weight: 600; }

  &__nuclear-ratio {
    opacity: var(--op-partial);

    &--caution { color: var(--color-amber); }
    &--warn    { color: var(--color-danger); animation: state-blink 1s ease-in-out infinite; }
  }

  @include cell-state-classes();
}
</style>
