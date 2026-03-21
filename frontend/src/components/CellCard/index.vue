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

    <!-- Cell Visualization -->
    <div v-if="cellData" class="cell-card__visual">
      <div ref="cellCanvas" class="cell-card__canvas"></div>

      <div v-if="!compact" class="cell-card__osc-divider">
        <span class="cell-card__osc-label" v-tip="tipVm">OSC · {{ vmDisplay }}</span>
        <span v-if="disruptionRatio > 0.05" class="cell-card__osc-impact" v-tip="tipDisruption">
          {{ ICON.LIGHTNING }} {{ (disruptionRatio * 100).toFixed(0) }}% disruption
        </span>
      </div>

      <!-- Nuclear disruption sub-bar - visible when double-shell model active -->
      <div
        v-if="!compact && store.doubleShellEnabled && hasNuclearParams"
        class="cell-card__nuclear-bar-row"
        v-tip="tipNuclearBar"
      >
        <span class="cell-card__nuclear-bar-label">{{ ICON.NUCLEUS }} NE</span>
        <div class="cell-card__nuclear-bar-track">
          <div
            class="cell-card__nuclear-bar-fill"
            :style="{ width: Math.min(100, nuclearDisruptionRatio * 100) + '%' }"
            :class="{
              'cell-card__nuclear-bar-fill--caution': nuclearDisruptionRatio >= THRESHOLDS.HEALTHY_APPROACHING && nuclearDisruptionRatio < THRESHOLDS.DISRUPTION_WARN,
              'cell-card__nuclear-bar-fill--warn':    nuclearDisruptionRatio >= THRESHOLDS.DISRUPTION_WARN,
            }"
          ></div>
        </div>
        <span class="cell-card__nuclear-bar-pct">{{ (nuclearDisruptionRatio * 100).toFixed(0) }}%</span>
      </div>

      <div ref="oscCanvas" class="cell-card__osc-canvas"></div>

      <!-- Compact info strip - only in sticky live-view mode (replaces verbose data strips) -->
      <div v-if="compact" class="cell-card__compact-strip">
        <div class="cell-card__compact-top">
          <span :class="['cell-card__compact-badge', `cell-card__compact-badge--${type}`]">
            {{ type === CELL_TYPE.HEALTHY ? 'H' : 'T' }}
          </span>
          <span :class="['cell-card__compact-dr', `cell-card__compact-dr--${cellState}`]">
            DR&nbsp;{{ (disruptionRatio * 100).toFixed(0) }}%
          </span>
          <span class="cell-card__compact-sep">·</span>
          <span class="cell-card__compact-temp">{{ temperature.toFixed(1) }}{{ UNIT.DEG_C }}</span>
        </div>
        <div class="cell-card__compact-bottom">
          <span :class="['cell-card__compact-dot', `cell-card__compact-dot--${cellState}`]">●</span>
          <span :class="['cell-card__compact-state', `cell-card__compact-state--${cellState}`]">
            {{ compactStateLabel }}
          </span>
        </div>
      </div>

      <!-- DEP strip - shows when dielectrophoretic force is active (non-resonance mode) -->
      <div
        v-if="!compact && showDepStrip"
        class="cell-card__dep-strip"
        :class="depStripModifier"
        v-tip="tipDep"
      >
        <span class="cell-card__warn-icon">{{ ICON.DEP }}</span>
        <span class="cell-card__warn-text">{{ depStripLabel }}</span>
        <span class="cell-card__warn-pct">K {{ depStripValue }}</span>
      </div>

      <!-- Nourishing strip - healthy cell in active biomodulation window (DR 8-45%) -->
      <div
        v-if="!compact && type === CELL_TYPE.HEALTHY && cellState === CELL_STATE.NOURISHING"
        class="cell-card__nourishing-strip"
        v-tip="tipState"
      >
        <span class="cell-card__warn-icon">{{ ICON.NOURISH }}</span>
        <span class="cell-card__warn-text">{{ $t('cells.states.nourishing', { bms: (biostimScore * 100).toFixed(0) }) }}</span>
        <span class="cell-card__warn-pct">{{ (disruptionRatio * 100).toFixed(0) }}%</span>
      </div>

      <!-- Biomodulation panel - healthy cell only, sub-threshold regime (DR < 45%) -->
      <BiostimPanel
        v-if="!compact && showBiostim"
        :stim-index="biostimStimIndex"
        :mech-transd-eff="biostimMechTransd"
        :mild-thermal="biostimMildThermal"
        :biomod-score="biostimScore"
        :disruption-ratio="disruptionRatio"
        :freq-k-hz="store.currentBroadcastFrequency"
        :fc-k-hz="biostimFcKHz"
        :steady-state-temp="biostimSteadyTemp"
        :class="{ 'cell-card__biostim--nourishing': cellState === CELL_STATE.NOURISHING }"
      />

      <!-- Reversible EP strip - target cell 50-85% disruption (pores open/re-seal) -->
      <div
        v-if="type === CELL_TYPE.TARGET && cellState === CELL_STATE.REV_EP"
        class="cell-card__rev-ep-strip"
        v-tip="tipDisruption"
      >
        <span class="cell-card__warn-icon">{{ ICON.LIGHTNING }}</span>
        <span class="cell-card__warn-text">{{ $t('cells.states.revEp') }}</span>
        <span class="cell-card__warn-pct">{{ (disruptionRatio * 100).toFixed(0) }}%</span>
      </div>

      <!-- Lysis protocol strip - target cell vibrating state (>85%, lysis armed) -->
      <div
        v-if="type === CELL_TYPE.TARGET && cellState === CELL_STATE.VIBRATING"
        class="cell-card__lysis-strip"
        v-tip="tipDisruption"
      >
        <span class="cell-card__warn-icon">{{ ICON.LYSIS_BOLT }}</span>
        <span class="cell-card__warn-text">{{ $t('cells.states.lysisArmed', { protocol: lysisProtocolStr }) }}</span>
        <span class="cell-card__warn-pct">{{ (disruptionRatio * 100).toFixed(0) }}%</span>
      </div>

      <!-- Structural integrity countdown bar - drains 100→0 % as lysis timer runs -->
      <div
        v-if="lysisIntegrityPct !== null"
        class="cell-card__integrity-bar-row"
      >
        <span class="cell-card__integrity-label">{{ $t('cells.integrityLabel') }}</span>
        <div class="cell-card__integrity-track">
          <div
            class="cell-card__integrity-fill"
            :style="{ width: lysisIntegrityPct + '%' }"
          ></div>
        </div>
        <span class="cell-card__integrity-pct">{{ lysisIntegrityPct.toFixed(0) }}%</span>
      </div>

      <!-- Electroporation risk warning strip - healthy cell only -->
      <div
        v-if="!compact && type === CELL_TYPE.HEALTHY && (cellState === CELL_STATE.APPROACHING || cellState === CELL_STATE.CRITICAL) && !tempWarning"
        class="cell-card__healthy-warn"
        :class="{ 'cell-card__healthy-warn--critical': cellState === CELL_STATE.CRITICAL }"
        v-tip="tipState"
      >
        <span class="cell-card__warn-icon">{{ cellState === CELL_STATE.CRITICAL ? ICON.LIGHTNING : ICON.WARNING }}</span>
        <span class="cell-card__warn-text">
          {{ cellState === CELL_STATE.CRITICAL
            ? $t('cells.states.critical')
            : $t('cells.states.approaching') }}
        </span>
        <span class="cell-card__warn-pct">{{ (disruptionRatio * 100).toFixed(0) }}%</span>
      </div>

      <!-- Thermal warning strip - both cell types -->
      <div
        v-if="tempWarning && cellState !== CELL_STATE.LYSED && cellState !== CELL_STATE.LYSING"
        class="cell-card__thermal-warn"
        :class="{ 'cell-card__thermal-warn--denaturing': tempDenaturing }"
        v-tip="tipTemp"
      >
        <span class="cell-card__warn-icon">{{ tempDenaturing ? ICON.LIGHTNING : ICON.WARNING }}</span>
        <span class="cell-card__warn-text">
          {{ tempDenaturing
            ? $t('cells.states.thermalCritical')
            : $t('cells.states.thermalWarning') }}
        </span>
        <span class="cell-card__warn-pct">{{ temperature.toFixed(0) }}{{ UNIT.DEG_C }}</span>
      </div>

      <!-- Lysis overlay - absolute, covers cell-card__visual without shifting card height -->
      <div v-if="cellState === CELL_STATE.LYSED" class="cell-card__destroyed">
        <span class="cell-card__destroyed-text">{{ thermalLysis ? $t('cells.states.thermalLysis') : $t('cells.states.membraneLysed') }}</span>
        <span v-if="thermalLysis" class="cell-card__destroyed-sub">{{ $t('cells.states.vaporized') }}</span>
        <button class="cell-card__lysis-btn" @click="resetToStable">{{ $t('cells.states.resetCell') }}</button>
      </div>
    </div>

    <!-- Description -->
    <div v-if="!compact" class="cell-card__body">
      <p>{{ description }}</p>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import type { PropType } from 'vue'
