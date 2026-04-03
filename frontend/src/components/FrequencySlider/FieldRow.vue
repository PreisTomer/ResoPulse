<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div
    id="hl-field-row"
    class="field-panel__row field-panel__row--interactive"
    :class="thermalDangerLevel !== THERMAL_LEVEL.SAFE ? `field-panel__row--${thermalDangerLevel}` : ''"
  >
    <div class="field-panel__row-header">
      <span class="field-panel__row-label" v-tip="tipFieldLabel">{{ $t('slider.fieldIntensity') }}</span>
      <div class="field-panel__readout">
        <div v-if="editingField" class="field-panel__readout-edit">
          <input
            ref="fieldInputEl"
            class="field-panel__readout-input"
            type="number"
            :step="fieldInputStep"
            v-model.number="fieldInputVal"
            @keydown="onFieldEditKey"
            @blur="commitFieldEdit"
          />
          <span class="field-panel__readout-input-unit">{{ fieldInputUnit }}</span>
        </div>
        <span
          v-else
          class="field-panel__readout-value field-panel__readout-value--editable"
          v-tip="tipFieldLabel"
          @mousedown.prevent="startScrubField"
        >{{ fieldDisplay }}</span>
        <div class="field-panel__badges">
          <span
            class="field-panel__badge field-panel__badge--target"
            :class="{ 'field-panel__badge--warn': targetDisruption > THRESHOLDS.DISRUPTION_WARN }"
            v-tip="tipTargetBadgeLabel"
          >{{ CELL_LABEL.TARGET }} {{ targetDisruptPercent }}%</span>
          <span
            class="field-panel__badge field-panel__badge--healthy"
            :class="{ 'field-panel__badge--warn': healthyDisruption > THRESHOLDS.DISRUPTION_WARN }"
            v-tip="tipHealthyBadgeLabel"
          >{{ CELL_LABEL.HEALTHY }} {{ healthyDisruptPercent }}%</span>
        </div>
        <div v-if="!editingField" class="field-panel__readout-steps">
          <button class="field-panel__readout-step" type="button" @click="stepField(-1)">−</button>
          <span class="field-panel__readout-steps-unit">{{ fieldInputUnit }}</span>
          <button class="field-panel__readout-step" type="button" @click="stepField(1)">+</button>
        </div>
      </div>
    </div>
    <div class="field-panel__track">
      <input
        class="field-panel__slider"
        type="range"
        :min="sliderRanges.fieldMin"
        :max="sliderRanges.fieldMax"
        :step="sliderRanges.fieldStep"
        :value="currentField"
        @input="onFieldInput"
      />
      <div
        v-for="mark in fieldMarkers"
        :key="mark.id"
        class="field-panel__track-mark"
        :class="`field-panel__track-mark--${mark.color}`"
        :style="{ left: mark.pct + '%' }"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import type { PropType } from 'vue'
import { mapStores } from 'pinia'

import { useCellStore } from '@/stores/cellStore'

import { broadcastStateSync } from '@/services/socket'

import { formatFieldVcm, FIELD_KV_THRESHOLD } from '@/utils/format'
import { tempCorrectedVth } from '@/utils/physics'
import { tipField, tipTargetBadge, tipHealthyBadge } from '@/tooltips/sliderTooltips'

import { CELL_LABEL, THERMAL_LEVEL, WAVEFORM } from '@/constants/strings'
import { THRESHOLDS, H_FIRE_THRESHOLD_MULTIPLIER } from '@/constants/physics'
import type { SliderRange } from '@/constants/sliderBounds'

// 400 px horizontal drag = full slider range
const SCRUB_PX_FULL_RANGE = 400
const SCRUB_DEADZONE_PX   = 3

