export interface StatePacket {
  freqKHz:             number
  fieldVcm:            number
  medium:              string
  dutyCycle:           number
  pulseWidthNs:        number
  waveform:            'cw' | 'pulsed' | 'hfire'
  orientationDeg:      number
  lysisNPulses:        number
  chartMode:           'schwan' | 'resonance'
  safeMode:            boolean
  doubleShellEnabled:  boolean
  perfusionRate:       number
  cellPackingFraction: number
  targetPresetId:      string
  healthyPresetId:     string
  sessionName:         string
}

/**
 * Packet emitted by a lab impedance instrument and forwarded to all UI clients.
 * Instrument bridges should map their output to this JSON schema and emit via
 * the 'impedanceReading' socket event.
 */
export interface HardwareImpedancePacket {
  /** Real part of measured impedance [Ω] */
  zReal:         number
  /** Imaginary part of measured impedance [Ω] — negative = capacitive */
  zImag:         number
  /** Frequency at which the measurement was taken [Hz] */
  freqHz:        number
  /** Medium conductivity [S/m] — optionally derived/provided by instrument */
  conductivity?: number
  /** Unix timestamp [ms] when the reading was captured by the instrument */
  timestamp:     number
}

export interface LogEntry {
  id:            number
  timestamp:     string
  freqKHz:       number
  fieldVcm:      number
  medium:        string
  targetPreset:  string
  healthyVm:     number
  targetVm:      number
  selectivity:   number
  healthyRatio:  number
  targetRatio:   number
  healthyTemp:   number
  targetTemp:    number
  event:         string
}
