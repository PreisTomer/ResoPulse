// Copyright © 2026 Tomer Preis. All rights reserved.
// Unauthorized copying or distribution is prohibited.

import { defineStore } from 'pinia'
import { cloneDeep } from 'lodash'
import { cellConfigs } from '@/constants/defaultCells'
import { CELL_PRESETS } from '@/constants/cellLibrary'
import { MEDIA } from '@/constants/media'
import type { CellConfig, CellState } from '@/types/cell'
import type { MediumKey } from '@/types/media'
import { computeSchwan, computeSAR, computeFc, computeTau, computeResonantDisruption, computeNuclearVm, computePulseStepResponse, computeSkinDepthMm, computeDepCmReal, computeDepCrossoverKHz, computeDepSecondCrossoverKHz, computePopulationLysisFraction, safeRatio } from '@/utils/physics'
import { CELL_CATEGORY, CHART_MODE, WAVEFORM, CELL_TYPE, FREQ_REGIME } from '@/constants/strings'
import { DEFAULT_LYSIS_N_PULSES, DEFAULT_ORIENTATION_DEG } from '@/constants/experimentDefaults'
import {
  THRESHOLDS,
  DEFAULT_CAPSID_Q,
  SCHWAN_SPHERE_FACTOR,
  BODY_TEMP_C,
  NEWTON_COOLING_LAMBDA,
  PENNES_BLOOD_COEFF,
  TWO_PI,
  WF_CW,
  WF_PULSED,
  H_FIRE_THRESHOLD_MULTIPLIER,
  THERMAL_MA_PEAK_C,
  TEMP_UPDATE_INTERVAL_MS,
  MIN_COS_THETA,
  MIN_PULSE_ENVELOPE,
  NEAR_ZERO_DR,
  FREQ_ELECTROLYTIC_LIMIT_KHZ,
  FREQ_NEARFIELD_RF_LIMIT_KHZ,
  TEMP_EP_COEFF,
  TEMP_EP_CLAMP_MIN,
  POP_CV_MAMMALIAN,
  POP_CV_BACTERIA,
  POP_CV_VIRUS,
  RESEAL_TIME_REF_S,
  RESEAL_DR_REF,
  RESEAL_DR_EXPONENT,
  RESEAL_TEMP_COEFF,
  RESEAL_PULSE_EXPONENT,
  RESEAL_TIME_MIN_S,
  RESEAL_TIME_MAX_S,
  V_CM_TO_V_M,
  KHZ_TO_HZ,
  NS_TO_S,
  NS_TO_MS,
  MS_TO_S,
  J_M3_TO_MJ_CM3,
  RHO_AQUEOUS_KG_M3,
  LYSIS_DELAY_CW_MS,
  LYSIS_DELAY_MAX_MS,
  ELECTRODE_POLARIZATION_LIMIT_KHZ,
  GHZ_FIELD_WARNING_V_CM,
} from '@/constants/physics'

// ── Module-level computation helpers (pure functions - no store context needed) ──

/** Pulse envelope for a single cell: 1.0 for CW; 1−exp(−t_p/τ) for pulsed. */
function pulseEnvelope(cell: CellConfig, pulseWidthNs: number, sigma_e: number): number {
  return computePulseStepResponse(computeTau(cell, sigma_e), pulseWidthNs)
}

/** Lysis field [V/cm]: Vth·√(1+(ωτ)²) / (1.5·R·cosθ·100·pef). Returns 1e6 near θ=90°. */
function lysisField(
  cell: CellConfig,
  freqKHz: number,
  sigma_e: number,
  cosTheta: number,
  pef: number,
): number {
  if (cosTheta < MIN_COS_THETA) return 1e6
  const omega = TWO_PI * freqKHz * 1e3
  const tau   = computeTau(cell, sigma_e)
  return (cell.thresholdVoltage * Math.sqrt(1 + (omega * tau) ** 2)) /
    (SCHWAN_SPHERE_FACTOR * cell.radius * 1e-6 * cosTheta * 100 * Math.max(MIN_PULSE_ENVELOPE, pef))
}

/**
 * Temperature-corrected electroporation threshold voltage [V].
 * Vth decreases ~0.3%/°C above 37°C (Arrhenius pore-nucleation kinetics).
 * Clamped at TEMP_EP_CLAMP_MIN × nominalVth to prevent unphysical collapse.
 * Ref: Weaver & Chizmadzhev (1996); DeBruin & Krassowska (1999).
 */
function tempCorrectedVth(nominalVth: number, tempC: number): number {
  const correction = Math.max(TEMP_EP_CLAMP_MIN, 1 - TEMP_EP_COEFF * Math.max(0, tempC - BODY_TEMP_C))
  return nominalVth * correction
}

/** Uncertainty factor by cell size: virus 45%, bacteria 35%, mammalian 20%. */
function uncertaintyFactor(radius: number): number {
  const { RADIUS_VIRUS_MAX, RADIUS_BACTERIA_MAX } = THRESHOLDS
  if (radius < RADIUS_VIRUS_MAX)    return THRESHOLDS.UNCERTAINTY_VIRUS
  if (radius < RADIUS_BACTERIA_MAX) return THRESHOLDS.UNCERTAINTY_BACTERIA
  return THRESHOLDS.UNCERTAINTY_MAMMALIAN
}


export interface FieldPacket {
  timestamp: number
  activeFrequencyKHz: number
  activeFieldIntensityVcm: number
  activeMedium: string
}

// Legacy alias - services/socket.ts imports this type
export type ResonancePacket = FieldPacket

