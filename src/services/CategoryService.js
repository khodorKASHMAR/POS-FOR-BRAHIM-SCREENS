import PosAxios from './index.js'

export default {
  getAllCategories() {
    return PosAxios.post('/category/search', {
      criteriaList: [],
      operator: 'AND'
    })
  },

  createCategory(payload) {
    return PosAxios.post('/category', payload)
  },

  updateCategory(categoryId, payload) {
    return PosAxios.put(`/category/${categoryId}`, payload)
  },

  deleteCategory(categoryId) {
    return PosAxios.delete(`/category/${categoryId}`)
  }
}
