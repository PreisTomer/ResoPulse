<template>
  <div :class="['cell-card', `cell-card--${type}`, `cell-card--${cellState}`]">
    <CellHeader
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
      :cell-data="cellData"
      :editable-params="editableParams"
      :derived-params="derivedParams"
      :can-reset-to-preset="canResetToPreset"
      @param-change="onParamChange"
      @reset-to-preset="resetToPreset"
    />

    <!-- Cell Visualization -->
    <div v-if="cellData" class="cell-card__visual">
      <div ref="cellCanvas" class="cell-card__canvas"></div>

      <div class="cell-card__osc-divider">
        <span class="cell-card__osc-label" v-tip="tipVm">OSC · {{ vmDisplay }}</span>
        <span v-if="disruptionRatio > 0.05" class="cell-card__osc-impact" v-tip="tipDisruption">
          ⚡ {{ (disruptionRatio * 100).toFixed(0) }}% disruption
        </span>
      </div>

      <!-- Nuclear disruption sub-bar — visible when double-shell model active -->
      <div
        v-if="store.doubleShellEnabled && hasNuclearParams"
        class="cell-card__nuclear-bar-row"
        v-tip="'<strong>Nuclear Envelope Disruption (Double-Shell Model)</strong>\nVm_nuc / V_threshold_nuc\nBandpass peak at f_peak = 1/(2π√(τ_pm·τ_ne))\nKotnik &amp; Miklavcic (2006, Biophys J 90:480)'"
      >
        <span class="cell-card__nuclear-bar-label">&#x26AC; NE</span>
        <div class="cell-card__nuclear-bar-track">
          <div
            class="cell-card__nuclear-bar-fill"
            :style="{ width: Math.min(100, nuclearDisruptionRatio * 100) + '%' }"
            :class="{
              'cell-card__nuclear-bar-fill--caution': nuclearDisruptionRatio >= 0.5 && nuclearDisruptionRatio < 0.85,
              'cell-card__nuclear-bar-fill--warn':    nuclearDisruptionRatio >= 0.85,
            }"
          ></div>
        </div>
        <span class="cell-card__nuclear-bar-pct">{{ (nuclearDisruptionRatio * 100).toFixed(0) }}%</span>
      </div>

      <div ref="oscCanvas" class="cell-card__osc-canvas"></div>

      <!-- Nourishing strip — healthy cell in active biomodulation window (DR 8–45%) -->
      <div
        v-if="type === CELL_TYPE.HEALTHY && cellState === CELL_STATE.NOURISHING"
        class="cell-card__nourishing-strip"
        v-tip="tipState"
      >
        <span class="cell-card__warn-icon">⊕</span>
        <span class="cell-card__warn-text">{{ $t('cells.states.nourishing', { bms: (biostimScore * 100).toFixed(0) }) }}</span>
        <span class="cell-card__warn-pct">{{ (disruptionRatio * 100).toFixed(0) }}%</span>
      </div>

      <!-- Biomodulation panel — healthy cell only, sub-threshold regime (DR < 45%) -->
      <BiostimPanel
        v-if="showBiostim"
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

      <!-- Reversible EP strip — target cell 50–85% disruption (pores open/re-seal) -->
      <div
        v-if="type === CELL_TYPE.TARGET && cellState === CELL_STATE.REV_EP"
        class="cell-card__rev-ep-strip"
        v-tip="tipDisruption"
      >
        <span class="cell-card__warn-icon">⚡</span>
        <span class="cell-card__warn-text">{{ $t('cells.states.revEp') }}</span>
        <span class="cell-card__warn-pct">{{ (disruptionRatio * 100).toFixed(0) }}%</span>
      </div>

      <!-- Lysis protocol strip — target cell vibrating state (>85%, lysis armed) -->
      <div
        v-if="type === CELL_TYPE.TARGET && cellState === CELL_STATE.VIBRATING"
        class="cell-card__lysis-strip"
        v-tip="tipDisruption"
      >
        <span class="cell-card__warn-icon">↯</span>
        <span class="cell-card__warn-text">{{ $t('cells.states.lysisArmed', { protocol: lysisProtocolStr }) }}</span>
        <span class="cell-card__warn-pct">{{ (disruptionRatio * 100).toFixed(0) }}%</span>
      </div>

      <!-- Electroporation risk warning strip — healthy cell only -->
      <div
        v-if="type === CELL_TYPE.HEALTHY && (cellState === CELL_STATE.APPROACHING || cellState === CELL_STATE.CRITICAL) && !tempWarning"
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

      <!-- Thermal warning strip — both cell types -->
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
        <span class="cell-card__warn-pct">{{ temperature.toFixed(0) }}°C</span>
      </div>

      <!-- Lysis overlay — absolute, covers cell-card__visual without shifting card height -->
      <div v-if="cellState === 'lysed'" class="cell-card__destroyed">
        <span class="cell-card__destroyed-text">{{ thermalLysis ? $t('cells.states.thermalLysis') : $t('cells.states.membraneLysed') }}</span>
        <span v-if="thermalLysis" class="cell-card__destroyed-sub">{{ $t('cells.states.vaporized') }}</span>
        <button class="cell-card__lysis-btn" :disabled="!canReset" @click="resetToStable">{{ $t('cells.states.resetCell') }}</button>
        <span v-if="!canReset" class="cell-card__lysis-btn--locked">{{ thermalLysis ? $t('cells.states.reduceFieldThermal') : $t('cells.states.reduceField') }}</span>
      </div>
    </div>

    <!-- Description -->
    <div class="cell-card__body">
      <p>{{ description }}</p>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import type { PropType } from 'vue'