/** Full experiment state broadcast between clients */
export interface StatePacket {
  freqKHz:             number
  fieldVcm:            number
  medium:              string
  dutyCycle:           number
  pulseWidthNs:        number
  waveform:            'cw' | 'pulsed' | 'hfire'
  orientationDeg:      number
  lysisNPulses:        number
  chartMode:           'schwan' | 'resonance'
  doubleShellEnabled:  boolean
  perfusionRate:       number
  cellPackingFraction: number
  targetPresetId:      string
  healthyPresetId:     string
  sessionName:         string
}

interface CellStoreState {
  healthy: CellConfig
  target: CellConfig
  medium: MediumKey
  fieldIntensity: number          // V/cm
  currentBroadcastFrequency: number // kHz
  healthyTemp: number             // °C
  targetTemp: number              // °C
  dutyCycle: number               // pulsed on-fraction [0-1]
  waveform: 'cw' | 'pulsed' | 'hfire'  // CW (wf=0.5), monopolar pulsed (wf=1.0), or H-FIRE bipolar (wf=1.0, thr×1.75)
  pulseWidthNs: number            // pulse width [ns]
  orientationDeg: number          // field-cell axis θ [0-90°]
  lysisNPulses: number            // above-threshold pulses before lysis
  chartMode: 'schwan' | 'resonance'
  doubleShellEnabled: boolean     // two-shell nuclear envelope model (Kotnik 2006)
  perfusionRate: number           // ω_b [mL/(g·min)]; 0 = in vitro
  cellPackingFraction: number     // φ [0-0.9]; Maxwell-Garnett σ_e correction
  sessionName: string             // user-editable experiment session label
  tempTimer: ReturnType<typeof setInterval> | null
  resetCounter: number
  healthyCellState: CellState
  targetCellState: CellState
}

