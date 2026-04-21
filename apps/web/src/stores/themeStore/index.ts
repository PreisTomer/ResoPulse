// Copyright © 2026 Tomer Preis. All rights reserved. Unauthorized copying or distribution is prohibited.

import { defineStore } from 'pinia'

import { loadFromStorage, saveToStorage } from '@/utils/storageClient'

import { STORAGE_KEY } from '@/constants/storageKeys'

export type AppTheme = 'dark' | 'oled'

function loadTheme(): AppTheme {
  return loadFromStorage<AppTheme>(STORAGE_KEY.THEME, 'dark', raw =>
    (raw === 'dark' || raw === 'oled') ? raw : 'dark',
  )
}

export const useThemeStore = defineStore('theme', {
  state: () => ({
    theme: loadTheme() as AppTheme,
  }),

  actions: {
    setTheme(t: AppTheme) {
      this.theme = t
      saveToStorage(STORAGE_KEY.THEME, t)
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
