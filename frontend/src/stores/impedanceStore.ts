// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

// Tracks cuvette geometry, simulates σ_e drift from lysis, accepts live instrument readings.

import { defineStore } from 'pinia'

import { useCellStore } from '@/stores/cellStore'

import {
  lysedFractionFromDR,
  computeCellVolumeFraction,
  computeLysedSigmaE,
  computeCuvetteDCImpedance,
  computeCuvetteComplexImpedanceMag,
  computeRelaxationFreqHz,
  computeReflectionCoeff,
  computeVSWR,
  computePowerDeliveryEfficiency,
  computeMediumJouleHeatingWatts,
  computeMediumTempRiseRatePerSec,
  computeFieldDistortionFactor,
  computeCuvetteRCTimeConstantNs,
  computeCorrectedFieldVcm,
  computeSigmaEFromImpedance,
} from '@/utils/impedance'

import { LOAD_STATE, FIELD_DISTORTION, PULSE_BW_STATUS } from '@/constants/strings'
import type { LoadState, FieldDistortion, PulseBwStatus } from '@/constants/strings'
import {
  CUVETTE_PRESETS,
  CUSTOM_CUVETTE_ID,
  DEFAULT_CUVETTE_ID,
  DEFAULT_SOURCE_IMPEDANCE_OHM,
  DEFAULT_CELL_DENSITY_PER_ML,
  HARDWARE_READING_STALE_MS,
  IMPEDANCE_HISTORY_MAX,
  CONDUCTIVITY_SAMPLE_MAX,
} from '@/constants/cuvette'

// ── Public types ───────────────────────────────────────────────────────────────

export interface HardwareImpedancePacket {
  zReal:        number   // real part [Ω]
  zImag:        number   // imaginary part [Ω] (negative = capacitive)
  freqHz:       number   // measurement frequency [Hz]
  conductivity?: number  // σ_e [S/m] if provided directly by instrument
  timestamp:    number   // Unix ms
}

export interface ImpedanceHistoryPoint {
  ts:     number  // Unix ms
  zOhm:  number  // measured or simulated Z [Ω]
  sigmaE: number  // derived σ_e [S/m]
}

export interface ConductivitySample {
  ts:       number  // Unix ms
  sigmaE:   number  // effective σ_e at this moment [S/m]
  zOhm:     number  // cuvette impedance at this moment [Ω]
  driftPct: number  // impedance drift % relative to nominal
}

// ── State interface ────────────────────────────────────────────────────────────

interface ImpedanceStoreState {
  // Cuvette geometry
  cuvettePresetId:       string
  cuvetteGapMm:          number   // electrode gap [mm]
  cuvetteCrossSectionCm2: number  // electrode cross-section [cm²]
  sourceImpedanceOhm:    number   // R_source, generator + cable [Ω]
  cellDensityPerMl:      number   // target cell seeding density [cells/mL]
  // Hardware input
  hardwareModeEnabled:   boolean
  hardwareZReal:         number | null  // last measured Z_real [Ω]
  hardwareZImag:         number | null  // last measured Z_imag [Ω]
  hardwareFreqHz:        number | null  // measurement frequency [Hz]
  hardwareReadingTs:     number         // Unix ms of last reading (0 = never)
  // History ring buffer for the trend sparkline
  impedanceHistory:      ImpedanceHistoryPoint[]
  // Continuous auto-sample ring buffer for the Load Monitor chart
  conductivitySamples:   ConductivitySample[]
}

// ── Store ──────────────────────────────────────────────────────────────────────

