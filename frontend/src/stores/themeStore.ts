// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { defineStore } from 'pinia'

export type AppTheme = 'dark' | 'oled'

const LS_KEY = 'br-theme'

function loadTheme(): AppTheme {
  try {
    const saved = localStorage.getItem(LS_KEY)
    if (saved === 'dark' || saved === 'oled') return saved
  } catch { /* ignore */ }
  return 'dark'
}

export const useThemeStore = defineStore('theme', {
  state: () => ({
    theme: loadTheme() as AppTheme,
  }),

  actions: {
    setTheme(t: AppTheme) {
      this.theme = t
      try { localStorage.setItem(LS_KEY, t) } catch { /* ignore */ }
      applyTheme(t)
    },

    toggle() {
      this.setTheme(this.theme === 'dark' ? 'oled' : 'dark')
    },

    init() {
      applyTheme(this.theme)
    },
  },
})

function applyTheme(t: AppTheme) {
  document.documentElement.setAttribute('data-theme', t)
}
