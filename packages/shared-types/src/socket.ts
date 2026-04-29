// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

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

export interface HardwareImpedancePacket {
  zReal:         number
  zImag:         number
  freqHz:        number
  conductivity?: number
  timestamp:     number
}
