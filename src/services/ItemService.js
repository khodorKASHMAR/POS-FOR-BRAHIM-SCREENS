import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})

export default {
  getUserItems() {
    return api.get('/item/user-items')
  },

  /**
   * Get full item by ID (AddItemResponseDTO with buyingPrice, sellingPrice, categoryId, image, etc.).
   */
  getItemById(itemId) {
    return api.get(`/item/${itemId}`)
  },

  /**
   * Create item with optional image file (multipart).
   * @param {Object} payload - item fields (nameAr, nameEn, buyingPriceDollar, etc.) without image
   * @param {File|null} imageFile - optional image file
   */
  createItem(payload, imageFile = null) {
    const formData = new FormData()
    formData.append('item', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
    if (imageFile) formData.append('image', imageFile)
    return api.post('/item', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  /**
   * Update item with optional image file (multipart).
   * @param {number} itemId
   * @param {Object} payload - item fields without image
   * @param {File|null} imageFile - optional new image file; if omitted, existing image is kept
   */
  updateItem(itemId, payload, imageFile = null) {
    const formData = new FormData()
    formData.append('item', new Blob([JSON.stringify(payload)], { type: 'application/json' }))
    if (imageFile) formData.append('image', imageFile)
    return api.put(`/item/${itemId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  deleteItem(itemId) {
    return api.delete(`/item/${itemId}`)
  },

  /**
   * Generate a unique barcode (for new or existing items; assign in form).
   * @returns {Promise<{ data: { data: { barcode: string } } }>}
   */
  generateBarcode() {
    return api.post('/item/barcode/generate')
  }
}
