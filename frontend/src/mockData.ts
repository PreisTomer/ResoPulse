export interface SequenceItem {
  base: string
  vibration: number
}

export interface CellRecord {
  id: string
  label: string
  baseFrequency: number
  amplitude: number
  stability: number
  sequence: SequenceItem[]
}

export interface CellData {
  healthy: CellRecord
  target: CellRecord
}

export interface ResonanceProfile {
  label: string
  naturalFrequency: number
  tolerance: number // Hz — width of the resonance band
  state: 'stable' | 'vibrating' | 'nourishing' | 'shattering' | 'destroyed'
}

export interface ResonanceProfiles {
  healthy: ResonanceProfile
  target: ResonanceProfile
}

export const resonanceProfiles: ResonanceProfiles = {
  healthy: {
    label: 'Healthy Cell',
    naturalFrequency: 528,
    tolerance: 10, // starts feeling impact within 10 Hz
    state: 'stable',
  },
  target: {
    label: 'Target Cell (Pathogen)',
    naturalFrequency: 417,
    tolerance: 5, // more brittle/sensitive
    state: 'stable',
  },
}

export const cellData: CellData = {
  healthy: {
    id: 'H-01',
    label: 'Healthy Cell',
    baseFrequency: 528, // Hz — Solfeggio frequency
    amplitude: 0.8,
    stability: 0.98,
    sequence: [
      { base: 'A', vibration: 1.2 },
      { base: 'T', vibration: 1.1 },
      { base: 'G', vibration: 1.3 },
      { base: 'C', vibration: 1.2 },
    ],
  },
  target: {
    id: 'T-88',
    label: 'Target Cell (Pathogen)',
    baseFrequency: 417, // Hz
    amplitude: 0.4,
    stability: 0.65,
    sequence: [
      { base: 'A', vibration: 0.8 },
      { base: 'T', vibration: 0.9 },
      { base: 'G', vibration: 0.5 },
      { base: 'C', vibration: 0.7 },
    ],
  },
}
