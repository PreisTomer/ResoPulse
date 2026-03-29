<!-- Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited. -->
<template>
  <div v-if="cellData" :class="['cell-visual', { 'cell-visual--lysed': cellState === CELL_STATE.LYSED }]">

    <div ref="cellCanvas" class="cell-visual__canvas"></div>

    <!-- Oscilloscope readout divider (Vm / disruption %) -->
    <div v-if="!compact" class="cell-visual__osc-divider">
      <span class="cell-visual__osc-label" v-tip="tipVmLocal">OSC · {{ vmDisplay }}</span>
      <span v-if="disruptionRatio > 0.05" class="cell-visual__osc-impact" :class="`cell-visual__osc-impact--${type}`" v-tip="tipDisruption">
        {{ ICON.LIGHTNING }} {{ (disruptionRatio * 100).toFixed(0) }}% disruption
      </span>
    </div>

    <!-- Nuclear envelope disruption bar (double-shell model) -->
    <div
      v-if="!compact && store.doubleShellEnabled && hasNuclearParams"
      class="cell-visual__nuclear-bar-row"
      v-tip="tipNuclearBarLocal"
    >
      <span class="cell-visual__nuclear-bar-label">{{ ICON.NUCLEUS }} NE</span>
      <div class="cell-visual__nuclear-bar-track">
        <div
          class="cell-visual__nuclear-bar-fill"
          :style="{ width: Math.min(100, nuclearDisruptionRatio * 100) + '%' }"
          :class="{
            'cell-visual__nuclear-bar-fill--caution': nuclearDisruptionRatio >= THRESHOLDS.HEALTHY_APPROACHING && nuclearDisruptionRatio < THRESHOLDS.DISRUPTION_WARN,
            'cell-visual__nuclear-bar-fill--warn':    nuclearDisruptionRatio >= THRESHOLDS.DISRUPTION_WARN,
          }"
        ></div>
      </div>
      <span class="cell-visual__nuclear-bar-pct">{{ (nuclearDisruptionRatio * 100).toFixed(0) }}%</span>
    </div>

    <div ref="oscCanvas" class="cell-visual__osc-canvas"></div>

    <!-- Compact sticky strip (replaces verbose data strips in live-view mode) -->
    <div v-if="compact" class="cell-visual__compact-strip">
      <div class="cell-visual__compact-top">
        <span :class="['cell-visual__compact-badge', `cell-visual__compact-badge--${type}`]">
          {{ type === CELL_TYPE.HEALTHY ? 'H' : 'T' }}
        </span>
        <span :class="['cell-visual__compact-dr', `cell-visual__compact-dr--${cellState}`]">
          DR&nbsp;{{ (disruptionRatio * 100).toFixed(0) }}%
        </span>
        <span class="cell-visual__compact-sep">·</span>
        <span class="cell-visual__compact-temp">{{ temperature.toFixed(1) }}{{ UNIT.DEG_C }}</span>
      </div>
      <div class="cell-visual__compact-bottom">
        <span :class="['cell-visual__compact-dot', `cell-visual__compact-dot--${cellState}`]">{{ ICON.DOT }}</span>
        <span :class="['cell-visual__compact-state', `cell-visual__compact-state--${cellState}`]">
          {{ compactStateLabel }}
        </span>
      </div>
    </div>

    <!-- DEP strip (non-resonance, |K| ≥ 0.02) -->
    <div
      v-if="!compact && showDepStrip"
      class="cell-visual__dep-strip"
      :class="depStripModifier"
      v-tip="tipDep"
    >
      <span class="cell-visual__warn-icon">{{ ICON.DEP }}</span>
      <span class="cell-visual__warn-text">{{ depStripLabel }}</span>
      <span class="cell-visual__warn-pct">K {{ depStripValue }}</span>
    </div>

    <!-- Nourishing strip (healthy, DR 8–45%) -->
    <div
      v-if="!compact && type === CELL_TYPE.HEALTHY && cellState === CELL_STATE.NOURISHING"
      class="cell-visual__nourishing-strip"
      v-tip="tipStateLocal"
    >
      <span class="cell-visual__warn-icon">{{ ICON.NOURISH }}</span>
      <span class="cell-visual__warn-text">{{ $t('cells.states.nourishing', { bms: (biostimScore * 100).toFixed(0) }) }}</span>
      <span class="cell-visual__warn-pct">{{ (disruptionRatio * 100).toFixed(0) }}%</span>
    </div>

    <!-- Biomodulation panel (healthy cell only, sub-threshold) -->
    <BiostimPanel
      v-if="!compact && showBiostim"
      :stim-index="store.healthyStimIndex"
      :mech-transd-eff="store.healthyMechTransductionEff"
      :mild-thermal="store.healthyMildThermalActivation"
      :biomod-score="biostimScore"
      :disruption-ratio="disruptionRatio"
      :freq-k-hz="store.currentBroadcastFrequency"
      :fc-k-hz="store.healthyFc"
      :steady-state-temp="store.healthySteadyStateTemp"
      :class="{ 'cell-visual__biostim--nourishing': cellState === CELL_STATE.NOURISHING }"
    />

    <!-- Reversible EP strip (target, 50–85%, Weaver & Chizmadzhev 1996) -->
    <div
      v-if="type === CELL_TYPE.TARGET && cellState === CELL_STATE.REV_EP"
      class="cell-visual__rev-ep-strip"
      v-tip="tipDisruption"
    >
      <span class="cell-visual__warn-icon">{{ ICON.LIGHTNING }}</span>
      <span class="cell-visual__warn-text">{{ $t('cells.states.revEp') }}</span>
      <span class="cell-visual__warn-pct">{{ (disruptionRatio * 100).toFixed(0) }}%</span>
      <span class="cell-visual__reseal-time">{{ $t('cells.states.resealTime', { s: resealingTimeDisplay }) }}</span>
    </div>

    <!-- Lysis armed strip (target >85%, IRE protocol imminent) -->
    <div
      v-if="type === CELL_TYPE.TARGET && cellState === CELL_STATE.VIBRATING"
      class="cell-visual__lysis-strip"
      v-tip="tipDisruption"
    >
      <span class="cell-visual__warn-icon">{{ ICON.LYSIS_BOLT }}</span>
      <span class="cell-visual__warn-text">{{ $t('cells.states.lysisArmed', { protocol: lysisProtocolStr }) }}</span>
      <span class="cell-visual__warn-pct">{{ (disruptionRatio * 100).toFixed(0) }}%</span>
    </div>

    <!-- Structural integrity countdown (drains 100→0% as lysis timer runs) -->
    <div v-if="lysisIntegrityPct !== null" class="cell-visual__integrity-bar-row">
      <span class="cell-visual__integrity-label">{{ $t('cells.integrityLabel') }}</span>
      <div class="cell-visual__integrity-track">
        <div class="cell-visual__integrity-fill" :style="{ width: lysisIntegrityPct + '%' }"></div>
      </div>
      <span class="cell-visual__integrity-pct">{{ lysisIntegrityPct.toFixed(0) }}%</span>
    </div>

    <!-- Healthy EP risk strip (approaching / critical states) -->
    <div
      v-if="!compact && type === CELL_TYPE.HEALTHY && (cellState === CELL_STATE.APPROACHING || cellState === CELL_STATE.CRITICAL) && !tempWarning"
      class="cell-visual__healthy-warn"
      :class="{ 'cell-visual__healthy-warn--critical': cellState === CELL_STATE.CRITICAL }"
      v-tip="tipStateLocal"
    >
      <span class="cell-visual__warn-icon">{{ cellState === CELL_STATE.CRITICAL ? ICON.LIGHTNING : ICON.WARNING }}</span>
      <span class="cell-visual__warn-text">
        {{ cellState === CELL_STATE.CRITICAL ? $t('cells.states.critical') : $t('cells.states.approaching') }}
      </span>
      <span class="cell-visual__warn-pct">{{ (disruptionRatio * 100).toFixed(0) }}%</span>
    </div>

    <!-- Thermal warning strip (both cell types) -->
    <div
      v-if="tempWarning && cellState !== CELL_STATE.LYSED && cellState !== CELL_STATE.LYSING"
      class="cell-visual__thermal-warn"
      :class="{ 'cell-visual__thermal-warn--denaturing': tempDenaturing }"
      v-tip="tipTempLocal"
    >
      <span class="cell-visual__warn-icon">{{ tempDenaturing ? ICON.LIGHTNING : ICON.WARNING }}</span>
      <span class="cell-visual__warn-text">
        {{ tempDenaturing ? $t('cells.states.thermalCritical') : $t('cells.states.thermalWarning') }}
      </span>
      <span class="cell-visual__warn-pct">{{ temperature.toFixed(0) }}{{ UNIT.DEG_C }}</span>
    </div>

    <!-- Lysis overlay (absolute, no card height shift) -->
    <div v-if="cellState === CELL_STATE.LYSED" class="cell-visual__destroyed">
      <span class="cell-visual__destroyed-text">{{ thermalLysis ? $t('cells.states.thermalLysis') : $t('cells.states.membraneLysed') }}</span>
      <span v-if="thermalLysis" class="cell-visual__destroyed-sub">{{ $t('cells.states.vaporized') }}</span>
      <div class="cell-visual__reset-row">
        <button class="cell-visual__lysis-btn" v-tip="$t('cells.states.tipResetCell')" @click.stop="resetToStable">{{ $t('cells.states.resetCell') }}</button>
        <button class="cell-visual__lysis-btn cell-visual__lysis-btn--full" v-tip="$t('cells.states.tipResetCellFull')" @click.stop="resetToSafeDefaults">{{ $t('cells.states.resetCellFull') }}</button>
      </div>
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
import type { CellState } from '@/types/cell'
import {
  CELL_COLORS,
  THRESHOLDS,
  LYSIS_DURATION_MS,
  FRAGMENT_INTERVAL_MS,
} from '@/constants/cellCard'
import { setupBlobAnimation, setupOscilloscope, spawnFragment } from './cellAnimation'
import type { CellVisualProfile } from './cellAnimation'
import { CELL_STATE, CELL_TYPE, CELL_CATEGORY } from '@/constants/strings'
import { ICON } from '@/constants/icons'
import { UNIT } from '@/constants/units'
import { formatLysisTimeLocal, tipNuclearBar as tipNuclearBarFn, tipDep as tipDepFn, tipDisruption as tipDisruptionFn, tipVm as tipVmFn, tipAcousticVm as tipAcousticVmFn, tipTemp as tipTempFn, tipState as tipStateFn } from '@/tooltips/cellCardTooltips'
import { hideTip } from '@/directives/vTooltip'
import BiostimPanel from './BiostimPanel.vue'

