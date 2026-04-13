import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { i18n } from '@/i18n'
import App from './App.vue'
import { useSettingsStore } from '@/stores/settings'
import './style.css'

const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(i18n)

const settings = useSettingsStore()
settings.init()

app.mount('#app')
