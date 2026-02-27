<script lang="ts">
import { defineComponent } from 'vue'
import type { PropType } from 'vue'
import * as d3 from 'd3'
import { useCellStore } from '../stores/cellStore'
import { useExperimentStore } from '../stores/experimentStore'
import { CELL_PRESETS } from '../constants/cellLibrary'
import type { CellRecord } from '../mockData'
import { membraneCm, computeTau } from '../utils/physics'
import type { CellState } from '../types/cell'
import {
  CELL_COLORS,
  EDITABLE_PARAMS,
  DISRUPTION_WARN_THRESHOLD,
  HEALTHY_CRITICAL_THRESHOLD,
  HEALTHY_APPROACHING_THRESHOLD,
  NOURISHING_THRESHOLD,
  VIBRATING_MIN_THRESHOLD,
  TEMP_WARN_CELSIUS,
  TEMP_DENATURING,
  TEMP_VAPORIZING,
  LYSIS_DURATION_MS,
  FRAGMENT_INTERVAL_MS,
} from '../constants/cellCard'
import { setupBlobAnimation, setupOscilloscope, spawnFragment } from '../utils/cellAnimation'

export default defineComponent({
  props: {
    type: {
      type: String as PropType<'healthy' | 'target'>,
      required: true,
    },
    label:        { type: String, required: true },
    sublabel:     { type: String, required: true },
    sublabelTip:  { type: String, default: '' },
    description:  { type: String, required: true },
    buttonText:   { type: String, required: true },
    cellData: {
      type: Object as PropType<CellRecord | null>,
      default: null,
    },
  },

  emits: {
    click: (_type: 'healthy' | 'target') => true,
  },

  setup() {
    return { store: useCellStore() }
  },

  data() {
    return {
      liveAmplitude:  this.cellData?.amplitude ?? 0.8,
      cellState:      'stable' as CellState,
      shatterPending: false,
      thermalLysis:   false,   // true when lysis was triggered by temperature, not electrical disruption
      paramsExpanded: false,
      // Animation timer handles — typed here so TypeScript can see them on `this`
      _helixTimer:        null as d3.Timer | null,
      _oscTimer:          null as d3.Timer | null,
      _particleInterval:  null as number | null,
      _shatterTimeout:    null as number | null,
      _shatterDelayTimeout: null as number | null,
    }
  },

  computed: {
    accentColor(): string { return CELL_COLORS[this.type].accent },
    rungColor():   string { return CELL_COLORS[this.type].rung   },

    // ── Scientific readouts ────────────────────────────────────────────────
    vm(): number {
      return (this.type === 'healthy' ? this.store.healthyVm : this.store.targetVm) * 1000 // V → mV
    },
    temperature(): number {
      return this.type === 'healthy' ? this.store.healthyTemp : this.store.targetTemp
    },
    vmDisplay():   string  { return this.vm.toFixed(3) + ' mV' },
    tempDisplay(): string  { return this.temperature.toFixed(1) + ' °C' },
    tempWarning():     boolean { return this.temperature > TEMP_WARN_CELSIUS },
    tempDenaturing():  boolean { return this.temperature >= TEMP_DENATURING },
    tempVaporizing():  boolean { return this.temperature >= TEMP_VAPORIZING },

    disruptionRatio(): number {
      return this.type === 'healthy'
        ? this.store.healthyDisruptionRatio
        : this.store.targetDisruptionRatio
    },
    canReset(): boolean { return this.disruptionRatio <= DISRUPTION_WARN_THRESHOLD },

    // ── Double-shell (nuclear envelope) readouts ───────────────────────────
    hasNuclearParams(): boolean {
      const cell = this.type === 'healthy' ? this.store.healthy : this.store.target
      return !!cell.nuclearRadius
    },

    nuclearVmMv(): number {
      return (this.type === 'healthy' ? this.store.healthyNuclearVm : this.store.targetNuclearVm) * 1000
    },

    nuclearDisruptionRatio(): number {
      return this.type === 'healthy'
        ? this.store.healthyNuclearDisruptionRatio
        : this.store.targetNuclearDisruptionRatio
    },

    metaStateClass(): string {
      const map: Record<string, string> = {
        stable:      'state--stable',
        nourishing:  'state--nourishing',
        approaching: 'state--approaching',
        critical:    'state--critical',
        vibrating:   'state--vibrating',
        lysing:      'state--lysing',
        lysed:       'state--lysed',
      }
      return map[this.cellState] ?? ''
    },

    canResetToPreset(): boolean {
      const cell = this.type === 'healthy' ? this.store.healthy : this.store.target
      return CELL_PRESETS.some((p) => p.presetId === cell.id)
    },

    // Live color interpolation driven by disruption ratio
    cellColor(): string {
      const { interpFrom, interpTo } = CELL_COLORS[this.type]
      return d3.interpolateRgb(interpFrom, interpTo)(Math.min(1, this.disruptionRatio))
    },

    // Editable biophysical params mapped from the EDITABLE_PARAMS constant
    editableParams() {
      const cell = this.type === 'healthy' ? this.store.healthy : this.store.target
      return EDITABLE_PARAMS.map((p) => ({
        ...p,
        displayValue: (cell as unknown as Record<string, number>)[p.key] ?? 0,
      }))
    },

    derivedParams() {
      const cell = this.type === 'healthy' ? this.store.healthy : this.store.target
      const sigma_e = this.store.sigma_e
      const Cm = membraneCm(cell) * 1000         // F/m² → mF/m²
      const tau = computeTau(cell, sigma_e) * 1e9 // s → ns
      const fc  = this.type === 'healthy' ? this.store.healthyFc : this.store.targetFc
      const fcLabel = fc >= 1000 ? `${(fc / 1000).toFixed(2)} MHz` : `${fc.toFixed(1)} kHz`
      return [
        { label: 'Membrane Cm',   value: Cm.toFixed(2),  unit: 'mF/m²' },
        { label: 'Time const τ',  value: tau.toFixed(1), unit: 'ns'    },
        { label: 'Char. freq fc', value: fcLabel,        unit: ''      },
      ]
    },

    // ── Tooltip content ───────────────────────────────────────────────────
    tipVm(): string {
      const cell = this.type === 'healthy' ? this.store.healthy : this.store.target
      const thr  = (cell.thresholdVoltage * 1000).toFixed(0)
      const pct  = (this.disruptionRatio * 100).toFixed(0)
      return `<strong>Transmembrane Potential (Vm)</strong>
Current: <span class="tip-val">${this.vmDisplay}</span>

Peak voltage induced across the cell membrane
by the applied electric field — Schwan equation:
  Vm = 1.5 × E × R / √(1 + (2πf·τ)²)

Lysis threshold: ${thr} mV
Disruption: <span class="tip-val">${pct}%</span>`
    },

    tipTemp(): string {
      let warnLine = ''
      if (this.tempVaporizing) {
        warnLine = '\n<span class="tip-warn">⚡ ≥100°C — THERMAL LYSIS — water boiling / steam pressure</span>'
      } else if (this.tempDenaturing) {
        warnLine = '\n<span class="tip-warn">⚠ ≥60°C — protein denaturation (collagen ~60°C, albumin ~68°C) — reduce duty cycle / field</span>'
      } else if (this.tempWarning) {
        warnLine = '\n<span class="tip-warn">⚠ ≥42°C — hyperthermic damage onset (IAHT threshold) — monitor closely</span>'
      }
      return `<strong>Cell Temperature</strong>
Current: <span class="tip-val">${this.tempDisplay}</span>

Modelled via Specific Absorption Rate (SAR):
  SAR = σ_i × α² × E² × w_f / ρ  [W/kg]
  α = 3σ_e/(2σ_e+σ_i)  (internal field factor — sphere in medium)
  w_f = 0.5 (CW sinusoidal) | 1.0 (pulsed DC)

Newton cooling: λ = 0.02 /s → T_ss = 37 + SAR_eff/(λ·cp)
Thresholds: 42°C hyperthermic · 60°C denaturing · 100°C vaporizing${warnLine}`
    },

    tipState(): string {
      const labels: Record<string, string> = {
        stable:      'stable — no significant membrane or thermal response',
        nourishing:  'nourishing — sub-threshold oscillation, membrane intact',
        approaching: '<span class="tip-warn">⚠ approaching — membrane stress OR T ≥ 42°C · ion channel perturbation onset</span>',
        critical:    '<span class="tip-warn">⚡ critical — Vm >85% threshold OR T ≥ 60°C (protein denaturation) · reduce field / duty cycle immediately</span>',
        vibrating:   '<span class="tip-warn">vibrating — approaching lysis threshold (Vm >85% sustained)</span>',
        lysing:      '<span class="tip-warn">lysing — membrane disruption in progress</span>',
        lysed:       this.thermalLysis
          ? '<span class="tip-warn">thermal lysis — cell vaporized (T ≥ 100°C)</span>'
          : '<span class="tip-warn">lysed — membrane permanently disrupted by electric field</span>',
      }
      const transitions = this.type === 'healthy'
        ? `\nElectrical: Vm >50% → approaching · Vm >85% → critical`
           + `\nThermal:   T ≥42°C → approaching · T ≥60°C → critical · T ≥100°C → lysis`
        : `\nElectrical: vibrating >2.5 s → lysing → lysed`
          + `\nThermal:   T ≥60°C → critical · T ≥100°C → instant thermal lysis`
      return `<strong>Cell State</strong>
${labels[this.cellState] ?? this.cellState}
${transitions}`
    },

    tipDisruption(): string {
      const pct = (this.disruptionRatio * 100).toFixed(0)
      const cell = this.type === 'healthy' ? this.store.healthy : this.store.target
      const thr  = (cell.thresholdVoltage * 1000).toFixed(0)
      const n    = this.store.lysisNPulses
      const t    = this.formatLysisTime(this.store.lysisDelayMs)
      return `<strong>Membrane Disruption: <span class="tip-val">${pct}%</span></strong>
Ratio = Vm / lysis threshold voltage
  Vm = ${this.vmDisplay}  ·  Threshold = ${thr} mV

>85% → lysis after ${n} pulses (est. ${t})
100% = membrane at threshold — electroporation`
    },

    lysisProtocolStr(): string {
      const n = this.store.lysisNPulses
      const t = this.formatLysisTime(this.store.lysisDelayMs)
      return `${n} pulse${n === 1 ? '' : 's'} — est. ${t}`
    },
  },

  watch: {
    'cellData.amplitude'(newVal: number) {
      this.liveAmplitude = newVal
    },

    // Re-draw anatomy when the target preset changes (category may change: mammalian ↔ bacteria ↔ virus)
    'store.target.id'() {
      if (this.type !== 'target') return
      this._helixTimer?.stop()
      this.$nextTick(() => this.drawCell())
    },

    'store.resetCounter'() {
      if (this.cellState !== 'lysed' && this.cellState !== 'lysing') return
      clearTimeout(this._shatterDelayTimeout ?? undefined)
      this.shatterPending = false
      this.thermalLysis = false
      this.cellState = 'stable'
      this.liveAmplitude = this.cellData?.amplitude ?? 0.8
      clearInterval(this._particleInterval ?? undefined)
      this._helixTimer?.stop()
      this.$nextTick(() => {
        this.drawCell()
        this.drawOscilloscope()
      })
    },

    // Unified state signal — both electrical and thermal watchers call this
    disruptionRatio() { this.updateCellState() },
    temperature()     { this.updateCellState() },

    // When lysisDelayMs changes mid-countdown (N-pulses, dutyCycle, pulseWidth, waveform),
    // restart timer so the new duration takes effect immediately.
    'store.lysisDelayMs'() {
      if (this.type !== 'target' || !this.shatterPending) return
      clearTimeout(this._shatterDelayTimeout ?? undefined)
      this._shatterDelayTimeout = setTimeout(() => {
        this.shatterPending = false
        if (this.disruptionRatio > DISRUPTION_WARN_THRESHOLD) this.triggerLysis()
      }, this.store.lysisDelayMs) as unknown as number
    },
  },

  mounted() {
    if (this.cellData) {
      this.drawCell()
      this.drawOscilloscope()
    }
  },

  beforeUnmount() {
    this._helixTimer?.stop()
    this._oscTimer?.stop()
    clearInterval(this._particleInterval ?? undefined)
    clearTimeout(this._shatterTimeout ?? undefined)
    clearTimeout(this._shatterDelayTimeout ?? undefined)
  },

  methods: {
    // ── Unified cell-state machine ──────────────────────────────────────
    /**
     * Evaluates both electrical (disruptionRatio) and thermal (temperature)
     * signals and sets cellState to the more severe of the two outcomes.
     *
     * Priority: thermal lysis (≥100°C) > electrical lysis (vibrating >2.5 s)
     *           > thermal critical (≥60°C) > electrical critical/approaching
     */
    updateCellState() {
      if (this.cellState === 'lysed' || this.cellState === 'lysing') return

      const impact = this.disruptionRatio
      const temp   = this.temperature

      // ── Thermal lysis (immediate — water vaporisation) ──────────────────
      if (temp >= TEMP_VAPORIZING) {
        this.thermalLysis = true
        this.triggerLysis()
        return
      }

      // ── Thermal floor state ─────────────────────────────────────────────
      // 42–60°C → approaching (hyperthermic stress, IAHT threshold)
      // ≥60°C   → critical    (protein denaturation onset)
      let thermalFloor: CellState =
        temp >= TEMP_DENATURING  ? 'critical'
        : temp >= TEMP_WARN_CELSIUS ? 'approaching'
        : 'stable'

      if (this.type === 'target') {
        // ── Electrical lysis countdown ────────────────────────────────────
        if (impact > DISRUPTION_WARN_THRESHOLD) {
          this.cellState = 'vibrating'
          if (!this.shatterPending) {
            this.shatterPending = true
            this._shatterDelayTimeout = setTimeout(() => {
              this.shatterPending = false
              if (this.disruptionRatio > DISRUPTION_WARN_THRESHOLD) this.triggerLysis()
            }, this.store.lysisDelayMs) as unknown as number
          }
          return
        }
        // Clear countdown if field dropped
        if (this.shatterPending) {
          clearTimeout(this._shatterDelayTimeout ?? undefined)
          this.shatterPending = false
        }

        // Electrical state for target below lysis threshold:
        //   0–0.08 → stable · 0.08–0.5 → approaching · 0.5–0.85 → vibrating
        let elState: CellState =
          impact >= HEALTHY_APPROACHING_THRESHOLD ? 'vibrating'
          : impact > VIBRATING_MIN_THRESHOLD      ? 'approaching'
          : 'stable'

        // Take the worse of electrical and thermal
        // thermalFloor ∈ {'stable','approaching','critical'} — all present in ORDER
        const ORDER: CellState[] = ['stable', 'approaching', 'vibrating', 'critical']
        const ti = ORDER.indexOf(thermalFloor)
        const ei = ORDER.indexOf(elState)
        this.cellState = ORDER[Math.max(ei, ti)] as CellState

      } else {
        // ── Healthy cell — escalating electrical + thermal ────────────────
        let elState: CellState =
          impact >= HEALTHY_CRITICAL_THRESHOLD    ? 'critical'
          : impact >= HEALTHY_APPROACHING_THRESHOLD ? 'approaching'
          : impact > NOURISHING_THRESHOLD           ? 'nourishing'
          : 'stable'

        // thermalFloor ∈ {'stable','approaching','critical'} — all present in ORDER
        const ORDER: CellState[] = ['stable', 'nourishing', 'approaching', 'critical']
        const ti = ORDER.indexOf(thermalFloor)
        const ei = ORDER.indexOf(elState)
        this.cellState = ORDER[Math.max(ei, ti)] as CellState
      }
    },

    // ── Animation setup ────────────────────────────────────────────────────
    drawCell() {
      if (!this.cellData) return
      const el = this.$refs.cellCanvas as HTMLElement
      if (!el) return
      const cellCategory = this.type === 'healthy' ? 'mammalian' : this.store.targetCellCategory
      const presetId = this.type === 'healthy' ? this.store.healthy.id : this.store.target.id
      this._helixTimer = setupBlobAnimation(
        el, this.type, this.accentColor, cellCategory, presetId,
        () => ({
          impact: this.disruptionRatio,
          state: this.cellState,
          color: this.cellColor,
          temperature: this.temperature,
          fieldVcm: this.store.fieldIntensity,
          freqKHz: this.store.currentBroadcastFrequency,
          nuclearDisruptionRatio: this.store.doubleShellEnabled ? this.nuclearDisruptionRatio : 0,
        }),
      )
    },

    drawOscilloscope() {
      if (!this.cellData) return
      const el = this.$refs.oscCanvas as HTMLElement
      if (!el) return
      this._oscTimer = setupOscilloscope(
        el, this.accentColor, this.cellData.naturalFrequency,
        () => ({ state: this.cellState, impact: this.disruptionRatio, liveAmplitude: this.liveAmplitude, cellColor: this.cellColor }),
      )
    },

    // ── State machine ──────────────────────────────────────────────────────
    triggerLysis() {
      this.cellState = 'lysing'
      useExperimentStore().logReading(useCellStore(), 'lysis')
      const el = this.$refs.cellCanvas as HTMLElement

      this._particleInterval = setInterval(() => {
        if (el) spawnFragment(el)
      }, FRAGMENT_INTERVAL_MS) as unknown as number

      this._shatterTimeout = setTimeout(() => {
        clearInterval(this._particleInterval ?? undefined)
        this.cellState = 'lysed'
      }, LYSIS_DURATION_MS) as unknown as number
    },

    formatLysisTime(ms: number): string {
      return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
    },

    onParamChange(key: string, e: Event) {
      const value = Number((e.target as HTMLInputElement).value)
      this.store.updateCellParam(this.type, key, value)
    },

    resetToStable() {
      this.store.resetCell(this.type)
    },

    resetToPreset() {
      const cell = this.type === 'healthy' ? this.store.healthy : this.store.target
      const preset = CELL_PRESETS.find((p) => p.presetId === cell.id)
      if (preset) this.store.loadPreset(this.type, preset)
    },

    handleClick() {
      this.$emit('click', this.type)
    },
  },
})
</script>

