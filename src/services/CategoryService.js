import PosAxios from './index.js'

function buildNameSearchBody(query) {
  const q = (query || '').trim()
  if (!q) {
    return { criteriaList: [], operator: 'AND' }
  }
  return {
    operator: 'OR',
    criteriaList: [
      { key: 'nameEn', value: q, operation: 'LIKE', caseSensitive: false },
      { key: 'nameAr', value: q, operation: 'LIKE', caseSensitive: false }
    ]
  }
}

export default {
  getAllCategories() {
    return PosAxios.post('/category/search', {
      criteriaList: [],
      operator: 'AND'
    })
  },

  /**
   * Dynamic category search. Empty query returns all categories.
   * @param {string} query
   * @param {{ page?: number, size?: number }} [params]
   */
  searchCategories(query = '', params = {}) {
    const page = params.page ?? 0
    const size = params.size ?? 50
    return PosAxios.post(`/category/search?page=${page}&size=${size}&sort=id,asc`, buildNameSearchBody(query))
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
