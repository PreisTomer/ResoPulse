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
  LINES:     '≡',   // hamburger / log header
  RELOAD:    '⟳',   // sweep / resample
  GRID:      '⊞',   // population panel
  WAVE:      '∿',   // frequency response chart
} as const

export type Icon = typeof ICON[keyof typeof ICON]
