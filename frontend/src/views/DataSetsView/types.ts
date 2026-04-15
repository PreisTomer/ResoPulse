// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import type { CellGroup } from '@/constants/cellLibrary'
import type { UserCellPreset } from '@/stores/userPresetsStore'

// Unified row type for the cell library table.
// Built-in presets and user-created presets both map to this shape.
export interface AugmentedPreset {
  // Identity
  presetId:    string      // built-in: CellPreset.presetId; custom: UserCellPreset.id
  label:       string
  shortLabel:  string
  notes:       string
  techNotes?:  string      // built-in only — extended scientific footnote for tooltip
  // Group display
  group:       CellGroup
  groupLabel:  string
  color:       string
  // Physics params
  radius:               number
  membraneThickness:    number
  dielectricConstant:   number
  conductivity:         number
  thresholdVoltage:     number
  density:              number
  specificHeatCapacity: number
  // Optional nuclear (mammalian built-in only)
  nuclearRadius?:              number
  nuclearMembraneThickness?:   number
  nuclearMembraneEps?:         number
  nucleoplasmConductivity?:    number
  nuclearThresholdVoltage?:    number
  // Optional acoustic resonance (bacteria / virus)
  resonantFreqGHz?:      number
  capsidQ?:              number
  resonantThresholdVcm?: number
  // Computed display strings (all pre-formatted in index.vue)
  cmDisplay:       string
  fcDisplay:       string
  fcrossDisplay:   string
  fcross2Display:  string
  resFreqDisplay:  string
  resQDisplay:     string
  resEthrDisplay:  string
  hasResonance:    boolean
  hasNuclear:      boolean
  nucRDisplay:     string
  nucFpeakDisplay: string
  // Custom preset metadata — undefined for built-in rows
  isCustom:             boolean
  customPreset?:        UserCellPreset
  parameterConfidence?: string   // 'literature' | 'measured' | 'estimated'; custom only
}
