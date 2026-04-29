<!-- Copyright © 2026 Tomer Preis. Licensed under the MIT License. -->
<template>
  <div :id="`hl-${type}-card`" :class="['cell-card', `cell-card--${type}`, `cell-card--${cellState}`, { 'cell-card--compact': compact }]">

    <!-- Inline picker as the card's identity — replaces the static header label -->
    <HealthyCellPicker
      v-if="!compact && isHealthy"
      class="cell-card__picker"
      ref="picker"
      @opened="$emit(EMIT.PICKER_OPENED)"
      @select="onSelectPreset"
      @selectUser="onSelectUserPreset"
    />
    <TargetCellPicker
      v-if="!compact && !isHealthy"
      class="cell-card__picker"
      ref="picker"
      @opened="$emit(EMIT.PICKER_OPENED)"
      @select="onSelectPreset"
      @selectUser="onSelectUserPreset"
    />

    <CellHeader
      v-if="!compact"
      :type="type"
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
      :double-shell-enabled="cellStore.doubleShellEnabled"
      :has-nuclear-params="hasNuclearParams"
      :nuclear-vm-mv="nuclearVmMv"
      :nuclear-disruption-ratio="nuclearDisruptionRatio"
      :has-cell-data="!!cellData"
      :provenance-chip="provenanceChip"
      :provenance-chip-variant="provenanceChipVariant"
      :provenance-tip="provenanceTip"
      :sigma-calibration="sigmaCalibration"
    />

    <CellParamsPanel
      v-if="!compact"
      :cell-data="cellData"
      :cell-type="type"
      :force-expanded="uiStore.replayExpandedCellParams.includes(type)"
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
import { mapStores } from 'pinia'

import { useCellStore } from '@/stores/cellStore'
import { useUiStore } from '@/stores/uiStore'
import { useUserPresetsStore } from '@/stores/userPresetsStore'
import type { UserCellPreset } from '@/stores/userPresetsStore'
import { useCellCalibrationStore } from '@/stores/cellCalibrationStore'

import { membraneCm, computeTau, tempCorrectedVth } from '@/utils/physics'
import { splitFreqKHz } from '@/utils/format'
import {
  tipVm as tipVmFn,
  tipAcousticVm as tipAcousticVmFn,
  tipTemp as tipTempFn,
  tipState as tipStateFn,
} from '@/tooltips/cellCardTooltips'

import { CELL_PRESETS } from '@/constants/cellLibrary'
import { EDITABLE_PARAMS, EDITABLE_PARAMS_ACOUSTIC, THRESHOLDS } from '@/constants/cellCard'
import { CELL_STATE, CELL_TYPE, CELL_CATEGORY } from '@/constants/strings'
import { THIN_SHELL_RATIO_WARN } from '@/constants/physics'
import { UNIT } from '@/constants/units'
import { EMIT } from '@/constants/emitEvents'

import type { CellConfig, CellRecord } from '@/types/cell'
import type { CellState } from '@/types/cell'

import CellHeader     from './CellHeader.vue'
import CellParamsPanel from './CellParamsPanel.vue'
import CellVisual     from './CellVisual.vue'
import CellBody       from './CellBody.vue'
import HealthyCellPicker from '@/components/ExperimentLab/HealthyCellPicker.vue'
import TargetCellPicker  from '@/components/ExperimentLab/TargetCellPicker.vue'

import { broadcastStateSync } from '@/services/socket'

import type { CellPreset } from '@/constants/cellLibrary'