import * as d3 from 'd3'
import { useCellStore } from '@/stores/cellStore'
import { useExperimentStore } from '@/stores/experimentStore'
import { useImpedanceStore } from '@/stores/impedanceStore'
import { broadcastLogEntry } from '@/services/socket'
import { CELL_PRESETS } from '@/constants/cellLibrary'
import type { CellConfig, CellRecord } from '@/types/cell'
import { membraneCm, computeTau } from '@/utils/physics'
import type { CellState } from '@/types/cell'
import {
  CELL_COLORS,
  EDITABLE_PARAMS,
  EDITABLE_PARAMS_ACOUSTIC,
  THRESHOLDS,
  LYSIS_DURATION_MS,
  FRAGMENT_INTERVAL_MS,
} from '@/constants/cellCard'
import { setupBlobAnimation, setupOscilloscope, spawnFragment } from '@/utils/cellAnimation'
import { CELL_STATE, CELL_TYPE, CELL_CATEGORY } from '@/constants/strings'
import { ICON } from '@/constants/icons'
import { UNIT } from '@/constants/units'
import { splitFreqKHz } from '@/utils/format'
import { tipVm as tipVmFn, tipAcousticVm as tipAcousticVmFn, tipTemp as tipTempFn, tipState as tipStateFn, tipDisruption as tipDisruptionFn, tipNuclearBar as tipNuclearBarFn, tipDep as tipDepFn, formatLysisTimeLocal } from '@/tooltips/cellCardTooltips'

import CellHeader from './CellHeader.vue'
import CellParamsPanel from './CellParamsPanel.vue'
import BiostimPanel from './BiostimPanel.vue'

