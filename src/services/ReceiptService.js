import PosAxios from './index.js'

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
    isReceiptDiscountPercent: receipt.isReceiptDiscountPercent ?? false,
    receiptDiscount: receipt.receiptDiscount ?? 0,
    isReceiptDollar: receipt.isReceiptDollar ?? true,
    receiptItems: (receipt.receiptItems || []).map(ri => ({
      itemId: ri.itemId,
      quantity: ri.quantity,
      itemDiscount: Number(ri.itemDiscount) ?? 0,
      isDiscountPercent: ri.isDiscountPercent ?? true,
      subTotal: Number(ri.subTotal) ?? 0
    }))
  }
  return PosAxios.post('/receipt', payload)
}

export default {
  saveReceipt
}
