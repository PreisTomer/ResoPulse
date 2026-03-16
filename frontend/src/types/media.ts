export interface MediaEntry {
  name: string
  conductivity: number   // S/m — used in Schwan τ, SAR, DEP CM factor
  permittivity: number   // ε_r (relative) — used in DEP Clausius-Mossotti factor only
}

export type MediumKey = 'saline' | 'blood' | 'tissue' | 'water' | 'dmem' | 'rpmi' | 'mhb'
