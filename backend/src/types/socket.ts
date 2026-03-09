export interface StatePacket {
  freqKHz:             number
  fieldVcm:            number
  medium:              string
  dutyCycle:           number
  pulseWidthNs:        number
  waveform:            'cw' | 'pulsed'
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
