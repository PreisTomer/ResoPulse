import { defineStore } from 'pinia'
import { cloneDeep } from 'lodash'
import { cellConfigs, MEDIA } from '../mockData'
import type { CellConfig, MediumKey } from '../mockData'
import { computeSchwan, computeSAR, computeFc, computeTau, computePulseStepResponse, computeResonantDisruption, computeNuclearVm } from '../utils/physics'

const LAMBDA = 0.02     // Newton cooling rate constant [1/s]
const TEMP_SIMULATION_CAP = 150  // °C — hard ceiling; cells are destroyed long before this

export interface FieldPacket {
  timestamp: number
  activeFrequencyKHz: number
  activeFieldIntensityVcm: number
  activeMedium: string
}

// Legacy alias — services/socket.ts imports this type
export type ResonancePacket = FieldPacket

interface CellStoreState {
  healthy: CellConfig
  target: CellConfig
  medium: MediumKey
  fieldIntensity: number          // V/cm
  currentBroadcastFrequency: number // kHz
  healthyTemp: number             // °C
  targetTemp: number              // °C
  dutyCycle: number               // dimensionless — pulsed field on-fraction (default 0.01%)
  waveform: 'cw' | 'pulsed'      // CW sinusoidal (waveformFactor 0.5) or pulsed DC (1.0)
  pulseWidthNs: number            // pulse width in nanoseconds (pulsed mode only; default 1000 ns = 1 µs)
  safeMode: boolean               // when true, duty cycle is clamped so T_ss ≤ 42°C
  orientationDeg: number          // field-cell axis angle θ [0–90°]; default 0° (field-aligned = max Vm)
  lysisNPulses: number            // number of above-threshold pulses before lysis; default 10
  chartMode: 'schwan' | 'resonance'  // active chart/simulation mode (moved from ExperimentView local state)
  doubleShellEnabled: boolean     // opt-in two-shell nuclear envelope model (Kotnik & Miklavcic 2006)
  _tempTimer: number | null
  resetCounter: number
}