import * as d3 from 'd3'
import { useCellStore } from '../../stores/cellStore'
import { useExperimentStore } from '../../stores/experimentStore'
import { CELL_PRESETS } from '../../constants/cellLibrary'
import type { CellRecord } from '../../types/cell'
import { membraneCm, computeTau } from '../../utils/physics'
import type { CellState } from '../../types/cell'
import {
  CELL_COLORS,
  EDITABLE_PARAMS,
  DISRUPTION_WARN_THRESHOLD,
  HEALTHY_CRITICAL_THRESHOLD,
  HEALTHY_APPROACHING_THRESHOLD,
  VIBRATING_MIN_THRESHOLD,
  TEMP_WARN_CELSIUS,
  TEMP_DENATURING,
  TEMP_VAPORIZING,
  LYSIS_DURATION_MS,
  FRAGMENT_INTERVAL_MS,
} from '../../constants/cellCard'
import { setupBlobAnimation, setupOscilloscope, spawnFragment } from '../../utils/cellAnimation'
import { CELL_STATE, CELL_TYPE, CELL_CATEGORY, WAVEFORM, CHART_MODE } from '../../constants/strings'
import { ICON } from '../../constants/icons'
import CellHeader from './CellHeader.vue'
import CellParamsPanel from './CellParamsPanel.vue'
import BiostimPanel from './BiostimPanel.vue'

