import PosAxios from './index.js'

export default {
  /**
   * @param {{ customerName?: string, currency: number, items: { itemId: string, price: number }[] }} payload
   */
  createReturn(payload) {
    return PosAxios.post('/returned-object', payload)
  },

  /**
   * Returns created by the current user.
   * @param {Object} filter - { fromDate, toDate, fromTime, toTime, customerName }
   * @param {Object} params - { page (0-based), size }
   */
  searchUserReturns(filter = {}, params = {}) {
    const payload = {}
    if (filter.fromDate) payload.fromDate = filter.fromDate
    if (filter.toDate) payload.toDate = filter.toDate
    if (filter.fromTime) payload.fromTime = filter.fromTime
    if (filter.toTime) payload.toTime = filter.toTime
    if (filter.customerName?.trim()) payload.customerName = filter.customerName.trim()
    return PosAxios.post('/returned-object/user-returns', payload, {
      params: { page: params.page ?? 0, size: params.size ?? 10 }
    })
  }
}