<template>
  <div :class="['cell-card', `cell-card--${type}`, `cell-card--${cellState}`]">
    <!-- Header -->
    <div class="card-header">
      <span class="card-icon">◎</span>
      <div class="card-name">
        <div class="card-label">{{ label }}</div>
        <div
          class="card-sublabel"
          :class="{ 'card-sublabel--has-tip': sublabelTip }"
          v-tip="sublabelTip || undefined"
        >{{ sublabel }}</div>
        <div v-if="cellData" class="card-meta">
          <span class="meta-item" v-tip="tipVm">{{ vmDisplay }}</span>
          <span class="meta-sep">·</span>
          <span class="meta-item" :class="{ 'meta-temp-warn': tempWarning }" v-tip="tipTemp">{{ tempDisplay }}</span>
          <span class="meta-sep">·</span>
          <span class="meta-state" :class="metaStateClass" v-tip="tipState">{{ cellState }}</span>
        </div>
        <!-- Nuclear Vm readout — shown when double-shell model is active and cell has nuclear params -->
        <div v-if="store.doubleShellEnabled && hasNuclearParams" class="nuclear-meta">
          <span class="nuclear-meta-label">&#x26AC; Nucleus Vm</span>
          <span class="nuclear-meta-value">{{ nuclearVmMv.toFixed(3) }} mV</span>
          <span class="nuclear-meta-ratio" :class="nuclearDisruptionRatio >= 0.85 ? 'nuclear-ratio--warn' : nuclearDisruptionRatio >= 0.5 ? 'nuclear-ratio--caution' : ''">
            {{ (nuclearDisruptionRatio * 100).toFixed(0) }}%
          </span>
        </div>
      </div>
    </div>

    <!-- Collapsible cell parameters panel -->
    <div
      v-if="cellData"
      class="params-toggle"
      v-tip="'<strong>Cell Parameters</strong>\nEdit biophysical properties that drive the\nSchwan equation calculation in real time.\nChanges immediately update Vm, selectivity,\nand the frequency response chart.'"
      @click="paramsExpanded = !paramsExpanded"
    >
      <span class="params-toggle-arrow">{{ paramsExpanded ? '▾' : '▸' }}</span>
      Cell Parameters
    </div>
    <Transition name="params">
      <div v-if="cellData && paramsExpanded" class="params-panel">
        <div v-for="p in editableParams" :key="p.key" class="param-row">
          <label class="param-label">{{ p.label }}</label>
          <input
            type="number" class="param-input"
            :value="p.displayValue" :step="p.step" :min="p.min"
            @change="onParamChange(p.key, $event)"
          />
          <span class="param-unit">{{ p.unit }}</span>
        </div>
        <!-- Derived/computed constants (read-only) -->
        <div
          class="params-derived-header"
          v-tip="'<strong>Derived biophysical parameters</strong>\nComputed in real time from the editable values above.\n\n<span class=\'tip-val\'>Cm</span> = ε_r × ε₀ / d\n  Membrane specific capacitance [mF/m²]\n\n<span class=\'tip-val\'>τ</span> = R·Cm·(2σ_e+σ_i) / (2σ_e·σ_i)\n  Schwan time constant (Kotnik & Miklavcic 2000)\n  Sets the frequency roll-off\n\n<span class=\'tip-val\'>fc</span> = 1/(2πτ)\n  Characteristic frequency — Vm drops −3 dB here\n  Below fc: quasi-DC regime, Vm at maximum'"
        >
          <span class="params-derived-label">Derived constants</span>
        </div>
        <div v-for="p in derivedParams" :key="p.label" class="param-row param-row--derived">
          <label class="param-label">{{ p.label }}</label>
          <span class="param-derived-value">{{ p.value }}</span>
          <span class="param-unit">{{ p.unit }}</span>
        </div>

        <div v-if="canResetToPreset" class="params-reset-row">
          <button
            class="btn-reset-params"
            v-tip="'<strong>Reset to Preset Defaults</strong>\nRestores all parameters to the original\nvalues for this preset.\nUseful after editing to explore changes.'"
            @click="resetToPreset"
          >↺ Reset to defaults</button>
        </div>
      </div>
    </Transition>

    <!-- Cell Visualization -->
    <div v-if="cellData" class="card-visual">
      <div ref="cellCanvas" class="cell-canvas"></div>

      <div class="osc-divider">
        <span class="osc-label" v-tip="tipVm">OSC · {{ vmDisplay }}</span>
        <span v-if="disruptionRatio > 0.05" class="osc-impact" v-tip="tipDisruption">
          ⚡ {{ (disruptionRatio * 100).toFixed(0) }}% disruption
        </span>
      </div>
      <!-- Nuclear disruption sub-bar — visible when double-shell model active -->
      <div
        v-if="store.doubleShellEnabled && hasNuclearParams"
        class="nuclear-bar-row"
        v-tip="'<strong>Nuclear Envelope Disruption (Double-Shell Model)</strong>\nVm_nuc / V_threshold_nuc\nBandpass peak at f_peak = 1/(2π√(τ_pm·τ_ne))\nKotnik &amp; Miklavcic (2006, Biophys J 90:480)'"
      >
        <span class="nuclear-bar-label">&#x26AC; NE</span>
        <div class="nuclear-bar-track">
          <div
            class="nuclear-bar-fill"
            :style="{ width: Math.min(100, nuclearDisruptionRatio * 100) + '%' }"
            :class="{
              'nuclear-bar-fill--caution': nuclearDisruptionRatio >= 0.5 && nuclearDisruptionRatio < 0.85,
              'nuclear-bar-fill--warn':    nuclearDisruptionRatio >= 0.85,
            }"
          ></div>
        </div>
        <span class="nuclear-bar-pct">{{ (nuclearDisruptionRatio * 100).toFixed(0) }}%</span>
      </div>
      <div ref="oscCanvas" class="osc-canvas"></div>

      <!-- Lysis protocol strip — target cell vibrating state -->
      <div
        v-if="type === 'target' && cellState === 'vibrating'"
        class="lysis-protocol-strip"
        v-tip="tipDisruption"
      >
        <span class="warn-icon">↯</span>
        <span class="warn-text">LYSIS ARMED · {{ lysisProtocolStr }}</span>
        <span class="warn-pct">{{ (disruptionRatio * 100).toFixed(0) }}%</span>
      </div>

      <!-- Electroporation risk warning strip — healthy cell only -->
      <div
        v-if="type === 'healthy' && (cellState === 'approaching' || cellState === 'critical') && !tempWarning"
        class="healthy-warn-strip"
        :class="{ 'healthy-warn-strip--critical': cellState === 'critical' }"
        v-tip="tipState"
      >
        <span class="warn-icon">{{ cellState === 'critical' ? '⚡' : '⚠' }}</span>
        <span class="warn-text">
          {{ cellState === 'critical'
            ? 'CRITICAL — REDUCE FIELD IMMEDIATELY'
            : 'APPROACHING THRESHOLD — MONITOR FIELD' }}
        </span>
        <span class="warn-pct">{{ (disruptionRatio * 100).toFixed(0) }}%</span>
      </div>

      <!-- Thermal warning strip — both cell types, shown when temp is elevated -->
      <div
        v-if="tempWarning && cellState !== 'lysed' && cellState !== 'lysing'"
        class="thermal-warn-strip"
        :class="{
          'thermal-warn-strip--denaturing': tempDenaturing,
        }"
        v-tip="tipTemp"
      >
        <span class="warn-icon">{{ tempDenaturing ? '⚡' : '⚠' }}</span>
        <span class="warn-text">
          {{ tempDenaturing
            ? 'THERMAL CRITICAL — PROTEIN DENATURATION — REDUCE DUTY CYCLE'
            : 'THERMAL WARNING — T > 42°C — MONITOR DUTY CYCLE / FIELD' }}
        </span>
        <span class="warn-pct">{{ temperature.toFixed(0) }}°C</span>
      </div>

      <!-- Lysis overlay — absolute, covers card-visual without shifting card height -->
      <div v-if="cellState === 'lysed'" class="destroyed-overlay">
        <span class="destroyed-text">{{ thermalLysis ? '— THERMAL LYSIS —' : '— MEMBRANE LYSED —' }}</span>
        <span v-if="thermalLysis" class="destroyed-sub">Cell vaporized · T ≥ 100°C</span>
        <button class="btn-reset" :disabled="!canReset" @click="resetToStable">Reset Cell</button>
        <span v-if="!canReset" class="reset-locked">{{ thermalLysis ? 'Reduce field / duty cycle to reset' : 'Reduce field intensity to reset' }}</span>
      </div>
    </div>

    <!-- Description -->
    <div class="card-body">
      <p>{{ description }}</p>
    </div>
  </div>
