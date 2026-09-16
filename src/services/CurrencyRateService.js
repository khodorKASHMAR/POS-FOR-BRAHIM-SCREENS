import PosAxios from './index.js'

export default {
  getRate(currency) {
    return PosAxios.get(`/currency-rate/${currency}`)
  },

  updateRate(payload) {
    return PosAxios.post('/currency-rate', payload)
  }
}
