<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div
    class="field-panel__row field-panel__row--interactive"
    :class="thermalDangerLevel !== THERMAL_LEVEL.SAFE ? `field-panel__row--${thermalDangerLevel}` : ''"
  >
    <span class="field-panel__row-label" v-tip="tipFieldLabel">{{ $t('slider.fieldIntensity') }}</span>
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
    </div>
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
        @click="startEditField"
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
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import type { PropType } from 'vue'
import { useCellStore } from '@/stores/cellStore'
import { broadcastStateSync } from '@/services/socket'
import { CELL_LABEL, THERMAL_LEVEL } from '@/constants/strings'
import { THRESHOLDS } from '@/constants/cellCard'
import type { SliderRange } from '@/constants/sliderBounds'
import { formatFieldVcm } from '@/utils/format'
import { tipField, tipTargetBadge, tipHealthyBadge } from '@/tooltips/sliderTooltips'

export default defineComponent({
  props: {
    sliderRanges:       { type: Object as PropType<SliderRange>, required: true },
    thermalDangerLevel: { type: String as PropType<'safe' | 'hyperthermic' | 'denaturing' | 'vaporizing'>, required: true },
  },

  setup() {
    return { store: useCellStore(), CELL_LABEL, THERMAL_LEVEL, THRESHOLDS }
  },

  data() {
    return {
      editingField:  false,
      fieldInputVal: 0,
    }
  },

  computed: {
    currentField(): number       { return this.store.fieldIntensity },
    targetDisruption(): number   { return this.store.targetDisruptionRatio },
    healthyDisruption(): number  { return this.store.healthyDisruptionRatio },
    fieldDisplay(): string       { return formatFieldVcm(this.currentField) },
    targetDisruptPercent(): string  { return (this.targetDisruption * 100).toFixed(0) },
    healthyDisruptPercent(): string { return (this.healthyDisruption * 100).toFixed(0) },

    fieldInputUnit(): string { return this.currentField >= 10_000 ? 'kV/cm' : 'V/cm' },
    fieldInputStep(): number { return this.currentField >= 10_000 ? 0.1 : 1 },

    tipFieldLabel(): string {
      return tipField({
        chartMode:          this.store.chartMode,
        target:             this.store.target as Parameters<typeof tipField>[0]['target'],
        fieldDisplay:       this.fieldDisplay,
        targetDisruption:   this.targetDisruption,
        targetCellCategory: this.store.targetCellCategory,
        targetLysisField:   this.store.targetLysisField,
        healthyLysisField:  this.store.healthyLysisField,
        t:                  this.$t.bind(this),
      })
    },

    tipTargetBadgeLabel(): string {
      return tipTargetBadge({
        chartMode:            this.store.chartMode,
        target:               this.store.target as Parameters<typeof tipTargetBadge>[0]['target'],
        targetDisruptPercent: this.targetDisruptPercent,
        targetDisruption:     this.targetDisruption,
        targetVmMv:           this.store.targetVm * 1000,
        lysisDelayMs:         this.store.lysisDelayMs,
        t:                    this.$t.bind(this),
      })
    },

    tipHealthyBadgeLabel(): string {
      return tipHealthyBadge({
        chartMode:             this.store.chartMode,
        healthyDisruptPercent: this.healthyDisruptPercent,
        healthyDisruption:     this.healthyDisruption,
        healthyVmMv:           this.store.healthyVm * 1000,
        thresholdVoltage:      this.store.healthy.thresholdVoltage,
        t:                     this.$t.bind(this),
      })
    },
  },

  methods: {
    onFieldInput(e: Event) {
      this.store.setFieldIntensity(Number((e.target as HTMLInputElement).value))
      broadcastStateSync()
    },

    startEditField() {
      this.fieldInputVal = this.currentField >= 10_000
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
      this.store.setFieldIntensity(clamped)
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
      this.store.setFieldIntensity(next)
      broadcastStateSync()
    },
  },
})
</script>

<style lang="scss" scoped>
@use '../../styles/mixins' as *;

@keyframes thumb-danger-pulse {
  0%, 100% { box-shadow: 0 0 6px rgba(255, 77, 109, 0.6); }
  50%       { box-shadow: 0 0 16px rgba(255, 77, 109, 1.0); }
}

@keyframes state-blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.35; }
}

.field-panel {
  &__row {
    @include field-row-grid(7.5rem, 8.5rem);

    &--hyperthermic .field-panel__slider {
      &::-webkit-slider-thumb { background: var(--color-amber);  box-shadow: 0 0 6px  rgba(251, 191, 36, 0.5); }
      &::-moz-range-thumb     { background: var(--color-amber); }
    }

    &--denaturing .field-panel__slider {
      &::-webkit-slider-thumb { background: var(--color-orange); box-shadow: 0 0 8px  rgba(251, 130, 20, 0.7); }
      &::-moz-range-thumb     { background: var(--color-orange); }
    }

    &--vaporizing .field-panel__slider {
      &::-webkit-slider-thumb { background: var(--color-danger); box-shadow: 0 0 10px rgba(255, 77, 109, 0.9); animation: thumb-danger-pulse 0.5s ease-in-out infinite; }
      &::-moz-range-thumb     { background: var(--color-danger); }
    }
  }

  &__row-label { @include row-label(); }

  &__track { position: relative; display: flex; align-items: center; }

  &__slider {
    @include slider-track();
    @include slider-thumb();
  }

  &__readout {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.25rem;
    width: 8.5rem;
    overflow: hidden;

    &-value {
      font-size: 1rem;
      font-weight: 700;
      font-family: var(--font-mono);
      color: var(--color-text-heading);
      letter-spacing: -0.02em;
      line-height: 1;
      white-space: nowrap;

      &--editable {
        cursor: text;
        border-bottom: 1px dashed transparent;
        transition: border-color 0.15s;
        &:hover { border-bottom-color: rgba(0, 212, 255, 0.4); }
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
      font-size: 0.6rem;
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
      font-size: 0.48rem;
      font-family: var(--font-mono);
      color: var(--color-text-muted);
      opacity: 0.55;
    }

    &-step { @include readout-step-btn(); }
  }

  &__badges {
    display: flex;
    gap: 0.35rem;
    align-items: center;
  }

  &__badge {
    font-size: 0.6rem;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 0.1rem 0.35rem;
    border-radius: 3px;
    border: 1px solid transparent;
    transition: color 0.2s, border-color 0.2s;

    &--target  { color: var(--color-danger); border-color: rgba(255, 77, 109, 0.3); }
    &--healthy { color: var(--color-accent); border-color: rgba(0, 212, 255, 0.3); }

    &--warn {
      &.field-panel__badge--target  { background-color: rgba(255, 77, 109, 0.12); border-color: var(--color-danger); }
      &.field-panel__badge--healthy { background-color: rgba(0, 212, 255, 0.12);  border-color: var(--color-accent); }
    }
  }
}
</style>
