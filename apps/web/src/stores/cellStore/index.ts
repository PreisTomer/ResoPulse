// Copyright © 2026 Tomer Preis. All rights reserved.
// Unauthorized copying or distribution is prohibited.

import { defineStore } from 'pinia'

import { cloneDeep } from 'lodash'

import type { StatePacket } from '@resopulse/shared-types'

import { useExperimentStore } from '@/stores/experimentStore'
import { useUserPresetsStore } from '@/stores/userPresetsStore'

import { computeSchwan, computeSAR, computeIntracellularDebyeSAR, computeSteadyStateTemp, computeFc, computeTau, computeNuclearTau, computeResonantDisruption, computeNuclearVm, computeSkinDepthMm, computeDepCmReal, computeDepCrossoverKHz, computeDepSecondCrossoverKHz, computePopulationLysisFraction, safeRatio, tempCorrectedVth, computePulseEnvelope, computeLysisField, computeSigmaUncertaintyFactor } from '@/utils/physics'

import { cellConfigs } from '@/constants/defaultCells'
import { CELL_PRESETS } from '@/constants/cellLibrary'
import { EDITABLE_PARAMS, EDITABLE_PARAMS_ACOUSTIC } from '@/constants/cellCard'
import { MEDIA } from '@/constants/media'
import { SLIDER_RANGES, type SliderRange } from '@/constants/sliderBounds'
import { CELL_CATEGORY, CELL_STATE, CHART_MODE, WAVEFORM, CELL_TYPE, FREQ_REGIME } from '@/constants/strings'
import { DEFAULT_LYSIS_N_PULSES, DEFAULT_ORIENTATION_DEG } from '@/constants/experimentDefaults'
import { MEDIUM_SPECIFIC_HEAT_J_KG_K } from '@/constants/cuvette'
import {
  THRESHOLDS,
  DEFAULT_CAPSID_Q,
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
  DEBYE_TAU_AQUEOUS_S,
  EPS_INF_AQUEOUS,
  EPSILON_0,
} from '@/constants/physics'

import type { CellConfig, CellState } from '@/types/cell'
import type { MediumKey } from '@/types/media'

// Module-level cache: skips the 300-point Schwan scan when cell/waveform params are unchanged.
// Needed because effectiveSigmaE (a dependency) changes 10×/sec during temperature updates.
interface OptFreqCache { key: string; result: { khz: number; sel: number } }
let _optFreqCache: OptFreqCache | null = null


export interface FieldPacket {
  timestamp: number
  activeFrequencyKHz: number
  activeFieldIntensityVcm: number
  activeMedium: string
}


