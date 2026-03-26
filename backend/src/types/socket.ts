// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.
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
  sessionName?:  string
}

/**
 * Anonymized outcome record emitted after a run when the user rates the result.
 * Only collected when the client has aiConsentGiven = true.
 * Stored server-side for AI training; never contains PII.
 */
export interface OutcomeEntry {
  /** Session identifier (user-supplied name, may be a generic default) */
  sessionName:          string
  timestamp:            string
  freqKHz:              number
  fieldVcm:             number
  medium:               string
  targetPreset:         string
  waveform:             string
  dutyCycle:            number
  pulseWidthNs:         number
  orientationDeg:       number
  lysisNPulses:         number
  targetRatio:          number
  healthyRatio:         number
  selectivity:          number
  targetTemp:           number
  healthyTemp:          number
  /** User-rated outcome: 1=failed, 2=poor, 3=acceptable, 4=good, 5=excellent */
  rating:               number
  /** Whether the protocol was suggested by the AI optimizer */
  aiSuggestionApplied:  boolean
}
