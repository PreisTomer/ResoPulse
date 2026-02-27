/**
 * Mock data — cell configurations and propagation media.
 * Physics helper functions live in utils/physics.ts.
 */

// ── Propagation media ─────────────────────────────────────────────────────────
export interface MediaEntry {
  name: string
  conductivity: number
}

export const MEDIA: {
  saline: MediaEntry
  blood:  MediaEntry
  tissue: MediaEntry
  water:  MediaEntry
} = {
  saline: { name: 'Physiological Saline (0.9%)', conductivity: 1.5   },
  blood:  { name: 'Whole Blood',                  conductivity: 0.7   },
  tissue: { name: 'Soft Tissue',                   conductivity: 0.4   },
  water:  { name: 'Distilled Water',               conductivity: 0.001 },
}

export type MediumKey = keyof typeof MEDIA

// ── Cell configuration interface ──────────────────────────────────────────────
export interface CellConfig {
  id: string
  type: 'healthy' | 'target'
  label: string
  // Biophysical — user-editable
  radius: number               // µm
  membraneThickness: number    // nm
  naturalFrequency: number     // Hz — oscilloscope animation speed only; NOT a physics parameter
  thresholdVoltage: number     // V — Vm above which lysis is initiated
  dielectricConstant: number   // ε_r of membrane (used in Schwan τ)
  conductivity: number         // S/m — cytoplasm σ_i
  // Acoustic/mechanical resonance (virus/bacteria capsid & cell-wall targeting)
  resonantFreqGHz?: number       // Capsid/cell-wall fundamental resonant frequency (GHz)
  capsidQ?: number               // Mechanical quality factor
  resonantThresholdVcm?: number  // Field amplitude at resonance required for disruption (V/cm)
  // Nuclear envelope — double-shell model (Kotnik & Miklavcic 2006)
  // Absent for anucleate cells (RBC) and prokaryotes (bacteria/virus).
  nuclearRadius?: number               // µm  — nuclear radius (~50% of cell radius for most mammalian cells)
  nuclearMembraneThickness?: number    // nm  — effective double-membrane thickness (inner + outer leaflets + lumen, ~15 nm)
  nuclearMembraneEps?: number          // ε_r — effective relative permittivity (incl. nuclear pore complex contribution)
  nuclearMembraneConductivity?: number // S/m — effective conductivity (partially shunted by NPC; ~0.01 S/m)
  nucleoplasmConductivity?: number     // S/m — nucleoplasm ionic conductivity (typically > cytoplasm)
  nuclearThresholdVoltage?: number     // V   — Vm_nuc required for nuclear envelope disruption (lower than plasma membrane)
  // Thermal — added defaults (not in user spec)
  density: number              // kg/m³
  specificHeatCapacity: number // J/(kg·K)
  // Animation
  amplitude: number            // 0–1, drives oscilloscope wave height
}

// Type alias for backward compatibility with existing CellCard / store references
export type CellRecord = CellConfig

// ── simulationData — exact user-specified structure ───────────────────────────
export const simulationData = {
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

// Extended cell configs with thermal, animation, and nuclear defaults
export const cellConfigs: [CellConfig, CellConfig] = [
  {
    ...simulationData.cells[0]!,
    density: 1050, specificHeatCapacity: 3500, amplitude: 0.8,
    // Hepatocyte nuclear envelope (large liver nucleus, well-differentiated)
    nuclearRadius: 5.0, nuclearMembraneThickness: 15, nuclearMembraneEps: 10,
    nuclearMembraneConductivity: 0.010, nucleoplasmConductivity: 0.9, nuclearThresholdVoltage: 0.50,
  },
  {
    ...simulationData.cells[1]!,
    density: 1080, specificHeatCapacity: 3200, amplitude: 0.5,
    // Adenocarcinoma nuclear envelope (large nucleus, thin/leaky NE, low threshold)
    nuclearRadius: 8.0, nuclearMembraneThickness: 12, nuclearMembraneEps: 12,
    nuclearMembraneConductivity: 0.020, nucleoplasmConductivity: 1.1, nuclearThresholdVoltage: 0.40,
  },
]
