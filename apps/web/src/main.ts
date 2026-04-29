// Copyright © 2026 Tomer Preis. Licensed under the MIT License.

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { clerkPlugin } from '@clerk/vue'

import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'

import './style.css'
import './styles/_keyframes.scss'
import './styles/_responsive.scss'
import App from './App.vue'
import { i18n } from './plugins/i18n'
import router from './router'
import { vTip } from './directives/vTooltip'
import { useExperimentStore } from './stores/experimentStore'
import { saveToStorage } from './utils/storageClient'
import { STORAGE_KEY } from './constants/storageKeys'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string

if (!PUBLISHABLE_KEY) {
  throw new Error('VITE_CLERK_PUBLISHABLE_KEY is not set. Add it to your .env file.')
}

// Recover from stale lazy-chunk hashes post-deploy: reload fetches fresh HTML + current bundles.
window.addEventListener('vite:preloadError', () => {
  window.location.reload()
})

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)

const app = createApp(App)

app
  .use(pinia)
  .use(i18n)
  .use(router)
  .use(clerkPlugin, {
    publishableKey:  PUBLISHABLE_KEY,
    afterSignOutUrl: '/sign-in',
  })

app.directive('tip', vTip)

// Manual $subscribe persistence: experimentStore's loadState() handles legacy defaults, so plugin hydration would conflict.
const expStore = useExperimentStore()
expStore.$subscribe((_mutation, state) => {
  saveToStorage(STORAGE_KEY.EXPERIMENT_SESSION, JSON.stringify({
    entries:            state.entries,
    nextId:             state.nextId,
    sessionName:        state.sessionName,
    sampleDescription:  state.sampleDescription,
    sessionNotes:       state.sessionNotes,
    cumulativeDoseJkg:  state.cumulativeDoseJkg,
    sessionStartMs:     state.sessionStartMs,
    aiConsentGiven:     state.aiConsentGiven,
  }))
})

app.mount('#app')
