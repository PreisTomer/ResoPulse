export const ICON = {
  STAR:      '⭐',
  INFINITY:  '∞',
  BEYOND:    ' ↑',
  CHEVRON:   '›',
  LIGHTNING: '⚡',
  WARNING:   '⚠',
  INFO:      'ℹ',
  CHECK:     '✓',
  EXPAND:    '▾',
  COLLAPSE:  '▸',
  RESET:     '↺',
  LOCK:      '🔒',
  NOURISH:   '⊕',
  LYSIS_BOLT:'↯',
  NUCLEUS:   '⚬',
  LINES:       '≡',   // hamburger / log header
  RELOAD:      '⟳',   // sweep / resample
  GRID:        '⊞',   // population panel
  WAVE:        '∿',   // frequency response chart
  SELECTIVITY: '⊙',   // selectivity — crosshair/target (target one cell type over another)
  SQUARE:    '■',   // legend color swatch
  CELL:      '◎',   // cell icon in CellCard header
  PLUG:      '⚙',   // instrument / hardware connection
  FLASK:     '⚗',   // cuvette / lab setup
  SECTION:   '§',   // protocol / science documentation
  ARROW_R:     '⟶',  // directional CTA arrow
  TRIANGLE_UP: '▲',  // axis tick / chart marker
  DEP:         '⇌',  // DEP bidirectional force / crossover
} as const

export type Icon = typeof ICON[keyof typeof ICON]