export default defineComponent({
  components: { BiostimPanel },
  emits: ['stable-reset', 'full-reset', 'thermal-lysis'],

  props: {
    type:     { type: String as PropType<'healthy' | 'target'>, required: true },
    compact:  { type: Boolean, default: false },
    cellData: { type: Object as PropType<CellRecord | null>, default: null },
  },

  setup() {
    return { store: useCellStore(), CELL_STATE, CELL_TYPE, ICON, UNIT, THRESHOLDS }
  },

  data() {
    return {
      liveAmplitude:        this.cellData?.amplitude ?? 0.8,
      cellState:            CELL_STATE.STABLE as CellState,
      shatterPending:       false,
      thermalLysis:         false,
      lysisProgressElapsed: 0,
      helixTimer:           null as d3.Timer | null,
      oscTimer:             null as d3.Timer | null,
      particleInterval:     null as ReturnType<typeof setInterval> | null,
      shatterTimeout:       null as ReturnType<typeof setTimeout> | null,
      shatterDelayTimeout:  null as ReturnType<typeof setTimeout> | null,
      progressInterval:     null as ReturnType<typeof setInterval> | null,
    }
  },

  computed: {
    isAcousticTarget(): boolean {
      if (this.type !== CELL_TYPE.TARGET) return false
      const cat = this.store.targetCellCategory
      if (cat !== CELL_CATEGORY.BACTERIA && cat !== CELL_CATEGORY.VIRUS) return false
      const t = this.store.target as CellConfig & { resonantFreqGHz?: number }
      return !!t.resonantFreqGHz
    },

    accentColor(): string { return CELL_COLORS[this.type].accent },

    disruptionRatio(): number {
      return this.type === CELL_TYPE.HEALTHY
        ? this.store.healthyDisruptionRatio
        : this.store.targetDisruptionRatio
    },

    temperature(): number {
      return this.type === CELL_TYPE.HEALTHY ? this.store.healthyTemp : this.store.targetTemp
    },

    vm(): number {
      return (this.type === CELL_TYPE.HEALTHY ? this.store.healthyVm : this.store.targetVm) * 1000
    },

    vmDisplay(): string {
      if (this.isAcousticTarget) return `DR ${(this.disruptionRatio * 100).toFixed(0)}${UNIT.PERCENT}`
      return `${this.vm.toFixed(1)} ${UNIT.MV}`
    },

    tempWarning():   boolean { return this.temperature > THRESHOLDS.TEMP_WARN },
    tempDenaturing(): boolean { return this.temperature >= THRESHOLDS.TEMP_DENATURING },
    tempVaporizing(): boolean { return this.temperature >= THRESHOLDS.TEMP_VAPORIZING },

    hasNuclearParams(): boolean {
      const cell = this.type === CELL_TYPE.HEALTHY ? this.store.healthy : this.store.target
      return !!cell.nuclearRadius
    },

    nuclearDisruptionRatio(): number {
      return this.type === CELL_TYPE.HEALTHY
        ? this.store.healthyNuclearDisruptionRatio
        : this.store.targetNuclearDisruptionRatio
    },

    lysisIntegrityPct(): number | null {
      if (this.type !== CELL_TYPE.TARGET || !this.shatterPending) return null
      const delay = this.store.lysisDelayMs
      if (delay <= 0) return 0
      return Math.max(0, 100 - (this.lysisProgressElapsed / delay) * 100)
    },

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

    biostimScore(): number { return this.store.healthyBiomodScore },

    showBiostim(): boolean {
      return this.type === CELL_TYPE.HEALTHY
        && this.disruptionRatio < THRESHOLDS.NOURISHING
        && this.cellState !== CELL_STATE.LYSED
        && this.cellState !== CELL_STATE.LYSING
    },

    lysisProtocolStr(): string {
      const n = this.store.lysisNPulses
      const t = formatLysisTimeLocal(this.store.lysisDelayMs)
      return `${n} pulse${n === 1 ? '' : 's'}, est. ${t}`
    },

    resealingTimeDisplay(): string {
      const s = this.store.targetResealingTimeS
      return s >= 10 ? s.toFixed(0) : s.toFixed(1)
    },

    // ── DEP strip ──────────────────────────────────────────────────────
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
      return !this.store.isResonanceMode
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
        ? 'cell-visual__dep-strip--pdep'
        : 'cell-visual__dep-strip--ndep'
    },

    // ── Local tooltips (for strips only; index.vue owns the CellHeader copies) ──
    tipVmLocal(): string {
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
      return tipVmFn({ vmDisplay: this.vmDisplay, disruptionRatio: this.disruptionRatio, thresholdVoltage: cell.thresholdVoltage, waveform: this.store.waveform })
    },

    tipTempLocal(): string {
      return tipTempFn({
        tempDisplay:    `${this.temperature.toFixed(1)} ${UNIT.DEG_C}`,
        tempVaporizing: this.tempVaporizing,
        tempDenaturing: this.tempDenaturing,
        tempWarning:    this.tempWarning,
      })
    },

    tipStateLocal(): string {
      return tipStateFn({
        cellState:    this.cellState,
        thermalLysis: this.thermalLysis,
        cellType:     this.type,
        lysisDelayMs: this.store.lysisDelayMs,
      })
    },

    tipNuclearBarLocal(): string { return tipNuclearBarFn() },

    tipDep(): string {
      const cell = this.type === CELL_TYPE.HEALTHY ? this.store.healthy : this.store.target
      return tipDepFn({
        isPdep:       this.depCmRealValue > 0,
        kVal:         this.depCmRealValue,
        crossoverKHz: this.depCrossoverKHz,
        sigmaI:       cell.conductivity,
        sigmaE:       this.store.effectiveSigmaE,
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
        isResonanceMode:     this.store.isResonanceMode,
        pulseWidthNs:        this.store.pulseWidthNs,
        effectiveSigmaE:     this.store.effectiveSigmaE,
        vmDisplay:           this.vmDisplay,
        cellType:            this.type,
        cell,
      })
    },
  },

  watch: {
    'cellData.amplitude'(v: number) { this.liveAmplitude = v },

    'store.target.id'() {
      if (this.type !== CELL_TYPE.TARGET) return
      this.helixTimer?.stop()
      this.$nextTick(() => this.drawCell())
    },

    'store.resetCounter'() {
      clearTimeout(this.shatterTimeout ?? undefined)
      clearTimeout(this.shatterDelayTimeout ?? undefined)
      clearInterval(this.particleInterval ?? undefined)
      clearInterval(this.progressInterval ?? undefined)
      this.shatterTimeout = this.shatterDelayTimeout = this.particleInterval = this.progressInterval = null
      this.shatterPending = false
      this.lysisProgressElapsed = 0
      if (this.thermalLysis) {
        this.thermalLysis = false
        this.$emit('thermal-lysis', false)
      }
      this.cellState     = CELL_STATE.STABLE
      this.liveAmplitude = this.cellData?.amplitude ?? 0.8
      this.helixTimer?.stop()
      this.$nextTick(() => { this.drawCell(); this.drawOscilloscope() })
    },

    disruptionRatio() { if (!this.compact) this.updateCellState() },
    temperature()     { if (!this.compact) this.updateCellState() },

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
      this.progressInterval = setInterval(() => { this.lysisProgressElapsed += 50 }, 50)
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
      this.cellState = this.type === CELL_TYPE.HEALTHY
        ? this.store.healthyCellState
        : this.store.targetCellState
    }
    if (this.cellData) { this.drawCell(); this.drawOscilloscope() }
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
        this.$emit('thermal-lysis', true)
        this.triggerLysis()
        return
      }

      const thermalFloor: CellState =
        temp >= THRESHOLDS.TEMP_DENATURING ? CELL_STATE.CRITICAL
        : temp >= THRESHOLDS.TEMP_WARN     ? CELL_STATE.APPROACHING
        : CELL_STATE.STABLE

      if (this.type === CELL_TYPE.TARGET) {
        if (impact > THRESHOLDS.DISRUPTION_WARN) {
          this.cellState = CELL_STATE.VIBRATING
          this.store.setTargetCellState(CELL_STATE.VIBRATING)
          if (!this.shatterPending) {
            this.shatterPending = true
            this.lysisProgressElapsed = 0
            this.progressInterval = setInterval(() => { this.lysisProgressElapsed += 50 }, 50)
            this.shatterDelayTimeout = setTimeout(() => {
              clearInterval(this.progressInterval ?? undefined)
              this.progressInterval = null
              this.shatterPending   = false
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
        const elState: CellState =
          impact >= THRESHOLDS.HEALTHY_APPROACHING ? CELL_STATE.REV_EP
          : impact > THRESHOLDS.VIBRATING_MIN      ? CELL_STATE.APPROACHING
          : CELL_STATE.STABLE
        const ORDER: CellState[] = [CELL_STATE.STABLE, CELL_STATE.APPROACHING, CELL_STATE.REV_EP, CELL_STATE.CRITICAL]
        this.cellState = ORDER[Math.max(ORDER.indexOf(elState), ORDER.indexOf(thermalFloor))] as CellState
      } else {
        const elState: CellState =
          impact >= THRESHOLDS.HEALTHY_CRITICAL      ? CELL_STATE.CRITICAL
          : impact >= THRESHOLDS.HEALTHY_APPROACHING ? CELL_STATE.APPROACHING
          : impact > THRESHOLDS.VIBRATING_MIN        ? CELL_STATE.NOURISHING
          : CELL_STATE.STABLE
        const ORDER: CellState[] = [CELL_STATE.STABLE, CELL_STATE.NOURISHING, CELL_STATE.APPROACHING, CELL_STATE.CRITICAL]
        this.cellState = ORDER[Math.max(ORDER.indexOf(elState), ORDER.indexOf(thermalFloor))] as CellState
      }
      if (this.type === CELL_TYPE.HEALTHY) this.store.setHealthyCellState(this.cellState)
      else this.store.setTargetCellState(this.cellState)
    },

    drawCell() {
      if (!this.cellData) return
      const el = this.$refs.cellCanvas as HTMLElement
      if (!el) return
      this.helixTimer?.stop()
      const cellCategory = this.type === CELL_TYPE.HEALTHY ? CELL_CATEGORY.MAMMALIAN : this.store.targetCellCategory
      const cell = this.type === CELL_TYPE.HEALTHY ? this.store.healthy : this.store.target
      const profile: CellVisualProfile = {
        presetId:         cell.id,
        morphologyTag:    cell.morphologyTag,
        thresholdVoltage: cell.thresholdVoltage,
        conductivity:     cell.conductivity,
        resonantFreqGHz:  cell.resonantFreqGHz,
        capsidQ:          cell.capsidQ,
      }
      this.helixTimer = setupBlobAnimation(
        el, this.type, this.accentColor, cellCategory, profile,
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
          isAcousticMode:         this.isAcousticTarget,
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
          naturalFrequency: this.isAcousticTarget
            ? this.store.currentBroadcastFrequency
            : (this.cellData?.naturalFrequency ?? 400),
        }),
      )
    },

    triggerLysis() {
      if (this.compact) return
      this.cellState = CELL_STATE.LYSING
      if (this.type === CELL_TYPE.HEALTHY) this.store.setHealthyCellState(CELL_STATE.LYSING)
      else this.store.setTargetCellState(CELL_STATE.LYSING)
      const expStore = useExperimentStore()
      expStore.logReading(useCellStore(), 'lysis')
      const last = expStore.entries[expStore.entries.length - 1]
      if (last) broadcastLogEntry(last)
      if (this.type === CELL_TYPE.TARGET) useImpedanceStore().snapshotSimulatedReading()
      const el = this.$refs.cellCanvas as HTMLElement
      this.particleInterval = setInterval(() => { if (el) spawnFragment(el) }, FRAGMENT_INTERVAL_MS)
      this.shatterTimeout = setTimeout(() => {
        clearInterval(this.particleInterval ?? undefined)
        this.helixTimer?.stop()
        this.oscTimer?.stop()
        this.cellState = CELL_STATE.LYSED
        if (this.type === CELL_TYPE.HEALTHY) this.store.setHealthyCellState(CELL_STATE.LYSED)
        else this.store.setTargetCellState(CELL_STATE.LYSED)
      }, LYSIS_DURATION_MS)
    },

    resetToStable() {
      const cell   = this.type === CELL_TYPE.HEALTHY ? this.store.healthy : this.store.target
      const preset = CELL_PRESETS.find(p => p.presetId === cell.id)
      if (preset) this.store.loadPreset(this.type, preset)
      else this.store.resetCell(this.type)
      this.$emit('stable-reset', this.type)
    },

    /** Full reset: restore cell biology AND signal the parent to apply safe field defaults.
     *  Use this when you want both cells to return to a genuinely stable state. */
    resetToSafeDefaults() {
      hideTip()
      const cell   = this.type === CELL_TYPE.HEALTHY ? this.store.healthy : this.store.target
      const preset = CELL_PRESETS.find(p => p.presetId === cell.id)
      if (preset) this.store.loadPreset(this.type, preset)
      else this.store.resetCell(this.type)
      this.$emit('full-reset', this.type)
    },
  },
})
</script>

