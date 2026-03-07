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
} as const

export type Icon = typeof ICON[keyof typeof ICON]