export default defineComponent({
  props: {
    sliderRanges:       { type: Object as PropType<SliderRange>, required: true },
    thermalDangerLevel: { type: String as PropType<'safe' | 'hyperthermic' | 'denaturing' | 'vaporizing'>, required: true },
  },

  data() {
    return {
      THERMAL_LEVEL,
      editingField:  false,
      fieldInputVal: 0,
      scrubbing:     false,
      scrubStartX:   0,
      scrubStartVal: 0,
      scrubMoved:    false,
    }
  },

  computed: {
    THRESHOLDS() { return THRESHOLDS },
    CELL_LABEL() { return CELL_LABEL },
    ...mapStores(useCellStore),

    currentField(): number       { return this.cellStore.fieldIntensity },
    targetDisruption(): number   { return this.cellStore.targetDisruptionRatio },
    healthyDisruption(): number  { return this.cellStore.healthyDisruptionRatio },
    fieldDisplay(): string       { return formatFieldVcm(this.currentField) },
    targetDisruptPercent(): string  { return (this.targetDisruption * 100).toFixed(0) },
    healthyDisruptPercent(): string { return (this.healthyDisruption * 100).toFixed(0) },

    fieldInputUnit(): string { return this.currentField >= FIELD_KV_THRESHOLD ? 'kV/cm' : 'V/cm' },
    fieldInputStep(): number { return this.currentField >= FIELD_KV_THRESHOLD ? 0.1 : 1 },

    fieldMarkers(): Array<{ id: string; pct: number; color: string }> {
      const { fieldMin, fieldMax } = this.sliderRanges
      const span = fieldMax - fieldMin

      const linPct = (vcm: number): number => (vcm - fieldMin) / span * 100

      return [
        { id: 'lysis-t', pct: linPct(this.cellStore.targetLysisField),  color: 'danger'  },
        { id: 'lysis-h', pct: linPct(this.cellStore.healthyLysisField), color: 'healthy' },
      ].filter(m => m.pct >= 1 && m.pct <= 99)
    },

    tipFieldLabel(): string {
      return tipField({
        isResonanceMode:    this.cellStore.isResonanceMode,
        target:             this.cellStore.target as Parameters<typeof tipField>[0]['target'],
        fieldDisplay:       this.fieldDisplay,
        targetDisruption:   this.targetDisruption,
        targetCellCategory: this.cellStore.targetCellCategory,
        targetLysisField:   this.cellStore.targetLysisField,
        healthyLysisField:  this.cellStore.healthyLysisField,
        t:                  this.$t.bind(this),
      })
    },

    tipTargetBadgeLabel(): string {
      const hfireMult  = this.cellStore.waveform === WAVEFORM.H_FIRE ? H_FIRE_THRESHOLD_MULTIPLIER : 1.0
      const tEffMv     = tempCorrectedVth(this.cellStore.target.thresholdVoltage, this.cellStore.targetTemp) * hfireMult * 1000
      const targetWithEff = { ...this.cellStore.target as Parameters<typeof tipTargetBadge>[0]['target'], effThresholdMv: tEffMv }
      return tipTargetBadge({
        isResonanceMode:      this.cellStore.isResonanceMode,
        target:               targetWithEff,
        targetDisruptPercent: this.targetDisruptPercent,
        targetDisruption:     this.targetDisruption,
        targetVmMv:           this.cellStore.targetVm * 1000,
        lysisDelayMs:         this.cellStore.lysisDelayMs,
        t:                    this.$t.bind(this),
      })
    },

    tipHealthyBadgeLabel(): string {
      const hfireMult = this.cellStore.waveform === WAVEFORM.H_FIRE ? H_FIRE_THRESHOLD_MULTIPLIER : 1.0
      const hEffMv    = tempCorrectedVth(this.cellStore.healthy.thresholdVoltage, this.cellStore.healthyTemp) * hfireMult * 1000
      return tipHealthyBadge({
        isResonanceMode:       this.cellStore.isResonanceMode,
        healthyDisruptPercent: this.healthyDisruptPercent,
        healthyDisruption:     this.healthyDisruption,
        healthyVmMv:           this.cellStore.healthyVm * 1000,
        thresholdVoltage:      this.cellStore.healthy.thresholdVoltage,
        effThresholdMv:        hEffMv,
        t:                     this.$t.bind(this),
      })
    },
  },

  beforeUnmount() {
    this.stopScrubField()
  },

  methods: {
    onFieldInput(e: Event) {
      this.cellStore.setFieldIntensity(Number((e.target as HTMLInputElement).value))
      broadcastStateSync()
    },

    // ── Inline type-in edit ───────────────────────────────────────────────────
    startEditField() {
      this.fieldInputVal = this.currentField >= FIELD_KV_THRESHOLD
        ? parseFloat((this.currentField / 1_000).toFixed(1))
        : this.currentField
      this.editingField = true
      this.$nextTick(() => {
        const el = this.$refs.fieldInputEl as HTMLInputElement
        el?.focus(); el?.select()
      })
    },

    commitFieldEdit() {
      if (!this.editingField) return
      let vcm = this.fieldInputVal
      if (this.fieldInputUnit === 'kV/cm') vcm = this.fieldInputVal * 1_000
      const clamped = Math.max(this.sliderRanges.fieldMin, Math.min(this.sliderRanges.fieldMax, vcm))
      this.cellStore.setFieldIntensity(clamped)
      broadcastStateSync()
      this.editingField = false
    },

    onFieldEditKey(e: KeyboardEvent) {
      if (e.key === 'Enter')  { e.preventDefault(); this.commitFieldEdit() }
      if (e.key === 'Escape') { e.preventDefault(); this.editingField = false }
    },

    stepField(dir: number) {
      const stepVcm = this.fieldInputUnit === 'kV/cm' ? this.fieldInputStep * 1_000 : this.fieldInputStep
      const next    = Math.max(this.sliderRanges.fieldMin, Math.min(this.sliderRanges.fieldMax, this.currentField + dir * stepVcm))
      this.cellStore.setFieldIntensity(next)
      broadcastStateSync()
    },

    // ── Scrub drag on readout value (linear scale) ────────────────────────────
    // Drag right → increase field, drag left → decrease.
    // A single click (no movement past deadzone) opens the type-in editor.
    startScrubField(e: MouseEvent) {
      if (this.editingField) return
      this.scrubbing     = true
      this.scrubMoved    = false
      this.scrubStartX   = e.clientX
      this.scrubStartVal = this.currentField
      document.addEventListener('mousemove', this.onScrubFieldMove)
      document.addEventListener('mouseup',   this.stopScrubField)
    },

    onScrubFieldMove(e: MouseEvent) {
      if (!this.scrubbing) return
      const dx = e.clientX - this.scrubStartX
      if (!this.scrubMoved && Math.abs(dx) < SCRUB_DEADZONE_PX) return
      this.scrubMoved = true
      const range     = this.sliderRanges.fieldMax - this.sliderRanges.fieldMin
      const newField  = this.scrubStartVal + dx * (range / SCRUB_PX_FULL_RANGE)
      const clamped   = Math.max(this.sliderRanges.fieldMin, Math.min(this.sliderRanges.fieldMax, newField))
      this.cellStore.setFieldIntensity(clamped)
      broadcastStateSync()
    },

    stopScrubField() {
      if (!this.scrubbing) return
      document.removeEventListener('mousemove', this.onScrubFieldMove)
      document.removeEventListener('mouseup',   this.stopScrubField)
      if (!this.scrubMoved) this.startEditField()
      this.scrubbing = false
    },
  },
})
</script>

