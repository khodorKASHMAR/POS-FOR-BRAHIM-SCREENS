import PosAxios from './index.js'

const BASE = '/user'

export default {
  /**
   * Search users with pagination.
   * @param {Object} params - { page (0-based), size, sort }
   * @param {Object} body - { criteriaList: [], operator: 'AND' }
   */
  searchUsers(params = {}, body = { criteriaList: [], operator: 'AND' }) {
    return PosAxios.post(`${BASE}/search`, body, { params })
  },

  getUserById(id) {
    return PosAxios.get(`${BASE}/${id}`)
  },

  createUser(payload) {
    return PosAxios.post(BASE, payload)
  },

  updateUser(id, payload) {
    return PosAxios.put(`${BASE}/${id}`, payload)
  },

  deleteUser(id) {
    return PosAxios.delete(`${BASE}/${id}`)
  },

  listMenus() {
    return PosAxios.get('/menu')
  },

  getUserMenus(id) {
    return PosAxios.get(`${BASE}/${id}/menus`)
  },

  updateUserMenus(id, menuCodes) {
    return PosAxios.put(`${BASE}/${id}/menus`, { menuCodes })
  }
}