export const useCellStore = defineStore('cell', {
  state: (): CellStoreState => ({
    healthy: cloneDeep(cellConfigs[0]) as CellConfig,
    target: cloneDeep(cellConfigs[1]) as CellConfig,
    medium: 'saline',
    fieldIntensity: 150,           // V/cm — sub-threshold by default
    currentBroadcastFrequency: 417, // kHz — matches simulationData default
    healthyTemp: 37,
    targetTemp: 37,
    dutyCycle: 1e-4,               // 0.01% — typical pulsed electroporation default
    waveform: 'pulsed' as const,
    pulseWidthNs: 1000,            // 1 µs — sub-µs range reveals nsEP selectivity for bacteria
    safeMode: false,               // expert mode by default (scientists need full range)
    orientationDeg: 0,             // 0° = field-aligned = maximum transmembrane coupling
    lysisNPulses: 10,              // 10 above-threshold pulses ≈ typical IRE clinical protocol
    chartMode: 'schwan' as const,  // default: Schwan/IRE transmembrane potential model
    doubleShellEnabled: false,     // double-shell model off by default
    _tempTimer: null,
    resetCounter: 0,
  }),

  getters: {
    /** Base (reference-temperature) extracellular conductivity [S/m]. Used for display only. */
    sigma_e: (state): number => MEDIA[state.medium].conductivity,

    /**
     * |cos(θ)| — field-cell coupling factor [0–1].
     * θ = orientationDeg: angle between the applied field vector and the cell axis.
     * θ = 0° (field-aligned) → factor = 1 → maximum Vm.
     * θ = 90° (perpendicular) → factor = 0 → Vm → 0.
     * Note: cos(θ) cancels in the Vm selectivity ratio (Vm_T/Vm_H) for any θ,
     * since both cells share the same field orientation. Selectivity is θ-independent.
     */
    cosThetaFactor(state): number {
      return Math.abs(Math.cos(state.orientationDeg * Math.PI / 180))
    },

    /**
     * Temperature-corrected extracellular conductivity [S/m].
     * σ_e(T) = σ_e0 × (1 + 0.02 × (T_mean − 37))
     * Ionic conductivity rises ~2%/°C. At hyperthermic limit (42°C), σ_e increases ~10%,
     * shifting τ and fc — a physically correct closed feedback loop.
     * T_mean = mean of healthy and target cell temperatures.
     */
    effectiveSigmaE(state): number {
      const sigma_e0 = MEDIA[state.medium].conductivity
      const T_mean = (state.healthyTemp + state.targetTemp) / 2
      return sigma_e0 * (1 + 0.02 * (T_mean - 37))
    },

    /**
     * Physically grounded lysis countdown duration [ms].
     * In CW mode: 2500 ms (time-based, no pulse count concept).
     * In pulsed mode: N_pulses × pulse_period where period = pulseWidthNs / dutyCycle.
     * Clamped to [200 ms, 30 000 ms] for visual validity.
     * Replaces the former hardcoded LYSIS_DELAY_MS = 2500 constant.
     */
    lysisDelayMs(state): number {
      if (state.waveform === 'cw' || state.dutyCycle >= 1) return 2500
      const pulsePeriodMs = (state.pulseWidthNs * 1e-6) / state.dutyCycle
      return Math.max(200, Math.min(30_000, state.lysisNPulses * pulsePeriodMs))
    },

    /**
     * Pulse step-response factor for the healthy cell [0–1].
     * = 1 − exp(−t_p/τ) in pulsed mode; = 1.0 in CW mode.
     * Uses temperature-corrected σ_e so τ reflects current heating state.
     */
    healthyPulseStepFactor(): number {
      if ((this as unknown as CellStoreState).waveform !== 'pulsed') return 1.0
      const tau = computeTau((this as unknown as CellStoreState).healthy, this.effectiveSigmaE)
      return computePulseStepResponse(tau, (this as unknown as CellStoreState).pulseWidthNs)
    },

    /** Pulse step-response factor for the target cell [0–1]. Uses temperature-corrected σ_e. */
    targetPulseStepFactor(): number {
      if ((this as unknown as CellStoreState).waveform !== 'pulsed') return 1.0
      const tau = computeTau((this as unknown as CellStoreState).target, this.effectiveSigmaE)
      return computePulseStepResponse(tau, (this as unknown as CellStoreState).pulseWidthNs)
    },

    healthyVm(): number {
      const state = this as unknown as CellStoreState
      const sigma_e = this.effectiveSigmaE
      const cosT = this.cosThetaFactor
      const vm_dc = computeSchwan(state.healthy, state.currentBroadcastFrequency, state.fieldIntensity, sigma_e, cosT)
      const tau = computeTau(state.healthy, sigma_e)
      const factor = state.waveform === 'pulsed'
        ? computePulseStepResponse(tau, state.pulseWidthNs)
        : 1.0
      return vm_dc * factor
    },

    targetVm(): number {
      const state = this as unknown as CellStoreState
      const sigma_e = this.effectiveSigmaE
      const cosT = this.cosThetaFactor
      const vm_dc = computeSchwan(state.target, state.currentBroadcastFrequency, state.fieldIntensity, sigma_e, cosT)
      const tau = computeTau(state.target, sigma_e)
      const factor = state.waveform === 'pulsed'
        ? computePulseStepResponse(tau, state.pulseWidthNs)
        : 1.0
      return vm_dc * factor
    },

    healthyDisruptionRatio(): number {
      return this.healthyVm / this.healthy.thresholdVoltage
    },

    targetDisruptionRatio(): number {
      const cat = this.targetCellCategory
      const t = this.target as CellConfig & { resonantFreqGHz?: number; capsidQ?: number; resonantThresholdVcm?: number }
      if ((cat === 'virus' || cat === 'bacteria') && t.resonantFreqGHz && t.resonantThresholdVcm) {
        return computeResonantDisruption(
          t.resonantFreqGHz,
          t.capsidQ ?? 20,
          t.resonantThresholdVcm,
          this.currentBroadcastFrequency * 1e3,  // kHz → Hz
          this.fieldIntensity,
        )
      }
      return this.targetVm / this.target.thresholdVoltage
    },

    healthySAR(): number {
      const state = this as unknown as CellStoreState
      const wf = state.waveform === 'cw' ? 0.5 : 1.0
      return computeSAR(state.healthy, state.fieldIntensity, this.effectiveSigmaE, wf)
    },

    targetSAR(): number {
      const state = this as unknown as CellStoreState
      const wf = state.waveform === 'cw' ? 0.5 : 1.0
      return computeSAR(state.target, state.fieldIntensity, this.effectiveSigmaE, wf)
    },

    healthyFc(): number {
      return computeFc((this as unknown as CellStoreState).healthy, this.effectiveSigmaE)
    },

    targetFc(): number {
      return computeFc((this as unknown as CellStoreState).target, this.effectiveSigmaE)
    },

    systemReady(state): boolean {
      return state.healthyTemp < 40 && state.targetTemp < 40
    },

    /**
     * Mode-aware selectivity: targetDisruptionRatio / healthyDisruptionRatio.
     * Works correctly for both Schwan (mammalian IRE) and resonance (virus/bacteria)
     * modes. In resonance mode, healthy disruption ≈ 0 at GHz — selectivity caps at 99.9×.
     * In Schwan mode this equals the Therapeutic Index (threshold-normalised ratio).
     */
    selectivityRatio(): number {
      const hDr = this.healthyDisruptionRatio
      if (hDr < 1e-9) return this.targetDisruptionRatio > 0 ? 99.9 : 0
      return Math.min(99.9, this.targetDisruptionRatio / hDr)
    },

    /**
     * Classifies the current target cell by size:
     *   virus    — radius < 0.1 µm  (virions: 20–150 nm; Schwan model inapplicable)
     *   bacteria — radius < 2.0 µm  (E. coli ~1 µm, MRSA ~0.5 µm; nsEP regime)
     *   mammalian — radius ≥ 2.0 µm (cancer + reference cells)
     */
    targetCellCategory(state): 'mammalian' | 'bacteria' | 'virus' {
      if (state.target.radius < 0.1) return 'virus'
      if (state.target.radius < 2.0) return 'bacteria'
      return 'mammalian'
    },

    /**
     * Therapeutic Index TI = targetDisruptionRatio / healthyDisruptionRatio.
     * Mode-aware: in Schwan mode = (Vt/Vt,thr) / (Vh/Vh,thr).
     * In resonance mode: target uses acoustic disruption formula, healthy ≈ 0 at GHz → TI caps at 99.9.
     * TI > 1 means target cells are proportionally closer to disruption threshold than healthy cells.
     */
    therapeuticIndex(): number {
      const hDr = this.healthyDisruptionRatio
      if (hDr < 1e-9) return this.targetDisruptionRatio > 0 ? 99.9 : 0
      return Math.min(99.9, this.targetDisruptionRatio / hDr)
    },

    /**
     * True if at least one of the active cells has nuclear envelope parameters.
     * Used to conditionally show the double-shell model toggle in the UI.
     * Only mammalian nucleated cells have nuclearRadius defined.
     */
    hasNuclearParams(state): boolean {
      return !!state.healthy.nuclearRadius || !!state.target.nuclearRadius
    },

    /**
     * Nuclear transmembrane potential for the healthy cell [V].
     * Uses the two-shell bandpass formula (Kotnik & Miklavcic 2006).
     * Returns 0 if the healthy cell has no nuclear envelope parameters.
     */
    healthyNuclearVm(): number {
      const state = this as unknown as CellStoreState
      if (!state.healthy.nuclearRadius) return 0
      const sigma_e = this.effectiveSigmaE
      const cosT    = this.cosThetaFactor
      const vm_dc   = computeNuclearVm(state.healthy, state.currentBroadcastFrequency, state.fieldIntensity, sigma_e, cosT)
      const factor  = this.healthyPulseStepFactor
      return vm_dc * factor
    },

    /** Nuclear transmembrane potential for the target cell [V]. Returns 0 if no nuclear params. */
    targetNuclearVm(): number {
      const state = this as unknown as CellStoreState
      if (!state.target.nuclearRadius) return 0
      const sigma_e = this.effectiveSigmaE
      const cosT    = this.cosThetaFactor
      const vm_dc   = computeNuclearVm(state.target, state.currentBroadcastFrequency, state.fieldIntensity, sigma_e, cosT)
      const factor  = this.targetPulseStepFactor
      return vm_dc * factor
    },

    /** Nuclear disruption ratio for healthy cell: Vm_nuc / nuclear threshold voltage. */
    healthyNuclearDisruptionRatio(): number {
      const state = this as unknown as CellStoreState
      const vth = state.healthy.nuclearThresholdVoltage ?? 0.5
      return this.healthyNuclearVm / vth
    },

    /** Nuclear disruption ratio for target cell: Vm_nuc / nuclear threshold voltage. */
    targetNuclearDisruptionRatio(): number {
      const state = this as unknown as CellStoreState
      const vth = state.target.nuclearThresholdVoltage ?? 0.5
      return this.targetNuclearVm / vth
    },

    /**
     * Nuclear selectivity ratio: target nuclear disruption / healthy nuclear disruption.
     * Caps at 99.9 when healthy nuclear disruption is negligible.
     */
    nuclearSelectivityRatio(): number {
      const hDr = this.healthyNuclearDisruptionRatio
      if (hDr < 1e-9) return this.targetNuclearDisruptionRatio > 0 ? 99.9 : 0
      return Math.min(99.9, this.targetNuclearDisruptionRatio / hDr)
    },

    /**
     * Minimum field intensity [V/cm] at current frequency to reach lysis threshold
     * for the target cell — full frequency-dependent Schwan formula including cos(θ):
     *   Vm = 1.5·E·R·cosθ / √(1+(ωτ)²) = Vm_thr
     *   → E_lysis = Vm_thr·√(1+(ωτ)²) / (1.5·R·cosθ)
     * Near-perpendicular (cosθ < 0.01): returns 1e6 V/cm (effectively unreachable).
     */
    targetLysisField(): number {
      const state = this as unknown as CellStoreState
      const cosT = this.cosThetaFactor
      if (cosT < 0.01) return 1e6
      const sigma_e = this.effectiveSigmaE
      const tau   = computeTau(state.target, sigma_e)
      const omega = 2 * Math.PI * state.currentBroadcastFrequency * 1e3
      const R     = state.target.radius * 1e-6
      const denom = Math.sqrt(1 + (omega * tau) ** 2)
      return (state.target.thresholdVoltage * denom) / (1.5 * R * cosT * 100)
    },

    /** Same as targetLysisField but for the healthy reference cell. */
    healthyLysisField(): number {
      const state = this as unknown as CellStoreState
      const cosT = this.cosThetaFactor
      if (cosT < 0.01) return 1e6
      const sigma_e = this.effectiveSigmaE
      const tau   = computeTau(state.healthy, sigma_e)
      const omega = 2 * Math.PI * state.currentBroadcastFrequency * 1e3
      const R     = state.healthy.radius * 1e-6
      const denom = Math.sqrt(1 + (omega * tau) ** 2)
      return (state.healthy.thresholdVoltage * denom) / (1.5 * R * cosT * 100)
    },

    /**
     * Effective duty cycle for thermal calculations.
     * CW mode is by definition always-on (dc = 1.0) — the user's stored dutyCycle
     * value is only used in pulsed mode.  By NOT overwriting dutyCycle when switching
     * to CW, the user's pulsed setting is preserved when they switch back.
     */
    effectiveDutyCycle(state): number {
      return state.waveform === 'cw' ? 1.0 : state.dutyCycle
    },

    /**
     * Projected steady-state temperature for healthy cell [°C]:
     *   T_ss = 37 + SAR_eff / (λ × cp)
     *   SAR_eff = SAR_peak × effectiveDutyCycle
     * Capped at TEMP_SIMULATION_CAP for display.
     */
    healthySteadyStateTemp(): number {
      const sar_eff = this.healthySAR * this.effectiveDutyCycle
      const cp = this.healthy.specificHeatCapacity
      return Math.min(37 + sar_eff / (LAMBDA * cp), TEMP_SIMULATION_CAP)
    },

    /** Projected steady-state temperature for target cell [°C], capped at TEMP_SIMULATION_CAP. */
    targetSteadyStateTemp(): number {
      const sar_eff = this.targetSAR * this.effectiveDutyCycle
      const cp = this.target.specificHeatCapacity
      return Math.min(37 + sar_eff / (LAMBDA * cp), TEMP_SIMULATION_CAP)
    },

    /**
     * Maximum duty cycle that keeps both cells' T_ss ≤ 42°C (hyperthermic limit).
     * dc_max = (5 × λ × cp_min) / SAR_peak_max
     * Used by Safe Mode to clamp the duty cycle slider. Only meaningful in pulsed mode.
     */
    maxSafeDutyCycle(): number {
      const maxSAR = Math.max(this.healthySAR, this.targetSAR)
      if (maxSAR <= 0) return 1
      const minCp = Math.min(this.healthy.specificHeatCapacity, this.target.specificHeatCapacity)
      return Math.min(1, (5 * LAMBDA * minCp) / maxSAR)
    },
  },

  actions: {
    setMedium(key: MediumKey) {
      this.medium = key
    },

    setFieldIntensity(vcm: number) {
      this.fieldIntensity = vcm
    },

    setBroadcastFreqKHz(khz: number) {
      this.currentBroadcastFrequency = khz
    },

    // Legacy alias — called from local-mode broadcastFieldParams
    setBroadcastFrequency(khz: number) {
      this.currentBroadcastFrequency = khz
    },

    handleResonancePacket(packet: FieldPacket) {
      this.currentBroadcastFrequency = packet.activeFrequencyKHz
      this.fieldIntensity = packet.activeFieldIntensityVcm
      if (packet.activeMedium in MEDIA) {
        this.medium = packet.activeMedium as MediumKey
      }
    },

    updateCellParam(cellType: 'healthy' | 'target', key: string, value: number) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(this[cellType] as any)[key] = value
    },

    startSession() {
      if (this._tempTimer !== null) return
      this._tempTimer = setInterval(() => {
        // Effective duty cycle: CW is always-on (1.0); pulsed uses slider value
        const dc = this.effectiveDutyCycle
        // Healthy cell temperature update (Newton cooling, 100 ms tick)
        const hSAR = this.healthySAR
        const dTh = (hSAR * dc / this.healthy.specificHeatCapacity - LAMBDA * (this.healthyTemp - 37)) * 0.1
        this.healthyTemp = Math.max(37, Math.min(TEMP_SIMULATION_CAP, this.healthyTemp + dTh))

        // Target cell temperature update
        const tSAR = this.targetSAR
        const dTt = (tSAR * dc / this.target.specificHeatCapacity - LAMBDA * (this.targetTemp - 37)) * 0.1
        this.targetTemp = Math.max(37, Math.min(TEMP_SIMULATION_CAP, this.targetTemp + dTt))
      }, 100) as unknown as number
    },

    setDutyCycle(dc: number) {
      this.dutyCycle = Math.max(1e-6, Math.min(1, dc))
    },

    setPulseWidthNs(ns: number) {
      this.pulseWidthNs = Math.max(1, Math.min(100_000, ns))
    },

    setWaveform(mode: 'cw' | 'pulsed') {
      this.waveform = mode
      // Do NOT overwrite dutyCycle — CW always uses effectiveDutyCycle=1.0 in the thermal
      // model regardless, and preserving the pulsed dutyCycle lets the user switch back
      // to pulsed mode without losing their setting.
    },

    /**
     * Toggle Safe Mode — clamps duty cycle so projected T_ss ≤ 42°C.
     * Expert mode (off) allows full parameter range with warnings shown.
     */
    setSafeMode(on: boolean) {
      this.safeMode = on
      if (on && this.dutyCycle > this.maxSafeDutyCycle) {
        this.dutyCycle = Math.max(1e-6, this.maxSafeDutyCycle)
      }
    },

    stopSession() {
      if (this._tempTimer !== null) {
        clearInterval(this._tempTimer)
        this._tempTimer = null
      }
    },

    resetCell(cellType: 'healthy' | 'target') {
      const defaultCfg = cellType === 'healthy' ? cellConfigs[0] : cellConfigs[1]
      this[cellType] = cloneDeep(defaultCfg) as CellConfig
      if (cellType === 'healthy') this.healthyTemp = 37
      else this.targetTemp = 37
      this.resetCounter++
    },

    loadPreset(cellType: 'healthy' | 'target', preset: CellConfig) {
      this[cellType] = cloneDeep(preset) as CellConfig
      // Reset both temperatures — loading a preset starts a fresh experiment context.
      this.healthyTemp = 37
      this.targetTemp = 37
    },

    /** Reset both cell temperatures to physiological baseline (37°C). */
    resetTemps() {
      this.healthyTemp = 37
      this.targetTemp = 37
    },

    /** Set field-cell orientation angle θ [0°–90°]. 0° = field-aligned = maximum Vm coupling. */
    setOrientationDeg(deg: number) {
      this.orientationDeg = Math.max(0, Math.min(90, deg))
    },

    /** Set number of above-threshold pulses required to trigger lysis [1–1000]. */
    setLysisNPulses(n: number) {
      this.lysisNPulses = Math.max(1, Math.min(1000, Math.round(n)))
    },

    /**
     * Set the active chart/simulation mode.
     * 'schwan' — Schwan/IRE transmembrane potential model (mammalian cells).
     * 'resonance' — Acoustic resonance model (virus/bacteria capsid/cell-wall).
     * Auto-disables double-shell model when switching to resonance (nuclear model is Schwan-only).
     */
    setChartMode(mode: 'schwan' | 'resonance') {
      this.chartMode = mode
      if (mode === 'resonance') this.doubleShellEnabled = false
    },

    /** Toggle the double-shell nuclear envelope model on/off. Only meaningful in Schwan mode. */
    toggleDoubleShell() {
      this.doubleShellEnabled = !this.doubleShellEnabled
    },

  },
})
