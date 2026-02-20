import PosAxios from './index.js'

export default {
  getDollarRate() {
    return PosAxios.get('/dollar-rate')
  },

  updateDollarRate(payload) {
    return PosAxios.post('/dollar-rate', payload)
  }
}
