import type { MediaEntry, MediumKey } from '@/types/media'

export const MEDIA: Record<MediumKey, MediaEntry> = {
  saline: { name: 'Physiological Saline (0.9%)', conductivity: 1.5   },
  blood:  { name: 'Whole Blood',                  conductivity: 0.7   },
  tissue: { name: 'Soft Tissue',                   conductivity: 0.4   },
  water:  { name: 'Distilled Water',               conductivity: 0.001 },
  dmem:   { name: 'DMEM',                          conductivity: 1.4   },
  rpmi:   { name: 'RPMI 1640',                     conductivity: 1.3   },
  mhb:    { name: 'Mueller-Hinton Broth',          conductivity: 0.8   },
}
