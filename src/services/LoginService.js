import axios from 'axios'

// Login endpoint: /api/login (base URL without /api suffix + /api/login)
const loginBaseURL = (import.meta.env.VITE_API_BASE_URL)

const LoginService = {
  async login(userName, password) {
    try {
      const response = await axios.post(`${loginBaseURL}/login`, { userName, password })
      const token = response.data
      if (token) {
        localStorage.setItem('token', token)
      }
      return response.data
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  },

  logout() {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }
}

export default LoginService
