import type { MediaEntry, MediumKey } from '@/types/media'

// permittivity values (ε_r) from Gabriel et al. (1996) "Dielectric properties of biological
// tissues" at ~1 MHz, the representative mid-range for DEP experiments.
// Full Cole-Cole frequency dependence is not modelled here; values are appropriate for
// the 10 kHz–100 MHz range used in this simulator.
export const MEDIA: Record<MediumKey, MediaEntry> = {
  saline: { name: 'Physiological Saline (0.9%)', conductivity: 1.5,   permittivity: 80 },
  blood:  { name: 'Whole Blood',                  conductivity: 0.7,   permittivity: 64 },
  tissue: { name: 'Soft Tissue',                   conductivity: 0.4,   permittivity: 70 },
  water:  { name: 'Distilled Water',               conductivity: 0.001, permittivity: 80 },
  dmem:   { name: 'DMEM',                          conductivity: 1.4,   permittivity: 79 },
  rpmi:   { name: 'RPMI 1640',                     conductivity: 1.3,   permittivity: 79 },
  mhb:    { name: 'Mueller-Hinton Broth',          conductivity: 0.8,   permittivity: 78 },
}
