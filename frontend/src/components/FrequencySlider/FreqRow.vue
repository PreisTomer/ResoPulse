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
  <div id="hl-freq-row" class="field-panel__row field-panel__row--interactive">
    <div class="field-panel__row-header">
      <span class="field-panel__row-label" v-tip="tipFreqLabel">{{ $t('slider.rfFrequency') }}</span>
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
          @mousedown.prevent="startScrubFreq"
        >{{ freqDisplay }}</span>
        <span class="field-panel__readout-sub" v-tip="tipFcSubLabel">{{ freqSubDisplay }}</span>
        <div v-if="!editingFreq" class="field-panel__readout-steps">
          <button class="field-panel__readout-step" type="button" @click="stepFreq(-1)">−</button>
          <span class="field-panel__readout-steps-unit">{{ freqInputUnit }}</span>
          <button class="field-panel__readout-step" type="button" @click="stepFreq(1)">+</button>
        </div>
      </div>
    </div>
    <div class="field-panel__track">
      <input
        class="field-panel__slider"
        type="range"
        :min="freqLogMin"
        :max="freqLogMax"
        step="0.005"
        :value="freqLogVal"
        @input="onFreqInput"
      />
      <div
        v-for="mark in freqMarkers"
        :key="mark.id"
        class="field-panel__track-mark"
        :class="`field-panel__track-mark--${mark.color}`"
        :style="{ left: mark.pct + '%' }"
      />
    </div>
  </div>

  <!-- Frequency coupling regime badge -->
  <div
    class="field-panel__regime"
    :class="`field-panel__regime--${cellStore.freqRegime}`"
    v-tip="tipFreqRegime"
  >
    <span class="field-panel__regime-dot"></span>
    {{ $t(`slider.regime.${cellStore.freqRegime}`) }}
  </div>

  <!-- Electrode polarization warning (< 50 kHz, IRE mode only) -->
  <div
    v-if="cellStore.isElectrodePolarizationRisk"
    class="field-panel__ep-warn"
    v-tip="$t('slider.electrodePolarizationTip')"
  >
    {{ $t('slider.electrodePolarizationWarn') }}
  </div>

  <!-- GHz + high-field hardware inaccessibility warning -->
  <div
    v-if="cellStore.isGhzHighFieldWarning"
    class="field-panel__ep-warn field-panel__ep-warn--danger"
    v-tip="$t('slider.ghzHighFieldTip')"
  >
    {{ $t('slider.ghzHighFieldWarn') }}
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import type { PropType } from 'vue'
import { mapStores } from 'pinia'

import { useCellStore } from '@/stores/cellStore'

import { broadcastStateSync } from '@/services/socket'

import { formatFreqKHz } from '@/utils/format'
import { tipFreq, tipFcSub, tipOptimalBtn } from '@/tooltips/sliderTooltips'

import { CELL_CATEGORY, FREQ_REGIME } from '@/constants/strings'
import { ICON } from '@/constants/icons'
import type { SliderRange } from '@/constants/sliderBounds'

// 150 px horizontal drag = one decade of frequency change
const SCRUB_PX_PER_DECADE = 150
// Minimum drag before scrub activates (prevents accidental clicks from scrubbing)
const SCRUB_DEADZONE_PX   = 3