</template>

<style scoped>
.cell-card {
  background-color: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  transition: border-color 0.2s, box-shadow 0.3s;
  min-width: 0;
  overflow: hidden;
}

.cell-card--healthy { border-left: 3px solid var(--color-accent); }
.cell-card--healthy:hover { border-color: var(--color-accent); }
.cell-card--target  { border-left: 3px solid var(--color-danger); }
.cell-card--target:hover  { border-color: var(--color-danger); }

/* State-driven glow */
.cell-card--nourishing { box-shadow: 0 0 28px rgba(0, 212, 255, 0.18); }
.cell-card--vibrating  { box-shadow: 0 0 24px rgba(255, 77, 109, 0.14); }
.cell-card--lysing {
  box-shadow: 0 0 36px rgba(255, 77, 109, 0.4);
  border-color: var(--color-danger) !important;
  animation: card-shake 0.08s linear infinite;
}
.cell-card--lysed {
  opacity: 0.65;
  border-color: #444 !important;
  box-shadow: none;
}

/* Healthy-cell electroporation risk states */
.cell-card--healthy.cell-card--approaching {
  border-left-color: #fbbf24 !important;
  box-shadow: 0 0 22px rgba(251, 191, 36, 0.22);
}
.cell-card--healthy.cell-card--critical {
  border-left-color: #fb923c !important;
  animation: card-warn-pulse 1.1s ease-in-out infinite;
}

