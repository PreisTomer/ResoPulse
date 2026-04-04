// Copyright © 2026 Tomer Preis. All rights reserved.
// Unauthorized copying or distribution is prohibited.

import { defineStore } from 'pinia'

import { cloneDeep } from 'lodash'

import { computeSchwan, computeSAR, computeFc, computeTau, computeNuclearTau, computeResonantDisruption, computeNuclearVm, computePulseStepResponse, computeSkinDepthMm, computeDepCmReal, computeDepCrossoverKHz, computeDepSecondCrossoverKHz, computePopulationLysisFraction, safeRatio, tempCorrectedVth } from '@/utils/physics'

import { cellConfigs } from '@/constants/defaultCells'
import { CELL_PRESETS } from '@/constants/cellLibrary'
import { MEDIA } from '@/constants/media'
import { SLIDER_RANGES, type SliderRange } from '@/constants/sliderBounds'
import { CELL_CATEGORY, CELL_STATE, CHART_MODE, WAVEFORM, CELL_TYPE, FREQ_REGIME, DEFAULT_SESSION_NAME } from '@/constants/strings'
import { DEFAULT_LYSIS_N_PULSES, DEFAULT_ORIENTATION_DEG } from '@/constants/experimentDefaults'
import { MEDIUM_SPECIFIC_HEAT_J_KG_K } from '@/constants/cuvette'
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
  LYSIS_FIELD_SENTINEL,
  MIN_PULSE_ENVELOPE,
  NEAR_ZERO_DR,
  FREQ_ELECTROLYTIC_LIMIT_KHZ,
  FREQ_NEARFIELD_RF_LIMIT_KHZ,
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

import type { CellConfig, CellState } from '@/types/cell'
import type { MediumKey } from '@/types/media'

// ── Module-level computation helpers (pure functions - no store context needed) ──

// Pulse envelope: 1.0 for CW; 1−exp(−t_p/τ) for pulsed
function pulseEnvelope(cell: CellConfig, pulseWidthNs: number, sigma_e: number): number {
  return computePulseStepResponse(computeTau(cell, sigma_e), pulseWidthNs)
}

// Lysis field [V/cm]: Vth_eff·hfireMult·√(1+(ωτ)²)/(1.5·R·cosθ·100·pef). Returns SENTINEL near θ=90°.
// tempC applies the same threshold reduction as disruptionRatio, keeping E_lys consistent with DR=1.
function lysisField(
  cell: CellConfig,
  freqKHz: number,
  sigma_e: number,
  cosTheta: number,
  pef: number,
  hfireMult: number,
  tempC: number,
): number {
  if (cosTheta < MIN_COS_THETA) return LYSIS_FIELD_SENTINEL
  const omega   = TWO_PI * freqKHz * 1e3
  const tau     = computeTau(cell, sigma_e)
  const vthEff  = tempCorrectedVth(cell.thresholdVoltage, tempC)
  return (vthEff * hfireMult * Math.sqrt(1 + (omega * tau) ** 2)) /
    (SCHWAN_SPHERE_FACTOR * cell.radius * 1e-6 * cosTheta * V_CM_TO_V_M * Math.max(MIN_PULSE_ENVELOPE, pef))
}