export default defineComponent({
  props: {
    sliderRanges: { type: Object as PropType<SliderRange>, required: true },
  },

  data() {
    return {
      editingFreq:   false,
      freqInputVal:  0,
      scrubbing:     false,
      scrubStartX:   0,
      scrubStartVal: 0,
      scrubMoved:    false,
    }
  },

  computed: {
    ...mapStores(useCellStore),
    ICON() { return ICON },

    currentFreq(): number      { return this.cellStore.currentBroadcastFrequency },
    isResonanceMode(): boolean { return this.cellStore.isResonanceMode },
    targetFcDisplay(): string  { return formatFreqKHz(this.cellStore.targetFc) },
    healthyFcDisplay(): string { return formatFreqKHz(this.cellStore.healthyFc) },
    freqDisplay(): string      { return formatFreqKHz(this.currentFreq) },

    // ── Log-scale slider bounds ───────────────────────────────────────────────
    freqLogMin(): number { return Math.log10(Math.max(1, this.sliderRanges.freqMin)) },
    freqLogMax(): number { return Math.log10(this.sliderRanges.freqMax) },
    freqLogVal(): number { return Math.log10(Math.max(this.sliderRanges.freqMin || 1, this.currentFreq)) },

    freqSubDisplay(): string {
      if (this.isResonanceMode) {
        const t = this.cellStore.target as { resonantFreqGHz?: number }
        if (t.resonantFreqGHz) {
          return this.$t('slider.fResSub', { freq: formatFreqKHz(t.resonantFreqGHz * 1_000_000) })
        }
        return this.$t('resonance.noResonance')
      }
      return this.$t('slider.fcSub', { target: this.targetFcDisplay, healthy: this.healthyFcDisplay })
    },

    optimalFreqResult(): { khz: number; sel: number } { return this.cellStore.optimalFreqResult },

    optimalBeyondRange(): boolean {
      const { khz } = this.optimalFreqResult
      return khz > this.sliderRanges.freqMax || khz < this.sliderRanges.freqMin
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

    freqMarkers(): Array<{ id: string; pct: number; color: string }> {
      const logMin = this.freqLogMin
      const logMax = this.freqLogMax
      const span   = logMax - logMin

      const logPct = (khz: number): number => {
        if (khz <= 0) return -1
        return (Math.log10(khz) - logMin) / span * 100
      }

      if (this.isResonanceMode) {
        const t = this.cellStore.target as { resonantFreqGHz?: number }
        if (!t.resonantFreqGHz) return []
        const pct = logPct(t.resonantFreqGHz * 1_000_000)
        if (pct < 1 || pct > 99) return []
        return [{ id: 'fres', pct, color: 'purple' }]
      }

      return [
        { id: 'fc-t', pct: logPct(this.cellStore.targetFc),        color: 'danger'  },
        { id: 'fc-h', pct: logPct(this.cellStore.healthyFc),       color: 'primary' },
        { id: 'opt',  pct: logPct(this.optimalFreqResult.khz), color: 'optimal' },
      ].filter(m => m.pct >= 1 && m.pct <= 99)
    },

    tipFreqLabel(): string       { return tipFreq(this.freqDisplay, this.targetFcDisplay, this.healthyFcDisplay) },
    tipFcSubLabel(): string {
      return tipFcSub({
        targetLabel:      this.cellStore.target.label,
        healthyLabel:     this.cellStore.healthy.label,
        targetFcDisplay:  this.targetFcDisplay,
        healthyFcDisplay: this.healthyFcDisplay,
        targetCategory:   this.cellStore.targetCellCategory,
      })
    },
    tipOptimalBtnLabel(): string { return tipOptimalBtn(this.optimalBeyondRange) },
    tipSnapFcH(): string         { return this.$t('slider.tipSnapFcH', { fc: this.healthyFcDisplay }) },
    tipSnapFcT(): string         { return this.$t('slider.tipSnapFcT', { fc: this.targetFcDisplay }) },

    tipFreqRegime(): string {
      const tips: Record<string, string> = {
        electrolytic: this.$t('slider.regime.tipElectrolytic'),
        nearfield_rf: this.$t('slider.regime.tipNearfieldRf'),
        microwave:    this.$t('slider.regime.tipMicrowave'),
      }
      let tip = tips[this.cellStore.freqRegime] ?? ''
      if (
        this.isResonanceMode &&
        this.cellStore.targetCellCategory !== CELL_CATEGORY.MAMMALIAN &&
        this.cellStore.freqRegime !== FREQ_REGIME.MICROWAVE
      ) {
        const t = this.cellStore.target as { resonantFreqGHz?: number }
        const fRes = t.resonantFreqGHz ? ` (f_res = ${t.resonantFreqGHz} GHz)` : ''
        tip += `\n\n${this.ICON.WARNING} Resonance mode active${fRes}: acoustic capsid disruption requires GHz delivery, rectangular waveguide or resonant cavity hardware needed. Current frequency is below the resonant target.`
      }
      return tip
    },
  },

  beforeUnmount() {
    this.stopScrubFreq()
  },

  methods: {
    // ── Log-scale slider input ────────────────────────────────────────────────
    onFreqInput(e: Event) {
      const logVal = Number((e.target as HTMLInputElement).value)
      const khz    = Math.round(Math.pow(10, logVal))
      this.cellStore.setBroadcastFreqKHz(
        Math.max(this.sliderRanges.freqMin, Math.min(this.sliderRanges.freqMax, khz))
      )
      broadcastStateSync()
    },

    snapToFc(cellType: 'healthy' | 'target') {
      const fcKhz   = cellType === 'healthy' ? this.cellStore.healthyFc : this.cellStore.targetFc
      const snapped = Math.round(Math.max(this.sliderRanges.freqMin, Math.min(this.sliderRanges.freqMax, fcKhz)))
      this.cellStore.setBroadcastFreqKHz(snapped)
      broadcastStateSync()
    },

    snapToOptimal() {
      const { khz } = this.optimalFreqResult
      const snapped = Math.round(Math.max(this.sliderRanges.freqMin, Math.min(this.sliderRanges.freqMax, khz)))
      this.cellStore.setBroadcastFreqKHz(snapped)
      broadcastStateSync()
    },

    // ── Inline type-in edit ───────────────────────────────────────────────────
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
      this.cellStore.setBroadcastFreqKHz(clamped)
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
      this.cellStore.setBroadcastFreqKHz(next)
      broadcastStateSync()
    },

    // ── Scrub drag on readout value ───────────────────────────────────────────
    // Drag right → increase freq (log scale), drag left → decrease.
    // A single click (no movement past deadzone) opens the type-in editor.
    startScrubFreq(e: MouseEvent) {
      if (this.editingFreq) return
      this.scrubbing     = true
      this.scrubMoved    = false
      this.scrubStartX   = e.clientX
      this.scrubStartVal = this.currentFreq
      document.addEventListener('mousemove', this.onScrubFreqMove)
      document.addEventListener('mouseup',   this.stopScrubFreq)
    },

    onScrubFreqMove(e: MouseEvent) {
      if (!this.scrubbing) return
      const dx = e.clientX - this.scrubStartX
      if (!this.scrubMoved && Math.abs(dx) < SCRUB_DEADZONE_PX) return
      this.scrubMoved  = true
      const newFreq    = Math.round(this.scrubStartVal * Math.pow(10, dx / SCRUB_PX_PER_DECADE))
      const clamped    = Math.max(this.sliderRanges.freqMin, Math.min(this.sliderRanges.freqMax, newFreq))
      this.cellStore.setBroadcastFreqKHz(clamped)
      broadcastStateSync()
    },

    stopScrubFreq() {
      if (!this.scrubbing) return
      document.removeEventListener('mousemove', this.onScrubFreqMove)
      document.removeEventListener('mouseup',   this.stopScrubFreq)
      // No drag → treat as a click and open the type-in editor
      if (!this.scrubMoved) this.startEditFreq()
      this.scrubbing = false
    },
  },
})
</script>