<style lang="scss" scoped>



/* ── Per-component keyframes ───────────────────────────────────────── */
@keyframes flicker {
  0%, 100% { opacity: 1; }
  45%  { opacity: 0.6; }
  50%  { opacity: 0.2; }
  55%  { opacity: 0.8; }
}

@keyframes lysis-overlay-appear {
  from { opacity: 0; }
  to   { opacity: 1; }
}

// CSS Option A — gentle Y-axis perspective tilt (±8°, 14 s period).
// Works in concert with the D3 scaleX spin (Option B) inside bodyG:
// the canvas frame tilts in 3D space while the cell body itself compresses,
// together creating the illusion of a sphere tumbling on a microscopy stage.
@keyframes cell-canvas-tilt {
  0%   { transform: rotateY(-8deg); }
  50%  { transform: rotateY(8deg); }
  100% { transform: rotateY(-8deg); }
}

@keyframes warn-fade {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.72; }
}

/* ── Root container ─────────────────────────────────────────────────── */
.cell-visual {
  background-color: color-mix(in srgb, black 45%, transparent);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  overflow: hidden;
  position: relative;

  /* ── Cell blob canvas ──────────────────────────────────────────────── */
  &__canvas {
    display: flex;
    justify-content: center;
    line-height: 0;
    // perspective enables GPU 3D compositing for the CSS rotateY tilt on the SVG child.
    // overflow:hidden is intentionally omitted here — .cell-visual already clips at the
    // card boundary, and hiding overflow here would clip the SVG when it tilts in Z.
    perspective: 800px;

    svg {
      display: block;
      width: auto;
      height: auto;
      max-width: 100%;
      max-height: 180px;
      // Option A: slow ±8° Y-axis tilt of the entire canvas frame.
      // Works with Option B (D3 scaleX on bodyG) for combined 3D depth effect.
      animation: cell-canvas-tilt 14s ease-in-out infinite;
    }
  }

  /* ── Lysed state: pause canvas animation to prevent compositor jitter ─ */
  &--lysed &__canvas svg { animation-play-state: paused; }

  /* ── Oscilloscope divider ──────────────────────────────────────────── */
  &__osc-divider {
    @include flex-between();
    padding: 0.2rem 0.6rem;
    border-top: 1px solid var(--color-border);
    border-bottom: 1px solid var(--color-border);
  }

  &__osc-label {
    @include mono-upper(0.62rem, 0.1em);
    color: var(--color-text-muted);
    opacity: var(--op-dim);
  }

  &__osc-impact {
    @include mono-upper(0.62rem);
    &--healthy { color: var(--color-accent); }
    &--target  { color: var(--color-danger); }
  }

  /* ── Oscilloscope waveform canvas ──────────────────────────────────── */
  &__osc-canvas {
    display: block;
    width: 100%;
    line-height: 0;

    svg { display: block; width: 100%; height: auto; }
  }

  /* ── Nuclear envelope disruption bar ───────────────────────────────── */
  &__nuclear-bar-row { @include flex-row(0.4rem); padding: 0.2rem 0.6rem; }

  &__nuclear-bar-label {
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    color: var(--color-purple);
    opacity: 0.75; // intentional between-tier value
    white-space: nowrap;
    width: 1.8rem;
    flex-shrink: 0;
  }

  &__nuclear-bar-track {
    flex: 1;
    height: 3px;
    background: color-mix(in srgb, var(--color-purple) 12%, transparent);
    border-radius: 2px;
    overflow: hidden;
  }

  &__nuclear-bar-fill {
    height: 100%;
    background: var(--color-purple);
    border-radius: 2px;
    transition: width var(--tr-slow);

    &--caution { background: var(--color-amber); }
    &--warn    { background: var(--color-danger); }
  }

  &__nuclear-bar-pct {
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    color: var(--color-purple);
    opacity: 0.75; // intentional between-tier value
    width: 2rem;
    text-align: right;
    flex-shrink: 0;
  }

  /* ── Compact sticky strip ──────────────────────────────────────────── */
  &__compact-strip {
    @include flex-col(0.2rem);
    padding: 0.45rem 0.5rem 0.3rem;
    font-family: var(--font-mono);
    font-size: 1.05rem;
  }

  &__compact-top  { @include flex-row(0.45rem); white-space: nowrap; }
  &__compact-bottom { @include flex-row(0.35rem); padding-left: 0.1rem; }

  &__compact-badge {
    font-size: 1.0rem;
    font-weight: 700;
    letter-spacing: 0.04em;
    padding: 0.1rem 0.4rem;
    border-radius: 3px;
    line-height: 1.4;

    &--healthy { background: color-mix(in srgb, var(--color-primary) 15%, transparent); color: var(--color-primary); }
    &--target  { background: color-mix(in srgb, var(--color-danger) 15%, transparent); color: var(--color-danger); }
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
    &--lysed       { color: color-mix(in srgb, var(--color-danger) 60%, transparent); }
  }

  &__compact-sep   { color: var(--color-text-muted); opacity: 0.45; font-size: var(--fs-xl); }
  &__compact-temp  { font-size: 1.0rem; color: var(--color-text-muted); opacity: var(--op-partial); }

  &__compact-dot {
    font-size: var(--fs-sm);
    color: var(--color-text-muted);

    &--nourishing  { color: var(--color-primary); }
    &--approaching { color: var(--color-amber); }
    &--rev-ep      { color: var(--color-amber); }
    &--critical    { color: var(--color-danger); }
    &--vibrating   { color: var(--color-danger); animation: warn-fade 0.8s ease-in-out infinite; }
    &--lysing      { color: var(--color-danger); animation: warn-fade 0.5s ease-in-out infinite; }
    &--lysed       { color: color-mix(in srgb, var(--color-danger) 50%, transparent); }
  }

  &__compact-state {
    font-size: var(--fs-xl);
    letter-spacing: 0.1em;
    color: var(--color-text-muted);

    &--nourishing  { color: var(--color-primary); }
    &--approaching { color: var(--color-amber); }
    &--rev-ep      { color: var(--color-amber); }
    &--critical    { color: var(--color-danger); }
    &--vibrating   { color: var(--color-danger); font-weight: 600; }
    &--lysing      { color: var(--color-danger); font-weight: 600; }
    &--lysed       { color: color-mix(in srgb, var(--color-danger) 60%, transparent); }
  }

  /* ── Shared warn strip elements ─────────────────────────────────────── */
  &__warn-icon   { flex-shrink: 0; }
  &__warn-text   { flex: 1; }
  &__warn-pct    { flex-shrink: 0; font-weight: 700; }
  &__reseal-time { flex-shrink: 0; opacity: var(--op-muted); font-style: italic; }

  /* ── DEP strip (non-resonance, |K| ≥ 0.02) ────────────────────────── */
  &__dep-strip {
    @include status-strip(var(--color-lime), color-mix(in srgb, var(--color-lime) 5%, transparent), color-mix(in srgb, var(--color-lime) 18%, transparent));
    cursor: help;

    &--ndep {
      @include status-strip(var(--color-dep), color-mix(in srgb, var(--color-dep) 5%, transparent), color-mix(in srgb, var(--color-dep) 18%, transparent));
    }
  }

  /* ── Nourishing strip (healthy, DR 8-45%) ──────────────────────────── */
  &__nourishing-strip {
    @include status-strip(var(--color-accent), color-mix(in srgb, var(--color-primary) 6%, transparent), color-mix(in srgb, var(--color-primary) 22%, transparent), nourish-strip-pulse, 2.8s);
    border-bottom: 1px solid color-mix(in srgb, var(--color-primary) 12%, transparent);
  }

  /* ── Biomodulation panel nourishing modifier (applied to BiostimPanel root) */
  &__biostim--nourishing {
    background: color-mix(in srgb, var(--color-primary) 8%, transparent) !important;
    border-color: color-mix(in srgb, var(--color-primary) 30%, transparent) !important;
  }

  /* ── Reversible EP strip (target, 50-85%) ──────────────────────────── */
  &__rev-ep-strip {
    @include status-strip(var(--color-amber), color-mix(in srgb, var(--color-amber) 8%, transparent), color-mix(in srgb, var(--color-amber) 30%, transparent), warn-fade, 1.8s);
  }

  /* ── Lysis armed strip (target, >85%) ──────────────────────────────── */
  &__lysis-strip {
    @include status-strip(var(--color-danger), color-mix(in srgb, var(--color-danger) 8%, transparent), color-mix(in srgb, var(--color-danger) 30%, transparent), warn-fade, 1.1s);
  }

  /* ── Structural integrity countdown ────────────────────────────────── */
  &__integrity-bar-row {
    @include flex-row(0.45rem);
    padding: 0.3rem 0.75rem 0.35rem;
    background: color-mix(in srgb, var(--color-danger) 5%, transparent);
    border-top: 1px solid color-mix(in srgb, var(--color-danger) 15%, transparent);
  }

  &__integrity-label {
    @include mono-upper(0.6rem, 0.06em);
    flex-shrink: 0;
    color: color-mix(in srgb, var(--color-danger) 75%, transparent);
    white-space: nowrap;
  }

  &__integrity-track {
    flex: 1;
    height: 5px;
    background: color-mix(in srgb, var(--color-danger) 15%, transparent);
    border-radius: 3px;
    overflow: hidden;
  }

  &__integrity-fill {
    height: 100%;
    background: linear-gradient(90deg, var(--color-danger) 0%, var(--color-orange) 100%);
    border-radius: 3px;
    transition: width 0.1s linear;
  }

  &__integrity-pct {
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    font-weight: 700;
    color: var(--color-danger);
    min-width: 2.6rem;
    text-align: right;
    flex-shrink: 0;
  }

  /* ── Healthy EP risk strip ──────────────────────────────────────────── */
  &__healthy-warn {
    @include status-strip(var(--color-amber), color-mix(in srgb, var(--color-amber) 8%, transparent), color-mix(in srgb, var(--color-amber) 30%, transparent), warn-fade, 2s);

    &--critical {
      color: var(--color-orange);
      background: color-mix(in srgb, var(--color-orange) 12%, transparent);
      border-top-color: color-mix(in srgb, var(--color-orange) 45%, transparent);
      animation-duration: 0.85s;
    }
  }

  /* ── Thermal warning strip ──────────────────────────────────────────── */
  &__thermal-warn {
    @include status-strip(var(--color-amber), color-mix(in srgb, var(--color-amber) 8%, transparent), color-mix(in srgb, var(--color-amber) 30%, transparent), warn-fade, 2s);

    &--denaturing {
      color: var(--color-orange);
      background: color-mix(in srgb, var(--color-orange) 12%, transparent);
      border-top-color: color-mix(in srgb, var(--color-orange) 45%, transparent);
      animation-duration: 0.85s;
    }
  }

  /* ── Lysis overlay ──────────────────────────────────────────────────── */
  &__destroyed {
    position: absolute;
    inset: 0;
    z-index: 2;
    @include flex-col(0.75rem);
    align-items: center;
    justify-content: center;
    background-color: color-mix(in srgb, black 90%, transparent);
    backdrop-filter: blur(3px);
    animation: lysis-overlay-appear 0.35s ease forwards;
  }

  &__destroyed-text {
    font-family: var(--font-mono);
    font-size: var(--fs-sm);
    color: var(--color-danger);
    letter-spacing: 0.15em;
    text-transform: uppercase;
    animation: flicker 1.5s ease-in-out infinite;
  }

  &__destroyed-sub {
    font-family: var(--font-mono);
    font-size: var(--fs-xxs);
    color: var(--color-vibrating);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    opacity: var(--op-partial);
  }

  &__reset-row {
    @include flex-row(0.5rem);
    justify-content: center;
    flex-wrap: wrap;
  }

  &__lysis-btn {
    background: transparent;
    border: 1px solid var(--color-danger);
    color: var(--color-danger);
    padding: 0.35rem 1rem;
    border-radius: var(--radius);
    font-size: var(--fs-sm);
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    cursor: pointer;
    transition: all var(--tr-fast);

    &:hover:not(:disabled) { background-color: color-mix(in srgb, var(--color-danger) 12%, transparent); }
    &:disabled { opacity: var(--op-ghost); cursor: not-allowed; border-color: var(--color-muted-border); color: var(--color-text-muted); }

    &--full {
      border-color: var(--color-primary);
      color: var(--color-primary);
      &:hover:not(:disabled) { background-color: color-mix(in srgb, var(--color-primary) 12%, transparent); }
    }
  }
}
</style>
