import PosAxios from './index.js'

/**
 * Fetch dashboard revenue analytics.
 * @param {Object} filter - { fromDate, toDate, itemId, type, granularity }
 */
export function getDashboardData(filter = {}) {
  const payload = {}
  if (filter.fromDate) payload.fromDate = filter.fromDate
  if (filter.toDate) payload.toDate = filter.toDate
  if (filter.itemId) payload.itemId = filter.itemId
  if (filter.type) payload.type = filter.type
  if (filter.granularity) payload.granularity = filter.granularity
  return PosAxios.post('/receipt/dashboard', payload)
}

export default {
  getDashboardData
}
