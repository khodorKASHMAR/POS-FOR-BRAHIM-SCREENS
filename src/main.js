
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'
import './styles/fonts.css'
import './styles/mobile-app.css'

import App from './App.vue'
import router from './router'
import i18nPlugin from './plugins/i18n'
import { isMobileDevice } from './composables/useIsMobile'

if (typeof document !== 'undefined' && isMobileDevice()) {
  document.documentElement.classList.add('is-mobile-app')
}

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#197783'
        }
      }
    }
  },
  defaults: {
    VSnackbar: {
      rounded: 'lg',
      location: 'top'
    }
  }
})

createApp(App)
  .use(createPinia())
  .use(router)
  .use(vuetify)
  .use(i18nPlugin)
  .mount('#app')
