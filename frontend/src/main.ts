import { createApp } from 'vue'
import { createPinia } from 'pinia'
import './style.css'
import App from './App.vue'
import { i18n } from './i18n'
import router from './router'
import { vTip } from './directives/tip'
import { useExperimentStore } from './stores/experimentStore'

const pinia = createPinia()
const app = createApp(App)
app.use(pinia).use(i18n).use(router)
app.directive('tip', vTip)

// Persist experiment log to localStorage on every state change
const expStore = useExperimentStore()
expStore.$subscribe((_mutation, state) => {
  localStorage.setItem('br-experiment', JSON.stringify({
    entries:     state.entries,
    nextId:      state.nextId,
    sessionName: state.sessionName,
  }))
})

app.mount('#app')
