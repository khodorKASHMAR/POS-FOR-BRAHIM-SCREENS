import { useState } from '../store/state'
import { translations } from '../i18n/translations'

export default {
  install(app) {
    // Global translation function - reactive to language changes
    app.config.globalProperties.$t = function(key) {
      // Access store on each call to ensure reactivity
      const state = useState()
      const lang = state.lang
      return translations[lang]?.[key] || key
    }
    
    // Global language property - reactive to language changes
    Object.defineProperty(app.config.globalProperties, '$lang', {
      get() {
        const state = useState()
        return state.lang
      },
      enumerable: true,
      configurable: true
    })
    
    // Global direction property
    Object.defineProperty(app.config.globalProperties, '$dir', {
      get() {
        const state = useState()
        return state.dir
      },
      enumerable: true,
      configurable: true
    })
  }
}
