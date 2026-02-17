import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
})

/**
 * Save a receipt (ReceiptRequestDTO).
 * @param {Object} receipt - { total, receiptDate, receiptDiscountPercent, isReceiptDollar, receiptItems }
 * @param {Array} receipt.receiptItems - [{ itemId, quantity, itemDiscount, isDiscountPercent, subTotal }]
 * @returns {Promise<AxiosResponse>}
 */
export function saveReceipt(receipt) {
  const payload = {
    total: receipt.total,
    receiptDate: receipt.receiptDate || new Date().toISOString(),
    receiptDiscountPercent: receipt.receiptDiscountPercent ?? 0,
    isReceiptDollar: receipt.isReceiptDollar ?? true,
    receiptItems: (receipt.receiptItems || []).map(ri => ({
      itemId: ri.itemId,
      quantity: ri.quantity,
      itemDiscount: Number(ri.itemDiscount) ?? 0,
      isDiscountPercent: ri.isDiscountPercent ?? true,
      subTotal: Number(ri.subTotal) ?? 0
    }))
  }
  return api.post('/receipt', payload)
}

export default {
  saveReceipt
}
