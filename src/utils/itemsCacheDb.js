import {
  idbBulkPut,
  idbClearAllStores,
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
 * Debounce queued item writes into one IndexedDB save.
 * Case: many quick queuePersistItem calls (websocket / create / sync) within 300ms —
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
 * Debounce queued image writes into one IndexedDB save pass.
 * Case: ensureItemImages / addItemImageCache queues several images close together —
 * one timer drains pendingImages after 300ms.
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
 * Write pendingImages to IndexedDB now and clear the RAM queue.
 * Cases:
 * - Timer from scheduleImageCacheDirectSave (normal debounced path)
 * Also handles QuotaExceededError by evicting oldest images, then retrying.
 */
async function cacheDirectSavePendingImages() {
  if (!pendingImages.size) return
  const batch = [...pendingImages.values()]
  pendingImages.clear()
  for (const row of batch) {
    try {
      await idbPut('images', row)
    } catch (e) {
      if (e?.name !== 'QuotaExceededError') throw e
      // One retry after freeing space — not a loop. If still over quota, skip this image.
      await evictImagesOnDisk(MAX_DISK_IMAGE_ENTRIES, MAX_DISK_IMAGE_CHARS)
      try {
        await idbPut('images', row)
      } catch (retryError) {
        if (retryError?.name !== 'QuotaExceededError') throw retryError
        console.warn('[itemsCacheDb] image save skipped after quota eviction', row.id)
      }
    }
  }
  await evictImagesOnDisk(MAX_DISK_IMAGE_ENTRIES, MAX_DISK_IMAGE_CHARS)
}

export async function loadItemsCacheFromDb() {
  await openItemsCacheDb()
  const meta = await idbGet('meta', META_KEY)
  const categories = await idbGetAll('categories')
  const items = await idbGetAll('items')
  const images = await idbGetAll('images')
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
    images: images || [],
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

export async function removeImageFromDb(itemId) {
  if (itemId == null) return
  pendingImages.delete(normalizeId(itemId))
  await idbDelete('images', normalizeId(itemId))
}