export default defineComponent({
  components: { CellHeader, CellParamsPanel, BiostimPanel },

  emits: ['stable-reset'],

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
    /** When true: hides header/params/body, skips local state machine,
     *  reads cellState from the store (synced by the non-compact instance). */
    compact: { type: Boolean, default: false },
  },

  setup() {
    return { store: useCellStore(), CELL_STATE, CELL_TYPE, ICON, UNIT, THRESHOLDS }
  },

  data() {
    return {
      liveAmplitude:  this.cellData?.amplitude ?? 0.8,
      cellState:      CELL_STATE.STABLE as CellState,
      shatterPending:      false,
      thermalLysis:        false,
      lysisProgressElapsed: 0,
      helixTimer:          null as d3.Timer | null,
      oscTimer:            null as d3.Timer | null,
      particleInterval:    null as ReturnType<typeof setInterval> | null,
      shatterTimeout:      null as ReturnType<typeof setTimeout> | null,
      shatterDelayTimeout: null as ReturnType<typeof setTimeout> | null,
      progressInterval:    null as ReturnType<typeof setInterval> | null,
    }
  },

  computed: {
    accentColor(): string { return CELL_COLORS[this.type].accent },

    /**
     * True when the target cell uses acoustic/mechanical resonance as its primary
     * disruption model (bacteria or virus with resonantFreqGHz defined).
     * In this regime the Schwan Vm is negligible (~0 at GHz) and should not be
     * displayed as the primary metric - acoustic DR% is shown instead.
     */
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
    vmDisplay(): string {
      if (this.isAcousticTarget) {
        return `DR ${(this.disruptionRatio * 100).toFixed(0)}${UNIT.PERCENT}`
      }
      return `${this.vm.toFixed(1)} ${UNIT.MV}`
    },
    tempDisplay(): string  { return `${this.temperature.toFixed(1)} ${UNIT.DEG_C}` },
    tempWarning():     boolean { return this.temperature > THRESHOLDS.TEMP_WARN },
    tempDenaturing():  boolean { return this.temperature >= THRESHOLDS.TEMP_DENATURING },
    tempVaporizing():  boolean { return this.temperature >= THRESHOLDS.TEMP_VAPORIZING },

    disruptionRatio(): number {
      return this.type === CELL_TYPE.HEALTHY
        ? this.store.healthyDisruptionRatio
        : this.store.targetDisruptionRatio
    },
    // After lysis the cell is destroyed — reset is always available regardless of field intensity.
    // The field gate was causing the overlay to visually change state when the field dropped,
    // which was confusing: a dead cell should look dead and stay dead until reset is clicked.
    canReset(): boolean { return this.cellState === CELL_STATE.LYSED },

    /** 100 → 0 % as the lysis countdown drains; null when not armed. */
    lysisIntegrityPct(): number | null {
      if (this.type !== CELL_TYPE.TARGET || !this.shatterPending) return null
      const delay = this.store.lysisDelayMs
      if (delay <= 0) return 0
      return Math.max(0, 100 - (this.lysisProgressElapsed / delay) * 100)
    },

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

    /** Short state label shown in the compact sticky strip. Maps CELL_STATE → i18n key. */
    compactStateLabel(): string {
      const keyMap: Record<string, string> = {
        [CELL_STATE.STABLE]:      'stable',
        [CELL_STATE.NOURISHING]:  'nourishing',
        [CELL_STATE.APPROACHING]: 'approaching',
        [CELL_STATE.REV_EP]:      'revEp',
        [CELL_STATE.CRITICAL]:    'critical',
        [CELL_STATE.VIBRATING]:   'vibrating',
        [CELL_STATE.LYSING]:      'lysing',
        [CELL_STATE.LYSED]:       'lysed',
      }
      const key = keyMap[this.cellState]
      return key ? (this.$t(`cells.compactStates.${key}`) as string) : ''
    },

    cellColor(): string {
      const { interpFrom, interpTo } = CELL_COLORS[this.type]
      return d3.interpolateRgb(interpFrom, interpTo)(Math.min(1, this.disruptionRatio))
    },

    editableParams() {
      const cell = this.type === CELL_TYPE.HEALTHY ? this.store.healthy : this.store.target
      const paramSet = this.isAcousticTarget ? EDITABLE_PARAMS_ACOUSTIC : EDITABLE_PARAMS
      return paramSet.map((p) => ({
        ...p,
        displayValue: (cell as unknown as Record<string, number>)[p.key] ?? 0,
      }))
    },

    derivedParams() {
      const cell     = this.type === CELL_TYPE.HEALTHY ? this.store.healthy : this.store.target
      const sigma_e  = this.store.effectiveSigmaE
      const tauNs    = computeTau(cell, sigma_e) * 1e9
      const fc       = this.type === CELL_TYPE.HEALTHY ? this.store.healthyFc : this.store.targetFc
      const fcParts  = splitFreqKHz(fc, 2)

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

    tipNuclearBar(): string {
      return tipNuclearBarFn()
    },

    // ── DEP strip ──────────────────────────────────────────────────────────────
    depCmRealValue(): number {
      return this.type === CELL_TYPE.HEALTHY
        ? this.store.depHealthyCmReal
        : this.store.depTargetCmReal
    },
    depCrossoverKHz(): number {
      return this.type === CELL_TYPE.HEALTHY
        ? this.store.depHealthyCrossoverKHz
        : this.store.depTargetCrossoverKHz
    },
    showDepStrip(): boolean {
      return this.store.chartMode !== 'resonance'
        && Math.abs(this.depCmRealValue) >= 0.02
        && this.store.fieldIntensity >= 5
        && this.cellState !== CELL_STATE.LYSED
        && this.cellState !== CELL_STATE.LYSING
    },
    depStripLabel(): string {
      return this.depCmRealValue > 0
        ? this.$t('cells.states.depAttraction')
        : this.$t('cells.states.depRepulsion')
    },
    depStripValue(): string {
      const sign = this.depCmRealValue >= 0 ? '+' : '−'
      return `${sign}${Math.abs(this.depCmRealValue).toFixed(3)}`
    },
    depStripModifier(): string {
      return this.depCmRealValue > 0
        ? 'cell-card__dep-strip--pdep'
        : 'cell-card__dep-strip--ndep'
    },
    tipDep(): string {
      return tipDepFn({
        isPdep:       this.depCmRealValue > 0,
        kVal:         this.depCmRealValue,
        crossoverKHz: this.depCrossoverKHz,
      })
    },

    tipVm(): string {
      if (this.isAcousticTarget) {
        const t = this.store.target as CellConfig & { resonantFreqGHz?: number; capsidQ?: number; experimentalBasis?: string }
        return tipAcousticVmFn({
          disruptionRatio:  this.disruptionRatio,
          resonantFreqGHz:  t.resonantFreqGHz ?? 0,
          capsidQ:          t.capsidQ ?? 1,
          freqKHz:          this.store.currentBroadcastFrequency,
          fieldVcm:         this.store.fieldIntensity,
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
        tempDisplay:   this.tempDisplay,
        tempVaporizing: this.tempVaporizing,
        tempDenaturing: this.tempDenaturing,
        tempWarning:    this.tempWarning,
      })
    },

    tipState(): string {
      return tipStateFn({
        cellState:   this.cellState,
        thermalLysis: this.thermalLysis,
        cellType:    this.type,
        lysisDelayMs: this.store.lysisDelayMs,
      })
    },

    tipDisruption(): string {
      const cell = this.type === CELL_TYPE.HEALTHY ? this.store.healthy : this.store.target
      const pef  = this.type === CELL_TYPE.HEALTHY
        ? this.store.pulseEnvelopeFactorHealthy
        : this.store.pulseEnvelopeFactorTarget
      return tipDisruptionFn({
        disruptionRatio:     this.disruptionRatio,
        thresholdVoltage:    cell.thresholdVoltage,
        lysisNPulses:        this.store.lysisNPulses,
        lysisDelayMs:        this.store.lysisDelayMs,
        pulseEnvelopeFactor: pef,
        waveform:            this.store.waveform,
        chartMode:           this.store.chartMode,
        pulseWidthNs:        this.store.pulseWidthNs,
        effectiveSigmaE:     this.store.effectiveSigmaE,
        vmDisplay:           this.vmDisplay,
        cellType:            this.type,
        cell,
      })
    },

    lysisProtocolStr(): string {
      const n = this.store.lysisNPulses
      const t = formatLysisTimeLocal(this.store.lysisDelayMs)
      return `${n} pulse${n === 1 ? '' : 's'}, est. ${t}`
    },

    // ── Biomodulation metrics (healthy cell only) ──────────────────────────
    // Visible when DR < 0.45 - the stimulatory sub-threshold window.
    // All three getters delegate to cellStore computations that share the same
    // Schwan physics used for the disruption model on the target cell.
    showBiostim(): boolean {
      return this.type === CELL_TYPE.HEALTHY
        && this.disruptionRatio < THRESHOLDS.NOURISHING
        && this.cellState !== CELL_STATE.LYSED
        && this.cellState !== CELL_STATE.LYSING
    },
    biostimStimIndex():    number { return this.store.healthyStimIndex },
    biostimMechTransd():   number { return this.store.healthyMechTransductionEff },
    biostimMildThermal():  number { return this.store.healthyMildThermalActivation },
    biostimScore():        number { return this.store.healthyBiomodScore },
    biostimFcKHz():        number { return this.store.healthyFc },
    biostimSteadyTemp():   number { return this.store.healthySteadyStateTemp },
  },

  watch: {
    'cellData.amplitude'(newVal: number) {
      this.liveAmplitude = newVal
    },

    'store.target.id'() {
      if (this.type !== CELL_TYPE.TARGET) return
      this.helixTimer?.stop()
      this.$nextTick(() => this.drawCell())
    },

    'store.resetCounter'() {
      // Always cancel any running lysis timers on reset - including VIBRATING countdown.
      // The previous guard (only LYSED/LYSING) was too narrow: if the cell was in VIBRATING
      // state (shatterDelayTimeout still ticking), the reset was ignored and lysis fired
      // after the delay even though the researcher had already pressed Reset.
      clearTimeout(this.shatterTimeout ?? undefined)
      clearTimeout(this.shatterDelayTimeout ?? undefined)
      clearInterval(this.particleInterval ?? undefined)
      clearInterval(this.progressInterval ?? undefined)
      this.shatterTimeout      = null
      this.shatterDelayTimeout = null
      this.particleInterval    = null
      this.progressInterval    = null
      this.shatterPending = false
      this.thermalLysis   = false
      this.lysisProgressElapsed = 0
      if (this.cellState === CELL_STATE.STABLE) return  // nothing to redraw
      this.cellState     = CELL_STATE.STABLE
      this.liveAmplitude = this.cellData?.amplitude ?? 0.8
      this.helixTimer?.stop()
      this.$nextTick(() => {
        this.drawCell()
        this.drawOscilloscope()
      })
    },

    disruptionRatio() { if (!this.compact) this.updateCellState() },
    temperature()     { if (!this.compact) this.updateCellState() },

    // compact mode: mirror the store's authoritative cell state (set by the non-compact instance)
    'store.healthyCellState'(s: CellState) {
      if (this.compact && this.type === CELL_TYPE.HEALTHY) this.cellState = s
    },
    'store.targetCellState'(s: CellState) {
      if (this.compact && this.type === CELL_TYPE.TARGET) this.cellState = s
    },

    'store.lysisDelayMs'() {
      if (this.type !== CELL_TYPE.TARGET || !this.shatterPending) return
      clearTimeout(this.shatterDelayTimeout ?? undefined)
      clearInterval(this.progressInterval ?? undefined)
      this.lysisProgressElapsed = 0
      this.progressInterval = setInterval(() => {
        this.lysisProgressElapsed += 50
      }, 50)
      this.shatterDelayTimeout = setTimeout(() => {
        clearInterval(this.progressInterval ?? undefined)
        this.progressInterval = null
        this.shatterPending = false
        if (this.disruptionRatio > THRESHOLDS.DISRUPTION_WARN) this.triggerLysis()
      }, this.store.lysisDelayMs)
    },
  },

  mounted() {
    if (this.compact) {
      // Watchers only fire on changes - sync the current store state immediately on mount
      // so the sticky card reflects whatever state the main card is already in.
      this.cellState = this.type === CELL_TYPE.HEALTHY
        ? this.store.healthyCellState
        : this.store.targetCellState
    }
    // Draw blob animation for both compact and non-compact - sticky view needs live visuals.
    if (this.cellData) {
      this.drawCell()
      this.drawOscilloscope()
    }
  },

  beforeUnmount() {
    this.helixTimer?.stop()
    this.oscTimer?.stop()
    clearInterval(this.particleInterval ?? undefined)
    clearInterval(this.progressInterval ?? undefined)
    clearTimeout(this.shatterTimeout ?? undefined)
    clearTimeout(this.shatterDelayTimeout ?? undefined)
  },

  methods: {
    updateCellState() {
      if (this.cellState === CELL_STATE.LYSED || this.cellState === CELL_STATE.LYSING) return

      const impact = this.disruptionRatio
      const temp   = this.temperature

      if (temp >= THRESHOLDS.TEMP_VAPORIZING) {
        this.thermalLysis = true
        this.triggerLysis()
        return
      }

      const thermalFloor: CellState =
        temp >= THRESHOLDS.TEMP_DENATURING     ? CELL_STATE.CRITICAL
        : temp >= THRESHOLDS.TEMP_WARN ? CELL_STATE.APPROACHING
        : CELL_STATE.STABLE

      if (this.type === CELL_TYPE.TARGET) {
        if (impact > THRESHOLDS.DISRUPTION_WARN) {
          // >85% - lysis is now armed; 'vibrating' exclusively means "lysis imminent"
          this.cellState = CELL_STATE.VIBRATING
          this.store.setTargetCellState(CELL_STATE.VIBRATING)
          if (!this.shatterPending) {
            this.shatterPending = true
            this.lysisProgressElapsed = 0
            this.progressInterval = setInterval(() => {
              this.lysisProgressElapsed += 50
            }, 50)
            this.shatterDelayTimeout = setTimeout(() => {
              clearInterval(this.progressInterval ?? undefined)
              this.progressInterval = null
              this.shatterPending = false
              if (this.disruptionRatio > THRESHOLDS.DISRUPTION_WARN) this.triggerLysis()
            }, this.store.lysisDelayMs)
          }
          return
        }
        if (this.shatterPending) {
          clearTimeout(this.shatterDelayTimeout ?? undefined)
          clearInterval(this.progressInterval ?? undefined)
          this.progressInterval = null
          this.shatterPending = false
          this.lysisProgressElapsed = 0
        }
        // 50-85% → 'rev-ep': reversible electroporation window (Weaver & Chizmadzhev 1996).
        // Pores open transiently and re-seal - membrane is permeabilized but cells survive.
        // Distinct from 'vibrating' (>85%, lysis armed) and from 'approaching' (<50%).
        const elState: CellState =
          impact >= THRESHOLDS.HEALTHY_APPROACHING ? CELL_STATE.REV_EP
          : impact > THRESHOLDS.VIBRATING_MIN      ? CELL_STATE.APPROACHING
          : CELL_STATE.STABLE
        const ORDER: CellState[] = [CELL_STATE.STABLE, CELL_STATE.APPROACHING, CELL_STATE.REV_EP, CELL_STATE.CRITICAL]
        this.cellState = ORDER[Math.max(ORDER.indexOf(elState), ORDER.indexOf(thermalFloor))] as CellState
      } else {
        // 'nourishing': DR > 8% (THRESHOLDS.VIBRATING_MIN) - sub-threshold membrane oscillations
        // activate PIEZO1 / Ca²⁺ channels; SI peaks at ~22% of lysis threshold.
        // 'stable': DR ≤ 8% - field too weak for significant membrane coupling.
        const elState: CellState =
          impact >= THRESHOLDS.HEALTHY_CRITICAL      ? CELL_STATE.CRITICAL
          : impact >= THRESHOLDS.HEALTHY_APPROACHING ? CELL_STATE.APPROACHING
          : impact > THRESHOLDS.VIBRATING_MIN        ? CELL_STATE.NOURISHING
          : CELL_STATE.STABLE
        const ORDER: CellState[] = [CELL_STATE.STABLE, CELL_STATE.NOURISHING, CELL_STATE.APPROACHING, CELL_STATE.CRITICAL]
        this.cellState = ORDER[Math.max(ORDER.indexOf(elState), ORDER.indexOf(thermalFloor))] as CellState
      }
      // Propagate to store so the compact sticky instance can mirror this state
      if (this.type === CELL_TYPE.HEALTHY) this.store.setHealthyCellState(this.cellState)
      else this.store.setTargetCellState(this.cellState)
    },

    drawCell() {
      if (!this.cellData) return
      const el = this.$refs.cellCanvas as HTMLElement
      if (!el) return
      // Stop any running animation before creating a new one, so there is never
      // more than one D3 timer writing to the same canvas element at a time.
      this.helixTimer?.stop()
      const cellCategory = this.type === CELL_TYPE.HEALTHY ? CELL_CATEGORY.MAMMALIAN : this.store.targetCellCategory
      const presetId     = this.type === CELL_TYPE.HEALTHY ? this.store.healthy.id : this.store.target.id
      this.helixTimer = setupBlobAnimation(
        el, this.type, this.accentColor, cellCategory, presetId,
        () => ({
          impact:                 this.disruptionRatio,
          state:                  this.cellState,
          color:                  this.cellColor,
          temperature:            this.temperature,
          fieldVcm:               this.store.fieldIntensity,
          freqKHz:                this.store.currentBroadcastFrequency,
          nuclearDisruptionRatio: this.store.doubleShellEnabled ? this.nuclearDisruptionRatio : 0,
          depCmReal:              this.type === CELL_TYPE.HEALTHY ? this.store.depHealthyCmReal : this.store.depTargetCmReal,
          waveform:               this.store.waveform,
        }),
      )
    },

    drawOscilloscope() {
      if (!this.cellData) return
      const el = this.$refs.oscCanvas as HTMLElement
      if (!el) return
      this.oscTimer?.stop()
      this.oscTimer = setupOscilloscope(
        el, this.accentColor,
        () => ({
          state:           this.cellState,
          impact:          this.disruptionRatio,
          liveAmplitude:   this.liveAmplitude,
          cellColor:       this.cellColor,
          // Acoustic targets: track live broadcast frequency so the oscilloscope
          // waveform speed responds to the frequency slider in real time.
          // Mammalian/healthy: use preset naturalFrequency (fixed membrane resonance).
          naturalFrequency: this.isAcousticTarget
            ? this.store.currentBroadcastFrequency
            : (this.cellData?.naturalFrequency ?? 400),
        }),
      )
    },

    triggerLysis() {
      if (this.compact) return  // compact instances are read-only; lysis is driven by the main card
      this.cellState = CELL_STATE.LYSING
      if (this.type === CELL_TYPE.HEALTHY) this.store.setHealthyCellState(CELL_STATE.LYSING)
      else this.store.setTargetCellState(CELL_STATE.LYSING)
      const expStore = useExperimentStore()
      expStore.logReading(useCellStore(), 'lysis')
      const last = expStore.entries[expStore.entries.length - 1]
      if (last) broadcastLogEntry(last)
      // Snapshot impedance at the lysis moment (target cell only)
      if (this.type === CELL_TYPE.TARGET) {
        useImpedanceStore().snapshotSimulatedReading()
      }
      const el = this.$refs.cellCanvas as HTMLElement
      this.particleInterval = setInterval(() => {
        if (el) spawnFragment(el)
      }, FRAGMENT_INTERVAL_MS)
      this.shatterTimeout = setTimeout(() => {
        clearInterval(this.particleInterval ?? undefined)
        // Stop both animation timers explicitly so no live frame runs after lysis.
        // The timers also self-stop when they see LYSED in getFrame(), but doing it
        // here guarantees the canvas is frozen before Vue updates the overlay v-if.
        this.helixTimer?.stop()
        this.oscTimer?.stop()
        this.cellState = CELL_STATE.LYSED
        if (this.type === CELL_TYPE.HEALTHY) this.store.setHealthyCellState(CELL_STATE.LYSED)
        else this.store.setTargetCellState(CELL_STATE.LYSED)
      }, LYSIS_DURATION_MS)
    },

    onParamChange(key: string, value: number) {
      this.store.updateCellParam(this.type, key, value)
    },

    resetToStable() {
      const cell   = this.type === CELL_TYPE.HEALTHY ? this.store.healthy : this.store.target
      const preset = CELL_PRESETS.find((p) => p.presetId === cell.id)
      if (preset) {
        this.store.loadPreset(this.type, preset)
      } else {
        this.store.resetCell(this.type)
      }
      this.$emit('stable-reset', this.type)
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
@use '../../styles/keyframes' as *;
@use '../../styles/mixins' as *;

/* ── Keyframes (CellCard-specific) ──────────────────────────────────── */
@keyframes card-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px) rotate(-0.3deg); }
  75% { transform: translateX(2px) rotate(0.3deg); }
}

@keyframes card-warn-pulse {
  0%, 100% { box-shadow: 0 0 22px rgba(251, 130, 20, 0.3); }
  50%       { box-shadow: 0 0 42px rgba(251, 130, 20, 0.6); }
}

@keyframes nourishing-pulse {
  0%, 100% { box-shadow: 0 0 28px rgba(0, 212, 255, 0.22), 0 0 0 1px rgba(0, 212, 255, 0.10); }
  50%       { box-shadow: 0 0 52px rgba(0, 212, 255, 0.42), 0 0 0 1px rgba(0, 212, 255, 0.22); }
}

@keyframes nourish-text-pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.80; }
}