export const useImpedanceStore = defineStore('impedance', {
  state: (): ImpedanceStoreState => {
    const preset = CUVETTE_PRESETS.find(p => p.id === DEFAULT_CUVETTE_ID)!
    return {
      cuvettePresetId:        DEFAULT_CUVETTE_ID,
      cuvetteGapMm:           preset.gapMm,
      cuvetteCrossSectionCm2: preset.crossSectionCm2,
      sourceImpedanceOhm:     DEFAULT_SOURCE_IMPEDANCE_OHM,
      cellDensityPerMl:       DEFAULT_CELL_DENSITY_PER_ML,
      hardwareModeEnabled:    false,
      hardwareZReal:          null,
      hardwareZImag:          null,
      hardwareFreqHz:         null,
      hardwareReadingTs:      0,
      impedanceHistory:       [],
      conductivitySamples:    [],
    }
  },

  getters: {
    lysedFraction(): number {
      return lysedFractionFromDR(useCellStore().targetDisruptionRatio)
    },

    cellVolumeFraction(): number {
      const s = this as ImpedanceStoreState
      return computeCellVolumeFraction(s.cellDensityPerMl, useCellStore().target.radius)
    },

    sigmaEWithLysis(): number {
      const cellStore = useCellStore()
      const sigmaBase = cellStore.effectiveSigmaE
      const f = this.lysedFraction
      if (f < 1e-4) return sigmaBase
      return computeLysedSigmaE(sigmaBase, cellStore.target.conductivity, this.cellVolumeFraction, f)
    },

    sigmaEForImpedance(): number {
      const s = this as ImpedanceStoreState
      if (s.hardwareModeEnabled && s.hardwareZReal !== null) {
        return computeSigmaEFromImpedance(s.cuvetteGapMm, s.cuvetteCrossSectionCm2, s.hardwareZReal)
      }
      return this.sigmaEWithLysis
    },

    nominalImpedanceOhm(): number {
      const s = this as ImpedanceStoreState
      return computeCuvetteDCImpedance(s.cuvetteGapMm, s.cuvetteCrossSectionCm2, useCellStore().effectiveSigmaE)
    },

    currentImpedanceOhm(): number {
      const s = this as ImpedanceStoreState
      if (s.hardwareModeEnabled && s.hardwareZReal !== null) return s.hardwareZReal
      return computeCuvetteDCImpedance(s.cuvetteGapMm, s.cuvetteCrossSectionCm2, this.sigmaEWithLysis)
    },

    impedanceDriftPct(): number {
      const nominal = this.nominalImpedanceOhm
      if (nominal <= 0) return 0
      return ((this.currentImpedanceOhm - nominal) / nominal) * 100
    },

    // V_gen/V_cuvette — values >1 mean the generator must output more to compensate mismatch
    voltageCorrectionFactor(): number {
      const s = this as ImpedanceStoreState
      const Z = this.currentImpedanceOhm
      if (Z <= 0) return 1
      return 1 + s.sourceImpedanceOhm / Z
    },

    correctedFieldVcm(): number {
      const s = this as ImpedanceStoreState
      return computeCorrectedFieldVcm(useCellStore().fieldIntensity, this.currentImpedanceOhm, s.sourceImpedanceOhm)
    },

    hardwareReadingIsStale(): boolean {
      const s = this as ImpedanceStoreState
      if (!s.hardwareModeEnabled || s.hardwareZReal === null) return false
      return Date.now() - s.hardwareReadingTs > HARDWARE_READING_STALE_MS
    },

    hardwareReadingAgeMs(): number {
      const s = this as ImpedanceStoreState
      if (s.hardwareReadingTs === 0) return Infinity
      return Date.now() - s.hardwareReadingTs
    },

    conductivityDeltaAbs(): number {
      return this.sigmaEWithLysis - useCellStore().effectiveSigmaE
    },

    loadState(): LoadState {
      const drift = Math.abs(this.impedanceDriftPct)
      if (drift < 5)  return LOAD_STATE.NOMINAL
      if (drift < 15) return LOAD_STATE.WARNING
      return LOAD_STATE.CRITICAL
    },

    currentImpedanceMagAtFreqOhm(): number {
      const s = this as ImpedanceStoreState
      if (s.hardwareModeEnabled && s.hardwareZReal !== null) {
        // Hardware mode: use |Z| from instrument (real + imag components)
        const zImag = s.hardwareZImag ?? 0
        return Math.sqrt(s.hardwareZReal ** 2 + zImag ** 2)
      }
      const freqHz = useCellStore().currentBroadcastFrequency * 1e3  // kHz → Hz
      return computeCuvetteComplexImpedanceMag(
        s.cuvetteGapMm,
        s.cuvetteCrossSectionCm2,
        this.sigmaEWithLysis,
        freqHz,
      )
    },

    relaxationFreqMHz(): number {
      return computeRelaxationFreqHz(this.sigmaEWithLysis) / 1e6
    },

    reflectionCoeff(): number {
      const s = this as ImpedanceStoreState
      return computeReflectionCoeff(this.currentImpedanceMagAtFreqOhm, s.sourceImpedanceOhm)
    },

    vswr(): number {
      const s = this as ImpedanceStoreState
      return computeVSWR(this.currentImpedanceMagAtFreqOhm, s.sourceImpedanceOhm)
    },

    powerDeliveryEfficiency(): number {
      const s = this as ImpedanceStoreState
      return computePowerDeliveryEfficiency(this.currentImpedanceMagAtFreqOhm, s.sourceImpedanceOhm)
    },

    mediumJouleHeatingMilliWatts(): number {
      const s       = this as ImpedanceStoreState
      const cellStore = useCellStore()
      return computeMediumJouleHeatingWatts(
        cellStore.fieldIntensity,
        this.sigmaEWithLysis,
        s.cuvetteGapMm,
        s.cuvetteCrossSectionCm2,
      ) * 1000  // W → mW
    },

    mediumTempRiseRatePerSec(): number {
      return computeMediumTempRiseRatePerSec(
        useCellStore().fieldIntensity,
        this.sigmaEWithLysis,
      )
    },

    isLowImpedanceSource(): boolean {
      const s = this as ImpedanceStoreState
      return s.sourceImpedanceOhm < 5
    },

    fieldDistortionFactor(): number {
      return computeFieldDistortionFactor(this.cellVolumeFraction)
    },

    fieldDistortionLevel(): FieldDistortion {
      const phi = this.cellVolumeFraction
      if (phi < 0.01) return FIELD_DISTORTION.NONE
      if (phi < 0.05) return FIELD_DISTORTION.MINOR
      return FIELD_DISTORTION.SIGNIFICANT
    },

    cuvetteRCTimeConstantNs(): number {
      return computeCuvetteRCTimeConstantNs(this.sigmaEWithLysis)
    },

    pulseToRCRatio(): number {
      const tau = this.cuvetteRCTimeConstantNs
      if (!isFinite(tau) || tau <= 0) return Infinity
      return useCellStore().pulseWidthNs / tau
    },

    pulseBandwidthStatus(): PulseBwStatus {
      const cellStore = useCellStore()
      if (cellStore.waveform !== 'pulsed') return PULSE_BW_STATUS.CW
      const ratio = this.pulseToRCRatio
      if (ratio > 5)  return PULSE_BW_STATUS.OK
      if (ratio >= 1) return PULSE_BW_STATUS.MARGINAL
      return PULSE_BW_STATUS.CRITICAL
    },
  },

  actions: {
    setCuvettePreset(id: string) {
      const preset = CUVETTE_PRESETS.find(p => p.id === id)
      if (!preset) return
      this.cuvettePresetId = id
      if (id !== CUSTOM_CUVETTE_ID) {
        this.cuvetteGapMm           = preset.gapMm
        this.cuvetteCrossSectionCm2 = preset.crossSectionCm2
      }
    },

    setCuvetteGapMm(mm: number) {
      this.cuvetteGapMm    = Math.max(0.5, Math.min(10, mm))
      this.cuvettePresetId = CUSTOM_CUVETTE_ID
    },

    setCuvetteCrossSectionCm2(cm2: number) {
      this.cuvetteCrossSectionCm2 = Math.max(0.01, Math.min(2, cm2))
      this.cuvettePresetId        = CUSTOM_CUVETTE_ID
    },

    setSourceImpedanceOhm(ohm: number) {
      this.sourceImpedanceOhm = Math.max(0, Math.min(1000, ohm))
    },

    setCellDensityPerMl(n: number) {
      this.cellDensityPerMl = Math.max(1e3, Math.min(1e9, n))
    },

    toggleHardwareMode() {
      this.hardwareModeEnabled = !this.hardwareModeEnabled
    },

    handleHardwareImpedancePacket(packet: HardwareImpedancePacket) {
      this.hardwareZReal     = packet.zReal
      this.hardwareZImag     = packet.zImag
      this.hardwareFreqHz    = packet.freqHz
      this.hardwareReadingTs = packet.timestamp

      const point: ImpedanceHistoryPoint = {
        ts:     packet.timestamp,
        zOhm:  packet.zReal,
        sigmaE: computeSigmaEFromImpedance(this.cuvetteGapMm, this.cuvetteCrossSectionCm2, packet.zReal),
      }
      this.impedanceHistory.push(point)
      if (this.impedanceHistory.length > IMPEDANCE_HISTORY_MAX) {
        this.impedanceHistory.shift()
      }
    },

    snapshotSimulatedReading() {
      const point: ImpedanceHistoryPoint = {
        ts:     Date.now(),
        zOhm:  this.currentImpedanceOhm,
        sigmaE: this.sigmaEForImpedance,
      }
      this.impedanceHistory.push(point)
      if (this.impedanceHistory.length > IMPEDANCE_HISTORY_MAX) {
        this.impedanceHistory.shift()
      }
    },

    addConductivitySample() {
      const sample: ConductivitySample = {
        ts:       Date.now(),
        sigmaE:   this.sigmaEForImpedance,
        zOhm:     this.currentImpedanceOhm,
        driftPct: this.impedanceDriftPct,
      }
      this.conductivitySamples.push(sample)
      if (this.conductivitySamples.length > CONDUCTIVITY_SAMPLE_MAX) {
        this.conductivitySamples.shift()
      }
    },

    clearConductivitySamples() {
      this.conductivitySamples = []
    },
  },
})
