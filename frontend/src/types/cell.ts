import type { CellState, CellType, ExperimentalBasis } from '@/constants/strings'
export type { CellState, CellType }

// ── Cell configuration ────────────────────────────────────────────────────────

export interface CellConfig {
  id: string
  type: CellType
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
  capsidQ?: number               // Mechanical quality factor (nominal)
  resonantThresholdVcm?: number  // Field amplitude at resonance required for disruption (V/cm)
  // Resonance model uncertainty & experimental provenance
  resonantFreqUncertaintyPct?: number   // ±% uncertainty on f_res (from v_sound literature range)
  capsidQMin?: number                   // Lower Q bound for Lorentzian uncertainty band
  capsidQMax?: number                   // Upper Q bound
  experimentalBasis?: ExperimentalBasis
  // Nuclear envelope — double-shell model (Kotnik & Miklavcic 2006)
  // Absent for anucleate cells (RBC) and prokaryotes (bacteria/virus).
  nuclearRadius?: number               // µm  — nuclear radius (~50% of cell radius for most mammalian cells)
  nuclearMembraneThickness?: number    // nm  — effective double-membrane thickness (inner + outer leaflets + lumen, ~15 nm)
  nuclearMembraneEps?: number          // ε_r — effective permittivity; lipid bilayer ~2–5, NPC contribution raises to ~10–12
  nucleoplasmConductivity?: number     // S/m — nucleoplasm ionic conductivity (typically > cytoplasm)
  nuclearThresholdVoltage?: number     // V   — Vm_nuc required for nuclear envelope disruption (lower than plasma membrane)
  // Note: nuclear membrane conductivity σ_ne is NOT stored or used. The Kotnik & Miklavcic (2006)
  // double-shell formula used in computeNuclearVm() operates in the thin-membrane capacitive limit
  // (σ_ne → 0). Including σ_ne requires the full complex admittance transfer function which changes
  // the DC response; this is left for future work. See physics.ts computeNuclearTau().
  // Thermal — added defaults (not in user spec)
  density: number              // kg/m³
  specificHeatCapacity: number // J/(kg·K)
  // Animation
  amplitude: number            // 0–1, drives oscilloscope wave height
}

// Type alias for backward compatibility with existing CellCard / store references
export type CellRecord = CellConfig

export interface BlobPoint {
  angle: number
  r: number
}

/** Data read by setupBlobAnimation on each D3 timer tick */
export interface BlobFrame {
  impact: number       // disruptionRatio  [0-n]
  state: CellState
  color: string        // live-interpolated accent color
  temperature: number  // °C — drives cytoplasm thermal tint
  fieldVcm: number     // applied electric field [V/cm] — drives field ray intensity
  freqKHz: number      // applied frequency [kHz] — drives field ray color
  nuclearDisruptionRatio: number  // Vm_nuc / nuclear threshold [0-n]; 0 for non-mammalian or single-shell mode
  depCmReal: number               // Re[K(f)] Clausius-Mossotti DEP factor [-0.5, +0.5]; >0 = pDEP, <0 = nDEP
}

/** Data read by setupOscilloscope on each D3 timer tick */
export interface OscFrame {
  state: CellState
  impact: number
  liveAmplitude: number
  cellColor: string
  /** Oscilloscope scroll-speed frequency [kHz]. For acoustic targets this tracks the
   *  live broadcast frequency so the waveform responds to the slider in real time. */
  naturalFrequency: number
}
