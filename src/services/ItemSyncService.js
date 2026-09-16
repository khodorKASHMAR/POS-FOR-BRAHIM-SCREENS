import PosAxios from './index'

const ItemSyncService = {
  getChangesSince(since) {
    const params = since ? { since } : {}
    return PosAxios.get('/item/changes', { params })
  }
}

export default ItemSyncService