@keyframes card-shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-2px) rotate(-0.3deg); }
  75% { transform: translateX(2px) rotate(0.3deg); }
}

@keyframes card-warn-pulse {
  0%, 100% { box-shadow: 0 0 22px rgba(251, 130, 20, 0.3); }
  50%       { box-shadow: 0 0 42px rgba(251, 130, 20, 0.6); }
}

/* ── Header ──────────────────────────────────────────────────────────── */
.card-header {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
}
.card-icon { font-size: 1.8rem; line-height: 1; flex-shrink: 0; }
.cell-card--healthy .card-icon { color: var(--color-accent); }
.cell-card--target  .card-icon { color: var(--color-danger); }

.card-name {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.card-label {
  font-weight: 600; font-size: 1rem; color: var(--color-text-heading);
  line-height: 1.25;
}
.card-sublabel {
  font-size: 0.72rem; color: var(--color-text-muted);
  font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.08em;
  line-height: 1.3;
}
.card-sublabel--has-tip {
  cursor: help;
  border-bottom: 1px dotted rgba(255,255,255,0.25);
  text-decoration-skip-ink: none;
}
.card-meta {
  display: flex; align-items: center; gap: 0.3rem;
  margin-top: 0.3rem;
  font-size: 0.68rem; font-family: var(--font-mono);
  color: var(--color-text-muted); white-space: nowrap;
}
.meta-sep   { opacity: 0.4; }
.meta-state { text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }
.meta-temp-warn { color: #ffb800; }

/* ── Nuclear envelope readout (double-shell model) ──────────────────── */
.nuclear-meta {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-family: var(--font-mono);
  font-size: 0.58rem;
  color: #a78bfa;
  margin-top: 0.1rem;
}
.nuclear-meta-label { opacity: 0.65; letter-spacing: 0.06em; }
.nuclear-meta-value { font-weight: 600; }
.nuclear-meta-ratio { opacity: 0.8; }
.nuclear-ratio--caution { color: #fbbf24; }
.nuclear-ratio--warn    { color: #ff4d6d; animation: state-blink 1s ease-in-out infinite; }

.nuclear-bar-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.25rem;
}
.nuclear-bar-label {
  font-family: var(--font-mono);
  font-size: 0.55rem;
  color: #a78bfa;
  opacity: 0.75;
  white-space: nowrap;
  width: 1.8rem;
  flex-shrink: 0;
}
.nuclear-bar-track {
  flex: 1;
  height: 3px;
  background: rgba(167, 139, 250, 0.12);
  border-radius: 2px;
  overflow: hidden;
}
.nuclear-bar-fill {
  height: 100%;
  background: #a78bfa;
  border-radius: 2px;
  transition: width 0.3s ease;
}
.nuclear-bar-fill--caution { background: #fbbf24; }
.nuclear-bar-fill--warn    { background: #ff4d6d; }
.nuclear-bar-pct {
  font-family: var(--font-mono);
  font-size: 0.55rem;
  color: #a78bfa;
  opacity: 0.75;
  width: 2rem;
  text-align: right;
  flex-shrink: 0;
}

/* State colors */
.state--stable     { color: #39ff14; }
.state--nourishing { color: #00d4ff; }
.state--approaching { color: #fbbf24; }
.state--critical   { color: #fb923c; animation: state-blink 0.9s ease-in-out infinite; }
.state--vibrating  { color: #ff8c00; animation: state-blink 1.1s ease-in-out infinite; }
.state--lysing     { color: #ff4d6d; animation: state-blink 0.5s ease-in-out infinite; }
.state--lysed      { color: #882233; }

@keyframes state-blink {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.35; }
}

/* ── Params toggle ───────────────────────────────────────────────────── */
.params-toggle {
  display: flex; align-items: center; gap: 0.45rem;
  font-size: 0.62rem; font-family: var(--font-mono);
  text-transform: uppercase; letter-spacing: 0.1em;
  color: var(--color-text);
  cursor: pointer; user-select: none;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.3rem 0.65rem;
  transition: border-color 0.15s, background-color 0.15s, color 0.15s;
}
.params-toggle:hover {
  border-color: rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.06);
  color: var(--color-text-heading);
}
.params-toggle-arrow { font-size: 0.7rem; opacity: 0.75; }

/* ── Params panel ────────────────────────────────────────────────────── */
.params-panel {
  background-color: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  padding: 0.65rem 0.85rem;
  display: flex; flex-direction: column; gap: 0.45rem;
}
.param-row {
  display: grid;
  grid-template-columns: 1fr auto auto;
  align-items: center; gap: 0.5rem;
}
.param-label {
  font-size: 0.6rem; font-family: var(--font-mono);
  color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 0.08em;
}
.param-input {
  width: 5rem;
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: 3px; color: var(--color-text-heading);
  font-family: var(--font-mono); font-size: 0.7rem;
  padding: 0.15rem 0.35rem; text-align: right;
  -moz-appearance: textfield; appearance: textfield;
}
.param-input::-webkit-inner-spin-button,
.param-input::-webkit-outer-spin-button { opacity: 0.3; }
.param-input:focus { outline: none; border-color: var(--color-primary); }

.param-unit {
  font-size: 0.6rem; font-family: var(--font-mono);
  color: var(--color-text-muted); opacity: 0.6;
  width: 2.5rem; text-align: left;
}

.params-derived-header {
  display: flex; align-items: center; gap: 0.5rem;
  padding-top: 0.3rem; margin-top: 0.1rem;
  border-top: 1px solid var(--color-border);
  cursor: default;
}
.params-derived-label {
  font-size: 0.52rem; font-family: var(--font-mono);
  text-transform: uppercase; letter-spacing: 0.12em;
  color: var(--color-text-muted); opacity: 0.65;
}
.param-row--derived { opacity: 0.8; pointer-events: none; }
.param-derived-value {
  font-size: 0.7rem; font-family: var(--font-mono);
  color: var(--color-text); text-align: right; width: 5rem;
}

.params-reset-row {
  display: flex;
  justify-content: flex-end;
  padding-top: 0.2rem;
  border-top: 1px solid var(--color-border);
  margin-top: 0.1rem;
}

.btn-reset-params {
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
}
.btn-reset-params:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

/* Params panel transition */
.params-enter-active, .params-leave-active { transition: opacity 0.2s, transform 0.2s; }
.params-enter-from,  .params-leave-to      { opacity: 0; transform: translateY(-6px); }

/* ── Visualization ────────────────────────────────────────────────────── */
.card-visual {
  background-color: rgba(0, 0, 0, 0.45);
  border: 1px solid var(--color-border);
  border-radius: var(--radius);
  overflow: hidden; position: relative;
}
.cell-canvas { display: flex; justify-content: center; line-height: 0; overflow: hidden; }
.cell-canvas svg { display: block; width: auto; height: auto; max-width: 100%; max-height: 180px; }

.osc-divider {
  display: flex; justify-content: space-between; align-items: center;
  padding: 0.2rem 0.6rem;
  border-top: 1px solid var(--color-border);
  border-bottom: 1px solid var(--color-border);
}
.osc-label {
  font-size: 0.62rem; font-family: var(--font-mono);
  color: var(--color-text-muted); text-transform: uppercase;
  letter-spacing: 0.1em; opacity: 0.7;
}
.osc-impact {
  font-size: 0.62rem; font-family: var(--font-mono);
  text-transform: uppercase; letter-spacing: 0.08em;
}
.cell-card--healthy .osc-impact { color: var(--color-accent); }
.cell-card--target  .osc-impact { color: var(--color-danger); }

.osc-canvas { display: block; width: 100%; line-height: 0; }
.osc-canvas svg { display: block; width: 100%; height: auto; }

/* ── Lysis overlay ───────────────────────────────────────────────────── */
.destroyed-overlay {
  position: absolute; inset: 0; z-index: 2;
  display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 0.75rem;
  background-color: rgba(6, 2, 14, 0.90); backdrop-filter: blur(3px);
}
.destroyed-text {
  font-family: var(--font-mono); font-size: 0.75rem;
  color: var(--color-danger); letter-spacing: 0.15em; text-transform: uppercase;
  animation: flicker 1.5s ease-in-out infinite;
}
@keyframes flicker {
  0%, 100% { opacity: 1; }
  45% { opacity: 0.6; }
  50% { opacity: 0.2; }
  55% { opacity: 0.8; }
}
.btn-reset {
  background: transparent; border: 1px solid var(--color-danger);
  color: var(--color-danger); padding: 0.35rem 1rem;
  border-radius: var(--radius); font-size: 0.75rem;
  font-family: var(--font-mono); text-transform: uppercase; letter-spacing: 0.08em;
  cursor: pointer; transition: all 0.15s;
}
.btn-reset:hover:not(:disabled) { background-color: rgba(255, 77, 109, 0.12); }
.btn-reset:disabled { opacity: 0.35; cursor: not-allowed; border-color: #555; color: #555; }

.reset-locked {
  font-size: 0.62rem; font-family: var(--font-mono);
  color: var(--color-text-muted); letter-spacing: 0.06em;
  text-transform: uppercase; opacity: 0.6;
}

/* ── Lysis protocol strip (target cell vibrating) ────────────────────── */
.lysis-protocol-strip {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.32rem 0.65rem;
  font-family: var(--font-mono);
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-danger);
  background: rgba(255, 77, 109, 0.08);
  border-top: 1px solid rgba(255, 77, 109, 0.3);
  animation: warn-fade 1.1s ease-in-out infinite;
  cursor: help;
}

/* ── Healthy-cell warning strip ──────────────────────────────────────── */
.healthy-warn-strip {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.32rem 0.65rem;
  font-family: var(--font-mono);
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.08);
  border-top: 1px solid rgba(251, 191, 36, 0.3);
  animation: warn-fade 2s ease-in-out infinite;
}
.healthy-warn-strip--critical {
  color: #fb923c;
  background: rgba(251, 130, 20, 0.12);
  border-top-color: rgba(251, 130, 20, 0.45);
  animation: warn-fade 0.85s ease-in-out infinite;
}
.warn-icon { flex-shrink: 0; }
.warn-text { flex: 1; }
.warn-pct  { flex-shrink: 0; font-weight: 700; }

@keyframes warn-fade {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.55; }
}

/* ── Thermal warning strip ───────────────────────────────────────────── */
.thermal-warn-strip {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.32rem 0.65rem;
  font-family: var(--font-mono);
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.08);
  border-top: 1px solid rgba(251, 191, 36, 0.3);
  animation: warn-fade 2s ease-in-out infinite;
}
.thermal-warn-strip--denaturing {
  color: #fb923c;
  background: rgba(251, 130, 20, 0.12);
  border-top-color: rgba(251, 130, 20, 0.45);
  animation: warn-fade 0.85s ease-in-out infinite;
}

/* Cell-card border glow driven by thermal state */
.cell-card--approaching.cell-card--target {
  border-left-color: #fbbf24 !important;
  box-shadow: 0 0 22px rgba(251, 191, 36, 0.18);
}
.cell-card--critical.cell-card--target {
  border-left-color: #fb923c !important;
  animation: card-warn-pulse 1.1s ease-in-out infinite;
}

/* Thermal lysis overlay sub-text */
.destroyed-sub {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  color: #ff8c00;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  opacity: 0.8;
}

/* ── Body ─────────────────────────────────────────────────────────────── */
.card-body { color: var(--color-text-muted); font-size: 0.875rem; line-height: 1.65; flex: 1; }
</style>
