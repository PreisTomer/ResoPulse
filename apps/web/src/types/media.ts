// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

export interface MediaEntry {
  name: string
  conductivity: number   // S/m, used in Schwan τ, SAR, DEP CM factor
  permittivity: number   // ε_r (relative), used in DEP Clausius-Mossotti factor only
  tempCoeff: number   // σ_e(T) = σ_e0 × (1 + tempCoeff × (T−37)) [1/°C]
}

export type MediumKey = 'saline' | 'blood' | 'tissue' | 'water' | 'dmem' | 'pbs' | 'rpmi' | 'mhb' | 'epbuffer'
