
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import 'vuetify/styles'
import '@mdi/font/css/materialdesignicons.css'

import App from './App.vue'
import router from './router'
import i18nPlugin from './plugins/i18n'

const vuetify = createVuetify({
  components,
  directives,
  theme: {
    defaultTheme: 'light',
    themes: {
      light: {
        colors: {
          primary: '#2c8cf2'
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
