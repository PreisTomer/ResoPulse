// ── Physical constants ────────────────────────────────────────────────────────
const EPSILON_0 = 8.854187817e-12 // permittivity of free space [F/m]

// ── Propagation media ─────────────────────────────────────────────────────────
export const MEDIA = {
  saline: { name: 'Physiological Saline (0.9%)', conductivity: 1.5 },
  blood:  { name: 'Whole Blood',                  conductivity: 0.7 },
  tissue: { name: 'Soft Tissue (DMEM)',            conductivity: 0.4 },
  water:  { name: 'Distilled Water',               conductivity: 0.001 },
} as const

export type MediumKey = keyof typeof MEDIA

// ── Cell configuration interface ──────────────────────────────────────────────
export interface CellConfig {
  id: string
  type: 'healthy' | 'target'
  label: string
  // Biophysical — user-editable
  radius: number               // µm
  membraneThickness: number    // nm
  naturalFrequency: number     // Hz (stored for reference & oscilloscope animation)
  thresholdVoltage: number     // V — Vm above which lysis is initiated
  dielectricConstant: number   // ε_r of membrane
  conductivity: number         // S/m — cytoplasm σ_i
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
      id: 'healthy-01',
      type: 'healthy' as const,
      label: 'Healthy Hepatocyte',
      radius: 10,
      membraneThickness: 7,
      naturalFrequency: 528,
      thresholdVoltage: 1.1,
      dielectricConstant: 5.0,
      conductivity: 0.5,
    },
    {
      id: 'target-01',
      type: 'target' as const,
      label: 'Adenocarcinoma Cell',
      radius: 15,
      membraneThickness: 5,
      naturalFrequency: 417,
      thresholdVoltage: 0.7,
      dielectricConstant: 8.5,
      conductivity: 0.9,
    },
  ],
}

// Extended cell configs with thermal and animation defaults
export const cellConfigs: [CellConfig, CellConfig] = [
  { ...simulationData.cells[0]!, density: 1050, specificHeatCapacity: 3500, amplitude: 0.8 },
  { ...simulationData.cells[1]!, density: 1080, specificHeatCapacity: 3200, amplitude: 0.5 },
]

// ── Physics helper functions ──────────────────────────────────────────────────

/** Membrane capacitance per unit area [F/m²]: Cm = ε_r × ε₀ / d */
export function membraneCm(cell: CellConfig): number {
  return (cell.dielectricConstant * EPSILON_0) / (cell.membraneThickness * 1e-9)
}

/** Membrane time constant τ [s]: τ = R·Cm / (σ_e + σ_i/2) */
export function computeTau(cell: CellConfig, sigma_e: number): number {
  const R = cell.radius * 1e-6     // µm → m
  const Cm = membraneCm(cell)      // F/m²
  return (R * Cm) / (sigma_e + cell.conductivity / 2)
}

/**
 * Schwan transmembrane potential [V]:
 *   Vm(f) = (1.5 × E × R) / √(1 + (ωτ)²)
 *   E [V/m] = fieldVcm × 100
 */
export function computeSchwan(
  cell: CellConfig,
  freqKHz: number,
  fieldVcm: number,
  sigma_e: number,
): number {
  const E = fieldVcm * 100          // V/cm → V/m
  const R = cell.radius * 1e-6      // µm → m
  const tau = computeTau(cell, sigma_e)
  const omega = 2 * Math.PI * freqKHz * 1e3
  return (1.5 * E * R) / Math.sqrt(1 + (omega * tau) ** 2)
}

/**
 * Peak specific absorption rate [W/kg]:
 *   SAR = σ_eff × E² / ρ   where σ_eff = (σ_e + σ_i) / 2
 */
export function computeSAR(cell: CellConfig, fieldVcm: number, sigma_e: number): number {
  const E = fieldVcm * 100          // V/cm → V/m
  const sigma_eff = (sigma_e + cell.conductivity) / 2
  return (sigma_eff * E * E) / cell.density
}

/** Cell characteristic frequency fc [kHz]: fc = 1 / (2πτ) */
export function computeFc(cell: CellConfig, sigma_e: number): number {
  const tau = computeTau(cell, sigma_e)
  return 1 / (2 * Math.PI * tau * 1e3)
}
