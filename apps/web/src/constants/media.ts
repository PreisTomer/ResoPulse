// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import type { MediaEntry, MediumKey } from '@/types/media'

// ε_r at ~1 MHz, tempCoeff [1/°C]: σ_e(T)=σ_e0·(1+tempCoeff·(T−37)). Refs: Gabriel 1996, Foster & Schwan 1989, Zimmermann 1982.
export const MEDIA: Record<MediumKey, MediaEntry> = {
  saline:   { name: 'Physiological Saline (0.9%)', conductivity: 1.5,   permittivity: 80, tempCoeff: 0.020 },
  blood:    { name: 'Whole Blood',                  conductivity: 0.7,   permittivity: 64, tempCoeff: 0.017 },
  tissue:   { name: 'Soft Tissue',                   conductivity: 0.4,   permittivity: 70, tempCoeff: 0.015 },
  water:    { name: 'Distilled Water',               conductivity: 0.001, permittivity: 80, tempCoeff: 0.028 },
  dmem:     { name: 'DMEM',                          conductivity: 1.4,   permittivity: 79, tempCoeff: 0.020 },
  pbs:      { name: 'PBS (pH 7.4)',                  conductivity: 1.54,  permittivity: 79, tempCoeff: 0.020 },
  rpmi:     { name: 'RPMI 1640',                     conductivity: 1.3,   permittivity: 79, tempCoeff: 0.020 },
  mhb:      { name: 'Mueller-Hinton Broth',          conductivity: 0.8,   permittivity: 78, tempCoeff: 0.019 },
  epbuffer: { name: 'EP Buffer (low-conductivity)',  conductivity: 0.14,  permittivity: 78, tempCoeff: 0.020 },
}
