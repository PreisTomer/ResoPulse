<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div :class="['cell-card', `cell-card--${type}`, `cell-card--${cellState}`, { 'cell-card--compact': compact }]">

    <CellHeader
      v-if="!compact"
      :type="type"
      :label="label"
      :sublabel="sublabel"
      :sublabel-tip="sublabelTip"
      :vm-display="vmDisplay"
      :temp-display="tempDisplay"
      :temp-warning="tempWarning"
      :cell-state="cellState"
      :meta-state-class="metaStateClass"
      :tip-vm="tipVm"
      :tip-temp="tipTemp"
      :tip-state="tipState"
      :double-shell-enabled="store.doubleShellEnabled"
      :has-nuclear-params="hasNuclearParams"
      :nuclear-vm-mv="nuclearVmMv"
      :nuclear-disruption-ratio="nuclearDisruptionRatio"
      :has-cell-data="!!cellData"
    />

    <CellParamsPanel
      v-if="!compact"
      :cell-data="cellData"
      :editable-params="editableParams"
      :derived-params="derivedParams"
      :can-reset-to-preset="canResetToPreset"
      :toggle-tip="paramsToggleTip"
      :derived-label="derivedSectionLabel"
      :derived-tip="derivedSectionTip"
      @param-change="onParamChange"
      @reset-to-preset="resetToPreset"
    />

    <CellVisual
      :type="type"
      :compact="compact"
      :cell-data="cellData"
      @stable-reset="onStableReset"
      @full-reset="onFullReset"
      @thermal-lysis="thermalLysis = $event"
    />

    <CellBody
      v-if="!compact"
      :type="type"
      :description="description"
    />

  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import type { PropType } from 'vue'
import { useCellStore } from '@/stores/cellStore'
import { CELL_PRESETS } from '@/constants/cellLibrary'
import type { CellConfig, CellRecord } from '@/types/cell'
import { membraneCm, computeTau } from '@/utils/physics'
import type { CellState } from '@/types/cell'
import { EDITABLE_PARAMS, EDITABLE_PARAMS_ACOUSTIC, THRESHOLDS } from '@/constants/cellCard'
import { CELL_STATE, CELL_TYPE, CELL_CATEGORY } from '@/constants/strings'
import { UNIT } from '@/constants/units'
import { splitFreqKHz } from '@/utils/format'
import {
  tipVm as tipVmFn,
  tipAcousticVm as tipAcousticVmFn,
  tipTemp as tipTempFn,
  tipState as tipStateFn,
} from '@/tooltips/cellCardTooltips'

import CellHeader     from './CellHeader.vue'
import CellParamsPanel from './CellParamsPanel.vue'
import CellVisual     from './CellVisual.vue'
import CellBody       from './CellBody.vue'

