import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})

export default {
  getAllCategories() {
    return api.post('/category/search', {
      criteriaList: [],
      operator: 'AND'
    })
  },

  createCategory(payload) {
    return api.post('/category', payload)
  },

  updateCategory(categoryId, payload) {
    return api.put(`/category/${categoryId}`, payload)
  },

  deleteCategory(categoryId) {
    return api.delete(`/category/${categoryId}`)
  }
}
