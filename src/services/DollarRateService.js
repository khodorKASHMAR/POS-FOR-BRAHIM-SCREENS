import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})

export default {
  getDollarRate() {
    return api.get('/dollar-rate')
  },

  updateDollarRate(payload) {
    return api.post('/dollar-rate', payload)
  }
}
