// Copyright © 2026 Tomer Preis. All rights reserved.
// Unauthorized copying or distribution is prohibited.

/**
 * Impedance Store - Real-Time Impedance Feedback
 *
 * Tracks cuvette geometry, simulates medium conductivity drift as target cells
 * lyse (ion release model), computes the corrected field intensity needed to
 * maintain constant transmembrane voltage, and optionally accepts live
 * impedance measurements from a lab instrument via the socket 'impedanceReading' event.
 *
 * Physics references:
 *  - Ion release: Neumann et al. (1989) - dense suspension electroporation
 *  - Voltage divider: standard RF circuit theory (source impedance matching)
 */

import { defineStore } from 'pinia'
import { useCellStore } from '@/stores/cellStore'
import { LOAD_STATE } from '@/constants/strings'
import type { LoadState } from '@/constants/strings'
import {
  CUVETTE_PRESETS,
  DEFAULT_CUVETTE_ID,
  DEFAULT_SOURCE_IMPEDANCE_OHM,
  DEFAULT_CELL_DENSITY_PER_ML,
  HARDWARE_READING_STALE_MS,
  IMPEDANCE_HISTORY_MAX,
  CONDUCTIVITY_SAMPLE_MAX,
} from '@/constants/cuvette'
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

// ── Public types ───────────────────────────────────────────────────────────────

/**
 * Packet emitted by a lab impedance instrument (LCR meter, VNA, etc.)
 * and forwarded through the socket server to all connected UI clients.
 *
 * PoC schema - real instruments can be integrated by mapping their output
 * to this JSON structure.  All fields except conductivity are required.
 */
export interface HardwareImpedancePacket {
  /** Real part of measured impedance [Ω] */
  zReal:        number
  /** Imaginary part of measured impedance [Ω] - negative = capacitive */
  zImag:        number
  /** Frequency at which the measurement was taken [Hz] */
  freqHz:       number
  /** Conductivity [S/m] - optionally provided directly by instrument */
  conductivity?: number
  /** Unix timestamp [ms] when the reading was captured */
  timestamp:    number
}

export interface ImpedanceHistoryPoint {
  ts:     number  // Unix ms
  zOhm:  number  // measured or simulated Z [Ω]
  sigmaE: number  // derived σ_e [S/m]
}