<style lang="scss" scoped>


// thumb-danger-pulse and state-blink are defined globally in styles/_keyframes.scss

.field-panel {
  &__row {
    @include field-row-grid();
    padding-bottom: 0.45rem;

    &--hyperthermic .field-panel__slider {
      &::-webkit-slider-thumb { background: var(--color-amber);  box-shadow: 0 0 6px  color-mix(in srgb, var(--color-amber) 50%, transparent); }
      &::-moz-range-thumb     { background: var(--color-amber); }
    }

    &--denaturing .field-panel__slider {
      &::-webkit-slider-thumb { background: var(--color-orange); box-shadow: 0 0 8px  color-mix(in srgb, var(--color-orange) 70%, transparent); }
      &::-moz-range-thumb     { background: var(--color-orange); }
    }

    &--vaporizing .field-panel__slider {
      &::-webkit-slider-thumb { background: var(--color-danger); box-shadow: 0 0 10px color-mix(in srgb, var(--color-danger) 90%, transparent); animation: thumb-danger-pulse 0.5s ease-in-out infinite; }
      &::-moz-range-thumb     { background: var(--color-danger); }
    }
  }

  &__row-header { @include field-row-header(); }

  &__row-label { @include row-label(); }

  &__track { position: relative; display: flex; align-items: center; }

  // ── Lysis-field threshold markers on the slider track ───────────────────
  &__track-mark {
    position: absolute;
    top: 50%;
    transform: translate(-50%, -50%);
    width: 2px;
    height: 10px;
    border-radius: 1px;
    pointer-events: none;
    z-index: 1;

    &--danger  { background: var(--color-danger);  opacity: var(--op-muted); }
    &--healthy { background: var(--color-primary); opacity: var(--op-muted); }
  }

  &__slider {
    @include slider-track();
    @include slider-thumb();
  }

  &__readout {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem;
    flex-shrink: 0;

    &-value {
      font-size: var(--fs-2xl);
      font-weight: 700;
      font-family: var(--font-mono);
      color: var(--color-text-heading);
      letter-spacing: -0.02em;
      line-height: 1;
      white-space: nowrap;

      &--editable {
        cursor: ew-resize;
        user-select: none;
        border-bottom: 1px dashed transparent;
        transition: border-color var(--tr-fast);
        &:hover { border-bottom-color: color-mix(in srgb, var(--color-primary) 40%, transparent); }
      }
    }

    &-edit {
      display: flex;
      align-items: baseline;
      justify-content: flex-end;
      gap: 0.2rem;
      width: 100%;
    }

    &-input { @include readout-inline-input(); }

    &-input-unit {
      font-size: var(--fs-xxs);
      font-family: var(--font-mono);
      color: var(--color-primary);
      white-space: nowrap;
      flex-shrink: 0;
    }

    &-steps {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0.2rem;
    }

    &-steps-unit {
      font-size: var(--fs-xxs);
      font-family: var(--font-mono);
      color: var(--color-text-muted);
      opacity: var(--op-muted);
    }

    &-step { @include readout-step-btn(); }
  }

  &__badges {
    display: flex;
    gap: 0.35rem;
    align-items: center;
  }

  &__badge {
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 0.1rem 0.35rem;
    border-radius: 3px;
    border: 1px solid transparent;
    transition: color var(--tr-normal), border-color var(--tr-normal);

    &--target  { color: var(--color-danger); border-color: color-mix(in srgb, var(--color-danger) 30%, transparent); }
    &--healthy { color: var(--color-accent); border-color: color-mix(in srgb, var(--color-primary) 30%, transparent); }

    &--warn {
      &.field-panel__badge--target  { background-color: color-mix(in srgb, var(--color-danger) 12%, transparent); border-color: var(--color-danger); }
      &.field-panel__badge--healthy { background-color: color-mix(in srgb, var(--color-primary) 12%, transparent);  border-color: var(--color-accent); }
    }
  }
}
</style>
