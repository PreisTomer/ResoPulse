// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

interface CuvettePreset {
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

export const CUSTOM_CUVETTE_ID          = 'custom'
export const DEFAULT_CUVETTE_ID         = 'btx_2mm'
export const DEFAULT_SOURCE_IMPEDANCE_OHM = 50     // Ω, typical RF generator / pulsed power output impedance
export const DEFAULT_CELL_DENSITY_PER_ML  = 1e6    // cells/mL, typical mammalian electroporation density

// εr of aqueous electrolyte at 37°C. Water ~74; saline/PBS close. Hasted 1973.
export const MEDIUM_RELATIVE_PERMITTIVITY = 74
export const MEDIUM_DENSITY_KG_M3         = 1000  // [kg/m³], for Joule heating estimate
export const MEDIUM_SPECIFIC_HEAT_J_KG_K  = 4182  // [J/(kg·K)], for Joule heating estimate

// ── Cuvette geometry input bounds ────────────────────────────────────────────

export const CUVETTE_GAP_MIN_MM    = 0.5
export const CUVETTE_GAP_MAX_MM    = 10
export const CUVETTE_GAP_STEP_MM   = 0.5

export const CUVETTE_AREA_MIN_CM2  = 0.01
export const CUVETTE_AREA_MAX_CM2  = 2
export const CUVETTE_AREA_STEP_CM2 = 0.01

export const SOURCE_IMPEDANCE_MIN_OHM = 0
export const SOURCE_IMPEDANCE_MAX_OHM = 200

// ── Hardware reading timing ───────────────────────────────────────────────────

// Age threshold after which a hardware impedance reading triggers a "stale" UI warning [ms]
export const HARDWARE_READING_STALE_MS         = 5_000
export const IMPEDANCE_HISTORY_MAX             = 120   // max entries kept for trend sparkline
export const CONDUCTIVITY_SAMPLE_MAX           = 120   // Load Monitor chart history length
export const CONDUCTIVITY_SAMPLE_INTERVAL_MS   = 1_000 // auto-sample interval [ms]
