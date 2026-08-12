import PosAxios from './index.js'

/**
 * Fetch dashboard revenue analytics (closed receipts only).
 * @param {Object} filter - { fromDate, toDate, fromTime, toTime, itemId, categoryId, granularity, receiptCurrency }
 */
export function getDashboardData(filter = {}) {
  const payload = {}
  if (filter.fromDate) payload.fromDate = filter.fromDate
  if (filter.toDate) payload.toDate = filter.toDate
  if (filter.fromTime) payload.fromTime = filter.fromTime
  if (filter.toTime) payload.toTime = filter.toTime
  if (filter.itemId) payload.itemId = filter.itemId
  if (filter.categoryId) payload.categoryId = filter.categoryId
  if (filter.granularity) payload.granularity = filter.granularity
  if (filter.receiptCurrency) payload.receiptCurrency = filter.receiptCurrency
  return PosAxios.post('/dashboard', payload)
}

export default {
  getDashboardData
}