// σ_i uncertainty: virus 45%, bacteria 35%, mammalian 20%
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
    sessionName: DEFAULT_SESSION_NAME,
    tempTimer: null,
    resetCounter: 0,
    healthyCellState: 'stable' as CellState,
    targetCellState:  'stable' as CellState,
  }),

  getters: {
    sigma_e: (state): number => MEDIA[state.medium].conductivity,
    cosThetaFactor: (state): number => Math.abs(Math.cos(state.orientationDeg * Math.PI / 180)),
    isResonanceMode: (state): boolean => state.chartMode === CHART_MODE.RESONANCE,

    // σ_eff = σ_T·(1−φ)/(1+φ/2) — temperature + Maxwell-Garnett cell packing correction. Foster 1989.
    effectiveSigmaE: (state): number => {
      const sigma_e0 = MEDIA[state.medium].conductivity
      const alpha    = MEDIA[state.medium].tempCoeff
      const T_mean   = (state.healthyTemp + state.targetTemp) / 2
      const sigma_T  = sigma_e0 * (1 + alpha * (T_mean - BODY_TEMP_C))
      const phi = Math.min(0.9, Math.max(0, state.cellPackingFraction))
      return sigma_T * (1 - phi) / (1 + phi / 2)
    },

    lysisDelayMs: (state): number => {
      if ((state.waveform !== WAVEFORM.PULSED && state.waveform !== WAVEFORM.H_FIRE) || state.dutyCycle >= 1) return LYSIS_DELAY_CW_MS
      const pulsePeriodMs = (state.pulseWidthNs * NS_TO_MS) / state.dutyCycle
      return Math.max(LYSIS_DELAY_CW_MS, Math.min(LYSIS_DELAY_MAX_MS, state.lysisNPulses * pulsePeriodMs))
    },

    effectiveDutyCycle: (state): number => state.waveform === WAVEFORM.CW ? 1.0 : state.dutyCycle,

    // virus: R<0.1µm, bacteria: R<2µm, mammalian: R>=2µm
    targetCellCategory: (state): 'mammalian' | 'bacteria' | 'virus' => {
      if (state.target.radius < THRESHOLDS.RADIUS_VIRUS_MAX)    return CELL_CATEGORY.VIRUS
      if (state.target.radius < THRESHOLDS.RADIUS_BACTERIA_MAX) return CELL_CATEGORY.BACTERIA
      return CELL_CATEGORY.MAMMALIAN
    },

    systemReady: (state): boolean =>
      state.healthyTemp < THRESHOLDS.TEMP_WARN && state.targetTemp < THRESHOLDS.TEMP_WARN,

    hasNuclearParams: (state): boolean =>
      !!state.healthy.nuclearRadius || !!state.target.nuclearRadius,

    // DEP scale: CW→0.5 (time-avg |E|²=E²/2); pulsed/H-FIRE→dutyCycle
    depForceScale: (state): number => state.waveform === WAVEFORM.CW ? 0.5 : state.dutyCycle,
    isGhzHighFieldWarning: (state): boolean =>
      state.currentBroadcastFrequency > FREQ_NEARFIELD_RF_LIMIT_KHZ &&
      state.fieldIntensity > GHZ_FIELD_WARNING_V_CM,

    freqRegime: (state): 'electrolytic' | 'nearfield_rf' | 'microwave' => {
      const f = state.currentBroadcastFrequency
      if (f < FREQ_ELECTROLYTIC_LIMIT_KHZ) return FREQ_REGIME.ELECTROLYTIC
      if (f < FREQ_NEARFIELD_RF_LIMIT_KHZ) return FREQ_REGIME.NEARFIELD_RF
      return FREQ_REGIME.MICROWAVE
    },

    pulseEnvelopeFactorHealthy(): number {
      const state = this as CellStoreState
      if (state.waveform !== WAVEFORM.PULSED && state.waveform !== WAVEFORM.H_FIRE) return 1.0
      return pulseEnvelope(state.healthy, state.pulseWidthNs, this.effectiveSigmaE)
    },

    pulseEnvelopeFactorTarget(): number {
      const state = this as CellStoreState
      const isPulsed = state.waveform === WAVEFORM.PULSED || state.waveform === WAVEFORM.H_FIRE
      if (!isPulsed || this.isResonanceMode) return 1.0
      return pulseEnvelope(state.target, state.pulseWidthNs, this.effectiveSigmaE)
    },

    healthyVm(): number {
      const state = this as CellStoreState
      const sigma_e = this.effectiveSigmaE
      const cosT = this.cosThetaFactor
      return computeSchwan(state.healthy, state.currentBroadcastFrequency, state.fieldIntensity, sigma_e, cosT)
    },

    targetVm(): number {
      const state = this as CellStoreState
      const sigma_e = this.effectiveSigmaE
      const cosT = this.cosThetaFactor
      return computeSchwan(state.target, state.currentBroadcastFrequency, state.fieldIntensity, sigma_e, cosT)
    },

    healthyDisruptionRatio(): number {
      const state = this as CellStoreState
      const hfireMult = state.waveform === WAVEFORM.H_FIRE ? H_FIRE_THRESHOLD_MULTIPLIER : 1.0
      const vthEff = tempCorrectedVth(state.healthy.thresholdVoltage, state.healthyTemp)
      return (this.healthyVm * this.pulseEnvelopeFactorHealthy) / (vthEff * hfireMult)
    },

    targetDisruptionRatio(): number {
      const state = this as CellStoreState
      const cat = this.targetCellCategory
      const t = state.target as CellConfig & { resonantFreqGHz?: number; capsidQ?: number; resonantThresholdVcm?: number }
      const hfireMult = state.waveform === WAVEFORM.H_FIRE ? H_FIRE_THRESHOLD_MULTIPLIER : 1.0
      if (
        this.isResonanceMode &&
        (cat === CELL_CATEGORY.VIRUS || cat === CELL_CATEGORY.BACTERIA) &&
        t.resonantFreqGHz && t.resonantThresholdVcm
      ) {
        // H-FIRE bipolar charge cancellation is an EP membrane-charging mechanism only.
        // Acoustic resonance disruption is mechanical — hfireMult does NOT apply here.
        const effThreshold = tempCorrectedVth(t.resonantThresholdVcm, state.targetTemp)
        return computeResonantDisruption(
          t.resonantFreqGHz,
          t.capsidQ ?? DEFAULT_CAPSID_Q,
          effThreshold,
          state.currentBroadcastFrequency * KHZ_TO_HZ,  // kHz → Hz
          state.fieldIntensity,
        )
      }
      const vthEff = tempCorrectedVth(state.target.thresholdVoltage, state.targetTemp)
      return (this.targetVm * this.pulseEnvelopeFactorTarget) / (vthEff * hfireMult)
    },

    healthySAR(): number {
      const state = this as CellStoreState
      const wf = state.waveform === WAVEFORM.CW ? WF_CW : WF_PULSED
      return computeSAR(state.healthy, state.fieldIntensity, this.effectiveSigmaE, wf)
    },

    targetSAR(): number {
      const state = this as CellStoreState
      const wf = state.waveform === WAVEFORM.CW ? WF_CW : WF_PULSED
      return computeSAR(state.target, state.fieldIntensity, this.effectiveSigmaE, wf)
    },

    healthyFc(): number {
      return computeFc((this as CellStoreState).healthy, this.effectiveSigmaE)
    },

    targetFc(): number {
      return computeFc((this as CellStoreState).target, this.effectiveSigmaE)
    },

    selectivityRatio(): number {
      return this.therapeuticIndex
    },

    therapeuticIndex(): number {
      return safeRatio(this.targetDisruptionRatio, this.healthyDisruptionRatio, THRESHOLDS.TI_DISPLAY_CAP, NEAR_ZERO_DR)
    },

    // TI bounds from σ_i uncertainty (mammalian ±20%, bacteria ±35%, virus ±45%) or Q_min/Q_max in resonance mode
    tiUncertaintyRange(): { low: number; high: number } {
      const state = this as CellStoreState
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
          // Acoustic resonance threshold: temperature correction only — hfireMult does not apply
          const effThr    = tempCorrectedVth(t.resonantThresholdVcm, state.targetTemp)
          const hDr    = this.healthyDisruptionRatio
          const freqHz = state.currentBroadcastFrequency * KHZ_TO_HZ
          // Q_min → smaller Lorentzian peak → lower DR_T → lower TI (worst case)
          const drTMin = computeResonantDisruption(t.resonantFreqGHz, t.capsidQMin, effThr, freqHz, state.fieldIntensity)
          // Q_max → taller Lorentzian peak → higher DR_T → higher TI (best case)
          const drTMax = computeResonantDisruption(t.resonantFreqGHz, t.capsidQMax, effThr, freqHz, state.fieldIntensity)
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
      // Apply same temperature correction + H-FIRE multiplier as the live DR getters
      const hfireMult = state.waveform === WAVEFORM.H_FIRE ? H_FIRE_THRESHOLD_MULTIPLIER : 1.0
      const vthT = tempCorrectedVth(state.target.thresholdVoltage, state.targetTemp)
      const vthH = tempCorrectedVth(state.healthy.thresholdVoltage, state.healthyTemp)
      const drTLow  = (vmTLow  * pefT) / (vthT * hfireMult)
      const drHHigh = (vmHHigh * pefH) / (vthH * hfireMult)
      const tiLow   = Math.max(0, safeRatio(drTLow, drHHigh, THRESHOLDS.TI_DISPLAY_CAP, NEAR_ZERO_DR))
      // TI_high: strongest target + weakest healthy coupling
      const vmTHigh = computeSchwan({ ...state.target,  conductivity: state.target.conductivity  * (1 + uncT) }, freq, field, sigma_e, cosT)
      const vmHLow  = computeSchwan({ ...state.healthy, conductivity: state.healthy.conductivity * (1 - uncH) }, freq, field, sigma_e, cosT)
      const drTHigh = (vmTHigh * pefT) / (vthT * hfireMult)
      const drHLow  = (vmHLow  * pefH) / (vthH * hfireMult)
      const tiHigh  = safeRatio(drTHigh, drHLow, THRESHOLDS.TI_DISPLAY_CAP, NEAR_ZERO_DR)
      return { low: tiLow, high: tiHigh }
    },

    healthyNuclearVm(): number {
      const state = this as CellStoreState
      if (!state.healthy.nuclearRadius) return 0
      const sigma_e = this.effectiveSigmaE
      const cosT    = this.cosThetaFactor
      return computeNuclearVm(state.healthy, state.currentBroadcastFrequency, state.fieldIntensity, sigma_e, cosT)
    },

    targetNuclearVm(): number {
      const state = this as CellStoreState
      if (!state.target.nuclearRadius) return 0
      const sigma_e = this.effectiveSigmaE
      const cosT    = this.cosThetaFactor
      return computeNuclearVm(state.target, state.currentBroadcastFrequency, state.fieldIntensity, sigma_e, cosT)
    },

    healthyNuclearFpeakKHz(): number {
      const state   = this as CellStoreState
      if (!state.healthy.nuclearRadius) return 0
      const sigma_e = this.effectiveSigmaE
      const tauOut  = computeTau(state.healthy, sigma_e)
      const tauNe   = computeNuclearTau(state.healthy, sigma_e)
      if (tauOut <= 0 || tauNe <= 0) return 0
      return 1 / (TWO_PI * Math.sqrt(tauOut * tauNe) * 1e3)
    },

    targetNuclearFpeakKHz(): number {
      const state   = this as CellStoreState
      if (!state.target.nuclearRadius) return 0
      const sigma_e = this.effectiveSigmaE
      const tauOut  = computeTau(state.target, sigma_e)
      const tauNe   = computeNuclearTau(state.target, sigma_e)
      if (tauOut <= 0 || tauNe <= 0) return 0
      return 1 / (TWO_PI * Math.sqrt(tauOut * tauNe) * 1e3)
    },

    healthyNuclearDisruptionRatio(): number {
      const state     = this as CellStoreState
      const vth       = tempCorrectedVth(state.healthy.nuclearThresholdVoltage ?? THRESHOLDS.NUCLEAR_VM_DEFAULT, state.healthyTemp)
      const hfireMult = state.waveform === WAVEFORM.H_FIRE ? H_FIRE_THRESHOLD_MULTIPLIER : 1.0
      // Nuclear membrane is gated by outer membrane charging: apply outer PEF so nuclear DR
      // correctly approaches 0 for short pulses (t_p << τ_out), consistent with outer DR.
      return (this.healthyNuclearVm * this.pulseEnvelopeFactorHealthy) / (vth * hfireMult)
    },

    targetNuclearDisruptionRatio(): number {
      const state     = this as CellStoreState
      const vth       = tempCorrectedVth(state.target.nuclearThresholdVoltage ?? THRESHOLDS.NUCLEAR_VM_DEFAULT, state.targetTemp)
      const hfireMult = state.waveform === WAVEFORM.H_FIRE ? H_FIRE_THRESHOLD_MULTIPLIER : 1.0
      // Nuclear membrane is gated by outer membrane charging: apply outer PEF so nuclear DR
      // correctly approaches 0 for short pulses (t_p << τ_out), consistent with outer DR.
      return (this.targetNuclearVm * this.pulseEnvelopeFactorTarget) / (vth * hfireMult)
    },

    nuclearSelectivityRatio(): number {
      return safeRatio(this.targetNuclearDisruptionRatio, this.healthyNuclearDisruptionRatio, THRESHOLDS.TI_DISPLAY_CAP, NEAR_ZERO_DR)
    },

    targetLysisField(): number {
      const state    = this as CellStoreState
      const hfireMult = state.waveform === WAVEFORM.H_FIRE ? H_FIRE_THRESHOLD_MULTIPLIER : 1.0
      return lysisField(state.target, state.currentBroadcastFrequency, this.effectiveSigmaE, this.cosThetaFactor, this.pulseEnvelopeFactorTarget, hfireMult, state.targetTemp)
    },

    healthyLysisField(): number {
      const state    = this as CellStoreState
      const hfireMult = state.waveform === WAVEFORM.H_FIRE ? H_FIRE_THRESHOLD_MULTIPLIER : 1.0
      return lysisField(state.healthy, state.currentBroadcastFrequency, this.effectiveSigmaE, this.cosThetaFactor, this.pulseEnvelopeFactorHealthy, hfireMult, state.healthyTemp)
    },

    healthySteadyStateTemp(): number {
      const state = this as CellStoreState
      const sar_eff = this.healthySAR * this.effectiveDutyCycle
      const cp = state.healthy.specificHeatCapacity
      const lambda_perf = state.perfusionRate * PENNES_BLOOD_COEFF / cp
      return Math.min(BODY_TEMP_C + sar_eff / ((NEWTON_COOLING_LAMBDA + lambda_perf) * cp), THRESHOLDS.TEMP_CAP)
    },

    targetSteadyStateTemp(): number {
      const state = this as CellStoreState
      const sar_eff = this.targetSAR * this.effectiveDutyCycle
      const cp = state.target.specificHeatCapacity
      const lambda_perf = state.perfusionRate * PENNES_BLOOD_COEFF / cp
      return Math.min(BODY_TEMP_C + sar_eff / ((NEWTON_COOLING_LAMBDA + lambda_perf) * cp), THRESHOLDS.TEMP_CAP)
    },

    bulkMediumSteadyStateTempC(): number {
      const dc          = this.effectiveDutyCycle
      const cp_m        = MEDIUM_SPECIFIC_HEAT_J_KG_K
      const lambda_perf = (this as CellStoreState).perfusionRate * PENNES_BLOOD_COEFF / cp_m
      return Math.min(
        BODY_TEMP_C + (this.mediumJouleHeatingSAR * dc) / ((NEWTON_COOLING_LAMBDA + lambda_perf) * cp_m),
        THRESHOLDS.TEMP_CAP,
      )
    },

    pulsedEnergyDensity_mJcm3(): number {
      const state = this as CellStoreState
      const E_si  = state.fieldIntensity * V_CM_TO_V_M
      // CW: wf=0.5, tp_s=1s → energy/second. Pulsed: wf=1.0, tp_s=t_p → energy/pulse.
      const wf   = state.waveform === WAVEFORM.CW ? WF_CW : WF_PULSED
      const tp_s = state.waveform === WAVEFORM.CW ? 1.0 : state.pulseWidthNs * NS_TO_S
      // P_volume = σ_e × E²_rms [W/m³] × time window [s] → J/m³
      // Note: do NOT multiply by dutyCycle here — that would give σ_e × E² × t_p × dc = t_p²/T,
      // which is neither energy-per-pulse nor average-power and has no standard physical meaning.
      const energyDensity_J_m3 = this.effectiveSigmaE * E_si ** 2 * wf * tp_s
      return energyDensity_J_m3 * J_M3_TO_MJ_CM3
    },

    mediumJouleHeatingSAR(): number {
      const state = this as CellStoreState
      const wf   = state.waveform === WAVEFORM.CW ? WF_CW : WF_PULSED
      const E_si = state.fieldIntensity * V_CM_TO_V_M
      return (this.effectiveSigmaE * E_si ** 2 * wf) / RHO_AQUEOUS_KG_M3
    },

    skinDepthMm(): number {
      const state = this as CellStoreState
      const eps_r = MEDIA[state.medium].permittivity
      return computeSkinDepthMm(state.currentBroadcastFrequency, this.effectiveSigmaE, eps_r)
    },

    // ── Dielectrophoresis - Clausius-Mossotti factor ────────────────────────────

    depHealthyCmReal(): number {
      const state = this as CellStoreState
      const eps_r = MEDIA[state.medium].permittivity
      return computeDepCmReal(state.healthy, state.currentBroadcastFrequency, this.effectiveSigmaE, eps_r)
    },

    depTargetCmReal(): number {
      const state = this as CellStoreState
      const eps_r = MEDIA[state.medium].permittivity
      return computeDepCmReal(state.target, state.currentBroadcastFrequency, this.effectiveSigmaE, eps_r)
    },

    depHealthyCrossoverKHz(): number {
      const state = this as CellStoreState
      const eps_r = MEDIA[state.medium].permittivity
      return computeDepCrossoverKHz(state.healthy, this.effectiveSigmaE, eps_r)
    },

    depTargetCrossoverKHz(): number {
      const state = this as CellStoreState
      const eps_r = MEDIA[state.medium].permittivity
      return computeDepCrossoverKHz(state.target, this.effectiveSigmaE, eps_r)
    },

    depHealthySecondCrossoverKHz(): number {
      const state = this as CellStoreState
      const eps_r = MEDIA[state.medium].permittivity
      return computeDepSecondCrossoverKHz(state.healthy, this.effectiveSigmaE, eps_r)
    },

    depTargetSecondCrossoverKHz(): number {
      const state = this as CellStoreState
      const eps_r = MEDIA[state.medium].permittivity
      return computeDepSecondCrossoverKHz(state.target, this.effectiveSigmaE, eps_r)
    },

    // ── Reversible EP resealing time estimate ────────────────────────────────

    // τ_reseal = τ_ref×(DR/DR_ref)^n_dr×exp(−k_T·(T−37))×N_p^n_p. Valid DR 50-85% only. Rols 1990.
    targetResealingTimeS(): number {
      const state = this as CellStoreState
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

    healthyStimIndex(): number {
      const r = Math.min(1, this.healthyDisruptionRatio / THRESHOLDS.NOURISHING)
      return Math.max(0, 4 * r * (1 - r))
    },

    healthyMechTransductionEff(): number {
      const f  = (this as CellStoreState).currentBroadcastFrequency  // kHz
      const fc = this.healthyFc                                                  // kHz
      return 1 / Math.sqrt(1 + (f / fc) ** 2)
    },

    healthyMildThermalActivation(): number {
      const T = this.healthySteadyStateTemp
      if (T <= BODY_TEMP_C) return 0
      if (T <= THERMAL_MA_PEAK_C) return (T - BODY_TEMP_C) / (THERMAL_MA_PEAK_C - BODY_TEMP_C)
      if (T <= THRESHOLDS.TEMP_WARN) return (THRESHOLDS.TEMP_WARN - T) / (THRESHOLDS.TEMP_WARN - THERMAL_MA_PEAK_C)
      return 0
    },

    optimalFreqResult(): { khz: number; sel: number } {
      const state  = this as CellStoreState
      const target = state.target as CellConfig & { resonantFreqGHz?: number; resonantThresholdVcm?: number; capsidQ?: number }
      const cat    = this.targetCellCategory
      if (
        this.isResonanceMode &&
        (cat === CELL_CATEGORY.VIRUS || cat === CELL_CATEGORY.BACTERIA) &&
        target.resonantFreqGHz && target.resonantThresholdVcm
      ) {
        // Compute actual TI at f_res instead of returning an arbitrary sentinel value
        const freqKhz = target.resonantFreqGHz * 1e6  // GHz → kHz
        // Acoustic resonance threshold: temperature correction only — hfireMult does not apply
        const effThr    = tempCorrectedVth(target.resonantThresholdVcm, state.targetTemp)
        const drT = computeResonantDisruption(
          target.resonantFreqGHz,
          target.capsidQ ?? DEFAULT_CAPSID_Q,
          effThr,
          freqKhz * KHZ_TO_HZ,
          state.fieldIntensity,
        )
        const sigma_e = this.effectiveSigmaE
        const hfireMult = state.waveform === WAVEFORM.H_FIRE ? H_FIRE_THRESHOLD_MULTIPLIER : 1.0
        const hVm = computeSchwan(state.healthy, freqKhz, state.fieldIntensity, sigma_e, this.cosThetaFactor)
        const vthH = tempCorrectedVth(state.healthy.thresholdVoltage, state.healthyTemp)
        const drH  = (hVm * this.pulseEnvelopeFactorHealthy) / (vthH * hfireMult)
        return { khz: freqKhz, sel: safeRatio(drT, drH, THRESHOLDS.TI_DISPLAY_CAP, NEAR_ZERO_DR) }
      }
      const sigma_e   = this.effectiveSigmaE
      const hfireMult = state.waveform === WAVEFORM.H_FIRE ? H_FIRE_THRESHOLD_MULTIPLIER : 1.0
      // Apply same threshold corrections as the live DR getters so returned `sel` matches TI display.
      const hThr    = tempCorrectedVth(state.healthy.thresholdVoltage, state.healthyTemp) * hfireMult
      const tThr    = tempCorrectedVth(state.target.thresholdVoltage,  state.targetTemp)  * hfireMult
      // PEF is frequency-independent (depends on τ, not f), so it scales the DR for each cell
      // uniformly across the scan - it doesn't shift the argmax but DOES change the TI magnitude.
      // Include PEF so the returned `sel` matches what the disruption ratio getters compute.
      const pefH    = this.pulseEnvelopeFactorHealthy
      const pefT    = this.pulseEnvelopeFactorTarget
      // cosTheta cancels in tDr/hDr (both Vm scale identically), so omitting it here is correct
      // for finding argmax and for the returned sel ratio.
      // Field largely cancels in tDr/hDr for cell pairs with similar τ (both Vm ∝ E).
      // Using unit field avoids a reactive dependency on fieldIntensity that would cause
      // 300 unnecessary Schwan evaluations on every slider move. Minor inaccuracy when the
      // two cells have very different τ (different fc), but negligible for typical mammalian pairs.
      const UNIT_FIELD = 1.0
      const logMin  = Math.log10(10), logMax = Math.log10(500_000)
      const { khz: optKhz, sel: maxSel } = Array.from({ length: 300 }, (_, i) => {
        const khz = Math.pow(10, logMin + (logMax - logMin) * i / 299)
        const hDr = (computeSchwan(state.healthy, khz, UNIT_FIELD, sigma_e) * pefH) / hThr
        const tDr = (computeSchwan(state.target,  khz, UNIT_FIELD, sigma_e) * pefT) / tThr
        return { khz, sel: hDr > 0 ? tDr / hDr : 0 }
      }).reduce((best, pt) => pt.sel > best.sel ? pt : best, { khz: 10, sel: -Infinity })
      return { khz: optKhz, sel: Math.max(0, maxSel) }
    },

    hmapFreqMaxKHz(): number {
      if (this.isResonanceMode) {
        const state = this as CellStoreState
        const t = state.target as { resonantFreqGHz?: number }
        if (t.resonantFreqGHz) return Math.max(t.resonantFreqGHz * 1e6 * 2.5, 1_000_000)
      }
      const cat = this.targetCellCategory
      if (cat === CELL_CATEGORY.VIRUS)    return 50_000_000
      if (cat === CELL_CATEGORY.BACTERIA) return  1_000_000
      const MAMMALIAN_DEFAULT = 10_000   // 10 MHz baseline
      const MAMMALIAN_CAP     = 100_000  // 100 MHz — IRE_MAMMALIAN freqMax
      const optKhz = this.optimalFreqResult.khz
      if (optKhz <= MAMMALIAN_DEFAULT || !isFinite(optKhz)) return MAMMALIAN_DEFAULT
      return Math.min(MAMMALIAN_CAP, Math.pow(10, Math.ceil(Math.log10(optKhz))))
    },

    healthyBiomodScore(): number {
      // Biomodulation is only meaningful below the EP onset threshold (DR < 50%).
      // Above that, membrane charging dominates and biomod sub-threshold effects are irrelevant.
      if (this.healthyDisruptionRatio >= THRESHOLDS.HEALTHY_APPROACHING) return 0
      return (
        THRESHOLDS.BMS_WEIGHT_SI  * this.healthyStimIndex +
        THRESHOLDS.BMS_WEIGHT_MTE * this.healthyMechTransductionEff +
        THRESHOLDS.BMS_WEIGHT_MA  * this.healthyMildThermalActivation
      )
    },

    // Electrode double-layer (Cdl) absorbs voltage at <50 kHz; Vm overestimated. Foster 1989.
    isElectrodePolarizationRisk(): boolean {
      const state = this as CellStoreState
      return !this.isResonanceMode && state.currentBroadcastFrequency < ELECTRODE_POLARIZATION_LIMIT_KHZ
    },

    // True when σe is so low (e.g. distilled water, dense packing) that both cells' fc fall
    // below the slider minimum. In this regime the slider always operates in the rolled-off
    // 1/f zone, so the displayed TI underestimates the true quasi-DC selectivity.
    fcBelowSliderMin(): boolean {
      if (this.isResonanceMode) return false
      if (this.targetCellCategory !== CELL_CATEGORY.MAMMALIAN) return false
      return Math.min(this.healthyFc, this.targetFc) < this.sliderRanges.freqMin
    },

    // Quasi-DC TI ceiling: (R_T × Vth_H) / (R_H × Vth_T). PEF and H-FIRE cancel in the ratio.
    // Temperature correction applied: cells may be at different steady-state temperatures.
    tiQuasiDc(): number {
      const state = this as CellStoreState
      const vthT = tempCorrectedVth(state.target.thresholdVoltage,  state.targetTemp)
      const vthH = tempCorrectedVth(state.healthy.thresholdVoltage, state.healthyTemp)
      if (vthT <= 0) return 0
      return (state.target.radius * vthH) / (state.healthy.radius * vthT)
    },

    // High-frequency TI limit: (R_T·τ_H·Vth_H) / (R_H·τ_T·Vth_T). Sub-unity when target rolls
    // off faster than healthy (larger R or higher Cm). Valid only in Schwan/IRE mode.
    // Temperature correction applied: cells may be at different steady-state temperatures.
    tiHighFreqLimit(): number {
      const state = this as CellStoreState
      const sigma_e = this.effectiveSigmaE
      const tauT = computeTau(state.target,  sigma_e)
      const tauH = computeTau(state.healthy, sigma_e)
      const vthT = tempCorrectedVth(state.target.thresholdVoltage,  state.targetTemp)
      const vthH = tempCorrectedVth(state.healthy.thresholdVoltage, state.healthyTemp)
      if (tauT <= 0 || vthT <= 0) return 0
      return (state.target.radius * tauH * vthH) / (state.healthy.radius * tauT * vthT)
    },

    sliderRanges(): SliderRange {
      const cat = this.targetCellCategory
      if (this.isResonanceMode) {
        if (cat === CELL_CATEGORY.VIRUS)     return SLIDER_RANGES.RESONANCE_VIRUS
        if (cat === CELL_CATEGORY.MAMMALIAN) return SLIDER_RANGES.RESONANCE_MAMMALIAN
        return SLIDER_RANGES.RESONANCE_BACTERIA
      }
      if (cat === CELL_CATEGORY.VIRUS)    return SLIDER_RANGES.IRE_VIRUS
      if (cat === CELL_CATEGORY.BACTERIA) return SLIDER_RANGES.IRE_BACTERIA
      return SLIDER_RANGES.IRE_MAMMALIAN
    },

    targetLysisProbabilityRandom(): number {
      const dr = this.targetDisruptionRatio
      if (dr <= 0) return 0
      return Math.max(0, Math.min(1, 1 - 1 / dr))
    },

    healthyLysisProbabilityRandom(): number {
      const dr = this.healthyDisruptionRatio
      if (dr <= 0) return 0
      return Math.max(0, Math.min(1, 1 - 1 / dr))
    },

    // ── Population size distribution model ────────────────────────────────────

    targetPopulationSizeCV(): number {
      const cat = this.targetCellCategory
      if (cat === CELL_CATEGORY.VIRUS)     return POP_CV_VIRUS
      if (cat === CELL_CATEGORY.BACTERIA)  return POP_CV_BACTERIA
      return POP_CV_MAMMALIAN
    },

    healthyPopulationSizeCV(): number { return POP_CV_MAMMALIAN },

    targetPopulationLysisFraction(): number {
      return computePopulationLysisFraction(this.targetDisruptionRatio, this.targetPopulationSizeCV)
    },

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
      if (packet.sessionName) this.sessionName = packet.sessionName
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
      ;(this[cellType] as object as Record<string, number>)[key] = value
    },

    startSession() {
      if (this.tempTimer !== null) return
      // dt_s must match TEMP_UPDATE_INTERVAL_MS — Euler integration step = timer period
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
      if (cellType === CELL_TYPE.HEALTHY) {
        this.healthyTemp = BODY_TEMP_C
        this.healthyCellState = CELL_STATE.STABLE
      } else {
        this.targetTemp = BODY_TEMP_C
        this.targetCellState = CELL_STATE.STABLE
      }
      this.resetCounter++
    },

    loadPreset(cellType: 'healthy' | 'target', preset: CellConfig) {
      const cfg = cloneDeep(preset) as CellConfig
      // Carry notes over to description if the preset supplies notes but not description
      const p = preset as CellConfig & { notes?: string }
      if (!cfg.description && p.notes) cfg.description = p.notes
      this[cellType] = cfg
      if (cellType === CELL_TYPE.HEALTHY) {
        this.healthyTemp = BODY_TEMP_C
        this.healthyCellState = CELL_STATE.STABLE
      } else {
        this.targetTemp = BODY_TEMP_C
        this.targetCellState = CELL_STATE.STABLE
      }
      this.resetCounter++
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
    // Only persist cell identities and physical model assumptions.
    // Field/frequency/waveform are re-derived on mount to avoid stale cross-session state.
    // chartMode excluded: sanitizeCategoryParams() derives it from target cell category.
    pick: [
      'healthy',
      'target',
      'doubleShellEnabled',
      'perfusionRate',
      'cellPackingFraction',
    ],
  },
})
