/**
 * Two in-memory caches:
 * - items: id -> lean item metadata (kept)
 * - images: id -> base64 (RAM LRU; disk keeps a larger warm set in IndexedDB)
 */

/** RAM-only image caps (IndexedDB uses MAX_DISK_* in itemsCacheDb.js). */
export const MAX_IMAGE_ENTRIES = 500
export const MAX_IMAGE_CHARS = 50 * 1024 * 1024

const items = new Map()
const images = new Map()
const imageOrder = new Map()
let totalImageChars = 0
const inflightImages = new Map()

/** @type {((itemId: string) => void) | null} */
let onImageEvicted = null

export function setOnImageEvicted(handler) {
  onImageEvicted = handler
}

function keyOf(id) {
  return String(id)
}

function touchImage(id) {
  const key = keyOf(id)
  if (!imageOrder.has(key)) return
  imageOrder.delete(key)
  imageOrder.set(key, true)
}

function evictImagesIfNeeded() {
  while (
    (imageOrder.size > MAX_IMAGE_ENTRIES || totalImageChars > MAX_IMAGE_CHARS) &&
    imageOrder.size > 0
  ) {
    const oldestKey = imageOrder.keys().next().value
    imageOrder.delete(oldestKey)
    const prev = images.get(oldestKey)
    if (prev) totalImageChars -= prev.size || 0
    images.delete(oldestKey)
    if (onImageEvicted) onImageEvicted(oldestKey)
  }
}

export function getCachedItem(id) {
  if (id == null) return undefined
  return items.get(keyOf(id))
}

export function setCachedItem(id, item) {
  if (id == null || !item) return
  const key = keyOf(id)
  const prev = items.get(key)
  items.set(key, { ...(prev || {}), ...item, id: item.id ?? id })
}

export function removeCachedItem(id) {
  if (id == null) return
  const key = keyOf(id)
  items.delete(key)
  invalidateCachedItemImage(id)
}

/** @returns {string|null|undefined} undefined = not loaded yet */
export function getCachedItemImage(id) {
  if (id == null) return undefined
  const entry = images.get(keyOf(id))
  if (!entry) return undefined
  touchImage(id)
  return entry.image
}

export function hasCachedItemImage(id) {
  if (id == null) return false
  return images.has(keyOf(id))
}

export function setCachedItemImage(id, image) {
  if (id == null) return
  const key = keyOf(id)
  const prev = images.get(key)
  if (prev) totalImageChars -= prev.size || 0
  const normalized = image || null
  const size = normalized ? String(normalized).length : 0
  images.set(key, { image: normalized, size })
  totalImageChars += size
  imageOrder.delete(key)
  imageOrder.set(key, true)
  evictImagesIfNeeded()
}

export function invalidateCachedItemImage(id) {
  if (id == null) return
  const key = keyOf(id)
  const prev = images.get(key)
  if (prev) totalImageChars -= prev.size || 0
  images.delete(key)
  imageOrder.delete(key)
  inflightImages.delete(key)
}

export function getInflightImage(id) {
  return inflightImages.get(keyOf(id))
}

export function setInflightImage(id, promise) {
  const key = keyOf(id)
  inflightImages.set(key, promise)
  const clear = () => {
    if (inflightImages.get(key) === promise) inflightImages.delete(key)
  }
  promise.then(clear, clear)
  return promise
}

export function listCachedItems() {
  return [...items.values()]
}

export function findCachedItemByBarcode(barcode) {
  const needle = String(barcode || '').trim()
  if (!needle) return null
  for (const item of items.values()) {
    if (item?.barcode && String(item.barcode).trim() === needle) return item
  }
  return null
}

export function hydrateFromRecords(itemRows = [], imageRows = []) {
  items.clear()
  images.clear()
  imageOrder.clear()
  totalImageChars = 0
  inflightImages.clear()
  for (const item of itemRows) {
    if (!item?.id) continue
    setCachedItem(item.id, item)
  }
  for (const row of imageRows) {
    if (!row?.id) continue
    setCachedItemImage(row.id, row.image)
  }
}

export function clearItemCache() {
  items.clear()
  images.clear()
  imageOrder.clear()
  totalImageChars = 0
  inflightImages.clear()
}

export function listCachedImageEntries() {
  return [...images.entries()].map(([id, entry]) => ({
    id,
    image: entry.image,
    size: entry.size
  }))
}
