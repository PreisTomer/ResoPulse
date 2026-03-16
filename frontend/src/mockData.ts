// Copyright © 2026 Tomer Preis. All rights reserved.
// Unauthorized copying or distribution is prohibited.

/**
 * Mock data — default cell configurations used to seed the Pinia store.
 * Types  → types/cell.ts, types/media.ts
 * Media  → constants/media.ts
 */
import type { CellConfig } from './types/cell'

// ── Default simulation cells ───────────────────────────────────────────────

const simulationData = {
  medium: { name: 'Interstitial Fluid', conductivity: 1.5, permittivity: 80 },
  cells: [
    {
      id: 'hepatocyte',
      type: 'healthy' as const,
      label: 'Healthy Hepatocyte',
      radius: 10,
      membraneThickness: 7,
      naturalFrequency: 440,
      thresholdVoltage: 1.1,
      dielectricConstant: 5.0,
      conductivity: 0.5,
    },
    {
      id: 'adenocarcinoma',
      type: 'target' as const,
      label: 'Adenocarcinoma Cell',
      radius: 15,
      membraneThickness: 5,
      naturalFrequency: 380,
      thresholdVoltage: 0.7,
      dielectricConstant: 8.5,
      conductivity: 0.9,
    },
  ],
}

/** Extended cell configs with thermal, animation, and nuclear envelope defaults. */
export const cellConfigs: [CellConfig, CellConfig] = [
  {
    ...simulationData.cells[0]!,
    density: 1050, specificHeatCapacity: 3500, amplitude: 0.8,
    // Hepatocyte nuclear envelope (large liver nucleus, well-differentiated)
    nuclearRadius: 5.0, nuclearMembraneThickness: 15, nuclearMembraneEps: 10,
    nucleoplasmConductivity: 0.9, nuclearThresholdVoltage: 0.50,
  },
  {
    ...simulationData.cells[1]!,
    density: 1080, specificHeatCapacity: 3200, amplitude: 0.5,
    // Adenocarcinoma nuclear envelope (large nucleus, thin/leaky NE, low threshold)
    nuclearRadius: 8.0, nuclearMembraneThickness: 12, nuclearMembraneEps: 12,
    nucleoplasmConductivity: 1.1, nuclearThresholdVoltage: 0.40,
  },
]
