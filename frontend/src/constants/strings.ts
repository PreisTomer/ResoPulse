/** Short display labels for healthy / target cell roles (domain notation: H / T) */
export const CELL_LABEL = {
  HEALTHY: 'H',
  TARGET:  'T',
} as const

/** Cell lifecycle states (matches CellState union in types/cell.ts) */
export const CELL_STATE = {
  STABLE:      'stable',
  NOURISHING:  'nourishing',
  APPROACHING: 'approaching',
  REV_EP:      'rev-ep',
  CRITICAL:    'critical',
  VIBRATING:   'vibrating',
  LYSING:      'lysing',
  LYSED:       'lysed',
} as const

/** Cell role within an experiment pair */
export const CELL_TYPE = {
  HEALTHY: 'healthy',
  TARGET:  'target',
} as const

/** Active chart / simulation mode */
export const CHART_MODE = {
  SCHWAN:    'schwan',
  RESONANCE: 'resonance',
} as const

/** Biological category of the target cell (determined by radius) */
export const CELL_CATEGORY = {
  MAMMALIAN: 'mammalian',
  BACTERIA:  'bacteria',
  VIRUS:     'virus',
} as const

/** Applied waveform mode */
export const WAVEFORM = {
  CW:     'cw',
  PULSED: 'pulsed',
} as const

/** Thermal danger levels used in field control */
export const THERMAL_LEVEL = {
  SAFE:         'safe',
  HYPERTHERMIC: 'hyperthermic',
  DENATURING:   'denaturing',
  VAPORIZING:   'vaporizing',
} as const

/** Experiment log event types */
export const LOG_EVENT = {
  LYSIS:   'lysis',
  MANUAL:  'manual',
} as const

/** Cell preset group (aligns with CellPreset.group field in cellLibrary.ts) */
export const CELL_GROUP = {
  REFERENCE: 'reference',
  CANCER:    'cancer',
  BACTERIA:  'bacteria',
  VIRUS:     'virus',
} as const

/** Experimental validation basis for resonance presets */
export const EXPERIMENTAL_BASIS = {
  LASER_VALIDATED: 'laser-validated',
  RF_EXTRAPOLATED: 'rf-extrapolated',
  SPECULATIVE:     'speculative',
} as const

/**
 * RF coupling regime determined by the operating frequency.
 * Drives the hardware-requirement warning badge in the frequency slider.
 */
export const FREQ_REGIME = {
  ELECTROLYTIC: 'electrolytic',  // < 300 MHz — direct electrode, DC model valid
  NEARFIELD_RF: 'nearfield_rf',  // 300 MHz – 1 GHz — coaxial RF probe, DC model approximate
  MICROWAVE:    'microwave',     // > 1 GHz — waveguide / resonant cavity / horn required
} as const

// ── Derived types from constants (single source of truth) ──────────────────
/** All valid cell lifecycle states */
export type CellState         = typeof CELL_STATE[keyof typeof CELL_STATE]
/** Cell role in an experiment pair: 'healthy' | 'target' */
export type CellType          = typeof CELL_TYPE[keyof typeof CELL_TYPE]
/** Active simulation chart mode */
export type ChartMode         = typeof CHART_MODE[keyof typeof CHART_MODE]
/** Biological category of the target cell */
export type CellCategory      = typeof CELL_CATEGORY[keyof typeof CELL_CATEGORY]
/** Applied waveform mode */
export type WaveformMode      = typeof WAVEFORM[keyof typeof WAVEFORM]
/** Thermal hazard level */
export type ThermalLevel      = typeof THERMAL_LEVEL[keyof typeof THERMAL_LEVEL]
/** Experiment log event type */
export type LogEventType      = typeof LOG_EVENT[keyof typeof LOG_EVENT]
/** Cell preset group identifier */
export type CellGroupType     = typeof CELL_GROUP[keyof typeof CELL_GROUP]
/** Experimental validation basis for resonance presets */
export type ExperimentalBasis = typeof EXPERIMENTAL_BASIS[keyof typeof EXPERIMENTAL_BASIS]
/** RF coupling regime based on operating frequency */
export type FreqRegime        = typeof FREQ_REGIME[keyof typeof FREQ_REGIME]
/** Cell preset identifier */
export type PresetId          = typeof PRESET_ID[keyof typeof PRESET_ID]

/** Cell preset IDs (aligns with CellPreset.id field in cellLibrary.ts) */
export const PRESET_ID = {
  HEPATOCYTE:     'hepatocyte',
  RBC:            'rbc',
  ADENOCARCINOMA: 'adenocarcinoma',
  GBM:            'gbm',
  MCF7:           'mcf7',
  HL60:           'hl60',
  ECOLI:          'ecoli',
  MRSA:           'mrsa',
  INFLUENZA:      'influenza',
  SARSCOV2:       'sarscov2',
} as const
