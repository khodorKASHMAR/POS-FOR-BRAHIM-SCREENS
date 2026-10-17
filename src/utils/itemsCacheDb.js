import {
  idbBulkPut,
  idbDelete,
  idbGet,
  idbGetAll,
  idbPut,
  isItemsIndexedDbAvailable,
  openItemsCacheDb
} from './itemsIndexedDb'

const META_KEY = 'meta'
const DEBOUNCE_MS = 1000

/** IndexedDB image caps (larger than RAM — disk is the warm store). */
export const MAX_DISK_IMAGE_ENTRIES = 2000
export const MAX_DISK_IMAGE_CHARS = 500 * 1024 * 1024

const pendingItems = new Map()
const pendingImages = new Map()
let itemCacheDirectSaveTimer = null
let imageCacheDirectSaveTimer = null

function normalizeId(id) {
  return String(id)
}

/**
 * One IndexedDB read for many image ids. Pending writes win over disk.
 * Missing ids are absent from the map. A present row may still have a null image.
 * @param {Array<string|number>} itemIds
 * @returns {Promise<Map<string, {id: string, image: string|null, size?: number, cachedAt?: number}>>}
 */
export async function readPersistedImages(itemIds = []) {
  const found = new Map()
  const needDisk = []
  for (const raw of itemIds) {
    if (raw == null) continue
    const id = normalizeId(raw)
    const pending = pendingImages.get(id)
    if (pending) found.set(id, pending)
    else needDisk.push(id)
  }
  if (!needDisk.length || !isItemsIndexedDbAvailable()) return found

  const db = await openItemsCacheDb()
  if (!db) return found

  await new Promise((resolve, reject) => {
    const tx = db.transaction('images', 'readonly')
    const store = tx.objectStore('images')
    let left = needDisk.length
    const finishOne = () => {
      left -= 1
      if (left === 0) resolve()
    }
    for (const id of needDisk) {
      const request = store.get(id)
      request.onsuccess = () => {
        if (request.result) found.set(id, request.result)
        finishOne()
      }
      request.onerror = () => reject(request.error)
    }
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
  return found
}

/**
 * Debounce queued item writes into one IndexedDB save.
 * Case: many quick queuePersistItem calls (websocket / create / sync) within DEBOUNCE_MS —
 * schedule once so we batch them instead of writing every event immediately.
 */
function scheduleItemCacheDirectSave() {
  if (itemCacheDirectSaveTimer) return
  itemCacheDirectSaveTimer = setTimeout(() => {
    itemCacheDirectSaveTimer = null
    cacheDirectSavePendingItems().catch((e) =>
      console.error('[itemsCacheDb] item cacheDirectSave failed', e)
    )
  }, DEBOUNCE_MS)
}

/**
 * Write pendingItems to IndexedDB now and clear the RAM queue.
 * Cases:
 * - Timer from scheduleItemCacheDirectSave (normal debounced path)
 * - removeItemFromDb: must save first so a later timer cannot re-insert a deleted item
 */
async function cacheDirectSavePendingItems() {
  if (!pendingItems.size) return
  const batch = [...pendingItems.values()]
  pendingItems.clear()
  await idbBulkPut('items', batch)
}

/**
 * Debounce queued image writes into one IndexedDB save pass.
 * Case: ensureItemImages / addItemImageCache queues several images close together —
 * one timer drains pendingImages after DEBOUNCE_MS.
 */
function scheduleImageCacheDirectSave() {
  if (imageCacheDirectSaveTimer) return
  imageCacheDirectSaveTimer = setTimeout(() => {
    imageCacheDirectSaveTimer = null
    cacheDirectSavePendingImages().catch((e) =>
      console.error('[itemsCacheDb] image cacheDirectSave failed', e)
    )
  }, DEBOUNCE_MS)
}


/**
 * Write pendingImages to IndexedDB now and clear the RAM queue.
 *
 * Plan under the app soft cap (500MB / 2000):
 * 1) If the whole batch fits → bulk put
 * 2) Else evict oldest (not in the batch) until it fits → bulk put
 * 3) Else save one-by-one (fit / skip)
 * Thin QuotaExceededError handling remains as a browser-quota safety net.
 */
async function cacheDirectSavePendingImages() {
  if (!pendingImages.size) return
  const batch = [...pendingImages.values()]
  pendingImages.clear()

  let usage = summarizeDiskImages((await idbGetAll('images')) || [])

  if (batchFitsSoftCap(usage, batch)) {
    await bulkPutImagesWithQuotaFallback(batch)
    return
  }

  const fitsAfterEvict = await evictOldestUntilBatchFits(usage, batch)
  if (fitsAfterEvict) {
    await bulkPutImagesWithQuotaFallback(batch)
    return
  }

  await saveImagesOneByOne(usage, batch)
}

function summarizeDiskImages(rows = []) {
  const byId = new Map()
  let totalChars = 0
  for (const row of rows) {
    if (row?.id == null) continue
    const id = normalizeId(row.id)
    const size = Number(row.size) || 0
    byId.set(id, {
      id,
      size,
      cachedAt: row.cachedAt || 0,
      image: row.image
    })
    totalChars += size
  }
  return { byId, totalChars, count: byId.size }
}

function batchFitsSoftCap(usage, batch) {
  const projected = projectUsageAfterBatch(usage, batch)
  return (
    projected.chars <= MAX_DISK_IMAGE_CHARS &&
    projected.count <= MAX_DISK_IMAGE_ENTRIES
  )
}

/** Project disk usage if `batch` were applied (overwrites replace size; new ids add count). */
function projectUsageAfterBatch(usage, batch) {
  let chars = usage.totalChars
  let count = usage.count
  const pendingIds = new Set()
  for (const row of batch) {
    const id = normalizeId(row.id)
    pendingIds.add(id)
    const newSize = Number(row.size) || 0
    const existing = usage.byId.get(id)
    if (existing) {
      chars = chars - (existing.size || 0) + newSize
    } else {
      chars += newSize
      count += 1
    }
  }
  return { chars, count, pendingIds }
}

async function bulkPutImagesWithQuotaFallback(batch) {
  try {
    await idbBulkPut('images', batch)
    return
  } catch (e) {
    if (e?.name !== 'QuotaExceededError') throw e
    // Browser quota hit despite soft-cap planning — fall back to one-by-one.
    const fresh = summarizeDiskImages((await idbGetAll('images')) || [])
    await saveImagesOneByOne(fresh, batch)
  }
}

/**
 * Save each image if it fits (evicting oldest others as needed); skip if still no room.
 */
async function saveImagesOneByOne(usage, batch) {
  for (const row of batch) {
    const fits = await evictOldestUntilRowFits(usage, row)
    if (!fits) {
      console.warn('[itemsCacheDb] not enough disk room for image, skipped', row.id)
      continue
    }
    const saved = await putImageWithQuotaRetry(row)
    if (saved) applyRowToUsage(usage, row)
    else {
      // Usage may have changed due to eviction inside quota retry.
      const refreshed = summarizeDiskImages((await idbGetAll('images')) || [])
      usage.byId = refreshed.byId
      usage.totalChars = refreshed.totalChars
      usage.count = refreshed.count
    }
  }
}

/**
 * Free enough room under the soft cap for a single row; skip ids we are about to write.
 */
async function evictOldestUntilRowFits(usage, row) {
  const id = normalizeId(row.id)
  const newSize = Number(row.size) || 0

  const existing = usage.byId.get(id)
  let chars = usage.totalChars - (existing?.size || 0) + newSize
  let count = existing ? usage.count : usage.count + 1

  const candidates = [...usage.byId.values()]
    .filter((r) => r.id !== id)
    .sort((a, b) => (a.cachedAt || 0) - (b.cachedAt || 0))

  while (
    (chars > MAX_DISK_IMAGE_CHARS || count > MAX_DISK_IMAGE_ENTRIES) &&
    candidates.length
  ) {
    const oldest = candidates.shift()
    if (!oldest) break
    await idbDelete('images', oldest.id)
    chars -= oldest.size || 0
    count -= 1
    usage.byId.delete(oldest.id)
    usage.totalChars -= oldest.size || 0
    usage.count -= 1
  }

  return chars <= MAX_DISK_IMAGE_CHARS && count <= MAX_DISK_IMAGE_ENTRIES
}

/**
 * Browser-quota safety net: one eviction-to-soft-cap + one retry; skip on second quota error.
 */
async function putImageWithQuotaRetry(row) {
  try {
    await idbPut('images', row)
    return true
  } catch (e) {
    if (e?.name !== 'QuotaExceededError') throw e
    await evictImagesOnDisk(MAX_DISK_IMAGE_ENTRIES, MAX_DISK_IMAGE_CHARS)
    try {
      await idbPut('images', row)
      return true
    } catch (retryError) {
      if (retryError?.name !== 'QuotaExceededError') throw retryError
      console.warn('[itemsCacheDb] image save skipped after quota eviction', row.id)
      return false
    }
  }
}

export async function evictImagesOnDisk(
  maxEntries = MAX_DISK_IMAGE_ENTRIES,
  maxChars = MAX_DISK_IMAGE_CHARS
) {
  if (!isItemsIndexedDbAvailable()) return
  let rows = await idbGetAll('images')
  if (!rows?.length) return
  rows.sort((a, b) => (a.cachedAt || 0) - (b.cachedAt || 0))
  let totalChars = rows.reduce((sum, r) => sum + (r.size || 0), 0)
  while (rows.length > maxEntries || totalChars > maxChars) {
    const oldest = rows.shift()
    if (!oldest) break
    totalChars -= oldest.size || 0
    await idbDelete('images', oldest.id)
  }
}


function applyRowToUsage(usage, row) {
  const id = normalizeId(row.id)
  const newSize = Number(row.size) || 0
  const existing = usage.byId.get(id)
  if (existing) {
    usage.totalChars -= existing.size || 0
  } else {
    usage.count += 1
  }
  usage.byId.set(id, {
    id,
    size: newSize,
    cachedAt: row.cachedAt || Date.now(),
    image: row.image
  })
  usage.totalChars += newSize
}


/**
 * Delete oldest disk images (not in pendingIds) until applying `batch` would fit the soft cap.
 * Updates `usage` in place to match deletes.
 */
async function evictOldestUntilBatchFits(usage, batch) {
  const projected = projectUsageAfterBatch(usage, batch)
  let { chars, count, pendingIds } = projected

  const candidates = [...usage.byId.values()]
    .filter((row) => !pendingIds.has(row.id))
    .sort((a, b) => (a.cachedAt || 0) - (b.cachedAt || 0))

  while (
    (chars > MAX_DISK_IMAGE_CHARS || count > MAX_DISK_IMAGE_ENTRIES) &&
    candidates.length
  ) {
    const oldest = candidates.shift()
    if (!oldest) break
    await idbDelete('images', oldest.id)
    chars -= oldest.size || 0
    count -= 1
    usage.byId.delete(oldest.id)
    usage.totalChars -= oldest.size || 0
    usage.count -= 1
  }

  return batchFitsSoftCap(usage, batch)
}



/** Categories only. The catalog is small compared with items. */
export async function loadCategoriesFromDb() {
  return (await idbGetAll('categories')) || []
}

/** One saved category page, including All. Does not read other pages. */
export async function loadCategoryItemsPageFromDb(categoryItemsPageKey) {
  if (!categoryItemsPageKey) return null
  return idbGet('categoryItemsPages', String(categoryItemsPageKey))
}

/** Read specific items in one transaction. Skips ids that are not on disk. */
export async function loadItemsByIds(ids = []) {
  const unique = []
  const seen = new Set()
  for (const raw of ids) {
    if (raw == null) continue
    const id = String(raw)
    if (seen.has(id)) continue
    seen.add(id)
    unique.push(id)
  }
  if (!unique.length) return []

  const db = await openItemsCacheDb()
  if (!db) return []

  const byId = new Map()
  await new Promise((resolve, reject) => {
    const tx = db.transaction('items', 'readonly')
    const store = tx.objectStore('items')
    let left = unique.length
    const finishOne = () => {
      left -= 1
      if (left === 0) resolve()
    }
    for (const id of unique) {
      const request = store.get(id)
      request.onsuccess = () => {
        if (request.result) byId.set(id, request.result)
        finishOne()
      }
      request.onerror = () => reject(request.error)
    }
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
  return unique.map((id) => byId.get(id)).filter(Boolean)
}

/**
 * One page of saved items. `offset` skips earlier matches; `categoryId` limits a category.
 * A short page means there is nothing further in IndexedDB.
 */
export async function loadItemRecordsPage({ offset = 0, limit = 50, categoryId = null } = {}) {
  const db = await openItemsCacheDb()
  if (!db) return []
  const filterId = categoryId && categoryId !== 'all' ? String(categoryId) : null
  const skip = Math.max(0, offset)
  const size = Math.max(0, limit)
  if (!size) return []

  return new Promise((resolve, reject) => {
    const tx = db.transaction('items', 'readonly')
    const store = tx.objectStore('items')
    const rows = []
    let matched = 0
    let advanced = false
    const request = store.openCursor()
    request.onerror = () => reject(request.error)
    request.onsuccess = () => {
      const cursor = request.result
      if (!cursor) {
        resolve(rows)
        return
      }
      if (!filterId && skip > 0 && !advanced) {
        advanced = true
        cursor.advance(skip)
        return
      }
      if (filterId && String(cursor.value?.categoryId) !== filterId) {
        cursor.continue()
        return
      }
      if (filterId && matched < skip) {
        matched += 1
        cursor.continue()
        return
      }
      rows.push(cursor.value)
      if (rows.length >= size) {
        resolve(rows)
        return
      }
      cursor.continue()
    }
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

export async function loadItemsCacheFromDb() {
  await openItemsCacheDb()
  const meta = await idbGet('meta', META_KEY)
  const categories = await idbGetAll('categories')
  const items = await idbGetAll('items')
  const categoryItemsPagesRows = await idbGetAll('categoryItemsPages')
  const categoryItemsPages = {}
  for (const row of categoryItemsPagesRows || []) {
    if (row?.categoryItemsPageKey) {
      categoryItemsPages[row.categoryItemsPageKey] = row
    }
  }
  return {
    meta: meta || { key: META_KEY, schemaVersion: 1, lastSyncAt: null, cacheReady: false },
    categories: categories || [],
    items: items || [],
    categoryItemsPages
  }
}

export async function isItemsCacheEmpty() {
  const meta = await idbGet('meta', META_KEY)
  if (!meta?.cacheReady) return true
  const items = await idbGetAll('items')
  return !items?.length
}

export async function updateItemsCacheMeta(patch) {
  const prev = (await idbGet('meta', META_KEY)) || {
    key: META_KEY,
    schemaVersion: 1,
    lastSyncAt: null,
    cacheReady: false
  }
  await idbPut('meta', {
    ...prev,
    ...patch,
    key: META_KEY,
    schemaVersion: 1
  })
}

export function queuePersistItem(item) {
  if (!item?.id || !isItemsIndexedDbAvailable()) return
  pendingItems.set(normalizeId(item.id), { ...item, id: normalizeId(item.id) })
  scheduleItemCacheDirectSave()
}

export async function persistItemsBulk(items) {
  if (!items?.length || !isItemsIndexedDbAvailable()) return
  const rows = items.map((item) => ({ ...item, id: normalizeId(item.id) }))
  await idbBulkPut('items', rows)
}

export function queuePersistCategory(category) {
  if (!category?.id || !isItemsIndexedDbAvailable()) return
  idbPut('categories', {
    id: normalizeId(category.id),
    nameAr: category.nameAr || '',
    nameEn: category.nameEn || '',
    itemCount: Number(category.itemCount) || 0
  }).catch((e) => console.error('[itemsCacheDb] category persist failed', e))
}

export async function persistCategoriesBulk(categories) {
  if (!categories?.length || !isItemsIndexedDbAvailable()) return
  const rows = categories.map((c) => ({
    id: normalizeId(c.id),
    nameAr: c.nameAr || '',
    nameEn: c.nameEn || '',
    itemCount: Number(c.itemCount) || 0
  }))
  await idbBulkPut('categories', rows)
}

export function queuePersistImage(itemId, image) {
  if (itemId == null || !isItemsIndexedDbAvailable()) return
  const id = normalizeId(itemId)
  const normalized = image || null
  const size = normalized ? String(normalized).length : 0
  pendingImages.set(id, {
    id,
    image: normalized,
    size,
    cachedAt: Date.now()
  })
  scheduleImageCacheDirectSave()
}

/**
 * Delete one item (and its image) from IndexedDB.
 * Direct-saves pending items first so a debounced write cannot resurrect this id after delete.
 */
export async function removeItemFromDb(itemId) {
  if (itemId == null) return
  const id = normalizeId(itemId)
  await cacheDirectSavePendingItems()
  await idbDelete('items', id)
  await idbDelete('images', id)
}

export async function removeCategoryFromDb(categoryId) {
  if (categoryId == null) return
  await idbDelete('categories', normalizeId(categoryId))
}

export async function persistCategoryItemsPageState(categoryItemsPageKey, pageState) {
  if (!categoryItemsPageKey || !pageState || !isItemsIndexedDbAvailable()) return
  await idbPut('categoryItemsPages', {
    categoryItemsPageKey: String(categoryItemsPageKey),
    ids: [...(pageState.ids || [])],
    page: pageState.page ?? -1,
    totalPages: pageState.totalPages ?? 1,
    totalItems: pageState.totalItems ?? 0
  })
}


export async function removeImageFromDb(itemId) {
  if (itemId == null) return
  pendingImages.delete(normalizeId(itemId))
  await idbDelete('images', normalizeId(itemId))
}

/**
 * Update IndexedDB (and pending queue) image cachedAt for receipt/draft items.
 * RAM LRU is updated by the store action that calls this.
 */
export async function updateImageCachedAtTime(itemIds = []) {
  const ids = []
  const seen = new Set()
  for (const raw of itemIds) {
    if (raw == null) continue
    const id = normalizeId(raw)
    if (seen.has(id)) continue
    seen.add(id)
    ids.push(id)
  }
  if (!ids.length) return

  const now = Date.now()
  for (const id of ids) {
    const pending = pendingImages.get(id)
    if (pending) {
      pendingImages.set(id, { ...pending, cachedAt: now })
    }

    if (!isItemsIndexedDbAvailable()) continue
    const existing = await idbGet('images', id)
    if (!existing) continue
    await idbPut('images', { ...existing, cachedAt: now })
  }
}