export default defineComponent({
  components: { CellHeader, CellParamsPanel, CellVisual, CellBody },

  emits: ['stable-reset', 'full-reset'],

  props: {
    type: {
      type: String as PropType<'healthy' | 'target'>,
      required: true,
    },
    label:       { type: String, required: true },
    sublabel:    { type: String, required: true },
    sublabelTip: { type: String, default: '' },
    description: { type: String, required: true },
    cellData: {
      type: Object as PropType<CellRecord | null>,
      default: null,
    },
    compact: { type: Boolean, default: false },
  },

  setup() {
    return { store: useCellStore(), CELL_STATE, CELL_TYPE }
  },

  data() {
    return {
      thermalLysis: false,
    }
  },

  computed: {
    cellState(): CellState {
      return this.type === CELL_TYPE.HEALTHY
        ? this.store.healthyCellState
        : this.store.targetCellState
    },

    isAcousticTarget(): boolean {
      if (this.type !== CELL_TYPE.TARGET) return false
      const cat = this.store.targetCellCategory
      if (cat !== CELL_CATEGORY.BACTERIA && cat !== CELL_CATEGORY.VIRUS) return false
      const t = this.store.target as CellConfig & { resonantFreqGHz?: number }
      return !!t.resonantFreqGHz
    },

    vm(): number {
      return (this.type === CELL_TYPE.HEALTHY ? this.store.healthyVm : this.store.targetVm) * 1000
    },

    temperature(): number {
      return this.type === CELL_TYPE.HEALTHY ? this.store.healthyTemp : this.store.targetTemp
    },

    disruptionRatio(): number {
      return this.type === CELL_TYPE.HEALTHY
        ? this.store.healthyDisruptionRatio
        : this.store.targetDisruptionRatio
    },

    vmDisplay(): string {
      if (this.isAcousticTarget) {
        return `DR ${(this.disruptionRatio * 100).toFixed(0)}${UNIT.PERCENT}`
      }
      return `${this.vm.toFixed(1)} ${UNIT.MV}`
    },

    tempDisplay(): string  { return `${this.temperature.toFixed(1)} ${UNIT.DEG_C}` },
    tempWarning():  boolean { return this.temperature > THRESHOLDS.TEMP_WARN },
    tempDenaturing(): boolean { return this.temperature >= THRESHOLDS.TEMP_DENATURING },
    tempVaporizing(): boolean { return this.temperature >= THRESHOLDS.TEMP_VAPORIZING },

    hasNuclearParams(): boolean {
      const cell = this.type === CELL_TYPE.HEALTHY ? this.store.healthy : this.store.target
      return !!cell.nuclearRadius
    },

    nuclearVmMv(): number {
      return (this.type === CELL_TYPE.HEALTHY ? this.store.healthyNuclearVm : this.store.targetNuclearVm) * 1000
    },

    nuclearDisruptionRatio(): number {
      return this.type === CELL_TYPE.HEALTHY
        ? this.store.healthyNuclearDisruptionRatio
        : this.store.targetNuclearDisruptionRatio
    },

    metaStateClass(): string {
      const map: Record<string, string> = {
        [CELL_STATE.STABLE]:      'cell-card__state--stable',
        [CELL_STATE.NOURISHING]:  'cell-card__state--nourishing',
        [CELL_STATE.APPROACHING]: 'cell-card__state--approaching',
        [CELL_STATE.REV_EP]:      'cell-card__state--rev-ep',
        [CELL_STATE.CRITICAL]:    'cell-card__state--critical',
        [CELL_STATE.VIBRATING]:   'cell-card__state--vibrating',
        [CELL_STATE.LYSING]:      'cell-card__state--lysing',
        [CELL_STATE.LYSED]:       'cell-card__state--lysed',
      }
      return map[this.cellState] ?? ''
    },

    canResetToPreset(): boolean {
      const cell = this.type === CELL_TYPE.HEALTHY ? this.store.healthy : this.store.target
      return CELL_PRESETS.some((p) => p.presetId === cell.id)
    },

    editableParams() {
      const cell     = this.type === CELL_TYPE.HEALTHY ? this.store.healthy : this.store.target
      const paramSet = this.isAcousticTarget ? EDITABLE_PARAMS_ACOUSTIC : EDITABLE_PARAMS
      return paramSet.map((p) => ({
        ...p,
        displayValue: (cell as unknown as Record<string, number>)[p.key] ?? 0,
      }))
    },

    derivedParams() {
      const cell    = this.type === CELL_TYPE.HEALTHY ? this.store.healthy : this.store.target
      const sigma_e = this.store.effectiveSigmaE
      const tauNs   = computeTau(cell, sigma_e) * 1e9
      const fc      = this.type === CELL_TYPE.HEALTHY ? this.store.healthyFc : this.store.targetFc
      const fcParts = splitFreqKHz(fc, 2)

      if (this.isAcousticTarget) {
        const acousticCell = cell as CellConfig & { resonantFreqGHz?: number; capsidQ?: number }
        const fResGHz = acousticCell.resonantFreqGHz ?? 0
        const q       = acousticCell.capsidQ ?? 1
        // BW = f_res / Q — half-power bandwidth of the Lorentzian resonance peak
        const bwKHz   = (fResGHz * 1e6) / q
        const bwParts = splitFreqKHz(bwKHz, 2)
        return [
          { label: this.$t('cells.derivedParams.tau'), value: tauNs.toFixed(1), unit: UNIT.NS       },
          { label: this.$t('cells.derivedParams.fc'),  value: fcParts.value,    unit: fcParts.unit  },
          { label: this.$t('cells.derivedParams.bw'),  value: bwParts.value,    unit: bwParts.unit  },
        ]
      }

      const Cm = membraneCm(cell) * 1000
      return [
        { label: this.$t('cells.derivedParams.cm'),  value: Cm.toFixed(2),    unit: UNIT.MF_PER_M2 },
        { label: this.$t('cells.derivedParams.tau'), value: tauNs.toFixed(1), unit: UNIT.NS         },
        { label: this.$t('cells.derivedParams.fc'),  value: fcParts.value,    unit: fcParts.unit    },
      ]
    },

    paramsToggleTip(): string {
      return this.isAcousticTarget
        ? this.$t('cells.paramsToggleTipAcoustic')
        : this.$t('cells.paramsToggleTip')
    },

    derivedSectionLabel(): string {
      return this.isAcousticTarget
        ? this.$t('cells.derivedLabelAcoustic')
        : this.$t('cells.derivedLabel')
    },

    derivedSectionTip(): string {
      return this.isAcousticTarget
        ? this.$t('cells.derivedTipAcoustic')
        : this.$t('cells.derivedTip')
    },

    tipVm(): string {
      if (this.isAcousticTarget) {
        const t = this.store.target as CellConfig & { resonantFreqGHz?: number; capsidQ?: number; experimentalBasis?: string }
        return tipAcousticVmFn({
          disruptionRatio:   this.disruptionRatio,
          resonantFreqGHz:   t.resonantFreqGHz ?? 0,
          capsidQ:           t.capsidQ ?? 1,
          freqKHz:           this.store.currentBroadcastFrequency,
          fieldVcm:          this.store.fieldIntensity,
          experimentalBasis: t.experimentalBasis,
        })
      }
      const cell = this.type === CELL_TYPE.HEALTHY ? this.store.healthy : this.store.target
      return tipVmFn({
        vmDisplay:        this.vmDisplay,
        disruptionRatio:  this.disruptionRatio,
        thresholdVoltage: cell.thresholdVoltage,
        waveform:         this.store.waveform,
      })
    },

    tipTemp(): string {
      return tipTempFn({
        tempDisplay:    this.tempDisplay,
        tempVaporizing: this.tempVaporizing,
        tempDenaturing: this.tempDenaturing,
        tempWarning:    this.tempWarning,
      })
    },

    tipState(): string {
      return tipStateFn({
        cellState:    this.cellState,
        thermalLysis: this.thermalLysis,
        cellType:     this.type,
        lysisDelayMs: this.store.lysisDelayMs,
      })
    },
  },

  methods: {
    onParamChange(key: string, value: number) {
      this.store.updateCellParam(this.type, key, value)
    },

    onStableReset(cellType: string) {
      this.$emit('stable-reset', cellType)
    },

    onFullReset(cellType: string) {
      this.$emit('full-reset', cellType)
    },

    resetToPreset() {
      const cell   = this.type === CELL_TYPE.HEALTHY ? this.store.healthy : this.store.target
      const preset = CELL_PRESETS.find((p) => p.presetId === cell.id)
      if (preset) this.store.loadPreset(this.type, preset)
    },
  },
})
</script>

