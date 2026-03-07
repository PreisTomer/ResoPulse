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