export type { StatePacket }

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
  tempTimer: ReturnType<typeof setInterval> | null
  resetCounter: number
  healthyCellState: CellState
  targetCellState: CellState
  bulkMediumTemp: number          // bath/medium T [°C]; cells cool toward this, not BODY_TEMP_C
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
    tempTimer: null,
    resetCounter: 0,
    healthyCellState: 'stable' as CellState,
    targetCellState:  'stable' as CellState,
    bulkMediumTemp:   BODY_TEMP_C,
  }),

  getters: {
    sigma_e: (state): number => MEDIA[state.medium].conductivity,
    cosThetaFactor: (state): number => Math.abs(Math.cos(state.orientationDeg * Math.PI / 180)),
    isResonanceMode: (state): boolean => state.chartMode === CHART_MODE.RESONANCE,

    // CW: no pulse sequence, so N collapses to 1 (electrosensitization cannot apply).
    effectivePulseCount: (state): number => state.waveform === WAVEFORM.CW ? 1 : state.lysisNPulses,

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
      return computePulseEnvelope(state.healthy, state.pulseWidthNs, this.effectiveSigmaE)
    },

    pulseEnvelopeFactorTarget(): number {
      const state = this as CellStoreState
      const isPulsed = state.waveform === WAVEFORM.PULSED || state.waveform === WAVEFORM.H_FIRE
      if (!isPulsed || this.isResonanceMode) return 1.0
      return computePulseEnvelope(state.target, state.pulseWidthNs, this.effectiveSigmaE)
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
      const vthEff = tempCorrectedVth(state.healthy.thresholdVoltage, state.healthyTemp, this.effectivePulseCount)
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
        // Acoustic resonance disruption is mechanical — hfireMult and electrosensitization do NOT apply here.
        const effThreshold = tempCorrectedVth(t.resonantThresholdVcm, state.targetTemp)
        return computeResonantDisruption(
          t.resonantFreqGHz,
          t.capsidQ ?? DEFAULT_CAPSID_Q,
          effThreshold,
          state.currentBroadcastFrequency * KHZ_TO_HZ,  // kHz → Hz
          state.fieldIntensity,
          t.resonantFreqGHz2, t.capsidQ2, t.resonantMode2Amplitude,
        )
      }
      const vthEff = tempCorrectedVth(state.target.thresholdVoltage, state.targetTemp, this.effectivePulseCount)
      return (this.targetVm * this.pulseEnvelopeFactorTarget) / (vthEff * hfireMult)
    },

    healthySAR(): number {
      const state = this as CellStoreState
      const wf = state.waveform === WAVEFORM.CW ? WF_CW : WF_PULSED
      if (this.isResonanceMode) return computeIntracellularDebyeSAR(state.healthy, state.fieldIntensity, state.currentBroadcastFrequency, wf)
      return computeSAR(state.healthy, state.fieldIntensity, this.effectiveSigmaE, wf)
    },

    targetSAR(): number {
      const state = this as CellStoreState
      const wf = state.waveform === WAVEFORM.CW ? WF_CW : WF_PULSED
      if (this.isResonanceMode) return computeIntracellularDebyeSAR(state.target, state.fieldIntensity, state.currentBroadcastFrequency, wf)
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
          resonantFreqUncertaintyPct?: number
        }
        if (
          (cat === CELL_CATEGORY.VIRUS || cat === CELL_CATEGORY.BACTERIA) &&
          t.resonantFreqGHz && t.resonantThresholdVcm &&
          t.capsidQMin !== undefined && t.capsidQMax !== undefined
        ) {
          // Acoustic resonance threshold: temperature correction only — hfireMult does not apply
          const effThr    = tempCorrectedVth(t.resonantThresholdVcm, state.targetTemp)
          const hDr      = this.healthyDisruptionRatio
          const freqHz   = state.currentBroadcastFrequency * KHZ_TO_HZ
          // Sweep (Q_min, Q_max) × (f_res × (1 ± pct/100)) and pick envelope. f_res
          // uncertainty moves the Lorentzian peak laterally; without it the band can
          // miss cases where the broadcast frequency is slightly off the nominal peak.
          const fresPct  = t.resonantFreqUncertaintyPct ?? 0
          const fresLo   = t.resonantFreqGHz * (1 - fresPct / 100)
          const fresHi   = t.resonantFreqGHz * (1 + fresPct / 100)
          const qGrid    = [t.capsidQMin, t.capsidQMax]
          const fresGrid = fresPct > 0 ? [fresLo, t.resonantFreqGHz, fresHi] : [t.resonantFreqGHz]
          let drTMin = Infinity, drTMax = -Infinity
          for (const q of qGrid) {
            for (const fres of fresGrid) {
              const dr = computeResonantDisruption(fres, q, effThr, freqHz, state.fieldIntensity, t.resonantFreqGHz2, t.capsidQ2, t.resonantMode2Amplitude)
              if (dr < drTMin) drTMin = dr
              if (dr > drTMax) drTMax = dr
            }
          }
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
      const uncH    = computeSigmaUncertaintyFactor(state.healthy.radius)
      const uncT    = computeSigmaUncertaintyFactor(state.target.radius)
      // TI_low: weakest target + strongest healthy coupling
      const vmTLow  = computeSchwan({ ...state.target,  conductivity: state.target.conductivity  * (1 - uncT) }, freq, field, sigma_e, cosT)
      const vmHHigh = computeSchwan({ ...state.healthy, conductivity: state.healthy.conductivity * (1 + uncH) }, freq, field, sigma_e, cosT)
      const pefT    = this.pulseEnvelopeFactorTarget
      const pefH    = this.pulseEnvelopeFactorHealthy
      // Apply same temperature + electrosensitization correction + H-FIRE multiplier as the live DR getters
      const hfireMult = state.waveform === WAVEFORM.H_FIRE ? H_FIRE_THRESHOLD_MULTIPLIER : 1.0
      const vthT = tempCorrectedVth(state.target.thresholdVoltage, state.targetTemp, this.effectivePulseCount)
      const vthH = tempCorrectedVth(state.healthy.thresholdVoltage, state.healthyTemp, this.effectivePulseCount)
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
      const vth       = tempCorrectedVth(state.healthy.nuclearThresholdVoltage ?? THRESHOLDS.NUCLEAR_VM_DEFAULT, state.healthyTemp, this.effectivePulseCount)
      const hfireMult = state.waveform === WAVEFORM.H_FIRE ? H_FIRE_THRESHOLD_MULTIPLIER : 1.0
      // Gate by outer PEF so nuclear DR → 0 for t_p << τ_out.
      return (this.healthyNuclearVm * this.pulseEnvelopeFactorHealthy) / (vth * hfireMult)
    },

    targetNuclearDisruptionRatio(): number {
      const state     = this as CellStoreState
      const vth       = tempCorrectedVth(state.target.nuclearThresholdVoltage ?? THRESHOLDS.NUCLEAR_VM_DEFAULT, state.targetTemp, this.effectivePulseCount)
      const hfireMult = state.waveform === WAVEFORM.H_FIRE ? H_FIRE_THRESHOLD_MULTIPLIER : 1.0
      return (this.targetNuclearVm * this.pulseEnvelopeFactorTarget) / (vth * hfireMult)
    },

    nuclearSelectivityRatio(): number {
      return safeRatio(this.targetNuclearDisruptionRatio, this.healthyNuclearDisruptionRatio, THRESHOLDS.TI_DISPLAY_CAP, NEAR_ZERO_DR)
    },

    targetLysisField(): number {
      const state     = this as CellStoreState
      const hfireMult = state.waveform === WAVEFORM.H_FIRE ? H_FIRE_THRESHOLD_MULTIPLIER : 1.0
      return computeLysisField(state.target, state.currentBroadcastFrequency, this.effectiveSigmaE, this.cosThetaFactor, this.pulseEnvelopeFactorTarget, hfireMult, state.targetTemp, this.effectivePulseCount)
    },

    healthyLysisField(): number {
      const state     = this as CellStoreState
      const hfireMult = state.waveform === WAVEFORM.H_FIRE ? H_FIRE_THRESHOLD_MULTIPLIER : 1.0
      return computeLysisField(state.healthy, state.currentBroadcastFrequency, this.effectiveSigmaE, this.cosThetaFactor, this.pulseEnvelopeFactorHealthy, hfireMult, state.healthyTemp, this.effectivePulseCount)
    },

    healthySteadyStateTemp(): number {
      return computeSteadyStateTemp(this.healthySAR, this.effectiveDutyCycle, (this as CellStoreState).healthy.specificHeatCapacity, (this as CellStoreState).perfusionRate, (this as CellStoreState).bulkMediumTemp)
    },

    targetSteadyStateTemp(): number {
      return computeSteadyStateTemp(this.targetSAR, this.effectiveDutyCycle, (this as CellStoreState).target.specificHeatCapacity, (this as CellStoreState).perfusionRate, (this as CellStoreState).bulkMediumTemp)
    },

    bulkMediumSteadyStateTempC(): number {
      return computeSteadyStateTemp(this.mediumJouleHeatingSAR, this.effectiveDutyCycle, MEDIUM_SPECIFIC_HEAT_J_KG_K, (this as CellStoreState).perfusionRate)
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
      // σ_eff = σ_dc + ω·ε₀·ε″(ω). At kHz-MHz the Debye loss term is ~0 and this reduces
      // to the ionic conduction case. At GHz (resonance mode) dielectric relaxation of
      // water dominates and must be included, otherwise medium heating reads as zero.
      const omega    = TWO_PI * state.currentBroadcastFrequency * KHZ_TO_HZ
      const eps_r_s  = MEDIA[state.medium].permittivity
      const wt       = omega * DEBYE_TAU_AQUEOUS_S
      const epsLoss  = (eps_r_s - EPS_INF_AQUEOUS) * wt / (1 + wt * wt)
      const sigmaEff = this.effectiveSigmaE + omega * EPSILON_0 * epsLoss
      return (sigmaEff * E_si ** 2 * wf) / RHO_AQUEOUS_KG_M3
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
      const nPulses = Math.max(1, this.effectivePulseCount)
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
        const effThr    = tempCorrectedVth(target.resonantThresholdVcm, state.targetTemp)
        const sigma_e   = this.effectiveSigmaE
        const hfireMult = state.waveform === WAVEFORM.H_FIRE ? H_FIRE_THRESHOLD_MULTIPLIER : 1.0
        const hThr      = tempCorrectedVth(state.healthy.thresholdVoltage, state.healthyTemp, this.effectivePulseCount) * hfireMult
        // Candidate peaks: mode 1 and (if present) mode 2. Pick whichever delivers better
        // selectivity — for multi-mode cells the higher-frequency mode can give greater
        // target/healthy contrast because healthy Schwan Vm rolls off faster above fc.
        const selAt = (fresGHz: number): { khz: number; sel: number } => {
          const khz = fresGHz * 1e6
          const drT = computeResonantDisruption(
            target.resonantFreqGHz!, target.capsidQ ?? DEFAULT_CAPSID_Q, effThr,
            khz * KHZ_TO_HZ, state.fieldIntensity,
            target.resonantFreqGHz2, target.capsidQ2, target.resonantMode2Amplitude,
          )
          const hVm = computeSchwan(state.healthy, khz, state.fieldIntensity, sigma_e, this.cosThetaFactor)
          const drH = (hVm * this.pulseEnvelopeFactorHealthy) / hThr
          return { khz, sel: safeRatio(drT, drH, THRESHOLDS.TI_DISPLAY_CAP, NEAR_ZERO_DR) }
        }
        const candidates = [selAt(target.resonantFreqGHz)]
        if (target.resonantFreqGHz2) candidates.push(selAt(target.resonantFreqGHz2))
        return candidates.reduce((best, c) => c.sel > best.sel ? c : best)
      }

      // Build cache key from all inputs that affect the scan. Round temps to 0.1 °C to
      // avoid cache misses from floating-point noise in the Euler integration.
      const sigma_e = this.effectiveSigmaE
      const cacheKey = [
        state.healthy.id, state.healthy.radius, state.healthy.membraneThickness,
        state.healthy.dielectricConstant, state.healthy.conductivity, state.healthy.thresholdVoltage,
        state.target.id, state.target.radius, state.target.membraneThickness,
        state.target.dielectricConstant, state.target.conductivity, state.target.thresholdVoltage,
        state.waveform, state.dutyCycle, state.pulseWidthNs, state.chartMode,
        this.effectivePulseCount,
        Math.round(sigma_e * 1e6),  // µS/m precision — avoids misses from tiny temp-driven σ_e drift
        Math.round(state.healthyTemp * 10), Math.round(state.targetTemp * 10),
      ].join('|')

      if (_optFreqCache?.key === cacheKey) return _optFreqCache.result

      const hfireMult = state.waveform === WAVEFORM.H_FIRE ? H_FIRE_THRESHOLD_MULTIPLIER : 1.0
      const hThr = tempCorrectedVth(state.healthy.thresholdVoltage, state.healthyTemp, this.effectivePulseCount) * hfireMult
      const tThr = tempCorrectedVth(state.target.thresholdVoltage,  state.targetTemp,  this.effectivePulseCount) * hfireMult
      const pefH = this.pulseEnvelopeFactorHealthy
      const pefT = this.pulseEnvelopeFactorTarget
      // cosTheta and field cancel in the tDr/hDr ratio — use unit field to avoid a reactive
      // dependency on fieldIntensity that would bust the cache on every field slider move.
      const UNIT_FIELD = 1.0
      const logMin = Math.log10(10), logMax = Math.log10(500_000)
      const { khz: optKhz, sel: maxSel } = Array.from({ length: 300 }, (_, i) => {
        const khz = Math.pow(10, logMin + (logMax - logMin) * i / 299)
        const hDr = (computeSchwan(state.healthy, khz, UNIT_FIELD, sigma_e) * pefH) / hThr
        const tDr = (computeSchwan(state.target,  khz, UNIT_FIELD, sigma_e) * pefT) / tThr
        return { khz, sel: hDr > 0 ? tDr / hDr : 0 }
      }).reduce((best, pt) => pt.sel > best.sel ? pt : best, { khz: 10, sel: -Infinity })

      const result = { khz: optKhz, sel: Math.max(0, maxSel) }
      _optFreqCache = { key: cacheKey, result }
      return result
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
      const dr   = this.healthyDisruptionRatio
      const taperLo = THRESHOLDS.BMS_TAPER_LO
      const taperHi = THRESHOLDS.BMS_TAPER_HI
      if (dr >= taperHi) return 0
      const rawScore = (
        THRESHOLDS.BMS_WEIGHT_SI  * this.healthyStimIndex +
        THRESHOLDS.BMS_WEIGHT_MTE * this.healthyMechTransductionEff +
        THRESHOLDS.BMS_WEIGHT_MA  * this.healthyMildThermalActivation
      )
      if (dr <= taperLo) return rawScore
      const t = (dr - taperLo) / (taperHi - taperLo)
      const smooth = 1 - (t * t * (3 - 2 * t))  // inverted smoothstep: 1 at dr=taperLo → 0 at dr=taperHi
      return rawScore * smooth
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
    // Temperature and electrosensitization corrections applied consistently.
    tiQuasiDc(): number {
      const state = this as CellStoreState
      const vthT = tempCorrectedVth(state.target.thresholdVoltage,  state.targetTemp,  this.effectivePulseCount)
      const vthH = tempCorrectedVth(state.healthy.thresholdVoltage, state.healthyTemp, this.effectivePulseCount)
      if (vthT <= 0) return 0
      return (state.target.radius * vthH) / (state.healthy.radius * vthT)
    },

    // High-frequency TI limit: (R_T·τ_H·Vth_H) / (R_H·τ_T·Vth_T). Sub-unity when target rolls
    // off faster than healthy (larger R or higher Cm). Valid only in Schwan/IRE mode.
    // Temperature and electrosensitization corrections applied consistently.
    tiHighFreqLimit(): number {
      const state = this as CellStoreState
      const sigma_e = this.effectiveSigmaE
      const tauT = computeTau(state.target,  sigma_e)
      const tauH = computeTau(state.healthy, sigma_e)
      const vthT = tempCorrectedVth(state.target.thresholdVoltage,  state.targetTemp,  this.effectivePulseCount)
      const vthH = tempCorrectedVth(state.healthy.thresholdVoltage, state.healthyTemp, this.effectivePulseCount)
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
      const dr   = this.targetDisruptionRatio
      if (dr <= 0) return 0
      // In resonance mode, DR is orientation-independent (acoustic, not Schwan Vm).
      // In Schwan mode, DR includes cosTheta — recover DR_max = DR / cosTheta for the
      // random-orientation integral: P = max(0, 1 − 1/DR_max).
      const cosT  = this.cosThetaFactor
      const drMax = (!this.isResonanceMode && cosT > MIN_COS_THETA) ? dr / cosT : dr
      return Math.max(0, Math.min(1, 1 - 1 / drMax))
    },

    healthyLysisProbabilityRandom(): number {
      const dr   = this.healthyDisruptionRatio
      if (dr <= 0) return 0
      // healthyDisruptionRatio always uses Schwan Vm with cosTheta — recover DR_max.
      const cosT  = this.cosThetaFactor
      const drMax = cosT > MIN_COS_THETA ? dr / cosT : dr
      return Math.max(0, Math.min(1, 1 - 1 / drMax))
    },

    // ── Population size distribution model ────────────────────────────────────

    targetPopulationSizeCV(): number {
      const cat = this.targetCellCategory
      if (cat === CELL_CATEGORY.VIRUS)     return POP_CV_VIRUS
      if (cat === CELL_CATEGORY.BACTERIA)  return POP_CV_BACTERIA
      return POP_CV_MAMMALIAN
    },

    // Mirror targetPopulationSizeCV: derive CV from the actual healthy-cell category rather
    // than hard-coding mammalian, so custom bacterial/viral "healthy" references are correct.
    healthyPopulationSizeCV(): number {
      const state = this as CellStoreState
      const r = state.healthy.radius
      if (r < THRESHOLDS.RADIUS_VIRUS_MAX)    return POP_CV_VIRUS
      if (r < THRESHOLDS.RADIUS_BACTERIA_MAX) return POP_CV_BACTERIA
      return POP_CV_MAMMALIAN
    },

    targetPopulationLysisFraction(): number {
      // computePopulationLysisFraction expects DR_max (orientation-independent).
      // In Schwan mode, recover DR_max = DR / cosTheta; in resonance mode, DR is already orientation-free.
      const dr   = this.targetDisruptionRatio
      const cosT = this.cosThetaFactor
      const drMax = (!this.isResonanceMode && cosT > MIN_COS_THETA) ? dr / cosT : dr
      return computePopulationLysisFraction(drMax, this.targetPopulationSizeCV)
    },

    healthyPopulationLysisFraction(): number {
      // healthyDisruptionRatio always uses Schwan Vm — recover DR_max = DR / cosTheta.
      const dr   = this.healthyDisruptionRatio
      const cosT = this.cosThetaFactor
      const drMax = cosT > MIN_COS_THETA ? dr / cosT : dr
      return computePopulationLysisFraction(drMax, this.healthyPopulationSizeCV)
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
      // Route every field through its sanitising setter so malformed or stale
      // peer packets cannot inject out-of-range values (dc=0, orientation=180, N=10_000…).
      if (Number.isFinite(packet.freqKHz))  this.currentBroadcastFrequency = packet.freqKHz
      if (Number.isFinite(packet.fieldVcm)) this.fieldIntensity            = packet.fieldVcm
      if (packet.medium in MEDIA)                 this.setMedium(packet.medium as MediumKey)
      if (Number.isFinite(packet.dutyCycle))      this.setDutyCycle(packet.dutyCycle)
      if (Number.isFinite(packet.pulseWidthNs))   this.setPulseWidthNs(packet.pulseWidthNs)
      if (packet.waveform === WAVEFORM.CW || packet.waveform === WAVEFORM.PULSED || packet.waveform === WAVEFORM.H_FIRE) {
        this.setWaveform(packet.waveform)
      }
      if (Number.isFinite(packet.orientationDeg)) this.setOrientationDeg(packet.orientationDeg)
      if (Number.isFinite(packet.lysisNPulses))   this.setLysisNPulses(packet.lysisNPulses)
      if (packet.chartMode === CHART_MODE.SCHWAN || packet.chartMode === CHART_MODE.RESONANCE) {
        this.setChartMode(packet.chartMode)
      }
      if (typeof packet.doubleShellEnabled === 'boolean') this.doubleShellEnabled = packet.doubleShellEnabled
      if (Number.isFinite(packet.perfusionRate))       this.setPerfusionRate(packet.perfusionRate)
      if (Number.isFinite(packet.cellPackingFraction)) this.setCellPackingFraction(packet.cellPackingFraction)
      this.loadPresetIfNeeded('target',  packet.targetPresetId)
      this.loadPresetIfNeeded('healthy', packet.healthyPresetId)
      if (packet.sessionName) useExperimentStore().setSessionName(packet.sessionName)
    },

    loadPresetIfNeeded(cellType: 'healthy' | 'target', presetId: string) {
      if (!presetId || presetId === this[cellType].id) return

      // Check built-in library first
      const builtin = CELL_PRESETS.find(c => c.id === presetId)
      if (builtin) {
        const cfg = cloneDeep(builtin) as CellConfig
        if (!cfg.description && builtin.notes) cfg.description = builtin.notes
        this[cellType] = cfg
        if (cellType === 'target') this.targetTemp = BODY_TEMP_C
        else this.healthyTemp = BODY_TEMP_C
        if (cellType === 'target') this.syncChartModeToTarget()
        this.resetCounter++
        return
      }

      // Fall back to org custom presets (enables multi-user sync of custom cells)
      const userPreset = useUserPresetsStore().presets.find(p => p.id === presetId)
      if (!userPreset) return
      this[cellType] = useUserPresetsStore().toCellConfig(userPreset)
      if (cellType === 'target') this.targetTemp = BODY_TEMP_C
      else this.healthyTemp = BODY_TEMP_C
      if (cellType === 'target') this.syncChartModeToTarget()
      this.resetCounter++
    },

    updateCellParam(cellType: 'healthy' | 'target', key: string, value: number) {
      if (!Number.isFinite(value)) return
      const cell = this[cellType] as CellConfig & { resonantFreqGHz?: number }
      const paramSet = cell.resonantFreqGHz != null ? EDITABLE_PARAMS_ACOUSTIC : EDITABLE_PARAMS
      const def = paramSet.find(p => p.key === key)
      if (!def) return
      const clamped = Math.max(def.min, Math.min(def.max, value))
      ;(this[cellType] as object as Record<string, number>)[key] = clamped
    },

    startSession() {
      if (this.tempTimer !== null) return
      // dt_s must match TEMP_UPDATE_INTERVAL_MS — Euler integration step = timer period
      const dt_s = TEMP_UPDATE_INTERVAL_MS * MS_TO_S
      this.tempTimer = setInterval(() => {
        const dc  = this.effectiveDutyCycle
        const mL  = NEWTON_COOLING_LAMBDA + this.perfusionRate * PENNES_BLOOD_COEFF / MEDIUM_SPECIFIC_HEAT_J_KG_K
        const dTm = (this.mediumJouleHeatingSAR * dc / MEDIUM_SPECIFIC_HEAT_J_KG_K - mL * (this.bulkMediumTemp - BODY_TEMP_C)) * dt_s
        this.bulkMediumTemp = Math.max(BODY_TEMP_C, Math.min(THRESHOLDS.TEMP_CAP, this.bulkMediumTemp + dTm))
        const baseline = this.bulkMediumTemp
        const hCp = this.healthy.specificHeatCapacity
        const hL  = NEWTON_COOLING_LAMBDA + this.perfusionRate * PENNES_BLOOD_COEFF / hCp
        const dTh = (this.healthySAR * dc / hCp - hL * (this.healthyTemp - baseline)) * dt_s
        this.healthyTemp = Math.max(baseline, Math.min(THRESHOLDS.TEMP_CAP, this.healthyTemp + dTh))
        const tCp = this.target.specificHeatCapacity
        const tL  = NEWTON_COOLING_LAMBDA + this.perfusionRate * PENNES_BLOOD_COEFF / tCp
        const dTt = (this.targetSAR * dc / tCp - tL * (this.targetTemp - baseline)) * dt_s
        this.targetTemp = Math.max(baseline, Math.min(THRESHOLDS.TEMP_CAP, this.targetTemp + dTt))
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
      _optFreqCache = null
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
        this.syncChartModeToTarget()
      }
      _optFreqCache = null
      this.resetCounter++
    },

    resetTemps() {
      this.healthyTemp = BODY_TEMP_C
      this.targetTemp = BODY_TEMP_C
      this.bulkMediumTemp = BODY_TEMP_C
    },

    setOrientationDeg(deg: number) {
      this.orientationDeg = Math.max(0, Math.min(90, deg))
    },

    setLysisNPulses(n: number) {
      // Cap at 1000 rather than the slider's 200 so legacy saved experiments with
      // high N aren't silently truncated on load. Physics is unchanged past ~190
      // because tempCorrectedVth() hits ELECTROSENSITIZATION_CLAMP_MIN there.
      this.lysisNPulses = Math.max(1, Math.min(1000, Math.round(n)))
    },

    setChartMode(mode: 'schwan' | 'resonance') {
      // Virus targets lack a validated Schwan range (fc in GHz is inaccessible). Force resonance.
      const t = this.target as CellConfig & { resonantFreqGHz?: number; resonantThresholdVcm?: number }
      if (mode === CHART_MODE.SCHWAN && this.targetCellCategory === CELL_CATEGORY.VIRUS && t.resonantFreqGHz && t.resonantThresholdVcm) {
        this.chartMode = CHART_MODE.RESONANCE
        return
      }
      this.chartMode = mode
    },

    // Virus targets auto-switch to resonance; bacteria/mammalian keep the user's choice.
    syncChartModeToTarget() {
      const t = this.target as CellConfig & { resonantFreqGHz?: number; resonantThresholdVcm?: number }
      if (this.targetCellCategory === CELL_CATEGORY.VIRUS && t.resonantFreqGHz && t.resonantThresholdVcm) {
        this.chartMode = CHART_MODE.RESONANCE
      }
    },

    toggleDoubleShell() {
      this.doubleShellEnabled = !this.doubleShellEnabled
    },

    setPerfusionRate(rate: number) {
      this.perfusionRate = Math.max(0, Math.min(5, rate))
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
