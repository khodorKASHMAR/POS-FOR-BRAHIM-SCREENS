import PosAxios from './index.js'

function buildItemSearchBody(query) {
  const q = (query || '').trim()
  if (!q) {
    return { criteriaList: [], operator: 'AND' }
  }
  return {
    operator: 'OR',
    criteriaList: [
      { key: 'nameEn', value: q, operation: 'LIKE', caseSensitive: false },
      { key: 'nameAr', value: q, operation: 'LIKE', caseSensitive: false },
      { key: 'barcode', value: q, operation: 'LIKE', caseSensitive: false }
    ]
  }
}

export default {
  /**
   * Paged lean catalog. Optional categoryId + query.
   * @param {{ categoryId?: string|null, query?: string, page?: number, size?: number }} [params]
   */
  getUserItems(params = {}) {
    const page = params.page ?? 0
    const size = params.size ?? 50
    const query = {}
    if (params.categoryId != null && params.categoryId !== '' && params.categoryId !== 'all') {
      query.categoryId = params.categoryId
    }
    if (params.query) query.query = params.query
    return PosAxios.get('/item/user-items', {
      params: { ...query, page, size, sort: 'id,asc' }
    })
  },

  getItemByBarcode(barcode) {
    return PosAxios.get(`/item/barcode/${encodeURIComponent(barcode)}`)
  },

  /**
   * Batch-load base64 images for item ids.
   * @param {string[]} ids
   */
  getItemImages(ids = []) {
    return PosAxios.post('/item/images', ids)
  },

  getItemImage(itemId) {
    return PosAxios.get(`/item/${itemId}/image`)
  },

  /**
   * Dynamic item search (full DTO). Empty query returns all items.
   * Prefer getUserItems for catalog grids.
   */
  searchItems(query = '', params = {}) {
    const page = params.page ?? 0
    const size = params.size ?? 50
    return PosAxios.post(`/item/search?page=${page}&size=${size}&sort=id,asc`, buildItemSearchBody(query))
  },

  getItemById(itemId) {
    return PosAxios.get(`/item/${itemId}`)
  },

  createItem(payload, imageFile = null) {
    const formData = new FormData()
    formData.append('item', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
    if (imageFile) formData.append('image', imageFile)
    return PosAxios.post('/item', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  updateItem(itemId, payload, imageFile = null) {
    const formData = new FormData()
    formData.append('item', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
    if (imageFile) formData.append('image', imageFile)
    return PosAxios.put(`/item/${itemId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  deleteItem(itemId) {
    return PosAxios.delete(`/item/${itemId}`)
  },

  generateBarcode() {
    return PosAxios.post('/item/barcode/generate')
  }
}
