export type CellState = 'stable' | 'nourishing' | 'approaching' | 'critical' | 'vibrating' | 'lysing' | 'lysed'

export interface BlobPoint {
  angle: number
  r: number
}

/** Data read by setupBlobAnimation on each D3 timer tick */
export interface BlobFrame {
  impact: number    // disruptionRatio  [0-n]
  state: CellState
  color: string     // live-interpolated accent color
}

/** Data read by setupOscilloscope on each D3 timer tick */
export interface OscFrame {
  state: CellState
  impact: number
  liveAmplitude: number
  cellColor: string
}