/**
 * A continuously auto-sampled data point for the Load Monitor chart.
 * Captured every CONDUCTIVITY_SAMPLE_INTERVAL_MS by the LoadMonitor component.
 */
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
    /** Fraction of target cells lysed (0-1) derived from Schwan disruption ratio. */
    lysedFraction(): number {
      return lysedFractionFromDR(useCellStore().targetDisruptionRatio)
    },

    /** Cell volume fraction φ - dimensionless, from seeding density × cell volume. */
    cellVolumeFraction(): number {
      const s = this as unknown as ImpedanceStoreState
      return computeCellVolumeFraction(s.cellDensityPerMl, useCellStore().target.radius)
    },

    /**
     * σ_e corrected for ion release from lysed target cells [S/m].
     * Returns base σ_e when lysed fraction is negligible.
     */
    sigmaEWithLysis(): number {
      const cellStore = useCellStore()
      const sigmaBase = cellStore.effectiveSigmaE
      const f = this.lysedFraction
      if (f < 1e-4) return sigmaBase
      return computeLysedSigmaE(sigmaBase, cellStore.target.conductivity, this.cellVolumeFraction, f)
    },

    /**
     * Effective σ_e for impedance calculations.
     * Hardware mode + fresh reading → derived from Z_real measurement.
     * Otherwise → simulation (ion-release model).
     */
    sigmaEForImpedance(): number {
      const s = this as unknown as ImpedanceStoreState
      if (s.hardwareModeEnabled && s.hardwareZReal !== null) {
        return computeSigmaEFromImpedance(s.cuvetteGapMm, s.cuvetteCrossSectionCm2, s.hardwareZReal)
      }
      return this.sigmaEWithLysis
    },

    /** Nominal cuvette impedance at experiment start (fresh medium, no lysis) [Ω]. */
    nominalImpedanceOhm(): number {
      const s = this as unknown as ImpedanceStoreState
      return computeCuvetteDCImpedance(s.cuvetteGapMm, s.cuvetteCrossSectionCm2, useCellStore().effectiveSigmaE)
    },

    /**
     * Current cuvette impedance - accounts for lysis-induced σ_e rise
     * or is overridden by the live hardware Z_real reading [Ω].
     */
    currentImpedanceOhm(): number {
      const s = this as unknown as ImpedanceStoreState
      if (s.hardwareModeEnabled && s.hardwareZReal !== null) return s.hardwareZReal
      return computeCuvetteDCImpedance(s.cuvetteGapMm, s.cuvetteCrossSectionCm2, this.sigmaEWithLysis)
    },

    /** Impedance drift relative to nominal [%]. Negative = Z fell (σ_e rose). */
    impedanceDriftPct(): number {
      const nominal = this.nominalImpedanceOhm
      if (nominal <= 0) return 0
      return ((this.currentImpedanceOhm - nominal) / nominal) * 100
    },

    /**
     * Voltage correction factor: ratio of generator output voltage needed
     * to actual cuvette voltage.  Values > 1 mean the generator must output
     * more voltage to compensate for the impedance mismatch.
     */
    voltageCorrectionFactor(): number {
      const s = this as unknown as ImpedanceStoreState
      const Z = this.currentImpedanceOhm
      if (Z <= 0) return 1
      return 1 + s.sourceImpedanceOhm / Z
    },

    /**
     * Generator-side field that must be set to deliver store.fieldIntensity
     * inside the cuvette [V/cm].
     */
    correctedFieldVcm(): number {
      const s = this as unknown as ImpedanceStoreState
      return computeCorrectedFieldVcm(useCellStore().fieldIntensity, this.currentImpedanceOhm, s.sourceImpedanceOhm)
    },

    /** True when hardware mode is on but the last reading is older than HARDWARE_READING_STALE_MS. */
    hardwareReadingIsStale(): boolean {
      const s = this as unknown as ImpedanceStoreState
      if (!s.hardwareModeEnabled || s.hardwareZReal === null) return false
      return Date.now() - s.hardwareReadingTs > HARDWARE_READING_STALE_MS
    },

    /** Milliseconds since the last hardware reading (Infinity if never received). */
    hardwareReadingAgeMs(): number {
      const s = this as unknown as ImpedanceStoreState
      if (s.hardwareReadingTs === 0) return Infinity
      return Date.now() - s.hardwareReadingTs
    },

    /** Human-readable age string for the last hardware reading. */
    hardwareReadingAgeLabel(): string {
      const age = this.hardwareReadingAgeMs
      if (!isFinite(age)) return 'No reading'
      if (age < 1000)   return `${age} ms ago`
      if (age < 60_000) return `${(age / 1000).toFixed(1)}s ago`
      return `${Math.floor(age / 60_000)} min ago`
    },

    /**
     * Absolute change in medium conductivity due to ion release from lysed cells [S/m].
     * Positive = conductivity rose (low-σ media, cytoplasm σ_i > σ_base).
     * Negative = conductivity fell (high-σ media like saline, σ_i < σ_base).
     */
    conductivityDeltaAbs(): number {
      return this.sigmaEWithLysis - useCellStore().effectiveSigmaE
    },

    /**
     * Qualitative load state derived from absolute impedance drift.
     * Nominal: |drift| < 5% - no correction needed.
     * Warning: 5% ≤ |drift| < 15% - minor correction recommended.
     * Critical: |drift| ≥ 15% - significant drift; correction essential.
     */
    loadState(): LoadState {
      const drift = Math.abs(this.impedanceDriftPct)
      if (drift < 5)  return LOAD_STATE.NOMINAL
      if (drift < 15) return LOAD_STATE.WARNING
      return LOAD_STATE.CRITICAL
    },

    /**
     * Frequency-dependent complex impedance magnitude |Z(f)| at the current
     * broadcast frequency [Ω].
     *
     * Uses the full complex formula Z(f) = (d/A)/(σ_e + jωεε₀) rather than
     * the DC approximation.  At f ≪ f_relax (~365 MHz for saline) the two
     * agree; at GHz range the capacitive reactance dominates and |Z| drops.
     */
    currentImpedanceMagAtFreqOhm(): number {
      const s = this as unknown as ImpedanceStoreState
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

    /**
     * Maxwell relaxation frequency of the current medium [MHz].
     * DC impedance formula is valid only for f ≪ f_relax.
     */
    relaxationFreqMHz(): number {
      return computeRelaxationFreqHz(this.sigmaEWithLysis) / 1e6
    },

    /**
     * Voltage reflection coefficient Γ [0-1] between generator source impedance
     * and the cuvette load at the current broadcast frequency.
     * Relevant for RF mode (50 Ω source); negligible for IRE pulsers (< 1 Ω).
     */
    reflectionCoeff(): number {
      const s = this as unknown as ImpedanceStoreState
      return computeReflectionCoeff(this.currentImpedanceMagAtFreqOhm, s.sourceImpedanceOhm)
    },

    /**
     * Voltage Standing Wave Ratio (VSWR) between generator and cuvette load.
     * VSWR = (1 + |Γ|)/(1 − |Γ|).
     * VSWR ≤ 2 is generally acceptable (power efficiency ≥ 88.9 %).
     */
    vswr(): number {
      const s = this as unknown as ImpedanceStoreState
      return computeVSWR(this.currentImpedanceMagAtFreqOhm, s.sourceImpedanceOhm)
    },

    /**
     * Fraction of generator power actually delivered to the cuvette [0-1].
     * η = 1 − |Γ|².
     * Values below 0.9 (90 %) indicate significant mismatch losses.
     */
    powerDeliveryEfficiency(): number {
      const s = this as unknown as ImpedanceStoreState
      return computePowerDeliveryEfficiency(this.currentImpedanceMagAtFreqOhm, s.sourceImpedanceOhm)
    },

    /**
     * Instantaneous Joule heating power deposited in the cuvette medium [mW].
     * P = |E|² × σ_e × V_cuvette (V_cuvette = gap × area).
     */
    mediumJouleHeatingMilliWatts(): number {
      const s       = this as unknown as ImpedanceStoreState
      const cellStore = useCellStore()
      return computeMediumJouleHeatingWatts(
        cellStore.fieldIntensity,
        this.sigmaEWithLysis,
        s.cuvetteGapMm,
        s.cuvetteCrossSectionCm2,
      ) * 1000  // W → mW
    },

    /**
     * Adiabatic medium temperature rise rate [°C/s] from Joule heating.
     * dT/dt = |E|² × σ_e / (ρ × c_p)
     * This is an upper bound (no heat loss).  Actual rise is lower due to
     * heat conduction to the cuvette walls and surrounding bath.
     */
    mediumTempRiseRatePerSec(): number {
      return computeMediumTempRiseRatePerSec(
        useCellStore().fieldIntensity,
        this.sigmaEWithLysis,
      )
    },

    /**
     * True when the source impedance is low enough that VSWR / reflection is
     * practically irrelevant (IRE pulsed power regime, R_s < 5 Ω).
     */
    isLowImpedanceSource(): boolean {
      const s = this as unknown as ImpedanceStoreState
      return s.sourceImpedanceOhm < 5
    },

    /**
     * Electric field enhancement factor in the extracellular medium [≥ 1].
     * At volume fractions above ~5% the applied field is concentrated in the
     * narrowing channels between packed cells.  This means the actual Vm is
     * higher than the Schwan equation predicts from the nominal applied field.
     */
    fieldDistortionFactor(): number {
      return computeFieldDistortionFactor(this.cellVolumeFraction)
    },

    /**
     * Qualitative field distortion level based on volume fraction.
     * 'none' - φ < 1%  : correction < 1.5%, negligible
     * 'minor' - φ 1-5%  : correction 1.5-8%, worth noting
     * 'significant' - φ ≥ 5%  : correction ≥ 8%, affects Schwan accuracy
     */
    fieldDistortionLevel(): 'none' | 'minor' | 'significant' {
      const phi = this.cellVolumeFraction
      if (phi < 0.01) return 'none'
      if (phi < 0.05) return 'minor'
      return 'significant'
    },

    /**
     * Cuvette RC time constant [ns] - geometry-independent, material-only.
     * τ_RC = ε_r × ε₀ / σ_e = Maxwell relaxation time.
     * Pulses shorter than τ_RC deliver attenuated field due to incomplete
     * charge redistribution in the medium.
     */
    cuvetteRCTimeConstantNs(): number {
      return computeCuvetteRCTimeConstantNs(this.sigmaEWithLysis)
    },

    /**
     * Ratio of pulse width to cuvette RC time constant.
     * > 5 → full field delivered (τ_RC ≪ t_p)
     * 1-5 → partial attenuation - field is reduced
     * < 1 → severe attenuation - cuvette barely charges
     */
    pulseToRCRatio(): number {
      const tau = this.cuvetteRCTimeConstantNs
      if (!isFinite(tau) || tau <= 0) return Infinity
      return useCellStore().pulseWidthNs / tau
    },

    /**
     * Qualitative pulse bandwidth status relative to the cuvette RC limit.
     * 'ok' - t_p / τ > 5   : full field delivery
     * 'marginal' - t_p / τ 1-5   : partial attenuation
     * 'critical' - t_p / τ < 1   : severe - cuvette barely charges
     * 'cw' - CW waveform   : not applicable
     */
    pulseBandwidthStatus(): 'ok' | 'marginal' | 'critical' | 'cw' {
      const cellStore = useCellStore()
      if (cellStore.waveform !== 'pulsed') return 'cw'
      const ratio = this.pulseToRCRatio
      if (ratio > 5)  return 'ok'
      if (ratio >= 1) return 'marginal'
      return 'critical'
    },
  },

  actions: {
    /** Load a named cuvette preset and apply its geometry. */
    setCuvettePreset(id: string) {
      const preset = CUVETTE_PRESETS.find(p => p.id === id)
      if (!preset) return
      this.cuvettePresetId = id
      if (id !== 'custom') {
        this.cuvetteGapMm           = preset.gapMm
        this.cuvetteCrossSectionCm2 = preset.crossSectionCm2
      }
    },

    /** Override gap (automatically switches preset to 'custom'). */
    setCuvetteGapMm(mm: number) {
      this.cuvetteGapMm    = Math.max(0.5, Math.min(10, mm))
      this.cuvettePresetId = 'custom'
    },

    /** Override cross-section (automatically switches preset to 'custom'). */
    setCuvetteCrossSectionCm2(cm2: number) {
      this.cuvetteCrossSectionCm2 = Math.max(0.01, Math.min(2, cm2))
      this.cuvettePresetId        = 'custom'
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

    /**
     * Ingest a hardware impedance packet from the socket 'impedanceReading' event.
     * Records to the history ring buffer and updates the live display.
     */
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

    /** Manually snapshot the current simulated impedance into history (e.g. on lysis event). */
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

    /**
     * Append one continuously auto-sampled conductivity point to the ring buffer.
     * Called on a 1-second interval by the LoadMonitor component.
     */
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

    /** Clear all conductivity chart samples (e.g. when the user resets the session). */
    clearConductivitySamples() {
      this.conductivitySamples = []
    },
  },
})