<style lang="scss" scoped>


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
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--color-purple);
    background: var(--color-purple-dim);
    border: 1px solid var(--color-purple-border);
    border-radius: 4px;
    white-space: nowrap;
    cursor: pointer;
    transition: background var(--tr-fast), border-color var(--tr-fast), color var(--tr-fast), box-shadow var(--tr-fast);

    &:hover {
      background: color-mix(in srgb, var(--color-purple) 18%, transparent);
      border-color: color-mix(in srgb, var(--color-purple) 60%, transparent);
      color: var(--color-purple-light);
      box-shadow: 0 0 8px color-mix(in srgb, var(--color-purple) 25%, transparent);
    }

    &:active { background: color-mix(in srgb, var(--color-purple) 25%, transparent); }

    &--beyond {
      color: var(--color-text-muted);
      background: color-mix(in srgb, var(--color-text-muted) 6%, transparent);
      border-color: color-mix(in srgb, var(--color-text-muted) 20%, transparent);
      &:hover { background: color-mix(in srgb, var(--color-text-muted) 12%, transparent); border-color: color-mix(in srgb, var(--color-text-muted) 35%, transparent); box-shadow: none; color: var(--color-text-muted); }
    }

    &--fc   { font-size: var(--fs-xxs); padding: 0.15rem 0.45rem; }

    &--fc-h {
      color: var(--color-primary);
      background: color-mix(in srgb, var(--color-primary) 6%, transparent);
      border-color: color-mix(in srgb, var(--color-primary) 25%, transparent);
      &:hover { background: color-mix(in srgb, var(--color-primary) 14%, transparent); border-color: color-mix(in srgb, var(--color-primary) 50%, transparent); color: var(--color-primary); box-shadow: 0 0 6px color-mix(in srgb, var(--color-primary) 20%, transparent); }
    }

    &--fc-t {
      color: var(--color-danger);
      background: color-mix(in srgb, var(--color-danger) 6%, transparent);
      border-color: color-mix(in srgb, var(--color-danger) 25%, transparent);
      &:hover { background: color-mix(in srgb, var(--color-danger) 14%, transparent); border-color: color-mix(in srgb, var(--color-danger) 50%, transparent); color: var(--color-danger); box-shadow: 0 0 6px color-mix(in srgb, var(--color-danger) 20%, transparent); }
    }
  }

  &__row {
    @include field-row-grid();
    padding-bottom: 0.45rem;
  }

  &__row-header { @include field-row-header(); }

  &__row-label { @include row-label(); }

  &__track { position: relative; display: flex; align-items: center; }

  // ── Significant-value markers on the slider track ────────────────────────
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
    &--primary { background: var(--color-primary); opacity: var(--op-muted); }
    &--optimal { background: var(--color-purple);  opacity: 0.60; } // intentional between-tier value
    &--purple  { background: var(--color-purple);  opacity: 0.60; } // intentional between-tier value
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

    &-sub {
      font-size: var(--fs-xxs);
      font-family: var(--font-mono);
      color: var(--color-text-muted);
      white-space: nowrap;
      opacity: 0.82; // intentional between-tier value
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

  &__regime {
    display: inline-flex;
    align-items: center;
    align-self: flex-start;
    gap: 0.3rem;
    font-size: var(--fs-xs);
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
    transition: color var(--tr-normal), border-color var(--tr-normal), background var(--tr-normal);

    &--electrolytic { color: var(--color-primary);    border-color: color-mix(in srgb, var(--color-primary) 30%, transparent); background: color-mix(in srgb, var(--color-primary) 5%, transparent); }
    &--nearfield_rf { color: var(--color-amber-warm); border-color: color-mix(in srgb, var(--color-amber) 35%, transparent); background: color-mix(in srgb, var(--color-amber) 6%, transparent); }
    &--microwave    { color: var(--color-danger);      border-color: color-mix(in srgb, var(--color-danger) 35%, transparent); background: color-mix(in srgb, var(--color-danger) 6%, transparent); }
  }

  &__regime-dot {
    width: 4px; height: 4px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  &__regime--electrolytic &__regime-dot { background: var(--color-primary); }
  &__regime--nearfield_rf &__regime-dot { background: var(--color-amber-warm); }
  &__regime--microwave    &__regime-dot { background: var(--color-danger); }

  &__ep-warn {
    font-size: var(--fs-xxs);
    font-family: var(--font-mono);
    color: var(--color-amber-warm);
    background: color-mix(in srgb, var(--color-amber) 8%, transparent);
    border: 1px solid color-mix(in srgb, var(--color-amber) 35%, transparent);
    border-radius: var(--radius);
    padding: 0.3rem 0.65rem;
    line-height: 1.4;
    cursor: default;

    &--danger {
      color: var(--color-danger);
      background: color-mix(in srgb, var(--color-danger) 8%, transparent);
      border-color: color-mix(in srgb, var(--color-danger) 35%, transparent);
    }

    @media (max-width: 768px) { display: none; }
  }
}
</style>
