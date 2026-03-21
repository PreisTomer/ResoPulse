// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import type { CellPreset } from '@/constants/cellLibrary'

/** CellPreset extended with computed display fields used in DataSetsView tables. */
export interface AugmentedPreset extends CellPreset {
  // Optional resonance/nuclear fields present on some presets
  resonantFreqGHz?: number
  capsidQ?: number
  resonantThresholdVcm?: number
  nuclearRadius?: number
  nuclearMembraneThickness?: number
  nuclearMembraneEps?: number
  nucleoplasmConductivity?: number
  nuclearThresholdVoltage?: number
  // Computed display values added in index.vue setup()
  cmDisplay: string
  fcDisplay: string
  fcrossDisplay: string
  resFreqDisplay: string
  resQDisplay: string
  resEthrDisplay: string
  hasResonance: boolean
  hasNuclear: boolean
  nucRDisplay: string
  nucFpeakDisplay: string
  color: string
  groupLabel: string
}
