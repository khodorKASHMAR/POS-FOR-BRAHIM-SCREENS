import PosAxios from './index.js'

function buildReceiptPayload(receipt) {
  return {
    total: receipt.total,
    customerName: receipt.customerName || '',
    isReceiptDiscountPercent: receipt.isReceiptDiscountPercent ?? false,
    receiptDiscount: receipt.receiptDiscount ?? 0,
    isReceiptDollar: receipt.isReceiptDollar ?? true,
    payWish: Number(receipt.payWish) ?? 0,
    isPayWishDollar: receipt.isPayWishDollar ?? true,
    payDollar: Number(receipt.payDollar) ?? 0,
    payLebanese: Number(receipt.payLebanese) ?? 0,
    returnedToUserValue: Number(receipt.returnedToUserValue) ?? 0,
    receiptItems: (receipt.receiptItems || []).map(ri => ({
      itemId: ri.itemId,
      quantity: ri.quantity,
      itemDiscount: Number(ri.itemDiscount) ?? 0,
      isDiscountPercent: ri.isDiscountPercent ?? true,
      subTotal: Number(ri.subTotal) ?? 0
    }))
  }
}

/**
 * Save a receipt (ReceiptRequestDTO).
 */
export function saveReceipt(receipt) {
  return PosAxios.post('/receipt', buildReceiptPayload(receipt))
}

/**
 * Save a draft receipt without payment validation.
 */
export function saveDraft(receipt) {
  return PosAxios.post('/draft', buildReceiptPayload(receipt))
}

/**
 * Update an existing draft.
 */
export function updateDraft(receiptId, receipt) {
  return PosAxios.put(`/draft/${receiptId}`, buildReceiptPayload(receipt))
}



/**
 * Search receipts for the current user.
 * @param {Object} filter - { fromDate, toDate, fromTime, toTime, customerName, type }
 * @param {Object} params - { page (0-based), size }
 */
export function searchUserReceipts(filter = {}, params = {}) {
  const payload = {}
  if (filter.fromDate) payload.fromDate = filter.fromDate
  if (filter.toDate) payload.toDate = filter.toDate
  if (filter.fromTime) payload.fromTime = filter.fromTime
  if (filter.toTime) payload.toTime = filter.toTime
  if (filter.customerName?.trim()) payload.customerName = filter.customerName.trim()
  if (filter.type) payload.type = filter.type
  const query = {
    page: params.page ?? 0,
    size: params.size ?? 10
  }
  return PosAxios.post('/receipt/user-receipts', payload, { params: query })
}

/**
 * Get receipt payment/details for the current user (userId verified on backend).
 */
export function getReceiptDetails(receiptId) {
  return PosAxios.get(`/receipt/${receiptId}/details`)
}

/**
 * Get receipt line items for the current user (userId verified on backend).
 */
export function getReceiptItems(receiptId) {
  return PosAxios.get(`/receipt/${receiptId}/items`)
}

export default {
  saveReceipt,
  saveDraft,
  updateDraft,
  searchUserReceipts,
  getReceiptDetails,
  getReceiptItems
}
