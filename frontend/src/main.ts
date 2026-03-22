// Copyright © 2026 Tomer Preis. All rights reserved.
// Unauthorized copying or distribution is prohibited.

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import './style.css'
import './styles/_keyframes.scss'
import './styles/_responsive.scss'
import App from './App.vue'
import { i18n } from './plugins/i18n'
import router from './router'
import { vTip } from './directives/vTooltip'
import { useExperimentStore } from './stores/experimentStore'

const pinia = createPinia()
pinia.use(piniaPluginPersistedstate)
const app = createApp(App)
app.use(pinia).use(i18n).use(router)
app.directive('tip', vTip)

// Persist experiment log to localStorage on every state change.
// Uses manual $subscribe rather than the plugin because experimentStore
// bootstraps its own state via loadState() (handles missing-field defaults
// for previously saved sessions) - plugin hydration would conflict with that.
const expStore = useExperimentStore()
expStore.$subscribe((_mutation, state) => {
  localStorage.setItem('br-experiment', JSON.stringify({
    entries:            state.entries,
    nextId:             state.nextId,
    sessionName:        state.sessionName,
    sampleDescription:  state.sampleDescription,
    sessionNotes:       state.sessionNotes,
    cumulativeDoseJkg:  state.cumulativeDoseJkg,
    sessionStartMs:     state.sessionStartMs,
  }))
})

app.mount('#app')