export const useCellStore = defineStore('cell', {
  state: (): CellStoreState => ({
    healthy: cloneDeep(cellConfigs[0]) as CellConfig,
    target: cloneDeep(cellConfigs[1]) as CellConfig,
    medium: 'saline',
    fieldIntensity: 100,              // mammalian category default; overridden per-category in sanitizeCategoryParams()
    currentBroadcastFrequency: 417,
    healthyTemp: BODY_TEMP_C,
    targetTemp: BODY_TEMP_C,
    dutyCycle: 1e-4,               // 0.01%, typical pulsed electroporation default
    waveform: 'pulsed' as const,
    pulseWidthNs: 100_000,         // 100 µs, mammalian category default; gives ~10 s lysis delay at dc=1e-4
    orientationDeg: DEFAULT_ORIENTATION_DEG,  // 60° = <|cosΩ|>=0.5, correct mean for random suspension (see experimentDefaults)
    lysisNPulses: DEFAULT_LYSIS_N_PULSES,
    chartMode: 'schwan' as const,  // default: Schwan/IRE transmembrane potential model
    doubleShellEnabled: false,     // double-shell model off by default
    perfusionRate: 0,              // mL/(g·min); 0 = isolated cell / in-vitro default
    cellPackingFraction: 0,        // φ = 0 (isolated cell); set >0 for dense tissue context
    sessionName: 'Session 1',
    tempTimer: null,
    resetCounter: 0,
    healthyCellState: 'stable' as CellState,
    targetCellState:  'stable' as CellState,
  }),

  getters: {
    /** σ_e at reference temperature [S/m] - display only */
    sigma_e: (state): number => MEDIA[state.medium].conductivity,

    /** |cos θ| field-cell axis coupling [0-1]; cancels in Vm_T/Vm_H ratio */
    cosThetaFactor: (state): number => Math.abs(Math.cos(state.orientationDeg * Math.PI / 180)),

    /**
     * True when the acoustic resonance model is active (bacteria / virus targets).
     * Use this getter everywhere instead of comparing chartMode strings inline.
     */
    isResonanceMode: (state): boolean => state.chartMode === CHART_MODE.RESONANCE,

    /** σ_e corrected for temperature and cell packing fraction [S/m].
     *  σ_e(T) = σ_e0·(1+α·(T_mean−37)); Maxwell-Garnett: σ_eff = σ_T·(1−φ)/(1+φ/2). */
    effectiveSigmaE: (state): number => {
      const sigma_e0 = MEDIA[state.medium].conductivity
      const alpha    = MEDIA[state.medium].tempCoeff
      const T_mean   = (state.healthyTemp + state.targetTemp) / 2
      const sigma_T  = sigma_e0 * (1 + alpha * (T_mean - BODY_TEMP_C))
      const phi = Math.min(0.9, Math.max(0, state.cellPackingFraction))
      return sigma_T * (1 - phi) / (1 + phi / 2)
    },

    /** Lysis countdown [ms]: CW→LYSIS_DELAY_CW_MS; pulsed/H-FIRE→N_pulses × (t_p/dc), clamped. */
    lysisDelayMs: (state): number => {
      if ((state.waveform !== WAVEFORM.PULSED && state.waveform !== WAVEFORM.H_FIRE) || state.dutyCycle >= 1) return LYSIS_DELAY_CW_MS
      const pulsePeriodMs = (state.pulseWidthNs * NS_TO_MS) / state.dutyCycle
      return Math.max(LYSIS_DELAY_CW_MS, Math.min(LYSIS_DELAY_MAX_MS, state.lysisNPulses * pulsePeriodMs))
    },

    /** dc for thermal calc: CW→1.0, pulsed→stored value */
    effectiveDutyCycle: (state): number => state.waveform === WAVEFORM.CW ? 1.0 : state.dutyCycle,

    /** virus: R<0.1µm · bacteria: R<2µm · mammalian: R≥2µm */
    targetCellCategory: (state): 'mammalian' | 'bacteria' | 'virus' => {
      if (state.target.radius < THRESHOLDS.RADIUS_VIRUS_MAX)    return CELL_CATEGORY.VIRUS
      if (state.target.radius < THRESHOLDS.RADIUS_BACTERIA_MAX) return CELL_CATEGORY.BACTERIA
      return CELL_CATEGORY.MAMMALIAN
    },

    systemReady: (state): boolean =>
      state.healthyTemp < THRESHOLDS.TEMP_WARN && state.targetTemp < THRESHOLDS.TEMP_WARN,

    hasNuclearParams: (state): boolean =>
      !!state.healthy.nuclearRadius || !!state.target.nuclearRadius,

    /** Effective DEP force scale factor [0-1].
     * CW sinusoidal: time-averaged |E|² = E²_peak/2 → scale = 0.5
     * Pulsed bipolar (H-FIRE): force averages over duty cycle → scale = dutyCycle. */
    depForceScale: (state): number => state.waveform === WAVEFORM.CW ? 0.5 : state.dutyCycle,

    /** GHz + high-field hardware inaccessibility flag. See GHZ_FIELD_WARNING_V_CM and FREQ_NEARFIELD_RF_LIMIT_KHZ. */
    isGhzHighFieldWarning: (state): boolean =>
      state.currentBroadcastFrequency > FREQ_NEARFIELD_RF_LIMIT_KHZ &&
      state.fieldIntensity > GHZ_FIELD_WARNING_V_CM,

    /**
     * RF coupling regime based on the current operating frequency.
     * Electrolytic  (< 300 MHz): direct electrode contact, DC resistance model valid.
     * Near-field RF (300 MHz-1 GHz): coaxial RF probe required; DC model approximate.
     * Microwave     (> 1 GHz): waveguide / resonant cavity / horn antenna required.
     */
    freqRegime: (state): 'electrolytic' | 'nearfield_rf' | 'microwave' => {
      const f = state.currentBroadcastFrequency
      if (f < FREQ_ELECTROLYTIC_LIMIT_KHZ) return FREQ_REGIME.ELECTROLYTIC
      if (f < FREQ_NEARFIELD_RF_LIMIT_KHZ) return FREQ_REGIME.NEARFIELD_RF
      return FREQ_REGIME.MICROWAVE
    },

    /** Membrane charging fraction per pulse: 1−exp(−t_p/τ). CW → 1.0. */
    pulseEnvelopeFactorHealthy(): number {
      const state = this as unknown as CellStoreState
      if (state.waveform !== WAVEFORM.PULSED && state.waveform !== WAVEFORM.H_FIRE) return 1.0
      return pulseEnvelope(state.healthy, state.pulseWidthNs, this.effectiveSigmaE)
    },

    /** Same as pulseEnvelopeFactorHealthy; always 1.0 in resonance mode (acoustic coupling). */
    pulseEnvelopeFactorTarget(): number {
      const state = this as unknown as CellStoreState
      const isPulsed = state.waveform === WAVEFORM.PULSED || state.waveform === WAVEFORM.H_FIRE
      if (!isPulsed || this.isResonanceMode) return 1.0
      return pulseEnvelope(state.target, state.pulseWidthNs, this.effectiveSigmaE)
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

    /** DR_H = (Vm·pulseEnvelope) / (Vth_eff · hfireMult).
     *  Vth_eff is temperature-corrected: −0.3%/°C above 37°C (Weaver & Chizmadzhev 1996).
     *  H-FIRE multiplier (×1.75) raises the effective threshold for bipolar pulsed delivery. */
    healthyDisruptionRatio(): number {
      const state = this as unknown as CellStoreState
      const hfireMult = state.waveform === WAVEFORM.H_FIRE ? H_FIRE_THRESHOLD_MULTIPLIER : 1.0
      const vthEff = tempCorrectedVth(state.healthy.thresholdVoltage, state.healthyTemp)
      return (this.healthyVm * this.pulseEnvelopeFactorHealthy) / (vthEff * hfireMult)
    },

    /** DR_T: acoustic Lorentzian for bacteria/virus in resonance mode; (Vm·pulseEnvelope)/Vm_thr otherwise.
     *  chartMode must be RESONANCE to engage the acoustic model - in Schwan/IRE mode the
     *  transmembrane-voltage formula applies even for small cells, enabling nsEP simulation. */
    targetDisruptionRatio(): number {
      const state = this as unknown as CellStoreState
      const cat = this.targetCellCategory
      const t = state.target as CellConfig & { resonantFreqGHz?: number; capsidQ?: number; resonantThresholdVcm?: number }
      if (
        this.isResonanceMode &&
        (cat === CELL_CATEGORY.VIRUS || cat === CELL_CATEGORY.BACTERIA) &&
        t.resonantFreqGHz && t.resonantThresholdVcm
      ) {
        return computeResonantDisruption(
          t.resonantFreqGHz,
          t.capsidQ ?? DEFAULT_CAPSID_Q,
          t.resonantThresholdVcm,
          state.currentBroadcastFrequency * KHZ_TO_HZ,  // kHz → Hz
          state.fieldIntensity,
        )
      }
      const hfireMult = state.waveform === WAVEFORM.H_FIRE ? H_FIRE_THRESHOLD_MULTIPLIER : 1.0
      const vthEff = tempCorrectedVth(state.target.thresholdVoltage, state.targetTemp)
      return (this.targetVm * this.pulseEnvelopeFactorTarget) / (vthEff * hfireMult)
    },

    healthySAR(): number {
      const state = this as unknown as CellStoreState
      const wf = state.waveform === WAVEFORM.CW ? WF_CW : WF_PULSED
      return computeSAR(state.healthy, state.fieldIntensity, this.effectiveSigmaE, wf)
    },

    targetSAR(): number {
      const state = this as unknown as CellStoreState
      const wf = state.waveform === WAVEFORM.CW ? WF_CW : WF_PULSED
      return computeSAR(state.target, state.fieldIntensity, this.effectiveSigmaE, wf)
    },

    healthyFc(): number {
      return computeFc((this as unknown as CellStoreState).healthy, this.effectiveSigmaE)
    },

    targetFc(): number {
      return computeFc((this as unknown as CellStoreState).target, this.effectiveSigmaE)
    },

    /** Alias for therapeuticIndex - backward compat */
    selectivityRatio(): number {
      return this.therapeuticIndex
    },

    /** TI = DR_T / DR_H. Caps at TI_DISPLAY_CAP when healthy DR ≈ 0 (resonance selectivity). */
    therapeuticIndex(): number {
      return safeRatio(this.targetDisruptionRatio, this.healthyDisruptionRatio, THRESHOLDS.TI_DISPLAY_CAP, NEAR_ZERO_DR)
    },

    /** TI worst-case bounds from biological parameter uncertainty.
     *  Schwan/IRE mode: ±σ_i uncertainty - mammalian ±20%, bacteria ±35%, virus ±45%.
     *  Resonance mode: acoustic Q uncertainty - [Q_min, Q_max] from preset Lorentzian bounds. */
    tiUncertaintyRange(): { low: number; high: number } {
      const state = this as unknown as CellStoreState
      const nominal = this.therapeuticIndex
      if (this.isResonanceMode) {
        const cat = this.targetCellCategory
        const t = state.target as CellConfig & {
          resonantFreqGHz?: number; capsidQ?: number
          capsidQMin?: number; capsidQMax?: number; resonantThresholdVcm?: number
        }
        if (
          (cat === CELL_CATEGORY.VIRUS || cat === CELL_CATEGORY.BACTERIA) &&
          t.resonantFreqGHz && t.resonantThresholdVcm &&
          t.capsidQMin !== undefined && t.capsidQMax !== undefined
        ) {
          const hDr    = this.healthyDisruptionRatio
          const freqHz = state.currentBroadcastFrequency * KHZ_TO_HZ
          // Q_min → smaller Lorentzian peak → lower DR_T → lower TI (worst case)
          const drTMin = computeResonantDisruption(t.resonantFreqGHz, t.capsidQMin, t.resonantThresholdVcm, freqHz, state.fieldIntensity)
          // Q_max → taller Lorentzian peak → higher DR_T → higher TI (best case)
          const drTMax = computeResonantDisruption(t.resonantFreqGHz, t.capsidQMax, t.resonantThresholdVcm, freqHz, state.fieldIntensity)
          const tiFromDr = (dr: number) =>
            safeRatio(dr, hDr, THRESHOLDS.TI_DISPLAY_CAP, NEAR_ZERO_DR)
          return { low: tiFromDr(drTMin), high: tiFromDr(drTMax) }
        }
        return { low: nominal, high: nominal }
      }
      const sigma_e = this.effectiveSigmaE
      const field   = state.fieldIntensity
      const freq    = state.currentBroadcastFrequency
      const cosT    = this.cosThetaFactor
      const uncH    = uncertaintyFactor(state.healthy.radius)
      const uncT    = uncertaintyFactor(state.target.radius)
      // TI_low: weakest target + strongest healthy coupling
      const vmTLow  = computeSchwan({ ...state.target,  conductivity: state.target.conductivity  * (1 - uncT) }, freq, field, sigma_e, cosT)
      const vmHHigh = computeSchwan({ ...state.healthy, conductivity: state.healthy.conductivity * (1 + uncH) }, freq, field, sigma_e, cosT)
      const pefT    = this.pulseEnvelopeFactorTarget
      const pefH    = this.pulseEnvelopeFactorHealthy
      const drTLow  = (vmTLow  * pefT) / state.target.thresholdVoltage
      const drHHigh = (vmHHigh * pefH) / state.healthy.thresholdVoltage
      const tiLow   = Math.max(0, safeRatio(drTLow, drHHigh, THRESHOLDS.TI_DISPLAY_CAP, NEAR_ZERO_DR))
      // TI_high: strongest target + weakest healthy coupling
      const vmTHigh = computeSchwan({ ...state.target,  conductivity: state.target.conductivity  * (1 + uncT) }, freq, field, sigma_e, cosT)
      const vmHLow  = computeSchwan({ ...state.healthy, conductivity: state.healthy.conductivity * (1 - uncH) }, freq, field, sigma_e, cosT)
      const drTHigh = (vmTHigh * pefT) / state.target.thresholdVoltage
      const drHLow  = (vmHLow  * pefH) / state.healthy.thresholdVoltage
      const tiHigh  = safeRatio(drTHigh, drHLow, THRESHOLDS.TI_DISPLAY_CAP, NEAR_ZERO_DR)
      return { low: tiLow, high: tiHigh }
    },

    /** Nuclear Vm for healthy cell [V] - Kotnik 2006 bandpass. 0 if no nuclear params. */
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
      const vth = state.healthy.nuclearThresholdVoltage ?? THRESHOLDS.NUCLEAR_VM_DEFAULT
      return this.healthyNuclearVm / vth
    },

    /** Nuclear disruption ratio for target cell: Vm_nuc / nuclear threshold voltage. */
    targetNuclearDisruptionRatio(): number {
      const state = this as unknown as CellStoreState
      const vth = state.target.nuclearThresholdVoltage ?? THRESHOLDS.NUCLEAR_VM_DEFAULT
      return this.targetNuclearVm / vth
    },

    /**
     * Nuclear selectivity ratio: target nuclear disruption / healthy nuclear disruption.
     * Caps at TI_DISPLAY_CAP when healthy nuclear disruption is negligible.
     */
    nuclearSelectivityRatio(): number {
      return safeRatio(this.targetNuclearDisruptionRatio, this.healthyNuclearDisruptionRatio, THRESHOLDS.TI_DISPLAY_CAP, NEAR_ZERO_DR)
    },

    /** E_lysis for target [V/cm]: Vm_thr·√(1+(ωτ)²)/(1.5·R·cosθ·pef). Returns 1e6 near θ=90°. */
    targetLysisField(): number {
      const state = this as unknown as CellStoreState
      return lysisField(state.target, state.currentBroadcastFrequency, this.effectiveSigmaE, this.cosThetaFactor, this.pulseEnvelopeFactorTarget)
    },

    /** E_lysis for healthy cell [V/cm] - same formula as targetLysisField. */
    healthyLysisField(): number {
      const state = this as unknown as CellStoreState
      return lysisField(state.healthy, state.currentBroadcastFrequency, this.effectiveSigmaE, this.cosThetaFactor, this.pulseEnvelopeFactorHealthy)
    },

    /** T_ss = BODY_TEMP_C + SAR·dc / (λ_eff·cp)  [°C].  λ_eff = λ_Newton + ω_b·PENNES_BLOOD_COEFF/cp. */
    healthySteadyStateTemp(): number {
      const state = this as unknown as CellStoreState
      const sar_eff = this.healthySAR * this.effectiveDutyCycle
      const cp = state.healthy.specificHeatCapacity
      const lambda_perf = state.perfusionRate * PENNES_BLOOD_COEFF / cp
      return Math.min(BODY_TEMP_C + sar_eff / ((NEWTON_COOLING_LAMBDA + lambda_perf) * cp), THRESHOLDS.TEMP_CAP)
    },

    /** Projected steady-state temperature for target cell [°C], capped at THRESHOLDS.TEMP_CAP. */
    targetSteadyStateTemp(): number {
      const state = this as unknown as CellStoreState
      const sar_eff = this.targetSAR * this.effectiveDutyCycle
      const cp = state.target.specificHeatCapacity
      const lambda_perf = state.perfusionRate * PENNES_BLOOD_COEFF / cp
      return Math.min(BODY_TEMP_C + sar_eff / ((NEWTON_COOLING_LAMBDA + lambda_perf) * cp), THRESHOLDS.TEMP_CAP)
    },

    /**
     * Per-pulse energy density delivered to the medium [mJ/cm³] (= J/mL).
     * Computed as: σ_e × E²_peak × t_p × dc  [W/m³ × s → J/m³ → mJ/cm³]
     * J/m³ = W/m³ × s;  1 J/m³ = 1e-3 mJ/cm³ (1 mL = 1 cm³ = 1e-6 m³; so 1 J/m³ = 1e-3 mJ/mL)
     * This is the standard protocol dose unit published in IRE literature.
     * Ref: Davalos et al. (2005) Ann. Biomed. Eng.; Edd et al. (2006) Technol. Cancer Res. Treat.
     * CW: t_p = 1 s (per second), dc = 1. Pulsed: t_p = pulseWidthNs × NS_TO_S, dc = dutyCycle.
     */
    pulsedEnergyDensity_mJcm3(): number {
      const state = this as unknown as CellStoreState
      const E_si  = state.fieldIntensity * V_CM_TO_V_M
      const tp_s  = state.waveform === WAVEFORM.CW ? 1.0 : state.pulseWidthNs * NS_TO_S
      const dc    = state.waveform === WAVEFORM.CW ? 1.0 : state.dutyCycle
      // P_volume = σ_e × E² [W/m³]; dose per pulse × dc period = energy density [J/m³]
      const energyDensity_J_m3 = this.effectiveSigmaE * E_si ** 2 * tp_s * dc
      return energyDensity_J_m3 * J_M3_TO_MJ_CM3
    },

    /**
     * Joule heating SAR of the extracellular medium [W/kg].
     * P_medium = σ_e × E²_rms / ρ_aqueous.  This is what a thermocouple in the cuvette reads —
     * it dominates at low cell packing fractions (φ < 0.1) because there is far more medium
     * than cell volume. Ref: Foster and Schwan (1989); standard Joule heating formula.
     */
    mediumJouleHeatingSAR(): number {
      const state = this as unknown as CellStoreState
      const wf   = state.waveform === WAVEFORM.CW ? WF_CW : WF_PULSED
      const E_si = state.fieldIntensity * V_CM_TO_V_M
      return (this.effectiveSigmaE * E_si ** 2 * wf) / RHO_AQUEOUS_KG_M3
    },

    /** δ = √(1/(π·f·μ₀·σ_e)) [mm].  Saline: 100MHz→41mm · 1GHz→13mm · 12GHz→3.8mm. */
    skinDepthMm(): number {
      const state = this as unknown as CellStoreState
      return computeSkinDepthMm(state.currentBroadcastFrequency, this.effectiveSigmaE)
    },

    // ── Dielectrophoresis - Clausius-Mossotti factor ────────────────────────────

    /**
     * Re[K(f)] for healthy cell - Clausius-Mossotti DEP factor (single-shell model).
     * Uses medium-specific permittivity (Gabriel et al. 1996) and temperature-corrected σ_e.
     * Re[K] > 0 = positive DEP (attracted to field maxima); Re[K] < 0 = negative DEP.
     */
    depHealthyCmReal(): number {
      const state = this as unknown as CellStoreState
      const eps_r = MEDIA[state.medium].permittivity
      return computeDepCmReal(state.healthy, state.currentBroadcastFrequency, this.effectiveSigmaE, eps_r)
    },

    /** Re[K(f)] for target cell - Clausius-Mossotti DEP factor (single-shell model). */
    depTargetCmReal(): number {
      const state = this as unknown as CellStoreState
      const eps_r = MEDIA[state.medium].permittivity
      return computeDepCmReal(state.target, state.currentBroadcastFrequency, this.effectiveSigmaE, eps_r)
    },

    /** First crossover frequency [kHz] where Re[K_H] = 0. 0 if none in 1 kHz-10 GHz. */
    depHealthyCrossoverKHz(): number {
      const state = this as unknown as CellStoreState
      const eps_r = MEDIA[state.medium].permittivity
      return computeDepCrossoverKHz(state.healthy, this.effectiveSigmaE, eps_r)
    },

    /** First crossover frequency [kHz] where Re[K_T] = 0. 0 if none in 1 kHz-10 GHz. */
    depTargetCrossoverKHz(): number {
      const state = this as unknown as CellStoreState
      const eps_r = MEDIA[state.medium].permittivity
      return computeDepCrossoverKHz(state.target, this.effectiveSigmaE, eps_r)
    },

    /** Second DEP crossover [kHz] for healthy cell - Re[K_H] sign change above f_cross1.
     *  Occurs when high-frequency dielectric relaxation re-inverts the K polarity.
     *  Returns 0 if no second crossing found. Pethig (2010) Fig. 3. */
    depHealthySecondCrossoverKHz(): number {
      const state = this as unknown as CellStoreState
      const eps_r = MEDIA[state.medium].permittivity
      return computeDepSecondCrossoverKHz(state.healthy, this.effectiveSigmaE, eps_r)
    },

    /** Second DEP crossover [kHz] for target cell - Re[K_T] sign change above f_cross1.
     *  Returns 0 if no second crossing found. Pethig (2010) Fig. 3. */
    depTargetSecondCrossoverKHz(): number {
      const state = this as unknown as CellStoreState
      const eps_r = MEDIA[state.medium].permittivity
      return computeDepSecondCrossoverKHz(state.target, this.effectiveSigmaE, eps_r)
    },

    // ── Reversible EP resealing time estimate ────────────────────────────────

    /**
     * Estimated membrane resealing time [s] for the target cell after pulsed rev-EP.
     * Model: τ_reseal = τ_ref × (DR/DR_ref)^n_DR × exp(−k_T·(T−37)) × n_p^n_pulse
     * Valid only in the rev-EP window (DR 50–85%); returns 0 outside.
     * Fast-resealing component (~80% of pores, Rols & Teissie 1990).
     * Clamped to [RESEAL_TIME_MIN_S, RESEAL_TIME_MAX_S].
     */
    targetResealingTimeS(): number {
      const state = this as unknown as CellStoreState
      const dr = this.targetDisruptionRatio
      if (dr < THRESHOLDS.HEALTHY_APPROACHING || dr >= THRESHOLDS.DISRUPTION_WARN) return 0
      const tempC  = state.targetTemp
      const nPulses = state.waveform === WAVEFORM.CW ? 1 : Math.max(1, state.lysisNPulses)
      const drTerm    = Math.pow(Math.min(1, dr) / RESEAL_DR_REF, RESEAL_DR_EXPONENT)
      const tempTerm  = Math.exp(-RESEAL_TEMP_COEFF * Math.max(0, tempC - BODY_TEMP_C))
      const pulseTerm = Math.pow(nPulses, RESEAL_PULSE_EXPONENT)
      const raw = RESEAL_TIME_REF_S * drTerm * tempTerm * pulseTerm
      return Math.max(RESEAL_TIME_MIN_S, Math.min(RESEAL_TIME_MAX_S, raw))
    },

    // ── Sub-threshold healthy-cell biomodulation ──────────────────────────────

    /** SI = 4·r·(1−r), r = DR/NOURISHING.  Bell peaking at DR≈22.5%; zero above NOURISHING threshold. */
    healthyStimIndex(): number {
      const r = Math.min(1, this.healthyDisruptionRatio / THRESHOLDS.NOURISHING)
      return Math.max(0, 4 * r * (1 - r))
    },

    /** MTE = 1/√(1+(f/fc)²) - Schwan roll-off; peaks at f≪fc. */
    healthyMechTransductionEff(): number {
      const f  = (this as unknown as CellStoreState).currentBroadcastFrequency  // kHz
      const fc = this.healthyFc                                                  // kHz
      return 1 / Math.sqrt(1 + (f / fc) ** 2)
    },

    /** MA: piecewise bell BODY_TEMP-TEMP_WARN. 0 below BODY_TEMP or above TEMP_WARN; peak at THERMAL_MA_PEAK. */
    healthyMildThermalActivation(): number {
      const T = this.healthySteadyStateTemp
      if (T <= BODY_TEMP_C) return 0
      if (T <= THERMAL_MA_PEAK_C) return (T - BODY_TEMP_C) / (THERMAL_MA_PEAK_C - BODY_TEMP_C)
      if (T <= THRESHOLDS.TEMP_WARN) return (THRESHOLDS.TEMP_WARN - T) / (THRESHOLDS.TEMP_WARN - THERMAL_MA_PEAK_C)
      return 0
    },

    /** Optimal frequency for max TI.
     *  Resonance mode + bacteria/virus → snap to f_res (Lorentzian peak).
     *  Schwan/IRE mode or mammalian → 300-point log scan 10 kHz-500 MHz for best DR_T/DR_H. */
    optimalFreqResult(): { khz: number; sel: number } {
      const state  = this as unknown as CellStoreState
      const target = state.target as CellConfig & { resonantFreqGHz?: number; resonantThresholdVcm?: number }
      const cat    = this.targetCellCategory
      if (
        this.isResonanceMode &&
        (cat === CELL_CATEGORY.VIRUS || cat === CELL_CATEGORY.BACTERIA) &&
        target.resonantFreqGHz && target.resonantThresholdVcm
      ) {
        return { khz: target.resonantFreqGHz * 1e6, sel: THRESHOLDS.TI_DISPLAY_CAP }
      }
      const sigma_e = this.effectiveSigmaE
      const field   = state.fieldIntensity
      const hThr    = state.healthy.thresholdVoltage
      const tThr    = state.target.thresholdVoltage
      // PEF is frequency-independent (depends on τ, not f), so it scales the DR for each cell
      // uniformly across the scan - it doesn't shift the argmax but DOES change the TI magnitude.
      // Include PEF so the returned `sel` matches what the disruption ratio getters compute.
      const pefH    = this.pulseEnvelopeFactorHealthy
      const pefT    = this.pulseEnvelopeFactorTarget
      const logMin  = Math.log10(10), logMax = Math.log10(500_000)
      const { khz: optKhz, sel: maxSel } = Array.from({ length: 300 }, (_, i) => {
        const khz = Math.pow(10, logMin + (logMax - logMin) * i / 299)
        const hDr = (computeSchwan(state.healthy, khz, field, sigma_e) * pefH) / hThr
        const tDr = (computeSchwan(state.target,  khz, field, sigma_e) * pefT) / tThr
        return { khz, sel: hDr > 0 ? tDr / hDr : 0 }
      }).reduce((best, pt) => pt.sel > best.sel ? pt : best, { khz: 10, sel: -Infinity })
      return { khz: optKhz, sel: Math.max(0, maxSel) }
    },

    /** BMS = BMS_WEIGHT_SI·SI + BMS_WEIGHT_MTE·MTE + BMS_WEIGHT_MA·MA - research indicator, not a clinical index. */
    healthyBiomodScore(): number {
      return (
        THRESHOLDS.BMS_WEIGHT_SI  * this.healthyStimIndex +
        THRESHOLDS.BMS_WEIGHT_MTE * this.healthyMechTransductionEff +
        THRESHOLDS.BMS_WEIGHT_MA  * this.healthyMildThermalActivation
      )
    },

    /**
     * Electrode polarization risk flag.
     * Below ELECTRODE_POLARIZATION_LIMIT_KHZ, the electrode double-layer capacitance
     * (Cdl ~10-50 µF/cm²) absorbs a significant fraction of the applied voltage.
     * Displayed Vm and DR are overestimates without a Cdl-corrected equivalent circuit.
     * Only flagged in Schwan/IRE mode — resonance mode targets GHz, not sub-50 kHz.
     * Ref: Foster and Schwan (1989); Schwan (1966) electrode polarization review.
     */
    isElectrodePolarizationRisk(): boolean {
      const state = this as unknown as CellStoreState
      return !this.isResonanceMode && state.currentBroadcastFrequency < ELECTRODE_POLARIZATION_LIMIT_KHZ
    },

    /**
     * Fraction of randomly-oriented target cells that exceed the lysis threshold
     * under the current field and frequency [0-1].
     *
     * For a 3D isotropic orientation distribution the Vm at angle θ is
     *   Vm(θ) = Vm_max · |cos θ|
     * so the fraction exceeding V_th is P(|cos θ| > 1/DR) = max(0, 1 − 1/DR).
     *
     * Note: DR here is the field-aligned (cosθ = 1) disruption ratio.
     * At DR = 1 only the perfectly-aligned cell reaches threshold (0% lysis).
     * At DR = 2 exactly half the random population exceeds threshold (50% lysis).
     */
    targetLysisProbabilityRandom(): number {
      const dr = this.targetDisruptionRatio
      if (dr <= 0) return 0
      return Math.max(0, Math.min(1, 1 - 1 / dr))
    },

    /** Same as targetLysisProbabilityRandom but for the healthy reference cell. */
    healthyLysisProbabilityRandom(): number {
      const dr = this.healthyDisruptionRatio
      if (dr <= 0) return 0
      return Math.max(0, Math.min(1, 1 - 1 / dr))
    },

    // ── Population size distribution model ────────────────────────────────────

    /** CV to use for target cell size distribution — log-normal model (Tzur 2009). */
    targetPopulationSizeCV(): number {
      const cat = this.targetCellCategory
      if (cat === CELL_CATEGORY.VIRUS)     return POP_CV_VIRUS
      if (cat === CELL_CATEGORY.BACTERIA)  return POP_CV_BACTERIA
      return POP_CV_MAMMALIAN
    },

    /** CV to use for healthy cell size distribution — always mammalian default. */
    healthyPopulationSizeCV(): number { return POP_CV_MAMMALIAN },

    /**
     * Population-average lysis fraction for target cells integrating log-normal size
     * distribution with cosθ orientation model.
     * More accurate than targetLysisProbabilityRandom for heterogeneous cell suspensions.
     */
    targetPopulationLysisFraction(): number {
      return computePopulationLysisFraction(this.targetDisruptionRatio, this.targetPopulationSizeCV)
    },

    /** Population-average lysis fraction for healthy cells with size distribution. */
    healthyPopulationLysisFraction(): number {
      return computePopulationLysisFraction(this.healthyDisruptionRatio, this.healthyPopulationSizeCV)
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

    setHealthyCellState(s: CellState) { this.healthyCellState = s },
    setTargetCellState(s: CellState)  { this.targetCellState  = s },

    handleResonancePacket(packet: FieldPacket) {
      this.currentBroadcastFrequency = packet.activeFrequencyKHz
      this.fieldIntensity = packet.activeFieldIntensityVcm
      if (packet.activeMedium in MEDIA) {
        this.medium = packet.activeMedium as MediumKey
      }
    },

    handleStatePacket(packet: StatePacket) {
      this.currentBroadcastFrequency = packet.freqKHz
      this.fieldIntensity            = packet.fieldVcm
      if (packet.medium in MEDIA) this.medium = packet.medium as MediumKey
      this.dutyCycle           = packet.dutyCycle
      this.pulseWidthNs        = packet.pulseWidthNs
      this.waveform            = packet.waveform
      this.orientationDeg      = packet.orientationDeg
      this.lysisNPulses        = packet.lysisNPulses
      this.chartMode           = packet.chartMode
      this.doubleShellEnabled  = packet.doubleShellEnabled
      this.perfusionRate       = packet.perfusionRate
      this.cellPackingFraction = packet.cellPackingFraction
      this.loadPresetIfNeeded('target',  packet.targetPresetId)
      this.loadPresetIfNeeded('healthy', packet.healthyPresetId)
    },

    loadPresetIfNeeded(cellType: 'healthy' | 'target', presetId: string) {
      if (!presetId || presetId === this[cellType].id) return
      const preset = CELL_PRESETS.find(c => c.id === presetId)
      if (!preset) return
      const cfg = cloneDeep(preset) as CellConfig
      if (!cfg.description && preset.notes) cfg.description = preset.notes
      this[cellType] = cfg
      if (cellType === 'target') this.targetTemp = BODY_TEMP_C
      else this.healthyTemp = BODY_TEMP_C
      this.resetCounter++
    },

    updateCellParam(cellType: 'healthy' | 'target', key: string, value: number) {
      ;(this[cellType] as unknown as Record<string, number>)[key] = value
    },

    startSession() {
      if (this.tempTimer !== null) return
      // dt_s must stay in sync with TEMP_UPDATE_INTERVAL_MS — the Euler integration step equals the timer period
      const dt_s = TEMP_UPDATE_INTERVAL_MS * MS_TO_S
      this.tempTimer = setInterval(() => {
        const dc  = this.effectiveDutyCycle
        const hCp = this.healthy.specificHeatCapacity
        const hL  = NEWTON_COOLING_LAMBDA + this.perfusionRate * PENNES_BLOOD_COEFF / hCp
        const dTh = (this.healthySAR * dc / hCp - hL * (this.healthyTemp - BODY_TEMP_C)) * dt_s
        this.healthyTemp = Math.max(BODY_TEMP_C, Math.min(THRESHOLDS.TEMP_CAP, this.healthyTemp + dTh))
        const tCp = this.target.specificHeatCapacity
        const tL  = NEWTON_COOLING_LAMBDA + this.perfusionRate * PENNES_BLOOD_COEFF / tCp
        const dTt = (this.targetSAR * dc / tCp - tL * (this.targetTemp - BODY_TEMP_C)) * dt_s
        this.targetTemp = Math.max(BODY_TEMP_C, Math.min(THRESHOLDS.TEMP_CAP, this.targetTemp + dTt))
      }, TEMP_UPDATE_INTERVAL_MS)
    },

    setDutyCycle(dc: number) {
      this.dutyCycle = Math.max(1e-6, Math.min(1, dc))
    },

    setPulseWidthNs(ns: number) {
      this.pulseWidthNs = Math.max(1, Math.min(100_000, ns))
    },

    setWaveform(mode: 'cw' | 'pulsed' | 'hfire') {
      this.waveform = mode
    },

    stopSession() {
      if (this.tempTimer !== null) {
        clearInterval(this.tempTimer)
        this.tempTimer = null
      }
    },

    resetCell(cellType: 'healthy' | 'target') {
      const defaultCfg = cellType === CELL_TYPE.HEALTHY ? cellConfigs[0] : cellConfigs[1]
      this[cellType] = cloneDeep(defaultCfg) as CellConfig
      if (cellType === CELL_TYPE.HEALTHY) this.healthyTemp = BODY_TEMP_C
      else this.targetTemp = BODY_TEMP_C
      this.resetCounter++
    },

    loadPreset(cellType: 'healthy' | 'target', preset: CellConfig) {
      const cfg = cloneDeep(preset) as CellConfig
      // Carry notes over to description if the preset supplies notes but not description
      const p = preset as CellConfig & { notes?: string }
      if (!cfg.description && p.notes) cfg.description = p.notes
      this[cellType] = cfg
      this.healthyTemp = BODY_TEMP_C
      this.targetTemp = BODY_TEMP_C
      this.resetCounter++  // signals CellCard to reset visual state
    },

    resetTemps() {
      this.healthyTemp = BODY_TEMP_C
      this.targetTemp = BODY_TEMP_C
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

  persist: {
    key: 'br-cell-store',
    // Only persist: which cells the researcher is studying, and the physical model
    // assumptions about the experimental setup. Everything else (field, frequency,
    // waveform, duty cycle, pulse width, chart mode, etc.) is re-derived from the
    // target cell category on mount — persisting it causes stale cross-session bugs
    // and means a researcher returns to a "lysed" experiment state after a refresh.
    // chartMode is intentionally excluded: sanitizeCategoryParams() always derives
    // the correct mode from the loaded target cell category.
    pick: [
      'healthy',
      'target',
      'doubleShellEnabled',
      'perfusionRate',
      'cellPackingFraction',
    ],
  },
})
