import { defineStore } from 'pinia'
import { cloneDeep } from 'lodash'
import { cellConfigs } from '@/mockData'
import { MEDIA } from '@/constants/media'
import type { CellConfig } from '@/types/cell'
import type { MediumKey } from '@/types/media'
import { computeSchwan, computeSAR, computeFc, computeTau, computeResonantDisruption, computeNuclearVm, computePulseStepResponse, computeSkinDepthMm } from '@/utils/physics'
import { CELL_CATEGORY, CHART_MODE, WAVEFORM, CELL_TYPE } from '@/constants/strings'
import { THRESHOLDS } from '@/constants/cellCard'

const LAMBDA = 0.02     // Newton cooling rate [1/s]

// σ_e(T) = σ_e0 × (1 + α × (T−37)) — medium-specific coefficients [1/°C]
const SIGMA_TEMP_COEFF: Record<string, number> = {
  saline:  0.020,
  blood:   0.017,
  tissue:  0.015,
  water:   0.028,
}

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
  dutyCycle: number               // pulsed on-fraction [0–1]
  waveform: 'cw' | 'pulsed'      // CW (wf=0.5) or pulsed bipolar square-wave H-FIRE (wf=1.0)
  pulseWidthNs: number            // pulse width [ns]
  safeMode: boolean               // clamps dc so T_ss ≤ 42°C
  orientationDeg: number          // field-cell axis θ [0–90°]
  lysisNPulses: number            // above-threshold pulses before lysis
  chartMode: 'schwan' | 'resonance'
  doubleShellEnabled: boolean     // two-shell nuclear envelope model (Kotnik 2006)
  perfusionRate: number           // ω_b [mL/(g·min)]; 0 = in vitro
  cellPackingFraction: number     // φ [0–0.9]; Maxwell-Garnett σ_e correction
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
    perfusionRate: 0,              // mL/(g·min); 0 = isolated cell / in-vitro default
    cellPackingFraction: 0,        // φ = 0 (isolated cell); set >0 for dense tissue context
    _tempTimer: null,
    resetCounter: 0,
  }),

  getters: {
    /** σ_e at reference temperature [S/m] — display only */
    sigma_e: (state): number => MEDIA[state.medium].conductivity,

    /** |cos θ| field-cell axis coupling [0–1]; cancels in Vm_T/Vm_H ratio */
    cosThetaFactor(state): number {
      return Math.abs(Math.cos(state.orientationDeg * Math.PI / 180))
    },

    /** Membrane charging fraction per pulse: 1−exp(−t_p/τ). CW → 1.0. */
    pulseEnvelopeFactorHealthy(): number {
      const state = this as unknown as CellStoreState
      if (state.waveform !== WAVEFORM.PULSED) return 1.0
      const tau_s = computeTau(state.healthy, this.effectiveSigmaE)
      return computePulseStepResponse(tau_s, state.pulseWidthNs)
    },

    /** Same as pulseEnvelopeFactorHealthy; always 1.0 in resonance mode (acoustic coupling). */
    pulseEnvelopeFactorTarget(): number {
      const state = this as unknown as CellStoreState
      if (state.waveform !== WAVEFORM.PULSED) return 1.0
      if (state.chartMode === CHART_MODE.RESONANCE) return 1.0
      const tau_s = computeTau(state.target, this.effectiveSigmaE)
      return computePulseStepResponse(tau_s, state.pulseWidthNs)
    },

    /** σ_e corrected for temperature and cell packing fraction [S/m].
     *  σ_e(T) = σ_e0·(1+α·(T_mean−37)); Maxwell-Garnett: σ_eff = σ_T·(1−φ)/(1+φ/2). */
    effectiveSigmaE(state): number {
      const sigma_e0 = MEDIA[state.medium].conductivity
      const alpha    = SIGMA_TEMP_COEFF[state.medium] ?? 0.020
      const T_mean   = (state.healthyTemp + state.targetTemp) / 2
      const sigma_T  = sigma_e0 * (1 + alpha * (T_mean - 37))
      const phi = Math.min(0.9, Math.max(0, state.cellPackingFraction))
      return sigma_T * (1 - phi) / (1 + phi / 2)
    },

    /** Lysis countdown [ms]: CW→2500 ms; pulsed→N_pulses × (t_p/dc), clamped [200–30000] ms. */
    lysisDelayMs(state): number {
      if (state.waveform === WAVEFORM.CW || state.dutyCycle >= 1) return 2500
      const pulsePeriodMs = (state.pulseWidthNs * 1e-6) / state.dutyCycle
      return Math.max(200, Math.min(30_000, state.lysisNPulses * pulsePeriodMs))
    },

    /** Schwan Vm for healthy cell [V]. Pulsed mode uses E_peak (lower-bound; cancels in TI). */
    healthyVm(): number {
      const state = this as unknown as CellStoreState
      const sigma_e = this.effectiveSigmaE
      const cosT = this.cosThetaFactor
      return computeSchwan(state.healthy, state.currentBroadcastFrequency, state.fieldIntensity, sigma_e, cosT)
    },

    /** Schwan Vm for target cell [V]. Resonance mode overrides DR formula separately. */
    targetVm(): number {
      const state = this as unknown as CellStoreState
      const sigma_e = this.effectiveSigmaE
      const cosT = this.cosThetaFactor
      return computeSchwan(state.target, state.currentBroadcastFrequency, state.fieldIntensity, sigma_e, cosT)
    },

    /** DR_H = (Vm·pulseEnvelope) / Vm_threshold */
    healthyDisruptionRatio(): number {
      return (this.healthyVm * this.pulseEnvelopeFactorHealthy) / this.healthy.thresholdVoltage
    },

    /** DR_T: acoustic Lorentzian for bacteria/virus; (Vm·pulseEnvelope)/Vm_thr for mammalian. */
    targetDisruptionRatio(): number {
      const cat = this.targetCellCategory
      const t = this.target as CellConfig & { resonantFreqGHz?: number; capsidQ?: number; resonantThresholdVcm?: number }
      if ((cat === CELL_CATEGORY.VIRUS || cat === CELL_CATEGORY.BACTERIA) && t.resonantFreqGHz && t.resonantThresholdVcm) {
        return computeResonantDisruption(
          t.resonantFreqGHz,
          t.capsidQ ?? 20,
          t.resonantThresholdVcm,
          this.currentBroadcastFrequency * 1e3,  // kHz → Hz
          this.fieldIntensity,
        )
      }
      return (this.targetVm * this.pulseEnvelopeFactorTarget) / this.target.thresholdVoltage
    },

    healthySAR(): number {
      const state = this as unknown as CellStoreState
      const wf = state.waveform === WAVEFORM.CW ? 0.5 : 1.0
      return computeSAR(state.healthy, state.fieldIntensity, this.effectiveSigmaE, wf)
    },

    targetSAR(): number {
      const state = this as unknown as CellStoreState
      const wf = state.waveform === WAVEFORM.CW ? 0.5 : 1.0
      return computeSAR(state.target, state.fieldIntensity, this.effectiveSigmaE, wf)
    },

    healthyFc(): number {
      return computeFc((this as unknown as CellStoreState).healthy, this.effectiveSigmaE)
    },

    targetFc(): number {
      return computeFc((this as unknown as CellStoreState).target, this.effectiveSigmaE)
    },

    systemReady(state): boolean {
      return state.healthyTemp < THRESHOLDS.TEMP_WARN && state.targetTemp < THRESHOLDS.TEMP_WARN
    },

    /** Alias for therapeuticIndex — backward compat */
    selectivityRatio(): number {
      return this.therapeuticIndex
    },

    /** virus: R<0.1µm · bacteria: R<2µm · mammalian: R≥2µm */
    targetCellCategory(state): 'mammalian' | 'bacteria' | 'virus' {
      if (state.target.radius < THRESHOLDS.RADIUS_VIRUS_MAX)    return CELL_CATEGORY.VIRUS
      if (state.target.radius < THRESHOLDS.RADIUS_BACTERIA_MAX) return CELL_CATEGORY.BACTERIA
      return CELL_CATEGORY.MAMMALIAN
    },

    /** TI = DR_T / DR_H. Caps at 99.9 when healthy DR ≈ 0 (resonance selectivity). */
    therapeuticIndex(): number {
      const hDr = this.healthyDisruptionRatio
      if (hDr < 1e-9) return this.targetDisruptionRatio > 0 ? 99.9 : 0
      return Math.min(99.9, this.targetDisruptionRatio / hDr)
    },

    /** TI worst-case bounds from ±σ_i uncertainty: mammalian ±20%, bacteria ±35%, virus ±45%.
     *  Resonance mode returns nominal {TI,TI} — Q-range shown separately. */
    tiUncertaintyRange(): { low: number; high: number } {
      const state = this as unknown as CellStoreState
      const nominal = this.therapeuticIndex
      if (state.chartMode === CHART_MODE.RESONANCE) return { low: nominal, high: nominal }
      const sigma_e = this.effectiveSigmaE
      const field   = state.fieldIntensity
      const freq    = state.currentBroadcastFrequency
      const cosT    = this.cosThetaFactor
      const uncH    = state.healthy.radius < THRESHOLDS.RADIUS_BACTERIA_MAX ? 0.35 : 0.20
      const uncT    = state.target.radius < THRESHOLDS.RADIUS_VIRUS_MAX ? 0.45 : state.target.radius < THRESHOLDS.RADIUS_BACTERIA_MAX ? 0.35 : 0.20
      // TI_low: weakest target + strongest healthy coupling
      const vmTLow  = computeSchwan({ ...state.target,  conductivity: state.target.conductivity  * (1 - uncT) }, freq, field, sigma_e, cosT)
      const vmHHigh = computeSchwan({ ...state.healthy, conductivity: state.healthy.conductivity * (1 + uncH) }, freq, field, sigma_e, cosT)
      const pefT    = this.pulseEnvelopeFactorTarget
      const pefH    = this.pulseEnvelopeFactorHealthy
      const drTLow  = (vmTLow  * pefT) / state.target.thresholdVoltage
      const drHHigh = (vmHHigh * pefH) / state.healthy.thresholdVoltage
      const tiLow   = drHHigh < 1e-9 ? 0 : Math.max(0, Math.min(99.9, drTLow / drHHigh))
      // TI_high: strongest target + weakest healthy coupling
      const vmTHigh = computeSchwan({ ...state.target,  conductivity: state.target.conductivity  * (1 + uncT) }, freq, field, sigma_e, cosT)
      const vmHLow  = computeSchwan({ ...state.healthy, conductivity: state.healthy.conductivity * (1 - uncH) }, freq, field, sigma_e, cosT)
      const drTHigh = (vmTHigh * pefT) / state.target.thresholdVoltage
      const drHLow  = (vmHLow  * pefH) / state.healthy.thresholdVoltage
      const tiHigh  = drHLow  < 1e-9 ? 99.9 : Math.min(99.9, drTHigh / drHLow)
      return { low: tiLow, high: tiHigh }
    },

    hasNuclearParams(state): boolean {
      return !!state.healthy.nuclearRadius || !!state.target.nuclearRadius
    },

    /** Nuclear Vm for healthy cell [V] — Kotnik 2006 bandpass. 0 if no nuclear params. */
    healthyNuclearVm(): number {
      const state = this as unknown as CellStoreState
      if (!state.healthy.nuclearRadius) return 0
      const sigma_e = this.effectiveSigmaE
      const cosT    = this.cosThetaFactor
      return computeNuclearVm(state.healthy, state.currentBroadcastFrequency, state.fieldIntensity, sigma_e, cosT)
    },

    /** Nuclear transmembrane potential for the target cell [V]. Returns 0 if no nuclear params. */
    targetNuclearVm(): number {
      const state = this as unknown as CellStoreState
      if (!state.target.nuclearRadius) return 0
      const sigma_e = this.effectiveSigmaE
      const cosT    = this.cosThetaFactor
      return computeNuclearVm(state.target, state.currentBroadcastFrequency, state.fieldIntensity, sigma_e, cosT)
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

    /** E_lysis for target [V/cm]: Vm_thr·√(1+(ωτ)²)/(1.5·R·cosθ·pef). Returns 1e6 near θ=90°. */
    targetLysisField(): number {
      const state = this as unknown as CellStoreState
      const cosT = this.cosThetaFactor
      if (cosT < 0.01) return 1e6
      const sigma_e = this.effectiveSigmaE
      const tau   = computeTau(state.target, sigma_e)
      const omega = 2 * Math.PI * state.currentBroadcastFrequency * 1e3
      const R     = state.target.radius * 1e-6
      const denom = Math.sqrt(1 + (omega * tau) ** 2)
      const baseLysisField = (state.target.thresholdVoltage * denom) / (1.5 * R * cosT * 100)
      // Divide by pulse envelope factor: shorter pulses require proportionally more field
      const pef = Math.max(1e-4, this.pulseEnvelopeFactorTarget)
      return baseLysisField / pef
    },

    /** E_lysis for healthy cell [V/cm] — same formula as targetLysisField. */
    healthyLysisField(): number {
      const state = this as unknown as CellStoreState
      const cosT = this.cosThetaFactor
      if (cosT < 0.01) return 1e6
      const sigma_e = this.effectiveSigmaE
      const tau   = computeTau(state.healthy, sigma_e)
      const omega = 2 * Math.PI * state.currentBroadcastFrequency * 1e3
      const R     = state.healthy.radius * 1e-6
      const denom = Math.sqrt(1 + (omega * tau) ** 2)
      const baseLysisField = (state.healthy.thresholdVoltage * denom) / (1.5 * R * cosT * 100)
      const pef = Math.max(1e-4, this.pulseEnvelopeFactorHealthy)
      return baseLysisField / pef
    },

    /** dc for thermal calc: CW→1.0, pulsed→stored value */
    effectiveDutyCycle(state): number {
      return state.waveform === WAVEFORM.CW ? 1.0 : state.dutyCycle
    },

    /** T_ss = 37 + SAR·dc / (λ_eff·cp)  [°C].  λ_eff = λ_Newton + ω_b·63.9/cp (Pennes). */
    healthySteadyStateTemp(): number {
      const state = this as unknown as CellStoreState
      const sar_eff = this.healthySAR * this.effectiveDutyCycle
      const cp = state.healthy.specificHeatCapacity
      const lambda_perf = state.perfusionRate * 63.9 / cp   // ω_b [mL/(g·min)] × ρ_b·c_b/60000
      return Math.min(37 + sar_eff / ((LAMBDA + lambda_perf) * cp), THRESHOLDS.TEMP_CAP)
    },

    /** Projected steady-state temperature for target cell [°C], capped at THRESHOLDS.TEMP_CAP. */
    targetSteadyStateTemp(): number {
      const state = this as unknown as CellStoreState
      const sar_eff = this.targetSAR * this.effectiveDutyCycle
      const cp = state.target.specificHeatCapacity
      const lambda_perf = state.perfusionRate * 63.9 / cp
      return Math.min(37 + sar_eff / ((LAMBDA + lambda_perf) * cp), THRESHOLDS.TEMP_CAP)
    },

    /** δ = √(1/(π·f·μ₀·σ_e)) [mm].  Saline: 100MHz→41mm · 1GHz→13mm · 12GHz→3.8mm. */
    skinDepthMm(): number {
      const state = this as unknown as CellStoreState
      return computeSkinDepthMm(state.currentBroadcastFrequency, this.effectiveSigmaE)
    },

    /** dc_max = 5·λ·cp_min / SAR_max — keeps T_ss ≤ 42°C in safe mode. */
    maxSafeDutyCycle(): number {
      const maxSAR = Math.max(this.healthySAR, this.targetSAR)
      if (maxSAR <= 0) return 1
      const minCp = Math.min(this.healthy.specificHeatCapacity, this.target.specificHeatCapacity)
      return Math.min(1, (5 * LAMBDA * minCp) / maxSAR)
    },

    // ── Sub-threshold healthy-cell biomodulation ──────────────────────────────

    /** SI = 4·r·(1−r), r = DR/0.45.  Bell peaking at DR≈22.5%; zero above NOURISHING threshold. */
    healthyStimIndex(): number {
      const r = Math.min(1, this.healthyDisruptionRatio / 0.45)
      return Math.max(0, 4 * r * (1 - r))
    },

    /** MTE = 1/√(1+(f/fc)²) — Schwan roll-off; peaks at f≪fc. */
    healthyMechTransductionEff(): number {
      const f  = (this as unknown as CellStoreState).currentBroadcastFrequency  // kHz
      const fc = this.healthyFc                                                  // kHz
      return 1 / Math.sqrt(1 + (f / fc) ** 2)
    },

    /** MA: piecewise bell 37–42°C. 0 below 37 or above 42; peak at 41°C. Uses T_ss. */
    healthyMildThermalActivation(): number {
      const T = this.healthySteadyStateTemp
      if (T <= 37) return 0
      if (T <= 41) return (T - 37) / 4
      if (T <= 42) return 42 - T
      return 0
    },

    /** Optimal frequency for max TI: bacteria/virus→f_res; mammalian→300-pt log scan 10kHz–500MHz. */
    optimalFreqResult(): { khz: number; sel: number } {
      const state  = this as unknown as CellStoreState
      const target = state.target as CellConfig & { resonantFreqGHz?: number; resonantThresholdVcm?: number }
      const cat    = this.targetCellCategory
      if ((cat === CELL_CATEGORY.VIRUS || cat === CELL_CATEGORY.BACTERIA) && target.resonantFreqGHz && target.resonantThresholdVcm) {
        return { khz: target.resonantFreqGHz * 1e6, sel: 99.9 }
      }
      const sigma_e = this.effectiveSigmaE
      const field   = state.fieldIntensity
      const hThr    = state.healthy.thresholdVoltage
      const tThr    = state.target.thresholdVoltage
      let maxSel = -Infinity, optKhz = 10
      const logMin = Math.log10(10), logMax = Math.log10(500_000)
      for (let i = 0; i < 300; i++) {
        const khz = Math.pow(10, logMin + (logMax - logMin) * i / 299)
        const hVm = computeSchwan(state.healthy, khz, field, sigma_e)
        const tVm = computeSchwan(state.target,  khz, field, sigma_e)
        const hDr = hVm / hThr, tDr = tVm / tThr
        const sel  = hDr > 0 ? tDr / hDr : 0
        if (sel > maxSel) { maxSel = sel; optKhz = khz }
      }
      return { khz: optKhz, sel: Math.max(0, maxSel) }
    },

    /** BMS = 0.55·SI + 0.25·MTE + 0.20·MA — research indicator, not a clinical index. */
    healthyBiomodScore(): number {
      return (
        0.55 * this.healthyStimIndex +
        0.25 * this.healthyMechTransductionEff +
        0.20 * this.healthyMildThermalActivation
      )
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

    handleResonancePacket(packet: FieldPacket) {
      this.currentBroadcastFrequency = packet.activeFrequencyKHz
      this.fieldIntensity = packet.activeFieldIntensityVcm
      if (packet.activeMedium in MEDIA) {
        this.medium = packet.activeMedium as MediumKey
      }
    },

    updateCellParam(cellType: 'healthy' | 'target', key: string, value: number) {
      ;(this[cellType] as unknown as Record<string, number>)[key] = value
    },

    startSession() {
      if (this._tempTimer !== null) return
      this._tempTimer = setInterval(() => {
        const dc = this.effectiveDutyCycle
        const hCp = this.healthy.specificHeatCapacity
        const hL  = LAMBDA + this.perfusionRate * 63.9 / hCp
        const dTh = (this.healthySAR * dc / hCp - hL * (this.healthyTemp - 37)) * 0.1
        this.healthyTemp = Math.max(37, Math.min(THRESHOLDS.TEMP_CAP, this.healthyTemp + dTh))
        const tCp = this.target.specificHeatCapacity
        const tL  = LAMBDA + this.perfusionRate * 63.9 / tCp
        const dTt = (this.targetSAR * dc / tCp - tL * (this.targetTemp - 37)) * 0.1
        this.targetTemp = Math.max(37, Math.min(THRESHOLDS.TEMP_CAP, this.targetTemp + dTt))
      }, 100) as unknown as number
    },

    setDutyCycle(dc: number) {
      this.dutyCycle = Math.max(1e-6, Math.min(1, dc))
    },

    setPulseWidthNs(ns: number) {
      this.pulseWidthNs = Math.max(1, Math.min(100_000, ns))
    },

    setWaveform(mode: 'cw' | 'pulsed') {
      this.waveform = mode  // dutyCycle not overwritten — CW uses effectiveDutyCycle=1.0
    },

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
      const defaultCfg = cellType === CELL_TYPE.HEALTHY ? cellConfigs[0] : cellConfigs[1]
      this[cellType] = cloneDeep(defaultCfg) as CellConfig
      if (cellType === CELL_TYPE.HEALTHY) this.healthyTemp = 37
      else this.targetTemp = 37
      this.resetCounter++
    },

    loadPreset(cellType: 'healthy' | 'target', preset: CellConfig) {
      this[cellType] = cloneDeep(preset) as CellConfig
      this.healthyTemp = 37
      this.targetTemp = 37
      this.resetCounter++  // signals CellCard to reset visual state
    },

    resetTemps() {
      this.healthyTemp = 37
      this.targetTemp = 37
    },

    setOrientationDeg(deg: number) {
      this.orientationDeg = Math.max(0, Math.min(90, deg))
    },

    setLysisNPulses(n: number) {
      this.lysisNPulses = Math.max(1, Math.min(1000, Math.round(n)))
    },

    setChartMode(mode: 'schwan' | 'resonance') {
      this.chartMode = mode
      if (mode === CHART_MODE.RESONANCE) this.doubleShellEnabled = false  // nuclear model is Schwan-only
    },

    toggleDoubleShell() {
      this.doubleShellEnabled = !this.doubleShellEnabled
    },

    setPerfusionRate(rate: number) {
      this.perfusionRate = Math.max(0, Math.min(10, rate))
    },

    setCellPackingFraction(phi: number) {
      this.cellPackingFraction = Math.max(0, Math.min(0.9, phi))
    },

  },
})