export default defineComponent({
  components: { CellHeader, CellParamsPanel, CellVisual, CellBody, HealthyCellPicker, TargetCellPicker },

  emits: [EMIT.STABLE_RESET, EMIT.FULL_RESET, EMIT.LOAD_HEALTHY_PRESET, EMIT.LOAD_TARGET_PRESET, EMIT.PICKER_OPENED],

  props: {
    type: {
      type: String as PropType<'healthy' | 'target'>,
      required: true,
    },
    sublabel:    { type: String, required: true },
    sublabelTip: { type: String, default: '' },
    description: { type: String, required: true },
    cellData: {
      type: Object as PropType<CellRecord | null>,
      default: null,
    },
    compact: { type: Boolean, default: false },
  },

  data() {
    return {
      thermalLysis: false,
    }
  },

  computed: {
    ...mapStores(useCellStore, useUiStore, useUserPresetsStore, useCellCalibrationStore),
    CELL_STATE() { return CELL_STATE },
    CELL_TYPE()  { return CELL_TYPE },
    EMIT()       { return EMIT },

    isHealthy(): boolean { return this.type === CELL_TYPE.HEALTHY },

    sigmaCalibration(): { label: string; tip: string; state: 'calibrated' | 'clamped' | 'unidentifiable' | 'collecting' | 'unknown' } | null {
      const id = this.cellData?.id
      if (!id) return null
      // Cell card always shows the Schwan-mode calibration. Resonance-mode calibration is surfaced separately in the resonance UI.
      const s = this.cellCalibrationStore.statusFor(id, 'schwan')
      if (s.state === 'unknown')    return null
      if (s.state === 'collecting') {
        return {
          state: 'collecting',
          label: this.$t('ai.sigmaCalibCollecting', { n: s.nSamples, need: 5 }) as string,
          tip:   this.$t('ai.sigmaCalibTip') as string,
        }
      }
      const m1 = s.param1Mult.toFixed(2)
      const m2 = s.param2Mult.toFixed(2)
      const std = s.residualStd.toFixed(2)
      return {
        state: s.state === 'clamped' || s.state === 'unidentifiable' ? s.state : 'calibrated',
        label: `σᵢ ×${m1} · Vₜₕ ×${m2} · res ${std} · ${s.nSamples} runs`,
        tip:   this.$t('ai.sigmaCalibTip') as string,
      }
    },

    userPreset(): UserCellPreset | null {
      if (!this.cellData) return null
      return this.userPresetsStore.presets.find((p) => p.id === this.cellData!.id) ?? null
    },

    provenanceChip(): string {
      const p = this.userPreset
      if (!p) return ''
      const confidence = p.parameterConfidence ?? 'literature'
      const map: Record<string, string> = {
        literature: this.$t('userPresets.confidenceBadgeLit'),
        measured:   this.$t('userPresets.confidenceBadgeMeas'),
        estimated:  this.$t('userPresets.confidenceBadgeEst'),
      }
      return map[confidence] ?? confidence.toUpperCase().slice(0, 4)
    },

    provenanceChipVariant(): string {
      const p = this.userPreset
      return p?.parameterConfidence ?? 'literature'
    },

    provenanceTip(): string {
      const p = this.userPreset
      if (!p) return ''
      const lines: string[] = ['<strong>Parameter Provenance</strong>']
      const confidence = p.parameterConfidence ?? 'literature'
      const confLabel  = {
        literature: this.$t('userPresets.confidenceLiterature'),
        measured:   this.$t('userPresets.confidenceMeasured'),
        estimated:  this.$t('userPresets.confidenceEstimated'),
      }[confidence] ?? confidence
      lines.push(`Confidence: <span class="tip-val">${confLabel}</span>`)
      if (p.notes?.trim()) lines.push(`Source: ${p.notes.trim()}`)
      const sigmaLines: string[] = []
      if (p.sigmaUncertaintyPct != null) {
        sigmaLines.push(`σ_i uncertainty: ±${p.sigmaUncertaintyPct.toFixed(0)}${UNIT.PERCENT}`)
      }
      if (p.sigmaSource) {
        const srcLabel = {
          literature:      this.$t('userPresets.sigmaSourceLiterature'),
          measured:        this.$t('userPresets.sigmaSourceMeasured'),
          electrorotation: this.$t('userPresets.sigmaSourceElectrorotation'),
          impedance:       this.$t('userPresets.sigmaSourceImpedance'),
          estimated:       this.$t('userPresets.sigmaSourceEstimated'),
        }[p.sigmaSource] ?? p.sigmaSource
        sigmaLines.push(`σ_i technique: ${srcLabel}`)
      }
      if (p.sigmaCitation?.trim()) sigmaLines.push(`σ_i citation: ${p.sigmaCitation.trim()}`)
      if (sigmaLines.length > 0) {
        lines.push('')
        lines.push(...sigmaLines)
      }
      return lines.join('\n')
    },

    cellState(): CellState {
      return this.type === CELL_TYPE.HEALTHY
        ? this.cellStore.healthyCellState
        : this.cellStore.targetCellState
    },

    isAcousticTarget(): boolean {
      if (this.type !== CELL_TYPE.TARGET) return false
      if (!this.cellStore.isResonanceMode) return false
      const cat = this.cellStore.targetCellCategory
      if (cat !== CELL_CATEGORY.BACTERIA && cat !== CELL_CATEGORY.VIRUS) return false
      const t = this.cellStore.target as CellConfig & { resonantFreqGHz?: number }
      return !!t.resonantFreqGHz
    },

    vm(): number {
      return (this.type === CELL_TYPE.HEALTHY ? this.cellStore.healthyVm : this.cellStore.targetVm) * 1000
    },

    temperature(): number {
      return this.type === CELL_TYPE.HEALTHY ? this.cellStore.healthyTemp : this.cellStore.targetTemp
    },

    disruptionRatio(): number {
      return this.type === CELL_TYPE.HEALTHY
        ? this.cellStore.healthyDisruptionRatio
        : this.cellStore.targetDisruptionRatio
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
      const cell = this.type === CELL_TYPE.HEALTHY ? this.cellStore.healthy : this.cellStore.target
      return !!cell.nuclearRadius
    },

    nuclearVmMv(): number {
      return (this.type === CELL_TYPE.HEALTHY ? this.cellStore.healthyNuclearVm : this.cellStore.targetNuclearVm) * 1000
    },

    nuclearDisruptionRatio(): number {
      return this.type === CELL_TYPE.HEALTHY
        ? this.cellStore.healthyNuclearDisruptionRatio
        : this.cellStore.targetNuclearDisruptionRatio
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
      const cell = this.type === CELL_TYPE.HEALTHY ? this.cellStore.healthy : this.cellStore.target
      return CELL_PRESETS.some((p) => p.presetId === cell.id)
    },

    editableParams() {
      const cell     = this.type === CELL_TYPE.HEALTHY ? this.cellStore.healthy : this.cellStore.target
      const paramSet = this.isAcousticTarget ? EDITABLE_PARAMS_ACOUSTIC : EDITABLE_PARAMS
      return paramSet.map((p) => ({
        ...p,
        displayValue: (cell as object as Record<string, number>)[p.key] ?? 0,
      }))
    },

    derivedParams() {
      const cell    = this.type === CELL_TYPE.HEALTHY ? this.cellStore.healthy : this.cellStore.target
      const sigma_e = this.cellStore.effectiveSigmaE
      const tauNs   = computeTau(cell, sigma_e) * 1e9
      const fc      = this.type === CELL_TYPE.HEALTHY ? this.cellStore.healthyFc : this.cellStore.targetFc
      const fcParts = splitFreqKHz(fc, 2)
      const rOverD  = (cell.radius * 1000) / cell.membraneThickness
      const thinShellRow = rOverD < THIN_SHELL_RATIO_WARN ? [{
        label: this.$t('cells.derivedParams.thinShell'),
        value: rOverD.toFixed(1),
        unit:  '',
        tip:   this.$t('cells.derivedParams.thinShellTip'),
        warn:  true,
      }] : []

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
          ...thinShellRow,
        ]
      }

      const Cm = membraneCm(cell) * 1000
      return [
        { label: this.$t('cells.derivedParams.cm'),  value: Cm.toFixed(2),    unit: UNIT.MF_PER_M2 },
        { label: this.$t('cells.derivedParams.tau'), value: tauNs.toFixed(1), unit: UNIT.NS         },
        { label: this.$t('cells.derivedParams.fc'),  value: fcParts.value,    unit: fcParts.unit    },
        ...thinShellRow,
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
        const t = this.cellStore.target as CellConfig & { resonantFreqGHz?: number; capsidQ?: number; experimentalBasis?: string }
        return tipAcousticVmFn({
          disruptionRatio:   this.disruptionRatio,
          resonantFreqGHz:   t.resonantFreqGHz ?? 0,
          capsidQ:           t.capsidQ ?? 1,
          freqKHz:           this.cellStore.currentBroadcastFrequency,
          fieldVcm:          this.cellStore.fieldIntensity,
          experimentalBasis: t.experimentalBasis,
        })
      }
      const cell        = this.type === CELL_TYPE.HEALTHY ? this.cellStore.healthy : this.cellStore.target
      const hfireMult   = this.cellStore.hFireMultiplier
      return tipVmFn({
        vmDisplay:        this.vmDisplay,
        disruptionRatio:  this.disruptionRatio,
        thresholdVoltage: tempCorrectedVth(cell.thresholdVoltage, this.temperature, this.cellStore.effectivePulseCount) * hfireMult,
        waveform:         this.cellStore.waveform,
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
        lysisDelayMs: this.cellStore.lysisDelayMs,
      })
    },
  },

  methods: {
    onParamChange(key: string, value: number) {
      this.cellStore.updateCellParam(this.type, key, value)
    },

    onStableReset(cellType: string) {
      this.$emit(EMIT.STABLE_RESET, cellType)
    },

    onFullReset(cellType: string) {
      this.$emit(EMIT.FULL_RESET, cellType)
    },

    resetToPreset() {
      const cell   = this.type === CELL_TYPE.HEALTHY ? this.cellStore.healthy : this.cellStore.target
      const preset = CELL_PRESETS.find((p) => p.presetId === cell.id)
      if (preset) this.cellStore.loadPreset(this.type, preset)
    },

    onSelectPreset(preset: CellPreset) {
      this.cellStore.loadPreset(this.type, preset)
      broadcastStateSync()
      const evt = this.isHealthy ? EMIT.LOAD_HEALTHY_PRESET : EMIT.LOAD_TARGET_PRESET
      this.$emit(evt, preset)
    },

    onSelectUserPreset(preset: UserCellPreset) {
      const config = this.userPresetsStore.toCellConfig(preset)
      this.cellStore.loadPreset(this.type, config)
      broadcastStateSync()
    },

    closePicker() {
      const picker = this.$refs.picker as { close(): void } | undefined
      picker?.close()
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
  padding: 0 1.5rem 1.5rem;
  @include flex-col(1rem);
  transition: border-color var(--tr-normal), box-shadow var(--tr-slow);
  min-width: 0;
  /* overflow visible so the embedded picker's dropdown is not clipped */
  overflow: visible;
  position: relative;

  /* ── Embedded cell picker — the card's identity header ─────────────── */
  &__picker {
    @include flex-row(0);
    justify-content: center;
    margin: 0 -1.5rem;
    padding: 0.8rem 1.25rem;
    border-bottom: 1px solid color-mix(in srgb, var(--color-border) 80%, transparent);
    background: color-mix(in srgb, var(--color-surface) 55%, transparent);

    /* let the picker keep its natural pill width, just upsize the type slightly */
    :deep(.experiment__cell-badge-row)      { padding: 0.5rem 0.9rem; }
    :deep(.experiment__cell-badge-selected) { font-size: var(--fs-lg); font-weight: 700; }
    :deep(.experiment__cell-badge-type)     { font-size: var(--fs-xxs); letter-spacing: 0.12em; }
  }

  &--healthy &__picker {
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--color-primary) 10%, transparent) 0%,
      color-mix(in srgb, var(--color-primary)  2%, transparent) 100%
    );
    border-bottom-color: color-mix(in srgb, var(--color-primary) 30%, transparent);
  }

  &--target &__picker {
    background: linear-gradient(
      90deg,
      color-mix(in srgb, var(--color-danger) 10%, transparent) 0%,
      color-mix(in srgb, var(--color-danger)  2%, transparent) 100%
    );
    border-bottom-color: color-mix(in srgb, var(--color-danger) 30%, transparent);
  }

  /* ── Compact modifier ──────────────────────────────────────────────── */
  &--compact {
    padding: 0.5rem;
    border-radius: 6px;
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
    opacity: 0.65; // intentional: lysed cell is visually retired

    border-color: var(--color-muted-border) !important;
    box-shadow: none;
  }

  &--healthy.cell-card--approaching {
    border-left-color: var(--color-amber) !important;
    box-shadow: 0 0 22px color-mix(in srgb, var(--color-amber) 22%, transparent);
  }

  &--healthy.cell-card--critical {
    border-left-color: var(--color-orange) !important;
    animation: card-warn-pulse 1.1s ease-in-out infinite;
  }

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
