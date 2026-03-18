// Copyright © 2026 Tomer Preis. All rights reserved.
// Unauthorized copying or distribution is prohibited.

import type { MediaEntry, MediumKey } from '@/types/media'

// permittivity values (ε_r) from Gabriel et al. (1996) "Dielectric properties of biological
// tissues" at ~1 MHz, the representative mid-range for DEP experiments.
// Full Cole-Cole frequency dependence is not modelled here; values are appropriate for
// the 10 kHz-100 MHz range used in this simulator.
// tempCoeff values [1/°C]: σ_e(T) = σ_e0 × (1 + tempCoeff × (T − 37))
// Refs: Gabriel et al. (1996) for saline/blood/tissue/water; Foster & Schwan (1989)
// Culture media (dmem, rpmi, mhb): dominated by NaCl/NaHCO₃ — approximated at 2%/°C
export const MEDIA: Record<MediumKey, MediaEntry> = {
  saline: { name: 'Physiological Saline (0.9%)', conductivity: 1.5,   permittivity: 80, tempCoeff: 0.020 },
  blood:  { name: 'Whole Blood',                  conductivity: 0.7,   permittivity: 64, tempCoeff: 0.017 },
  tissue: { name: 'Soft Tissue',                   conductivity: 0.4,   permittivity: 70, tempCoeff: 0.015 },
  water:  { name: 'Distilled Water',               conductivity: 0.001, permittivity: 80, tempCoeff: 0.028 },
  dmem:   { name: 'DMEM',                          conductivity: 1.4,   permittivity: 79, tempCoeff: 0.020 },
  rpmi:   { name: 'RPMI 1640',                     conductivity: 1.3,   permittivity: 79, tempCoeff: 0.020 },
  mhb:    { name: 'Mueller-Hinton Broth',          conductivity: 0.8,   permittivity: 78, tempCoeff: 0.019 },
}
