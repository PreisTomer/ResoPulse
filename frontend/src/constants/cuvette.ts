// Copyright © 2026 Tomer Preis. All rights reserved.
// Unauthorized copying or distribution is prohibited.

/** Electroporation cuvette geometry presets and impedance-feedback constants. */

export interface CuvettePreset {
  id:               string
  label:            string
  gapMm:            number   // electrode gap [mm]
  crossSectionCm2:  number   // electrode cross-section [cm²]
  manufacturer:     string
}

export const CUVETTE_PRESETS: CuvettePreset[] = [
  { id: 'btx_1mm',    label: '1 mm Gap (BTX)',        gapMm: 1, crossSectionCm2: 0.10, manufacturer: 'BTX' },
  { id: 'btx_2mm',    label: '2 mm Gap (BTX)',        gapMm: 2, crossSectionCm2: 0.10, manufacturer: 'BTX' },
  { id: 'btx_4mm',    label: '4 mm Gap (BTX)',        gapMm: 4, crossSectionCm2: 0.10, manufacturer: 'BTX' },
  { id: 'biorad_1mm', label: '1 mm Gap (Bio-Rad)',    gapMm: 1, crossSectionCm2: 0.13, manufacturer: 'Bio-Rad' },
  { id: 'biorad_2mm', label: '2 mm Gap (Bio-Rad)',    gapMm: 2, crossSectionCm2: 0.13, manufacturer: 'Bio-Rad' },
  { id: 'biorad_4mm', label: '4 mm Gap (Bio-Rad)',    gapMm: 4, crossSectionCm2: 0.13, manufacturer: 'Bio-Rad' },
  { id: 'custom',     label: 'Custom',                gapMm: 2, crossSectionCm2: 0.10, manufacturer: '' },
]

export const DEFAULT_CUVETTE_ID         = 'btx_2mm'
export const DEFAULT_SOURCE_IMPEDANCE_OHM = 50     // Ω — typical RF generator / pulsed power output impedance
export const DEFAULT_CELL_DENSITY_PER_ML  = 1e6    // cells/mL — typical mammalian electroporation density

/**
 * Fraction of intracellular ion content released into the medium per lysed cell.
 * Not all ions equilibrate instantly; 0.8 is a conservative estimate.
 */
export const ION_RELEASE_EFFICIENCY = 0.8

/**
 * Age threshold above which a hardware impedance reading is considered stale [ms].
 * After this time without an update the UI shows a "stale" warning.
 */
export const HARDWARE_READING_STALE_MS = 5_000

/** Maximum impedance history entries kept for the trend sparkline. */
export const IMPEDANCE_HISTORY_MAX = 120

/** Number of continuously auto-sampled conductivity points kept for the Load Monitor chart. */
export const CONDUCTIVITY_SAMPLE_MAX = 120

/** Interval between auto-sampled conductivity readings for the Load Monitor [ms]. */
export const CONDUCTIVITY_SAMPLE_INTERVAL_MS = 1_000
