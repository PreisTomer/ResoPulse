export const UNIT = {
  HZ:        'Hz',
  GHZ:       'GHz',
  MHZ:       'MHz',
  KHZ:       'kHz',
  V_PER_CM:  'V/cm',
  KV_PER_CM: 'kV/cm',
  NS:        'ns',
  US:        'µs',
  MS:        'ms',
  MV:        'mV',
  PERCENT:   '%',
  DEG_C:     '°C',
  W_PER_KG:  'W/kg',
  S_PER_M:   'S/m',
} as const

export type Unit = typeof UNIT[keyof typeof UNIT]
