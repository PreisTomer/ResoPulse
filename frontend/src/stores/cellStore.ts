import { defineStore } from 'pinia'
import { cloneDeep } from 'lodash'
import { cellConfigs, MEDIA } from '../mockData'
import type { CellConfig, MediumKey } from '../mockData'
import { computeSchwan, computeSAR, computeFc, computeTau, computePulseStepResponse, computeResonantDisruption } from '../utils/physics'

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
    _tempTimer: null,
    resetCounter: 0,
  }),

  getters: {
    sigma_e: (state): number => MEDIA[state.medium].conductivity,

    /**
     * Pulse step-response factor for the healthy cell [0–1].
     * = 1 − exp(−t_p/τ) in pulsed mode; = 1.0 in CW mode.
     * At t_p ≪ τ_healthy, small-τ cells (bacteria) charge proportionally more.
     */
    healthyPulseStepFactor(state): number {
      if (state.waveform !== 'pulsed') return 1.0
      const sigma_e = MEDIA[state.medium].conductivity
      const tau = computeTau(state.healthy, sigma_e)
      return computePulseStepResponse(tau, state.pulseWidthNs)
    },

    /** Pulse step-response factor for the target cell [0–1]. */
    targetPulseStepFactor(state): number {
      if (state.waveform !== 'pulsed') return 1.0
      const sigma_e = MEDIA[state.medium].conductivity
      const tau = computeTau(state.target, sigma_e)
      return computePulseStepResponse(tau, state.pulseWidthNs)
    },

    healthyVm(state): number {
      const sigma_e = MEDIA[state.medium].conductivity
      const vm_dc = computeSchwan(state.healthy, state.currentBroadcastFrequency, state.fieldIntensity, sigma_e)
      const tau = computeTau(state.healthy, sigma_e)
      const factor = state.waveform === 'pulsed'
        ? computePulseStepResponse(tau, state.pulseWidthNs)
        : 1.0
      return vm_dc * factor
    },

    targetVm(state): number {
      const sigma_e = MEDIA[state.medium].conductivity
      const vm_dc = computeSchwan(state.target, state.currentBroadcastFrequency, state.fieldIntensity, sigma_e)
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

    healthySAR(state): number {
      const sigma_e = MEDIA[state.medium].conductivity
      const wf = state.waveform === 'cw' ? 0.5 : 1.0
      return computeSAR(state.healthy, state.fieldIntensity, sigma_e, wf)
    },

    targetSAR(state): number {
      const sigma_e = MEDIA[state.medium].conductivity
      const wf = state.waveform === 'cw' ? 0.5 : 1.0
      return computeSAR(state.target, state.fieldIntensity, sigma_e, wf)
    },

    healthyFc(state): number {
      const sigma_e = MEDIA[state.medium].conductivity
      return computeFc(state.healthy, sigma_e)
    },

    targetFc(state): number {
      const sigma_e = MEDIA[state.medium].conductivity
      return computeFc(state.target, sigma_e)
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
     * Minimum field intensity [V/cm] at current frequency to reach lysis threshold
     * for the target cell — full frequency-dependent Schwan formula:
     *   Vm = 1.5·E·R / √(1+(ωτ)²) = Vm_thr  →  E_lysis = Vm_thr·√(1+(ωτ)²) / (1.5·R)
     * At quasi-DC (f ≪ fc) this reduces to E_lysis = Vm_thr / (1.5·R).
     */
    targetLysisField(state): number {
      const sigma_e = MEDIA[state.medium].conductivity
      const tau   = computeTau(state.target, sigma_e)
      const omega = 2 * Math.PI * state.currentBroadcastFrequency * 1e3
      const R     = state.target.radius * 1e-6
      const denom = Math.sqrt(1 + (omega * tau) ** 2)
      return (state.target.thresholdVoltage * denom) / (1.5 * R * 100)
    },

    /** Same as targetLysisField but for the healthy reference cell. */
    healthyLysisField(state): number {
      const sigma_e = MEDIA[state.medium].conductivity
      const tau   = computeTau(state.healthy, sigma_e)
      const omega = 2 * Math.PI * state.currentBroadcastFrequency * 1e3
      const R     = state.healthy.radius * 1e-6
      const denom = Math.sqrt(1 + (omega * tau) ** 2)
      return (state.healthy.thresholdVoltage * denom) / (1.5 * R * 100)
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

    // Legacy no-ops
    applyResonance(_cellType: 'healthy' | 'target') {},
    applyDisruption(_cellType: 'healthy' | 'target') {},
  },
})
