import { defineStore } from 'pinia'
import { cloneDeep } from 'lodash'
import { cellData, resonanceProfiles } from '../mockData'
import type { CellRecord } from '../mockData'

export interface ResonancePacket {
  timestamp: number
  activeFrequency: number
  cells: {
    healthy: { stress: number }
    target: { stress: number }
  }
}

interface CellStoreState {
  healthy: CellRecord
  target: CellRecord
  currentBroadcastFrequency: number
  // Increments on reset — CellCard watches this to reset local state
  resetCounter: number
}

export const useCellStore = defineStore('cell', {
  state: (): CellStoreState => ({
    healthy: cloneDeep(cellData.healthy),
    target: cloneDeep(cellData.target),
    currentBroadcastFrequency: 470, // neutral start — neither cell is at resonance
    resetCounter: 0,
  }),

  getters: {
    systemReady: (state): boolean =>
      state.healthy.stability > 0.90 && state.target.stability > 0.90,

    // Lorentzian resonance impact: 1.0 at exact match, decays quickly with distance
    // tolerance defines the half-power bandwidth (Hz from center where impact = 0.5)
    healthyResonanceImpact: (state): number => {
      const { naturalFrequency, tolerance } = resonanceProfiles.healthy
      const delta = Math.abs(naturalFrequency - state.currentBroadcastFrequency)
      return 1 / ((delta / tolerance) ** 2 + 1)
    },

    targetResonanceImpact: (state): number => {
      const { naturalFrequency, tolerance } = resonanceProfiles.target
      const delta = Math.abs(naturalFrequency - state.currentBroadcastFrequency)
      return 1 / ((delta / tolerance) ** 2 + 1)
    },
  },

  actions: {
    setBroadcastFrequency(freq: number) {
      this.currentBroadcastFrequency = Math.round(freq)
    },

    // Called when a resonance packet arrives from the backend WebSocket
    handleResonancePacket(packet: ResonancePacket) {
      this.currentBroadcastFrequency = Math.round(packet.activeFrequency)
    },

    applyResonance(cellType: 'healthy' | 'target') {
      this[cellType].amplitude = Math.min(1.0, this[cellType].amplitude + 0.1)
      this[cellType].stability = Math.min(1.0, this[cellType].stability + 0.05)
    },

    applyDisruption(cellType: 'healthy' | 'target') {
      this[cellType].amplitude = Math.max(0.05, this[cellType].amplitude - 0.1)
      this[cellType].stability = Math.max(0, this[cellType].stability - 0.05)
    },

    resetCell(cellType: 'healthy' | 'target') {
      this[cellType] = cloneDeep(cellData[cellType])
      this.resetCounter++
    },
  },
})
