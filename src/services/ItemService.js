import PosAxios from './index.js'

export default {
  getUserItems() {
    return PosAxios.get('/item/user-items')
  },

  /**
   * Get full item by ID (AddItemResponseDTO with buyingPrice, sellingPrice, categoryId, image, etc.).
   */
  getItemById(itemId) {
    return PosAxios.get(`/item/${itemId}`)
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
    return PosAxios.post('/item', formData, {
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
    return PosAxios.put(`/item/${itemId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },

  deleteItem(itemId) {
    return PosAxios.delete(`/item/${itemId}`)
  },

  /**
   * Generate a unique barcode (for new or existing items; assign in form).
   * @returns {Promise<{ data: { data: { barcode: string } } }>}
   */
  generateBarcode() {
    return PosAxios.post('/item/barcode/generate')
  }
}
