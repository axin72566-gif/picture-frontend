import { createApp } from 'vue'
import { createPinia } from 'pinia'
import naive from 'naive-ui'
import App from './App.vue'
import router from './router'
import { setAuthClearedHandler } from './api/request'
import { useAuthStore } from './stores/authStore'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(naive)

const auth = useAuthStore()
setAuthClearedHandler(() => {
  auth.syncClearedSession()
})
void auth.initialize()

app.mount('#app')