<style lang="scss" scoped>


/* ── Keyframes (card-level only) ─────────────────────────────────────── */
@keyframes card-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px) rotate(-0.3deg); }
  75% { transform: translateX(2px) rotate(0.3deg); }
}

@keyframes card-warn-pulse {
  0%, 100% { box-shadow: 0 0 22px color-mix(in srgb, var(--color-orange) 30%, transparent); }
  50%       { box-shadow: 0 0 42px color-mix(in srgb, var(--color-orange) 60%, transparent); }
}

@keyframes nourishing-pulse {
  0%, 100% { box-shadow: 0 0 28px color-mix(in srgb, var(--color-primary) 22%, transparent), 0 0 0 1px color-mix(in srgb, var(--color-primary) 10%, transparent); }
  50%       { box-shadow: 0 0 52px color-mix(in srgb, var(--color-primary) 42%, transparent), 0 0 0 1px color-mix(in srgb, var(--color-primary) 22%, transparent); }
}

/* ── Block ───────────────────────────────────────────────────────────── */
.cell-card {
  background-color: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  @include flex-col(1rem);
  transition: border-color var(--tr-normal), box-shadow var(--tr-slow);
  min-width: 0;
  overflow: hidden;

  /* ── Compact modifier ──────────────────────────────────────────────── */
  &--compact {
    padding: 0.5rem;
    border-radius: 6px;
    // Thin state-colored top border — instant traffic-light feedback at a glance
    border-top: 3px solid var(--color-border);

    &.cell-card--nourishing  { border-top-color: var(--color-primary); }
    &.cell-card--approaching { border-top-color: var(--color-amber); }
    &.cell-card--rev-ep      { border-top-color: var(--color-amber); }
    &.cell-card--critical    { border-top-color: var(--color-danger); }
    &.cell-card--vibrating   { border-top-color: var(--color-danger); }
    &.cell-card--lysing      { border-top-color: var(--color-danger); }
    &.cell-card--lysed       { border-top-color: color-mix(in srgb, var(--color-danger) 45%, transparent); }
  }

  /* ── Type modifiers ────────────────────────────────────────────────── */
  &--healthy {
    border-left: 3px solid var(--color-accent);
    &:hover:not(.cell-card--lysed) { border-color: var(--color-accent); }
  }

  &--target {
    border-left: 3px solid var(--color-danger);
    &:hover:not(.cell-card--lysed) { border-color: var(--color-danger); }
  }

  /* ── State modifiers ───────────────────────────────────────────────── */
  &--nourishing {
    animation: nourishing-pulse 2.8s ease-in-out infinite;
    border-left-color: var(--color-accent) !important;
  }

  // Reversible EP window (target, 50-85%): amber glow — permeabilized but survivable
  &--rev-ep.cell-card--target {
    border-left-color: var(--color-amber) !important;
    box-shadow: 0 0 22px color-mix(in srgb, var(--color-amber) 28%, transparent);
    animation: card-warn-pulse 1.8s ease-in-out infinite;
  }

  &--vibrating { box-shadow: 0 0 24px color-mix(in srgb, var(--color-danger) 14%, transparent); }

  &--lysing {
    box-shadow: 0 0 36px color-mix(in srgb, var(--color-danger) 40%, transparent);
    border-color: var(--color-danger) !important;
    animation: card-shake 0.08s linear infinite;
  }

  &--lysed {
    opacity: 0.65; // intentional between-tier value
    border-color: var(--color-muted-border) !important;
    box-shadow: none;
  }

  // Healthy cell electroporation risk states
  &--healthy.cell-card--approaching {
    border-left-color: var(--color-amber) !important;
    box-shadow: 0 0 22px color-mix(in srgb, var(--color-amber) 22%, transparent);
  }

  &--healthy.cell-card--critical {
    border-left-color: var(--color-orange) !important;
    animation: card-warn-pulse 1.1s ease-in-out infinite;
  }

  // Target thermal states
  &--approaching.cell-card--target {
    border-left-color: var(--color-amber) !important;
    box-shadow: 0 0 22px color-mix(in srgb, var(--color-amber) 18%, transparent);
  }

  &--critical.cell-card--target {
    border-left-color: var(--color-orange) !important;
    animation: card-warn-pulse 1.1s ease-in-out infinite;
  }
}
</style>
