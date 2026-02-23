import { defineStore } from 'pinia'
import { cloneDeep } from 'lodash'
import { cellConfigs, MEDIA, computeSchwan, computeSAR, computeFc } from '../mockData'
import type { CellConfig, MediumKey } from '../mockData'

const DUTY_CYCLE = 1e-4 // pulsed electroporation duty cycle (dimensionless)
const LAMBDA = 0.02     // Newton cooling rate constant [1/s]

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
    _tempTimer: null,
    resetCounter: 0,
  }),

  getters: {
    sigma_e: (state): number => MEDIA[state.medium].conductivity,

    healthyVm(state): number {
      const sigma_e = MEDIA[state.medium].conductivity
      return computeSchwan(state.healthy, state.currentBroadcastFrequency, state.fieldIntensity, sigma_e)
    },

    targetVm(state): number {
      const sigma_e = MEDIA[state.medium].conductivity
      return computeSchwan(state.target, state.currentBroadcastFrequency, state.fieldIntensity, sigma_e)
    },

    healthyDisruptionRatio(state): number {
      const sigma_e = MEDIA[state.medium].conductivity
      return computeSchwan(state.healthy, state.currentBroadcastFrequency, state.fieldIntensity, sigma_e) / state.healthy.thresholdVoltage
    },

    targetDisruptionRatio(state): number {
      const sigma_e = MEDIA[state.medium].conductivity
      return computeSchwan(state.target, state.currentBroadcastFrequency, state.fieldIntensity, sigma_e) / state.target.thresholdVoltage
    },

    healthySAR(state): number {
      const sigma_e = MEDIA[state.medium].conductivity
      return computeSAR(state.healthy, state.fieldIntensity, sigma_e)
    },

    targetSAR(state): number {
      const sigma_e = MEDIA[state.medium].conductivity
      return computeSAR(state.target, state.fieldIntensity, sigma_e)
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

    selectivityRatio(state): number {
      const sigma_e = MEDIA[state.medium].conductivity
      const vh = computeSchwan(state.healthy, state.currentBroadcastFrequency, state.fieldIntensity, sigma_e)
      const vt = computeSchwan(state.target,  state.currentBroadcastFrequency, state.fieldIntensity, sigma_e)
      return vh > 0 ? vt / vh : 0
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
        // Healthy cell temperature update (Newton cooling, 100 ms tick)
        const hSAR = this.healthySAR
        const dTh = (hSAR * DUTY_CYCLE / this.healthy.specificHeatCapacity - LAMBDA * (this.healthyTemp - 37)) * 0.1
        this.healthyTemp = Math.max(37, this.healthyTemp + dTh)

        // Target cell temperature update
        const tSAR = this.targetSAR
        const dTt = (tSAR * DUTY_CYCLE / this.target.specificHeatCapacity - LAMBDA * (this.targetTemp - 37)) * 0.1
        this.targetTemp = Math.max(37, this.targetTemp + dTt)
      }, 100) as unknown as number
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
      if (cellType === 'healthy') this.healthyTemp = 37
      else this.targetTemp = 37
    },

    // Legacy no-ops
    applyResonance(_cellType: 'healthy' | 'target') {},
    applyDisruption(_cellType: 'healthy' | 'target') {},
  },
})
