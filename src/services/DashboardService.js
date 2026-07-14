import PosAxios from './index.js'

/**
 * Fetch dashboard revenue analytics (closed receipts only).
 * @param {Object} filter - { fromDate, toDate, itemId, categoryId, granularity }
 */
export function getDashboardData(filter = {}) {
  const payload = {}
  if (filter.fromDate) payload.fromDate = filter.fromDate
  if (filter.toDate) payload.toDate = filter.toDate
  if (filter.itemId) payload.itemId = filter.itemId
  if (filter.categoryId) payload.categoryId = filter.categoryId
  if (filter.granularity) payload.granularity = filter.granularity
  return PosAxios.post('/receipt/dashboard', payload)
}

export default {
  getDashboardData
}
