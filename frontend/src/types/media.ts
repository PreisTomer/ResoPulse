// Copyright © 2026 Tomer Preis. All rights reserved.
// Unauthorized copying or distribution is prohibited.

export interface MediaEntry {
  name: string
  conductivity: number   // S/m, used in Schwan τ, SAR, DEP CM factor
  permittivity: number   // ε_r (relative), used in DEP Clausius-Mossotti factor only
  /** σ_e temperature coefficient [1/°C]: σ_e(T) = σ_e0 × (1 + tempCoeff × (T − 37)) */
  tempCoeff: number
}

export type MediumKey = 'saline' | 'blood' | 'tissue' | 'water' | 'dmem' | 'pbs' | 'rpmi' | 'mhb'
