<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <!-- Snap to Optimal / fc buttons (non-resonance only) -->
  <div v-if="!isResonanceMode" class="field-panel__optimal-row">
    <button
      class="field-panel__optimal-btn field-panel__optimal-btn--fc field-panel__optimal-btn--fc-h"
      v-tip="tipSnapFcH" @click="snapToFc('healthy')" type="button"
    >{{ $t('slider.snapFcH') }} {{ healthyFcDisplay }}</button>
    <button
      class="field-panel__optimal-btn field-panel__optimal-btn--fc field-panel__optimal-btn--fc-t"
      v-tip="tipSnapFcT" @click="snapToFc('target')" type="button"
    >{{ $t('slider.snapFcT') }} {{ targetFcDisplay }}</button>
    <button
      class="field-panel__optimal-btn"
      :class="{ 'field-panel__optimal-btn--beyond': optimalBeyondRange }"
      v-tip="tipOptimalBtnLabel" @click="snapToOptimal" type="button"
    >{{ $t('slider.snapOptimal') }} {{ optimalFreqLabel }}</button>
  </div>

  <!-- RF Frequency row -->
  <div class="field-panel__row field-panel__row--interactive">
    <span class="field-panel__row-label" v-tip="tipFreqLabel">{{ $t('slider.rfFrequency') }}</span>
    <div class="field-panel__track">
      <input
        class="field-panel__slider"
        type="range"
        :min="sliderRanges.freqMin"
        :max="sliderRanges.freqMax"
        :step="sliderRanges.freqStep"
        :value="currentFreq"
        @input="onFreqInput"
      />
    </div>
    <div class="field-panel__readout">
      <div v-if="editingFreq" class="field-panel__readout-edit">
        <input
          ref="freqInputEl"
          class="field-panel__readout-input"
          type="number"
          :step="freqInputStep"
          v-model.number="freqInputVal"
          @keydown="onFreqEditKey"
          @blur="commitFreqEdit"
        />
        <span class="field-panel__readout-input-unit">{{ freqInputUnit }}</span>
      </div>
      <span
        v-else
        class="field-panel__readout-value field-panel__readout-value--editable"
        v-tip="tipFreqLabel"
        @click="startEditFreq"
      >{{ freqDisplay }}</span>
      <span class="field-panel__readout-sub" v-tip="tipFcSubLabel">{{ freqSubDisplay }}</span>
      <div v-if="!editingFreq" class="field-panel__readout-steps">
        <button class="field-panel__readout-step" type="button" @click="stepFreq(-1)">−</button>
        <span class="field-panel__readout-steps-unit">{{ freqInputUnit }}</span>
        <button class="field-panel__readout-step" type="button" @click="stepFreq(1)">+</button>
      </div>
    </div>
  </div>

  <!-- Frequency coupling regime badge -->
  <div
    class="field-panel__regime"
    :class="`field-panel__regime--${store.freqRegime}`"
    v-tip="tipFreqRegime"
  >
    <span class="field-panel__regime-dot"></span>
    {{ $t(`slider.regime.${store.freqRegime}`) }}
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import type { PropType } from 'vue'
import { useCellStore } from '@/stores/cellStore'
import { broadcastStateSync } from '@/services/socket'
import { CHART_MODE, CELL_CATEGORY, FREQ_REGIME } from '@/constants/strings'
import { ICON } from '@/constants/icons'
import type { SliderRange } from '@/constants/sliderBounds'
import { formatFreqKHz } from '@/utils/format'
import { tipFreq, tipFcSub, tipOptimalBtn } from '@/tooltips/sliderTooltips'

