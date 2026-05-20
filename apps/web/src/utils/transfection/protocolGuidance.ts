// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

// Transfection protocol guidance — Module 1c. Host-aware reagent ratio, culture state,
// and recovery recommendations beyond the pulse physics.

import { HOST_SPECIES, type HostSpecies } from '@/constants/cellLineCatalog'

export interface ProtocolGuidance {
  dnaPerCell:      string   // reagent ratio guidance
  cultureState:    string   // viability window / culture state at transfection
  recoveryMedium:  string
  recoveryWindow:  string
}

export function transfectionGuidance(host: HostSpecies, viability: number): ProtocolGuidance {
  switch (host) {
    case HOST_SPECIES.MAMMALIAN:
      return {
        dnaPerCell:     '1 to 2 ug DNA per million cells',
        cultureState:   'mid-log phase, over 95% viability, 24 h post-passage',
        recoveryMedium: 'pre-warmed complete growth medium, no antibiotics for 4 h',
        recoveryWindow: viability < 0.7 ? 'extend recovery to 48 h at 37C, 5% CO2 (high stress predicted)' : '24 h recovery at 37C, 5% CO2',
      }
    case HOST_SPECIES.INSECT:
      return {
        dnaPerCell:     '0.5 to 1 ug DNA per million cells (or MOI 1 to 5 for baculovirus)',
        cultureState:   'log phase, over 97% viability, 27C',
        recoveryMedium: 'serum-free insect medium (Sf-900 or ESF)',
        recoveryWindow: '48 to 72 h infection window at 27C',
      }
    case HOST_SPECIES.BACTERIAL:
      return {
        dnaPerCell:     '1 to 10 ng plasmid per transformation',
        cultureState:   'competent cells, OD600 0.4 to 0.6 at harvest',
        recoveryMedium: 'SOC medium, 1 h outgrowth before plating',
        recoveryWindow: '1 h at 37C, 220 rpm before selection',
      }
    case HOST_SPECIES.YEAST:
      return {
        dnaPerCell:     '0.1 to 1 ug linearized DNA per transformation',
        cultureState:   'log phase, OD600 about 1.0',
        recoveryMedium: 'YPD recovery before selective plating',
        recoveryWindow: '2 to 4 h recovery at 30C before selection',
      }
    default:
      return {
        dnaPerCell:     'optimize empirically',
        cultureState:   'log phase, high viability',
        recoveryMedium: 'host-appropriate recovery medium',
        recoveryWindow: 'host-appropriate recovery window',
      }
  }
}