export default defineComponent({
  components: { CellHeader, CellParamsPanel, BiostimPanel },

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
  },

  setup() {
    return { store: useCellStore(), CELL_STATE, CELL_TYPE, ICON }
  },

  data() {
    return {
      liveAmplitude:  this.cellData?.amplitude ?? 0.8,
      cellState:      CELL_STATE.STABLE as CellState,
      shatterPending: false,
      thermalLysis:   false,
      _helixTimer:          null as d3.Timer | null,
      _oscTimer:            null as d3.Timer | null,
      _particleInterval:    null as number | null,
      _shatterTimeout:      null as number | null,
      _shatterDelayTimeout: null as number | null,
    }
  },

  computed: {
    accentColor(): string { return CELL_COLORS[this.type].accent },
    rungColor():   string { return CELL_COLORS[this.type].rung   },

    vm(): number {
      return (this.type === CELL_TYPE.HEALTHY ? this.store.healthyVm : this.store.targetVm) * 1000
    },
    temperature(): number {
      return this.type === CELL_TYPE.HEALTHY ? this.store.healthyTemp : this.store.targetTemp
    },
    vmDisplay():   string  { return this.vm.toFixed(3) + ' mV' },
    tempDisplay(): string  { return this.temperature.toFixed(1) + ' °C' },
    tempWarning():     boolean { return this.temperature > TEMP_WARN_CELSIUS },
    tempDenaturing():  boolean { return this.temperature >= TEMP_DENATURING },
    tempVaporizing():  boolean { return this.temperature >= TEMP_VAPORIZING },

    disruptionRatio(): number {
      return this.type === CELL_TYPE.HEALTHY
        ? this.store.healthyDisruptionRatio
        : this.store.targetDisruptionRatio
    },
    canReset(): boolean { return this.disruptionRatio <= DISRUPTION_WARN_THRESHOLD },

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
        stable:      'cell-card__state--stable',
        nourishing:  'cell-card__state--nourishing',
        approaching: 'cell-card__state--approaching',
        'rev-ep':    'cell-card__state--rev-ep',
        critical:    'cell-card__state--critical',
        vibrating:   'cell-card__state--vibrating',
        lysing:      'cell-card__state--lysing',
        lysed:       'cell-card__state--lysed',
      }
      return map[this.cellState] ?? ''
    },

    canResetToPreset(): boolean {
      const cell = this.type === CELL_TYPE.HEALTHY ? this.store.healthy : this.store.target
      return CELL_PRESETS.some((p) => p.presetId === cell.id)
    },

    cellColor(): string {
      const { interpFrom, interpTo } = CELL_COLORS[this.type]
      return d3.interpolateRgb(interpFrom, interpTo)(Math.min(1, this.disruptionRatio))
    },

    editableParams() {
      const cell = this.type === CELL_TYPE.HEALTHY ? this.store.healthy : this.store.target
      return EDITABLE_PARAMS.map((p) => ({
        ...p,
        displayValue: (cell as unknown as Record<string, number>)[p.key] ?? 0,
      }))
    },

    derivedParams() {
      const cell = this.type === CELL_TYPE.HEALTHY ? this.store.healthy : this.store.target
      const sigma_e = this.store.effectiveSigmaE
      const Cm  = membraneCm(cell) * 1000
      const tau = computeTau(cell, sigma_e) * 1e9
      const fc  = this.type === CELL_TYPE.HEALTHY ? this.store.healthyFc : this.store.targetFc
      const fcLabel = fc >= 1000 ? `${(fc / 1000).toFixed(2)} MHz` : `${fc.toFixed(1)} kHz`
      return [
        { label: 'Membrane Cm',   value: Cm.toFixed(2),  unit: 'mF/m²' },
        { label: 'Time const τ',  value: tau.toFixed(1), unit: 'ns'    },
        { label: 'Char. freq fc', value: fcLabel,        unit: ''      },
      ]
    },

    tipVm(): string {
      const cell = this.type === CELL_TYPE.HEALTHY ? this.store.healthy : this.store.target
      const thr  = (cell.thresholdVoltage * 1000).toFixed(0)
      const pct  = (this.disruptionRatio * 100).toFixed(0)
      const pulsedNote = this.store.waveform === WAVEFORM.PULSED
        ? '\n<span class="tip-note">Pulsed mode (H-FIRE/IRE): Vm uses E_peak as standard approx.\nTrue square-wave fundamental ≈ 4/π × shown (+27%). Cancels in selectivity ratio.</span>'
        : ''
      return `<strong>Transmembrane Potential (Vm)</strong>
Current: <span class="tip-val">${this.vmDisplay}</span>

Peak voltage induced across the cell membrane
by the applied electric field — Schwan equation:
  Vm = 1.5 × E × R × cos θ / √(1 + (2πf·τ)²)

Lysis threshold: ${thr} mV
Disruption: <span class="tip-val">${pct}%</span>${pulsedNote}`
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
  w_f = 0.5 (CW sinusoidal, E²_rms = E²_peak/2) | 1.0 (pulsed bipolar square wave, E²_rms = E²_peak)

Newton cooling: λ = 0.02 /s → T_ss = 37 + SAR_eff/(λ·cp)
Thresholds: 42°C hyperthermic · 60°C denaturing · 100°C vaporizing${warnLine}`
    },

    tipState(): string {
      const labels: Record<string, string> = {
        stable:      'stable — no significant membrane or thermal response',
        nourishing:  '<span class="tip-ok">nourishing — sub-threshold Ca²⁺ stimulation window (DR 8–50%)\nMembrane intact · PIEZO1 + voltage-gated Ca²⁺ channels activated\nOptimal biomodulation at DR ≈ 20–40% of lysis threshold</span>',
        approaching: '<span class="tip-warn">⚠ approaching — membrane stress OR T ≥ 42°C · ion channel perturbation onset</span>',
        'rev-ep':    '<span class="tip-warn">⚡ reversible EP window (50–85%) — membrane transiently permeabilized each pulse.\nPores open and re-seal after the field is removed.\nThis is the drug/gene delivery window — cells survive.\nSustained or increasing field progresses to irreversible lysis.</span>',
        critical:    '<span class="tip-warn">⚡ critical — Vm >85% threshold OR T ≥ 60°C (protein denaturation) · reduce field / duty cycle immediately</span>',
        vibrating:   '<span class="tip-warn">⚡ LYSIS ARMED — Vm >85% of threshold · irreversible electroporation imminent</span>',
        lysing:      '<span class="tip-warn">lysing — irreversible membrane disruption in progress</span>',
        lysed:       this.thermalLysis
          ? '<span class="tip-warn">thermal lysis — cell vaporized (T ≥ 100°C)</span>'
          : '<span class="tip-warn">lysed — membrane permanently disrupted by electric field</span>',
      }
      const transitions = this.type === CELL_TYPE.HEALTHY
        ? `\nElectrical: Vm >50% → approaching · Vm >85% → critical`
           + `\nThermal:   T ≥42°C → approaching · T ≥60°C → critical · T ≥100°C → lysis`
        : `\nElectrical: 50–85% → rev-ep (reversible) · >85% → armed (${this.formatLysisTime(this.store.lysisDelayMs)}) → lysed`
          + `\nThermal:   T ≥60°C → critical · T ≥100°C → instant thermal lysis`
      return `<strong>Cell State</strong>
${labels[this.cellState] ?? this.cellState}
${transitions}`
    },

    tipDisruption(): string {
      const pct  = (this.disruptionRatio * 100).toFixed(0)
      const cell = this.type === CELL_TYPE.HEALTHY ? this.store.healthy : this.store.target
      const thr  = (cell.thresholdVoltage * 1000).toFixed(0)
      const n    = this.store.lysisNPulses
      const t    = this.formatLysisTime(this.store.lysisDelayMs)

      const pef     = this.type === CELL_TYPE.HEALTHY
        ? this.store.pulseEnvelopeFactorHealthy
        : this.store.pulseEnvelopeFactorTarget
      const sigma_e = this.store.effectiveSigmaE
      const tau_ns  = (computeTau(cell, sigma_e) * 1e9).toFixed(1)
      const isResonance = this.type === CELL_TYPE.TARGET && this.store.chartMode === CHART_MODE.RESONANCE
      const pefNote = (this.store.waveform === WAVEFORM.PULSED && pef < 0.99 && !isResonance)
        ? `\n<span class="tip-note">Pulse factor: ${(pef * 100).toFixed(1)}% (t_p = ${this.store.pulseWidthNs} ns vs τ = ${tau_ns} ns).\nMembrane charges to ${(pef * 100).toFixed(1)}% of Schwan Vm per pulse.\nEffective threshold is ${(1 / pef).toFixed(1)}× higher at this pulse width.\nRef: Weaver &amp; Chizmadzhev (1996).</span>`
        : ''

      const revEpNote = (this.type === CELL_TYPE.TARGET && this.disruptionRatio >= 0.50 && this.disruptionRatio < 0.85)
        ? `\n<span class="tip-note">Reversible EP window: pores open transiently and re-seal.\nThis is the drug/gene delivery regime — cells survive.\nIncrease field or hold to progress to irreversible lysis.</span>`
        : ''

      const formulaLine = isResonance
        ? 'Ratio = (E / E_thr) × L(f, f_res, Q)  — acoustic Lorentzian'
        : `Ratio = Vm × pulse_factor / lysis threshold\n  Vm = ${this.vmDisplay}  ·  Threshold = ${thr} mV`

      return `<strong>Membrane Disruption: <span class="tip-val">${pct}%</span></strong>
${formulaLine}

>85% → lysis after ${n} pulses (est. ${t})
100% = at disruption threshold${pefNote}${revEpNote}`
    },

    lysisProtocolStr(): string {
      const n = this.store.lysisNPulses
      const t = this.formatLysisTime(this.store.lysisDelayMs)
      return `${n} pulse${n === 1 ? '' : 's'} — est. ${t}`
    },

    // ── Biomodulation metrics (healthy cell only) ──────────────────────────
    // Visible when DR < 0.45 — the stimulatory sub-threshold window.
    // All three getters delegate to cellStore computations that share the same
    // Schwan physics used for the disruption model on the target cell.
    showBiostim(): boolean {
      return this.type === CELL_TYPE.HEALTHY
        && this.disruptionRatio < 0.45
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
      this._helixTimer?.stop()
      this.$nextTick(() => this.drawCell())
    },

    'store.resetCounter'() {
      if (this.cellState !== CELL_STATE.LYSED && this.cellState !== CELL_STATE.LYSING) return
      clearTimeout(this._shatterDelayTimeout ?? undefined)
      this.shatterPending = false
      this.thermalLysis   = false
      this.cellState      = CELL_STATE.STABLE
      this.liveAmplitude  = this.cellData?.amplitude ?? 0.8
      clearInterval(this._particleInterval ?? undefined)
      this._helixTimer?.stop()
      this.$nextTick(() => {
        this.drawCell()
        this.drawOscilloscope()
      })
    },

    disruptionRatio() { this.updateCellState() },
    temperature()     { this.updateCellState() },

    'store.lysisDelayMs'() {
      if (this.type !== CELL_TYPE.TARGET || !this.shatterPending) return
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
    updateCellState() {
      if (this.cellState === CELL_STATE.LYSED || this.cellState === CELL_STATE.LYSING) return

      const impact = this.disruptionRatio
      const temp   = this.temperature

      if (temp >= TEMP_VAPORIZING) {
        this.thermalLysis = true
        this.triggerLysis()
        return
      }

      const thermalFloor: CellState =
        temp >= TEMP_DENATURING     ? CELL_STATE.CRITICAL
        : temp >= TEMP_WARN_CELSIUS ? CELL_STATE.APPROACHING
        : CELL_STATE.STABLE

      if (this.type === CELL_TYPE.TARGET) {
        if (impact > DISRUPTION_WARN_THRESHOLD) {
          // >85% — lysis is now armed; 'vibrating' exclusively means "lysis imminent"
          this.cellState = CELL_STATE.VIBRATING
          if (!this.shatterPending) {
            this.shatterPending = true
            this._shatterDelayTimeout = setTimeout(() => {
              this.shatterPending = false
              if (this.disruptionRatio > DISRUPTION_WARN_THRESHOLD) this.triggerLysis()
            }, this.store.lysisDelayMs) as unknown as number
          }
          return
        }
        if (this.shatterPending) {
          clearTimeout(this._shatterDelayTimeout ?? undefined)
          this.shatterPending = false
        }
        // 50–85% → 'rev-ep': reversible electroporation window (Weaver & Chizmadzhev 1996).
        // Pores open transiently and re-seal — membrane is permeabilized but cells survive.
        // Distinct from 'vibrating' (>85%, lysis armed) and from 'approaching' (<50%).
        const elState: CellState =
          impact >= HEALTHY_APPROACHING_THRESHOLD ? CELL_STATE.REV_EP
          : impact > VIBRATING_MIN_THRESHOLD      ? CELL_STATE.APPROACHING
          : CELL_STATE.STABLE
        const ORDER: CellState[] = [CELL_STATE.STABLE, CELL_STATE.APPROACHING, CELL_STATE.REV_EP, CELL_STATE.CRITICAL]
        this.cellState = ORDER[Math.max(ORDER.indexOf(elState), ORDER.indexOf(thermalFloor))] as CellState
      } else {
        // 'nourishing': DR > 8% (VIBRATING_MIN_THRESHOLD) — sub-threshold membrane oscillations
        // activate PIEZO1 / Ca²⁺ channels; SI peaks at ~22% of lysis threshold.
        // 'stable': DR ≤ 8% — field too weak for significant membrane coupling.
        const elState: CellState =
          impact >= HEALTHY_CRITICAL_THRESHOLD      ? CELL_STATE.CRITICAL
          : impact >= HEALTHY_APPROACHING_THRESHOLD ? CELL_STATE.APPROACHING
          : impact > VIBRATING_MIN_THRESHOLD        ? CELL_STATE.NOURISHING
          : CELL_STATE.STABLE
        const ORDER: CellState[] = [CELL_STATE.STABLE, CELL_STATE.NOURISHING, CELL_STATE.APPROACHING, CELL_STATE.CRITICAL]
        this.cellState = ORDER[Math.max(ORDER.indexOf(elState), ORDER.indexOf(thermalFloor))] as CellState
      }
    },

    drawCell() {
      if (!this.cellData) return
      const el = this.$refs.cellCanvas as HTMLElement
      if (!el) return
      const cellCategory = this.type === CELL_TYPE.HEALTHY ? CELL_CATEGORY.MAMMALIAN : this.store.targetCellCategory
      const presetId     = this.type === CELL_TYPE.HEALTHY ? this.store.healthy.id : this.store.target.id
      this._helixTimer = setupBlobAnimation(
        el, this.type, this.accentColor, cellCategory, presetId,
        () => ({
          impact:                 this.disruptionRatio,
          state:                  this.cellState,
          color:                  this.cellColor,
          temperature:            this.temperature,
          fieldVcm:               this.store.fieldIntensity,
          freqKHz:                this.store.currentBroadcastFrequency,
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

    triggerLysis() {
      this.cellState = CELL_STATE.LYSING
      useExperimentStore().logReading(useCellStore(), 'lysis')
      const el = this.$refs.cellCanvas as HTMLElement
      this._particleInterval = setInterval(() => {
        if (el) spawnFragment(el)
      }, FRAGMENT_INTERVAL_MS) as unknown as number
      this._shatterTimeout = setTimeout(() => {
        clearInterval(this._particleInterval ?? undefined)
        this.cellState = CELL_STATE.LYSED
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
      const cell   = this.type === CELL_TYPE.HEALTHY ? this.store.healthy : this.store.target
      const preset = CELL_PRESETS.find((p) => p.presetId === cell.id)
      if (preset) {
        this.store.loadPreset(this.type, preset)
      } else {
        this.store.resetCell(this.type)
      }
    },

    resetToPreset() {
      const cell   = this.type === CELL_TYPE.HEALTHY ? this.store.healthy : this.store.target
      const preset = CELL_PRESETS.find((p) => p.presetId === cell.id)
      if (preset) this.store.loadPreset(this.type, preset)
    },
  },
})
</script>

<style lang="scss">
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
  50%       { opacity: 0.65; }
}

@keyframes flicker {
  0%, 100% { opacity: 1; }
  45% { opacity: 0.6; }
  50% { opacity: 0.2; }
  55% { opacity: 0.8; }
}

@keyframes warn-fade {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.55; }
}

/* ── Vue Transition classes (name="params") ──────────────────────────── */
.params-enter-active, .params-leave-active { transition: opacity 0.2s, transform 0.2s; }
.params-enter-from,  .params-leave-to      { opacity: 0; transform: translateY(-6px); }

/* ── Block ───────────────────────────────────────────────────────────── */
.cell-card {
  background-color: var(--color-surface-2);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
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

  /* Reversible EP window (target, 50–85%): amber glow — permeabilized but survivable */
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
    @include mono-upper(0.52rem, 0.12em);
    color: var(--color-text-muted);
    opacity: 0.65;
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
    display: flex;
    justify-content: space-between;
    align-items: center;
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

  /* ── Nourishing strip (healthy, DR 8–45%) ──────────────────────────── */
  &__nourishing-strip {
    @include status-strip(var(--color-accent), rgba(0, 212, 255, 0.06), rgba(0, 212, 255, 0.22), nourish-text-pulse, 2.8s);
    border-bottom: 1px solid rgba(0, 212, 255, 0.12);
  }

  /* ── Reversible EP strip (target, 50–85%) ──────────────────────────── */
  &__rev-ep-strip {
    @include status-strip(#fbbf24, rgba(251, 191, 36, 0.08), rgba(251, 191, 36, 0.3), warn-fade, 1.8s);
  }

  /* ── Lysis strip ───────────────────────────────────────────────────── */
  &__lysis-strip {
    @include status-strip(var(--color-danger), rgba(255, 77, 109, 0.08), rgba(255, 77, 109, 0.3), warn-fade, 1.1s);
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
