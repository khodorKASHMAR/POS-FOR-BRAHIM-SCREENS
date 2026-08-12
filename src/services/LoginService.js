import axios from 'axios'
import { useUserStore } from '../store/user'

// Login endpoint: /api/login (base URL without /api suffix + /api/login)
const loginBaseURL = (import.meta.env.VITE_API_BASE_URL)

const LoginService = {
  async login(userName, password) {
    try {
      const response = await axios.post(`${loginBaseURL}/login`, { userName, password })
      const data = response.data
      const token = typeof data === 'string' ? data : data?.token
      if (token) {
        localStorage.setItem('token', token)
      }
      if (data && typeof data === 'object') {
        useUserStore().setUser({
          id: data.userId,
          userName: data.userName,
          firstName: data.firstNameEN,
          lastName: data.lastNameEN,
          menus: data.menus || []
        })
      }
      return data
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
