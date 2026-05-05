// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

import type { CellState, CellType, ExperimentalBasis, MorphologyTag } from '@/constants/strings'
export type { CellState, CellType }

// ── Cell configuration ────────────────────────────────────────────────────────

export interface CellConfig {
  id: string
  type: CellType
  label: string
  description?: string  // shown in cell card body; library presets use CellPreset.notes
  // Biophysical - user-editable
  radius: number               // µm
  membraneThickness: number    // nm
  naturalFrequency: number     // Hz, oscilloscope animation speed only; NOT a physics parameter
  thresholdVoltage: number     // V, Vm above which lysis is initiated
  dielectricConstant: number   // ε_r of membrane (used in Schwan τ)
  conductivity: number         // S/m, cytoplasm σ_i
  // Acoustic/mechanical resonance (virus/bacteria capsid & cell-wall targeting)
  resonantFreqGHz?: number       // Capsid/cell-wall fundamental resonant frequency (GHz)
  capsidQ?: number               // Mechanical quality factor (nominal)
  resonantThresholdVcm?: number  // Field amplitude at resonance required for disruption (V/cm)
  // Second resonant mode (e.g. SARS-CoV-2 has a 1st dipolar mode at 4 GHz and 2nd at 7.5 GHz)
  resonantFreqGHz2?: number      // 2nd mode resonant frequency (GHz); omit if single-mode
  capsidQ2?: number              // Q of the 2nd mode; defaults to capsidQ if omitted
  resonantMode2Amplitude?: number // Relative DR contribution of the 2nd mode (0-1); default 0.5
  // Resonance model uncertainty & experimental provenance
  resonantFreqUncertaintyPct?: number   // ±% uncertainty on f_res (from v_sound literature range)
  capsidQMin?: number                   // Lower Q bound for Lorentzian uncertainty band
  capsidQMax?: number                   // Upper Q bound
  experimentalBasis?: ExperimentalBasis
  // Nuclear envelope - double-shell model (Kotnik & Miklavcic 2006)
  // Absent for anucleate cells (RBC) and prokaryotes (bacteria/virus).
  nuclearRadius?: number               // µm , nuclear radius (~50% of cell radius for most mammalian cells)
  nuclearMembraneThickness?: number    // nm , effective double-membrane thickness (inner + outer leaflets + lumen, ~15 nm)
  nuclearMembraneEps?: number          // ε_r, effective permittivity; lipid bilayer ~2-5, NPC contribution raises to ~10-12
  nucleoplasmConductivity?: number     // S/m, nucleoplasm ionic conductivity (typically > cytoplasm)
  nuclearThresholdVoltage?: number     // V  , Vm_nuc required for nuclear envelope disruption (lower than plasma membrane)
  // σ_mem [S/m] for DEP CM. Default 10⁻⁷ (mammalian); Gram-neg ~10⁻⁵; omit for Gram-pos/enveloped virus (Markx 1999).
  membraneConductivity?: number
  // σ_i measurement provenance — used to correct conductivity to experiment temperature and warn on medium mismatch.
  conductivityMeasurementTempC?: number   // °C at which σ_i was measured; absent → assume 37°C (no correction applied)
  conductivityMeasurementSigmaE?: number  // medium σ_e [S/m] used during σ_i measurement; absent → no mismatch check
  sigmaUncertaintyPct?: number            // per-cell ±% uncertainty on σ_i; overrides the category-default prior
  // σ_ne (nuclear membrane) is unused: Kotnik 2006 double-shell in computeNuclearVm runs in the σ_ne→0 capacitive limit.
  // Thermal - added defaults (not in user spec)
  density: number              // kg/m³
  specificHeatCapacity: number // J/(kg·K)
  // Animation
  amplitude: number            // 0-1, drives oscilloscope wave height
  morphologyTag?: MorphologyTag  // bacteria only: 'rod' | 'coccus' | 'coccobacillus'; others ignore
}

// Semantic alias used by CellCard sub-components (index, CellParamsPanel, CellVisual)
// to express "a cell configuration object passed as prop data" vs a store reference.
export type CellRecord = CellConfig

export interface BlobPoint {
  angle: number
  r: number
}

export interface BlobFrame {
  impact: number       // disruptionRatio  [0-n]
  state: CellState
  color: string        // live-interpolated accent color
  temperature: number  // °C, drives cytoplasm thermal tint
  fieldVcm: number     // applied electric field [V/cm], drives field ray intensity
  freqKHz: number      // applied frequency [kHz], drives field ray color
  nuclearDisruptionRatio: number  // Vm_nuc / nuclear threshold [0-n]; 0 for non-mammalian or single-shell mode
  depCmReal: number               // Re[K(f)] Clausius-Mossotti DEP factor [-0.5, +0.5]; >0 = pDEP, <0 = nDEP
  waveform: 'cw' | 'pulsed' | 'hfire'
  isAcousticMode?: boolean  // true when target is virus/bacteria with resonantFreqGHz
}

export interface OscFrame {
  state: CellState
  impact: number
  liveAmplitude: number
  cellColor: string
  naturalFrequency: number  // scroll-speed [kHz]; acoustic targets track live broadcast freq
}
