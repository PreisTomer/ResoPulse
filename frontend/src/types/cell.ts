export type CellState = 'stable' | 'nourishing' | 'approaching' | 'critical' | 'vibrating' | 'lysing' | 'lysed'

export interface BlobPoint {
  angle: number
  r: number
}

/** Data read by setupBlobAnimation on each D3 timer tick */
export interface BlobFrame {
  impact: number       // disruptionRatio  [0-n]
  state: CellState
  color: string        // live-interpolated accent color
  temperature: number  // °C — drives cytoplasm thermal tint
  fieldVcm: number     // applied electric field [V/cm] — drives field ray intensity
  freqKHz: number      // applied frequency [kHz] — drives field ray color
}

/** Data read by setupOscilloscope on each D3 timer tick */
export interface OscFrame {
  state: CellState
  impact: number
  liveAmplitude: number
  cellColor: string
}
