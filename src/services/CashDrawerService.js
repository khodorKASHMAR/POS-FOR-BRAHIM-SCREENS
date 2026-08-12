import PosAxios from './index.js'

export default {
  getCashDrawer() {
    return PosAxios.get('/cash-drawer')
  },

  saveCashDrawer(payload) {
    return PosAxios.post('/cash-drawer', payload)
  }
}
