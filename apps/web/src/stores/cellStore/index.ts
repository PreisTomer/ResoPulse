// Copyright © 2026 Tomer Preis. All rights reserved.
// Unauthorized copying or distribution is prohibited.

import { defineStore } from 'pinia'

import { cloneDeep } from 'lodash'

import type { StatePacket } from '@resopulse/shared-types'

import { useExperimentStore } from '@/stores/experimentStore'
import { useUserPresetsStore } from '@/stores/userPresetsStore'
import { useCellCalibrationStore } from '@/stores/cellCalibrationStore'

import { computeSchwan, computeSAR, computeIntracellularDebyeSAR, computeSteadyStateTemp, computeFc, computeTau, computeNuclearTau, computeResonantDisruption, computeNuclearVm, computeSkinDepthMm, computeDepCmReal, computeDepCrossoverKHz, computeDepSecondCrossoverKHz, computePopulationLysisFraction, safeRatio, tempCorrectedVth, computePulseEnvelope, computeLysisField, computeSigmaUncertaintyFactor, getHFireMultiplier, isResonanceTargetActive, jacobianSchwanDR, jacobianResonantDR, computeResonantDR, propagatedTiVariance, propagateScalarVariance, type CalibrationCovariance, type ForwardDrInput } from '@/utils/physics'

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

    // H-FIRE ×1.75 threshold multiplier for EP path only; acoustic resonance must NOT apply it.
    hFireMultiplier: (state): number => getHFireMultiplier(state.waveform),

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

    // Healthy is always Schwan (mammalian reference, no capsid acoustic params).
    healthyParam1Multiplier: (state): number => useCellCalibrationStore().param1MultiplierFor(state.healthy.id, 'schwan'),
    healthyParam2Multiplier: (state): number => useCellCalibrationStore().param2MultiplierFor(state.healthy.id, 'schwan'),
    healthyCalibrationCovariance: (state) => useCellCalibrationStore().covarianceFor(state.healthy.id, 'schwan'),

    // Target mode: inlined so Pinia getter type inference reaches it without a forward reference to isResonanceTarget (defined further down).
    targetCalibrationMode: (state): 'schwan' | 'resonance' => {
      if (state.chartMode !== CHART_MODE.RESONANCE) return 'schwan'
      const t = state.target as CellConfig & { resonantFreqGHz?: number; resonantThresholdVcm?: number }
      const cat = state.target.radius < THRESHOLDS.RADIUS_VIRUS_MAX ? CELL_CATEGORY.VIRUS
                : state.target.radius < THRESHOLDS.RADIUS_BACTERIA_MAX ? CELL_CATEGORY.BACTERIA
                : CELL_CATEGORY.MAMMALIAN
      if (cat !== CELL_CATEGORY.VIRUS && cat !== CELL_CATEGORY.BACTERIA) return 'schwan'
      if (!t.resonantFreqGHz || !t.resonantThresholdVcm) return 'schwan'
      return 'resonance'
    },
    targetParam1Multiplier: (state): number => {
      const mode: 'schwan' | 'resonance' = (() => {
        if (state.chartMode !== CHART_MODE.RESONANCE) return 'schwan'
        const t = state.target as CellConfig & { resonantFreqGHz?: number; resonantThresholdVcm?: number }
        if (state.target.radius >= THRESHOLDS.RADIUS_BACTERIA_MAX) return 'schwan'
        if (!t.resonantFreqGHz || !t.resonantThresholdVcm) return 'schwan'
        return 'resonance'
      })()
      return useCellCalibrationStore().param1MultiplierFor(state.target.id, mode)
    },
    targetParam2Multiplier: (state): number => {
      const mode: 'schwan' | 'resonance' = (() => {
        if (state.chartMode !== CHART_MODE.RESONANCE) return 'schwan'
        const t = state.target as CellConfig & { resonantFreqGHz?: number; resonantThresholdVcm?: number }
        if (state.target.radius >= THRESHOLDS.RADIUS_BACTERIA_MAX) return 'schwan'
        if (!t.resonantFreqGHz || !t.resonantThresholdVcm) return 'schwan'
        return 'resonance'
      })()
      return useCellCalibrationStore().param2MultiplierFor(state.target.id, mode)
    },
    targetCalibrationCovariance: (state) => {
      const mode: 'schwan' | 'resonance' = (() => {
        if (state.chartMode !== CHART_MODE.RESONANCE) return 'schwan'
        const t = state.target as CellConfig & { resonantFreqGHz?: number; resonantThresholdVcm?: number }
        if (state.target.radius >= THRESHOLDS.RADIUS_BACTERIA_MAX) return 'schwan'
        if (!t.resonantFreqGHz || !t.resonantThresholdVcm) return 'schwan'
        return 'resonance'
      })()
      return useCellCalibrationStore().covarianceFor(state.target.id, mode)
    },

    // Legacy aliases retained for read-side compat with the previous σ_i-only field.
    healthyCalibrationMultiplier(): number  { return this.healthyParam1Multiplier },
    targetCalibrationMultiplier(): number   { return this.targetCalibrationMode === 'schwan' ? this.targetParam1Multiplier : 1.0 },
    healthyCalibrationUncertainty(): number { return Math.sqrt(Math.max(0, this.healthyCalibrationCovariance.cov11)) },
    targetCalibrationUncertainty(): number  { return Math.sqrt(Math.max(0, this.targetCalibrationCovariance.cov11)) },

    // Cell configs with σ_i AND V_th (Schwan) scaled by the calibration multipliers. The Schwan/EP path picks these up via every getter that takes a CellConfig — DR, Vm, τ, fc, DEP all see the digital twin.
    effectiveHealthy(): CellConfig {
      const state = this as CellStoreState
      return {
        ...state.healthy,
        conductivity:     state.healthy.conductivity     * this.healthyParam1Multiplier,
        thresholdVoltage: state.healthy.thresholdVoltage * this.healthyParam2Multiplier,
      }
    },

    // Target effective config. Schwan path scales (σ_i, V_th); resonance path scales (capsidQ, resonantThresholdVcm) instead, leaving σ_i / V_th at baseline since acoustic disruption is mechanical and bypasses the EP membrane-charging knobs.
    effectiveTarget(): CellConfig {
      const state = this as CellStoreState
      const mode  = this.targetCalibrationMode
      const m1    = this.targetParam1Multiplier
      const m2    = this.targetParam2Multiplier
      if (mode === 'resonance') {
        const t = state.target as CellConfig & { capsidQ?: number; resonantThresholdVcm?: number }
        const out: CellConfig & { capsidQ?: number; resonantThresholdVcm?: number } = { ...state.target }
        if (typeof t.capsidQ === 'number')              out.capsidQ              = t.capsidQ              * m1
        if (typeof t.resonantThresholdVcm === 'number') out.resonantThresholdVcm = t.resonantThresholdVcm * m2
        return out
      }
      return {
        ...state.target,
        conductivity:     state.target.conductivity     * m1,
        thresholdVoltage: state.target.thresholdVoltage * m2,
      }
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

    // True when mode + target cell together drive the acoustic-resonance physics path.
    isResonanceTarget(): boolean {
      const state = this as CellStoreState
      return isResonanceTargetActive(this.isResonanceMode, this.targetCellCategory, state.target)
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
      return computePulseEnvelope(this.effectiveHealthy, state.pulseWidthNs, this.effectiveSigmaE)
    },

    pulseEnvelopeFactorTarget(): number {
      const state = this as CellStoreState
      const isPulsed = state.waveform === WAVEFORM.PULSED || state.waveform === WAVEFORM.H_FIRE
      if (!isPulsed || this.isResonanceMode) return 1.0
      return computePulseEnvelope(this.effectiveTarget, state.pulseWidthNs, this.effectiveSigmaE)
    },

    healthyVm(): number {
      const state = this as CellStoreState
      const sigma_e = this.effectiveSigmaE
      const cosT = this.cosThetaFactor
      return computeSchwan(this.effectiveHealthy, state.currentBroadcastFrequency, state.fieldIntensity, sigma_e, cosT)
    },

    targetVm(): number {
      const state = this as CellStoreState
      const sigma_e = this.effectiveSigmaE
      const cosT = this.cosThetaFactor
      return computeSchwan(this.effectiveTarget, state.currentBroadcastFrequency, state.fieldIntensity, sigma_e, cosT)
    },

    healthyDisruptionRatio(): number {
      const state = this as CellStoreState
      const hfireMult = this.hFireMultiplier
      // Use effectiveHealthy.thresholdVoltage so the Schwan calibration's V_th multiplier propagates into the live DR. Vm already reads effectiveHealthy via targetVm/healthyVm getters.
      const vthEff = tempCorrectedVth(this.effectiveHealthy.thresholdVoltage, state.healthyTemp, this.effectivePulseCount)
      return (this.healthyVm * this.pulseEnvelopeFactorHealthy) / (vthEff * hfireMult)
    },

    targetDisruptionRatio(): number {
      const state = this as CellStoreState
      const cat = this.targetCellCategory
      // Resonance-path knobs (Q, V_thr_res) are calibrated via effectiveTarget — read from there, not from raw state.target. H-FIRE / electrosensitization do not apply on the resonance path (mechanical).
      const eT = this.effectiveTarget as CellConfig & { resonantFreqGHz?: number; capsidQ?: number; resonantThresholdVcm?: number; resonantFreqGHz2?: number; capsidQ2?: number; resonantMode2Amplitude?: number }
      const hfireMult = this.hFireMultiplier
      if (
        this.isResonanceMode &&
        (cat === CELL_CATEGORY.VIRUS || cat === CELL_CATEGORY.BACTERIA) &&
        eT.resonantFreqGHz && eT.resonantThresholdVcm
      ) {
        const effThreshold = tempCorrectedVth(eT.resonantThresholdVcm, state.targetTemp)
        return computeResonantDisruption(
          eT.resonantFreqGHz,
          eT.capsidQ ?? DEFAULT_CAPSID_Q,
          effThreshold,
          state.currentBroadcastFrequency * KHZ_TO_HZ,  // kHz → Hz
          state.fieldIntensity,
          eT.resonantFreqGHz2, eT.capsidQ2, eT.resonantMode2Amplitude,
        )
      }
      // Schwan path: V_th calibration multiplier reaches the live DR through effectiveTarget.thresholdVoltage.
      const vthEff = tempCorrectedVth(this.effectiveTarget.thresholdVoltage, state.targetTemp, this.effectivePulseCount)
      return (this.targetVm * this.pulseEnvelopeFactorTarget) / (vthEff * hfireMult)
    },

    healthySAR(): number {
      const state = this as CellStoreState
      const wf = state.waveform === WAVEFORM.CW ? WF_CW : WF_PULSED
      if (this.isResonanceMode) return computeIntracellularDebyeSAR(this.effectiveHealthy, state.fieldIntensity, state.currentBroadcastFrequency, wf)
      return computeSAR(this.effectiveHealthy, state.fieldIntensity, this.effectiveSigmaE, wf)
    },

    targetSAR(): number {
      const state = this as CellStoreState
      const wf = state.waveform === WAVEFORM.CW ? WF_CW : WF_PULSED
      if (this.isResonanceMode) return computeIntracellularDebyeSAR(this.effectiveTarget, state.fieldIntensity, state.currentBroadcastFrequency, wf)
      return computeSAR(this.effectiveTarget, state.fieldIntensity, this.effectiveSigmaE, wf)
    },

    healthyFc(): number {
      return computeFc(this.effectiveHealthy, this.effectiveSigmaE)
    },

    targetFc(): number {
      return computeFc(this.effectiveTarget, this.effectiveSigmaE)
    },

    selectivityRatio(): number {
      return this.therapeuticIndex
    },

    therapeuticIndex(): number {
      return safeRatio(this.targetDisruptionRatio, this.healthyDisruptionRatio, THRESHOLDS.TI_DISPLAY_CAP, NEAR_ZERO_DR)
    },

    // 68% TI band — Jacobian-propagated when a calibration fit exists, else literature σ_i prior. The fit's 2x2 covariance feeds first-order error propagation: σ²_TI = (J_T/DR_H)·Σ_T·... + (-DR_T/DR_H²·J_H)·Σ_H·.... Resonance-mode targets sweep (Q_min,Q_max) × f_res jitter as a structured prior.
    tiUncertaintyRange(): { low: number; high: number } {
      const state = this as CellStoreState
      const nominal = this.therapeuticIndex

      if (this.isResonanceMode) {
        const cat = this.targetCellCategory
        // Read resonance knobs from effectiveTarget so the calibration multiplier (Q × Q_mult, V_thr × V_thr_mult) applies. Q_min / Q_max literature bounds are width-preserving relative to baseline Q, so we scale them by the same multiplier as the central Q to keep the structural envelope coherent with the calibrated mean.
        const eT = this.effectiveTarget as CellConfig & {
          resonantFreqGHz?: number; capsidQ?: number
          capsidQMin?: number; capsidQMax?: number; resonantThresholdVcm?: number
          resonantFreqUncertaintyPct?: number; resonantFreqGHz2?: number; capsidQ2?: number; resonantMode2Amplitude?: number
        }
        const rawT = state.target as CellConfig & { capsidQMin?: number; capsidQMax?: number; capsidQ?: number }
        const qMult = (eT.capsidQ && rawT.capsidQ && rawT.capsidQ > 0) ? eT.capsidQ / rawT.capsidQ : 1.0
        if (
          (cat === CELL_CATEGORY.VIRUS || cat === CELL_CATEGORY.BACTERIA) &&
          eT.resonantFreqGHz && eT.resonantThresholdVcm &&
          rawT.capsidQMin !== undefined && rawT.capsidQMax !== undefined
        ) {
          const effThr    = tempCorrectedVth(eT.resonantThresholdVcm, state.targetTemp)
          const hDr      = this.healthyDisruptionRatio
          const freqHz   = state.currentBroadcastFrequency * KHZ_TO_HZ
          const fresPct  = eT.resonantFreqUncertaintyPct ?? 0
          const fresLo   = eT.resonantFreqGHz * (1 - fresPct / 100)
          const fresHi   = eT.resonantFreqGHz * (1 + fresPct / 100)
          const qGrid    = [rawT.capsidQMin * qMult, rawT.capsidQMax * qMult]
          const fresGrid = fresPct > 0 ? [fresLo, eT.resonantFreqGHz, fresHi] : [eT.resonantFreqGHz]
          let drTMin = Infinity, drTMax = -Infinity
          for (const q of qGrid) {
            for (const fres of fresGrid) {
              const dr = computeResonantDisruption(fres, q, effThr, freqHz, state.fieldIntensity, eT.resonantFreqGHz2, eT.capsidQ2, eT.resonantMode2Amplitude)
              if (dr < drTMin) drTMin = dr
              if (dr > drTMax) drTMax = dr
            }
          }
          const targetCov = this.targetCalibrationCovariance
          if (targetCov.cov11 > 0 || targetCov.cov22 > 0) {
            const fwdInput: ForwardDrInput = {
              cell: this.effectiveTarget, freqKHz: state.currentBroadcastFrequency, fieldVcm: state.fieldIntensity,
              sigma_e: this.effectiveSigmaE, cosTheta: this.cosThetaFactor, tempC: state.targetTemp,
              pulseWidthNs: state.pulseWidthNs, isPulsed: false, hfireMult: 1.0, effectivePulseCount: 1,
            }
            const jacT = jacobianResonantDR(fwdInput)
            const drT  = computeResonantDR(fwdInput)
            const sigmaDrT = Math.sqrt(propagateScalarVariance(jacT, targetCov))
            drTMin = Math.min(drTMin, drT - sigmaDrT)
            drTMax = Math.max(drTMax, drT + sigmaDrT)
          }
          const tiFromDr = (dr: number) => safeRatio(Math.max(0, dr), hDr, THRESHOLDS.TI_DISPLAY_CAP, NEAR_ZERO_DR)
          return { low: tiFromDr(drTMin), high: tiFromDr(drTMax) }
        }
        return { low: nominal, high: nominal }
      }

      // Schwan path: full Jacobian propagation across (σ_i, V_th) on both cells.
      const drT  = this.targetDisruptionRatio
      const drH  = this.healthyDisruptionRatio
      if (drH <= NEAR_ZERO_DR) return { low: nominal, high: nominal }

      const targetCov  = this.targetCalibrationCovariance
      const healthyCov = this.healthyCalibrationCovariance
      const hasCov     = targetCov.cov11 > 0 || targetCov.cov22 > 0 || healthyCov.cov11 > 0 || healthyCov.cov22 > 0

      const tInput: ForwardDrInput = {
        cell: this.effectiveTarget, freqKHz: state.currentBroadcastFrequency, fieldVcm: state.fieldIntensity,
        sigma_e: this.effectiveSigmaE, cosTheta: this.cosThetaFactor, tempC: state.targetTemp,
        pulseWidthNs: state.pulseWidthNs, isPulsed: state.waveform !== WAVEFORM.CW,
        hfireMult: this.hFireMultiplier, effectivePulseCount: this.effectivePulseCount,
      }
      const hInput: ForwardDrInput = {
        cell: this.effectiveHealthy, freqKHz: state.currentBroadcastFrequency, fieldVcm: state.fieldIntensity,
        sigma_e: this.effectiveSigmaE, cosTheta: this.cosThetaFactor, tempC: state.healthyTemp,
        pulseWidthNs: state.pulseWidthNs, isPulsed: state.waveform !== WAVEFORM.CW,
        hfireMult: this.hFireMultiplier, effectivePulseCount: this.effectivePulseCount,
      }
      const jacT = jacobianSchwanDR(tInput)
      const jacH = jacobianSchwanDR(hInput)

      let sigmaTi: number
      if (hasCov) {
        sigmaTi = Math.sqrt(propagatedTiVariance(drT, drH, jacT, jacH, targetCov, healthyCov))
      } else {
        // Fall back to the literature radius-based σ_i prior — propagate it as the σ on a σ_i_multiplier (cov_11 = unc²; V_th covariance stays 0).
        const uncH = computeSigmaUncertaintyFactor(state.healthy.radius)
        const uncT = computeSigmaUncertaintyFactor(state.target.radius)
        const priorT: CalibrationCovariance = { cov11: uncT * uncT, cov12: 0, cov22: 0 }
        const priorH: CalibrationCovariance = { cov11: uncH * uncH, cov12: 0, cov22: 0 }
        sigmaTi = Math.sqrt(propagatedTiVariance(drT, drH, jacT, jacH, priorT, priorH))
      }

      const tiLow  = Math.max(0,                       nominal - sigmaTi)
      const tiHigh = Math.min(THRESHOLDS.TI_DISPLAY_CAP, nominal + sigmaTi)
      return { low: tiLow, high: tiHigh }
    },

    healthyNuclearVm(): number {
      const state = this as CellStoreState
      if (!state.healthy.nuclearRadius) return 0
      const sigma_e = this.effectiveSigmaE
      const cosT    = this.cosThetaFactor
      return computeNuclearVm(this.effectiveHealthy, state.currentBroadcastFrequency, state.fieldIntensity, sigma_e, cosT)
    },

    targetNuclearVm(): number {
      const state = this as CellStoreState
      if (!state.target.nuclearRadius) return 0
      const sigma_e = this.effectiveSigmaE
      const cosT    = this.cosThetaFactor
      return computeNuclearVm(this.effectiveTarget, state.currentBroadcastFrequency, state.fieldIntensity, sigma_e, cosT)
    },

    healthyNuclearFpeakKHz(): number {
      const state   = this as CellStoreState
      if (!state.healthy.nuclearRadius) return 0
      const sigma_e = this.effectiveSigmaE
      const tauOut  = computeTau(this.effectiveHealthy, sigma_e)
      const tauNe   = computeNuclearTau(this.effectiveHealthy, sigma_e)
      if (tauOut <= 0 || tauNe <= 0) return 0
      return 1 / (TWO_PI * Math.sqrt(tauOut * tauNe) * 1e3)
    },

    targetNuclearFpeakKHz(): number {
      const state   = this as CellStoreState
      if (!state.target.nuclearRadius) return 0
      const sigma_e = this.effectiveSigmaE
      const tauOut  = computeTau(this.effectiveTarget, sigma_e)
      const tauNe   = computeNuclearTau(this.effectiveTarget, sigma_e)
      if (tauOut <= 0 || tauNe <= 0) return 0
      return 1 / (TWO_PI * Math.sqrt(tauOut * tauNe) * 1e3)
    },

    healthyNuclearDisruptionRatio(): number {
      const state     = this as CellStoreState
      const vth       = tempCorrectedVth(state.healthy.nuclearThresholdVoltage ?? THRESHOLDS.NUCLEAR_VM_DEFAULT, state.healthyTemp, this.effectivePulseCount)
      const hfireMult = this.hFireMultiplier
      // Gate by outer PEF so nuclear DR → 0 for t_p << τ_out.
      return (this.healthyNuclearVm * this.pulseEnvelopeFactorHealthy) / (vth * hfireMult)
    },

    targetNuclearDisruptionRatio(): number {
      const state     = this as CellStoreState
      const vth       = tempCorrectedVth(state.target.nuclearThresholdVoltage ?? THRESHOLDS.NUCLEAR_VM_DEFAULT, state.targetTemp, this.effectivePulseCount)
      const hfireMult = this.hFireMultiplier
      return (this.targetNuclearVm * this.pulseEnvelopeFactorTarget) / (vth * hfireMult)
    },

    nuclearSelectivityRatio(): number {
      return safeRatio(this.targetNuclearDisruptionRatio, this.healthyNuclearDisruptionRatio, THRESHOLDS.TI_DISPLAY_CAP, NEAR_ZERO_DR)
    },

    targetLysisField(): number {
      const state     = this as CellStoreState
      const hfireMult = this.hFireMultiplier
      return computeLysisField(this.effectiveTarget, state.currentBroadcastFrequency, this.effectiveSigmaE, this.cosThetaFactor, this.pulseEnvelopeFactorTarget, hfireMult, state.targetTemp, this.effectivePulseCount)
    },

    healthyLysisField(): number {
      const state     = this as CellStoreState
      const hfireMult = this.hFireMultiplier
      return computeLysisField(this.effectiveHealthy, state.currentBroadcastFrequency, this.effectiveSigmaE, this.cosThetaFactor, this.pulseEnvelopeFactorHealthy, hfireMult, state.healthyTemp, this.effectivePulseCount)
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
      // P_vol = σ_e·E²_rms [W/m³] × tp [s] → J/m³. No dutyCycle: σ_e·E²·tp·dc = tp²/T is meaningless.
      const energyDensity_J_m3 = this.effectiveSigmaE * E_si ** 2 * wf * tp_s
      return energyDensity_J_m3 * J_M3_TO_MJ_CM3
    },

    mediumJouleHeatingSAR(): number {
      const state = this as CellStoreState
      const wf   = state.waveform === WAVEFORM.CW ? WF_CW : WF_PULSED
      const E_si = state.fieldIntensity * V_CM_TO_V_M
      // σ_eff = σ_dc + ω·ε₀·ε″(ω); Debye term ~0 at kHz-MHz but dominates at GHz (needed or medium heating reads 0).
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
      return computeDepCmReal(this.effectiveHealthy, state.currentBroadcastFrequency, this.effectiveSigmaE, eps_r)
    },

    depTargetCmReal(): number {
      const state = this as CellStoreState
      const eps_r = MEDIA[state.medium].permittivity
      return computeDepCmReal(this.effectiveTarget, state.currentBroadcastFrequency, this.effectiveSigmaE, eps_r)
    },

    depHealthyCrossoverKHz(): number {
      const state = this as CellStoreState
      const eps_r = MEDIA[state.medium].permittivity
      return computeDepCrossoverKHz(this.effectiveHealthy, this.effectiveSigmaE, eps_r)
    },

    depTargetCrossoverKHz(): number {
      const state = this as CellStoreState
      const eps_r = MEDIA[state.medium].permittivity
      return computeDepCrossoverKHz(this.effectiveTarget, this.effectiveSigmaE, eps_r)
    },

    depHealthySecondCrossoverKHz(): number {
      const state = this as CellStoreState
      const eps_r = MEDIA[state.medium].permittivity
      return computeDepSecondCrossoverKHz(this.effectiveHealthy, this.effectiveSigmaE, eps_r)
    },

    depTargetSecondCrossoverKHz(): number {
      const state = this as CellStoreState
      const eps_r = MEDIA[state.medium].permittivity
      return computeDepSecondCrossoverKHz(this.effectiveTarget, this.effectiveSigmaE, eps_r)
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
      const state    = this as CellStoreState
      // Read all calibratable knobs from effectives so the optimum reflects the closed-loop fit. Resonance path uses (Q, V_thr_res); Schwan path uses (σ_i, V_th).
      const eT = this.effectiveTarget as CellConfig & { resonantFreqGHz?: number; resonantThresholdVcm?: number; capsidQ?: number; resonantFreqGHz2?: number; capsidQ2?: number; resonantMode2Amplitude?: number }
      const eH = this.effectiveHealthy
      const cat    = this.targetCellCategory

      if (
        this.isResonanceMode &&
        (cat === CELL_CATEGORY.VIRUS || cat === CELL_CATEGORY.BACTERIA) &&
        eT.resonantFreqGHz && eT.resonantThresholdVcm
      ) {
        const effThr    = tempCorrectedVth(eT.resonantThresholdVcm, state.targetTemp)
        const sigma_e   = this.effectiveSigmaE
        const hfireMult = this.hFireMultiplier
        const hThr      = tempCorrectedVth(eH.thresholdVoltage, state.healthyTemp, this.effectivePulseCount) * hfireMult
        // Pick best peak between mode 1 / mode 2; higher-f mode wins when healthy Schwan rolls off past fc.
        const selAt = (fresGHz: number): { khz: number; sel: number } => {
          const khz = fresGHz * 1e6
          const drT = computeResonantDisruption(
            eT.resonantFreqGHz!, eT.capsidQ ?? DEFAULT_CAPSID_Q, effThr,
            khz * KHZ_TO_HZ, state.fieldIntensity,
            eT.resonantFreqGHz2, eT.capsidQ2, eT.resonantMode2Amplitude,
          )
          const hVm = computeSchwan(eH, khz, state.fieldIntensity, sigma_e, this.cosThetaFactor)
          const drH = (hVm * this.pulseEnvelopeFactorHealthy) / hThr
          return { khz, sel: safeRatio(drT, drH, THRESHOLDS.TI_DISPLAY_CAP, NEAR_ZERO_DR) }
        }
        const candidates = [selAt(eT.resonantFreqGHz)]
        if (eT.resonantFreqGHz2) candidates.push(selAt(eT.resonantFreqGHz2))
        return candidates.reduce((best, c) => c.sel > best.sel ? c : best)
      }

      // Cache key includes calibrated σ_i AND V_th so a calibration update (either knob) busts the scan. Without V_th here, a Vₜₕ-only fit would silently leave a stale optimum.
      const sigma_e = this.effectiveSigmaE
      const cacheKey = [
        state.healthy.id, state.healthy.radius, state.healthy.membraneThickness,
        state.healthy.dielectricConstant, eH.conductivity, eH.thresholdVoltage,
        state.target.id, state.target.radius, state.target.membraneThickness,
        state.target.dielectricConstant, eT.conductivity, eT.thresholdVoltage,
        state.waveform, state.dutyCycle, state.pulseWidthNs, state.chartMode,
        this.effectivePulseCount,
        Math.round(sigma_e * 1e6),  // µS/m precision — avoids misses from tiny temp-driven σ_e drift
        Math.round(state.healthyTemp * 10), Math.round(state.targetTemp * 10),
      ].join('|')

      if (_optFreqCache?.key === cacheKey) return _optFreqCache.result

      const hfireMult = this.hFireMultiplier
      const hThr = tempCorrectedVth(eH.thresholdVoltage, state.healthyTemp, this.effectivePulseCount) * hfireMult
      const tThr = tempCorrectedVth(eT.thresholdVoltage, state.targetTemp,  this.effectivePulseCount) * hfireMult
      const pefH = this.pulseEnvelopeFactorHealthy
      const pefT = this.pulseEnvelopeFactorTarget
      // cosTheta and field cancel in the tDr/hDr ratio — use unit field to avoid a reactive dependency on fieldIntensity that would bust the cache on every field slider move.
      const UNIT_FIELD = 1.0
      const logMin = Math.log10(10), logMax = Math.log10(500_000)
      const { khz: optKhz, sel: maxSel } = Array.from({ length: 300 }, (_, i) => {
        const khz = Math.pow(10, logMin + (logMax - logMin) * i / 299)
        const hDr = (computeSchwan(eH, khz, UNIT_FIELD, sigma_e) * pefH) / hThr
        const tDr = (computeSchwan(eT, khz, UNIT_FIELD, sigma_e) * pefT) / tThr
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

    // True when low σe drops both fc below slider min — TI underestimates quasi-DC selectivity.
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

    // High-f TI asymptote (R_T·τ_H·Vth_H)/(R_H·τ_T·Vth_T); sub-unity when target rolls off faster. Schwan/IRE only. All four factors come from the calibrated effectives so the limit honours the closed-loop fit.
    tiHighFreqLimit(): number {
      const state = this as CellStoreState
      const sigma_e = this.effectiveSigmaE
      const eT      = this.effectiveTarget
      const eH      = this.effectiveHealthy
      const tauT = computeTau(eT, sigma_e)
      const tauH = computeTau(eH, sigma_e)
      const vthT = tempCorrectedVth(eT.thresholdVoltage, state.targetTemp,  this.effectivePulseCount)
      const vthH = tempCorrectedVth(eH.thresholdVoltage, state.healthyTemp, this.effectivePulseCount)
      if (tauT <= 0 || vthT <= 0) return 0
      return (eT.radius * tauH * vthH) / (eH.radius * tauT * vthT)
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
      // Schwan DR includes cosθ; recover DR_max = DR/cosθ for P = max(0, 1 − 1/DR_max). Resonance is orientation-independent.
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
      // Cap 1000, not slider's 200, so legacy saves don't truncate; past ~190 the Vth clamp makes it a no-op anyway.
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
    // Persist cell identities + model assumptions only; field/frequency/waveform re-derive on mount.
    pick: [
      'healthy',
      'target',
      'doubleShellEnabled',
      'perfusionRate',
      'cellPackingFraction',
    ],
  },
})