export default defineComponent({
  props: {
    sliderRanges: { type: Object as PropType<SliderRange>, required: true },
  },

  setup() {
    return { store: useCellStore(), ICON }
  },

  data() {
    return {
      editingFreq:  false,
      freqInputVal: 0,
    }
  },

  computed: {
    currentFreq(): number       { return this.store.currentBroadcastFrequency },
    isResonanceMode(): boolean  { return this.store.chartMode === CHART_MODE.RESONANCE },
    targetFcDisplay(): string   { return formatFreqKHz(this.store.targetFc) },
    healthyFcDisplay(): string  { return formatFreqKHz(this.store.healthyFc) },
    freqDisplay(): string       { return formatFreqKHz(this.currentFreq) },

    freqSubDisplay(): string {
      if (this.isResonanceMode) {
        const t = this.store.target as { resonantFreqGHz?: number }
        if (t.resonantFreqGHz) {
          return this.$t('slider.fResSub', { freq: formatFreqKHz(t.resonantFreqGHz * 1_000_000) })
        }
        return this.$t('resonance.noResonance')
      }
      return this.$t('slider.fcSub', { target: this.targetFcDisplay, healthy: this.healthyFcDisplay })
    },

    optimalFreqResult(): { khz: number; sel: number } { return this.store.optimalFreqResult },

    optimalBeyondRange(): boolean {
      return this.optimalFreqResult.khz > this.sliderRanges.freqMax
    },

    optimalFreqLabel(): string {
      const { khz, sel } = this.optimalFreqResult
      return ` ${formatFreqKHz(khz)} · ×${sel >= 99 ? ICON.INFINITY : sel.toFixed(2)}${this.optimalBeyondRange ? ICON.BEYOND : ''}`
    },

    freqInputUnit(): string {
      const f = this.currentFreq
      if (f >= 1_000_000) return 'GHz'
      if (f >= 1_000)     return 'MHz'
      return 'kHz'
    },

    freqInputStep(): number {
      const f = this.currentFreq
      if (f >= 1_000_000) return 0.001
      if (f >= 1_000)     return 0.1
      return 1
    },

    tipFreqLabel(): string       { return tipFreq(this.freqDisplay, this.targetFcDisplay, this.healthyFcDisplay) },
    tipFcSubLabel(): string      { return tipFcSub() },
    tipOptimalBtnLabel(): string { return tipOptimalBtn(this.optimalBeyondRange) },
    tipSnapFcH(): string         { return this.$t('slider.tipSnapFcH', { fc: this.healthyFcDisplay }) },
    tipSnapFcT(): string         { return this.$t('slider.tipSnapFcT', { fc: this.targetFcDisplay }) },

    tipFreqRegime(): string {
      const tips: Record<string, string> = {
        electrolytic: this.$t('slider.regime.tipElectrolytic'),
        nearfield_rf: this.$t('slider.regime.tipNearfieldRf'),
        microwave:    this.$t('slider.regime.tipMicrowave'),
      }
      let tip = tips[this.store.freqRegime] ?? ''
      if (
        this.isResonanceMode &&
        this.store.targetCellCategory !== CELL_CATEGORY.MAMMALIAN &&
        this.store.freqRegime !== FREQ_REGIME.MICROWAVE
      ) {
        const t = this.store.target as { resonantFreqGHz?: number }
        const fRes = t.resonantFreqGHz ? ` (f_res = ${t.resonantFreqGHz} GHz)` : ''
        tip += `\n\n⚠ Resonance mode active${fRes}: acoustic capsid disruption requires GHz delivery, rectangular waveguide or resonant cavity hardware needed. Current frequency is below the resonant target.`
      }
      return tip
    },
  },

  methods: {
    onFreqInput(e: Event) {
      this.store.setBroadcastFreqKHz(Number((e.target as HTMLInputElement).value))
      broadcastStateSync()
    },

    snapToFc(cellType: 'healthy' | 'target') {
      const fcKhz = cellType === 'healthy' ? this.store.healthyFc : this.store.targetFc
      const snapped = Math.round(Math.max(this.sliderRanges.freqMin, Math.min(this.sliderRanges.freqMax, fcKhz)))
      this.store.setBroadcastFreqKHz(snapped)
      broadcastStateSync()
    },

    snapToOptimal() {
      const { khz } = this.optimalFreqResult
      const snapped = Math.round(Math.max(this.sliderRanges.freqMin, Math.min(this.sliderRanges.freqMax, khz)))
      this.store.setBroadcastFreqKHz(snapped)
      broadcastStateSync()
    },

    startEditFreq() {
      const f = this.currentFreq
      if (f >= 1_000_000)      this.freqInputVal = parseFloat((f / 1_000_000).toFixed(3))
      else if (f >= 1_000)     this.freqInputVal = parseFloat((f / 1_000).toFixed(2))
      else                     this.freqInputVal = Math.round(f)
      this.editingFreq = true
      this.$nextTick(() => {
        const el = this.$refs.freqInputEl as HTMLInputElement
        el?.focus(); el?.select()
      })
    },

    commitFreqEdit() {
      if (!this.editingFreq) return
      let khz = this.freqInputVal
      if (this.freqInputUnit === 'GHz')      khz = this.freqInputVal * 1_000_000
      else if (this.freqInputUnit === 'MHz') khz = this.freqInputVal * 1_000
      const clamped = Math.max(this.sliderRanges.freqMin, Math.min(this.sliderRanges.freqMax, Math.round(khz)))
      this.store.setBroadcastFreqKHz(clamped)
      broadcastStateSync()
      this.editingFreq = false
    },

    onFreqEditKey(e: KeyboardEvent) {
      if (e.key === 'Enter')  { e.preventDefault(); this.commitFreqEdit() }
      if (e.key === 'Escape') { e.preventDefault(); this.editingFreq = false }
    },

    stepFreq(dir: number) {
      const unit    = this.freqInputUnit
      const step    = this.freqInputStep
      const stepKhz = unit === 'GHz' ? step * 1_000_000 : unit === 'MHz' ? step * 1_000 : step
      const next    = Math.max(this.sliderRanges.freqMin, Math.min(this.sliderRanges.freqMax, this.currentFreq + dir * stepKhz))
      this.store.setBroadcastFreqKHz(next)
      broadcastStateSync()
    },
  },
})
</script>