@keyframes flicker {
  0%, 100% { opacity: 1; }
  45% { opacity: 0.6; }
  50% { opacity: 0.2; }
  55% { opacity: 0.8; }
}

@keyframes lysis-overlay-appear {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes warn-fade {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.72; }
}

/* ── Vue Transition classes (name="params") ──────────────────────────── */
.params-enter-active, .params-leave-active { transition: opacity 0.2s, transform 0.2s; }
.params-enter-from,  .params-leave-to      { opacity: 0; transform: translateY(-6px); }

/* ── Block ───────────────────────────────────────────────────────────── */
.cell-card {
  background-color: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);

  &--compact {
    padding: 0.5rem;
    border-radius: 6px;
    // Thin state-colored top border - instant traffic-light feedback at a glance
    border-top: 3px solid var(--color-border);

    &.cell-card--nourishing  { border-top-color: var(--color-primary); }
    &.cell-card--approaching { border-top-color: var(--color-amber); }
    &.cell-card--rev-ep      { border-top-color: var(--color-amber); }
    &.cell-card--critical    { border-top-color: var(--color-danger); }
    &.cell-card--vibrating   { border-top-color: var(--color-danger); }
    &.cell-card--lysing      { border-top-color: var(--color-danger); }
    &.cell-card--lysed       { border-top-color: rgba(255, 77, 109, 0.45); }
  }

  // ── Compact info strip ────────────────────────────────────────────────────
  &__compact-strip {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
    padding: 0.45rem 0.5rem 0.3rem;
    font-family: var(--font-mono);
    font-size: 1.05rem;   // larger base, reads ~11 px after 0.72 scale
  }

  &__compact-top {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    white-space: nowrap;
  }

  &__compact-bottom {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding-left: 0.1rem;
  }

  &__compact-badge {
    font-size: 1.0rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    padding: 0.1rem 0.4rem;
    border-radius: 3px;
    line-height: 1.4;

    &--healthy { background: rgba(0, 212, 255, 0.15); color: var(--color-primary); }
    &--target  { background: rgba(255, 77, 109, 0.15); color: var(--color-danger); }
  }

  &__compact-dr {
    font-size: 1.05rem;
    font-weight: 600;
    color: var(--color-text-muted);

    &--nourishing  { color: var(--color-primary); }
    &--approaching { color: var(--color-amber); }
    &--rev-ep      { color: var(--color-amber); }
    &--critical    { color: var(--color-danger); }
    &--vibrating   { color: var(--color-danger); }
    &--lysing      { color: var(--color-danger); }
    &--lysed       { color: rgba(255, 77, 109, 0.6); }
  }

  &__compact-sep {
    color: var(--color-text-muted);
    opacity: 0.45;
    font-size: 0.9rem;
  }

  &__compact-temp {
    font-size: 1.0rem;
    color: var(--color-text-muted);
    opacity: 0.8;
  }

  &__compact-dot {
    font-size: 0.75rem;
    color: var(--color-text-muted);

    &--nourishing  { color: var(--color-primary); }
    &--approaching { color: var(--color-amber); }
    &--rev-ep      { color: var(--color-amber); }
    &--critical    { color: var(--color-danger); }
    &--vibrating   { color: var(--color-danger); animation: warn-fade 0.8s ease-in-out infinite; }
    &--lysing      { color: var(--color-danger); animation: warn-fade 0.5s ease-in-out infinite; }
    &--lysed       { color: rgba(255, 77, 109, 0.5); }
  }

  &__compact-state {
    font-size: 0.95rem;
    letter-spacing: 0.1em;
    color: var(--color-text-muted);

    &--nourishing  { color: var(--color-primary); }
    &--approaching { color: var(--color-amber); }
    &--rev-ep      { color: var(--color-amber); }
    &--critical    { color: var(--color-danger); }
    &--vibrating   { color: var(--color-danger); font-weight: 600; }
    &--lysing      { color: var(--color-danger); font-weight: 600; }
    &--lysed       { color: rgba(255, 77, 109, 0.6); }
  }
  padding: 1.5rem;
  @include flex-col(1rem);
  transition: border-color 0.2s, box-shadow 0.3s;
  min-width: 0;
  overflow: hidden;

  /* ── Type modifiers ────────────────────────────────────────────────── */
  &--healthy {
    border-left: 3px solid var(--color-accent);
    &:hover { border-color: var(--color-accent); }
  }

  &--target {
    border-left: 3px solid var(--color-danger);
    &:hover { border-color: var(--color-danger); }
  }

  /* ── State modifiers ───────────────────────────────────────────────── */
  &--nourishing {
    animation: nourishing-pulse 2.8s ease-in-out infinite;
    border-left-color: var(--color-accent) !important;
  }

  /* Reversible EP window (target, 50-85%): amber glow - permeabilized but survivable */
  &--rev-ep.cell-card--target {
    border-left-color: #fbbf24 !important;
    box-shadow: 0 0 22px rgba(251, 191, 36, 0.28);
    animation: card-warn-pulse 1.8s ease-in-out infinite;
  }

  &--vibrating { box-shadow: 0 0 24px rgba(255, 77, 109, 0.14); }

  &--lysing {
    box-shadow: 0 0 36px rgba(255, 77, 109, 0.4);
    border-color: var(--color-danger) !important;
    animation: card-shake 0.08s linear infinite;
  }

  &--lysed {
    opacity: 0.65;
    border-color: #444 !important;
    box-shadow: none;
  }

  /* Healthy-cell electroporation risk states */
  &--healthy.cell-card--approaching {
    border-left-color: #fbbf24 !important;
    box-shadow: 0 0 22px rgba(251, 191, 36, 0.22);
  }

  &--healthy.cell-card--critical {
    border-left-color: #fb923c !important;
    animation: card-warn-pulse 1.1s ease-in-out infinite;
  }

  /* Target thermal states */
  &--approaching.cell-card--target {
    border-left-color: #fbbf24 !important;
    box-shadow: 0 0 22px rgba(251, 191, 36, 0.18);
  }

  &--critical.cell-card--target {
    border-left-color: #fb923c !important;
    animation: card-warn-pulse 1.1s ease-in-out infinite;
  }

  /* ── Header ────────────────────────────────────────────────────────── */
  &__header {
    display: flex;
    align-items: flex-start;
    gap: 0.85rem;
    min-height: 5.5rem;  /* ensures canvas/params start at same Y in both cards */
  }

  &__icon {
    font-size: 1.8rem;
    line-height: 1;
    flex-shrink: 0;
  }

  &--healthy &__icon { color: var(--color-accent); }
  &--target  &__icon { color: var(--color-danger); }

  &__name {
    flex: 1;
    min-width: 0;
    @include flex-col(0.15rem);
  }

  &__label {
    font-weight: 600;
    font-size: 1rem;
    color: var(--color-text-heading);
    line-height: 1.25;
  }

  &__sublabel {
    @include mono-upper(0.72rem);
    color: var(--color-text-muted);
    line-height: 1.3;

    &--has-tip {
      cursor: help;
      border-bottom: 1px dotted rgba(255, 255, 255, 0.25);
      text-decoration-skip-ink: none;
    }
  }

  &__meta {
    @include flex-row(0.3rem);
    margin-top: 0.3rem;
    font-size: 0.68rem;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    white-space: nowrap;
  }

  &__meta-sep   { opacity: 0.4; }
  &__meta-state { text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }
  &__meta-temp-warn { color: #ffb800; }

  /* ── Nuclear envelope readout ──────────────────────────────────────── */
  &__nuclear-meta {
    @include flex-row(0.35rem);
    font-family: var(--font-mono);
    font-size: 0.58rem;
    color: #a78bfa;
    margin-top: 0.1rem;
  }

  &__nuclear-label { opacity: 0.65; letter-spacing: 0.06em; }
  &__nuclear-value { font-weight: 600; }
  &__nuclear-ratio {
    opacity: 0.8;
    &--caution { color: #fbbf24; }
    &--warn    { color: #ff4d6d; animation: state-blink 1s ease-in-out infinite; }
  }

  &__nuclear-bar-row {
    @include flex-row(0.4rem);
    padding: 0.2rem 0.6rem;
  }

  &__nuclear-bar-label {
    font-family: var(--font-mono);
    font-size: 0.55rem;
    color: #a78bfa;
    opacity: 0.75;
    white-space: nowrap;
    width: 1.8rem;
    flex-shrink: 0;
  }

  &__nuclear-bar-track {
    flex: 1;
    height: 3px;
    background: rgba(167, 139, 250, 0.12);
    border-radius: 2px;
    overflow: hidden;
  }

  &__nuclear-bar-fill {
    height: 100%;
    background: #a78bfa;
    border-radius: 2px;
    transition: width 0.3s ease;

    &--caution { background: #fbbf24; }
    &--warn    { background: #ff4d6d; }
  }

  &__nuclear-bar-pct {
    font-family: var(--font-mono);
    font-size: 0.55rem;
    color: #a78bfa;
    opacity: 0.75;
    width: 2rem;
    text-align: right;
    flex-shrink: 0;
  }

  /* ── Biomodulation panel (healthy cell, sub-threshold) ─────────────── */
  &__biostim {
    background: rgba(0, 212, 255, 0.045);
    border: 1px solid rgba(0, 212, 255, 0.13);
    border-radius: var(--radius);
    padding: 0.5rem 0.65rem;
    cursor: help;
    margin: 0 0.15rem;
    transition: border-color 0.3s, background 0.3s;

    &--nourishing {
      background: rgba(0, 212, 255, 0.08);
      border-color: rgba(0, 212, 255, 0.30);
    }

    &-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 0.4rem;
    }

    &-title {
      @include mono-upper(0.6rem, 0.09em);
      color: var(--color-accent);
      opacity: 0.80;
    }

    &-score {
      font-size: 0.68rem;
      font-family: var(--font-mono);
      font-weight: 700;
      transition: color 0.3s;

      &--low    { color: var(--color-accent); opacity: 0.40; }
      &--medium { color: var(--color-accent); opacity: 0.75; }
      &--high   { color: #39ff14; }
      &--active { animation: nourish-text-pulse 2.2s ease-in-out infinite; }
    }

    &-bars { @include flex-col(0.22rem); }

    &-row {
      display: grid;
      grid-template-columns: 4.8rem 1fr 2.2rem;
      align-items: center;
      gap: 0.4rem;
    }

    &-label {
      font-size: 0.54rem;
      font-family: var(--font-mono);
      color: var(--color-text-muted);
      white-space: nowrap;
      opacity: 0.80;
    }

    &-track {
      height: 3px;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 2px;
      overflow: hidden;
    }

    &-fill {
      height: 100%;
      border-radius: 2px;
      transition: width 0.25s ease;

      &--si  { background: var(--color-accent); }
      &--mte { background: #7c6cff; }
      &--ma  { background: #fbbf24; }
    }

    &-val {
      font-size: 0.54rem;
      font-family: var(--font-mono);
      color: var(--color-text-muted);
      text-align: right;
      opacity: 0.75;
    }
  }

  /* ── State colors (generated from Sass map) ────────────────────────── */
  @include cell-state-classes();

  /* ── Params toggle ─────────────────────────────────────────────────── */
  &__params-toggle {
    @include flex-row(0.45rem);
    @include mono-upper(0.62rem, 0.1em);
    color: var(--color-text);
    cursor: pointer;
    user-select: none;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    padding: 0.3rem 0.65rem;
    transition: border-color 0.15s, background-color 0.15s, color 0.15s;

    &:hover {
      border-color: rgba(255, 255, 255, 0.2);
      background: rgba(255, 255, 255, 0.06);
      color: var(--color-text-heading);
    }
  }

  &__params-toggle-arrow { font-size: 0.7rem; opacity: 0.75; }

  /* ── Params panel ──────────────────────────────────────────────────── */
  &__params-panel {
    background-color: rgba(0, 0, 0, 0.3);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    padding: 0.65rem 0.85rem;
    @include flex-col(0.45rem);
  }

  &__param-row {
    display: grid;
    grid-template-columns: 1fr auto auto;
    align-items: center;
    gap: 0.5rem;

    &--derived { opacity: 0.8; pointer-events: none; }
  }

  &__param-label {
    @include mono-upper(0.6rem);
    color: var(--color-text-muted);
  }

  &__param-input {
    width: 5rem;
    background: var(--color-surface);
    border: 1px solid var(--color-border);
    border-radius: 3px;
    color: var(--color-text-heading);
    font-family: var(--font-mono);
    font-size: 0.7rem;
    padding: 0.15rem 0.35rem;
    text-align: right;
    -moz-appearance: textfield;
    appearance: textfield;

    &::-webkit-inner-spin-button,
    &::-webkit-outer-spin-button { opacity: 0.3; }

    &:focus { outline: none; border-color: var(--color-primary); }
  }

  &__param-unit {
    font-size: 0.6rem;
    font-family: var(--font-mono);
    color: var(--color-text-muted);
    opacity: 0.6;
    width: 2.5rem;
    text-align: left;
  }

  &__params-derived-hdr {
    @include flex-row(0.5rem);
    padding-top: 0.3rem;
    margin-top: 0.1rem;
    border-top: 1px solid var(--color-border);
    cursor: default;
  }

  &__params-derived-label {
    @include mono-upper(0.62rem, 0.12em);
    color: var(--color-text-muted);
  }

  &__param-derived-value {
    font-size: 0.7rem;
    font-family: var(--font-mono);
    color: var(--color-text);
    text-align: right;
    width: 5rem;
  }

  &__params-reset-row {
    display: flex;
    justify-content: flex-end;
    padding-top: 0.2rem;
    border-top: 1px solid var(--color-border);
    margin-top: 0.1rem;
  }

  &__params-btn {
    background: transparent;
    border: 1px solid var(--color-border);
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    font-size: 0.58rem;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    padding: 0.18rem 0.55rem;
    border-radius: 3px;
    cursor: pointer;
    transition: border-color 0.15s, color 0.15s;

    &:hover {
      border-color: var(--color-primary);
      color: var(--color-primary);
    }
  }

  /* ── Visualization ─────────────────────────────────────────────────── */
  &__visual {
    background-color: rgba(0, 0, 0, 0.45);
    border: 1px solid var(--color-border);
    border-radius: var(--radius);
    overflow: hidden;
    position: relative;
  }

  &__canvas {
    display: flex;
    justify-content: center;
    line-height: 0;
    overflow: hidden;

    svg { display: block; width: auto; height: auto; max-width: 100%; max-height: 180px; }
  }

  &__osc-divider {
    @include flex-between();
    padding: 0.2rem 0.6rem;
    border-top: 1px solid var(--color-border);
    border-bottom: 1px solid var(--color-border);
  }

  &__osc-label {
    @include mono-upper(0.62rem, 0.1em);
    color: var(--color-text-muted);
    opacity: 0.7;
  }

  &__osc-impact {
    @include mono-upper(0.62rem);
  }

  &--healthy &__osc-impact { color: var(--color-accent); }
  &--target  &__osc-impact { color: var(--color-danger); }

  &__osc-canvas {
    display: block;
    width: 100%;
    line-height: 0;

    svg { display: block; width: 100%; height: auto; }
  }

  /* ── DEP strip (non-resonance, |K| ≥ 0.02) ────────────────────────── */
  &__dep-strip {
    @include status-strip(var(--color-lime), rgba(57, 255, 20, 0.05), rgba(57, 255, 20, 0.18));
    cursor: help;

    &--ndep {
      @include status-strip(var(--color-amber), rgba(255, 153, 0, 0.05), rgba(255, 153, 0, 0.18));
    }
  }

  /* ── Nourishing strip (healthy, DR 8-45%) ──────────────────────────── */
  &__nourishing-strip {
    @include status-strip(var(--color-accent), rgba(0, 212, 255, 0.06), rgba(0, 212, 255, 0.22), nourish-text-pulse, 2.8s);
    border-bottom: 1px solid rgba(0, 212, 255, 0.12);
  }

  /* ── Reversible EP strip (target, 50-85%) ──────────────────────────── */
  &__rev-ep-strip {
    @include status-strip(#fbbf24, rgba(251, 191, 36, 0.08), rgba(251, 191, 36, 0.3), warn-fade, 1.8s);
  }

  /* ── Lysis strip ───────────────────────────────────────────────────── */
  &__lysis-strip {
    @include status-strip(var(--color-danger), rgba(255, 77, 109, 0.08), rgba(255, 77, 109, 0.3), warn-fade, 1.1s);
  }

  /* ── Structural integrity countdown bar ────────────────────────────── */
  &__integrity-bar-row {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    padding: 0.3rem 0.75rem 0.35rem;
    background: rgba(255, 77, 109, 0.05);
    border-top: 1px solid rgba(255, 77, 109, 0.15);
  }

  &__integrity-label {
    flex-shrink: 0;
    font-family: var(--font-mono);
    font-size: 0.6rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: rgba(255, 77, 109, 0.75);
    white-space: nowrap;
  }

  &__integrity-track {
    flex: 1;
    height: 5px;
    background: rgba(255, 77, 109, 0.15);
    border-radius: 3px;
    overflow: hidden;
  }

  &__integrity-fill {
    height: 100%;
    background: linear-gradient(90deg, #ff4d6d 0%, #ff8c42 100%);
    border-radius: 3px;
    transition: width 0.1s linear;
  }

  &__integrity-pct {
    flex-shrink: 0;
    font-family: var(--font-mono);
    font-size: 0.62rem;
    font-weight: 700;
    color: var(--color-danger);
    min-width: 2.6rem;
    text-align: right;
  }

  /* ── Warn icon/text/pct (shared by multiple strips) ─────────────────── */
  &__warn-icon { flex-shrink: 0; }
  &__warn-text { flex: 1; }
  &__warn-pct  { flex-shrink: 0; font-weight: 700; }

  /* ── Healthy warn strip ────────────────────────────────────────────── */
  &__healthy-warn {
    @include status-strip(#fbbf24, rgba(251, 191, 36, 0.08), rgba(251, 191, 36, 0.3), warn-fade, 2s);

    &--critical {
      color: #fb923c;
      background: rgba(251, 130, 20, 0.12);
      border-top-color: rgba(251, 130, 20, 0.45);
      animation-duration: 0.85s;
    }
  }

  /* ── Thermal warn strip ────────────────────────────────────────────── */
  &__thermal-warn {
    @include status-strip(#fbbf24, rgba(251, 191, 36, 0.08), rgba(251, 191, 36, 0.3), warn-fade, 2s);

    &--denaturing {
      color: #fb923c;
      background: rgba(251, 130, 20, 0.12);
      border-top-color: rgba(251, 130, 20, 0.45);
      animation-duration: 0.85s;
    }
  }

  /* ── Lysis overlay ─────────────────────────────────────────────────── */
  &__destroyed {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    background-color: rgba(6, 2, 14, 0.90);
    backdrop-filter: blur(3px);
    // Fade in over 350 ms so the one-frame gap between Vue state update and the D3
    // timer's final LYSED cleanup is never visible to the user.
    animation: lysis-overlay-appear 0.35s ease forwards;
  }

  &__destroyed-text {
    font-family: var(--font-mono);
    font-size: 0.75rem;
    color: var(--color-danger);
    letter-spacing: 0.15em;
    text-transform: uppercase;
    animation: flicker 1.5s ease-in-out infinite;
  }

  &__destroyed-sub {
    font-family: var(--font-mono);
    font-size: 0.6rem;
    color: #ff8c00;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    opacity: 0.8;
  }

  &__lysis-btn {
    background: transparent;
    border: 1px solid var(--color-danger);
    color: var(--color-danger);
    padding: 0.35rem 1rem;
    border-radius: var(--radius);
    font-size: 0.75rem;
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    cursor: pointer;
    transition: all 0.15s;

    &:hover:not(:disabled) { background-color: rgba(255, 77, 109, 0.12); }
    &:disabled { opacity: 0.35; cursor: not-allowed; border-color: #555; color: #555; }

    &--locked {
      font-size: 0.62rem;
      font-family: var(--font-mono);
      color: var(--color-text-muted);
      letter-spacing: 0.06em;
      text-transform: uppercase;
      opacity: 0.6;
    }
  }

  /* ── Body ──────────────────────────────────────────────────────────── */
  &__body {
    color: var(--color-text-muted);
    font-size: 0.875rem;
    line-height: 1.65;
    flex: 1;
  }
}
</style>
