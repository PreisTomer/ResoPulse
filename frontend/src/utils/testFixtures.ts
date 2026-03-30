// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
// Shared fixtures for physics/store unit tests. Representative IRE EP buffer assay values.

import type { CellConfig } from '@/types/cell'
import { CELL_TYPE } from '@/constants/strings'

// Typical mammalian cancer cell (HeLa-like): radius 10 µm, σ_i 0.4 S/m
export const TARGET_CELL: CellConfig = {
  id:                   'hela',
  type:                 CELL_TYPE.TARGET,
  label:                'HeLa',
  radius:               10,      // µm
  membraneThickness:    7,       // nm
  dielectricConstant:   10,
  conductivity:         0.4,     // S/m
  density:              1050,    // kg/m³
  thresholdVoltage:     1.0,     // V
  naturalFrequency:     0.5,     // Hz (animation only)
  specificHeatCapacity: 3600,    // J/(kg·K)
  amplitude:            0.8,
}

// Typical healthy mammalian cell: radius 6 µm, σ_i 0.4 S/m
export const HEALTHY_CELL: CellConfig = {
  id:                   'normal',
  type:                 CELL_TYPE.HEALTHY,
  label:                'Normal',
  radius:               6,       // µm
  membraneThickness:    7,       // nm
  dielectricConstant:   10,
  conductivity:         0.4,     // S/m
  density:              1050,    // kg/m³
  thresholdVoltage:     1.0,     // V
  naturalFrequency:     0.5,
  specificHeatCapacity: 3600,
  amplitude:            0.8,
}

export const SIGMA_E = 0.14  // Standard EP buffer conductivity [S/m]
export const FIELD   = 500   // Representative IRE field intensity [V/cm]
