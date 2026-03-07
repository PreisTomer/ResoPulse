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
} as const

export type Icon = typeof ICON[keyof typeof ICON]