<style lang="scss" scoped>
@use '../../styles/mixins' as *;

.field-panel {
  &__optimal-row {
    display: flex;
    justify-content: flex-start;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-top: -0.35rem;
    margin-bottom: -0.2rem;
  }

  &__optimal-btn {
    display: inline-flex;
    align-items: center;
    gap: 0.2rem;
    padding: 0.18rem 0.55rem;
    font-size: 0.65rem;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #a78bfa;
    background: rgba(167, 139, 250, 0.1);
    border: 1px solid rgba(167, 139, 250, 0.35);
    border-radius: 4px;
    white-space: nowrap;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s, color 0.15s, box-shadow 0.15s;

    &:hover {
      background: rgba(167, 139, 250, 0.18);
      border-color: rgba(167, 139, 250, 0.6);
      color: #c4b5fd;
      box-shadow: 0 0 8px rgba(167, 139, 250, 0.25);
    }

    &:active { background: rgba(167, 139, 250, 0.25); }

    &--beyond {
      color: var(--color-text-muted);
      background: rgba(148, 163, 184, 0.06);
      border-color: rgba(148, 163, 184, 0.2);
      &:hover { background: rgba(148, 163, 184, 0.12); border-color: rgba(148, 163, 184, 0.35); box-shadow: none; color: var(--color-text-muted); }
    }

    &--fc   { font-size: 0.62rem; padding: 0.15rem 0.45rem; }

    &--fc-h {
      color: var(--color-primary);
      background: rgba(0, 212, 255, 0.06);
      border-color: rgba(0, 212, 255, 0.25);
      &:hover { background: rgba(0, 212, 255, 0.14); border-color: rgba(0, 212, 255, 0.5); color: var(--color-primary); box-shadow: 0 0 6px rgba(0, 212, 255, 0.2); }
    }

    &--fc-t {
      color: var(--color-danger);
      background: rgba(239, 68, 68, 0.06);
      border-color: rgba(239, 68, 68, 0.25);
      &:hover { background: rgba(239, 68, 68, 0.14); border-color: rgba(239, 68, 68, 0.5); color: var(--color-danger); box-shadow: 0 0 6px rgba(239, 68, 68, 0.2); }
    }
  }

  &__row { @include field-row-grid(7.5rem, 8.5rem); }

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

    &-sub {
      font-size: 0.64rem;
      font-family: var(--font-mono);
      color: var(--color-text-muted);
      white-space: nowrap;
      opacity: 0.82;
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

  &__regime {
    display: inline-flex;
    align-items: center;
    align-self: flex-start;
    gap: 0.3rem;
    font-size: 0.58rem;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 0.12rem 0.5rem;
    border-radius: 10px;
    border: 1px solid transparent;
    cursor: default;
    white-space: nowrap;
    margin-top: -0.4rem;
    margin-bottom: -0.25rem;
    transition: color 0.2s, border-color 0.2s, background 0.2s;

    &--electrolytic { color: var(--color-primary);           border-color: rgba(0, 212, 255, 0.3);   background: rgba(0, 212, 255, 0.05); }
    &--nearfield_rf  { color: var(--color-amber-warm);        border-color: rgba(251, 191, 36, 0.35); background: rgba(251, 191, 36, 0.06); }
    &--microwave     { color: var(--color-danger, #ff4d6d);   border-color: rgba(255, 77, 109, 0.35); background: rgba(255, 77, 109, 0.06); }
  }

  &__regime-dot {
    width: 4px; height: 4px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  &__regime--electrolytic &__regime-dot { background: var(--color-primary); }
  &__regime--nearfield_rf &__regime-dot { background: var(--color-amber-warm); }
  &__regime--microwave    &__regime-dot { background: var(--color-danger, #ff4d6d); }
}
</style>
